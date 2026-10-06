/* Command palette (Ctrl/⌘ K or "/"): jump anywhere and do things by typing. */
(function (PD) {
  const { esc, $, $$, store, todayKey, norm } = PD;
  let el = null; let items = []; let sel = 0;

  const go = (tab) => { location.hash = `#${tab}`; };
  const after = (fn) => setTimeout(fn, 120);

  function commands(q) {
    const s = store.get('settings');
    const list = [
      { icon: '🏠', label: 'Go to Home', run: () => go('home'), kw: 'dashboard start' },
      { icon: '❤️', label: 'Go to Health', run: () => go('health'), kw: 'strava steps weight habits' },
      { icon: '🏋️', label: 'Go to My workout', run: () => go('workout'), kw: 'exercise routine training' },
      { icon: '📋', label: 'Go to Board', run: () => go('board'), kw: 'kanban notes cards' },
      { icon: '🗒️', label: 'New note', run: () => PD.board.newNote(), kw: 'write memo idea' },
      { icon: '📅', label: 'Go to Calendar', run: () => go('calendar'), kw: 'agenda events' },
      { icon: '🥗', label: 'Go to Diet', run: () => go('diet'), kw: 'food calories' },
      { icon: '⚙️', label: 'Open settings', run: () => PD.settings.open(), kw: 'preferences options' },
      { icon: '🧩', label: 'Customise home layout', run: () => { go('home'); after(PD.home.customize); }, kw: 'cards order hide' },
      { icon: '📊', label: 'Your week in review', run: () => PD.review.open(), kw: 'summary stats wrapped' },
      { icon: '🏆', label: 'Achievements & XP', run: () => PD.game.gallery(), kw: 'badges level game trophies' },
      { icon: '🎲', label: 'Random workout', run: () => PD.randomizer.open(), kw: 'shuffle generate surprise quick workout minutes' },
      { icon: '🗓️', label: 'Random programme', run: () => PD.randomizer.programme(), kw: 'shuffle generate plan weeks' },
      { icon: '🎁', label: 'Open the Locker (rewards)', run: () => PD.rewards.locker(), kw: 'themes unlock rewards skins confetti' },
      { icon: '🔊', label: 'Read my briefing aloud', run: () => PD.daily.speakBriefing(), kw: 'speak morning' },
      { icon: '💧', label: 'Log a glass of water', run: () => { const d = store.get('diet'); d.water[todayKey()] = (d.water[todayKey()] || 0) + 1; store.save('diet'); PD.toast(`💧 ${d.water[todayKey()]} glasses today`); PD.app.renderCurrent(); }, kw: 'drink hydrate' },
      { icon: '📷', label: 'Scan a barcode', run: () => { go('diet'); after(() => $('#scanBtn')?.click()); }, kw: 'food camera product' },
      PD.focus.running() && PD.focus.running().pausedLeft == null
        ? { icon: '⏸️', label: 'Pause focus timer', run: () => PD.focus.pause(), kw: 'pomodoro' }
        : { icon: '🍅', label: 'Start a focus session', run: () => { PD.focus.start('work'); go('home'); }, kw: 'pomodoro timer concentrate' },
      store.get('fasting').active
        ? { icon: '🍽️', label: 'End fast', run: () => { PD.fasting.end(); PD.app.renderCurrent(); }, kw: 'fasting eat' }
        : { icon: '⏳', label: `Start a ${store.get('fasting').goal}-hour fast`, run: () => { PD.fasting.start(); PD.app.renderCurrent(); }, kw: 'fasting intermittent' },
      { icon: s.theme === 'dark' ? '☀️' : '🌙', label: s.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', run: () => { s.theme = s.theme === 'dark' ? 'light' : 'dark'; store.save('settings'); PD.settings.applyTheme(); }, kw: 'theme night' },
    ];
    if (PD.google.connected()) list.push({ icon: '☁️', label: 'Sync now', run: () => PD.sync.now(), kw: 'google drive upload' });
    if (store.get('workouts').enrolled) list.push({ icon: '🚀', label: 'Start next programme session', run: () => PD.programs.startNext(), kw: 'program training plan' });
    store.get('workouts').routines.forEach((r) => list.push({ icon: r.emoji, label: `Start routine: ${r.name}`, run: () => PD.workout.start(r.id), kw: 'workout play' }));
    store.get('habits').list.forEach((h) => list.push({ icon: h.emoji, label: `${PD.habits.isDone(h, todayKey()) ? 'Uncheck' : 'Check off'} habit: ${h.name}`, run: () => { PD.habits.toggle(h.id); PD.app.renderCurrent(); }, kw: 'habit done' }));
    if (q) {
      PD.EXERCISES.forEach((e) => list.push({ icon: '🤸', label: `Exercise: ${e.name}`, run: () => { go('workout'); after(() => PD.workout.detail(e.id)); }, kw: `${e.cat} ${e.muscles}` }));
    }
    // commands that take what you typed
    const typed = [];
    if (q) {
      typed.push({ icon: '✅', label: `Add task: ${q}`, run: () => { store.get('tasks').push({ id: PD.uid(), text: q, done: false, date: todayKey() }); store.save('tasks'); PD.toast('Task added'); PD.app.renderCurrent(); }, arg: true });
      typed.push({ icon: '📋', label: `Add card to board: ${q}`, run: () => { const b = store.get('board'); const col = b.columns[0].id; b.cards.push({ id: PD.uid(), col, title: q, notes: '', due: '', label: '', order: -Date.now(), created: new Date().toISOString(), doneAt: null }); store.save('board'); PD.toast('Card added to the board'); PD.app.renderCurrent(); }, arg: true });
      typed.push({ icon: '🔎', label: `Search food: ${q}`, run: () => { go('diet'); after(() => { const i = $('#foodQuery'); if (i) { i.value = q; i.dispatchEvent(new Event('input')); i.focus(); } }); }, arg: true });
      typed.push({ icon: '📌', label: `New event: ${q}`, run: () => { go('calendar'); after(() => PD.calendar.add({ title: q })); }, arg: true });
      const n = parseFloat(q.replace(',', '.'));
      if (n > 25 && n < 300) typed.push({ icon: '⚖️', label: `Log weight: ${n} kg`, run: () => { const h = store.get('health'); h.weight[todayKey()] = n; store.save('health'); PD.toast(`Weight logged: ${n} kg`); PD.app.renderCurrent(); }, arg: true });
    }
    const words = norm(q).split(/\s+/).filter(Boolean);
    const scored = list.map((c) => {
      const hay = norm(`${c.label} ${c.kw || ''}`);
      if (words.length && !words.every((w) => hay.includes(w))) return null;
      return { c, score: words.length && norm(c.label).includes(words.join(' ')) ? 0 : 1 };
    }).filter(Boolean).sort((a, b) => a.score - b.score).map((x) => x.c);
    // when the query matches commands, show those first; typed actions follow
    return scored.length ? [...scored.slice(0, 9), ...typed] : typed;
  }

  function draw() {
    const q = $('.cmdk-input', el).value.trim();
    items = commands(q);
    sel = Math.min(sel, Math.max(items.length - 1, 0));
    $('.cmdk-list', el).innerHTML = items.length ? items.map((c, i) => `
      <li class="${i === sel ? 'sel' : ''}${c.arg ? ' arg' : ''}" data-i="${i}" role="option" aria-selected="${i === sel}">
        <span class="cmdk-icon">${esc(c.icon)}</span><span class="cmdk-label">${esc(c.label)}</span>${i === sel ? '<kbd>↵</kbd>' : ''}</li>`).join('')
      : '<li class="empty">Type to search pages, routines, exercises, habits… or to add a task.</li>';
    $$('.cmdk-list li[data-i]', el).forEach((li) => {
      li.onmousemove = () => { if (sel !== +li.dataset.i) { sel = +li.dataset.i; draw(); } };
      li.onclick = () => run(+li.dataset.i);
    });
    $('.cmdk-list li.sel', el)?.scrollIntoView({ block: 'nearest' });
  }

  function run(i) { const c = items[i]; if (!c) return; close(); PD.haptic?.(10); c.run(); }

  function open() {
    if (el) return;
    el = document.createElement('div');
    el.className = 'cmdk';
    el.innerHTML = `<div class="cmdk-box" role="dialog" aria-label="Quick actions">
      <div class="cmdk-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input class="cmdk-input" placeholder="Search or type a command…" autocomplete="off" spellcheck="false" aria-label="Command"><kbd>esc</kbd></div>
      <ul class="cmdk-list" role="listbox"></ul>
      <div class="cmdk-foot small muted"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> run</span><span>Tip: type “call mum” to add a task</span></div></div>`;
    document.body.appendChild(el);
    const input = $('.cmdk-input', el);
    input.oninput = () => { sel = 0; draw(); };
    input.onkeydown = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, items.length - 1); draw(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(); }
      if (e.key === 'Enter') { e.preventDefault(); run(sel); }
      if (e.key === 'Escape') close();
    };
    el.onclick = (e) => { if (e.target === el) close(); };
    sel = 0; draw(); input.focus();
  }
  function close() { el?.remove(); el = null; }

  document.addEventListener('keydown', (e) => {
    const typing = e.target.matches?.('input, textarea, select, [contenteditable]');
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (el) close(); else open(); return; }
    if (e.key === '/' && !typing && !el && !document.querySelector('#modal[open], #player, .story')) { e.preventDefault(); open(); }
  });
  document.getElementById('paletteBtn')?.addEventListener('click', open);

  PD.palette = { open, close, commands };
})(window.PD);
