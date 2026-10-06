/* My workout: routines, exercise library, routine editor, guided player, session log. */
(function (PD) {
  const { esc, $, $$, fmt, store, todayKey } = PD;
  const X = () => PD.exercises;
  const W = () => store.get('workouts');

  const COLORS = ['violet', 'sky', 'mint', 'peach', 'pink'];
  const EMOJIS = ['⚡', '🔥', '💪', '🦵', '🍑', '💥', '🧘', '🌅', '🏃', '🎯', '❤️', '🌙'];
  const REP_SECONDS = 3;   // used to estimate the duration of rep-based sets
  const SWITCH_SECONDS = 5;

  let libCat = 'All'; let libEquip = 'any'; let libQuery = '';

  /* ---------------- helpers ---------------- */
  const allExercises = () => [...X().list, ...W().custom];
  const exOf = (id) => X().byId(id) || { id, name: 'Unknown exercise', cat: 'Full body', met: 4, emoji: '❓' };
  const fmtVal = (it) => (it.mode === 'time' ? `${it.value}s` : `${it.value} reps`) + (it.side ? ' / side' : '');
  const mmss = (s) => `${Math.floor(s / 60)}:${PD.pad(Math.max(0, Math.floor(s % 60)))}`;

  function estimate(r) {
    let s = 0;
    r.items.forEach((it, i) => {
      const one = it.mode === 'time' ? it.value : it.value * REP_SECONDS;
      s += it.side ? one * 2 + SWITCH_SECONDS : one;
      if (i < r.items.length - 1) s += r.rest;
    });
    s = s * r.rounds + (r.rounds - 1) * (r.roundRest || 0);
    return s;
  }

  function bodyWeight() {
    const h = store.get('health');
    const k = Object.keys(h.weight).sort().pop();
    return (k && h.weight[k]) || store.get('diet').profile.weight || 75;
  }
  const kcalFor = (met, seconds) => (met * 3.5 * bodyWeight() / 200) * (seconds / 60);

  /* ---------------- stats (used by Health, Home, Diet, Calendar) ---------------- */
  function stats() {
    const log = W().log;
    const wk = PD.keyOf(PD.startOfWeek(new Date()));
    const week = log.filter((l) => l.date >= wk);
    const today = log.filter((l) => l.date === todayKey());
    // consecutive weeks (ending this or last week) where the weekly goal was met
    let streak = 0;
    const goal = W().weeklyGoal || 3;
    for (let w = PD.startOfWeek(new Date()), i = 0; i < 104; i++, w = PD.addDays(w, -7)) {
      const from = PD.keyOf(w); const to = PD.keyOf(PD.addDays(w, 6));
      const n = log.filter((l) => l.date >= from && l.date <= to).length;
      if (n >= goal) streak++; else if (i > 0) break;
    }
    return {
      weekCount: week.length, weekMin: week.reduce((s, l) => s + l.duration, 0) / 60,
      weekKcal: week.reduce((s, l) => s + l.kcal, 0), todayKcal: today.reduce((s, l) => s + l.kcal, 0),
      todayMin: today.reduce((s, l) => s + l.duration, 0) / 60, total: log.length, streak, goal,
    };
  }

  function weeklyMinutes(weeks = 12) {
    const start = PD.startOfWeek(new Date());
    return Array.from({ length: weeks }, (_, i) => {
      const w = PD.addDays(start, -7 * (weeks - 1 - i));
      const from = PD.keyOf(w); const to = PD.keyOf(PD.addDays(w, 6));
      const ls = W().log.filter((l) => l.date >= from && l.date <= to);
      return { week: w, min: ls.reduce((s, l) => s + l.duration, 0) / 60, count: ls.length, kcal: ls.reduce((s, l) => s + l.kcal, 0) };
    });
  }

  /* ---------------- page ---------------- */
  function render() {
    const page = $('#page-workout');
    const st = stats();
    page.innerHTML = `
      <div class="page-head">
        <div><h1>My workout</h1><p class="muted">Build your own routines from ${X().list.length}+ home exercises, then press play.</p></div>
        <div class="row gap">
          <button class="btn ghost" id="wkPrefs">⚙ Player</button>
          <button class="btn" id="wkNew">+ New routine</button>
        </div>
      </div>
      <div class="card wk-hero">
        <div class="wk-goal">
          ${PD.ring(st.weekCount, st.goal, { size: 128, stroke: 12, color: 'var(--accent-peach-ink)', label: `${st.weekCount}/${st.goal}`, sub: 'this week' })}
          <div>
            <h2>${st.weekCount >= st.goal ? 'Weekly goal reached 🎉' : st.weekCount ? `${st.goal - st.weekCount} more to hit your goal` : "Let's get moving"}</h2>
            <p class="muted small">Goal: ${st.goal} workouts per week · <button class="link" id="wkGoal">change</button></p>
          </div>
        </div>
        <div class="stat-row">
          <div class="stat"><span>Minutes this week</span><b data-count="${Math.round(st.weekMin)}">0</b></div>
          <div class="stat"><span>Calories burned</span><b data-count="${Math.round(st.weekKcal)}">0</b></div>
          <div class="stat"><span>Goal streak</span><b>${st.streak} wk${st.streak === 1 ? '' : 's'}</b></div>
          <div class="stat"><span>All-time sessions</span><b data-count="${st.total}">0</b></div>
        </div>
      </div>

      <h2 class="section-title">My routines</h2>
      <div class="routines" id="routines"></div>

      <div class="section-head">
        <h2 class="section-title">Exercise library</h2>
        <button class="btn sm ghost" id="exCustom">+ Custom exercise</button>
      </div>
      <div class="lib-filters">
        <div class="chips" id="libCats">${['All', ...X().CATS].map((c) => `<button class="chip${c === libCat ? ' active' : ''}" data-c="${c}">${c}</button>`).join('')}</div>
        <div class="row gap">
          <select id="libEquip" aria-label="Equipment">
            <option value="any">Any equipment</option>
            ${Object.entries(X().EQUIP).map(([k, v]) => `<option value="${k}" ${k === libEquip ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
          <input id="libSearch" type="search" placeholder="Search exercises…" value="${esc(libQuery)}">
        </div>
      </div>
      <div class="ex-grid" id="exGrid"></div>`;

    renderRoutines(); renderLibrary();
    $('#wkNew').onclick = () => editor();
    $('#wkPrefs').onclick = prefsModal;
    $('#wkGoal').onclick = prefsModal;
    $('#exCustom').onclick = () => customExerciseModal();
    $$('#libCats .chip').forEach((c) => (c.onclick = () => { libCat = c.dataset.c; $$('#libCats .chip').forEach((x) => x.classList.toggle('active', x === c)); renderLibrary(); }));
    $('#libEquip').onchange = (e) => { libEquip = e.target.value; renderLibrary(); };
    $('#libSearch').oninput = PD.debounce((e) => { libQuery = e.target.value; renderLibrary(); }, 120);
  }

  function renderRoutines() {
    const el = $('#routines');
    const rs = W().routines;
    el.innerHTML = rs.map((r) => {
      const n = r.items.length;
      return `<article class="routine ${esc(r.color || 'violet')}" data-id="${r.id}">
        <div class="routine-top">
          <span class="routine-emoji">${esc(r.emoji || '⚡')}</span>
          <div class="routine-meta"><h3>${esc(r.name)}</h3>
            <span class="small">${n} exercise${n === 1 ? '' : 's'} · ${r.rounds} round${r.rounds === 1 ? '' : 's'} · ~${Math.round(estimate(r) / 60)} min</span></div>
        </div>
        <div class="routine-figs">${r.items.slice(0, 5).map((it) => `<span title="${esc(exOf(it.ex).name)}">${X().figure(exOf(it.ex), { still: true })}</span>`).join('')}
          ${n > 5 ? `<span class="more">+${n - 5}</span>` : ''}</div>
        <div class="routine-actions">
          <button class="btn play" data-start="${r.id}" ${n ? '' : 'disabled'}><svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg>Start</button>
          <button class="icon-btn sm" data-edit="${r.id}" title="Edit" aria-label="Edit ${esc(r.name)}"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg></button>
          <button class="icon-btn sm" data-sched="${r.id}" title="Plan in calendar" aria-label="Plan ${esc(r.name)}"><svg viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg></button>
          <button class="icon-btn sm" data-dup="${r.id}" title="Duplicate" aria-label="Duplicate ${esc(r.name)}"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="13" height="13" rx="3"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg></button>
        </div>
      </article>`;
    }).join('') + `<button class="routine add" id="routineAdd"><span>＋</span>Create a routine</button>`;
    $$('[data-start]', el).forEach((b) => (b.onclick = () => start(b.dataset.start)));
    $$('[data-edit]', el).forEach((b) => (b.onclick = () => editor(W().routines.find((r) => r.id === b.dataset.edit))));
    $$('[data-sched]', el).forEach((b) => (b.onclick = () => scheduleModal(W().routines.find((r) => r.id === b.dataset.sched))));
    $$('[data-dup]', el).forEach((b) => (b.onclick = () => {
      const r = W().routines.find((x) => x.id === b.dataset.dup);
      W().routines.push({ ...structuredClone(r), id: PD.uid(), name: `${r.name} (copy)`, created: Date.now() });
      store.save('workouts'); renderRoutines(); PD.toast('Routine duplicated');
    }));
    $('#routineAdd').onclick = () => editor();
  }

  function filtered() {
    const q = PD.norm(libQuery);
    return allExercises().filter((e) => (libCat === 'All' || e.cat === libCat)
      && (libEquip === 'any' || (e.equip || 'none') === libEquip)
      && (!q || PD.norm(`${e.name} ${e.muscles || ''} ${e.cat}`).includes(q)));
  }

  function exCard(e, extra = '') {
    return `<button class="ex-card" data-ex="${esc(e.id)}" ${extra}>
      <span class="ex-fig">${X().figure(e)}</span>
      <span class="ex-body"><b>${esc(e.name)}</b>
        <span class="muted small">${esc(e.muscles || e.cat)}</span>
        <span class="ex-tags"><span class="pill small ${catColor(e.cat)}">${esc(e.cat)}</span>${e.equip && e.equip !== 'none' ? `<span class="pill small">${esc(X().EQUIP[e.equip] || e.equip)}</span>` : ''}${e.custom ? '<span class="pill small violet">custom</span>' : ''}</span>
      </span></button>`;
  }
  const catColor = (c) => ({ 'Lower body': 'mint', 'Upper body': 'sky', Core: 'pink', Cardio: 'peach', 'Full body': 'violet', Mobility: 'mint' }[c] || 'violet');

  function renderLibrary() {
    const el = $('#exGrid');
    const list = filtered();
    el.innerHTML = list.length ? list.map((e) => exCard(e)).join('') : '<p class="empty">No exercises match. Try another filter, or create a custom exercise.</p>';
    $$('.ex-card', el).forEach((c) => (c.onclick = () => detail(c.dataset.ex)));
    if (PD.fx.reduce()) $$('svg.fig', el).forEach((s) => s.pauseAnimations?.());
  }

  /* ---------------- exercise detail ---------------- */
  function embedFor(url) {
    const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
    if (m) return `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" title="Exercise video" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
    if (/\.(gif|png|jpe?g|webp)(\?|$)/i.test(url || '')) return `<img class="media-img" src="${esc(url)}" alt="Exercise demonstration" loading="lazy">`;
    return '';
  }

  function detail(id) {
    const e = exOf(id);
    const media = W().media[e.id] || e.video || '';
    const routines = W().routines;
    PD.modal(e.name, `
      <div class="ex-detail">
        <div class="ex-detail-fig">${X().figure(e, { cls: 'big' })}</div>
        <div class="ex-tags"><span class="pill ${catColor(e.cat)}">${esc(e.cat)}</span>${e.muscles ? `<span class="pill">${esc(e.muscles)}</span>` : ''}
          <span class="pill">${esc(X().EQUIP[e.equip || 'none'] || e.equip)}</span><span class="pill">${'●'.repeat(e.level || 1)}${'○'.repeat(3 - (e.level || 1))} ${['Easy', 'Medium', 'Hard'][(e.level || 1) - 1]}</span></div>
        ${e.steps?.length ? `<h3 class="sub">How to</h3><ol class="steps">${e.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
        ${e.tip ? `<p class="tip">💡 ${esc(e.tip)}</p>` : ''}
        ${embedFor(media)}
        <div class="row gap wrap">
          <a class="btn ghost" href="${esc(X().videoUrl(e))}" target="_blank" rel="noopener">▶ ${media ? 'Open video' : 'Find a video on YouTube'}</a>
          <span class="spacer"></span>
        </div>
        <details class="calc"><summary>Use your own video or GIF</summary>
          <form id="mediaForm" class="row gap" style="margin-top:10px">
            <input class="grow" name="url" type="url" placeholder="YouTube link or .gif/.jpg URL" value="${esc(W().media[e.id] || '')}">
            <button class="btn ghost" type="submit">Save</button>
          </form>
        </details>
        <h3 class="sub">Add to a routine</h3>
        <form id="addTo" class="row gap wrap">
          <select name="routine" class="grow">${routines.map((r) => `<option value="${r.id}">${esc(r.emoji)} ${esc(r.name)}</option>`).join('')}<option value="__new">+ New routine</option></select>
          <button class="btn" type="submit">Add</button>
        </form>
        ${e.custom ? '<div class="row end"><button class="btn ghost danger" id="exDel">Delete custom exercise</button><button class="btn ghost" id="exEdit">Edit</button></div>' : ''}
      </div>`, (body, close) => {
      $('#mediaForm', body).onsubmit = (ev) => {
        ev.preventDefault();
        const url = ev.target.url.value.trim();
        if (url) W().media[e.id] = url; else delete W().media[e.id];
        store.save('workouts'); detail(id); PD.toast(url ? 'Media saved' : 'Media removed');
      };
      $('#addTo', body).onsubmit = (ev) => {
        ev.preventDefault();
        const item = { id: PD.uid(), ex: e.id, mode: e.mode || 'time', value: e.value || 30, side: !!e.side };
        if (ev.target.routine.value === '__new') { close(); editor(null, [item]); return; }
        const r = W().routines.find((x) => x.id === ev.target.routine.value);
        r.items.push(item); store.save('workouts'); close(); renderRoutines();
        PD.toast(`Added ${e.name} to ${r.name}`);
      };
      const del = $('#exDel', body);
      if (del) del.onclick = () => {
        if (!confirm('Delete this exercise? It will also be removed from your routines.')) return;
        const w = W(); w.custom = w.custom.filter((x) => x.id !== e.id);
        w.routines.forEach((r) => { r.items = r.items.filter((it) => it.ex !== e.id); });
        store.save('workouts'); close(); render();
      };
      const ed = $('#exEdit', body);
      if (ed) ed.onclick = () => customExerciseModal(e);
    }, 'wide');
  }

  function customExerciseModal(e = {}) {
    PD.modal(e.id ? 'Edit custom exercise' : 'Custom exercise', `
      <form id="cxForm" class="form">
        <div class="row gap wrap">
          <label class="grow">Name<input name="name" required maxlength="60" value="${esc(e.name || '')}"></label>
          <label style="width:90px">Emoji<input name="emoji" maxlength="4" value="${esc(e.emoji || '🏋️')}"></label>
        </div>
        <div class="row gap wrap">
          <label class="grow">Category<select name="cat">${X().CATS.map((c) => `<option ${c === e.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
          <label class="grow">Equipment<select name="equip">${Object.entries(X().EQUIP).map(([k, v]) => `<option value="${k}" ${k === e.equip ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        </div>
        <div class="row gap wrap">
          <label class="grow">Default<select name="mode"><option value="time" ${e.mode !== 'reps' ? 'selected' : ''}>Time (seconds)</option><option value="reps" ${e.mode === 'reps' ? 'selected' : ''}>Repetitions</option></select></label>
          <label class="grow">Amount<input name="value" type="number" min="1" max="600" value="${e.value || 30}"></label>
          <label class="grow">Intensity<select name="met">${[[2.5, 'Light (stretching)'], [4, 'Moderate'], [6, 'Hard'], [8.5, 'Very hard']].map(([v, l]) => `<option value="${v}" ${Number(e.met) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        </div>
        <label>Muscles<input name="muscles" maxlength="80" value="${esc(e.muscles || '')}" placeholder="e.g. Glutes, core"></label>
        <label>Picture or GIF URL<input name="image" type="url" value="${esc(e.image || '')}" placeholder="https://…/exercise.gif"></label>
        <label>Video URL<input name="video" type="url" value="${esc(e.video || '')}" placeholder="https://youtube.com/watch?v=…"></label>
        <label>Instructions (one step per line)<textarea name="steps" rows="3">${esc((e.steps || []).join('\n'))}</textarea></label>
        <div class="row gap end"><button type="button" class="btn ghost" data-cancel>Cancel</button><button class="btn" type="submit">Save</button></div>
      </form>`, (body, close) => {
      $('[data-cancel]', body).onclick = close;
      $('#cxForm', body).onsubmit = (ev) => {
        ev.preventDefault();
        const f = ev.target;
        const data = {
          name: f.name.value.trim(), emoji: f.emoji.value.trim() || '🏋️', cat: f.cat.value, equip: f.equip.value, mode: f.mode.value,
          value: Number(f.value.value) || 30, met: Number(f.met.value), muscles: f.muscles.value.trim(), image: f.image.value.trim(),
          video: f.video.value.trim(), steps: f.steps.value.split('\n').map((s) => s.trim()).filter(Boolean), custom: true, level: 1,
        };
        const w = W();
        if (e.id) Object.assign(w.custom.find((x) => x.id === e.id), data);
        else w.custom.push({ id: `c-${PD.uid()}`, ...data });
        store.save('workouts'); close(); render(); PD.toast('Exercise saved');
      };
    });
  }

  /* ---------------- routine editor ---------------- */
  function editor(routine, seedItems) {
    const isNew = !routine;
    const draft = routine ? structuredClone(routine) : {
      id: PD.uid(), name: '', emoji: '⚡', color: 'violet', rounds: 3, rest: 15, roundRest: 45, created: Date.now(), items: seedItems || [],
    };
    let picking = false; let pickSel = new Set(); let pickCat = 'All'; let pickQ = '';
    let closeRef = () => {};

    const stepper = (name, val, step, min, max, unit) => `
      <div class="stepper" data-name="${name}" data-step="${step}" data-min="${min}" data-max="${max}">
        <button type="button" data-d="-1" aria-label="Decrease">−</button><input name="${name}" type="number" value="${val}" min="${min}" max="${max}"><span class="unit">${unit}</span><button type="button" data-d="1" aria-label="Increase">+</button>
      </div>`;

    function view(body) {
      const close = closeRef;
      if (picking) return pickerView(body);
      body.innerHTML = `
        <form id="reForm" class="form editor">
          <div class="row gap wrap">
            <label class="grow">Name<input name="name" required maxlength="50" value="${esc(draft.name)}" placeholder="e.g. Tuesday legs"></label>
          </div>
          <div class="row gap wrap">
            <div class="emoji-pick">${EMOJIS.map((em) => `<button type="button" class="${em === draft.emoji ? 'sel' : ''}" data-em="${em}">${em}</button>`).join('')}</div>
            <div class="color-pick">${COLORS.map((c) => `<button type="button" class="sw ${c}${c === draft.color ? ' sel' : ''}" data-col="${c}" aria-label="${c}"></button>`).join('')}</div>
          </div>
          <div class="row gap wrap editor-settings">
            <label>Rounds ${stepper('rounds', draft.rounds, 1, 1, 20, '×')}</label>
            <label>Rest between exercises ${stepper('rest', draft.rest, 5, 0, 300, 's')}</label>
            <label>Rest between rounds ${stepper('roundRest', draft.roundRest, 15, 0, 600, 's')}</label>
          </div>
          <div class="items-head"><h3 class="sub">Exercises</h3><span class="muted small" id="estTime"></span></div>
          <ol class="items" id="items">
            ${draft.items.map((it, i) => {
              const e = exOf(it.ex);
              return `<li class="item" draggable="true" data-i="${i}">
                <span class="grip" aria-hidden="true">⋮⋮</span>
                <span class="item-fig">${X().figure(e, { still: true })}</span>
                <span class="item-name"><b>${esc(e.name)}</b><label class="toggle small"><input type="checkbox" data-side ${it.side ? 'checked' : ''}> each side</label></span>
                <span class="segmented sm">
                  <label><input type="radio" name="m${i}" value="time" ${it.mode === 'time' ? 'checked' : ''}><span>Time</span></label>
                  <label><input type="radio" name="m${i}" value="reps" ${it.mode === 'reps' ? 'checked' : ''}><span>Reps</span></label>
                </span>
                ${stepper(`v${i}`, it.value, it.mode === 'time' ? 5 : 1, 1, 900, it.mode === 'time' ? 's' : '×')}
                <span class="item-move">
                  <button type="button" class="icon-btn sm ghost" data-up aria-label="Move up" ${i === 0 ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg></button>
                  <button type="button" class="icon-btn sm ghost" data-down aria-label="Move down" ${i === draft.items.length - 1 ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>
                  <button type="button" class="icon-btn sm ghost" data-rm aria-label="Remove"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
                </span>
              </li>`;
            }).join('') || '<li class="empty">No exercises yet — add some below.</li>'}
          </ol>
          <button type="button" class="btn ghost full" id="addEx">+ Add exercises</button>
          <div class="row gap end">
            ${isNew ? '' : '<button type="button" class="btn ghost danger" id="reDel">Delete</button><span class="spacer"></span>'}
            <button type="button" class="btn ghost" data-cancel>Cancel</button>
            <button type="submit" class="btn">${isNew ? 'Create routine' : 'Save'}</button>
          </div>
        </form>`;
      const form = $('#reForm', body);
      const sync = () => {
        draft.name = form.name.value;
        draft.rounds = clampNum(form.rounds.value, 1, 20); draft.rest = clampNum(form.rest.value, 0, 300); draft.roundRest = clampNum(form.roundRest.value, 0, 600);
        $$('.item', form).forEach((li) => {
          const i = +li.dataset.i; const it = draft.items[i];
          it.mode = $(`input[name=m${i}]:checked`, li).value;
          it.value = clampNum($(`input[name=v${i}]`, li).value, 1, 900);
          it.side = $('[data-side]', li).checked;
        });
        $('#estTime', body).textContent = draft.items.length ? `≈ ${Math.round(estimate(draft) / 60)} min total` : '';
      };
      sync();
      form.oninput = sync;
      $$('.stepper', form).forEach((s) => $$('button', s).forEach((b) => (b.onclick = () => {
        const inp = $('input', s);
        inp.value = clampNum(Number(inp.value) + Number(b.dataset.d) * Number(s.dataset.step), +s.dataset.min, +s.dataset.max);
        sync();
      })));
      $$('.item input[type=radio]', form).forEach((r) => (r.onchange = () => {
        sync();
        const it = draft.items[+r.closest('.item').dataset.i];
        const e = exOf(it.ex);
        it.value = it.mode === (e.mode || 'time') ? (e.value || 30) : it.mode === 'time' ? 30 : 12;
        view(body, close);
      }));
      $$('.emoji-pick button', form).forEach((b) => (b.onclick = () => { sync(); draft.emoji = b.dataset.em; view(body, close); }));
      $$('.color-pick button', form).forEach((b) => (b.onclick = () => { sync(); draft.color = b.dataset.col; view(body, close); }));
      const move = (i, d) => { sync(); const [it] = draft.items.splice(i, 1); draft.items.splice(i + d, 0, it); view(body, close); };
      $$('.item', form).forEach((li) => {
        const i = +li.dataset.i;
        $('[data-up]', li).onclick = () => move(i, -1);
        $('[data-down]', li).onclick = () => move(i, 1);
        $('[data-rm]', li).onclick = () => { sync(); draft.items.splice(i, 1); view(body, close); };
        li.ondragstart = (ev) => { ev.dataTransfer.setData('text/plain', String(i)); li.classList.add('dragging'); };
        li.ondragend = () => li.classList.remove('dragging');
        li.ondragover = (ev) => { ev.preventDefault(); li.classList.add('drop'); };
        li.ondragleave = () => li.classList.remove('drop');
        li.ondrop = (ev) => {
          ev.preventDefault();
          const from = Number(ev.dataTransfer.getData('text/plain'));
          if (from !== i) { sync(); const [it] = draft.items.splice(from, 1); draft.items.splice(i, 0, it); view(body, close); }
        };
      });
      $('#addEx', body).onclick = () => { sync(); picking = true; pickSel = new Set(); view(body, close); };
      $('[data-cancel]', body).onclick = close;
      const del = $('#reDel', body);
      if (del) del.onclick = () => {
        if (!confirm(`Delete "${draft.name}"?`)) return;
        W().routines = W().routines.filter((r) => r.id !== draft.id); store.save('workouts'); close(); renderRoutines();
      };
      form.onsubmit = (ev) => {
        ev.preventDefault(); sync();
        if (!draft.name.trim()) { form.name.focus(); return; }
        draft.name = draft.name.trim();
        const w = W(); const idx = w.routines.findIndex((r) => r.id === draft.id);
        if (idx >= 0) w.routines[idx] = draft; else w.routines.push(draft);
        store.save('workouts'); close(); renderRoutines(); PD.toast(isNew ? 'Routine created 💪' : 'Routine saved');
      };
    }

    function pickerView(body) {
      const q = PD.norm(pickQ);
      const list = allExercises().filter((e) => (pickCat === 'All' || e.cat === pickCat) && (!q || PD.norm(`${e.name} ${e.muscles || ''}`).includes(q)));
      body.innerHTML = `
        <div class="picker">
          <div class="row gap wrap">
            <button class="btn ghost sm" id="pickBack">← Back</button>
            <input class="grow" id="pickQ" type="search" placeholder="Search…" value="${esc(pickQ)}">
          </div>
          <div class="chips">${['All', ...X().CATS].map((c) => `<button class="chip${c === pickCat ? ' active' : ''}" data-c="${c}">${c}</button>`).join('')}</div>
          <div class="ex-grid compact">${list.map((e) => exCard(e, `aria-pressed="${pickSel.has(e.id)}"`)).join('')}</div>
          <div class="picker-foot"><button class="btn full" id="pickAdd" ${pickSel.size ? '' : 'disabled'}>Add ${pickSel.size || ''} exercise${pickSel.size === 1 ? '' : 's'}</button></div>
        </div>`;
      $('#pickBack', body).onclick = () => { picking = false; view(body); };
      const qi = $('#pickQ', body);
      qi.oninput = PD.debounce(() => { pickQ = qi.value; pickerView(body); const n = $('#pickQ', body); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 200);
      $$('.chips .chip', body).forEach((c) => (c.onclick = () => { pickCat = c.dataset.c; pickerView(body); }));
      $$('.ex-card', body).forEach((c) => (c.onclick = () => {
        const id = c.dataset.ex;
        if (pickSel.has(id)) pickSel.delete(id); else pickSel.add(id);
        c.setAttribute('aria-pressed', pickSel.has(id));
        const b = $('#pickAdd', body); b.disabled = !pickSel.size;
        b.textContent = `Add ${pickSel.size || ''} exercise${pickSel.size === 1 ? '' : 's'}`;
      }));
      $('#pickAdd', body).onclick = () => {
        pickSel.forEach((id) => { const e = exOf(id); draft.items.push({ id: PD.uid(), ex: id, mode: e.mode || 'time', value: e.value || 30, side: !!e.side }); });
        picking = false; view(body);
      };
    }

    PD.modal(isNew ? 'New routine' : 'Edit routine', '', (body, close) => { closeRef = close; view(body); }, 'wide');
  }

  const clampNum = (v, min, max) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));

  function scheduleModal(r) {
    PD.modal(`Plan “${r.name}”`, `
      <form id="schForm" class="form">
        <div class="row gap"><label class="grow">Date<input type="date" name="date" value="${PD.shiftKey(todayKey(), 1)}" required></label>
        <label class="grow">Time<input type="time" name="time" value="07:30"></label></div>
        <label>Repeat<select name="repeat"><option value="none">Once</option><option value="weekly">Every week</option></select></label>
        <div class="row gap end"><button type="button" class="btn ghost" data-cancel>Cancel</button><button class="btn">Add to calendar</button></div>
      </form>`, (body, close) => {
      $('[data-cancel]', body).onclick = close;
      $('#schForm', body).onsubmit = (ev) => {
        ev.preventDefault(); const f = ev.target;
        store.get('events').push({ id: PD.uid(), type: 'workout', routineId: r.id, title: `${r.emoji} ${r.name}`, date: f.date.value, time: f.time.value, repeat: f.repeat.value, notes: '', done: false });
        store.save('events'); close(); PD.toast(`Planned for ${PD.relDay(f.date.value).toLowerCase()}`);
      };
    });
  }

  function prefsModal() {
    const w = W(); const p = w.prefs;
    PD.modal('Workout settings', `
      <form id="wpForm" class="form">
        <label>Weekly goal (workouts)<input type="number" name="goal" min="1" max="14" value="${w.weeklyGoal}"></label>
        <label>"Get ready" countdown (seconds)<input type="number" name="ready" min="0" max="60" value="${p.getReady}"></label>
        <label class="toggle"><input type="checkbox" name="sound" ${p.sound ? 'checked' : ''}> Beeps in the last 3 seconds</label>
        <label class="toggle"><input type="checkbox" name="voice" ${p.voice ? 'checked' : ''}> Voice coach (announces exercises)</label>
        <p class="muted small">Calories are estimated from exercise intensity and your latest weight (${fmt.num(bodyWeight(), 1)} kg).</p>
        <div class="row gap end"><button type="button" class="btn ghost" data-cancel>Cancel</button><button class="btn">Save</button></div>
      </form>`, (body, close) => {
      $('[data-cancel]', body).onclick = close;
      $('#wpForm', body).onsubmit = (ev) => {
        ev.preventDefault(); const f = ev.target;
        w.weeklyGoal = clampNum(f.goal.value, 1, 14);
        Object.assign(p, { getReady: clampNum(f.ready.value, 0, 60), sound: f.sound.checked, voice: f.voice.checked });
        store.save('workouts'); close(); render();
      };
    });
  }

  /* ---------------- player ---------------- */
  let P = null; // active session

  function buildSteps(r) {
    const steps = [];
    const ready = W().prefs.getReady;
    const firstEx = r.items[0];
    if (ready > 0) steps.push({ type: 'ready', dur: ready, next: firstEx });
    for (let round = 1; round <= r.rounds; round++) {
      r.items.forEach((it, i) => {
        const e = exOf(it.ex);
        const work = (side) => steps.push({ type: 'work', it, ex: e, round, side, dur: it.mode === 'time' ? it.value : null });
        if (it.side) { work('Left side'); steps.push({ type: 'switch', dur: SWITCH_SECONDS, it, ex: e, round }); work('Right side'); } else work('');
        const last = i === r.items.length - 1;
        const nextIt = last ? r.items[0] : r.items[i + 1];
        if (!last && r.rest > 0) steps.push({ type: 'rest', dur: r.rest, next: nextIt, round });
        if (last && round < r.rounds && r.roundRest > 0) steps.push({ type: 'rest', dur: r.roundRest, next: nextIt, round, roundBreak: true });
      });
    }
    return steps;
  }

  async function start(routineId) {
    const r = W().routines.find((x) => x.id === routineId);
    if (!r || !r.items.length) return;
    const steps = buildSteps(r);
    P = { r, steps, i: 0, elapsed: 0, total: 0, running: true, last: performance.now(), workSec: 0, kcal: 0, done: 0, said: {}, startedAt: new Date() };
    const el = document.createElement('div');
    el.className = 'player'; el.id = 'player'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `Workout: ${r.name}`);
    document.body.appendChild(el); document.body.classList.add('no-scroll');
    try { P.wake = await navigator.wakeLock?.request('screen'); } catch { /* not supported */ }
    document.addEventListener('keydown', onKey);
    showStep();
    P.raf = requestAnimationFrame(loop);
  }

  function workSteps() { return P.steps.filter((s) => s.type === 'work'); }

  function showStep() {
    const s = P.steps[P.i]; const el = $('#player');
    P.elapsed = 0; P.said = {};
    const ws = workSteps(); const wi = ws.indexOf(s);
    const nextWork = P.steps.slice(P.i + 1).find((x) => x.type === 'work');
    const nextItem = s.next || nextWork?.it;
    const e = s.ex || (s.next ? exOf(s.next.ex) : null);
    const phase = s.type === 'work' ? 'work' : s.type === 'ready' ? 'ready' : 'rest';
    const label = { work: 'Work', ready: 'Get ready', rest: s.roundBreak ? 'Round break' : 'Rest', switch: 'Switch sides' }[s.type];
    const doneSoFar = P.steps.slice(0, P.i).filter((x) => x.type === 'work').length;
    const showEx = s.type === 'work' || s.type === 'switch' ? s.ex : exOf((s.next || nextWork?.it || {}).ex);
    el.dataset.phase = s.type === 'switch' ? 'rest' : phase;
    el.innerHTML = `
      <div class="pl-top">
        <button class="pl-icon" data-act="close" aria-label="End workout"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        <div class="pl-title"><b>${esc(P.r.emoji)} ${esc(P.r.name)}</b><span>Round ${s.round || 1} of ${P.r.rounds} · ${mmss(P.total)} elapsed</span></div>
        <button class="pl-icon" data-act="sound" aria-label="Toggle sound">${W().prefs.sound ? '🔔' : '🔕'}</button>
      </div>
      <div class="pl-progress">${ws.map((w, k) => `<i class="${k < doneSoFar ? 'done' : k === wi ? 'now' : ''}"></i>`).join('')}</div>
      <div class="pl-main swap">
        <div class="pl-fig">${showEx ? X().figure(showEx, { cls: 'big' }) : ''}</div>
        <div class="pl-info">
          <span class="pl-phase">${label}</span>
          <h2 class="pl-name">${s.type === 'work' ? esc(s.ex.name) : s.type === 'switch' ? esc(s.ex.name) : `Next: ${esc(showEx?.name || '')}`}</h2>
          <p class="pl-side">${s.type === 'work' ? esc(s.side || '') : s.type === 'switch' ? 'Get into position for the other side' : nextItem ? esc(fmtVal(nextItem)) : ''}</p>
          ${s.dur != null ? `
            <div class="pl-ring">
              <svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" class="track"/><circle cx="100" cy="100" r="88" class="prog" id="plProg" pathLength="1"/></svg>
              <span class="pl-time" id="plTime">${mmss(s.dur)}</span>
            </div>`
            : `<div class="pl-reps"><b>${s.it.value}</b><span>reps${s.side ? ` · ${esc(s.side.toLowerCase())}` : ''}</span><small id="plTime">0:00</small></div>
               <button class="btn pl-done" data-act="next">Done ✓</button>`}
          ${s.type === 'work' && s.ex.tip ? `<p class="pl-tip">💡 ${esc(s.ex.tip)}</p>` : ''}
        </div>
      </div>
      <div class="pl-controls">
        <button class="pl-icon" data-act="prev" aria-label="Previous" ${P.i === 0 ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M19 5 9 12l10 7zM5 5v14"/></svg></button>
        <button class="pl-play" data-act="pause" aria-label="${P.running ? 'Pause' : 'Resume'}">${P.running ? '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg>'}</button>
        <button class="pl-icon" data-act="next" aria-label="Skip"><svg viewBox="0 0 24 24"><path d="m5 5 10 7-10 7zM19 5v14"/></svg></button>
        ${s.type !== 'work' ? '<button class="pl-chip" data-act="plus">+10 s</button>' : ''}
      </div>
      ${nextWork && s.type === 'work' ? `<div class="pl-next">Up next: <b>${esc(nextWork.ex.name)}</b> · ${esc(fmtVal(nextWork.it))}</div>` : ''}`;
    $$('[data-act]', el).forEach((b) => (b.onclick = () => act(b.dataset.act)));

    // cues
    const prefs = W().prefs;
    if (prefs.voice) {
      if (s.type === 'work') PD.fx.speak(`${s.ex.name}${s.side ? `, ${s.side}` : ''}. ${s.it.mode === 'time' ? `${s.dur} seconds` : `${s.it.value} reps`}`);
      else if (s.type === 'ready') PD.fx.speak(`Get ready. First up: ${showEx?.name || ''}`);
      else if (s.type === 'switch') PD.fx.speak('Switch sides');
      else PD.fx.speak(`${s.roundBreak ? 'Round complete. ' : ''}Rest. Next up: ${showEx?.name || ''}`);
    }
    if (prefs.sound && s.type === 'work') PD.fx.chime();
  }

  function loop(now) {
    if (!P) return;
    const dt = (now - P.last) / 1000; P.last = now;
    const s = P.steps[P.i];
    if (P.running) {
      P.elapsed += dt; P.total += dt;
      if (s.type === 'work') { P.workSec += dt; P.kcal += kcalFor(s.ex.met || 4, dt); } else P.kcal += kcalFor(1.5, dt);
    }
    const t = $('#plTime');
    if (s.dur != null) {
      const left = Math.max(0, s.dur - P.elapsed);
      if (t) t.textContent = mmss(Math.ceil(left));
      const prog = $('#plProg');
      if (prog) prog.style.strokeDashoffset = String(1 - left / s.dur);
      const sec = Math.ceil(left);
      if (P.running && sec <= 3 && sec > 0 && !P.said[sec]) { P.said[sec] = 1; if (W().prefs.sound) PD.fx.beep(sec === 1 ? 990 : 770, 0.12); }
      if (P.running && s.type === 'work' && s.dur >= 30 && !P.said.half && left <= s.dur / 2) { P.said.half = 1; if (W().prefs.voice) PD.fx.speak('Halfway'); }
      if (left <= 0) { advance(); }
    } else if (t) t.textContent = mmss(P.elapsed);
    const title = $('.pl-title span');
    if (title && Math.floor(P.total) !== P.lastTotal) { P.lastTotal = Math.floor(P.total); title.textContent = `Round ${s.round || 1} of ${P.r.rounds} · ${mmss(P.total)} elapsed`; }
    P.raf = requestAnimationFrame(loop);
  }

  function advance(dir = 1) {
    const s = P.steps[P.i];
    // a timed exercise counts as done once at least half of it was performed; rep sets count when finished
    if (dir > 0 && s.type === 'work' && (s.dur == null || P.elapsed >= s.dur / 2)) { P.done++; s.counted = true; }
    const ni = P.i + dir;
    if (ni >= P.steps.length) { finish(); return; }
    if (ni < 0) return;
    if (dir < 0 && P.steps[ni].counted) { P.steps[ni].counted = false; P.done = Math.max(0, P.done - 1); }
    P.i = ni; showStep();
  }

  function act(a) {
    if (!P) return;
    if (a === 'pause') { P.running = !P.running; P.last = performance.now(); $('#player').classList.toggle('paused', !P.running); const b = $('.pl-play'); b.innerHTML = P.running ? '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg>'; b.setAttribute('aria-label', P.running ? 'Pause' : 'Resume'); if (!P.running) speechSynthesis?.cancel?.(); }
    if (a === 'next') advance(1);
    if (a === 'prev') advance(-1);
    if (a === 'plus') { const s = P.steps[P.i]; if (s.dur != null) s.dur += 10; }
    if (a === 'sound') { const p = W().prefs; p.sound = !p.sound; store.save('workouts'); $('[data-act=sound]').textContent = p.sound ? '🔔' : '🔕'; }
    if (a === 'close') {
      if (P.workSec < 20) { closePlayer(); return; }
      P.running = false; $('#player').classList.add('paused');
      if (confirm('End this workout now? Your progress so far will be saved.')) finish(true);
      else { P.running = true; P.last = performance.now(); $('#player').classList.remove('paused'); }
    }
  }

  function onKey(e) {
    if (!P || e.target.matches('input, textarea')) return;
    if (e.key === ' ') { e.preventDefault(); act(P.finished ? '' : 'pause'); }
    if (e.key === 'ArrowRight' && !P.finished) act('next');
    if (e.key === 'ArrowLeft' && !P.finished) act('prev');
    if (e.key === 'Escape') { e.preventDefault(); if (P.finished) closePlayer(); else act('close'); }
  }

  function finish(partial = false) {
    cancelAnimationFrame(P.raf);
    P.finished = true;
    const total = workSteps().length;
    const entry = {
      id: PD.uid(), routineId: P.r.id, name: P.r.name, emoji: P.r.emoji, date: todayKey(), start: P.startedAt.toISOString(),
      duration: Math.round(P.total), active: Math.round(P.workSec), kcal: Math.round(P.kcal), exercises: P.done, total, partial: partial && P.done < total, rating: null,
    };
    const strava = store.get('strava');
    const el = $('#player');
    el.dataset.phase = 'done';
    el.innerHTML = `
      <div class="pl-finish">
        <div class="pl-trophy">${partial ? '👏' : '🏆'}</div>
        <h2>${partial ? 'Nice effort!' : 'Workout complete!'}</h2>
        <p>${esc(P.r.emoji)} ${esc(P.r.name)}</p>
        <div class="pl-stats">
          <div><b>${mmss(entry.duration)}</b><span>total time</span></div>
          <div><b data-count="${entry.kcal}">0</b><span>kcal burned</span></div>
          <div><b>${entry.exercises}/${total}</b><span>exercises</span></div>
        </div>
        <p class="pl-q">How did it feel?</p>
        <div class="pl-rate">${[['😌', 'Easy'], ['🙂', 'Good'], ['😅', 'Hard'], ['🥵', 'Brutal']].map(([em, l], i) => `<button data-r="${i + 1}"><span>${em}</span>${l}</button>`).join('')}</div>
        ${strava.accessToken ? '<label class="toggle pl-strava"><input type="checkbox" id="toStrava"> Also upload to Strava</label>' : ''}
        <div class="row gap center">
          <button class="btn ghost light" id="plDiscard">Don't save</button>
          <button class="btn light" id="plSave">Save workout</button>
        </div>
      </div>`;
    PD.fx.countUp(el);
    if (!partial) { PD.fx.confetti(); if (W().prefs.sound) PD.fx.fanfare(); if (W().prefs.voice) PD.fx.speak('Workout complete. Great job!'); }
    $$('.pl-rate button', el).forEach((b) => (b.onclick = () => { entry.rating = +b.dataset.r; $$('.pl-rate button', el).forEach((x) => x.classList.toggle('sel', x === b)); }));
    $('#plDiscard').onclick = () => { if (confirm('Discard this workout?')) closePlayer(); };
    $('#plSave').onclick = async () => {
      const w = W(); w.log.push(entry); store.save('workouts');
      if ($('#toStrava')?.checked) {
        try { await PD.health.uploadWorkout(entry); PD.toast('Saved and uploaded to Strava ✅'); } catch (err) { PD.toast(err.message); }
      } else PD.toast('Workout saved — see it in Health 💪');
      const st = stats();
      closePlayer();
      if (st.weekCount === st.goal) setTimeout(() => { PD.fx.confetti({ origin: { x: 0.5, y: 0.2 } }); PD.toast('Weekly goal reached! 🎉'); }, 300);
    };
  }

  function closePlayer() {
    if (P) { cancelAnimationFrame(P.raf); try { P.wake?.release(); } catch { /* ignore */ } }
    P = null;
    try { speechSynthesis.cancel(); } catch { /* ignore */ }
    document.removeEventListener('keydown', onKey);
    $('#player')?.remove(); document.body.classList.remove('no-scroll');
    if (PD.app.current() === 'workout') render(); else PD.app.renderCurrent();
  }

  PD.workout = { render, start, stats, weeklyMinutes, estimate, catColor };
})(window.PD);
