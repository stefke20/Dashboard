/* Daily — personal sync server (Cloudflare Worker + D1, free tier).
 *
 * Stores ONE encrypted document per sync key. The dashboard encrypts everything in your browser
 * (AES-GCM, key derived from your sync key) before sending it, so this server — and Cloudflare —
 * only ever see unreadable data. The account id is a hash of a hash of your key; the key itself
 * never leaves your devices.
 *
 * Endpoints
 *   GET  /            health check
 *   GET  /sync        -> { version, updated, doc }   (doc = encrypted envelope, or null)
 *   PUT  /sync        body { version, doc }  -> { version, updated } | 409 { version } when someone else wrote first
 * Auth: "Authorization: Bearer <64 hex chars>"
 *
 * Settings (Worker → Settings → Variables), all optional:
 *   MAX_ACCOUNTS     how many sync keys may create data (default 3) — stops strangers filling your database
 *   ALLOWED_ORIGINS  comma-separated list of sites allowed to call this server, e.g. https://you.github.io
 * Binding (required): a D1 database bound as DB.
 */
const MAX_DOC = 5 * 1024 * 1024; // 5 MB

let ready = false;
async function setup(env) {
  if (ready) return;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS docs (id TEXT PRIMARY KEY, doc TEXT NOT NULL, version INTEGER NOT NULL, updated TEXT NOT NULL)').run();
  ready = true;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function corsHeaders(req, env) {
  const origin = req.headers.get('Origin') || '';
  const list = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const allow = !list.length ? (origin || '*') : list.includes(origin) ? origin : list[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const json = (data, status, headers) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const { pathname } = new URL(req.url);
    if (pathname === '/' || pathname === '') return json({ ok: true, app: 'daily-sync', db: !!env.DB }, 200, cors);
    if (pathname !== '/sync') return json({ error: 'Not found' }, 404, cors);
    if (!env.DB) return json({ error: 'No D1 database bound as DB — see the setup steps' }, 500, cors);

    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: 'Missing or invalid sync key' }, 401, cors);
    const id = await sha256(`account|${token}`);
    await setup(env);

    if (req.method === 'GET') {
      const row = await env.DB.prepare('SELECT doc, version, updated FROM docs WHERE id = ?').bind(id).first();
      if (!row) return json({ version: 0, updated: null, doc: null }, 200, cors);
      return json({ version: row.version, updated: row.updated, doc: JSON.parse(row.doc) }, 200, cors);
    }

    if (req.method === 'PUT') {
      const text = await req.text();
      if (text.length > MAX_DOC) return json({ error: 'Document too large' }, 413, cors);
      let body;
      try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400, cors); }
      const expected = Number(body.version) || 0;
      if (!body.doc || typeof body.doc !== 'object') return json({ error: 'Missing doc' }, 400, cors);
      const doc = JSON.stringify(body.doc);
      const now = new Date().toISOString();

      if (expected === 0) {
        // first write for this key: create the row (respecting MAX_ACCOUNTS)
        const max = Number(env.MAX_ACCOUNTS || 3);
        const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM docs').first();
        const exists = await env.DB.prepare('SELECT version FROM docs WHERE id = ?').bind(id).first();
        if (exists) return json({ error: 'Conflict', version: exists.version }, 409, cors);
        if (n >= max) return json({ error: `This sync server is full (MAX_ACCOUNTS = ${max})` }, 403, cors);
        const r = await env.DB.prepare('INSERT INTO docs (id, doc, version, updated) VALUES (?, ?, 1, ?) ON CONFLICT(id) DO NOTHING').bind(id, doc, now).run();
        if (!r.meta.changes) return json({ error: 'Conflict', version: 1 }, 409, cors);
        return json({ version: 1, updated: now }, 200, cors);
      }

      // compare-and-swap: only write when nobody else wrote since we read
      const r = await env.DB.prepare('UPDATE docs SET doc = ?, version = version + 1, updated = ? WHERE id = ? AND version = ?').bind(doc, now, id, expected).run();
      if (!r.meta.changes) {
        const cur = await env.DB.prepare('SELECT version FROM docs WHERE id = ?').bind(id).first();
        return json({ error: 'Conflict', version: cur?.version || 0 }, 409, cors);
      }
      return json({ version: expected + 1, updated: now }, 200, cors);
    }

    return json({ error: 'Method not allowed' }, 405, cors);
  },
};
