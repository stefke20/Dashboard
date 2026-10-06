/* Health: Strava (OAuth, in-browser) + Samsung Health (CSV export import) + manual log. */
(function (PD) {
  const { esc, $, $$, fmt, store, todayKey } = PD;

  const SPORT = {
    Run: '🏃', TrailRun: '🏃', VirtualRun: '🏃', Walk: '🚶', Hike: '🥾', Ride: '🚴', VirtualRide: '🚴', GravelRide: '🚴',
    MountainBikeRide: '🚵', EBikeRide: '🚴', Swim: '🏊', WeightTraining: '🏋️', Workout: '💪', Yoga: '🧘', Rowing: '🚣',
    Elliptical: '🏃', Soccer: '⚽', Tennis: '🎾', Padel: '🎾', Ski: '⛷️', AlpineSki: '⛷️', NordicSki: '⛷️',
  };
  const sportOf = (a) => a.sport_type || a.type;
  const group = (a) => { const s = sportOf(a); return /Run/.test(s) ? 'Run' : /Ride/.test(s) ? 'Ride' : /Walk|Hike/.test(s) ? 'Walk' : 'Other'; };
  let sportFilter = 'All';

  /* ---------- Strava API ---------- */
  const redirectUri = () => location.origin + location.pathname;

  function connectStrava() {
    const s = store.get('strava');
    const url = `https://www.strava.com/oauth/authorize?client_id=${encodeURIComponent(s.clientId)}`
      + `&response_type=code&redirect_uri=${encodeURIComponent(redirectUri())}`
      + '&approval_prompt=auto&scope=read,activity:read_all,activity:write&state=strava';
    location.href = url;
  }

  async function tokenRequest(params) {
    const s = store.get('strava');
    const body = new URLSearchParams({ client_id: s.clientId, client_secret: s.clientSecret, ...params });
    const res = await fetch('https://www.strava.com/oauth/token', { method: 'POST', body });
    const j = await res.json();
    if (!res.ok) throw new Error(j.message || `Strava auth failed (${res.status})`);
    Object.assign(s, { accessToken: j.access_token, refreshToken: j.refresh_token, expiresAt: j.expires_at });
    if (j.athlete) s.athlete = j.athlete;
    store.save('strava');
  }

  /** Called on page load: completes the OAuth redirect if ?code= is present. */
  async function handleRedirect() {
    const q = new URLSearchParams(location.search);
    if (q.get('state') !== 'strava') return false;
    history.replaceState(null, '', location.pathname + '#health');
    if (q.get('error')) { PD.toast('Strava connection was cancelled'); return true; }
    try {
      await tokenRequest({ code: q.get('code'), grant_type: 'authorization_code' });
      PD.toast('Strava connected 🎉');
      await syncStrava();
    } catch (e) { PD.toast(e.message); }
    return true;
  }

  async function api(path, opts = {}) {
    const s = store.get('strava');
    if (Date.now() / 1000 > s.expiresAt - 120) await tokenRequest({ refresh_token: s.refreshToken, grant_type: 'refresh_token' });
    const res = await fetch(`https://www.strava.com/api/v3${path}`, { ...opts, headers: { Authorization: `Bearer ${s.accessToken}` } });
    if (res.status === 401) throw new Error('Strava authorisation expired — please reconnect.');
    if (res.status === 403 && opts.method === 'POST') throw new Error('Reconnect Strava (Health tab → Disconnect → Connect) to allow uploads.');
    if (res.status === 429) throw new Error('Strava rate limit reached, try again in 15 minutes.');
    if (!res.ok) throw new Error(`Strava error ${res.status}`);
    return res.json();
  }

  async function syncStrava() {
    const s = store.get('strava');
    const btn = $('#stravaSync');
    if (btn) { btn.disabled = true; btn.textContent = 'Syncing…'; }
    try {
      s.athlete = await api('/athlete');
      const after = Math.floor(PD.addDays(PD.startOfWeek(new Date()), -7 * 25).getTime() / 1000); // ~6 months
      let page = 1; let acts = [];
      for (;;) {
        const batch = await api(`/athlete/activities?after=${after}&per_page=100&page=${page}`);
        acts = acts.concat(batch);
        if (batch.length < 100 || page >= 5) break;
        page++;
      }
      s.activities = acts.map((a) => ({
        id: a.id, name: a.name, type: a.type, sport_type: a.sport_type, start: a.start_date_local,
        distance: a.distance, moving_time: a.moving_time, elevation: a.total_elevation_gain,
        avg_hr: a.average_heartrate, avg_speed: a.average_speed, kudos: a.kudos_count, kj: a.kilojoules,
      })).sort((a, b) => b.start.localeCompare(a.start));
      try { s.stats = await api(`/athletes/${s.athlete.id}/stats`); } catch { /* stats are optional */ }
      s.lastSync = Date.now();
      store.save('strava');
      PD.toast(`Synced ${s.activities.length} activities`);
    } catch (e) { PD.toast(e.message); }
    if (PD.app.current() === 'health') render();
  }

  function weekSummary() {
    const s = store.get('strava');
    if (!s.accessToken || !s.activities.length) return null;
    const wkStart = PD.keyOf(PD.startOfWeek(new Date()));
    const acts = s.activities.filter((a) => a.start.slice(0, 10) >= wkStart);
    return {
      count: acts.length, km: acts.reduce((t, a) => t + a.distance / 1000, 0),
      time: acts.reduce((t, a) => t + a.moving_time, 0), elev: acts.reduce((t, a) => t + (a.elevation || 0), 0),
    };
  }

  const pace = (a) => {
    if (!a.distance || !a.moving_time) return '';
    if (group(a) === 'Run' || group(a) === 'Walk') {
      const spk = a.moving_time / (a.distance / 1000);
      return `${Math.floor(spk / 60)}:${PD.pad(Math.round(spk % 60))} /km`;
    }
    return `${fmt.num((a.distance / 1000) / (a.moving_time / 3600), 1)} km/h`;
  };

  function stravaSection() {
    const s = store.get('strava');
    if (!s.accessToken) {
      return `<div class="card strava-setup">
        <div class="card-head"><h2><span class="brand-badge strava">S</span> Strava</h2><span class="pill peach small">Not connected</span></div>
        <p>Strava has an official API, so your runs and rides can show up here. Because this dashboard runs fully in your browser, you use your <b>own</b> (free) Strava API app:</p>
        <ol class="steps">
          <li>Go to <a href="https://www.strava.com/settings/api" target="_blank" rel="noopener">strava.com/settings/api</a> and create an app (any name / website).</li>
          <li>Set <b>Authorization Callback Domain</b> to <code>${esc(location.hostname || 'localhost')}</code>.</li>
          <li>Copy the <b>Client ID</b> and <b>Client Secret</b> below and press Connect.</li>
        </ol>
        <form id="stravaForm" class="form">
          <div class="row gap wrap">
            <label class="grow">Client ID<input name="clientId" inputmode="numeric" required value="${esc(s.clientId)}"></label>
            <label class="grow">Client Secret<input name="clientSecret" type="password" required value="${esc(s.clientSecret)}" autocomplete="off"></label>
          </div>
          <p class="muted small">Credentials and tokens are stored only in this browser's local storage and are never included in backups.</p>
          ${location.protocol === 'file:' ? '<p class="warn-note small">⚠ Strava login needs the page served over http(s) — see the README (GitHub Pages or <code>python3 -m http.server</code>).</p>' : ''}
          <button class="btn strava-btn" type="submit">Connect with Strava</button>
        </form>
      </div>`;
    }
    const wk = weekSummary() || { count: 0, km: 0, time: 0, elev: 0 };
    const ytd = s.stats ? [['Run', s.stats.ytd_run_totals], ['Ride', s.stats.ytd_ride_totals], ['Swim', s.stats.ytd_swim_totals]].filter(([, t]) => t && t.count) : [];
    const groups = ['All', ...new Set(s.activities.map(group))];
    const list = s.activities.filter((a) => sportFilter === 'All' || group(a) === sportFilter);
    return `<div class="card strava">
      <div class="card-head">
        <h2><span class="brand-badge strava">S</span> Strava${s.athlete ? ` · <span class="muted">${esc(s.athlete.firstname || '')}</span>` : ''}</h2>
        <span class="muted small">${s.lastSync ? `Synced ${fmt.ago(s.lastSync)}` : ''}</span>
        <button class="btn sm ghost" id="stravaSync">Sync</button>
        <button class="btn sm ghost" id="stravaOff" title="Disconnect">Disconnect</button>
      </div>
      <div class="stat-row">
        <div class="stat"><span>This week</span><b>${fmt.num(wk.km, 1)} km</b></div>
        <div class="stat"><span>Moving time</span><b>${fmt.duration(wk.time)}</b></div>
        <div class="stat"><span>Elevation</span><b>${fmt.num(wk.elev)} m</b></div>
        <div class="stat"><span>Activities</span><b>${wk.count}</b></div>
      </div>
      ${ytd.length ? `<div class="ytd">${ytd.map(([n, t]) => `<span class="pill ${n === 'Run' ? 'peach' : n === 'Ride' ? 'sky' : 'mint'}">${n} ${new Date().getFullYear()}: <b>${fmt.num(t.distance / 1000)} km</b> · ${t.count}×</span>`).join('')}</div>` : ''}
      <div class="chips" id="sportChips">${groups.map((g) => `<button class="chip${g === sportFilter ? ' active' : ''}" data-g="${g}">${g}</button>`).join('')}</div>
      <h3 class="sub">Weekly distance · last 12 weeks</h3>
      <div class="chart-box" id="weeklyChart"></div>
      <h3 class="sub">Recent activities</h3>
      ${list.length ? `<ul class="acts">${list.slice(0, 10).map((a) => `
        <li><a href="https://www.strava.com/activities/${a.id}" target="_blank" rel="noopener">
          <span class="act-icon" aria-hidden="true">${SPORT[sportOf(a)] || '🏅'}</span>
          <span class="act-main"><b>${esc(a.name)}</b><span class="muted small">${esc(fmt.short(new Date(a.start.slice(0, 19))))} · ${esc(sportOf(a).replace(/([a-z])([A-Z])/g, '$1 $2'))}</span></span>
          <span class="act-stats">
            ${a.distance ? `<span><b>${fmt.num(a.distance / 1000, 2)}</b> km</span>` : ''}
            <span><b>${fmt.duration(a.moving_time)}</b></span>
            ${pace(a) ? `<span class="muted">${pace(a)}</span>` : ''}
            ${a.avg_hr ? `<span class="muted">♥ ${Math.round(a.avg_hr)}</span>` : ''}
          </span></a></li>`).join('')}</ul>` : '<p class="empty">No activities in the last months.</p>'}
    </div>`;
  }

  function drawWeekly() {
    const el = $('#weeklyChart');
    if (!el) return;
    const s = store.get('strava');
    const start = PD.startOfWeek(new Date());
    const weeks = Array.from({ length: 12 }, (_, i) => PD.addDays(start, -7 * (11 - i)));
    const bars = weeks.map((w, i) => {
      const from = PD.keyOf(w); const to = PD.keyOf(PD.addDays(w, 6));
      const acts = s.activities.filter((a) => { const k = a.start.slice(0, 10); return k >= from && k <= to && (sportFilter === 'All' || group(a) === sportFilter); });
      const km = acts.reduce((t, a) => t + a.distance / 1000, 0);
      return {
        label: fmt.dayMonth(w), value: Math.round(km * 10) / 10, highlight: i === 11,
        tip: `<b>Week of ${esc(fmt.dayMonth(w))}</b><br>${fmt.num(km, 1)} km · ${acts.length} activit${acts.length === 1 ? 'y' : 'ies'}<br>${fmt.duration(acts.reduce((t, a) => t + a.moving_time, 0))}`,
      };
    });
    PD.charts.bar(el, bars, { color: 'var(--accent-peach-ink)', label: 'Weekly distance in km', height: 200 });
  }

  /* ---------- Samsung Health / manual ---------- */
  function bodySection() {
    const h = store.get('health');
    const t = todayKey();
    const wKeys = Object.keys(h.weight).sort();
    const latestW = wKeys.length ? h.weight[wKeys[wKeys.length - 1]] : null;
    const prevW = wKeys.length > 1 ? h.weight[wKeys.find((k) => k >= PD.shiftKey(t, -30)) || wKeys[0]] : null;
    const last7 = PD.lastNDays(7);
    const sleeps = last7.map((k) => h.daily[k]?.sleep).filter(Boolean);
    const steps7 = last7.map((k) => h.daily[k]?.steps).filter(Boolean);
    const rhr = last7.map((k) => h.daily[k]?.rhr).filter(Boolean);
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    const today = h.daily[t] || {};

    return `<div class="card">
      <div class="card-head"><h2><span class="brand-badge samsung">♥</span> Body &amp; activity</h2>
        <span class="muted small">Samsung Health import or manual</span></div>
      <div class="stat-row">
        <div class="stat mint"><span>Steps today</span><b>${today.steps ? fmt.num(today.steps) : '—'}</b><small class="muted">goal ${fmt.num(h.stepGoal)}</small></div>
        <div class="stat"><span>Avg steps (7d)</span><b>${steps7.length ? fmt.num(avg(steps7)) : '—'}</b></div>
        <div class="stat sky"><span>Weight</span><b>${latestW ? `${fmt.num(latestW, 1)} kg` : '—'}</b>${latestW && prevW && wKeys.length > 1 ? `<small class="muted">${latestW - prevW > 0 ? '+' : ''}${fmt.num(latestW - prevW, 1)} kg / 30d</small>` : ''}</div>
        <div class="stat violet"><span>Sleep (7d avg)</span><b>${sleeps.length ? `${fmt.num(avg(sleeps), 1)} h` : '—'}</b></div>
        <div class="stat pink"><span>Resting HR (7d)</span><b>${rhr.length ? `${Math.round(avg(rhr))} bpm` : '—'}</b></div>
      </div>
      <div class="two-col">
        <div><h3 class="sub">Steps · last 14 days</h3><div class="chart-box" id="stepsChart"></div></div>
        <div><h3 class="sub">Weight · last 90 days</h3><div class="chart-box" id="weightChart"></div></div>
      </div>
    </div>
    <div class="two-col">
      <div class="card">
        <div class="card-head"><h2>Log today</h2></div>
        <form id="healthForm" class="form">
          <label>Date<input type="date" name="date" value="${t}" max="${t}"></label>
          <div class="row gap wrap">
            <label class="grow">Steps<input type="number" name="steps" min="0" max="200000" value="${today.steps || ''}" placeholder="e.g. 8500"></label>
            <label class="grow">Weight (kg)<input type="number" name="weight" min="20" max="400" step="0.1" value="${h.weight[t] || ''}" placeholder="e.g. 78.4"></label>
          </div>
          <div class="row gap wrap">
            <label class="grow">Sleep (h)<input type="number" name="sleep" min="0" max="24" step="0.1" value="${today.sleep || ''}" placeholder="e.g. 7.5"></label>
            <label class="grow">Resting HR<input type="number" name="rhr" min="25" max="200" value="${today.rhr || ''}" placeholder="bpm"></label>
          </div>
          <div class="row gap wrap">
            <label class="grow">Daily step goal<input type="number" name="stepGoal" min="1000" step="500" value="${h.stepGoal}"></label>
            <label class="grow">Weight goal (kg)<input type="number" name="weightGoal" min="20" max="400" step="0.1" value="${h.weightGoal || ''}"></label>
          </div>
          <button class="btn" type="submit">Save</button>
        </form>
      </div>
      <div class="card">
        <div class="card-head"><h2>Import from Samsung Health</h2></div>
        <p class="small">Samsung Health has no public web API, but it can export everything as CSV files:</p>
        <ol class="steps small">
          <li>Samsung Health app → <b>⋮ menu → Settings → Download personal data</b>.</li>
          <li>Copy the export folder to this computer (it's in <code>Download/Samsung Health</code> on the phone).</li>
          <li>Drop the CSV files below. Recognised: <code>…step_daily_trend…</code>, <code>…pedometer_day_summary…</code>, <code>…health.weight…</code>, <code>…health.sleep…</code>, <code>…heart_rate…</code>.</li>
        </ol>
        <label class="dropzone" id="dropzone">
          <input type="file" id="shFiles" accept=".csv" multiple hidden>
          <span>📂 Drop CSV files here or <u>browse</u></span>
        </label>
        <p class="muted small" id="importResult"></p>
      </div>
    </div>`;
  }

  function drawBody() {
    const h = store.get('health');
    const sEl = $('#stepsChart');
    if (sEl) {
      PD.charts.bar(sEl, PD.lastNDays(14).map((k, i) => ({
        label: fmt.weekday(PD.parseKey(k)).slice(0, 2), value: h.daily[k]?.steps || 0, highlight: i === 13,
        tip: `<b>${esc(fmt.short(PD.parseKey(k)))}</b><br>${h.daily[k]?.steps ? `${fmt.num(h.daily[k].steps)} steps` : 'No data'}`,
      })), { target: h.stepGoal, targetLabel: 'Goal', color: 'var(--accent-mint-ink)', height: 200, label: 'Steps per day' });
    }
    const wEl = $('#weightChart');
    if (wEl) {
      const days = PD.lastNDays(90);
      const has = days.some((k) => h.weight[k]);
      if (!has) { wEl.innerHTML = '<p class="empty">Log or import your weight to see a trend.</p>'; return; }
      const firstIdx = days.findIndex((k) => h.weight[k]);
      PD.charts.line(wEl, days.slice(firstIdx).map((k) => ({
        label: fmt.dayMonth(PD.parseKey(k)), value: h.weight[k] ?? null,
        tip: `<b>${esc(fmt.short(PD.parseKey(k)))}</b><br>${fmt.num(h.weight[k], 1)} kg`,
      })), { goal: h.weightGoal, goalLabel: `Goal ${h.weightGoal || ''} kg`, unit: 'kg', height: 200, label: 'Weight in kg' });
    }
  }

  /* Samsung CSV: first line is "com.samsung…,id,version", second line is the header. */
  function importSamsung(name, text) {
    const rows = PD.parseCSV(text);
    if (rows.length < 2) return 0;
    let hdrIdx = rows[0].length <= 3 && rows.length > 2 ? 1 : 0;
    const header = rows[hdrIdx].map((c) => c.trim().split('.').pop());
    const col = (...names) => names.map((n) => header.indexOf(n)).find((i) => i >= 0) ?? -1;
    const data = rows.slice(hdrIdx + 1);
    const h = store.get('health');
    const toKey = (v) => {
      if (/^\d{11,}$/.test(v)) return new Date(Number(v)).toISOString().slice(0, 10); // day_time = UTC midnight
      const m = String(v).match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
      return m ? m[1] : (String(v).match(/^\d{4}-\d{2}-\d{2}/) || [])[0];
    };
    const day = (k) => (h.daily[k] = h.daily[k] || {});
    let n = 0;
    const lname = name.toLowerCase();

    if (/step_daily_trend|pedometer_day_summary/.test(lname) || (col('day_time') >= 0 && col('count', 'step_count') >= 0)) {
      const dc = col('day_time'); const cc = col('count', 'step_count');
      const best = {};
      data.forEach((r) => { const k = toKey(r[dc]); const v = Number(r[cc]); if (k && v) best[k] = Math.max(best[k] || 0, v); });
      Object.entries(best).forEach(([k, v]) => { day(k).steps = v; n++; });
    } else if (/health\.weight/.test(lname) || col('weight') >= 0) {
      const tc = col('start_time', 'create_time'); const wc = col('weight');
      data.forEach((r) => { const k = toKey(r[tc]); const v = Number(r[wc]); if (k && v > 20) { h.weight[k] = Math.round(v * 10) / 10; n++; } });
    } else if (/health\.sleep/.test(lname) && !/stage|combined|raw/.test(lname)) {
      const sc = col('start_time'); const ec = col('end_time');
      const total = {};
      data.forEach((r) => {
        const s = new Date(r[sc].replace(' ', 'T')); const e = new Date(r[ec].replace(' ', 'T'));
        const hours = (e - s) / 3600e3;
        if (hours > 0 && hours < 20) { const k = PD.keyOf(e); total[k] = (total[k] || 0) + hours; }
      });
      Object.entries(total).forEach(([k, v]) => { day(k).sleep = Math.round(v * 10) / 10; n++; });
    } else if (/heart_rate/.test(lname) && col('heart_rate') >= 0) {
      // approximate resting HR: lowest 10th percentile of the day's readings
      const tc = col('start_time'); const hc = col('heart_rate');
      const per = {};
      data.forEach((r) => { const k = toKey(r[tc]); const v = Number(r[hc]); if (k && v > 25 && v < 220) (per[k] = per[k] || []).push(v); });
      Object.entries(per).forEach(([k, vals]) => { vals.sort((a, b) => a - b); day(k).rhr = vals[Math.floor(vals.length * 0.1)]; n++; });
    }
    store.save('health');
    return n;
  }

  async function handleFiles(files) {
    const out = [];
    for (const f of files) {
      try { const n = importSamsung(f.name, await PD.readFile(f)); out.push(`${f.name}: ${n ? `${n} days` : 'not recognised'}`); } catch (e) { out.push(`${f.name}: ${e.message}`); }
    }
    render();
    const r = $('#importResult'); if (r) r.textContent = out.join(' · ');
  }

  /* ---------- home workouts (from the My workout tab) ---------- */
  async function uploadWorkout(w) {
    const body = new URLSearchParams({
      name: `${w.emoji || ''} ${w.name}`.trim(), sport_type: 'Workout', type: 'Workout', start_date_local: (() => { const d = new Date(w.start); return `${PD.keyOf(d)}T${PD.pad(d.getHours())}:${PD.pad(d.getMinutes())}:${PD.pad(d.getSeconds())}`; })(),
      elapsed_time: String(w.duration), description: `${w.exercises}/${w.total} exercises · ~${w.kcal} kcal · logged with my dashboard`, trainer: '1',
    });
    const a = await api('/activities', { method: 'POST', body });
    w.stravaId = a.id; store.save('workouts');
  }

  const RATING = ['', '😌', '🙂', '😅', '🥵'];
  function workoutSection() {
    const st = PD.workout.stats();
    const log = store.get('workouts').log.slice().sort((a, b) => b.start.localeCompare(a.start));
    const wk = weekSummary();
    const activeMin = st.weekMin + (wk ? wk.time / 60 : 0);
    return `<div class="card">
      <div class="card-head"><h2><span class="brand-badge workout">🏋</span> Home workouts</h2>
        <a class="btn sm ghost" href="#workout">Open My workout →</a></div>
      <div class="stat-row">
        <div class="stat peach"><span>Workouts this week</span><b>${st.weekCount} / ${st.goal}</b><small>${st.streak ? `🔥 ${st.streak} week streak` : 'weekly goal'}</small></div>
        <div class="stat"><span>Workout minutes</span><b data-count="${Math.round(st.weekMin)}">0</b><small class="muted">this week</small></div>
        <div class="stat"><span>Calories burned</span><b data-count="${Math.round(st.weekKcal)}">0</b><small class="muted">this week</small></div>
        <div class="stat violet"><span>All activity</span><b data-count="${Math.round(activeMin)}">0</b><small>min incl. Strava</small></div>
      </div>
      <div class="two-col">
        <div><h3 class="sub">Workout minutes · last 12 weeks</h3><div class="chart-box" id="wkChart"></div></div>
        <div><h3 class="sub">Recent sessions</h3>
          ${log.length ? `<ul class="sessions">${log.slice(0, 6).map((l) => `
            <li><span class="act-icon" aria-hidden="true">${esc(l.emoji || '🏋️')}</span>
              <span class="act-main"><b>${esc(l.name)}${l.partial ? ' <span class="pill small peach">partial</span>' : ''}</b>
                <span class="muted small">${esc(PD.relDay(l.date))} · ${fmt.duration(l.duration)} · ${l.exercises}/${l.total} exercises${l.stravaId ? ' · on Strava' : ''}</span></span>
              <span class="act-stats"><b>${fmt.num(l.kcal)}</b> kcal ${l.rating ? RATING[l.rating] : ''}</span>
              <button class="icon-btn sm ghost" data-wdel="${l.id}" aria-label="Delete session"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></li>`).join('')}</ul>`
            : '<p class="empty">No home workouts yet. Pick a routine in <a href="#workout">My workout</a> and press Start.</p>'}
        </div>
      </div>
    </div>`;
  }

  function drawWorkouts() {
    const el = $('#wkChart');
    if (!el) return;
    const weeks = PD.workout.weeklyMinutes(12);
    PD.charts.bar(el, weeks.map((w, i) => ({
      label: fmt.dayMonth(w.week), value: Math.round(w.min), highlight: i === 11,
      tip: `<b>Week of ${esc(fmt.dayMonth(w.week))}</b><br>${w.count} workout${w.count === 1 ? '' : 's'} · ${fmt.num(w.min)} min<br>~${fmt.num(w.kcal)} kcal`,
    })), { color: 'var(--accent-violet-ink)', label: 'Workout minutes per week', height: 190 });
    $$('[data-wdel]').forEach((b) => (b.onclick = () => {
      if (!confirm('Delete this workout session?')) return;
      const w = store.get('workouts'); w.log = w.log.filter((l) => l.id !== b.dataset.wdel); store.save('workouts'); render();
    }));
  }

  /* ---------- page ---------- */
  function render() {
    const page = $('#page-health');
    page.innerHTML = `
      <div class="page-head"><div><h1>Health</h1><p class="muted">Training from Strava, body data from Samsung Health or your own log.</p></div></div>
      ${stravaSection()}
      ${workoutSection()}
      ${PD.habits.section()}
      ${bodySection()}`;

    const sf = $('#stravaForm');
    if (sf) sf.onsubmit = (e) => {
      e.preventDefault();
      const s = store.get('strava');
      s.clientId = sf.clientId.value.trim(); s.clientSecret = sf.clientSecret.value.trim();
      store.save('strava'); connectStrava();
    };
    const sync = $('#stravaSync'); if (sync) sync.onclick = syncStrava;
    const off = $('#stravaOff');
    if (off) off.onclick = () => {
      if (!confirm('Disconnect Strava and remove synced activities from this browser?')) return;
      store.set('strava', { ...store.DEFAULTS.strava, clientId: store.get('strava').clientId });
      render();
    };
    $$('#sportChips .chip').forEach((c) => (c.onclick = () => { sportFilter = c.dataset.g; render(); }));
    drawWeekly(); drawWorkouts(); PD.habits.drawSection(); drawBody();

    const hf = $('#healthForm');
    hf.date.onchange = () => {
      const h = store.get('health'); const d = h.daily[hf.date.value] || {};
      hf.steps.value = d.steps || ''; hf.sleep.value = d.sleep || ''; hf.rhr.value = d.rhr || ''; hf.weight.value = h.weight[hf.date.value] || '';
    };
    hf.onsubmit = (e) => {
      e.preventDefault();
      const h = store.get('health'); const k = hf.date.value || todayKey();
      const d = (h.daily[k] = h.daily[k] || {});
      const num = (v) => (v === '' ? undefined : Number(v));
      d.steps = num(hf.steps.value); d.sleep = num(hf.sleep.value); d.rhr = num(hf.rhr.value);
      if (hf.weight.value) h.weight[k] = Number(hf.weight.value); else delete h.weight[k];
      h.stepGoal = Number(hf.stepGoal.value) || 10000; h.weightGoal = num(hf.weightGoal.value) || null;
      store.save('health'); render(); PD.toast('Saved');
    };

    const dz = $('#dropzone');
    $('#shFiles').onchange = (e) => handleFiles(e.target.files);
    dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('over'); };
    dz.ondragleave = () => dz.classList.remove('over');
    dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); handleFiles(e.dataTransfer.files); };

    const s = store.get('strava');
    if (s.accessToken && Date.now() - s.lastSync > 30 * 60e3 && !render.syncing) {
      render.syncing = true; syncStrava().finally(() => (render.syncing = false));
    }
  }

  PD.health = { render, handleRedirect, weekSummary, importSamsung, uploadWorkout };
})(window.PD);
