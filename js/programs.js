/* Multi-week workout programmes: built-in plans + your own, with weekly progression,
   a training-day schedule that shows up in the calendar, and progress tracking. */
(function (PD) {
  const { esc, $, $$, fmt, store, todayKey } = PD;
  const W = () => store.get('workouts');
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DEFAULT_DAYS = { 2: [2, 5], 3: [1, 3, 5], 4: [1, 2, 4, 6], 5: [1, 2, 3, 5, 6] };

  const S = (name, items) => ({ name, items: items.map(([ex, mode, value, side]) => ({ id: `${ex}-${mode}`, ex, mode, value, side: !!side })) });
  const BUILTIN = [
    { id: 'p-basics', name: 'Bodyweight Basics', emoji: '🌱', color: 'mint', level: 'Beginner', weeks: 4, perWeek: 3, rounds: 2, roundEvery: 2, rest: 30, roundRest: 60, repStep: 2, timeStep: 5,
      desc: 'Build the habit and learn the basic movements. Two alternating full-body sessions that slowly get longer.',
      sessions: [
        S('Full body A', [['squat', 'reps', 10], ['kneepush', 'reps', 8], ['bridge', 'reps', 12], ['plank', 'time', 20], ['jacks', 'time', 30]]),
        S('Full body B', [['lunge', 'reps', 8, true], ['wallpush', 'reps', 12], ['birddog', 'reps', 8, true], ['deadbug', 'reps', 8, true], ['highknees', 'time', 20]]),
      ] },
    { id: 'p-strength', name: 'Strength Builder', emoji: '💪', color: 'violet', level: 'Intermediate', weeks: 6, perWeek: 3, rounds: 3, roundEvery: 3, rest: 30, roundRest: 60, repStep: 2, timeStep: 5,
      desc: 'Classic upper / lower / core split. Reps go up every week and you add a round halfway.',
      sessions: [
        S('Upper body', [['pushup', 'reps', 10], ['pike', 'reps', 6], ['dips', 'reps', 10], ['taps', 'time', 30], ['superman', 'reps', 12]]),
        S('Lower body', [['squat', 'reps', 15], ['lunge', 'reps', 10, true], ['sldl', 'reps', 8, true], ['bridge', 'reps', 15], ['wallsit', 'time', 30], ['calf', 'reps', 20]]),
        S('Core & cardio', [['burpee', 'time', 30], ['climber', 'time', 30], ['plank', 'time', 40], ['bicycle', 'time', 30], ['legraise', 'reps', 10]]),
      ] },
    { id: 'p-core', name: 'Core 30', emoji: '🔥', color: 'pink', level: 'All levels', weeks: 4, perWeek: 4, rounds: 2, roundEvery: 2, rest: 15, roundRest: 45, repStep: 3, timeStep: 5,
      desc: 'Short, focused core sessions four times a week for a stronger midsection.',
      sessions: [
        S('Core A', [['plank', 'time', 30], ['crunch', 'reps', 15], ['flutter', 'time', 20], ['sideplank', 'time', 20, true]]),
        S('Core B', [['deadbug', 'reps', 8, true], ['revcrunch', 'reps', 12], ['twist', 'time', 25], ['hollow', 'time', 15]]),
      ] },
    { id: 'p-hiit', name: 'HIIT Burn', emoji: '⚡', color: 'peach', level: 'Intermediate', weeks: 4, perWeek: 3, rounds: 3, roundEvery: 2, rest: 20, roundRest: 60, repStep: 1, timeStep: 5,
      desc: 'High-intensity intervals to boost your fitness. Work intervals get 5 seconds longer each week.',
      sessions: [
        S('Burn A', [['burpee', 'time', 30], ['climber', 'time', 30], ['jumpsquat', 'time', 30], ['skaters', 'time', 30], ['highknees', 'time', 30]]),
        S('Burn B', [['jacks', 'time', 30], ['jumplunge', 'time', 30], ['updown', 'time', 30], ['tuckjump', 'time', 20], ['buttkicks', 'time', 30]]),
      ] },
    { id: 'p-band', name: 'Band Builder', emoji: '🎗️', color: 'sky', level: 'Beginner+', weeks: 4, perWeek: 3, rounds: 3, roundEvery: 0, rest: 30, roundRest: 60, repStep: 2, timeStep: 5,
      desc: 'Full-body strength with just a resistance band. Use a stronger band when the reps feel easy.',
      sessions: [
        S('Band A', [['b-squat', 'reps', 12], ['b-row', 'reps', 12], ['b-press', 'reps', 10], ['b-pullapart', 'reps', 15]]),
        S('Band B', [['b-goodmorning', 'reps', 12], ['b-pulldown', 'reps', 12], ['b-curl', 'reps', 12], ['b-lateral', 'reps', 10], ['b-facepull', 'reps', 12]]),
      ] },
  ];

  const all = () => [...BUILTIN, ...(W().programs || [])];
  const byId = (id) => all().find((p) => p.id === id);
  const enrolled = () => { const e = W().enrolled; return e && byId(e.programId) ? e : null; };

  /** Session templates of a programme (custom programmes use your routines). */
  function sessions(p) {
    if (!p.custom) return p.sessions;
    return (p.routineIds || []).map((id) => W().routines.find((r) => r.id === id)).filter(Boolean)
      .map((r) => ({ name: r.name, items: r.items, rounds: r.rounds, rest: r.rest, roundRest: r.roundRest }));
  }
  const total = (p, e) => p.weeks * (e?.days?.length || p.perWeek);

  /** The concrete routine for session index s, with progression applied. */
  function sessionRoutine(p, s, e = enrolled()) {
    const per = e?.days?.length || p.perWeek;
    const week = Math.floor(s / per);
    const list = sessions(p);
    const t = list[(s % per) % list.length] || list[0];
    const baseRounds = t.rounds || p.rounds || 1;
    return {
      id: `${p.id}-s${s}`, name: `${p.name} · Week ${week + 1}: ${t.name}`, emoji: p.emoji, color: p.color,
      rounds: baseRounds + (p.roundEvery ? Math.floor(week / p.roundEvery) : 0),
      rest: t.rest ?? p.rest ?? 20, roundRest: t.roundRest ?? p.roundRest ?? 45, week, title: t.name,
      items: t.items.map((it) => ({ ...it, value: it.value + (it.mode === 'reps' ? (p.repStep || 0) : (p.timeStep || 0)) * week })),
    };
  }

  const nextIndex = (e) => { const d = new Set(e.done); let i = 0; while (d.has(i)) i++; return i; };

  /** Dates for the remaining sessions: from today (or the day after your last session) on your training days. */
  function schedule(e, p, limitDays = 120) {
    const out = [];
    const tot = total(p, e);
    let s = nextIndex(e);
    let k = [e.start, todayKey(), e.lastDate ? PD.shiftKey(e.lastDate, 1) : ''].sort().pop();
    for (let n = 0; n < limitDays && s < tot; n++, k = PD.shiftKey(k, 1)) {
      if (e.days.includes(PD.parseKey(k).getDay())) { out.push({ s, date: k }); s++; }
    }
    return out;
  }

  /** Calendar entries for the upcoming programme sessions. */
  function planned(from, to) {
    const e = enrolled(); if (!e) return [];
    const p = byId(e.programId);
    return schedule(e, p).filter((x) => x.date >= from && x.date <= to).map((x, i) => {
      const r = sessionRoutine(p, x.s, e);
      return {
        id: `p-${p.id}-${x.s}`, type: 'workout', readonly: true, startable: i === 0 && x.s === nextIndex(e), routineId: 'program', date: x.date, occursOn: x.date,
        displayTitle: `${p.emoji} ${p.name} · W${r.week + 1} ${r.title}`, notes: `~${Math.round(PD.workout.estimate(r) / 60)} min · ${r.rounds} round${r.rounds === 1 ? '' : 's'}`,
      };
    });
  }

  function startNext() {
    const e = enrolled(); if (!e) return;
    const p = byId(e.programId); const s = nextIndex(e);
    PD.workout.start(sessionRoutine(p, s, e), { program: p.id, session: s });
  }

  /** Called when a programme session is saved. Returns the programme name when it's finished. */
  function complete(programId, s, entry) {
    const w = W(); const e = w.enrolled;
    if (!e || e.programId !== programId) return false;
    if (!e.done.includes(s)) e.done.push(s);
    e.logs = { ...(e.logs || {}), [s]: entry.id }; e.lastDate = todayKey();
    const p = byId(programId);
    if (e.done.length >= total(p, e)) {
      w.programHistory = [...(w.programHistory || []), { id: PD.uid(), programId, name: p.name, emoji: p.emoji, start: e.start, finished: todayKey(), sessions: e.done.length }];
      w.enrolled = null;
      return p.name;
    }
    return false;
  }

  /* ---------------- UI ---------------- */
  function render(el) {
    if (!el) return;
    const e = enrolled();
    const list = all().filter((p) => !e || p.id !== e.programId);
    el.innerHTML = `${e ? activeCard(e) : ''}
      <div class="programs">${list.map(card).join('')}</div>
      ${(W().programHistory || []).length ? `<p class="muted small">Finished: ${W().programHistory.map((h) => `${esc(h.emoji)} ${esc(h.name)} (${esc(fmt.dayMonth(PD.parseKey(h.finished)))})`).join(' · ')}</p>` : ''}`;
    $$('[data-penroll]', el).forEach((b) => (b.onclick = () => enrollModal(byId(b.dataset.penroll))));
    $$('[data-pedit]', el).forEach((b) => (b.onclick = () => builder(byId(b.dataset.pedit))));
    $$('[data-pplan]', el).forEach((b) => (b.onclick = () => planModal(byId(b.dataset.pplan))));
    const go = $('[data-pstart]', el); if (go) go.onclick = startNext;
    const leave = $('[data-pleave]', el);
    if (leave) leave.onclick = () => {
      if (!confirm('Stop this programme? Your finished workouts stay in your history.')) return;
      W().enrolled = null; store.save('workouts'); render(el);
    };
    PD.fx.countUp(el);
  }

  function activeCard(e) {
    const p = byId(e.programId); const tot = total(p, e); const s = nextIndex(e);
    const r = sessionRoutine(p, s, e);
    const when = schedule(e, p)[0]?.date || todayKey();
    const due = when <= todayKey();
    const pct = Math.round((e.done.length / tot) * 100);
    return `<div class="program-active routine ${esc(p.color)}">
      <div class="pa-head">
        <span class="routine-emoji">${esc(p.emoji)}</span>
        <div class="routine-meta"><h3>${esc(p.name)}</h3><span class="small">Week ${Math.min(r.week + 1, p.weeks)} of ${p.weeks} · ${e.days.map((d) => DAYS[d]).join(', ')}</span></div>
        <span class="spacer"></span>
        <button class="btn sm ghost" data-pplan="${p.id}">View plan</button>
        <button class="btn sm ghost" data-pleave>Stop</button>
      </div>
      <div class="pa-progress"><span class="bar-track"><i style="width:${pct}%"></i></span><span class="small"><b data-count="${e.done.length}">0</b> / ${tot} sessions · ${pct}%</span></div>
      <div class="pa-next">
        <div>
          <span class="pill ${due ? 'peach' : ''}">${due ? 'Due today' : `Next: ${esc(PD.relDay(when))}`}</span>
          <h4>${esc(r.title)}</h4>
          <span class="muted small">${r.items.length} exercises · ${r.rounds} round${r.rounds === 1 ? '' : 's'} · ~${Math.round(PD.workout.estimate(r) / 60)} min${r.week > 0 ? ` · +${r.week * (p.repStep || 0)} reps / +${r.week * (p.timeStep || 0)} s vs week 1` : ''}</span>
          <div class="routine-figs">${PD.workout.routineFigs(r.items)}</div>
        </div>
        <button class="btn play big" data-pstart><svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg>Start session ${s + 1}</button>
      </div>
    </div>`;
  }

  function card(p) {
    const ss = sessions(p);
    return `<article class="routine program-card ${esc(p.color || 'violet')}">
      <div class="pc-top"><span class="routine-emoji">${esc(p.emoji || '📅')}</span>
        <div class="routine-meta"><h3>${esc(p.name)}</h3><span class="small">${esc(p.level || 'Custom')} · ${p.weeks} weeks · ${p.perWeek}× per week</span></div></div>
      <p class="small pc-desc">${esc(p.desc || `${ss.length} rotating session${ss.length === 1 ? '' : 's'}: ${ss.map((x) => x.name).join(', ')}`)}</p>
      <div class="pc-tags">${p.repStep ? `<span class="pill small">+${p.repStep} reps/wk</span>` : ''}${p.timeStep ? `<span class="pill small">+${p.timeStep}s/wk</span>` : ''}${p.roundEvery ? `<span class="pill small">+1 round every ${p.roundEvery} wk</span>` : ''}</div>
      <div class="routine-actions">
        <button class="btn play" data-penroll="${p.id}" ${ss.length ? '' : 'disabled'}>Start programme</button>
        <button class="icon-btn sm" data-pplan="${p.id}" title="View plan" aria-label="View plan"><svg viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg></button>
        ${p.custom ? `<button class="icon-btn sm" data-pedit="${p.id}" title="Edit" aria-label="Edit programme"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button>` : ''}
      </div>
    </article>`;
  }

  function enrollModal(p) {
    const cur = enrolled();
    const def = DEFAULT_DAYS[p.perWeek] || [1, 3, 5];
    PD.modal(`Start “${p.name}”`, `
      <form id="enForm" class="form">
        <p class="small">${esc(p.desc || '')}</p>
        <label>Training days (${p.perWeek} recommended)</label>
        <div class="day-pick">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<label><input type="checkbox" name="d" value="${d}" ${def.includes(d) ? 'checked' : ''}><span>${DAYS[d]}</span></label>`).join('')}</div>
        <label>Start date<input type="date" name="start" value="${todayKey()}" required></label>
        <p class="muted small" id="enSummary"></p>
        ${cur ? `<p class="warn-note small">This replaces your current programme (${esc(byId(cur.programId).name)}). Finished workouts stay in your history.</p>` : ''}
        <div class="row gap end"><button type="button" class="btn ghost" data-cancel>Cancel</button><button class="btn">Let's go 🚀</button></div>
      </form>`, (body, close) => {
      const f = $('#enForm', body);
      const days = () => $$('input[name=d]:checked', f).map((i) => +i.value);
      const sum = () => { const n = days().length; $('#enSummary', body).textContent = n ? `${p.weeks * n} sessions over ${p.weeks} weeks · they'll appear in your calendar.` : 'Pick at least one day.'; };
      f.onchange = sum; sum();
      $('[data-cancel]', body).onclick = close;
      f.onsubmit = (ev) => {
        ev.preventDefault();
        if (!days().length) return;
        W().enrolled = { programId: p.id, start: f.start.value, days: days().sort(), done: [], logs: {} };
        store.save('workouts'); close(); PD.workout.render();
        PD.fx.confetti({ count: 90, origin: { x: 0.5, y: 0.3 } }); PD.toast(`${p.name} started — first session ${PD.relDay(schedule(W().enrolled, p)[0]?.date || todayKey()).toLowerCase()}`);
      };
    });
  }

  function planModal(p) {
    const e = enrolled()?.programId === p.id ? enrolled() : null;
    const per = e?.days.length || p.perWeek;
    const next = e ? nextIndex(e) : -1;
    const dates = e ? Object.fromEntries(schedule(e, p).map((x) => [x.s, x.date])) : {};
    let html = '<div class="plan">';
    for (let w = 0; w < p.weeks; w++) {
      html += `<div class="plan-week"><b>Week ${w + 1}</b><div class="plan-sessions">`;
      for (let i = 0; i < per; i++) {
        const s = w * per + i; const r = sessionRoutine(p, s, e || { days: Array(per).fill(0) });
        const st = e?.done.includes(s) ? 'done' : s === next ? 'next' : '';
        html += `<span class="plan-s ${st}" title="${esc(r.items.map((it) => `${PD.workout.exOf(it.ex).name} ${PD.workout.fmtVal(it)}`).join(', '))}">
          ${st === 'done' ? '✓ ' : ''}${esc(r.title)}<small>${r.rounds}× · ~${Math.round(PD.workout.estimate(r) / 60)} min${dates[s] ? ` · ${esc(fmt.dayMonth(PD.parseKey(dates[s])))}` : ''}</small></span>`;
      }
      html += '</div></div>';
    }
    html += '</div>';
    PD.modal(`${p.emoji} ${p.name}`, `<p class="small">${esc(p.desc || '')}</p>${html}<p class="muted small">Hover a session to see its exercises. Values increase every week.</p>`, null, 'wide');
  }

  /* ---------------- builder ---------------- */
  function builder(p) {
    const routines = W().routines;
    const d = p ? structuredClone(p) : { id: `cp-${PD.uid()}`, custom: true, name: '', emoji: '📅', color: 'violet', weeks: 4, perWeek: 3, repStep: 2, timeStep: 5, roundEvery: 0, routineIds: [] };
    const num = (n, v, min, max, label, unit) => `<label class="grow">${label}<span class="row gap"><input type="number" name="${n}" value="${v}" min="${min}" max="${max}"><span class="muted small">${unit}</span></span></label>`;
    PD.modal(p ? 'Edit programme' : 'Build a programme', `
      <form id="pbForm" class="form">
        <div class="row gap wrap"><label class="grow">Name<input name="name" required maxlength="40" value="${esc(d.name)}" placeholder="e.g. Summer shape-up"></label>
          <label style="width:90px">Emoji<input name="emoji" maxlength="4" value="${esc(d.emoji)}"></label></div>
        <div class="row gap wrap">${num('weeks', d.weeks, 1, 16, 'Length', 'weeks')}${num('perWeek', d.perWeek, 1, 7, 'Sessions', 'per week')}</div>
        <label>Rotate through these routines (in this order)</label>
        <div class="pick-routines">${routines.map((r) => `<label class="toggle"><input type="checkbox" name="rt" value="${r.id}" ${d.routineIds.includes(r.id) ? 'checked' : ''}> ${esc(r.emoji)} ${esc(r.name)} <span class="muted small">~${Math.round(PD.workout.estimate(r) / 60)} min</span></label>`).join('')}</div>
        <h3 class="sub">Progression each week</h3>
        <div class="row gap wrap">${num('repStep', d.repStep, 0, 10, 'Add reps', 'per week')}${num('timeStep', d.timeStep, 0, 30, 'Add time', 's per week')}${num('roundEvery', d.roundEvery, 0, 8, 'Extra round every', 'weeks (0 = never)')}</div>
        <div class="row gap end">
          ${p ? '<button type="button" class="btn ghost danger" id="pbDel">Delete</button><span class="spacer"></span>' : ''}
          <button type="button" class="btn ghost" data-cancel>Cancel</button><button class="btn">Save programme</button></div>
      </form>`, (body, close) => {
      const f = $('#pbForm', body);
      $('[data-cancel]', body).onclick = close;
      const del = $('#pbDel', body);
      if (del) del.onclick = () => {
        if (!confirm('Delete this programme?')) return;
        const w = W(); w.programs = w.programs.filter((x) => x.id !== d.id);
        if (w.enrolled?.programId === d.id) w.enrolled = null;
        store.save('workouts'); close(); PD.workout.render();
      };
      f.onsubmit = (ev) => {
        ev.preventDefault();
        const ids = $$('input[name=rt]:checked', f).map((i) => i.value);
        if (!ids.length) { PD.toast('Pick at least one routine'); return; }
        const n = (k, min, max) => Math.min(max, Math.max(min, Math.round(Number(f[k].value) || 0)));
        Object.assign(d, { name: f.name.value.trim(), emoji: f.emoji.value.trim() || '📅', weeks: n('weeks', 1, 16), perWeek: n('perWeek', 1, 7),
          repStep: n('repStep', 0, 10), timeStep: n('timeStep', 0, 30), roundEvery: n('roundEvery', 0, 8), routineIds: ids });
        const w = W(); w.programs = w.programs || [];
        const i = w.programs.findIndex((x) => x.id === d.id);
        if (i >= 0) w.programs[i] = d; else w.programs.push(d);
        store.save('workouts'); close(); PD.workout.render(); PD.toast('Programme saved');
      };
    });
  }

  PD.programs = { render, planned, startNext, complete, builder, BUILTIN, all };
})(window.PD);
