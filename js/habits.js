/* Habits (daily check-ins with streaks + heatmaps) and mood journal.
   Some habits complete themselves from other tabs: water (Diet) and move (workout, Strava or step goal). */
(function (PD) {
  const { esc, $, $$, fmt, store, todayKey } = PD;
  const H = () => store.get('habits');
  const J = () => store.get('journal');
  const MOODS = [['😞', 'Awful'], ['😕', 'Meh'], ['😐', 'Okay'], ['🙂', 'Good'], ['😄', 'Great']];
  const AUTO = { water: 'Done when you hit your water goal (Diet)', move: 'Done after a workout, a Strava activity or your step goal' };

  function autoDone(h, k) {
    if (h.auto === 'water') { const d = store.get('diet'); return (d.water[k] || 0) >= (d.targets.water || 8); }
    if (h.auto === 'move') {
      const hl = store.get('health');
      return store.get('workouts').log.some((l) => l.date === k)
        || (hl.daily[k]?.steps || 0) >= hl.stepGoal
        || (store.get('strava').activities || []).some((a) => a.start?.slice(0, 10) === k);
    }
    return false;
  }
  const manual = (h, k) => (H().log[k] || []).includes(h.id);
  const isDone = (h, k) => manual(h, k) || autoDone(h, k);

  function streak(h) {
    let k = todayKey(); let n = 0;
    if (!isDone(h, k)) k = PD.shiftKey(k, -1);
    while (isDone(h, k) && n < 1000) { n++; k = PD.shiftKey(k, -1); }
    return n;
  }
  function best(h, days = 365) {
    let b = 0; let cur = 0;
    PD.lastNDays(days).forEach((k) => { if (isDone(h, k)) { cur++; b = Math.max(b, cur); } else cur = 0; });
    return b;
  }
  const rate = (h, days = 30) => PD.lastNDays(days).filter((k) => isDone(h, k)).length / days;

  function toggle(id, k = todayKey()) {
    const h = H().list.find((x) => x.id === id);
    if (!h) return;
    if (!manual(h, k) && autoDone(h, k)) { PD.toast(`Already done ✓ — ${AUTO[h.auto]}`); return; }
    const log = H().log; const list = log[k] || [];
    log[k] = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    if (!log[k].length) delete log[k];
    store.save('habits');
    PD.haptic?.(15);
    const all = H().list.every((x) => isDone(x, k));
    if (all && log[k]?.includes(id)) { PD.fx.confetti({ count: 80, origin: { x: 0.5, y: 0.5 } }); PD.toast('All habits done today 🎉'); }
  }

  function setMood(mood, note) {
    const j = J(); const k = todayKey();
    j[k] = { ...(j[k] || {}), ...(mood != null ? { mood } : {}), ...(note != null ? { note } : {}) };
    store.save('journal');
  }

  /* ---------- Home card ---------- */
  function card(el) {
    if (!el) return;
    const k = todayKey();
    const list = H().list;
    const done = list.filter((h) => isDone(h, k)).length;
    const today = J()[k] || {};
    el.innerHTML = `
      <div class="card-head"><h2>Habits &amp; mood</h2><span class="muted small">${done}/${list.length} today</span>
        <a class="icon-btn sm" href="#health" title="History" aria-label="Habit history"><svg viewBox="0 0 24 24"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg></a></div>
      <div class="mood-row" role="radiogroup" aria-label="How do you feel today?">
        <span class="small muted">How do you feel?</span>
        ${MOODS.map(([e, l], i) => `<button class="mood${today.mood === i + 1 ? ' sel' : ''}" data-mood="${i + 1}" title="${l}" aria-label="${l}" aria-pressed="${today.mood === i + 1}">${e}</button>`).join('')}
      </div>
      <input class="mood-note" id="moodNote" placeholder="One line about today… (optional)" value="${esc(today.note || '')}" maxlength="200">
      <ul class="habit-list">${list.map((h) => {
        const d = isDone(h, k); const s = streak(h); const auto = !manual(h, k) && autoDone(h, k);
        return `<li><button class="habit${d ? ' done' : ''}" data-habit="${esc(h.id)}" aria-pressed="${d}">
          <span class="habit-check">${d ? '✓' : ''}</span><span class="habit-emoji">${esc(h.emoji)}</span>
          <span class="habit-name">${esc(h.name)}${auto ? ' <span class="pill small mint">auto</span>' : ''}</span>
          ${s ? `<span class="streak" title="${s}-day streak">🔥 ${s}</span>` : ''}</button></li>`;
      }).join('')}</ul>`;
    $$('[data-habit]', el).forEach((b) => (b.onclick = () => { toggle(b.dataset.habit); card(el); }));
    $$('[data-mood]', el).forEach((b) => (b.onclick = () => { setMood(+b.dataset.mood); PD.haptic?.(10); card(el); }));
    const note = $('#moodNote', el);
    note.onchange = () => setMood(null, note.value.trim());
    note.onkeydown = (e) => { if (e.key === 'Enter') note.blur(); };
  }

  /* ---------- Health section ---------- */
  function heatmap(fn, weeks = 15) {
    // columns = weeks (oldest → newest), rows = Mon..Sun
    const start = PD.addDays(PD.startOfWeek(new Date()), -7 * (weeks - 1));
    let cells = '';
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const day = PD.addDays(start, w * 7 + d); const k = PD.keyOf(day);
        if (k > todayKey()) { cells += '<i class="hm-cell future"></i>'; continue; }
        const v = fn(k); // 0..1
        const lvl = v <= 0 ? 0 : v < 0.34 ? 1 : v < 0.67 ? 2 : v < 1 ? 3 : 4;
        cells += `<i class="hm-cell l${lvl}" style="--d:${w * 7 + d}" title="${esc(fmt.short(day))}: ${Math.round(v * 100)}%"></i>`;
      }
    }
    return `<div class="heatmap" style="--weeks:${weeks}">${cells}</div>`;
  }

  function section() {
    const list = H().list;
    const all = (k) => (list.length ? list.filter((h) => isDone(h, k)).length / list.length : 0);
    const moods = PD.lastNDays(30).map((k) => J()[k]?.mood).filter(Boolean);
    return `<div class="card" id="habitSection">
      <div class="card-head"><h2><span class="brand-badge habits">✓</span> Habits &amp; mood</h2>
        <button class="btn sm ghost" id="habitManage">Edit habits</button></div>
      <div class="two-col">
        <div>
          <h3 class="sub">All habits · last 15 weeks</h3>
          ${heatmap(all)}
          <div class="hm-legend small muted">Less ${[0, 1, 2, 3, 4].map((l) => `<i class="hm-cell l${l}"></i>`).join('')} More</div>
        </div>
        <div>
          <h3 class="sub">Mood · last 30 days${moods.length ? ` · avg ${MOODS[Math.round(moods.reduce((a, b) => a + b, 0) / moods.length) - 1][0]}` : ''}</h3>
          <div class="chart-box" id="moodChart"></div>
        </div>
      </div>
      <h3 class="sub">Streaks</h3>
      <div class="habit-stats">${list.map((h) => `
        <div class="habit-stat">
          <span class="habit-emoji">${esc(h.emoji)}</span>
          <div class="grow"><b>${esc(h.name)}</b><span class="muted small">${Math.round(rate(h) * 100)}% of the last 30 days${h.auto ? ' · auto' : ''}</span>
            ${heatmap((k) => (isDone(h, k) ? 1 : 0), 15)}</div>
          <div class="streak-box"><b>🔥 ${streak(h)}</b><span class="muted small">best ${best(h)}</span></div>
        </div>`).join('') || '<p class="empty">No habits yet.</p>'}</div>
    </div>`;
  }

  function drawSection() {
    const el = $('#moodChart');
    if (el) {
      const days = PD.lastNDays(30);
      if (!days.some((k) => J()[k]?.mood)) el.innerHTML = '<p class="empty">Pick a mood on the Home page each day to see your trend.</p>';
      else PD.charts.line(el, days.map((k) => ({
        label: fmt.dayMonth(PD.parseKey(k)), value: J()[k]?.mood ?? null,
        tip: `<b>${esc(fmt.short(PD.parseKey(k)))}</b><br>${J()[k]?.mood ? `${MOODS[J()[k].mood - 1].join(' ')}` : ''}${J()[k]?.note ? `<br>“${esc(J()[k].note)}”` : ''}`,
      })), { color: 'var(--accent-pink-ink)', height: 170, label: 'Mood per day (1–5)', yMin: 1, yMax: 5 });
    }
    const m = $('#habitManage'); if (m) m.onclick = manage;
  }

  function manage() {
    let draft = structuredClone(H().list); // edits stay local until Save
    const draw = (body, close) => {
      const list = draft;
      body.innerHTML = `
        <p class="muted small">Daily habits to check off. "Auto" habits tick themselves from your other data.</p>
        <ul class="items">${list.map((h, i) => `
          <li class="item habit-edit" data-i="${i}">
            <input class="emoji-in" value="${esc(h.emoji)}" maxlength="4" aria-label="Emoji">
            <input class="name-in" value="${esc(h.name)}" maxlength="40" aria-label="Habit name">
            <select class="auto-in" aria-label="Automatic"><option value="">Manual</option><option value="water" ${h.auto === 'water' ? 'selected' : ''}>Auto: water goal</option><option value="move" ${h.auto === 'move' ? 'selected' : ''}>Auto: workout/steps</option></select>
            <button type="button" class="icon-btn sm ghost" data-rm aria-label="Remove"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
          </li>`).join('')}</ul>
        <button type="button" class="btn ghost full" id="hAdd">+ Add habit</button>
        <div class="row gap end"><button type="button" class="btn ghost" data-cancel>Cancel</button><button class="btn" id="hSave">Save</button></div>`;
      const read = () => $$('.habit-edit', body).map((li) => ({ ...list[+li.dataset.i], emoji: $('.emoji-in', li).value.trim() || '✅', name: $('.name-in', li).value.trim(), auto: $('.auto-in', li).value || undefined })).filter((h) => h.name);
      $$('[data-rm]', body).forEach((b) => (b.onclick = () => { const i = +b.closest('li').dataset.i; draft = read().filter((_, j) => j !== i); draw(body, close); }));
      $('#hAdd', body).onclick = () => { draft = [...read(), { id: `h-${PD.uid()}`, name: 'New habit', emoji: '⭐' }]; draw(body, close); $$('.name-in', body).pop()?.select(); };
      $('[data-cancel]', body).onclick = close;
      $('#hSave', body).onclick = () => { H().list = read(); store.save('habits'); close(); PD.app.renderCurrent(); };
    };
    PD.modal('Edit habits', '', draw);
  }

  PD.habits = { card, section, drawSection, isDone, streak, MOODS, toggle, setMood };
})(window.PD);
