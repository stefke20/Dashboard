/* Badge rewards: every achievement unlocks something to customise the dashboard —
   site themes, celebration styles, header effects, workout player skins, cursor trails and level medal frames. */
(function (PD) {
  const { esc, $, $$, store } = PD;
  const G = () => store.get('game');

  const TYPES = {
    theme: { label: 'Site themes', icon: '🎨', hint: 'Changes the colours of the whole dashboard.' },
    confetti: { label: 'Celebrations', icon: '🎉', hint: 'The confetti you get for badges, goals and finished workouts.' },
    hero: { label: 'Header effects', icon: '✨', hint: 'An animated effect on the Home header card.' },
    skin: { label: 'Workout player skins', icon: '🏋️', hint: 'The background of the workout player while you train.' },
    trail: { label: 'Cursor trails', icon: '🖱️', hint: 'A little trail behind your mouse (on computers).' },
    frame: { label: 'Level frames', icon: '🏅', hint: 'A frame around your level medal.' },
    outfit: { label: 'Mole outfits', icon: '🐾', hint: 'Dress up Ester, the Child Mole in the corner.' },
    sound: { label: 'Sound packs', icon: '🔊', hint: 'The beeps, chimes and fanfares of timers and celebrations.' },
    font: { label: 'Fonts', icon: '🔤', hint: 'The lettering of the whole dashboard.' },
    cards: { label: 'Card styles', icon: '🪟', hint: 'How the cards on every page look.' },
    title: { label: 'Titles', icon: '🏷️', hint: 'A title shown with your name and your level.' },
    bg: { label: 'Backgrounds', icon: '🖼️', hint: 'A subtle pattern behind every page.' },
    bar: { label: 'XP bars', icon: '📊', hint: 'The look of your XP and progress bars.' },
    jokes: { label: 'Ester’s jokebooks', icon: '💬', hint: 'Extra lines Ester the Child Mole says now and then. Equip one to add it to the mix.' },
  };

  // [id, type, name, unlocked by badge, preview colours / icon]
  const REWARDS = [
    ['neon', 'theme', 'Neon', 'ten-down', ['#b14dff', '#ff2d95', '#00d1ff']],
    ['ember', 'theme', 'Ember', 'on-a-roll', ['#c92a2a', '#e8590c', '#f59f00']],
    ['midnight', 'theme', 'Midnight', 'half-century', ['#0b1a4a', '#1e3a8a', '#e8b54d']],
    ['goldrush', 'theme', 'Gold Rush', 'centurion', ['#16140f', '#b8860b', '#f5c542']],
    ['obsidian', 'theme', 'Obsidian', 'iron-will', ['#0b0b0c', '#3f3f46', '#e4e4e7']],
    ['forest', 'theme', 'Forest', 'habit-week', ['#1b4332', '#2d6a4f', '#74a57f']],
    ['lagoon', 'theme', 'Lagoon', 'hydrated', ['#0b7285', '#15aabf', '#66d9e8']],
    ['candy', 'theme', 'Candy', 'goal-getter', ['#f06595', '#cc5de8', '#74c0fc']],
    ['royal', 'theme', 'Royal', 'level-10', ['#3b1d8f', '#6741d9', '#d4a017']],
    ['zen', 'theme', 'Zen', 'ascetic', ['#588157', '#a3b18a', '#b08d57']],
    ['emoji', 'confetti', 'Emoji burst', 'first-sweat', '💪🔥⭐'],
    ['stars', 'confetti', 'Shooting stars', 'early-bird', '⭐'],
    ['fireworks', 'confetti', 'Fireworks', 'unstoppable', '🎆'],
    ['hearts', 'confetti', 'Hearts', 'perfect-day', '💖'],
    ['fruit', 'confetti', 'Fruit salad', 'nutritionist', '🍓🥑🍌'],
    ['stars', 'hero', 'Night sky', 'night-owl', '🌌'],
    ['bubbles', 'hero', 'Bubbles', 'deep-work', '🫧'],
    ['fireflies', 'hero', 'Fireflies', 'fasted', '✨'],
    ['aurora', 'hero', 'Aurora', 'graduate', '🌈'],
    ['sparkle', 'hero', 'Sparkles', 'level-5', '✦'],
    ['matrix', 'hero', 'Digital rain', 'flow-state', '💻'],
    ['meteors', 'hero', 'Meteor shower', 'road-500', '☄️'],
    ['galaxy', 'skin', 'Galaxy', 'hour-power', ['#0b0420', '#3b1d8f', '#c084fc']],
    ['lava', 'skin', 'Lava', 'furnace', ['#3b0a0a', '#d9480f', '#ffc078']],
    ['ocean', 'skin', 'Deep ocean', 'marathoner', ['#03254c', '#1167b1', '#2a9df4']],
    ['synthwave', 'skin', 'Synthwave', 'road-50', ['#2b0a3d', '#ff2d95', '#ffb000']],
    ['sparkle', 'trail', 'Sparkle trail', 'logger', '✨'],
    ['rainbow', 'trail', 'Rainbow trail', 'perfect-ten', '🌈'],
    ['comet', 'trail', 'Comet', 'shipper', '☄️'],
    ['flame', 'frame', 'Flame frame', 'habit-month', '🔥'],
    ['legend', 'frame', 'Legend frame', 'level-20', '👑'],
    // ---- second wave ----
    ['sunrise', 'theme', 'Sunrise', 'early-ten', ['#ff7e5f', '#feb47b', '#ffd194']],
    ['lightning', 'confetti', 'Lightning', 'streak-14', '⚡'],
    ['borealis', 'skin', 'Borealis', 'strava-25', ['#001d2e', '#00a676', '#7b2ff7']],
    ['hearts', 'trail', 'Heart trail', 'focus-100', '💗'],
    ['cape', 'outfit', 'Superhero cape', 'two-hundred', '🦸'],
    ['headband', 'outfit', 'Sweatband', 'weekend-warrior', '🎽'],
    ['sunglasses', 'outfit', 'Cool shades', 'lunch-break', '🕶️'],
    ['headphones', 'outfit', 'Headphones', 'focus-hours', '🎧'],
    ['party', 'outfit', 'Party hat', 'note-taker', '🥳'],
    ['crown', 'outfit', 'Crown', 'level-15', '👑'],
    ['wizard', 'outfit', 'Wizard hat', 'collector', '🧙'],
    ['8bit', 'sound', '8-bit', 'variety', '👾'],
    ['arcade', 'sound', 'Arcade', 'strava-10', '🕹️'],
    ['chimes', 'sound', 'Wind chimes', 'water-50', '🎐'],
    ['rounded', 'font', 'Rounded', 'planner', 'Aa'],
    ['mono', 'font', 'Monospace', 'board-100', '{ }'],
    ['serif', 'font', 'Editorial serif', 'logger-100', 'Ff'],
    ['clay', 'cards', 'Clay', 'tri-grad', '🧱'],
    ['glass', 'cards', 'Glass', 'mood-30', '🪟'],
    ['outline', 'cards', 'Outline', 'fast-18', '⬜'],
    ['inferno', 'title', 'Inferno', 'inferno', '🔥'],
    ['habit-legend', 'title', 'Habit Legend', 'habit-100', '💎'],
    ['mythic-mole', 'title', 'Mythic Mole', 'level-30', '🌌'],
    // ---- third wave ----
    ['beanie', 'outfit', 'Cosy beanie', 'w-5', '🧶'],
    ['mint', 'theme', 'Mint', 'w-25', ['#0ca678', '#38d9a9', '#96f2d7']],
    ['striped', 'bar', 'Candy stripes', 'w-75', '🍬'],
    ['tophat', 'outfit', 'Top hat', 'w-150', '🎩'],
    ['cyberpunk', 'theme', 'Cyberpunk', 'w-250', ['#0d0221', '#ff2a6d', '#05d9e8']],
    ['viking', 'outfit', 'Viking helmet', 'w-300', '⚔️'],
    ['topo', 'bg', 'Topographic', 'w-350', '🗺️'],
    ['diamond', 'frame', 'Diamond frame', 'w-400', '💎'],
    ['bokeh', 'hero', 'Bokeh lights', 'w-450', '🔆'],
    ['iron-mole', 'title', 'Iron Mole', 'w-500', '🦾'],
    ['forest', 'skin', 'Enchanted forest', 'w-600', ['#0b2e1f', '#2d6a4f', '#b7e4c7']],
    ['astronaut', 'outfit', 'Space helmet', 'w-750', '🧑‍🚀'],
    ['immortal', 'title', 'Immortal', 'w-1000', '♾️'],
    ['paws', 'trail', 'Paw prints', 's-5', '🐾'],
    ['balloons', 'confetti', 'Balloons', 's-10', '🎈'],
    ['hardhat', 'outfit', 'Hard hat', 's-21', '👷'],
    ['neon', 'frame', 'Neon frame', 's-30', '💡'],
    ['unbreakable', 'title', 'Unbreakable', 's-50', '⛓️'],
    ['rainbow', 'bar', 'Rainbow bar', 'm-100', '🌈'],
    ['marimba', 'sound', 'Marimba', 'm-500', '🪘'],
    ['coffee', 'theme', 'Coffee', 'm-2000', ['#4a2c1d', '#8b5e3c', '#d4a373']],
    ['beach', 'skin', 'Beach sunset', 'm-3000', ['#ff7e5f', '#feb47b', '#3fa7d6']],
    ['snowfall', 'hero', 'Snowfall', 'm-7500', '❄️'],
    ['time-lord', 'title', 'Time Lord', 'm-10000', '⏳'],
    ['fire', 'trail', 'Fire trail', 'k-1000', '🔥'],
    ['coach', 'jokes', 'Drill sergeant', 'k-2500', '🪖'],
    ['citrus', 'theme', 'Citrus', 'k-10000', ['#f08c00', '#fab005', '#94d82d']],
    ['rainbow', 'frame', 'Rainbow frame', 'k-35000', '🌈'],
    ['devil', 'outfit', 'Little horns', 'k-50000', '😈'],
    ['stripes', 'bg', 'Diagonal stripes', 'g-2', '〰️'],
    ['gradcap', 'outfit', 'Graduation cap', 'g-8', '🎓'],
    ['paper', 'cards', 'Paper', 'g-12', '📄'],
    ['arctic', 'theme', 'Arctic', 'g-26', ['#1864ab', '#4dabf7', '#d0ebff']],
    ['year-rounder', 'title', 'Year-Rounder', 'g-52', '📆'],
    ['cowboy', 'outfit', 'Cowboy hat', 'r-3', '🤠'],
    ['grid', 'bg', 'Blueprint grid', 'r-10', '📐'],
    ['balloons', 'hero', 'Balloons', 'p-2', '🎈'],
    ['professor', 'title', 'Professor Mole', 'p-5', '🎓'],
    ['cosmos', 'skin', 'Cosmos', 'km-100', ['#05010f', '#5b2a86', '#f72585']],
    ['stars', 'trail', 'Star trail', 'km-250', '⭐'],
    ['deepsea', 'theme', 'Deep Sea', 'km-1000', ['#012a4a', '#01497c', '#2ec4ff']],
    ['bubbly', 'sound', 'Bubbles', 'strava-50', '🫧'],
    ['laurel', 'frame', 'Laurel frame', 'strava-100', '🌿'],
    ['daisy', 'outfit', 'Daisy', 'h-3', '🌼'],
    ['flowers', 'outfit', 'Flower crown', 'h-14', '💐'],
    ['sakura', 'theme', 'Sakura', 'h-50', ['#f783ac', '#fcc2d7', '#b197fc']],
    ['monk', 'title', 'Monk', 'h-200', '🧘'],
    ['living-legend', 'title', 'Living Legend', 'h-365', '🌞'],
    ['snow', 'confetti', 'Snowflakes', 'pf-5', '❄️'],
    ['bowtie', 'outfit', 'Bow tie', 'pf-30', '🎀'],
    ['neon', 'bar', 'Neon bar', 'pf-50', '💡'],
    ['perfectionist', 'title', 'Perfectionist', 'pf-100', '✨'],
    ['deep', 'jokes', 'Deep thoughts', 'mood-7', '🤔'],
    ['grape', 'theme', 'Grape', 'mood-100', ['#5f3dc4', '#9c36b5', '#e599f7']],
    ['leaves', 'confetti', 'Autumn leaves', 'fs-14', '🍃'],
    ['gold', 'bar', 'Gold bar', 'fs-30', '🪙'],
    ['chef', 'outfit', 'Chef hat', 'fd-60', '👨‍🍳'],
    ['hand', 'font', 'Handwritten', 'fd-200', 'Aa'],
    ['gourmet', 'title', 'Gourmet', 'fd-365', '🍷'],
    ['bubbles', 'trail', 'Bubble trail', 'wa-7', '🫧'],
    ['waves', 'bg', 'Waves', 'wa-30', '🌊'],
    ['rain', 'hero', 'Gentle rain', 'wa-100', '🌧️'],
    ['aquamole', 'title', 'Aquamole', 'wa-200', '🐳'],
    ['paws', 'bg', 'Paw pattern', 'fo-1', '🐾'],
    ['detective', 'outfit', 'Detective hat', 'fo-25', '🕵️'],
    ['gentleman', 'outfit', 'Monocle & moustache', 'fo-200', '🧐'],
    ['facts', 'jokes', 'Mole facts', 'fm-1500', '🔬'],
    ['neon', 'cards', 'Neon edges', 'fm-3000', '💠'],
    ['retro', 'font', 'Retro', 'fm-6000', 'Aa'],
    ['cat', 'outfit', 'Cat ears', 'fa-5', '🐱'],
    ['slate', 'theme', 'Slate', 'fa-25', ['#343a40', '#495057', '#adb5bd']],
    ['zen-master', 'title', 'Zen Master', 'fa-50', '☯️'],
    ['lanterns', 'hero', 'Lanterns', 'fx-20', '🏮'],
    ['ice', 'frame', 'Ice frame', 'fx-24', '🧊'],
    ['bunny', 'outfit', 'Bunny ears', 'bd-10', '🐰'],
    ['ninja', 'outfit', 'Ninja band', 'bd-50', '🥷'],
    ['architect', 'title', 'Architect', 'bd-250', '📐'],
    ['soft', 'cards', 'Soft gradient', 'nt-25', '🫧'],
    ['pirate', 'outfit', 'Pirate hat', 'nt-50', '🏴‍☠️'],
    ['scarf', 'outfit', 'Scarf', 'bc-50', '🧣'],
    ['confetti', 'bg', 'Confetti dots', 'bc-100', '🎊'],
    ['puns', 'jokes', 'Pun-derground', 'lv-2', '🕳️'],
    ['dots', 'bg', 'Polka dots', 'lv-3', '⚪'],
    ['coins', 'confetti', 'Gold coins', 'lv-7', '🪙'],
    ['grotesk', 'font', 'Grotesk', 'lv-12', 'Aa'],
    ['stars', 'bg', 'Starfield', 'lv-25', '✨'],
    ['halo', 'outfit', 'Halo', 'lv-35', '😇'],
    ['fire', 'bar', 'Fire bar', 'lv-40', '🔥'],
    ['grandmaster', 'title', 'Grandmaster', 'lv-50', '♟️'],
    ['pirate', 'jokes', 'Pirate talk', 'col-10', '🦜'],
    ['rose', 'theme', 'Rose', 'col-50', ['#c2255c', '#f06595', '#ffc9c9']],
    ['curator', 'title', 'Curator', 'col-75', '🏺'],
    ['keymaster', 'title', 'Keymaster', 'col-100', '🗝️'],
  ].map(([id, type, name, badge, preview]) => ({ key: `${type}:${id}`, id, type, name, badge, preview }));

  const badgeOf = (r) => PD.game.state().badges.find((b) => b.id === r.badge);
  const isUnlocked = (r) => !!G().unlocked[r.badge];
  const forBadge = (badgeId) => REWARDS.find((r) => r.badge === badgeId);
  const themeIds = REWARDS.filter((r) => r.type === 'theme').map((r) => r.id);

  /** Currently equipped reward id for a type ('' = default). Themes live in the colour-scheme setting. */
  function equipped(type) {
    if (type === 'theme') { const p = store.get('settings').palette; return themeIds.includes(p) ? p : ''; }
    return G().equipped?.[type] || '';
  }

  function equip(r) {
    if (r && !isUnlocked(r)) { PD.toast(`🔒 Unlock “${r.name}” with the ${badgeOf(r)?.name || ''} badge`); return; }
    if (r?.type === 'theme') { store.get('settings').palette = r.id; store.save('settings'); PD.settings.applyTheme(); }
    else if (r) { const g = G(); g.equipped = { ...(g.equipped || {}), [r.type]: r.id }; store.save('game'); }
    apply();
    if (r?.type === 'confetti') PD.fx.confetti({ count: 120 });
    if (r?.type === 'sound') PD.fx.fanfare();
    if (r?.type === 'outfit') PD.mole?.cheer();
    if (r?.type === 'jokes') setTimeout(() => PD.mole?.say(PD.mole.QUOTES[r.id]?.[0] || ''), 600);
    if (r) PD.toast(`${TYPES[r.type].icon} ${r.name} equipped`);
  }
  function unequip(type) {
    if (type === 'theme') { store.get('settings').palette = 'aurora'; store.save('settings'); PD.settings.applyTheme(); }
    else { const g = G(); g.equipped = { ...(g.equipped || {}), [type]: '' }; store.save('game'); }
    apply();
  }

  /* ---------- applying rewards ---------- */
  const FONTS = {
    rounded: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap',
    mono: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&display=swap',
    serif: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,800&display=swap',
    grotesk: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap',
    hand: 'https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap',
    retro: 'https://fonts.googleapis.com/css2?family=Righteous&display=swap',
  };
  function loadFont(id) {
    if (!FONTS[id] || document.querySelector(`link[data-font="${id}"]`)) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = FONTS[id]; l.dataset.font = id;
    document.head.appendChild(l);
  }
  /** Equipped title (e.g. "Habit Legend") or ''. */
  const title = () => REWARDS.find((r) => r.type === 'title' && r.id === equipped('title'))?.name || '';

  function apply() {
    const root = document.documentElement;
    root.dataset.frame = equipped('frame');
    root.dataset.skin = equipped('skin');
    root.dataset.font = equipped('font'); loadFont(equipped('font'));
    root.dataset.cards = equipped('cards');
    root.dataset.bg = equipped('bg');
    root.dataset.bar = equipped('bar');
    trail(equipped('trail'));
    PD.mole?.dress();
    if (PD.app?.current() === 'home') PD.home.render();
  }

  /** Header particle effect for the Home hero (used by seasons.heroFx). */
  function heroFx() {
    const fx = equipped('hero');
    if (!fx || PD.fx.reduce()) return '';
    const n = fx === 'aurora' ? 3 : fx === 'matrix' ? 16 : fx === 'rain' ? 28 : fx === 'bokeh' ? 12 : 18;
    let html = '';
    for (let i = 0; i < n; i++) {
      const left = (i * 41 + 7) % 100; const top = (i * 29 + 11) % 100;
      const dur = (fx === 'meteors' ? 2.5 : 5) + ((i * 13) % 6); const delay = -((i * 7) % 9);
      const size = 3 + ((i * 5) % 6);
      const content = fx === 'snowfall' ? '❄' : fx === 'balloons' ? '🎈' : fx === 'matrix' ? Array.from({ length: 12 }, (_, k) => '01アイウエオカキ'[(i * 3 + k * 7) % 12] || '1').join('<br>') : fx === 'sparkle' ? '✦' : '';
      html += `<i style="left:${left}%;top:${top}%;--dur:${dur}s;--delay:${delay}s;--size:${size}px">${content}</i>`;
    }
    return `<div class="hero-fx rfx-${fx}" aria-hidden="true">${html}</div>`;
  }

  // cursor trail (mouse only)
  let trailType = ''; let last = 0; let alive = 0;
  const TRAIL_COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];
  function trail(type) { trailType = PD.fx.reduce() ? '' : type; }
  document.addEventListener('pointermove', (e) => {
    if (!trailType || e.pointerType !== 'mouse' || alive > 40) return;
    const now = performance.now(); if (now - last < 28) return; last = now;
    const d = document.createElement('i');
    d.className = `trail trail-${trailType}`;
    d.style.left = `${e.clientX}px`; d.style.top = `${e.clientY}px`;
    if (trailType === 'sparkle') d.textContent = Math.random() > 0.5 ? '✦' : '✧';
    if (trailType === 'hearts') d.textContent = '💗';
    if (trailType === 'paws') { d.textContent = '🐾'; d.style.transform = `rotate(${Math.round(Math.random() * 40 - 20)}deg)`; }
    if (trailType === 'fire') d.textContent = Math.random() > 0.3 ? '🔥' : '✨';
    if (trailType === 'stars') d.textContent = '⭐';
    if (trailType === 'rainbow') d.style.background = TRAIL_COLORS[Math.floor(now / 60) % TRAIL_COLORS.length];
    document.body.appendChild(d); alive++;
    setTimeout(() => { d.remove(); alive--; }, 800);
  }, { passive: true });

  /* ---------- Locker ---------- */
  function preview(r) {
    if (r.type === 'font') return `<span class="rw-icon rw-font font-${r.id}">${esc(r.preview)}</span>`;
    if (Array.isArray(r.preview)) return `<span class="rw-swatch">${r.preview.map((c) => `<i style="background:${c}"></i>`).join('')}</span>`;
    return `<span class="rw-icon">${esc(r.preview)}</span>`;
  }

  let show = 'all'; // locker filter: 'all', 'mine' or a reward type
  function locker() {
    const draw = (body) => {
      const total = REWARDS.filter(isUnlocked).length;
      const types = Object.entries(TYPES).filter(([type]) => show === 'all' || show === 'mine' || show === type);
      body.innerHTML = `
        <p class="muted small">Every badge unlocks a reward. Earn badges by training, logging and keeping your habits — then pick what you like here. <b>${total}/${REWARDS.length}</b> unlocked.</p>
        <div class="chips rw-filter">${[['all', 'All'], ['mine', '✓ Unlocked'], ...Object.entries(TYPES).map(([k, t]) => [k, `${t.icon} ${t.label}`])].map(([k, l]) => `<button class="chip${show === k ? ' active' : ''}" data-show="${k}">${esc(l)}</button>`).join('')}</div>
        ${types.map(([type, t]) => {
          const list = REWARDS.filter((r) => r.type === type && (show !== 'mine' || isUnlocked(r)));
          if (show === 'mine' && !list.length) return '';
          const cur = equipped(type);
          return `<h3 class="sub">${t.icon} ${t.label}</h3><p class="muted small rw-hint">${t.hint}</p>
            <div class="rw-grid">
              <button class="rw-item${!cur ? ' on' : ''}" data-default="${type}"><span class="rw-icon">○</span><b>Default</b><span class="small muted">${!cur ? 'In use' : 'Use'}</span></button>
              ${list.map((r) => {
                const un = isUnlocked(r); const on = cur === r.id; const b = badgeOf(r);
                return `<button class="rw-item${on ? ' on' : ''}${un ? '' : ' locked'}" data-rw="${esc(r.key)}" title="${un ? '' : `Unlock with ${esc(b?.name || '')}: ${esc(b?.desc || '')}`}">
                  ${preview(r)}<b>${esc(r.name)}</b>
                  ${un ? `<span class="small ${on ? 'rw-on' : 'muted'}">${on ? '✓ In use' : 'Use'}</span>`
                    : `<span class="small muted">🔒 ${esc(b?.icon || '')} ${esc(b?.name || '')}</span><span class="mini-bar"><i style="width:${b ? (b.cur / b.target) * 100 : 0}%"></i></span>`}
                </button>`;
              }).join('')}
            </div>`;
        }).join('')}`;
      $$('[data-rw]', body).forEach((btn) => (btn.onclick = () => {
        const r = REWARDS.find((x) => x.key === btn.dataset.rw);
        if (!isUnlocked(r)) { PD.toast(`🔒 Earn “${badgeOf(r)?.name}” to unlock ${r.name} — ${badgeOf(r)?.desc}`); return; }
        equip(r); draw(body);
      }));
      $$('[data-default]', body).forEach((btn) => (btn.onclick = () => { unequip(btn.dataset.default); draw(body); }));
      $$('[data-show]', body).forEach((btn) => (btn.onclick = () => { show = btn.dataset.show; draw(body); }));
    };
    PD.modal('🎁 Locker', '', draw, 'wide');
  }

  /** Called once when existing badges were adopted on first run. */
  function announce() {
    const n = REWARDS.filter(isUnlocked).length;
    if (n) setTimeout(() => PD.toast(`🎁 Your badges unlocked ${n} reward${n === 1 ? '' : 's'} — open the Locker in My workout`), 2500);
  }

  PD.rewards = { REWARDS, TYPES, forBadge, isUnlocked, equipped, equip, unequip, apply, heroFx, locker, announce, themeIds, title };
})(window.PD);
