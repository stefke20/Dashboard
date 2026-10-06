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

  function open() {
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
