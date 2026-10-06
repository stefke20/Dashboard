/* Mo the mole: the dashboard mascot in the bottom-right corner.
   Idle breathing, blinking, eyes that follow your pointer, a wave on hover, sleeping at night,
   cheering at celebrations, digging when you switch pages and now and then burrowing out of sight.
   Tap him for navigation & quick actions — and don't tap him five times in a row… */
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
  const CAPE = '<path class="m-cape" d="M30 72 Q12 100 16 114 L104 114 Q108 100 90 72 Z" fill="#e03131" stroke="#2b211d" stroke-width="2"/>';
  // outfits were drawn for a smaller head: nudge them onto the new one
  const SHIFT = { hat: 'translate(0 -14)', acc: 'translate(0 -9)' };
  const wear = (o) => (OUTFITS[o] ? `<g transform="${OUTFITS[o].includes('m-hat') ? SHIFT.hat : SHIFT.acc}">${OUTFITS[o]}</g>` : '');

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
      <defs><clipPath id="moClip"><rect x="-40" y="-60" width="200" height="167"/></clipPath></defs>
      <g clip-path="url(#moClip)">
        <g class="m-body">
          ${o === 'cape' ? CAPE : ''}
          <path class="m-fur" d="M18 116 C16 96 22 82 32 74 C26 62 26 46 34 36 C42 26 50 21 60 21 C70 21 80 26 87 36 C94 46 94 62 88 74 C98 82 104 96 102 116 Z"/>
          <path class="m-shade" d="M32 74 Q60 90 88 74 C96 82 102 96 102 116 L18 116 C16 96 22 82 32 74 Z"/>
          <ellipse class="m-gloss" cx="45" cy="34" rx="9" ry="5" transform="rotate(-30 45 34)"/>
          <g class="m-look"><g class="m-eyes"><circle cx="46.5" cy="49" r="6"/><circle cx="73.5" cy="48" r="6"/><circle class="m-shine" cx="48.4" cy="46.6" r="2.1"/><circle class="m-shine" cx="75.4" cy="45.6" r="2.1"/></g></g>
          <circle class="m-muzzle" cx="60" cy="61.5" r="12.5"/>
          <ellipse class="m-nose" cx="60" cy="57.5" rx="7.8" ry="6"/>
          <ellipse class="m-shine2" cx="58" cy="54.2" rx="3.2" ry="1.4"/>
          <ellipse class="m-nostril" cx="57" cy="58.8" rx="1.5" ry="1.1"/><ellipse class="m-nostril" cx="63" cy="58.8" rx="1.5" ry="1.1"/>
          <path class="m-mouth" d="M55 67 Q60 71.5 65 67"/>
          <path class="m-whisk" d="M49 60 L22 56 M49 63 L20 67 M50 66 L28 77 M71 60 L98 56 M71 63 L100 67 M70 66 L92 77"/>
          ${o && o !== 'cape' ? wear(o) : ''}
        </g>
      </g>
      <path class="m-mound" d="M8 113 Q4 106 12 104 Q12 96 22 98 Q24 92 32 96 Q38 98 40 104 Q46 98 54 101 Q60 97 66 101 Q72 98 78 104 Q82 96 90 96 Q98 93 100 100 Q110 100 110 107 Q117 110 112 116 Q60 121 12 117 Q5 117 8 113 Z"/>
      <g class="m-spots"><ellipse cx="28" cy="110" rx="4" ry="2.4"/><ellipse cx="60" cy="109" rx="5" ry="2.6"/><ellipse cx="88" cy="111" rx="3.6" ry="2.2"/><ellipse cx="44" cy="114" rx="2.4" ry="1.5"/><ellipse cx="74" cy="114" rx="2.6" ry="1.5"/></g>
      <g class="m-paws">
        <g class="m-paw m-paw-l"><path class="m-pawpad" d="M23 100 C22 90 30 86 37 87 C45 88 49 94 47 101 Z"/><path class="m-claw" d="M25 99 L27 110 L31 100 Z M32 100 L35 112 L38 100 Z M39 100 L43 110 L45 99 Z"/></g>
        <g class="m-paw m-paw-r"><path class="m-pawpad" d="M73 101 C71 94 75 88 83 87 C90 86 98 90 97 100 Z"/><path class="m-claw" d="M75 99 L77 110 L81 100 Z M82 100 L85 112 L88 100 Z M89 100 L93 110 L95 99 Z"/></g>
      </g>
      <g class="m-dirt"><ellipse cx="4" cy="108" rx="3.4" ry="2.6"/><ellipse cx="14" cy="119" rx="3" ry="2"/><ellipse cx="108" cy="119" rx="3.2" ry="2.2"/><ellipse cx="117" cy="112" rx="2.6" ry="2"/></g>
      <g class="m-puff"><circle cx="30" cy="100" r="3"/><circle cx="46" cy="98" r="2.4"/><circle cx="60" cy="97" r="3.2"/><circle cx="76" cy="98" r="2.4"/><circle cx="90" cy="100" r="3"/></g>
      <g class="m-zzz"><text x="88" y="28">z</text><text x="96" y="18">z</text><text x="104" y="8">Z</text></g>
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
  const busy = () => wrap.classList.contains('open') || wrap.classList.contains('sleep') || document.hidden || PD.fx.reduce();

  /** Now and then Mo burrows into his molehill and pops right back out. */
  function burrow() {
    if (!busy()) play('burrow', 2300);
    clearTimeout(burrow.t); burrow.t = setTimeout(burrow, 45e3 + Math.random() * 60e3);
  }

  /* ---------- easter egg: tap Mo 5× quickly and he throws mud at the screen ---------- */
  const GRUMBLE = ['Hey!', 'Hey! That tickles 😠', 'Stop it…', 'Last warning! 😤'];
  let taps = [];
  function onTap() {
    const now = Date.now();
    taps = taps.length && now - taps[taps.length - 1] < 650 ? taps.concat(now) : [now];
    if (taps.length >= 5) { taps = []; close(); mud(); return; }
    if (taps.length >= 2) {
      close(); play('grumpy', 450); say(GRUMBLE[Math.min(taps.length - 1, GRUMBLE.length - 1)], 1600); return;
    }
    toggle();
  }

  /** An irregular splat outline (blob with a few droplets around it). */
  function splat() {
    const n = 14; const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2; const r = 30 + Math.random() * 16 + (i % 3 === 0 ? 10 : 0);
      pts.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]);
    }
    const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    let d = `M${mid(pts[n - 1], pts[0]).join(' ')}`;
    pts.forEach((p, i) => { const m = mid(p, pts[(i + 1) % n]); d += ` Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`; });
    let drops = '';
    for (let i = 0; i < 5; i++) { const a = Math.random() * 7; const r = 52 + Math.random() * 18; drops += `<circle cx="${(50 + Math.cos(a) * r).toFixed(1)}" cy="${(50 + Math.sin(a) * r).toFixed(1)}" r="${(2 + Math.random() * 4).toFixed(1)}"/>`; }
    const drip = Math.random() > 0.4 ? `<path class="drip" d="M${44 + Math.random() * 12} 80 q3 ${18 + Math.random() * 16} 6 0 z"/>` : '';
    return `<svg viewBox="-20 -20 140 140"><path d="${d} Z"/>${drops}${drip}<ellipse class="hi" cx="40" cy="38" rx="10" ry="5" transform="rotate(-25 40 38)"/></svg>`;
  }

  function mud() {
    if ($('.mud-layer')) return;
    play('throw', 1500); PD.haptic?.([20, 40, 20]);
    say('Take that! 😝', 2600);
    const layer = document.createElement('div'); layer.className = 'mud-layer'; layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    const from = $('.mole-btn', wrap).getBoundingClientRect();
    const fx = from.left + from.width / 2; const fy = from.top + from.height * 0.3;
    const W = innerWidth; const H = innerHeight; const count = W < 700 ? 6 : 9;
    for (let i = 0; i < count; i++) {
      const tx = W * (0.08 + Math.random() * 0.84); const ty = H * (0.08 + Math.random() * 0.72);
      const size = (W < 700 ? 90 : 130) + Math.random() * 110;
      const delay = 120 + i * 110;
      const s = document.createElement('div'); s.className = 'mud-splat';
      s.style.cssText = `left:${tx - size / 2}px;top:${ty - size / 2}px;width:${size}px;height:${size}px;--rot:${Math.round(Math.random() * 360)}deg;--d:${delay + 330}ms`;
      s.innerHTML = splat(); layer.appendChild(s);
      if (PD.fx.reduce()) continue;
      const ball = document.createElement('i'); ball.className = 'mud-ball'; layer.appendChild(ball);
      const lift = Math.min(fy, ty) - 120 - Math.random() * 120;
      ball.animate([
        { transform: `translate(${fx}px, ${fy}px) scale(.5)` },
        { transform: `translate(${(fx + tx) / 2}px, ${lift}px) scale(1.1)`, offset: 0.5 },
        { transform: `translate(${tx}px, ${ty}px) scale(1.5)` },
      ], { duration: 330, delay, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'both' }).onfinish = () => { ball.remove(); PD.fx.beep(140 + Math.random() * 60, 0.08, 0.12); };
    }
    requestAnimationFrame(() => layer.classList.add('on'));
    setTimeout(() => layer.classList.add('wipe'), 4200);
    setTimeout(() => { layer.remove(); say('Hehe, sorry. Cleaned it up for you 🧽', 2400); }, 5600);
  }

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
    $('.mole-btn', wrap).onclick = onTap;
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
    burrow.t = setTimeout(burrow, 25e3 + Math.random() * 30e3);
  }

  PD.mole = { init, open, close, cheer, dig, say, dress, burrow, mud };
})(window.PD);
