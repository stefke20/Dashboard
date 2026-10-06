/* Focus timer (Pomodoro): work / break cycles linked to your tasks.
   The running timer lives on this device (survives reloads); finished sessions are synced. */
(function (PD) {
  const { esc, $, $$, fmt, store, todayKey } = PD;
  const RUN = 'pd.focus.run';
  const F = () => store.get('focus');

  let run = null;
  try { run = JSON.parse(localStorage.getItem(RUN)); } catch { run = null; }
  const persist = () => { try { if (run) localStorage.setItem(RUN, JSON.stringify(run)); else localStorage.removeItem(RUN); } catch { /* ignore */ } };

  const left = () => {
    if (!run) return F().work * 60;
    if (run.pausedLeft != null) return run.pausedLeft;
    return Math.max(0, run.dur - (Date.now() - run.start) / 1000);
  };
  const mmss = (s) => `${Math.floor(s / 60)}:${PD.pad(Math.floor(s % 60))}`;

  function start(mode = 'work', label, taskId) {
    const f = F();
    const dur = (mode === 'work' ? f.work : f.brk) * 60;
    run = { mode, start: Date.now(), dur, pausedLeft: null, label: label ?? run?.label ?? '', taskId: taskId ?? run?.taskId ?? null };
    persist(); PD.haptic?.(20); tick(true);
    if (mode === 'work') PD.reminders?.ask?.();
  }
  function pause() { if (!run || run.pausedLeft != null) return; run.pausedLeft = left(); persist(); tick(true); }
  function resume() { if (!run || run.pausedLeft == null) return; run.start = Date.now() - (run.dur - run.pausedLeft) * 1000; run.pausedLeft = null; persist(); tick(true); }
  function reset() { run = null; persist(); tick(true); }

  function complete() {
    const r = run;
    if (r.mode === 'work') {
      F().sessions.push({ id: PD.uid(), date: todayKey(), start: new Date(r.start).toISOString(), minutes: Math.round(r.dur / 60), label: r.label, taskId: r.taskId });
      store.save('focus');
      PD.fx.chime(); PD.fx.confetti({ count: 60, origin: { x: 0.5, y: 0.6 } });
      PD.reminders?.notify('Focus session done 🍅', `${Math.round(r.dur / 60)} minutes${r.label ? ` on “${r.label}”` : ''}. Time for a ${F().brk}-minute break.`);
      run = { ...r, mode: 'break', dur: F().brk * 60, pausedLeft: F().brk * 60 }; // break ready, starts on tap
    } else {
      PD.fx.chime();
      PD.reminders?.notify('Break over', 'Ready for another focus session?');
      run = null;
    }
    persist();
  }

  /* ---------- UI ---------- */
  const R = 64; const C = 2 * Math.PI * R;
  function card(el) {
    if (!el) return;
    const f = F(); const today = f.sessions.filter((s) => s.date === todayKey());
    const mins = today.reduce((a, s) => a + s.minutes, 0);
    const tasks = store.get('tasks').filter((t) => !t.done);
    const mode = run?.mode || 'work';
    el.innerHTML = `
      <div class="card-head"><h2>Focus</h2><span class="muted small">${today.length ? `${'🍅'.repeat(Math.min(today.length, 8))} ${mins} min today` : 'No sessions yet today'}</span></div>
      <div class="focus ${mode}">
        <div class="focus-ring">
          <svg viewBox="0 0 160 160"><circle cx="80" cy="80" r="${R}" class="track"/><circle cx="80" cy="80" r="${R}" class="prog" id="focusProg" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
          <div class="focus-time"><b id="focusTime">${mmss(left())}</b><span>${mode === 'work' ? 'Focus' : 'Break'}</span></div>
        </div>
        <div class="focus-side">
          <label class="small muted" for="focusLabel">Working on</label>
          <input id="focusLabel" list="focusTasks" placeholder="What are you focusing on?" value="${esc(run?.label || '')}" maxlength="80">
          <datalist id="focusTasks">${tasks.map((t) => `<option value="${esc(t.text)}">`).join('')}</datalist>
          <div class="chips focus-len">${[15, 25, 45, 50].map((m) => `<button class="chip${f.work === m ? ' active' : ''}" data-len="${m}">${m} min</button>`).join('')}</div>
          <div class="row gap" id="focusBtns"></div>
        </div>
      </div>`;
    $$('[data-len]', el).forEach((b) => (b.onclick = () => { f.work = +b.dataset.len; store.save('focus'); if (!run) reset(); card(el); }));
    $('#focusLabel', el).onchange = (e) => { if (run) { run.label = e.target.value.trim(); persist(); } };
    buttons(); tick(true);
  }

  function buttons() {
    const b = $('#focusBtns');
    if (!b) return;
    const label = () => $('#focusLabel')?.value.trim() || '';
    const taskFor = (l) => store.get('tasks').find((t) => t.text === l && !t.done)?.id || null;
    if (!run) b.innerHTML = '<button class="btn" data-f="start">▶ Start focus</button>';
    else if (run.pausedLeft != null && run.mode === 'break' && run.pausedLeft === run.dur) b.innerHTML = '<button class="btn" data-f="break">☕ Start break</button><button class="btn ghost" data-f="start">Skip break</button>';
    else if (run.pausedLeft != null) b.innerHTML = '<button class="btn" data-f="resume">▶ Resume</button><button class="btn ghost" data-f="reset">Reset</button>';
    else b.innerHTML = '<button class="btn" data-f="pause">❚❚ Pause</button><button class="btn ghost" data-f="reset">Stop</button>';
    $$('[data-f]', b).forEach((x) => (x.onclick = () => {
      const a = x.dataset.f;
      if (a === 'start') { const l = label(); start('work', l, taskFor(l)); }
      if (a === 'break') start('break');
      if (a === 'pause') pause();
      if (a === 'resume') resume();
      if (a === 'reset') reset();
      buttons();
    }));
  }

  let lastShown = '';
  function tick(force) {
    if (run && run.pausedLeft == null && left() <= 0) { complete(); force = true; const el = $('#focusCard'); if (el) card(el); }
    const l = left(); const txt = mmss(Math.ceil(l));
    const t = $('#focusTime'); if (t && (force || txt !== lastShown)) t.textContent = txt;
    const p = $('#focusProg'); if (p) p.style.strokeDashoffset = String(C * (1 - l / (run?.dur || F().work * 60)));
    lastShown = txt;
    if (force) buttons();
    // floating pill on other tabs + tab title while running
    const pill = $('#focusPill');
    const active = run && run.pausedLeft == null;
    if (pill) {
      pill.hidden = !run || PD.app.current() === 'home';
      pill.textContent = `${run?.mode === 'break' ? '☕' : '🍅'} ${txt}${run?.pausedLeft != null ? ' ❚❚' : ''}`;
    }
    const base = document.title.replace(/^\d+:\d\d · /, '');
    document.title = active ? `${txt} · ${base}` : base;
  }
  setInterval(() => tick(false), 1000);

  PD.focus = { card, start, pause, resume, reset, running: () => run, tick };
})(window.PD);
