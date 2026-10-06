/* Live NMBS/SNCB train departures and your favourite connection, via the free iRail API (api.irail.be). */
(function (PD) {
  const { esc, $, $$, fmt, store } = PD;
  const BASES = ['https://api.irail.be/v1', 'https://api.irail.be'];
  const S = () => store.get('settings');
  const cfg = () => ({ station: 'Herentals', to: '', ...(S().commute || {}) });

  async function irail(path, params) {
    const q = new URLSearchParams({ format: 'json', lang: 'en', ...params });
    let err;
    for (const b of BASES) {
      try { return await PD.fetchJSON(`${b}/${path}/?${q}`); } catch (e) { err = e; }
    }
    throw err;
  }

  const time = (unix) => fmt.time(new Date(Number(unix) * 1000));
  const delayMin = (d) => Math.round(Number(d || 0) / 60);
  const delayHtml = (d) => (delayMin(d) > 0 ? `<span class="delay">+${delayMin(d)}′</span>` : '');
  const vehicle = (v) => v?.shortname || String(v?.name || '').replace(/^BE\.NMBS\./, '');
  /** "IC 2134" → ['IC', '2134']; "S1 5123" → ['S1', '5123'] */
  const split = (s) => { const m = s.match(/^([A-Z]+\d*)\s+(.*)$/); return m ? [m[1], m[2]] : [(s.match(/^[A-Z]+/) || [''])[0], s.replace(/^[A-Z]+\s?/, '')]; };

  let timer;
  async function load(force) {
    const el = $('#trains');
    if (!el) return;
    const c = cfg();
    const ck = `pd.cache.trains.${c.station}.${c.to}`;
    let data = null;
    try { const x = JSON.parse(localStorage.getItem(ck)); if (x && !force && Date.now() - x.t < 60e3) data = x.v; } catch { /* ignore */ }
    if (!data) {
      try {
        const [board, conn] = await Promise.all([
          irail('liveboard', { station: c.station, arrdep: 'departure' }),
          c.to ? irail('connections', { from: c.station, to: c.to, results: '3' }).catch(() => null) : null,
        ]);
        data = { board, conn };
        try { localStorage.setItem(ck, JSON.stringify({ t: Date.now(), v: data })); } catch { /* ignore */ }
      } catch (e) {
        el.innerHTML = head(c) + `<p class="empty">Couldn't load trains for ${esc(c.station)} (${esc(e.message)}). <button class="link" data-tr-refresh>Try again</button></p>`;
        bind(); return;
      }
    }
    render(data, c);
    clearInterval(timer);
    timer = setInterval(() => { if (PD.app.current() === 'home' && !document.hidden && $('#trains')) load(); else clearInterval(timer); }, 120e3);
  }

  const head = (c) => `<div class="card-head"><h2>🚆 Trains</h2><span class="muted small">from ${esc(c.station)}</span>
    <button class="icon-btn sm" data-tr-cfg title="Choose stations" aria-label="Choose stations"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg></button>
    <button class="icon-btn sm" data-tr-refresh title="Refresh" aria-label="Refresh trains"><svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg></button></div>`;

  function render(data, c) {
    const el = $('#trains');
    const deps = (data.board?.departures?.departure || []).filter((d) => d.left !== '1').slice(0, 5);
    const conns = data.conn?.connection || [];
    el.innerHTML = `${head(c)}
      ${c.to && conns.length ? `<h3 class="sub">Next to ${esc(c.to)}</h3>
        <ul class="conns">${conns.map((x) => {
          const vias = Number(x.vias?.number || 0); const cancel = x.departure.canceled === '1';
          return `<li class="${cancel ? 'cancel' : ''}"><b>${time(x.departure.time)}</b>${delayHtml(x.departure.delay)}
            <span class="arrow">→</span><b>${time(x.arrival.time)}</b>${delayHtml(x.arrival.delay)}
            <span class="muted small">${Math.round(Number(x.duration) / 60)} min · ${vias ? `${vias} change${vias > 1 ? 's' : ''}` : 'direct'}${x.departure.platform ? ` · platform ${esc(x.departure.platform)}` : ''}</span>
            ${cancel ? '<span class="pill small peach">Cancelled</span>' : ''}</li>`;
        }).join('')}</ul>` : ''}
      <h3 class="sub">Departures</h3>
      ${deps.length ? `<ul class="board">${deps.map((d) => {
        const [type, num] = split(vehicle(d.vehicleinfo)); const cancel = d.canceled === '1';
        return `<li class="${cancel ? 'cancel' : ''}">
          <span class="dep-time"><b>${time(d.time)}</b>${delayHtml(d.delay)}</span>
          <span class="dep-dest">${esc(d.station)}<span class="muted small"><span class="train-type t-${esc(type.replace(/\d+$/, ''))}">${esc(type || 'Train')}</span> ${esc(num)}</span></span>
          ${cancel ? '<span class="pill small peach">Cancelled</span>' : d.platform && d.platform !== '?' ? `<span class="platform" title="Platform">${esc(d.platform)}</span>` : ''}
        </li>`;
      }).join('')}</ul>` : '<p class="empty">No departures in the next hour.</p>'}
      <p class="muted small">Live data from iRail · updated ${fmt.time(new Date())}</p>`;
    bind();
  }

  function bind() {
    $$('[data-tr-refresh]').forEach((b) => (b.onclick = () => load(true)));
    $$('[data-tr-cfg]').forEach((b) => (b.onclick = configure));
  }

  async function stations() {
    try { const x = JSON.parse(localStorage.getItem('pd.cache.stations')); if (x && Date.now() - x.t < 30 * 864e5) return x.v; } catch { /* ignore */ }
    try {
      const j = await irail('stations', {});
      const names = (j.station || []).map((s) => s.standardname || s.name).filter(Boolean).sort();
      localStorage.setItem('pd.cache.stations', JSON.stringify({ t: Date.now(), v: names }));
      return names;
    } catch { return []; }
  }

  async function configure() {
    const c = cfg();
    PD.modal('Train stations', `
      <form id="trForm" class="form">
        <label>Departure station<input name="station" list="stList" value="${esc(c.station)}" required placeholder="e.g. Herentals, Geel, Olen"></label>
        <label>Favourite destination (optional)<input name="to" list="stList" value="${esc(c.to)}" placeholder="e.g. Antwerpen-Centraal, Leuven"></label>
        <datalist id="stList"></datalist>
        <p class="muted small">Nearest stations to Westerlo: Herentals, Olen, Geel, Heist-op-den-Berg.</p>
        <div class="row gap end"><button type="button" class="btn ghost" data-cancel>Cancel</button><button class="btn">Save</button></div>
      </form>`, async (body, close) => {
      $('[data-cancel]', body).onclick = close;
      $('#trForm', body).onsubmit = (e) => {
        e.preventDefault();
        S().commute = { station: e.target.station.value.trim(), to: e.target.to.value.trim() };
        store.save('settings'); close(); load(true);
      };
      const list = await stations();
      const dl = $('#stList', body); if (dl) dl.innerHTML = list.map((n) => `<option value="${esc(n)}">`).join('');
    });
  }

  PD.trains = { load };
})(window.PD);
