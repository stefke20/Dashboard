/* Mo the mole: the dashboard mascot in the bottom-right corner.
   Idle breathing, blinking, eyes that follow your pointer, a wave on hover, sleeping at night,
   cheering at celebrations and digging when you switch pages. Tap him for navigation & quick actions. */
(function (PD) {
  const { esc, $, $$, store, todayKey } = PD;

  /* ---------- artwork ---------- */
  const OUTFITS = {
    party: '<g class="m-hat"><path d="M60 12 L73 42 L47 42 Z" fill="#ff5c8a"/><path d="M53.5 27 L66.5 27 M50.5 35 L69.5 35" stroke="#fff" stroke-width="3" opacity=".8"/><circle cx="60" cy="11" r="4.5" fill="#ffd43b"/></g>',
    crown: '<g class="m-hat"><path d="M43 43 L45 27 L53 35 L60 22 L67 35 L75 27 L77 43 Z" fill="#ffd43b" stroke="#e0a800" stroke-width="1.5" stroke-linejoin="round"/><circle cx="60" cy="37" r="2.6" fill="#e03131"/><circle cx="50" cy="39" r="2" fill="#1c7ed6"/><circle cx="70" cy="39" r="2" fill="#2f9e44"/></g>',
    wizard: '<g class="m-hat"><path d="M61 2 L79 43 H41 Z" fill="#5f3dc4"/><ellipse cx="60" cy="43" rx="25" ry="5" fill="#4c2fa3"/><text x="55" y="30" font-size="8" fill="#ffd43b">✦</text><text x="64" y="19" font-size="6" fill="#ffd43b">★</text></g>',
    santa: '<g class="m-hat"><path d="M44 42 Q48 14 72 18 Q80 22 82 34 L76 42 Z" fill="#e03131"/><rect x="40" y="38" width="42" height="8" rx="4" fill="#fff"/><circle cx="83" cy="35" r="5" fill="#fff"/></g>',
    witch: '<g class="m-hat"><path d="M58 4 L76 42 H44 Z" fill="#212529"/><ellipse cx="60" cy="42" rx="26" ry="5" fill="#343a40"/><rect x="48" y="35" width="24" height="4" fill="#fd7e14"/></g>',
    headband: '<g class="m-acc"><rect x="31" y="46" width="58" height="8" rx="4" fill="#fa5252"/><rect x="31" y="49" width="58" height="2" fill="#fff" opacity=".85"/></g>',
    sunglasses: '<g class="m-acc"><rect x="41" y="54" width="16" height="10" rx="4" fill="#212529"/><rect x="63" y="54" width="16" height="10" rx="4" fill="#212529"/><path d="M57 58 H63" stroke="#212529" stroke-width="2.5"/><path d="M44 56 l5 0" stroke="#fff" stroke-width="1.5" opacity=".7"/><path d="M66 56 l5 0" stroke="#fff" stroke-width="1.5" opacity=".7"/></g>',
    headphones: '<g class="m-acc"><path d="M30 66 Q28 30 60 30 Q92 30 90 66" fill="none" stroke="#343a40" stroke-width="5" stroke-linecap="round"/><rect x="23" y="56" width="11" height="17" rx="5" fill="#845ef7"/><rect x="86" y="56" width="11" height="17" rx="5" fill="#845ef7"/></g>',
  };
  const CAPE = '<path class="m-cape" d="M33 60 Q18 98 22 113 L98 113 Q102 98 87 60 Z" fill="#e03131"/>';

  function outfit() {
    const eq = PD.rewards?.equipped('outfit') || '';
    if (eq) return eq;
    const sp = PD.seasons?.special();
    if (sp?.emoji === '🎄') return 'santa';
    if (sp?.emoji === '🎃') return 'witch';
    if (sp?.emoji === '🎂') return 'party';
    return '';
  }

  function svg() {
    const o = outfit();
    return `<svg class="mole-svg" viewBox="0 0 120 120" aria-hidden="true">
      ${o === 'cape' ? CAPE : ''}
      <g class="m-body">
        <ellipse class="m-fur" cx="60" cy="76" rx="33" ry="37"/>
        <ellipse class="m-belly" cx="60" cy="88" rx="20" ry="21"/>
        <g class="m-look"><g class="m-eyes"><circle cx="49" cy="60" r="3.4"/><circle cx="71" cy="60" r="3.4"/><circle class="m-shine" cx="50.2" cy="58.8" r="1.1"/><circle class="m-shine" cx="72.2" cy="58.8" r="1.1"/></g></g>
        <ellipse class="m-cheek" cx="42" cy="70" rx="5.5" ry="3.2"/><ellipse class="m-cheek" cx="78" cy="70" rx="5.5" ry="3.2"/>
        <ellipse class="m-snout" cx="60" cy="71" rx="10" ry="7.5"/>
        <ellipse class="m-nose" cx="60" cy="67.5" rx="5" ry="3.4"/>
        <path class="m-mouth" d="M55.5 75 Q60 78.5 64.5 75"/>
        <path class="m-whisk" d="M49 70 L36 67 M49 73 L37 75 M71 70 L84 67 M71 73 L83 75"/>
        <g class="m-paw m-paw-l"><ellipse cx="35" cy="96" rx="9" ry="6.5"/><path d="M28 99 v4 M32 100 v4 M36 100 v4" class="m-claw"/></g>
        <g class="m-paw m-paw-r"><ellipse cx="85" cy="96" rx="9" ry="6.5"/><path d="M84 100 v4 M88 100 v4 M92 99 v4" class="m-claw"/></g>
        ${o && o !== 'cape' ? OUTFITS[o] || '' : ''}
      </g>
      <path class="m-mound" d="M4 118 Q14 92 60 94 Q106 92 116 118 Z"/>
      <g class="m-dirt"><circle cx="30" cy="108" r="2.2"/><circle cx="52" cy="104" r="1.6"/><circle cx="76" cy="109" r="2"/><circle cx="92" cy="104" r="1.5"/></g>
      <g class="m-zzz"><text x="84" y="40">z</text><text x="92" y="30">z</text><text x="100" y="20">Z</text></g>
    </svg>`;
  }

  /* ---------- menu ---------- */
  const PAGES = [['home', '🏠', 'Home'], ['health', '❤️', 'Health'], ['workout', '🏋️', 'Workout'], ['board', '📋', 'Board'], ['calendar', '📅', 'Calendar'], ['diet', '🥗', 'Diet']];
  let mode = null; // 'task' | 'note-search' | null

  function status() {
    const t = todayKey(); const bits = [];
    const tasks = store.get('tasks').filter((x) => !x.done).length;
    if (tasks) bits.push(`${tasks} task${tasks === 1 ? '' : 's'}`);
    const d = store.get('diet'); bits.push(`${d.water[t] || 0}/${d.targets.water} 💧`);
    const w = PD.calendar.between(t, t).find((e) => e.type === 'workout' && (e.startable || (e.routineId && !e.readonly)));
    if (w) bits.push('workout planned');
    const hDone = store.get('habits').list.filter((h) => PD.habits.isDone(h, t)).length;
    bits.push(`${hDone}/${store.get('habits').list.length} habits`);
    return bits.join(' · ');
  }

  function quick() {
    const routine = store.get('workouts').enrolled ? { label: 'Next session', run: () => PD.programs.startNext() } : { label: 'Workout', run: () => { location.hash = '#workout'; } };
    return [
      ['💧', '+1 water', () => { const d = store.get('diet'); d.water[todayKey()] = (d.water[todayKey()] || 0) + 1; store.save('diet'); PD.toast(`💧 ${d.water[todayKey()]} glasses today`); PD.app.renderCurrent(); cheer(); }],
      ['✅', 'Add task', () => { mode = 'task'; drawMenu(); }],
      ['🍅', 'Focus', () => { PD.focus.start('work'); location.hash = '#home'; }],
      ['▶️', routine.label, routine.run],
      ['🗒️', 'New note', () => PD.board.newNote()],
      ['📷', 'Scan food', () => { location.hash = '#diet'; setTimeout(() => $('#scanBtn')?.click(), 200); }],
      ['🔊', 'Briefing', () => PD.daily.speakBriefing()],
      ['📊', 'My week', () => PD.review.open()],
      ['🎁', 'Locker', () => PD.rewards.locker()],
    ];
  }

  function drawMenu(q = '') {
    const m = $('#moleMenu');
    const name = store.get('settings').name;
    if (mode === 'task') {
      m.innerHTML = `<div class="mo-head"><b>What do you need to do? ✍️</b><button class="mo-x" data-mo-back aria-label="Back">←</button></div>
        <form class="mo-search" id="moTask"><input placeholder="e.g. Call the garage" maxlength="140" aria-label="New task"><button class="btn sm">Add</button></form>
        <p class="muted small">Added to today's tasks on Home.</p>`;
      const f = $('#moTask', m); const inp = $('input', f); inp.focus();
      f.onsubmit = (e) => { e.preventDefault(); const v = inp.value.trim(); if (!v) return; store.get('tasks').push({ id: PD.uid(), text: v, done: false, date: todayKey() }); store.save('tasks'); PD.toast('Task added ✓'); mode = null; close(); cheer(); PD.app.renderCurrent(); };
      $('[data-mo-back]', m).onclick = () => { mode = null; drawMenu(); };
      return;
    }
    const results = q ? PD.palette.commands(q).slice(0, 7) : [];
    m.innerHTML = `
      <div class="mo-head"><b>Hi${name ? ` ${esc(name)}` : ''}! I'm Mo 🐾</b><button class="mo-x" data-mo-close aria-label="Close">✕</button></div>
      <p class="mo-status small">${esc(status())}</p>
      <form class="mo-search" id="moSearch"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input placeholder="Where to? Or type a task, food, routine…" value="${esc(q)}" aria-label="Search or command" autocomplete="off"></form>
      ${q ? `<ul class="mo-results">${results.map((c, i) => `<li><button data-res="${i}" class="${i === 0 ? 'first' : ''}"><span>${esc(c.icon)}</span>${esc(c.label)}</button></li>`).join('') || '<li class="muted small">Nothing found.</li>'}</ul>` : `
        <div class="mo-nav">${PAGES.map(([id, ic, l]) => `<button data-go="${id}" class="${PD.app.current() === id ? 'on' : ''}"><span>${ic}</span>${l}</button>`).join('')}</div>
        <div class="mo-quick">${quick().map(([ic, l], i) => `<button data-q="${i}"><span>${ic}</span>${esc(l)}</button>`).join('')}</div>
        <p class="mo-tip small muted">${esc(tip())}</p>`}`;
    const input = $('#moSearch input', m);
    input.oninput = () => { const pos = input.selectionStart; drawMenu(input.value); const n = $('#moSearch input'); n.focus(); n.setSelectionRange(pos, pos); };
    $('#moSearch', m).onsubmit = (e) => { e.preventDefault(); if (results[0]) { close(); results[0].run(); } };
    $$('[data-res]', m).forEach((b) => (b.onclick = () => { close(); results[+b.dataset.res].run(); }));
    $$('[data-go]', m).forEach((b) => (b.onclick = () => { close(); location.hash = `#${b.dataset.go}`; }));
    const qs = quick();
    $$('[data-q]', m).forEach((b) => (b.onclick = () => { const a = qs[+b.dataset.q]; if (a[1] !== 'Add task') close(); a[2](); }));
    $('[data-mo-close]', m).onclick = close;
  }

  const TIPS = [
    'Tip: press Ctrl/⌘ + K anywhere for quick actions.',
    'Tip: swipe left or right on your phone to switch tabs.',
    'Tip: every badge unlocks a reward in the 🎁 Locker — even outfits for me!',
    'Tip: “- [ ] item” in a note or card makes a checklist.',
    'Tip: pull down on Home to refresh weather and news.',
    'Tip: give board cards a due date and they show up in your calendar.',
    'Tip: tap 🔊 on the Home header to hear your morning briefing.',
    'Tip: the ▦ button on the Home header lets you rearrange your cards.',
  ];
  const tip = () => TIPS[(new Date().getDate() + new Date().getHours()) % TIPS.length];

  /* ---------- behaviour ---------- */
  let wrap; let wokeUntil = 0;
  function open() {
    wrap.classList.add('open'); $('#moleMenu').hidden = false; mode = null; drawMenu();
    hideSpeech(); PD.haptic?.(12); wokeUntil = Date.now() + 120e3; mood();
    setTimeout(() => $('#moSearch input')?.focus({ preventScroll: true }), 60);
  }
  function close() { if (!wrap) return; wrap.classList.remove('open'); $('#moleMenu').hidden = true; mode = null; }
  const toggle = () => (wrap.classList.contains('open') ? close() : open());

  function play(cls, ms) { const b = $('.mole-btn'); if (!b || PD.fx.reduce()) return; b.classList.remove(cls); void b.offsetWidth; b.classList.add(cls); setTimeout(() => b.classList.remove(cls), ms); }
  const cheer = () => play('cheer', 1300);
  const dig = () => play('dig', 700);

  function mood() {
    const h = new Date().getHours();
    wrap?.classList.toggle('sleep', (h >= 23 || h < 6) && Date.now() > wokeUntil);
  }

  function say(text, ms = 6000) {
    const s = $('#moleSay'); if (!s || wrap.classList.contains('open')) return;
    s.textContent = text; s.hidden = false; requestAnimationFrame(() => s.classList.add('show'));
    clearTimeout(say.t); say.t = setTimeout(hideSpeech, ms);
  }
  function hideSpeech() { const s = $('#moleSay'); if (!s) return; s.classList.remove('show'); setTimeout(() => (s.hidden = true), 250); }

  /** Once a day Mo says hello with the first line of your briefing. */
  function greet() {
    const k = `pd.mole.greet.${todayKey()}`;
    try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); } catch { return; }
    setTimeout(() => {
      const h = new Date().getHours(); const name = store.get('settings').name;
      const hi = h < 12 ? 'Good morning' : h < 18 ? 'Hi' : 'Good evening';
      const line = PD.daily.briefing()[0] || 'Tap me if you need anything!';
      say(`${hi}${name ? ` ${name}` : ''}! ${line}`, 7000);
    }, 2200);
  }

  function dress() { const b = $('.mole-btn'); if (b) b.innerHTML = svg(); }

  function init() {
    wrap = document.createElement('div');
    wrap.className = 'mole-wrap';
    wrap.innerHTML = `<div class="mole-say" id="moleSay" hidden></div>
      <div class="mole-menu" id="moleMenu" hidden role="dialog" aria-label="Mo the mole — navigation and quick actions"></div>
      <button class="mole-btn peek" aria-label="Mo the mole: navigation and quick actions" title="Hi, I'm Mo! Tap me">${svg()}</button>`;
    document.body.appendChild(wrap);
    $('.mole-btn', wrap).onclick = toggle;
    $('#moleSay', wrap).onclick = () => { hideSpeech(); open(); };
    setTimeout(() => $('.mole-btn', wrap)?.classList.remove('peek'), 1400);
    document.addEventListener('pointerdown', (e) => { if (wrap.classList.contains('open') && !wrap.contains(e.target)) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && wrap.classList.contains('open')) close(); });
    window.addEventListener('hashchange', () => { close(); dig(); });
    // eyes follow the pointer (computers)
    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || PD.fx.reduce()) return;
      const eyes = $('.m-look', wrap); if (!eyes) return;
      const r = wrap.querySelector('.mole-btn').getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2); const dy = e.clientY - (r.top + r.height * 0.45);
      const d = Math.max(Math.hypot(dx, dy), 1);
      eyes.style.transform = `translate(${(dx / d) * 1.8}px, ${(dy / d) * 1.4}px)`;
    }, { passive: true });
    mood(); setInterval(mood, 60e3);
    greet();
  }

  PD.mole = { init, open, close, cheer, dig, say, dress };
})(window.PD);
