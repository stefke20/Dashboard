/* Settings dialog: profile, theme, location, news sources, backup. */
(function (PD) {
  const { esc, $, $$, store } = PD;

  const PALETTES = [
    ['aurora', 'Aurora', ['#6155f5', '#1d9bf0', '#12a679']],
    ['volt', 'Volt', ['#141414', '#b5e61d', '#14b8a6']],
    ['sunset', 'Sunset', ['#e8553e', '#f2a03d', '#c2417a']],
    ['ocean', 'Ocean', ['#0f8b8d', '#2f6fde', '#3a9d5d']],
    ['pastel', 'Pastel', ['#c9b8ff', '#b8ecd7', '#ffd3b6']],
    ['season', 'Seasonal (auto)', null],
    ['autumn', 'Autumn 🍂', ['#c2571a', '#d9822b', '#5f7f2a']],
    ['winter', 'Winter ❄', ['#1e3a8a', '#3b82f6', '#93c5fd']],
    ['spring', 'Spring 🌸', ['#2f9e5b', '#8bd17c', '#f49ac1']],
    ['summer', 'Summer ☀', ['#0891b2', '#f59e0b', '#ef476f']],
  ];
  const swatchesFor = (id) => PALETTES.find(([p]) => p === id)?.[2];

  function applyTheme() {
    const pal = store.get('settings').palette || 'aurora';
    document.documentElement.dataset.palette = PD.seasons.resolve(pal);
    document.documentElement.dataset.seasonal = PD.seasons.isSeasonal(pal) ? PD.seasons.resolve(pal) : '';
    let t = store.get('settings').theme;
    if (t === 'sun') t = isNight() ? 'dark' : 'light';
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--accent-violet-ink').trim() || '#6155f5';
  }

  /** Dark between sunset and sunrise (from today's forecast, or 07:00–19:30 as a fallback). */
  function isNight() {
    const loc = store.get('settings').location;
    let rise = 7 * 60; let set = 19 * 60 + 30;
    try {
      const wx = JSON.parse(localStorage.getItem(`pd.cache.wx.${loc.lat},${loc.lon}`))?.v;
      const k = PD.todayKey(); const i = wx?.daily?.time?.indexOf(k);
      if (i >= 0) { const r = new Date(wx.daily.sunrise[i]); const st = new Date(wx.daily.sunset[i]); rise = r.getHours() * 60 + r.getMinutes(); set = st.getHours() * 60 + st.getMinutes(); }
    } catch { /* use fallback */ }
    const n = new Date(); const m = n.getHours() * 60 + n.getMinutes();
    return m < rise || m >= set;
  }

  function spotifySection() {
    const sp = store.get('spotify');
    return `<h3 class="sub" id="spotifySettings">Spotify</h3>
      ${PD.spotify.connected() ? `<div class="g-status"><span class="pill mint">Connected</span> <b>${esc(sp.user || 'Spotify account')}</b><span class="spacer"></span><button type="button" class="btn sm ghost danger" id="spOff">Disconnect</button></div>
        <p class="muted small">Play/pause/skip from the dashboard needs Spotify Premium; showing what's playing works with any account.</p>`
      : `<details class="calc"><summary>One-time setup (2 minutes)</summary>
          <ol class="steps small">
            <li>Open the <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener">Spotify Developer Dashboard</a>, log in and press <b>Create app</b> (any name/description).</li>
            <li>Add this <b>Redirect URI</b>: <code class="copy">${esc(PD.spotify.redirectUri())}</code> <button type="button" class="link small" id="spCopy">copy</button></li>
            <li>Tick <b>Web API</b>, save, then open <b>Settings</b> and copy the <b>Client ID</b> (no secret needed).</li>
          </ol></details>
        <div class="row gap"><input class="grow" name="spClientId" value="${esc(sp.clientId)}" placeholder="Spotify Client ID" autocomplete="off"><button type="button" class="btn spotify-btn" id="spConnect">Connect Spotify</button></div>`}`;
  }
  function bindSpotify(body, close) {
    const c = $('#spConnect', body);
    if (c) c.onclick = async () => { store.get('spotify').clientId = body.querySelector('[name=spClientId]').value.trim(); store.save('spotify'); try { await PD.spotify.connect(); } catch (e) { PD.toast(e.message); } };
    const cp = $('#spCopy', body); if (cp) cp.onclick = () => { navigator.clipboard?.writeText(PD.spotify.redirectUri()); PD.toast('Redirect URI copied'); };
    const off = $('#spOff', body); if (off) off.onclick = () => { PD.spotify.disconnect(); close(); open('spotify'); PD.app.renderCurrent(); };
  }

  function remindersSection() {
    const r = PD.reminders.cfg(); const s = store.get('settings');
    const perm = !('Notification' in window) ? 'unsupported' : Notification.permission;
    return `<h3 class="sub">Reminders &amp; feel</h3>
      ${perm === 'unsupported' ? '<p class="muted small">This browser doesn\'t support notifications (on iPhone: install the app to your home screen first).</p>'
        : perm !== 'granted' ? '<div class="row gap"><span class="muted small grow">Allow notifications to get reminders on this device.</span><button type="button" class="btn sm" id="notifAllow">Allow notifications</button></div>' : ''}
      <label class="toggle"><input type="checkbox" name="rEvents" ${r.events ? 'checked' : ''}> 15 minutes before events</label>
      <label class="toggle"><input type="checkbox" name="rWorkouts" ${r.workouts ? 'checked' : ''}> Planned workouts (at their time, or 18:00)</label>
      <label class="toggle"><input type="checkbox" name="rWater" ${r.water ? 'checked' : ''}> Drink water when behind (9:00–21:00)</label>
      <label class="toggle"><input type="checkbox" name="rFasting" ${r.fasting ? 'checked' : ''}> When a fast reaches its goal</label>
      <label class="toggle"><input type="checkbox" name="haptics" ${s.haptics !== false ? 'checked' : ''}> Haptic feedback (vibration on phones)</label>
      <p class="muted small">Reminders work while the dashboard is open or running in the background.</p>`;
  }
  function saveReminders(f) {
    const s = store.get('settings');
    s.reminders = { ...PD.reminders.cfg(), events: f.rEvents.checked, workouts: f.rWorkouts.checked, water: f.rWater.checked, fasting: f.rFasting.checked };
    s.haptics = f.haptics.checked;
  }

  /* ---------- App install + Google sections ---------- */
  function appSection() {
    const st = PD.pwa.status();
    const body = {
      installed: '<p>✅ Daily is installed as an app on this device.</p>',
      prompt: '<p>Install Daily as an app: it opens full-screen from your home screen and works offline.</p><button type="button" class="btn sm" id="installApp">Install app</button>',
      ios: '<p>On iPhone: tap the <b>Share</b> button in Safari, then <b>Add to Home Screen</b>.</p>',
      manual: '<p>On your phone, open this page in Chrome (Android) or Safari (iPhone) and choose <b>Install app</b> / <b>Add to Home Screen</b> from the browser menu.</p>',
    }[st];
    return `<h3 class="sub">Phone app</h3><div class="install-card"><img src="icons/icon-192.png" alt=""><div>${body}</div></div>
      <div class="row gap wrap app-ver"><span class="muted small grow">App version <b>${PD.pwa.version}</b> — compare with the latest update to check you're up to date.</span><button type="button" class="btn sm ghost" id="checkUpdate">↻ Check for update</button><button type="button" class="btn sm ghost" id="tourAgain">🧭 Take the tour</button></div>`;
  }

  function googleSection() {
    const g = store.get('google');
    const on = PD.google.connected();
    const uri = PD.google.redirectUri();
    return `<h3 class="sub" id="googleSettings">Google Calendar &amp; sync</h3>
      ${on ? `
        <div class="g-status"><span class="pill mint">Connected</span> <b>${esc(g.email || 'Google account')}</b>
          <span class="muted small">${g.lastSync ? `last synced ${PD.fmt.ago(g.lastSync)}` : ''}</span>
          <span class="spacer"></span><button type="button" class="btn sm ghost" id="gSync">Sync now</button><button type="button" class="btn sm ghost danger" id="gOff">Disconnect</button></div>
        <label class="toggle"><input type="checkbox" name="syncOn" ${g.syncOn !== false ? 'checked' : ''}> Sync my data between devices (private file in your Google Drive)</label>
        <label class="toggle"><input type="checkbox" name="calendarOn" ${g.calendarOn !== false ? 'checked' : ''}> Show Google Calendar events</label>
        <div class="cal-list">${(g.calendars || []).map((c) => `<label class="toggle small"><input type="checkbox" data-gcal="${esc(c.id)}" ${c.enabled ? 'checked' : ''}><i class="dot g" style="--ev:${esc(c.color)}"></i>${esc(c.name)}</label>`).join('') || '<span class="muted small">No calendars found.</span>'}
          <button type="button" class="link small" id="gReload">Refresh calendar list</button></div>
        ${PD.sync.state() === 'error' ? `<p class="warn-note small">Sync problem: ${esc(PD.sync.lastError())}</p>` : ''}`
      : `<p class="small">Connect your Google account once to see your <b>Google Calendar</b> (incl. birthdays) here and to <b>sync</b> everything between your laptop and phone. Your data goes to a hidden, private app folder in <i>your own</i> Google Drive.</p>
        <details class="calc"><summary>One-time setup (about 5 minutes)</summary>
          <ol class="steps small">
            <li>Open <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener">Google Cloud Console</a> and create a project (e.g. "Daily").</li>
            <li>Enable the <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noopener">Google Calendar API</a> and the <a href="https://console.cloud.google.com/apis/library/drive.googleapis.com" target="_blank" rel="noopener">Google Drive API</a>.</li>
            <li>Go to <b>Google Auth Platform → Branding/Audience</b>: choose <b>External</b>, fill in an app name and your email. Then under <b>Audience</b> press <b>Publish app</b> (otherwise Google logs you out every 7 days). You'll later see an "unverified app" screen — that's your own app, choose <i>Advanced → Go to Daily</i>.</li>
            <li>Under <b>Clients</b> create an <b>OAuth client ID</b> of type <b>Web application</b> with this <b>Authorised redirect URI</b>:<br><code class="copy" id="gUri">${esc(uri)}</code> <button type="button" class="link small" id="gCopy">copy</button></li>
            <li>Paste the Client ID and Client secret below and press Connect. Do the same Connect step once on your phone.</li>
          </ol>
        </details>
        <div class="row gap wrap">
          <label class="grow">Client ID<input name="gClientId" value="${esc(g.clientId)}" autocomplete="off" placeholder="…apps.googleusercontent.com"></label>
          <label class="grow">Client secret<input name="gClientSecret" type="password" value="${esc(g.clientSecret)}" autocomplete="off"></label>
        </div>
        ${location.protocol === 'file:' ? '<p class="warn-note small">Google sign-in needs the page served over https (e.g. GitHub Pages).</p>' : ''}
        <button type="button" class="btn" id="gConnect">Connect Google</button>`}`;
  }

  function bindGoogle(body, close) {
    const g = store.get('google');
    const connect = $('#gConnect', body);
    if (connect) connect.onclick = async () => {
      g.clientId = body.querySelector('[name=gClientId]').value.trim();
      g.clientSecret = body.querySelector('[name=gClientSecret]').value.trim();
      store.save('google');
      try { await PD.google.connect(); } catch (e) { PD.toast(e.message); }
    };
    const copy = $('#gCopy', body);
    if (copy) copy.onclick = () => { navigator.clipboard?.writeText(PD.google.redirectUri()); PD.toast('Redirect URI copied'); };
    const sync = $('#gSync', body);
    if (sync) sync.onclick = async () => { sync.disabled = true; await PD.sync.now(); close(); open('google'); };
    const off = $('#gOff', body);
    if (off) off.onclick = async () => {
      if (!confirm('Disconnect Google? Your data stays on this device and in your Drive.')) return;
      await PD.google.disconnect(); PD.sync.init(); close(); open('google'); PD.app.renderCurrent();
    };
    const reload = $('#gReload', body);
    if (reload) reload.onclick = async () => { try { await PD.google.loadCalendars(); close(); open('google'); } catch (e) { PD.toast(e.message); } };
    const na = $('#notifAllow', body);
    if (na) na.onclick = async () => { if (await PD.reminders.ask()) { na.parentElement.remove(); PD.reminders.notify('Notifications on 🔔', 'You will get reminders here.'); } };
    const inst = $('#installApp', body);
    if (inst) inst.onclick = async () => { if (await PD.pwa.install()) close(); };
    const ta = $('#tourAgain', body); if (ta) ta.onclick = () => { close(); setTimeout(() => PD.tour.start(), 300); };
    const upd = $('#checkUpdate', body); if (upd) upd.onclick = () => { upd.disabled = true; upd.textContent = 'Updating…'; PD.pwa.update(); };
  }

  function saveGoogle(f) {
    const g = store.get('google');
    if (!PD.google.connected()) return;
    const prevCal = JSON.stringify([g.calendarOn, g.calendars.map((c) => c.enabled)]);
    g.syncOn = f.syncOn?.checked ?? g.syncOn;
    g.calendarOn = f.calendarOn?.checked ?? g.calendarOn;
    $$('[data-gcal]', f).forEach((cb) => { const c = g.calendars.find((x) => x.id === cb.dataset.gcal); if (c) c.enabled = cb.checked; });
    store.save('google');
    if (JSON.stringify([g.calendarOn, g.calendars.map((c) => c.enabled)]) !== prevCal) PD.gcal.refresh();
    PD.sync.init();
  }

  function open(section) {
    const s = store.get('settings');
    PD.modal('Settings', `
      <form id="setForm" class="form">
        <div class="row gap wrap">
          <label class="grow">Your name<input name="name" value="${esc(s.name)}" maxlength="40" placeholder="Used in the greeting"></label>
          <label class="grow">Your birthday<input type="date" name="birthday" value="${esc(s.birthday || '')}" title="For a little surprise on the day"></label>
          <label class="grow">Theme<select name="theme">
            ${[['auto', 'Match system'], ['sun', 'Dark after sunset'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<option value="${v}" ${s.theme === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select></label>
        </div>

        <h3 class="sub">Colour scheme</h3>
        <div class="palettes" role="radiogroup">${PALETTES.map(([id, label, cols]) => `
          <label class="palette"><input type="radio" name="palette" value="${id}" ${(s.palette || 'aurora') === id ? 'checked' : ''}>
            <span class="swatches">${(cols || swatchesFor(PD.seasons.current())).map((c) => `<i style="background:${c}"></i>`).join('')}</span><span>${label}</span></label>`).join('')}
          ${PD.rewards.REWARDS.filter((r) => r.type === 'theme').map((r) => {
            const un = PD.rewards.isUnlocked(r);
            return `<label class="palette${un ? '' : ' locked'}" title="${un ? 'Unlocked with a badge' : '🔒 Unlock with a badge — see the Locker in My workout'}"><input type="radio" name="palette" value="${r.id}" ${(s.palette || 'aurora') === r.id ? 'checked' : ''} ${un ? '' : 'disabled'}>
              <span class="swatches">${r.preview.map((c) => `<i style="background:${c}"></i>`).join('')}</span><span>${un ? '🎁' : '🔒'} ${esc(r.name)}</span></label>`;
          }).join('')}
        </div>

        <h3 class="sub">Weather location</h3>
        <div class="row gap">
          <input class="grow" id="locQuery" placeholder="Search a town…" value="${esc(s.location.name)}" aria-label="Location">
          <button type="button" class="btn ghost" id="locSearch">Search</button>
        </div>
        <ul class="results" id="locResults"></ul>

        <h3 class="sub">News sources</h3>
        <ul class="feed-list" id="feedList">${s.feeds.map((f) => `
          <li><label class="toggle grow"><input type="checkbox" data-feed="${esc(f.id)}" ${f.enabled ? 'checked' : ''}> <b>${esc(f.name)}</b>
            <span class="muted small ellipsis">${esc(f.url)}</span></label>
            <button type="button" class="icon-btn sm ghost" data-rm="${esc(f.id)}" aria-label="Remove ${esc(f.name)}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></li>`).join('')}
        </ul>
        <div class="row gap wrap">
          <input class="grow" id="feedName" placeholder="Name" maxlength="30">
          <input class="grow" id="feedUrl" type="url" placeholder="RSS feed URL">
          <button type="button" class="btn ghost" id="feedAdd">Add feed</button>
        </div>

        ${googleSection()}
        ${spotifySection()}
        ${remindersSection()}
        ${appSection()}

        <h3 class="sub">Your data</h3>
        <p class="muted small">Everything is stored locally in this browser. Make a backup now and then, or to move to another device.</p>
        <div class="row gap wrap">
          <button type="button" class="btn ghost" id="backup">⬇ Download backup</button>
          <label class="btn ghost">⬆ Restore backup<input type="file" id="restore" accept="application/json,.json" hidden></label>
          <button type="button" class="btn ghost danger" id="reset">Reset everything</button>
        </div>
        <div class="row gap end"><button class="btn" type="submit">Done</button></div>
      </form>`, (body, close) => {
      const f = $('#setForm', body);
      bindGoogle(body, close); bindSpotify(body, close);
      if (section === 'google' || section === 'spotify') setTimeout(() => $(section === 'google' ? '#googleSettings' : '#spotifySettings', body)?.scrollIntoView({ block: 'start' }), 50);
      let loc = s.location;
      const prevPalette = s.palette; const prevTheme = s.theme; let saved = false;
      // live preview while picking
      $$('input[name=palette]', body).forEach((r) => (r.onchange = () => { document.documentElement.dataset.palette = PD.seasons.resolve(r.value); }));
      f.theme.onchange = () => { s.theme = f.theme.value; applyTheme(); s.theme = prevTheme; };
      $('#modal').addEventListener('close', () => { if (!saved) { s.palette = prevPalette; s.theme = prevTheme; applyTheme(); } }, { once: true });

      const searchLoc = async () => {
        const q = $('#locQuery').value.trim();
        const out = $('#locResults');
        if (!q) return;
        out.innerHTML = '<li class="muted small">Searching…</li>';
        try {
          const j = await PD.fetchJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en`);
          const res = j.results || [];
          out.innerHTML = res.length ? res.map((r, i) => `<li><button type="button" data-i="${i}"><b>${esc(r.name)}</b><span class="muted small">${esc([r.admin1, r.country].filter(Boolean).join(', '))}</span></button></li>`).join('') : '<li class="muted small">No places found.</li>';
          $$('button[data-i]', out).forEach((b) => (b.onclick = () => {
            const r = res[+b.dataset.i];
            loc = { name: `${r.name}, ${r.country}`, lat: r.latitude, lon: r.longitude };
            $('#locQuery').value = loc.name; out.innerHTML = '';
          }));
        } catch (e) { out.innerHTML = `<li class="muted small">Search failed: ${esc(e.message)}</li>`; }
      };
      $('#locSearch').onclick = searchLoc;
      $('#locQuery').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); searchLoc(); } };

      $$('[data-rm]', body).forEach((b) => (b.onclick = () => { b.closest('li').remove(); }));
      $('#feedAdd').onclick = () => {
        const name = $('#feedName').value.trim(); const url = $('#feedUrl').value.trim();
        if (!name || !/^https?:\/\//.test(url)) { PD.toast('Enter a name and a valid feed URL'); return; }
        const id = `c${PD.uid()}`;
        $('#feedList').insertAdjacentHTML('beforeend', `<li><label class="toggle grow"><input type="checkbox" data-feed="${id}" data-name="${esc(name)}" data-url="${esc(url)}" checked> <b>${esc(name)}</b><span class="muted small ellipsis">${esc(url)}</span></label></li>`);
        $('#feedName').value = ''; $('#feedUrl').value = '';
      };

      $('#backup').onclick = () => PD.download(`dashboard-backup-${PD.todayKey()}.json`, store.exportAll());
      $('#restore').onchange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try { store.importAll(await PD.readFile(file)); close(); applyTheme(); PD.app.renderCurrent(); PD.toast('Backup restored'); } catch (err) { PD.toast(`Restore failed: ${err.message}`); }
      };
      $('#reset').onclick = () => {
        if (!confirm('Delete ALL dashboard data in this browser (food log, health, calendar, settings)? Make a backup first!')) return;
        store.resetAll(); close(); applyTheme(); PD.app.renderCurrent();
      };

      f.onsubmit = (e) => {
        e.preventDefault();
        const prevLoc = s.location;
        s.name = f.name.value.trim(); s.theme = f.theme.value; s.location = loc; s.birthday = f.birthday.value;
        s.palette = f.palette.value; saved = true;
        saveGoogle(f); saveReminders(f);
        s.feeds = $$('[data-feed]', body).map((cb) => {
          const existing = s.feeds.find((x) => x.id === cb.dataset.feed);
          return existing ? { ...existing, enabled: cb.checked } : { id: cb.dataset.feed, name: cb.dataset.name, url: cb.dataset.url, enabled: cb.checked };
        });
        store.save('settings'); applyTheme(); close();
        if (prevLoc.lat !== loc.lat || prevLoc.lon !== loc.lon) PD.toast(`Weather location: ${loc.name}`);
        PD.app.renderCurrent();
      };
    });
  }

  PD.settings = { open, applyTheme };
})(window.PD);
