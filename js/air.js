/* Air quality & pollen (Open-Meteo / Copernicus CAMS, Europe). */
(function (PD) {
  const { esc, $, $$, fmt, store } = PD;

  // grains/m³ thresholds for low / moderate / high / very high
  const POLLEN = [
    { id: 'birch', name: 'Birch', icon: '🌳', key: 'birch_pollen', th: [1, 10, 50, 200], season: 'Mar–May' },
    { id: 'alder', name: 'Alder', icon: '🌲', key: 'alder_pollen', th: [1, 10, 50, 200], season: 'Jan–Apr' },
    { id: 'grass', name: 'Grass', icon: '🌾', key: 'grass_pollen', th: [1, 5, 20, 50], season: 'May–Aug' },
    { id: 'mugwort', name: 'Mugwort', icon: '🌿', key: 'mugwort_pollen', th: [1, 5, 15, 40], season: 'Jul–Sep' },
    { id: 'ragweed', name: 'Ragweed', icon: '🍂', key: 'ragweed_pollen', th: [1, 5, 15, 40], season: 'Aug–Oct' },
    { id: 'olive', name: 'Olive', icon: '🫒', key: 'olive_pollen', th: [1, 10, 50, 200], season: 'Apr–Jun' },
  ];
  const LEVELS = [
    { label: 'None', cls: 'lv0' }, { label: 'Low', cls: 'lv1' }, { label: 'Moderate', cls: 'lv2' },
    { label: 'High', cls: 'lv3' }, { label: 'Very high', cls: 'lv4' },
  ];
  const level = (v, th) => (v == null || v < th[0] ? 0 : v < th[1] ? 1 : v < th[2] ? 2 : v < th[3] ? 3 : 4);

  // European Air Quality Index bands
  const AQI = [[20, 'Good', 'lv1'], [40, 'Fair', 'lv1'], [60, 'Moderate', 'lv2'], [80, 'Poor', 'lv3'], [100, 'Very poor', 'lv4'], [Infinity, 'Extremely poor', 'lv4']];
  const aqiBand = (v) => AQI.find(([max]) => v <= max);

  const CK = (loc) => `pd.cache.air.${loc.lat},${loc.lon}`;

  async function load(force) {
    const el = $('#air');
    if (!el) return;
    const loc = store.get('settings').location;
    let data = null;
    try { const c = JSON.parse(localStorage.getItem(CK(loc))); if (c && (!force && Date.now() - c.t < 30 * 60e3)) data = c.v; } catch { /* ignore */ }
    if (!data) {
      const vars = ['european_aqi', 'pm2_5', 'pm10', 'ozone', 'nitrogen_dioxide', ...POLLEN.map((p) => p.key)].join(',');
      try {
        data = await PD.fetchJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lon}&current=${vars}&hourly=${POLLEN.map((p) => p.key).join(',')},european_aqi&timezone=auto&forecast_days=4`);
        try { localStorage.setItem(CK(loc), JSON.stringify({ t: Date.now(), v: data })); } catch { /* ignore */ }
      } catch (e) {
        try { data = JSON.parse(localStorage.getItem(CK(loc)))?.v; } catch { data = null; }
        if (!data) { el.innerHTML = head() + `<p class="empty">Couldn't load air quality (${esc(e.message)}). <button class="link" data-air-retry>Try again</button></p>`; bind(); return; }
      }
    }
    render(data);
  }

  const head = () => `<div class="card-head"><h2>Air &amp; pollen</h2>
    <button class="icon-btn sm" data-air-cfg title="My allergies" aria-label="Choose your allergies"><svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.5-7 11-7 11z"/></svg></button>
    <button class="icon-btn sm" data-air-retry title="Refresh" aria-label="Refresh air quality"><svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg></button></div>`;

  function daily(data, key) {
    const out = {};
    (data.hourly?.time || []).forEach((t, i) => { const d = t.slice(0, 10); const v = data.hourly[key]?.[i]; if (v != null) out[d] = Math.max(out[d] ?? 0, v); });
    return Object.entries(out).slice(0, 4);
  }

  function render(data) {
    const el = $('#air');
    const mine = store.get('settings').allergies || [];
    const c = data.current || {};
    const aqi = Math.round(c.european_aqi ?? 0); const band = aqiBand(aqi);
    const rows = POLLEN.map((p) => {
      const days = daily(data, p.key);
      const todayMax = days[0]?.[1] ?? c[p.key] ?? 0;
      return { ...p, now: c[p.key] ?? 0, today: todayMax, lv: level(todayMax, p.th), days, mine: mine.includes(p.id) };
    }).sort((a, b) => (b.mine - a.mine) || (b.lv - a.lv));
    const active = rows.filter((r) => r.lv > 0 || r.mine);
    const alert = rows.filter((r) => r.mine && r.lv >= 2);
    const tip = alert.length
      ? `🤧 ${alert.map((r) => r.name).join(' & ')} pollen ${LEVELS[Math.max(...alert.map((r) => r.lv))].label.toLowerCase()} today — keep windows closed in the morning and take your medication.`
      : active.some((r) => r.lv >= 3) ? '🌼 High pollen levels today.'
      : !rows.some((r) => r.lv > 0) ? '🍃 No pollen in the air right now.' : '🙂 Pollen levels are low for you today.';

    el.innerHTML = `${head()}
      <div class="aqi">
        <div class="aqi-badge ${band[2]}"><b data-count="${aqi}">0</b><span>EAQI</span></div>
        <div><b>${band[1]} air quality</b>
          <span class="muted small">PM2.5 ${fmt.num(c.pm2_5, 1)} · PM10 ${fmt.num(c.pm10, 1)} · O₃ ${fmt.num(c.ozone)} µg/m³</span></div>
      </div>
      <p class="wx-tip ${alert.length ? 'warn' : ''}">${esc(tip)}</p>
      ${(active.length ? active : rows.slice(0, 3)).map((r) => `
        <div class="pollen ${LEVELS[r.lv].cls}${r.mine ? ' mine' : ''}">
          <span class="pollen-name">${r.icon} ${esc(r.name)}${r.mine ? ' <span class="pill small pink">you</span>' : ''}</span>
          <span class="meter" title="${fmt.num(r.today)} grains/m³">${[1, 2, 3, 4].map((i) => `<i class="${i <= r.lv ? 'on' : ''}"></i>`).join('')}</span>
          <span class="small lvl">${LEVELS[r.lv].label}</span>
          <span class="pollen-days">${r.days.slice(1).map(([d, v]) => `<span class="lvdot ${LEVELS[level(v, r.th)].cls}" title="${esc(fmt.weekday(PD.parseKey(d)))}: ${LEVELS[level(v, r.th)].label}">${esc(fmt.weekday(PD.parseKey(d)).slice(0, 2))}</span>`).join('')}</span>
        </div>`).join('')}
      ${!rows.some((r) => r.lv > 0) ? `<p class="muted small">Seasons: ${POLLEN.slice(0, 5).map((p) => `${p.name} ${p.season}`).join(' · ')}</p>` : ''}`;
    bind(); PD.fx.countUp(el);
  }

  function bind() {
    $$('[data-air-retry]').forEach((b) => (b.onclick = () => load(true)));
    $$('[data-air-cfg]').forEach((b) => (b.onclick = allergyModal));
  }

  function allergyModal() {
    const s = store.get('settings'); const mine = s.allergies || [];
    PD.modal('My pollen allergies', `
      <form id="alForm" class="form">
        <p class="muted small">Pick what you're allergic to: those are shown first and you get a warning on days they're moderate or higher.</p>
        <div class="allergy-grid">${POLLEN.map((p) => `<label class="palette"><input type="checkbox" name="al" value="${p.id}" ${mine.includes(p.id) ? 'checked' : ''}><span style="font-size:24px">${p.icon}</span><span>${p.name}</span><span class="muted small">${p.season}</span></label>`).join('')}</div>
        <div class="row gap end"><button type="button" class="btn ghost" data-cancel>Cancel</button><button class="btn">Save</button></div>
      </form>`, (body, close) => {
      $('[data-cancel]', body).onclick = close;
      $('#alForm', body).onsubmit = (e) => {
        e.preventDefault();
        s.allergies = $$('input[name=al]:checked', body).map((i) => i.value);
        store.save('settings'); close(); load();
      };
    });
  }

  PD.air = { load, POLLEN };
})(window.PD);
