/* Ester the Child Mole: the dashboard mascot in the bottom-right corner.
   Idle breathing, blinking, eyes that follow your pointer, a wave on hover, sleeping at night,
   cheering at celebrations, digging when you switch pages and now and then burrowing out of sight.
   Tap for navigation & quick actions — and don't tap five times in a row… */
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
    // ---- costumes drawn for the new head (no shift needed) ----
    beanie: '<g class="m-wear m-hat"><path d="M34 34 Q34 10 60 10 Q86 10 86 34 Z" fill="#e8590c"/><path d="M45 14 V30 M52 11 V30 M60 10 V30 M68 11 V30 M75 14 V30" stroke="#c2410c" stroke-width="1.4" opacity=".6"/><rect x="31" y="29" width="58" height="9" rx="4.5" fill="#d9480f"/><circle cx="60" cy="8" r="6.5" fill="#fff4e6"/></g>',
    tophat: '<g class="m-wear m-hat"><rect x="46" y="3" width="28" height="25" rx="2" fill="#212529"/><rect x="46" y="20" width="28" height="5" fill="#c92a2a"/><ellipse cx="60" cy="29" rx="26" ry="5" fill="#212529"/><path d="M50 6 V18" stroke="#fff" stroke-width="2" opacity=".18"/></g>',
    viking: '<g class="m-wear m-hat"><path d="M36 26 Q20 22 17 4 Q28 17 42 20 Z" fill="#f1e3c6" stroke="#495057" stroke-width="1.3"/><path d="M84 26 Q100 22 103 4 Q92 17 78 20 Z" fill="#f1e3c6" stroke="#495057" stroke-width="1.3"/><path d="M34 34 Q36 11 60 10 Q84 11 86 34 Z" fill="#adb5bd" stroke="#495057" stroke-width="1.5"/><path d="M60 10 V31" stroke="#495057" stroke-width="2.2"/><rect x="32" y="30" width="56" height="7" rx="3.5" fill="#868e96" stroke="#495057" stroke-width="1.2"/><circle cx="40" cy="33.5" r="1.4" fill="#495057"/><circle cx="80" cy="33.5" r="1.4" fill="#495057"/></g>',
    astronaut: '<g class="m-wear m-acc"><circle cx="60" cy="52" r="40" fill="rgba(186,230,253,.2)" stroke="#e9ecef" stroke-width="3.2"/><path d="M34 30 Q42 18 56 15" stroke="#fff" stroke-width="3.2" stroke-linecap="round" fill="none" opacity=".75"/><circle cx="84" cy="30" r="2" fill="#fff" opacity=".7"/><rect x="83" y="74" width="10" height="6" rx="2" fill="#ff6b6b" stroke="#495057"/></g>',
    hardhat: '<g class="m-wear m-hat"><path d="M34 33 Q34 11 60 11 Q86 11 86 33 Z" fill="#fcc419" stroke="#e67700" stroke-width="1.5"/><rect x="55" y="11" width="10" height="21" rx="2" fill="#fab005"/><rect x="27" y="29" width="66" height="7" rx="3.5" fill="#fab005" stroke="#e67700" stroke-width="1.3"/><circle cx="60" cy="22" r="4.5" fill="#fff9db" stroke="#e67700" stroke-width="1.3"/><path class="m-lamp" d="M60 22 L40 -6 L80 -6 Z" fill="#fff9db" opacity=".25"/></g>',
    devil: '<g class="m-wear m-hat"><path d="M40 28 Q32 18 36 5 Q42 18 50 23 Z" fill="#e03131" stroke="#2b211d" stroke-width="1.3"/><path d="M80 28 Q88 18 84 5 Q78 18 70 23 Z" fill="#e03131" stroke="#2b211d" stroke-width="1.3"/></g>',
    gradcap: '<g class="m-wear m-hat"><path d="M44 22 V31 Q60 38 76 31 V22 Z" fill="#343a40"/><path d="M60 7 L94 17 L60 27 L26 17 Z" fill="#212529" stroke="#495057" stroke-width="1"/><circle cx="60" cy="17" r="2" fill="#fcc419"/><path d="M60 17 L88 21 V33" stroke="#fcc419" stroke-width="1.7" fill="none"/><path d="M85.5 33 h5 l-1 7 h-3 Z" fill="#fcc419"/></g>',
    cowboy: '<g class="m-wear m-hat"><path d="M41 31 Q40 9 52 10 Q60 16 68 10 Q80 9 79 31 Z" fill="#a0692f"/><rect x="41" y="24" width="38" height="5" fill="#5c3a1a"/><path d="M20 27 Q30 36 60 36 Q90 36 100 27 Q96 37 60 41 Q24 37 20 27 Z" fill="#8b5a2b" stroke="#5c3a1a" stroke-width="1.2"/></g>',
    daisy: '<g class="m-wear m-acc"><g transform="translate(82 30)"><g fill="#fff" stroke="#dee2e6" stroke-width=".8"><ellipse cx="0" cy="-7" rx="3.2" ry="6"/><ellipse cx="0" cy="7" rx="3.2" ry="6"/><ellipse cx="-7" cy="0" rx="6" ry="3.2"/><ellipse cx="7" cy="0" rx="6" ry="3.2"/><ellipse cx="-5" cy="-5" rx="3" ry="5.5" transform="rotate(-45 -5 -5)"/><ellipse cx="5" cy="5" rx="3" ry="5.5" transform="rotate(-45 5 5)"/><ellipse cx="5" cy="-5" rx="3" ry="5.5" transform="rotate(45 5 -5)"/><ellipse cx="-5" cy="5" rx="3" ry="5.5" transform="rotate(45 -5 5)"/></g><circle r="4" fill="#fcc419" stroke="#f08c00"/></g></g>',
    flowers: '<g class="m-wear m-hat"><path d="M34 36 Q60 14 86 36" stroke="#2f9e44" stroke-width="2.5" fill="none"/>' + [[36, 34, '#ff8787'], [45, 26, '#ffd43b'], [55, 22, '#b197fc'], [65, 22, '#ff8787'], [75, 26, '#74c0fc'], [84, 34, '#ffd43b']].map(([x, y, c]) => `<g transform="translate(${x} ${y})"><circle cx="0" cy="-3.2" r="2.6" fill="${c}"/><circle cx="3" cy="-1" r="2.6" fill="${c}"/><circle cx="1.9" cy="2.6" r="2.6" fill="${c}"/><circle cx="-1.9" cy="2.6" r="2.6" fill="${c}"/><circle cx="-3" cy="-1" r="2.6" fill="${c}"/><circle r="1.6" fill="#fff3bf"/></g>`).join('') + '</g>',
    bowtie: '<g class="m-wear m-acc"><path d="M60 81 L46 74 Q44 81 46 88 Z M60 81 L74 74 Q76 81 74 88 Z" fill="#e03131" stroke="#2b211d" stroke-width="1.3" stroke-linejoin="round"/><rect x="56.5" y="77.5" width="7" height="7" rx="2" fill="#c92a2a" stroke="#2b211d" stroke-width="1.2"/></g>',
    chef: '<g class="m-wear m-hat"><circle cx="47" cy="15" r="9" fill="#fff" stroke="#ced4da" stroke-width="1.5"/><circle cx="73" cy="15" r="9" fill="#fff" stroke="#ced4da" stroke-width="1.5"/><circle cx="60" cy="10" r="11" fill="#fff" stroke="#ced4da" stroke-width="1.5"/><rect x="43" y="14" width="34" height="12" fill="#fff"/><rect x="42" y="23" width="36" height="10" rx="3" fill="#fff" stroke="#ced4da" stroke-width="1.5"/></g>',
    detective: '<g class="m-wear m-hat"><path d="M33 33 Q35 11 60 11 Q85 11 87 33 Z" fill="#a47148" stroke="#6f4518" stroke-width="1.3"/><path d="M40 16 L80 30 M80 16 L40 30 M60 11 V33" stroke="#6f4518" stroke-width="1" opacity=".55"/><path d="M33 31 Q24 34 22 40 Q34 38 42 33 Z M87 31 Q96 34 98 40 Q86 38 78 33 Z" fill="#8b5a2b"/><path d="M58 11 Q60 4 64 6" stroke="#6f4518" stroke-width="2" fill="none"/></g>',
    gentleman: '<g class="m-wear m-acc"><circle cx="73.5" cy="48" r="8.2" fill="rgba(255,255,255,.16)" stroke="#fcc419" stroke-width="1.8"/><path d="M81.5 50 Q88 62 83 76" stroke="#fcc419" stroke-width="1" fill="none"/><path d="M60 64.5 Q53 60 45 64 Q42 66.5 43 69 Q47 65.5 53 67.5 Q57 68.5 60 66.5 Q63 68.5 67 67.5 Q73 65.5 77 69 Q78 66.5 75 64 Q67 60 60 64.5 Z" fill="#3b2a20"/></g>',
    cat: '<g class="m-wear m-hat"><path d="M35 34 L36 10 L52 24 Z" fill="#5a504f" stroke="#2b211d" stroke-width="2" stroke-linejoin="round"/><path d="M39 28 L39.5 16 L48 24 Z" fill="#f4b3a8"/><path d="M85 34 L84 10 L68 24 Z" fill="#5a504f" stroke="#2b211d" stroke-width="2" stroke-linejoin="round"/><path d="M81 28 L80.5 16 L72 24 Z" fill="#f4b3a8"/></g>',
    bunny: '<g class="m-wear m-hat"><g transform="rotate(-14 47 24)"><ellipse cx="47" cy="8" rx="6.5" ry="16" fill="#f8f9fa" stroke="#2b211d" stroke-width="1.6"/><ellipse cx="47" cy="9" rx="3.2" ry="11" fill="#ffc9c9"/></g><g transform="rotate(14 73 24)"><ellipse cx="73" cy="8" rx="6.5" ry="16" fill="#f8f9fa" stroke="#2b211d" stroke-width="1.6"/><ellipse cx="73" cy="9" rx="3.2" ry="11" fill="#ffc9c9"/></g><path d="M36 31 Q60 15 84 31" stroke="#ff8787" stroke-width="3.5" fill="none" stroke-linecap="round"/></g>',
    ninja: '<g class="m-wear m-acc"><path d="M33 36 L22 30 M33 38 L19 42" stroke="#e03131" stroke-width="3.2" stroke-linecap="round"/><path d="M32 33 Q60 27 88 33 L88 40 Q60 34 32 40 Z" fill="#e03131" stroke="#2b211d" stroke-width="1.2"/><rect x="55" y="30.5" width="10" height="6" rx="1.5" fill="#ced4da" stroke="#495057" stroke-width=".8"/></g>',
    pirate: '<g class="m-wear m-hat"><path d="M33 41 L52 43" stroke="#212529" stroke-width="1.6"/><path d="M80 37 L87 34" stroke="#212529" stroke-width="1.6"/><ellipse cx="46.5" cy="49" rx="8" ry="7.4" fill="#212529"/><path d="M24 32 Q60 -2 96 32 Q60 22 24 32 Z" fill="#212529"/><path d="M28 30 Q60 20 92 30" stroke="#fcc419" stroke-width="1.5" fill="none"/><circle cx="60" cy="16" r="4" fill="#fff"/><circle cx="58.6" cy="15.6" r=".9" fill="#212529"/><circle cx="61.4" cy="15.6" r=".9" fill="#212529"/><path d="M55 22 L65 26 M65 22 L55 26" stroke="#fff" stroke-width="1.6"/></g>',
    scarf: '<g class="m-wear m-acc"><path d="M38 80 L34 104 L46 104 L49 84 Z" fill="#1c7ed6" stroke="#1864ab" stroke-width="1"/><path d="M36 92 h11 M35 98 h11" stroke="#fff" stroke-width="2.4"/><path d="M31 73 Q60 89 89 73 L90 82 Q60 98 30 82 Z" fill="#1c7ed6" stroke="#1864ab" stroke-width="1"/><path d="M44 80.5 Q60 88 76 80.5" stroke="#fff" stroke-width="2.4" fill="none"/></g>',
    halo: '<g class="m-wear m-halo"><ellipse cx="60" cy="10" rx="18" ry="5" fill="none" stroke="#ffe066" stroke-width="3.4"/><ellipse cx="60" cy="10" rx="18" ry="5" fill="none" stroke="#fff9db" stroke-width="1.2"/></g>',
  };
  const CAPE = '<path class="m-cape" d="M31 70 Q8 86 2 110 L118 110 Q112 86 89 70 Z" fill="#e03131" stroke="#2b211d" stroke-width="2" stroke-linejoin="round"/>';
  const CAPE_FRONT = '<g class="m-wear m-acc"><path d="M36 76 Q60 88 84 76" stroke="#c92a2a" stroke-width="4.5" fill="none" stroke-linecap="round"/><circle cx="60" cy="83" r="4" fill="#fcc419" stroke="#2b211d" stroke-width="1.3"/></g>';
  // outfits were drawn for a smaller head: nudge them onto the new one
  const SHIFT = { hat: 'translate(0 -14)', acc: 'translate(0 -9)' };
  const wear = (o) => {
    const art = OUTFITS[o]; if (!art) return '';
    return art.includes('m-wear') ? art : `<g transform="${art.includes('m-hat') ? SHIFT.hat : SHIFT.acc}">${art}</g>`;
  };

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
          ${o === 'cape' ? CAPE_FRONT : o ? wear(o) : ''}
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
      ['🎲', 'Random workout', () => PD.randomizer.open()],
      ['🗒️', 'New note', () => PD.board.newNote()],
      ['📷', 'Scan food', () => { location.hash = '#diet'; setTimeout(() => $('#scanBtn')?.click(), 200); }],
      ['🔊', 'Briefing', () => PD.daily.speakBriefing()],
      ['📊', 'My week', () => PD.review.open()],
      ['🎁', 'Locker', () => PD.rewards.locker()],
      ['🧭', 'Take the tour', () => PD.tour.start()],
      ['💬', 'Say something', () => setTimeout(quip, 250)],
    ];
  }

  function drawMenu(q = '') {
    const m = $('#moleMenu');
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
      <div class="mo-head"><b>Child Mole Ester 🐾</b><button class="mo-x" data-mo-close aria-label="Close">✕</button></div>
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

  /** Now and then Ester burrows into the molehill and pops right back out. */
  function burrow() {
    if (!busy()) play('burrow', 2300);
    clearTimeout(burrow.t); burrow.t = setTimeout(burrow, 45e3 + Math.random() * 60e3);
  }


  /* ---------- things Ester says ---------- */
  const QUOTES = {
    default: [
      'Holy Mole-y!',
      'You better reach your goals today or I’ll mole-est you.',
      'Did you know guacamole can contain up to 50% moles?',
      'It’s been a while since I’ve seen my uncle, Mole Lester.',
      'My last vacation was on Molestein Island. I’m not welcome there anymore.',
      'I’m digging your vibe today!',
      'I’m feeling really grounded today, ya dig?',
      'Don’t make a mountain out of a molehill.',
      'Keep calm and dig on. ⛏️',
      'I’m a mole-tivational speaker. 🎤',
      'Soil-idarity! ✊',
      'Every day is a good day to dig a little deeper.',
      'I’m not short. I’m fun-sized and mostly underground.',
      'I may be small, but I make a big impact. Ask your lawn.',
    ],
    puns: [
      'What’s a mole’s favourite exercise? Burrow-pees.',
      'Hole-y cow, look at you go!',
      'I tried to be a model, but I’m too down to earth.',
      'I’ve got the dirt on everyone around here.',
      'Mole-ti-tasking is my superpower.',
      'That’s the kind of tunnel vision I can get behind.',
      'Earthquake? Nope, just me doing squats.',
      'Am I on a roll, or in a hole? Both!',
      'Dig it? I practically invented it.',
    ],
    coach: [
      'Drop and give me twenty… worms!',
      'Pain is just weakness leaving the tunnel!',
      'Did I say rest? I said REST LATER, recruit!',
      'Hydrate or die-drate! 💧',
      'Those cards won’t move themselves to Done!',
      'Excuses are for surface dwellers.',
      'One more rep. Then one more. I’m counting!',
      'Squat like there’s a worm under that chair!',
    ],
    deep: [
      'If a mole digs a tunnel and nobody sees it, did it still make progress? Yes. Yes it did.',
      'We are all just moles, digging towards the light.',
      'The tunnel ahead is dark, but so was the one behind you — and you made it.',
      'Small paws, big holes. Small steps, big goals.',
      'Is the glass half full, or is it just a very deep hole?',
      'Rest is not quitting. Even moles nap.',
      'Be the mole you wish to see in the garden.',
    ],
    facts: [
      'Mole fact: a mole can dig about 5 metres of tunnel in an hour. 🏗️',
      'Mole fact: moles have an extra “thumb” bone to help them dig.',
      'Mole fact: the star-nosed mole can find and eat a snack in about an eighth of a second.',
      'Mole fact: moles keep live worms in underground pantries. Meal-prep royalty. 👑',
      'Mole fact: moles aren’t blind — their tiny eyes mostly tell light from dark.',
      'Mole fact: a group of moles is called a “labour”. Fitting, right?',
      'Mole fact: moles cope with stale tunnel air thanks to special blood that grabs every bit of oxygen.',
    ],
    pirate: [
      'Arr, ye dug a fine tunnel today, matey!',
      'X marks the spot… and the spot is yer to-do list. 🏴‍☠️',
      'Shiver me whiskers!',
      'Avast! Ye’ve not had yer water yet!',
      'Yo ho ho and a bottle of… water. Stay hydrated, matey.',
      'This here molehill be my ship.',
      'Walk the plank? I prefer the plank hold. Thirty seconds, matey!',
    ],
  };
  let lastQuote = '';
  /** A random line: the default set plus the equipped jokebook (if any). */
  function quote() {
    const pack = PD.rewards?.equipped('jokes');
    const pool = [...QUOTES.default, ...(QUOTES[pack] || []), ...(QUOTES[pack] || [])].filter((q) => q !== lastQuote);
    lastQuote = pool[Math.floor(Math.random() * pool.length)];
    return lastQuote;
  }
  const quip = () => say(quote(), 7000);
  /** Every few minutes Ester says something, as long as you're around and nothing else is going on. */
  function chatter() {
    if (!wrap.classList.contains('open') && !wrap.classList.contains('sleep') && !document.hidden && $('#moleSay')?.hidden) quip();
    clearTimeout(chatter.t); chatter.t = setTimeout(chatter, (4 + Math.random() * 5) * 60e3);
  }

  /* ---------- easter egg: tap Ester 5× quickly and mud gets thrown at the screen ---------- */
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

  /** Blink every few seconds (a short animation instead of one that runs all the time). */
  function blink() {
    if (!document.hidden && !wrap.classList.contains('sleep')) play('blink', 220);
    setTimeout(blink, 2500 + Math.random() * 4500);
  }

  function mood() {
    const h = new Date().getHours();
    wrap?.classList.toggle('sleep', (h >= 23 || h < 6) && Date.now() > wokeUntil);
  }

  function say(text, ms = 6000) {
    const s = $('#moleSay'); if (!s || wrap.classList.contains('open') || document.body.classList.contains('touring')) return;
    s.textContent = text; s.hidden = false; requestAnimationFrame(() => s.classList.add('show'));
    clearTimeout(say.t); say.t = setTimeout(hideSpeech, ms);
  }
  function hideSpeech() { const s = $('#moleSay'); if (!s) return; s.classList.remove('show'); setTimeout(() => (s.hidden = true), 250); }

  /** Once a day Ester says hello with the first line of your briefing. */
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
      <div class="mole-menu" id="moleMenu" hidden role="dialog" aria-label="Ester the Child Mole — navigation and quick actions"></div>
      <button class="mole-btn peek" aria-label="Ester the Child Mole: navigation and quick actions" title="Hi, I'm Ester the Child Mole! Tap me">${svg()}</button>`;
    document.body.appendChild(wrap);
    $('.mole-btn', wrap).onclick = onTap;
    $('#moleSay', wrap).onclick = () => { hideSpeech(); open(); };
    setTimeout(() => $('.mole-btn', wrap)?.classList.remove('peek'), 1400);
    document.addEventListener('pointerdown', (e) => { if (wrap.classList.contains('open') && !wrap.contains(e.target)) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && wrap.classList.contains('open')) close(); });
    window.addEventListener('hashchange', () => { close(); dig(); });
    // eyes follow the pointer (computers)
    // eyes follow the pointer (computers): at most once per frame, using a cached position
    let rect = null; let pending = null;
    const look = () => {
      const e = pending; pending = null;
      const eyes = $('.m-look', wrap); if (!eyes) return;
      rect = rect || $('.mole-btn', wrap).getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2); const dy = e.clientY - (rect.top + rect.height * 0.45);
      const d = Math.max(Math.hypot(dx, dy), 1);
      eyes.style.transform = `translate(${((dx / d) * 1.8).toFixed(1)}px, ${((dy / d) * 1.4).toFixed(1)}px)`;
    };
    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || PD.fx.reduce()) return;
      if (!pending) requestAnimationFrame(look);
      pending = e;
    }, { passive: true });
    window.addEventListener('resize', () => { rect = null; });
    blink();
    mood(); setInterval(mood, 60e3);
    greet();
    burrow.t = setTimeout(burrow, 25e3 + Math.random() * 30e3);
    chatter.t = setTimeout(chatter, (2 + Math.random() * 3) * 60e3);
  }

  PD.mole = { init, open, close, cheer, dig, say, dress, burrow, mud, quote, QUOTES };
})(window.PD);
