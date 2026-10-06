/* Sync between devices through a private file in your Google Drive "app data" folder
   (hidden from your normal Drive and only readable by this app with your Google login).
   Each data key carries a last-modified time; when both devices changed the same key since the
   last sync, the two versions are merged (lists by id, dated records by date) so nothing is lost. */
(function (PD) {
  const { store } = PD;
  const KEYS = ['settings', 'tasks', 'events', 'diet', 'health', 'workouts']; // never: strava, google (credentials)
  const FILE = 'dashboard-sync.json';
  const DRIVE = 'https://www.googleapis.com/drive/v3';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
  const G = () => store.get('google');

  let state = 'off'; let running = null; let again = false; let lastError = '';

  /* ---------- merge ---------- */
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const hasIds = (arr) => arr.length && arr.every((x) => isObj(x) && x.id != null);

  /** Merge two versions of the same value; `preferB` decides plain conflicts. */
  function merge(a, b, preferB) {
    if (a === undefined) return b;
    if (b === undefined) return a;
    if (Array.isArray(a) && Array.isArray(b)) {
      if ((hasIds(a) || !a.length) && (hasIds(b) || !b.length) && (a.length || b.length)) {
        const map = new Map(); const order = [];
        (preferB ? [...a, ...b] : [...b, ...a]).forEach((x) => { if (!map.has(x.id)) order.push(x.id); map.set(x.id, x); });
        // keep the preferred side's ordering first (e.g. routine order), then the extras
        const first = (preferB ? b : a).map((x) => x.id);
        return [...new Set([...first, ...order])].map((id) => map.get(id));
      }
      if (a.every((x) => typeof x === 'string') && b.every((x) => typeof x === 'string')) return [...new Set([...a, ...b])];
      return preferB ? b : a;
    }
    if (isObj(a) && isObj(b)) {
      const out = {};
      new Set([...Object.keys(a), ...Object.keys(b)]).forEach((k) => { out[k] = merge(a[k], b[k], preferB); });
      return out;
    }
    return preferB ? b : a;
  }

  /* ---------- drive file ---------- */
  async function findFile() {
    const g = G();
    if (g.fileId) return g.fileId;
    const q = encodeURIComponent(`name='${FILE}'`);
    const j = await PD.google.api(`${DRIVE}/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`);
    g.fileId = j.files?.[0]?.id || ''; store.save('google');
    return g.fileId;
  }
  async function readRemote(id) {
    if (!id) return null;
    try { return await PD.google.api(`${DRIVE}/files/${id}?alt=media`); } catch (e) {
      if (/404|not found/i.test(e.message)) { G().fileId = ''; store.save('google'); return null; }
      throw e;
    }
  }
  async function writeRemote(id, doc) {
    const body = JSON.stringify(doc);
    if (id) return PD.google.api(`${UPLOAD}/files/${id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
    const boundary = `pd${Date.now()}`;
    const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: FILE, parents: ['appDataFolder'] })}\r\n`
      + `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
    const res = await PD.google.api(`${UPLOAD}/files?uploadType=multipart&fields=id`, { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipart });
    G().fileId = res.id; store.save('google');
    return res;
  }

  const device = () => (/iphone|ipad/i.test(navigator.userAgent) ? 'iPhone' : /android/i.test(navigator.userAgent) ? 'Android' : /mac/i.test(navigator.userAgent) ? 'Mac' : /win/i.test(navigator.userAgent) ? 'Windows' : 'Browser');

  /* ---------- sync ---------- */
  async function run() {
    const g = G();
    const id = await findFile();
    const remote = (await readRemote(id)) || { app: 'personal-dashboard', version: 1, keys: {} };
    remote.keys = remote.keys || {};
    let push = false; const pulled = [];
    KEYS.forEach((k) => {
      const L = store.modified(k); const R = remote.keys[k]?.t || 0; const last = g.synced[k] || 0;
      const localChanged = L > last; const remoteChanged = R > last;
      if (remoteChanged && !localChanged) {
        store.setFromSync(k, remote.keys[k].v, R); g.synced[k] = R; pulled.push(k);
      } else if (localChanged && !remoteChanged) {
        remote.keys[k] = { t: L, v: store.get(k) }; g.synced[k] = L; push = true;
      } else if (localChanged && remoteChanged) {
        const merged = merge(store.get(k), remote.keys[k].v, R > L);
        const t = Date.now();
        store.setFromSync(k, merged, t); remote.keys[k] = { t, v: merged }; g.synced[k] = t; push = true; pulled.push(k);
      }
    });
    if (push) { remote.updated = new Date().toISOString(); remote.device = device(); await writeRemote(id, remote); }
    g.lastSync = Date.now(); store.save('google');
    return pulled;
  }

  async function now() {
    if (!enabled()) { setState('off'); return; }
    if (running) { again = true; return running; }
    setState('busy');
    running = run().then((pulled) => {
      lastError = ''; setState('ok');
      if (pulled.length) refreshView(pulled);
    }).catch((e) => { lastError = e.message; setState('error'); })
      .finally(() => { running = null; if (again) { again = false; now(); } });
    return running;
  }

  function refreshView(keys) {
    if (keys.includes('settings')) PD.settings.applyTheme();
    const busy = document.querySelector('#modal[open], #player') || document.activeElement?.matches?.('input, textarea, select');
    if (busy) { PD.toast('Synced changes from your other device'); return; }
    PD.app.renderCurrent();
  }

  const enabled = () => PD.google.connected() && G().syncOn !== false;

  function setState(s) {
    state = s;
    const b = document.getElementById('syncBtn');
    if (!b) return;
    b.hidden = s === 'off';
    b.dataset.state = s;
    const when = G().lastSync ? PD.fmt.ago(G().lastSync) : 'never';
    b.title = s === 'error' ? `Sync problem: ${lastError} — click to retry` : s === 'busy' ? 'Syncing…' : `Synced ${when} — click to sync now`;
  }

  // sync shortly after local edits, when coming back to the app, and every 5 minutes
  const soon = PD.debounce(() => now(), 3000);
  store.onChange((key, opts) => { if (KEYS.includes(key) && !opts?.fromSync && enabled()) soon(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && enabled() && Date.now() - G().lastSync > 60e3) now(); });
  window.addEventListener('online', () => enabled() && now());
  setInterval(() => { if (enabled() && !document.hidden) now(); }, 5 * 60e3);

  function init() {
    const b = document.getElementById('syncBtn');
    if (b) b.onclick = () => { if (state === 'error' && /reconnect|Not connected/i.test(lastError)) PD.settings.open('google'); else now(); };
    setState(enabled() ? 'ok' : 'off');
    if (enabled()) now();
  }

  PD.sync = { now, init, merge, state: () => state, lastError: () => lastError, KEYS };
})(window.PD);
