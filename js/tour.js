/* First-visit guided tour: Ester the Child Mole climbs out of the molehill and walks you around the
   dashboard. Spotlight on each part, a speech bubble, Back / Next and a Skip button.
   Between stops Ester turns around (cute butt wiggle included) and walks to the next spot. */
(function (PD) {
  const { $, esc, store } = PD;

  /* ---------- full-body Ester: front and back ---------- */
  const OUT = '#2b211d';
  const FEET_FRONT = `<g class="t-foot t-foot-l"><ellipse cx="45" cy="141" rx="11" ry="6" fill="#f4b3a8" stroke="${OUT}" stroke-width="1.8"/><path d="M37 141 l-2 5 M42 143 l-1 5 M47 143 l0 5" stroke="${OUT}" stroke-width="1.3" stroke-linecap="round"/></g>
    <g class="t-foot t-foot-r"><ellipse cx="75" cy="141" rx="11" ry="6" fill="#f4b3a8" stroke="${OUT}" stroke-width="1.8"/><path d="M73 143 l0 5 M78 143 l1 5 M83 141 l2 5" stroke="${OUT}" stroke-width="1.3" stroke-linecap="round"/></g>`;
  const BODY = `M26 128 C18 104 24 84 33 74 C26 62 26 45 34 34 C42 24 50 19 60 19 C70 19 80 24 87 34 C94 45 94 62 87 74 C96 84 102 104 94 128 Q60 146 26 128 Z`;
  const paw = (cls, x, y, flip) => `<g class="t-arm ${cls}"><g transform="translate(${x} ${y}) scale(${flip ? -1 : 1} 1)"><path d="M-8 -6 C-12 2 -8 10 0 10 C8 10 10 2 6 -6 Z" fill="#f4b3a8" stroke="${OUT}" stroke-width="1.6"/><path d="M-6 8 L-7 15 L-3 9 Z M-1 9 L0 17 L2 9 Z M4 8 L7 14 L6 7 Z" fill="#f6e6d4" stroke="${OUT}" stroke-width="1"/></g></g>`;
  const FRONT = `<g class="t-front">
      ${FEET_FRONT}
      <path d="${BODY}" fill="#5a504f" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>
      <ellipse cx="60" cy="108" rx="23" ry="21" fill="#6b605f"/>
      <ellipse cx="45" cy="33" rx="9" ry="5" fill="#fff" opacity=".1" transform="rotate(-30 45 33)"/>
      <g class="t-eyes"><circle cx="46.5" cy="48" r="6"/><circle cx="73.5" cy="47" r="6"/><circle cx="48.4" cy="45.6" r="2.1" fill="#fff"/><circle cx="75.4" cy="44.6" r="2.1" fill="#fff"/></g>
      <circle cx="60" cy="60.5" r="12.5" fill="#e8b9a5"/>
      <ellipse cx="60" cy="56.5" rx="7.8" ry="6" fill="#f29b9c"/><ellipse cx="58" cy="53.2" rx="3.2" ry="1.4" fill="#fff" opacity=".55"/>
      <ellipse cx="57" cy="57.8" rx="1.5" ry="1.1" fill="#b65459"/><ellipse cx="63" cy="57.8" rx="1.5" ry="1.1" fill="#b65459"/>
      <path class="t-mouth" d="M54.5 66 Q60 71.5 65.5 66" fill="#7a2e2e" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      <ellipse cx="40" cy="64" rx="5" ry="3" fill="#ff8fa3" opacity=".35"/><ellipse cx="80" cy="64" rx="5" ry="3" fill="#ff8fa3" opacity=".35"/>
      <path d="M49 59 L22 55 M49 62 L20 66 M50 65 L28 76 M71 59 L98 55 M71 62 L100 66 M70 65 L92 76" stroke="#f0dccb" stroke-width="1.3" stroke-linecap="round"/>
      ${paw('t-arm-l', 26, 96, false)}${paw('t-arm-r', 94, 96, true)}
    </g>`;
  const BACK = `<g class="t-back">
      <g class="t-foot t-foot-l"><ellipse cx="45" cy="141" rx="11" ry="6" fill="#f4b3a8" stroke="${OUT}" stroke-width="1.8"/><circle cx="45" cy="142" r="2.6" fill="#e58f86"/><circle cx="39" cy="139" r="1.4" fill="#e58f86"/><circle cx="51" cy="139" r="1.4" fill="#e58f86"/></g>
      <g class="t-foot t-foot-r"><ellipse cx="75" cy="141" rx="11" ry="6" fill="#f4b3a8" stroke="${OUT}" stroke-width="1.8"/><circle cx="75" cy="142" r="2.6" fill="#e58f86"/><circle cx="69" cy="139" r="1.4" fill="#e58f86"/><circle cx="81" cy="139" r="1.4" fill="#e58f86"/></g>
      ${paw('t-arm-l', 22, 96, false)}${paw('t-arm-r', 98, 96, true)}
      <path d="M26 128 C18 104 24 84 33 74 C26 62 26 45 34 34 C42 24 50 19 60 19 C70 19 80 24 87 34 C94 45 94 62 87 74 C96 84 102 104 94 128 Q60 146 26 128 Z" fill="#5a504f" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>
      <ellipse cx="72" cy="34" rx="10" ry="5" fill="#fff" opacity=".1" transform="rotate(30 72 34)"/>
      <path d="M40 46 Q60 40 80 46" stroke="#4a4140" stroke-width="2" fill="none" opacity=".6"/>
      <g class="t-butt">
        <path d="M30 112 C30 98 46 94 58 102 Q60 104 62 102 C74 94 90 98 90 112 C90 130 74 136 60 128 C46 136 30 130 30 112 Z" fill="#665b5a" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M60 103 Q58 116 60 128" stroke="${OUT}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <ellipse cx="45" cy="116" rx="7" ry="5" fill="#ff8fa3" opacity=".4"/><ellipse cx="75" cy="116" rx="7" ry="5" fill="#ff8fa3" opacity=".4"/>
        <g class="t-tail"><path d="M60 100 C56 92 57 84 61 82 C65 84 65 93 62 100 Z" fill="#f4b3a8" stroke="${OUT}" stroke-width="1.6"/></g>
      </g>
    </g>`;
  const SVG = `<svg class="t-mole" viewBox="0 0 120 152" aria-hidden="true"><ellipse class="t-shadow" cx="60" cy="146" rx="34" ry="5"/>${FRONT}${BACK}</svg>`;

  /* ---------- the stops ---------- */
  const mobile = () => innerWidth < 760;
  const STEPS = [
    { title: 'Hi, I’m Ester! 🐾', text: 'The Child Mole of this dashboard. Let me show you around — it only takes a minute. You can skip any time.' },
    { page: 'home', el: '.tabs', title: 'Six tabs', text: () => `Home, Health, My workout, Board, Calendar and Diet. ${mobile() ? 'They live at the bottom of your screen — you can also swipe left and right.' : 'Click one, or press Ctrl/⌘ + K to jump anywhere.'}` },
    { page: 'home', el: '#page-home .hero', title: 'Your day at a glance', text: 'Date, week, your level, the moon and the year so far. 🔊 reads your morning briefing out loud and ▦ lets you rearrange the Home cards.' },
    { page: 'home', el: '#page-home .weather', title: 'Weather & news', text: 'Weather for Westerlo with a rain tip and a 7-day forecast. Further down: air quality & pollen and the latest headlines.' },
    { page: 'home', el: '#focusCard', title: 'Today’s focus', text: 'Your to-do list for today. Unfinished tasks move along to tomorrow, and the focus timer helps you get them done.' },
    { page: 'home', el: '#habitsCard', title: 'Habits & mood', text: 'Tick off your daily habits, keep your streaks alive and log how you feel.' },
    { page: 'health', el: '#page-health .card', title: 'Health', text: 'Steps, weight and sleep, your home workouts and Strava activities. Connect Strava or import Samsung Health in this tab.' },
    { page: 'workout', el: '#gameCard', title: 'XP, badges & the Locker', text: 'Everything you log earns XP. Badges unlock rewards — themes, effects, fonts… and outfits for me! Open the 🎁 Locker to use them.' },
    { page: 'workout', el: '#routines', title: 'Workouts', text: 'Press play on a routine for a guided workout, build your own, or tap 🎲 Random: pick a time and get a fresh workout.' },
    { page: 'board', el: '#kboard', title: 'Board & notes', text: () => `Drag cards between columns${mobile() ? ' (long-press to pick one up)' : ''}. Give a card a due date and it shows up in your calendar. Your notes live here too.` },
    { page: 'calendar', el: '#page-calendar .cal-layout', title: 'Calendar', text: 'Events, birthdays, holidays, planned workouts, board due dates and — if you connect it — your Google Calendar.' },
    { page: 'diet', el: '#page-diet .card', title: 'Diet', text: 'Log food (search, scan a barcode or quick-add), water and macros. Set your targets and watch the 7-day chart.' },
    { page: 'home', el: '#openSettings', title: 'Settings', text: 'Your name, colour scheme, dark mode, sync between devices, Strava, backups — and this tour again whenever you like.' },
    { page: 'home', el: '.mole-btn', title: 'That’s my molehill!', text: 'Tap me any time for search, quick actions and the occasional joke. Just… don’t tap me five times in a row. 😏', last: true },
  ];

  /* ---------- engine ---------- */
  let ui = null; let i = 0; let busy = false; let pos = null;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  /** Wait until (smooth) scrolling has stopped, so positions are measured in the right place. */
  async function settle(max = 1500) {
    let last = -1; let still = 0; const t0 = Date.now();
    while (Date.now() - t0 < max && still < 3) { await sleep(60); const y = scrollY; still = y === last ? still + 1 : 0; last = y; }
  }
  const reduce = () => PD.fx.reduce();

  function build() {
    ui = document.createElement('div');
    ui.className = 'tour'; ui.setAttribute('role', 'dialog'); ui.setAttribute('aria-label', 'Guided tour');
    ui.innerHTML = `<div class="tour-spot"></div>
      <button class="tour-skip" type="button">Skip tour ✕</button>
      <div class="tour-guide"><div class="tour-bubble" aria-live="polite"></div><div class="tour-ester">${SVG}</div></div>`;
    document.body.appendChild(ui); document.body.classList.add('touring');
    $('.tour-skip', ui).onclick = () => end(true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', relayout);
  }
  function onKey(e) {
    if (!ui) return;
    if (e.key === 'Escape') end(true);
    else if (e.key === 'ArrowRight' || e.key === 'Enter') go(i + 1);
    else if (e.key === 'ArrowLeft') go(i - 1);
  }

  /** First visible match (fixed elements such as the phone tab bar have no offsetParent, so check the box). */
  const target = (s) => (s.el ? [...document.querySelectorAll(s.el)].find((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; }) : null);

  /** Where the spotlight and Ester go for a step. */
  function layout(s) {
    const W = innerWidth; const H = innerHeight;
    const el = target(s); const g = $('.tour-guide', ui);
    const gw = Math.min(330, W - 24); const gh = g.offsetHeight || 260;
    let spot = null; let x; let y;
    if (el) {
      const r = el.getBoundingClientRect(); const pad = 8;
      // only the visible part of the target
      const top = Math.max(4, r.top - pad); const bottom = Math.min(H - 4, r.bottom + pad);
      spot = { left: Math.max(4, r.left - pad), top, width: Math.min(W - 8, r.width + pad * 2), height: Math.max(0, bottom - top) };
      x = Math.min(Math.max(12, r.left + r.width / 2 - gw / 2), W - gw - 12);
      const below = r.bottom + 12; const above = r.top - gh - 12;
      if (below + gh <= H) y = below; else if (above >= 0) y = above;
      else { y = H - gh - 12; x = r.left + r.width / 2 > W / 2 ? 12 : W - gw - 12; } // big target: stand beside it
    } else { x = (W - gw) / 2; y = Math.max(12, (H - gh) / 2); }
    y = Math.min(Math.max(12, y), Math.max(12, H - gh - 12)); // never off-screen
    return { spot, x, y, gw };
  }

  function placeSpot(spot, root = ui) {
    const sp = $('.tour-spot', root);
    if (!spot) Object.assign(sp.style, { left: '50%', top: '50%', width: '0px', height: '0px' });
    else Object.assign(sp.style, { left: `${spot.left}px`, top: `${spot.top}px`, width: `${spot.width}px`, height: `${spot.height}px` });
  }

  function bubble(s) {
    const b = $('.tour-bubble', ui);
    const text = typeof s.text === 'function' ? s.text() : s.text;
    b.innerHTML = `<b>${esc(s.title)}</b><p>${esc(text)}</p>
      <div class="tour-dots">${STEPS.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'seen' : ''}"></i>`).join('')}</div>
      <div class="tour-btns">${i ? '<button type="button" class="btn sm ghost" data-t="back">Back</button>' : '<button type="button" class="btn sm ghost" data-t="skip">Skip</button>'}
        <span class="muted small">${i + 1}/${STEPS.length}</span>
        <button type="button" class="btn sm" data-t="next">${s.last ? 'Let’s go! 🎉' : i ? 'Next →' : 'Show me around'}</button></div>`;
    b.querySelector('[data-t=next]').onclick = () => go(i + 1);
    const back = b.querySelector('[data-t=back]'); if (back) back.onclick = () => go(i - 1);
    const sk = b.querySelector('[data-t=skip]'); if (sk) sk.onclick = () => end(true);
    setTimeout(() => b.querySelector('[data-t=next]')?.focus({ preventScroll: true }), 50);
  }

  async function show(s, first) {
    if (s.page && PD.app.current() !== s.page) { location.hash = `#${s.page}`; await sleep(450); }
    const el = target(s);
    if (el && s.el !== '.tabs' && s.el !== '#openSettings' && s.el !== '.mole-btn') {
      el.scrollIntoView({ block: el.offsetHeight > innerHeight * 0.6 ? 'start' : 'center', behavior: reduce() ? 'auto' : 'smooth' });
      await settle();
    }
    const g = $('.tour-guide', ui); const est = $('.tour-ester', ui); const b = $('.tour-bubble', ui);
    bubble(s); // render first so the guide's height is known
    const L = layout(s);
    g.style.width = `${L.gw}px`;
    placeSpot(L.spot);
    if (first || !pos || reduce()) {
      Object.assign(g.style, { transform: `translate(${L.x}px, ${L.y}px)` });
      if (first && !reduce()) { est.classList.add('climb'); await sleep(900); est.classList.remove('climb'); }
    } else {
      // turn around (hello, butt), wiggle, walk over, turn back
      b.classList.add('hide');
      const dist = Math.hypot(L.x - pos.x, L.y - pos.y);
      est.classList.add('back'); await sleep(200);
      est.classList.add('wiggle'); await sleep(460); est.classList.remove('wiggle');
      est.classList.add('walking'); est.classList.toggle('left', L.x < pos.x);
      const dur = Math.min(950, 380 + dist * 0.8);
      g.style.transition = `transform ${dur}ms cubic-bezier(.45,.05,.4,1)`;
      g.style.transform = `translate(${L.x}px, ${L.y}px)`;
      await sleep(dur);
      est.classList.remove('walking', 'left', 'back'); est.classList.add('hop');
      setTimeout(() => est.classList.remove('hop'), 500);
      g.style.transition = '';
      b.classList.remove('hide');
    }
    pos = { x: L.x, y: L.y };
    est.classList.toggle('point-up', !!L.spot && L.spot.top + L.spot.height <= L.y);
  }

  async function go(n) {
    if (busy || !ui) return;
    if (n >= STEPS.length) { end(false); return; }
    if (n < 0) return;
    busy = true; i = n;
    try { await show(STEPS[i], false); } finally { busy = false; }
  }

  const relayout = PD.debounce(() => { if (!ui || busy) return; const L = layout(STEPS[i]); placeSpot(L.spot); $('.tour-guide', ui).style.transform = `translate(${L.x}px, ${L.y}px)`; pos = { x: L.x, y: L.y }; }, 150);

  async function end(skipped) {
    if (!ui) return;
    const s = store.get('settings'); s.tourSeen = true; store.save('settings');
    document.removeEventListener('keydown', onKey); window.removeEventListener('resize', relayout);
    const el = ui; ui = null;
    if (!skipped && !reduce()) {
      // walk off to the molehill, butt first, and dive in
      const est = $('.tour-ester', el); const g = $('.tour-guide', el); const hole = $('.mole-btn')?.getBoundingClientRect();
      $('.tour-bubble', el).classList.add('hide'); placeSpot(null, el); el.classList.add('fading');
      est.classList.add('back', 'walking');
      if (hole) {
        const er = est.getBoundingClientRect(); const gr = g.getBoundingClientRect();
        const tx = hole.left + hole.width / 2 - (er.left - gr.left + er.width / 2); const ty = hole.top + hole.height * 0.75 - (er.top - gr.top + er.height);
        g.style.transition = 'transform 900ms cubic-bezier(.45,.05,.4,1)'; g.style.transform = `translate(${tx}px, ${ty}px)`;
      }
      await sleep(900);
      est.classList.remove('walking'); est.classList.add('dive'); await sleep(600);
      PD.fx.confetti({ count: 120, origin: { x: 0.85, y: 0.85 } });
    }
    el.remove(); document.body.classList.remove('touring');
    PD.mole?.dig?.();
    setTimeout(() => PD.mole?.say(skipped ? 'No problem! Tap me if you ever need me. 🐾' : 'Have fun! Tap me any time. ⛏️', 4500), 400);
  }

  async function start() {
    if (ui) return;
    PD.mole?.close?.();
    $('#modal')?.open && $('#modal').close();
    i = 0; pos = null; build();
    busy = true;
    try { await show(STEPS[0], true); } finally { busy = false; }
  }

  /** Show the tour once, on the first visit. */
  function maybeStart() {
    if (store.get('settings').tourSeen || document.querySelector('#player, .story')) return;
    setTimeout(start, 900);
  }

  PD.tour = { start, maybeStart, end: () => end(true), STEPS };
})(window.PD);
