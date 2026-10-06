/* Spotify "now playing" with controls.
   OAuth authorization code + PKCE (no client secret needed); tokens stay in this browser.
   Controls (play/pause/skip/volume) need Spotify Premium — that's a Spotify rule. */
(function (PD) {
  const { esc, $, $$, store } = PD;
  const SP = () => store.get('spotify');
  const SCOPES = 'user-read-currently-playing user-read-playback-state user-modify-playback-state user-read-recently-played';
  const redirectUri = () => location.origin + location.pathname;
  const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  /* ---------- auth ---------- */
  async function connect() {
    const s = SP();
    if (!s.clientId) throw new Error('Enter your Spotify Client ID first');
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
    const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    sessionStorage.setItem('pd.spkce', verifier);
    location.href = `https://accounts.spotify.com/authorize?${new URLSearchParams({
      response_type: 'code', client_id: s.clientId, scope: SCOPES, redirect_uri: redirectUri(),
      code_challenge_method: 'S256', code_challenge: challenge, state: 'spotify',
    })}`;
  }

  async function token(params) {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: SP().clientId, ...params }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (j.error === 'invalid_grant') { Object.assign(SP(), { accessToken: '', refreshToken: '' }); store.save('spotify'); throw new Error('Spotify sign-in expired — reconnect in Settings.'); }
      throw new Error(j.error_description || `Spotify sign-in failed (${res.status})`);
    }
    const s = SP();
    s.accessToken = j.access_token; s.expiresAt = Date.now() + (j.expires_in - 60) * 1000;
    if (j.refresh_token) s.refreshToken = j.refresh_token; // Spotify rotates refresh tokens
    store.save('spotify');
  }

  async function handleRedirect() {
    const q = new URLSearchParams(location.search);
    if (q.get('state') !== 'spotify') return false;
    history.replaceState(null, '', `${location.pathname}#home`);
    if (q.get('error')) { PD.toast('Spotify connection was cancelled'); return true; }
    try {
      await token({ grant_type: 'authorization_code', code: q.get('code'), redirect_uri: redirectUri(), code_verifier: sessionStorage.getItem('pd.spkce') || '' });
      sessionStorage.removeItem('pd.spkce');
      const me = await api('/me');
      SP().user = me?.display_name || me?.id || ''; store.save('spotify');
      PD.toast(`Spotify connected${SP().user ? ` as ${SP().user}` : ''} 🎵`);
    } catch (e) { PD.toast(e.message); }
    return true;
  }

  const connected = () => !!SP().refreshToken;
  function disconnect() { Object.assign(SP(), { accessToken: '', refreshToken: '', expiresAt: 0, user: '' }); store.save('spotify'); state = null; }

  async function api(path, opts = {}, retry = true) {
    const s = SP();
    if (!s.refreshToken) throw new Error('Not connected to Spotify');
    if (!s.accessToken || Date.now() > s.expiresAt) await token({ grant_type: 'refresh_token', refresh_token: s.refreshToken });
    const res = await fetch(`https://api.spotify.com/v1${path}`, { ...opts, headers: { Authorization: `Bearer ${SP().accessToken}`, ...(opts.body ? { 'Content-Type': 'application/json' } : {}) } });
    if (res.status === 401 && retry) { SP().expiresAt = 0; return api(path, opts, false); }
    if (res.status === 204 || res.status === 202) return null;
    if (res.status === 403) throw new Error('Spotify Premium is needed to control playback from here.');
    if (res.status === 404) throw new Error('No active Spotify device — start playing on your phone or computer first.');
    if (res.status === 429) throw new Error('Spotify asks us to slow down — try again in a moment.');
    if (!res.ok) throw new Error(`Spotify error ${res.status}`);
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  }

  /* ---------- player state ---------- */
  let state = null; let fetchedAt = 0; let poll = null; let lastErr = '';
  async function refresh() {
    try {
      let s = await api('/me/player?additional_types=episode');
      if (!s) {
        const r = await api('/me/player/recently-played?limit=1').catch(() => null);
        s = { recent: r?.items?.[0]?.track || null };
      }
      state = s; fetchedAt = Date.now(); lastErr = '';
    } catch (e) { lastErr = e.message; }
    draw();
  }

  async function control(action) {
    const s = state || {};
    const id = s.device?.id ? `?device_id=${encodeURIComponent(s.device.id)}` : '';
    try {
      if (action === 'toggle') {
        if (s.is_playing) { s.is_playing = false; draw(); await api(`/me/player/pause${id}`, { method: 'PUT' }); } else { s.is_playing = true; fetchedAt = Date.now(); draw(); await api(`/me/player/play${id}`, { method: 'PUT' }); }
      }
      if (action === 'next') await api(`/me/player/next${id}`, { method: 'POST' });
      if (action === 'prev') await api(`/me/player/previous${id}`, { method: 'POST' });
      if (action === 'shuffle') await api(`/me/player/shuffle?state=${!s.shuffle_state}${id ? `&${id.slice(1)}` : ''}`, { method: 'PUT' });
      PD.haptic?.(10);
    } catch (e) { PD.toast(e.message); }
    setTimeout(refresh, 450);
  }

  const mmss = (ms) => `${Math.floor(ms / 60000)}:${PD.pad(Math.floor((ms % 60000) / 1000))}`;
  const progress = () => {
    if (!state?.item) return 0;
    const p = (state.progress_ms || 0) + (state.is_playing ? Date.now() - fetchedAt : 0);
    return Math.min(p, state.item.duration_ms);
  };

  /* ---------- Home card ---------- */
  const ICON = {
    prev: '<svg viewBox="0 0 24 24"><path d="M19 5 9 12l10 7zM5 5v14"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="m5 5 10 7-10 7zM19 5v14"/></svg>',
    play: '<svg viewBox="0 0 24 24" class="fill"><path d="M7 4.5v15l12-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
  };

  function draw() {
    const el = $('#spotify');
    if (!el) return;
    if (!connected()) {
      el.innerHTML = `<div class="card-head"><h2><span class="brand-badge spotify">♫</span> Spotify</h2></div>
        <p class="muted small">See what's playing and control your music from here.</p>
        <button class="btn sm spotify-btn" id="spSetup">Connect Spotify</button>`;
      $('#spSetup', el).onclick = () => PD.settings.open('spotify');
      return;
    }
    const s = state || {};
    const item = s.item || s.recent;
    const art = item?.album?.images?.[0]?.url || item?.images?.[0]?.url || '';
    const artists = item?.artists?.map((a) => a.name).join(', ') || item?.show?.name || '';
    const live = !!s.item;
    el.innerHTML = `
      ${art ? `<div class="sp-bg" style="background-image:url('${esc(art)}')"></div>` : ''}
      <div class="card-head"><h2><span class="brand-badge spotify">♫</span> ${live ? (s.is_playing ? 'Now playing' : 'Paused') : 'Spotify'}</h2>
        ${s.device ? `<span class="muted small">🔊 ${esc(s.device.name)}</span>` : ''}</div>
      ${item ? `
        <div class="sp-now">
          ${art ? `<img class="sp-art${s.is_playing ? ' spinning' : ''}" src="${esc(art)}" alt="">` : '<div class="sp-art empty">♫</div>'}
          <div class="sp-meta">
            <a class="sp-title" href="${esc(item.external_urls?.spotify || 'https://open.spotify.com')}" target="_blank" rel="noopener">${esc(item.name)}</a>
            <span class="muted small">${esc(artists)}</span>
            ${!live ? '<span class="muted small">Last played — start Spotify on a device to control it here.</span>' : ''}
            ${s.is_playing ? '<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' : ''}
          </div>
        </div>
        ${live ? `
          <div class="sp-progress"><span id="spCur">${mmss(progress())}</span><span class="bar-track"><i id="spBar" style="width:${(progress() / item.duration_ms) * 100}%;animation:none"></i></span><span>${mmss(item.duration_ms)}</span></div>
          <div class="sp-controls">
            <button class="icon-btn sm ghost${s.shuffle_state ? ' on' : ''}" data-sp="shuffle" aria-label="Shuffle" title="Shuffle">${ICON.shuffle}</button>
            <button class="icon-btn" data-sp="prev" aria-label="Previous">${ICON.prev}</button>
            <button class="sp-play" data-sp="toggle" aria-label="${s.is_playing ? 'Pause' : 'Play'}">${s.is_playing ? ICON.pause : ICON.play}</button>
            <button class="icon-btn" data-sp="next" aria-label="Next">${ICON.next}</button>
            <a class="icon-btn sm ghost" href="${esc(item.external_urls?.spotify || 'https://open.spotify.com')}" target="_blank" rel="noopener" aria-label="Open in Spotify" title="Open in Spotify">↗</a>
          </div>` : ''}`
      : `<p class="muted small">${esc(lastErr || 'Nothing playing right now.')}</p>`}`;
    $$('[data-sp]', el).forEach((b) => (b.onclick = () => control(b.dataset.sp)));
  }

  function tick() {
    const bar = $('#spBar'); const cur = $('#spCur');
    if (bar && state?.item) { bar.style.width = `${(progress() / state.item.duration_ms) * 100}%`; cur.textContent = mmss(progress()); }
    if (state?.item && state.is_playing && progress() >= state.item.duration_ms) refresh(); // next song
  }

  function card() {
    draw();
    if (!connected()) return;
    refresh();
    clearInterval(poll);
    let n = 0;
    poll = setInterval(() => {
      if (!$('#spotify') && !$('#plMusic')) { clearInterval(poll); return; }
      tick();
      if (++n % (document.hidden ? 30 : 6) === 0) refresh(); // every ~6 s while visible
    }, 1000);
  }

  /* ---------- mini player in the workout player ---------- */
  function mini(el) {
    if (!el || !connected()) return;
    const drawMini = () => {
      const s = state || {}; const it = s.item;
      el.innerHTML = it ? `<span class="pl-music-title">♫ ${esc(it.name)} <span>· ${esc(it.artists?.map((a) => a.name).join(', ') || '')}</span></span>
        <button class="pl-icon sm" data-spm="prev" aria-label="Previous song">${ICON.prev}</button>
        <button class="pl-icon sm" data-spm="toggle" aria-label="Play or pause music">${s.is_playing ? ICON.pause : ICON.play}</button>
        <button class="pl-icon sm" data-spm="next" aria-label="Next song">${ICON.next}</button>` : '';
      $$('[data-spm]', el).forEach((b) => (b.onclick = async () => { await control(b.dataset.spm); setTimeout(drawMini, 600); }));
    };
    if (!state || Date.now() - fetchedAt > 15e3) refresh().then(drawMini); else drawMini();
  }

  PD.spotify = { connect, handleRedirect, connected, disconnect, card, mini, redirectUri };
})(window.PD);
