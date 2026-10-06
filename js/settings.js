/* Settings dialog: profile, theme, location, news sources, backup. */
(function (PD) {
  const { esc, $, $$, store } = PD;

  const PALETTES = [
    ['aurora', 'Aurora', ['#6155f5', '#1d9bf0', '#12a679']],
    ['volt', 'Volt', ['#141414', '#b5e61d', '#14b8a6']],
    ['sunset', 'Sunset', ['#e8553e', '#f2a03d', '#c2417a']],
    ['ocean', 'Ocean', ['#0f8b8d', '#2f6fde', '#3a9d5d']],
    ['pastel', 'Pastel', ['#c9b8ff', '#b8ecd7', '#ffd3b6']],
  ];

  function applyTheme() {
    document.documentElement.dataset.palette = store.get('settings').palette || 'aurora';
    const t = store.get('settings').theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
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
    return `<h3 class="sub">Phone app</h3><div class="install-card"><img src="icons/icon-192.png" alt=""><div>${body}</div></div>`;
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
    const inst = $('#installApp', body);
    if (inst) inst.onclick = async () => { if (await PD.pwa.install()) close(); };
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
          <label class="grow">Theme<select name="theme">
            ${[['auto', 'Match system'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<option value="${v}" ${s.theme === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select></label>
        </div>

        <h3 class="sub">Colour scheme</h3>
        <div class="palettes" role="radiogroup">${PALETTES.map(([id, label, cols]) => `
          <label class="palette"><input type="radio" name="palette" value="${id}" ${(s.palette || 'aurora') === id ? 'checked' : ''}>
            <span class="swatches">${cols.map((c) => `<i style="background:${c}"></i>`).join('')}</span><span>${label}</span></label>`).join('')}
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
      bindGoogle(body, close);
      if (section === 'google') setTimeout(() => $('#googleSettings', body)?.scrollIntoView({ block: 'start' }), 50);
      let loc = s.location;
      const prevPalette = s.palette; const prevTheme = s.theme; let saved = false;
      // live preview while picking
      $$('input[name=palette]', body).forEach((r) => (r.onchange = () => { document.documentElement.dataset.palette = r.value; }));
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
        s.name = f.name.value.trim(); s.theme = f.theme.value; s.location = loc;
        s.palette = f.palette.value; saved = true;
        saveGoogle(f);
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
