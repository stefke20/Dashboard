/* Your own sync server (Cloudflare Worker + D1, see sync-server/). Free and not tied to Google.
   Everything is encrypted in this browser before it leaves the device (AES-GCM 256, key derived
   from your sync key with PBKDF2), so the server only stores unreadable data.
   The server gets SHA-256("auth|key") as a bearer token and never sees the key itself. */
(function (PD) {
  const { store } = PD;
  const C = () => store.get('cloud');
  const enc = new TextEncoder(); const dec = new TextDecoder();
  const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32: no I, L, O, U

  /* ---------- keys ---------- */
  /** A new random sync key like "7H3K-QX2M-…" (160 bits). */
  function newKey() {
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    let bits = ''; bytes.forEach((b) => { bits += b.toString(2).padStart(8, '0'); });
    let out = ''; for (let i = 0; i + 5 <= bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
    return out.match(/.{4}/g).join('-');
  }
  const norm = (k) => String(k || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  const normUrl = (u) => String(u || '').trim().replace(/\/+$/, '').replace(/\/sync$/, '');

  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  function b64(bytes) { let s = ''; const CH = 0x8000; for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode(...bytes.subarray(i, i + CH)); return btoa(s); }
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  const cache = {};
  async function token(key) {
    const k = norm(key);
    if (cache.tokenFor !== k) { cache.token = hex(await crypto.subtle.digest('SHA-256', enc.encode(`auth|${k}`))); cache.tokenFor = k; }
    return cache.token;
  }
  async function aesKey(key) {
    const k = norm(key);
    if (cache.aesFor !== k) {
      const base = await crypto.subtle.importKey('raw', enc.encode(k), 'PBKDF2', false, ['deriveKey']);
      cache.aes = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode('daily-sync-v1'), iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      cache.aesFor = k;
    }
    return cache.aes;
  }

  /* ---------- (de)compression + encryption ---------- */
  const canZip = typeof CompressionStream !== 'undefined';
  async function pipe(bytes, Stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new Stream('gzip'))).arrayBuffer()); }
  async function encrypt(obj, key) {
    let plain = enc.encode(JSON.stringify(obj)); const z = canZip;
    if (z) plain = await pipe(plain, CompressionStream);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(key), plain));
    return { v: 1, alg: 'AES-GCM', z: z ? 1 : 0, iv: b64(iv), data: b64(data) };
  }
  async function decrypt(env, key) {
    let plain;
    try { plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(env.iv) }, await aesKey(key), unb64(env.data))); }
    catch { throw new Error('This data was saved with a different sync key'); }
    if (env.z) {
      if (!canZip) throw new Error('This browser is too old to read compressed sync data');
      plain = await pipe(plain, DecompressionStream);
    }
    return JSON.parse(dec.decode(plain));
  }

  /* ---------- server ---------- */
  async function call(method, body, c = C()) {
    let res;
    try {
      res = await fetch(`${normUrl(c.url)}/sync`, { method, headers: { Authorization: `Bearer ${await token(c.key)}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    } catch { throw new Error(navigator.onLine ? 'Can’t reach your sync server' : 'You’re offline'); }
    const j = await res.json().catch(() => ({}));
    if (res.status === 409) { const e = new Error('Conflict'); e.conflict = true; e.version = j.version; throw e; }
    if (!res.ok) throw new Error(j.error || `Sync server error ${res.status}`);
    return j;
  }

  /** { version, doc } — doc is the decrypted sync document or null. */
  async function read(c = C()) {
    const j = await call('GET', null, c);
    return { version: j.version || 0, doc: j.doc ? await decrypt(j.doc, c.key) : null };
  }
  /** Compare-and-swap write; throws {conflict} when another device wrote first. */
  async function write(doc, version, c = C()) {
    const j = await call('PUT', { version, doc: await encrypt(doc, c.key) }, c);
    return j.version;
  }

  const configured = () => !!(C().url && C().key);

  /** Check the server and the key, then save them for this browser. Returns a short status text. */
  async function connect(url, key) {
    url = normUrl(url); key = norm(key);
    if (!/^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)/.test(url)) throw new Error('The server address should start with https://');
    if (key.length < 20) throw new Error('That sync key looks too short');
    let ping;
    try { ping = await (await fetch(`${url}/`, { cache: 'no-store' })).json(); } catch { throw new Error('Can’t reach that address — check the Worker URL'); }
    if (ping.app !== 'daily-sync') throw new Error('That address doesn’t look like your sync server');
    if (!ping.db) throw new Error('The Worker has no database yet — add the D1 binding called DB');
    const probe = { url, key };
    const { doc } = await read(probe); // throws for a wrong key
    const c = C(); Object.assign(c, { url, key: newGroups(key), on: true, version: 0, synced: {}, lastSync: 0 });
    store.save('cloud');
    return doc ? 'Connected — your data from the other device will be merged in.' : 'Connected — this device will create your synced data.';
  }
  const newGroups = (k) => norm(k).match(/.{1,4}/g).join('-');
  function disconnect() { const c = C(); Object.assign(c, { url: '', key: '', version: 0, synced: {}, lastSync: 0 }); store.save('cloud'); }

  /* ---------- setting up another device with one link ---------- */
  function setupLink() {
    const c = C();
    const payload = b64(enc.encode(JSON.stringify({ u: c.url, k: c.key })));
    return `${location.origin}${location.pathname}#sync=${encodeURIComponent(payload)}`; // the part after # never reaches any server
  }
  /** Called on start-up: if the address has #sync=…, offer to connect this device. */
  async function fromLink() {
    const m = location.hash.match(/^#sync=(.+)$/);
    if (!m) return false;
    history.replaceState(null, '', `${location.pathname}#home`);
    let data;
    try { data = JSON.parse(dec.decode(unb64(decodeURIComponent(m[1])))); } catch { PD.toast('That sync link is broken'); return true; }
    if (!confirm(`Connect this device to your sync server?\n\n${data.u}\n\nYour data on this device will be merged with your other devices.`)) return true;
    try { PD.toast(await connect(data.u, data.k)); PD.sync.init(); } catch (e) { PD.toast(`Sync link: ${e.message}`); }
    return true;
  }

  PD.cloud = { newKey, configured, connect, disconnect, read, write, setupLink, fromLink, norm, encrypt, decrypt };
})(window.PD);
