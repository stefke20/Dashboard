/* Random workout generator: pick a duration, focus, level and equipment and get a balanced,
   freshly shuffled routine that fits the time. Also builds whole random multi-week programmes. */
(function (PD) {
  const { esc, $, $$, store } = PD;
  const W = () => store.get('workouts');
  const X = () => PD.exercises;

  const FOCUS = ['Full body', 'Upper body', 'Lower body', 'Core', 'Cardio', 'Mobility'];
  const LEVELS = ['Easy', 'Medium', 'Hard'];
  const EQUIP = ['band', 'chair', 'wall', 'dumbbells'];
  const DEFAULTS = { minutes: 20, focus: 'Full body', level: 2, equip: [], style: 'mixed' };
  // rest between exercises / between rounds and interval length per level
  const PACE = { 1: { rest: 25, roundRest: 60, work: 30 }, 2: { rest: 20, roundRest: 45, work: 40 }, 3: { rest: 15, roundRest: 40, work: 45 } };

  const opts = () => ({ ...DEFAULTS, ...(W().prefs?.random || {}) });
  const remember = (o) => { const w = W(); w.prefs = { ...w.prefs, random: o }; store.save('workouts'); };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /** Exercises that match the focus, level and equipment. */
  function pool(o) {
    const allowed = new Set(['none', ...o.equip]);
    return X().list.filter((e) => allowed.has(e.equip || 'none') && (e.level || 1) <= o.level && (
      o.focus === 'Full body' ? e.cat !== 'Mobility'
        : FOCUS.includes(o.focus) ? (e.cat === o.focus || (o.focus === 'Cardio' && e.cat === 'Full body'))
          : X().works(e, o.focus)));
  }

  /** Order the pool so consecutive exercises alternate body parts (full body) — no two of the same in a row. */
  function balanced(list, o) {
    if (o.focus !== 'Full body') return shuffle([...list]);
    const by = {}; shuffle([...list]).forEach((e) => (by[e.cat] = by[e.cat] || []).push(e));
    const cats = shuffle(Object.keys(by)); const out = [];
    while (cats.some((c) => by[c].length)) cats.forEach((c) => { if (by[c].length) out.push(by[c].shift()); });
    return out;
  }

  /** A routine of about o.minutes minutes. */
  function generate(o = opts()) {
    const pace = PACE[o.level] || PACE[2];
    const mobility = o.focus === 'Mobility';
    const list = balanced(pool(o), o);
    if (list.length < 2) return null;
    const item = (e) => {
      const timed = mobility || o.style === 'intervals' || e.mode === 'time';
      return { id: `${e.id}-${PD.uid()}`, ex: e.id, mode: timed ? 'time' : 'reps', value: timed ? (mobility ? 40 : o.style === 'intervals' ? pace.work : e.value) : e.value, side: !!e.side };
    };
    const items = list.slice(0, 12).map(item);
    const base = { rest: mobility ? 5 : pace.rest, roundRest: mobility ? 0 : pace.roundRest };
    const target = o.minutes * 60;
    // try every exercise count / round count and keep the closest fit (2–3 rounds feel best)
    let best = null;
    for (let rounds = 1; rounds <= (mobility ? 4 : 8); rounds++) {
      for (let n = Math.min(3, items.length); n <= items.length; n++) {
        const r = { ...base, rounds, items: items.slice(0, n) };
        const score = Math.abs(PD.workout.estimate(r) - target) + Math.abs(rounds - (mobility ? 1.5 : 2.5)) * 25 + (n < 4 ? 60 : 0);
        if (!best || score < best.score) best = { r, score };
      }
    }
    const r = best.r;
    // fine-tune the work so the total lands close to the target
    const fixed = PD.workout.estimate({ ...r, items: r.items.map((it) => ({ ...it, value: 0 })) });
    const work = PD.workout.estimate(r) - fixed;
    const k = Math.min(1.6, Math.max(0.7, (target - fixed) / Math.max(work, 1)));
    r.items = r.items.map((it) => ({ ...it, value: it.mode === 'time' ? Math.max(10, Math.round((it.value * k) / 5) * 5) : Math.max(4, Math.round(it.value * k)) }));
    const label = FOCUS.includes(o.focus) ? o.focus.toLowerCase() : o.focus;
    return { id: `rnd-${PD.uid()}`, name: `${o.minutes}-min ${label}`, emoji: '🎲', color: ['violet', 'sky', 'mint', 'peach', 'pink'][Math.floor(Math.random() * 5)], created: Date.now(), ...r };
  }

  /* ---------- option controls (shared by both modals) ---------- */
  const chips = (name, values, cur, label = (v) => v) => `<div class="chips wrap" data-group="${name}">${values.map((v) => `<button type="button" class="chip${String(v) === String(cur) ? ' active' : ''}" data-v="${esc(String(v))}">${esc(label(v))}</button>`).join('')}</div>`;
  function optionsHtml(o, { minutesLabel = 'How long?' } = {}) {
    return `
      <label>${minutesLabel}</label>
      <div class="row gap wrap rnd-mins">${chips('minutes', [10, 15, 20, 30, 45, 60], o.minutes, (v) => `${v} min`)}<label class="row gap small">or<input type="number" id="rndMin" min="5" max="90" value="${o.minutes}" style="width:80px"> min</label></div>
      <label>Focus</label>${chips('focus', [...FOCUS, ...Object.keys(X().MUSCLES).filter((m) => m !== 'Cardio')], o.focus)}
      <label>Level</label>${chips('level', [1, 2, 3], o.level, (v) => LEVELS[v - 1])}
      <label>Style</label>${chips('style', ['mixed', 'intervals'], o.style, (v) => (v === 'mixed' ? 'Reps & time' : `Intervals (${PACE[o.level].work}s on)`))}
      <label>Equipment you have <span class="muted small">(bodyweight moves are always included)</span></label>
      <div class="row gap wrap">${EQUIP.map((k) => `<label class="toggle"><input type="checkbox" name="rndEq" value="${k}" ${o.equip.includes(k) ? 'checked' : ''}> ${esc(X().EQUIP[k])}</label>`).join('')}</div>`;
  }
  function bindOptions(body, o, onChange) {
    $$('[data-group] .chip', body).forEach((c) => (c.onclick = () => {
      const g = c.closest('[data-group]').dataset.group; const v = c.dataset.v;
      o[g] = ['minutes', 'level'].includes(g) ? Number(v) : v;
      onChange();
    }));
    const m = $('#rndMin', body);
    if (m) m.onchange = () => { o.minutes = Math.min(90, Math.max(5, Math.round(Number(m.value) || 20))); onChange(); };
    $$('input[name=rndEq]', body).forEach((i) => (i.onchange = () => { o.equip = $$('input[name=rndEq]:checked', body).map((x) => x.value); onChange(); }));
  }

  /* ---------- random workout ---------- */
  function open() {
    const o = opts(); let r = null;
    const draw = (body, close, reroll = true) => {
      if (reroll) r = generate(o);
      body.innerHTML = `${optionsHtml(o)}
        <div class="rnd-result">${r ? `
          <div class="row gap"><h3 class="grow">🎲 ${esc(r.name)}</h3><span class="pill">${r.items.length} exercises · ${r.rounds} round${r.rounds === 1 ? '' : 's'} · ~${Math.round(PD.workout.estimate(r) / 60)} min</span></div>
          <ol class="rnd-list">${r.items.map((it) => { const e = PD.workout.exOf(it.ex); return `<li>${X().figure(e, { still: true })}<span class="grow"><b>${esc(e.name)}</b><span class="muted small">${esc(e.muscles || e.cat)}</span></span><span class="pill small">${esc(PD.workout.fmtVal(it))}</span></li>`; }).join('')}</ol>
          <p class="muted small">Rest ${r.rest}s between exercises${r.rounds > 1 ? ` and ${r.roundRest}s between rounds` : ''}.</p>`
          : '<p class="empty">Not enough exercises match. Try another focus, a higher level or tick some equipment.</p>'}</div>
        <div class="row gap end wrap">
          <button type="button" class="btn ghost" id="rndAgain">🎲 Shuffle again</button>
          <button type="button" class="btn ghost" id="rndSave" ${r ? '' : 'disabled'}>💾 Save as routine</button>
          <button type="button" class="btn play" id="rndGo" ${r ? '' : 'disabled'}><svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg>Start</button>
        </div>`;
      bindOptions(body, o, () => draw(body, close));
      $('#rndAgain', body).onclick = () => { draw(body, close); PD.haptic?.(10); };
      $('#rndSave', body).onclick = () => {
        remember(o);
        W().routines.push({ ...r, id: PD.uid(), name: `${r.name} (${PD.fmt.dayMonth(new Date())})` });
        store.save('workouts'); close(); PD.workout.render(); PD.toast('Saved to your routines 💾');
      };
      $('#rndGo', body).onclick = () => { remember(o); close(); PD.workout.start(r); };
    };
    PD.modal('🎲 Random workout', '', (body, close) => draw(body, close), 'wide');
  }

  /* ---------- random programme ---------- */
  const SPLITS = { 'Full body': ['Full body'], Split: ['Upper body', 'Lower body', 'Core', 'Cardio'], 'Upper / lower': ['Upper body', 'Lower body'] };
  function programme() {
    const o = { ...opts(), weeks: 4, perWeek: 3, split: 'Split' };
    const draw = (body, close) => {
      body.innerHTML = `
        <p class="muted small">Pick how long each session should be and get a whole programme of fresh, random sessions that get a little harder every week.</p>
        <div class="row gap wrap">
          <label class="grow">Length<span class="row gap"><input type="number" id="rpWeeks" min="1" max="16" value="${o.weeks}"><span class="muted small">weeks</span></span></label>
          <label class="grow">Sessions<span class="row gap"><input type="number" id="rpPer" min="1" max="7" value="${o.perWeek}"><span class="muted small">per week</span></span></label>
        </div>
        <label>Sessions</label>${chips('split', Object.keys(SPLITS), o.split, (v) => (v === 'Split' ? 'Upper / lower / core / cardio' : v === 'Full body' ? 'Full body every time' : 'Upper / lower'))}
        ${optionsHtml(o, { minutesLabel: 'Minutes per session' }).replace(/<label>Focus<\/label><div class="chips wrap" data-group="focus">[\s\S]*?<\/div>/, '')}
        <div class="row gap end"><button type="button" class="btn ghost" data-cancel>Cancel</button><button type="button" class="btn" id="rpMake">🎲 Create programme</button></div>`;
      bindOptions(body, o, () => draw(body, close));
      $$('[data-group=split] .chip', body).forEach((c) => (c.onclick = () => { o.split = c.dataset.v; draw(body, close); }));
      $('#rpWeeks', body).onchange = (e) => { o.weeks = Math.min(16, Math.max(1, Math.round(Number(e.target.value) || 4))); };
      $('#rpPer', body).onchange = (e) => { o.perWeek = Math.min(7, Math.max(1, Math.round(Number(e.target.value) || 3))); };
      $('[data-cancel]', body).onclick = close;
      $('#rpMake', body).onclick = () => {
        const foci = SPLITS[o.split];
        const n = Math.min(Math.max(o.perWeek, foci.length), 6); // a few different sessions to rotate through
        const sessions = [];
        for (let i = 0; i < n; i++) {
          const focus = foci[i % foci.length];
          const r = generate({ ...o, focus });
          if (r) sessions.push({ name: `${focus} ${String.fromCharCode(65 + Math.floor(i / foci.length))}`, items: r.items, rounds: r.rounds, rest: r.rest, roundRest: r.roundRest });
        }
        if (!sessions.length) { PD.toast('Not enough exercises match — try other options'); return; }
        const w = W(); w.programs = w.programs || [];
        w.programs.push({ id: `cp-${PD.uid()}`, custom: true, generated: true, name: `🎲 ${o.minutes}-min ${o.split === 'Full body' ? 'full body' : 'split'} (${o.weeks} wk)`, emoji: '🎲', color: 'peach',
          level: `Random · ${LEVELS[o.level - 1]}`, weeks: o.weeks, perWeek: o.perWeek, repStep: o.level, timeStep: 5, roundEvery: 0, routineIds: [], sessions });
        remember({ minutes: o.minutes, focus: opts().focus, level: o.level, equip: o.equip, style: o.style });
        store.save('workouts'); close(); PD.workout.render(); PD.toast('Programme created — press “Start programme” 🎲');
      };
    };
    PD.modal('🎲 Random programme', '', (body, close) => draw(body, close), 'wide');
  }

  PD.randomizer = { generate, open, programme, pool };
})(window.PD);
