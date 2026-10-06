/* Google: OAuth (authorization code + PKCE, refresh token kept in this browser),
   live Google Calendar events, and a small API helper used by sync.js for Google Drive. */
(function (PD) {
  const { store, keyOf } = PD;
  const SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/drive.appdata'];
  const G = () => store.get('google');
  const redirectUri = () => location.origin + location.pathname;

  /* ---------- auth ---------- */
  const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  async function connect() {
    const g = G();
    if (!g.clientId || !g.clientSecret) throw new Error('Enter your Google Client ID and secret first');
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
    const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    sessionStorage.setItem('pd.pkce', verifier);
    const q = new URLSearchParams({
      client_id: g.clientId, redirect_uri: redirectUri(), response_type: 'code', scope: SCOPES.join(' '),
      access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state: 'google',
      code_challenge: challenge, code_challenge_method: 'S256',
    });
    location.href = `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
  }

  async function tokenRequest(params) {
    const g = G();
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({ client_id: g.clientId, client_secret: g.clientSecret, ...params }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (j.error === 'invalid_grant') { g.refreshToken = ''; g.accessToken = ''; store.save('google'); throw new Error('Google sign-in expired — reconnect in Settings.'); }
      throw new Error(j.error_description || j.error || `Google sign-in failed (${res.status})`);
    }
    g.accessToken = j.access_token; g.expiresAt = Date.now() + (j.expires_in - 60) * 1000;
    if (j.refresh_token) g.refreshToken = j.refresh_token;
    if (j.id_token) { try { g.email = JSON.parse(atob(j.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email || g.email; } catch { /* ignore */ } }
    store.save('google');
  }

  /** Completes the OAuth redirect if this page load is one. */
  async function handleRedirect() {
    const q = new URLSearchParams(location.search);
    if (q.get('state') !== 'google') return false;
    history.replaceState(null, '', `${location.pathname}#calendar`);
    if (q.get('error')) { PD.toast('Google connection was cancelled'); return true; }
    try {
      await tokenRequest({ code: q.get('code'), grant_type: 'authorization_code', redirect_uri: redirectUri(), code_verifier: sessionStorage.getItem('pd.pkce') || '' });
      sessionStorage.removeItem('pd.pkce');
      await loadCalendars();
      PD.toast(`Google connected${G().email ? ` as ${G().email}` : ''} 🎉`);
      PD.sync?.now();
    } catch (e) { PD.toast(e.message); }
    return true;
  }

  async function accessToken() {
    const g = G();
    if (!g.refreshToken) throw new Error('Not connected to Google');
    if (!g.accessToken || Date.now() > g.expiresAt) await tokenRequest({ refresh_token: g.refreshToken, grant_type: 'refresh_token' });
    return G().accessToken;
  }

  async function api(url, opts = {}, retry = true) {
    const token = await accessToken();
    const res = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` } });
    if (res.status === 401 && retry) { G().expiresAt = 0; return api(url, opts, false); }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error?.message || `Google API error ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  }

  async function disconnect() {
    const g = G();
    try { if (g.refreshToken) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(g.refreshToken)}`, { method: 'POST' }); } catch { /* ignore */ }
    Object.assign(g, { accessToken: '', refreshToken: '', expiresAt: 0, email: '', fileId: '', synced: {} });
    store.save('google'); clearCache();
  }

  const connected = () => !!G().refreshToken;

  /* ---------- calendar ---------- */
  async function loadCalendars() {
    const j = await api('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader&fields=items(id,summary,summaryOverride,backgroundColor,selected,primary)');
    const g = G(); const prev = Object.fromEntries((g.calendars || []).map((c) => [c.id, c.enabled]));
    g.calendars = (j.items || []).map((c) => ({
      id: c.id, name: c.summaryOverride || c.summary, color: c.backgroundColor || '#4285f4', primary: !!c.primary,
      enabled: prev[c.id] ?? (c.selected !== false || c.primary),
    })).sort((a, b) => (b.primary - a.primary) || a.name.localeCompare(b.name));
    store.save('google'); clearCache();
  }

  const CACHE_KEY = 'pd.cache.gcal';
  const STALE = 10 * 60e3;
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { cache = {}; }
  const inflight = new Set(); const failedAt = {};
  function clearCache() { cache = {}; try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ } }
  function persist() { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* ignore */ } }

  const monthsBetween = (from, to) => {
    const out = []; const d = PD.parseKey(from); d.setDate(1); const end = PD.parseKey(to);
    for (; d <= end; d.setMonth(d.getMonth() + 1)) out.push(`${d.getFullYear()}-${PD.pad(d.getMonth() + 1)}`);
    return out;
  };

  function mapEvent(e, cal) {
    if (!e.start || e.status === 'cancelled') return [];
    const allDay = !!e.start.date;
    const bday = e.eventType === 'birthday' || /#contacts@|addressbook#/.test(cal.id);
    const first = allDay ? e.start.date : keyOf(new Date(e.start.dateTime));
    const last = allDay ? PD.shiftKey(e.end?.date || first, -1) : first;
    const time = allDay ? '' : PD.fmt.time(new Date(e.start.dateTime));
    const out = [];
    for (let k = first, n = 0; k <= last && n < 31; k = PD.shiftKey(k, 1), n++) {
      out.push({
        id: `g-${e.id}-${k}`, gid: e.id, type: bday ? 'birthday' : 'google', readonly: true, google: true, date: k, occursOn: k, time,
        displayTitle: (bday ? '' : '') + (e.summary || '(no title)'), color: cal.color, notes: [e.location, cal.name].filter(Boolean).join(' · '), link: e.htmlLink,
      });
    }
    return out;
  }

  async function fetchMonth(m) {
    if (inflight.has(m) || (failedAt[m] && Date.now() - failedAt[m] < 120e3)) return;
    inflight.add(m);
    try {
      const [y, mo] = m.split('-').map(Number);
      const tMin = new Date(y, mo - 1, 1).toISOString(); const tMax = new Date(y, mo, 1).toISOString();
      const cals = (G().calendars || []).filter((c) => c.enabled);
      const lists = await Promise.all(cals.map((c) => api(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.id)}/events?`
        + new URLSearchParams({ timeMin: tMin, timeMax: tMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '250', fields: 'items(id,summary,start,end,location,htmlLink,eventType,status)' }))
        .then((j) => (j.items || []).flatMap((e) => mapEvent(e, c))).catch(() => [])));
      cache[m] = { t: Date.now(), events: lists.flat() };
      persist();
      PD.gcal.onUpdate?.();
    } catch { failedAt[m] = Date.now(); } finally { inflight.delete(m); }
  }

  /** Cached Google events in [from, to]; refreshes stale months in the background. */
  let calsLoading = null;
  function eventsBetween(from, to) {
    if (!connected() || G().calendarOn === false) return [];
    if (!(G().calendars || []).length) {
      // calendar list not known yet (e.g. connected on another version): fetch it once, then refresh views
      if (!calsLoading) calsLoading = loadCalendars().then(() => PD.gcal.onUpdate?.()).catch(() => { setTimeout(() => { calsLoading = null; }, 120e3); });
      return [];
    }
    const seen = new Set(); const out = [];
    monthsBetween(from, to).forEach((m) => {
      const c = cache[m];
      if (!c || Date.now() - c.t > STALE) fetchMonth(m);
      (c?.events || []).forEach((e) => { if (e.occursOn >= from && e.occursOn <= to && !seen.has(e.id)) { seen.add(e.id); out.push(e); } });
    });
    return out;
  }

  PD.google = { connect, handleRedirect, api, disconnect, connected, loadCalendars, redirectUri, SCOPES };
  PD.gcal = { eventsBetween, refresh: () => { clearCache(); PD.gcal.onUpdate?.(); }, onUpdate: null };
})(window.PD);
