/* Gamification: XP, levels and achievement badges.
   XP is *calculated* from everything you log (workouts, Strava, habits, food, water, focus, fasting, tasks),
   so it's always correct — also for history from before this feature and across synced devices. */
(function (PD) {
  const { esc, $, $$, fmt, store, todayKey } = PD;
  const G = () => store.get('game');

  /* ---------- XP ---------- */
  const xpWorkout = (l) => 20 + Math.round((l.duration || 0) / 60) + (l.program ? 15 : 0) + (l.partial ? 0 : 10);
  const xpActivity = (a) => 10 + Math.round((a.distance || 0) / 500) + Math.round((a.moving_time || 0) / 300);
  const xpFocus = (s) => Math.round((s.minutes || 0) * 0.4);
  const fastHours = (f) => (new Date(f.end) - new Date(f.start)) / 3600e3;
  const LEVEL_XP = (n) => 50 * n * (n - 1); // total XP needed to reach level n (1 → 0, 2 → 100, 3 → 300…)
  const TITLES = [[1, 'Rookie'], [3, 'Mover'], [5, 'Regular'], [8, 'Athlete'], [12, 'Warrior'], [16, 'Champion'], [20, 'Legend'], [30, 'Mythic']];

  function compute() {
    const today = todayKey(); const days = PD.lastNDays(365);
    const w = store.get('workouts'); const diet = store.get('diet'); const habits = store.get('habits');
    const acts = store.get('strava').activities || [];
    const src = { workouts: 0, strava: 0, habits: 0, food: 0, water: 0, focus: 0, fasting: 0, tasks: 0 };
    let todayXp = 0;
    const add = (k, v, date) => { src[k] += v; if (date === today) todayXp += v; };
    w.log.forEach((l) => add('workouts', xpWorkout(l), l.date));
    acts.forEach((a) => add('strava', xpActivity(a), a.start?.slice(0, 10)));
    days.forEach((k) => {
      habits.list.forEach((h) => { if (PD.habits.isDone(h, k)) add('habits', 5, k); });
      if ((diet.log[k] || []).length) add('food', 5, k);
      if ((diet.water[k] || 0) >= (diet.targets.water || 8)) add('water', 5, k);
    });
    store.get('focus').sessions.forEach((s) => add('focus', xpFocus(s), s.date));
    (store.get('fasting').history || []).forEach((f) => add('fasting', fastHours(f) >= f.goal ? 20 : 5, f.end.slice(0, 10)));
    store.get('tasks').filter((t) => t.done).forEach((t) => add('tasks', 3, t.doneOn));
    (store.get('board').cards || []).filter((c) => c.doneAt).forEach((c) => add('tasks', 3, c.doneAt.slice(0, 10)));
    const total = Object.values(src).reduce((a, b) => a + b, 0);
    let level = 1; while (total >= LEVEL_XP(level + 1)) level++;
    const title = [...TITLES].reverse().find(([l]) => level >= l)[1];
    return { total, today: todayXp, src, level, title, from: LEVEL_XP(level), to: LEVEL_XP(level + 1) };
  }

  /* ---------- badge context ---------- */
  function context(xp) {
    const w = store.get('workouts'); const log = w.log;
    const dates = [...new Set(log.map((l) => l.date))].sort();
    let run = 0; let best = 0; let prev = null;
    dates.forEach((d) => { run = prev && PD.daysBetween(prev, d) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; });
    const goal = w.weeklyGoal || 3;
    const weeks = {}; log.forEach((l) => { const k = PD.keyOf(PD.startOfWeek(PD.parseKey(l.date))); weeks[k] = (weeks[k] || 0) + 1; });
    const hour = (l) => new Date(l.start).getHours();
    const habits = store.get('habits').list; const days = PD.lastNDays(365);
    const habitBest = Math.max(0, ...habits.map((h) => { let b = 0; let c = 0; days.forEach((k) => { if (PD.habits.isDone(h, k)) { c++; b = Math.max(b, c); } else c = 0; }); return b; }));
    const perfect = habits.length ? days.filter((k) => habits.every((h) => PD.habits.isDone(h, k))).length : 0;
    const diet = store.get('diet');
    const foodDays = Object.keys(diet.log).filter((k) => diet.log[k].length).sort();
    let fRun = 0; let fBest = 0; let fPrev = null;
    foodDays.forEach((d) => { fRun = fPrev && PD.daysBetween(fPrev, d) === 1 ? fRun + 1 : 1; fBest = Math.max(fBest, fRun); fPrev = d; });
    const fasts = store.get('fasting').history || [];
    return {
      workouts: log.length, streak: best, minutes: Math.round(log.reduce((s, l) => s + l.duration, 0) / 60), kcal: log.reduce((s, l) => s + l.kcal, 0),
      early: log.some((l) => hour(l) < 8) ? 1 : 0, late: log.some((l) => hour(l) >= 21) ? 1 : 0,
      goalWeeks: Object.values(weeks).filter((n) => n >= goal).length, programmes: (w.programHistory || []).length,
      km: Math.round((store.get('strava').activities || []).reduce((s, a) => s + a.distance / 1000, 0)),
      habitBest, perfect, foodDays: foodDays.length, foodStreak: fBest,
      water: days.filter((k) => (diet.water[k] || 0) >= (diet.targets.water || 8)).length,
      focus: store.get('focus').sessions.length,
      fast16: fasts.some((f) => fastHours(f) >= 16) ? 1 : 0, fasts: fasts.filter((f) => fastHours(f) >= f.goal).length,
      boardDone: (store.get('board').cards || []).filter((c) => c.doneAt).length,
      level: xp.level,
    };
  }

  // [id, icon, name, description, tier, category, contextKey, target]
  const BADGES = [
    ['first-sweat', '💧', 'First sweat', 'Finish your first workout', 'bronze', 'Training', 'workouts', 1],
    ['ten-down', '🔟', 'Ten down', 'Finish 10 workouts', 'bronze', 'Training', 'workouts', 10],
    ['half-century', '🏅', 'Half century', 'Finish 50 workouts', 'silver', 'Training', 'workouts', 50],
    ['centurion', '💯', 'Centurion', 'Finish 100 workouts', 'gold', 'Training', 'workouts', 100],
    ['on-a-roll', '🔥', 'On a roll', 'Work out 3 days in a row', 'bronze', 'Training', 'streak', 3],
    ['unstoppable', '⚡', 'Unstoppable', 'Work out 7 days in a row', 'gold', 'Training', 'streak', 7],
    ['hour-power', '⏱️', 'Hour power', '300 minutes of home workouts', 'bronze', 'Training', 'minutes', 300],
    ['marathoner', '🏃', 'Time served', '1,000 minutes of home workouts', 'silver', 'Training', 'minutes', 1000],
    ['iron-will', '🦾', 'Iron will', '5,000 minutes of home workouts', 'epic', 'Training', 'minutes', 5000],
    ['furnace', '🌋', 'Furnace', 'Burn 5,000 kcal in workouts', 'silver', 'Training', 'kcal', 5000],
    ['early-bird', '🌅', 'Early bird', 'Start a workout before 8:00', 'bronze', 'Training', 'early', 1],
    ['night-owl', '🦉', 'Night owl', 'Start a workout after 21:00', 'bronze', 'Training', 'late', 1],
    ['goal-getter', '🎯', 'Goal getter', 'Hit your weekly workout goal 4 times', 'silver', 'Training', 'goalWeeks', 4],
    ['graduate', '🎓', 'Graduate', 'Complete a multi-week programme', 'gold', 'Training', 'programmes', 1],
    ['road-50', '🚴', 'Road warrior', '50 km on Strava', 'bronze', 'Strava', 'km', 50],
    ['road-500', '🛣️', 'Long haul', '500 km on Strava', 'gold', 'Strava', 'km', 500],
    ['habit-week', '📅', 'Habit week', '7-day streak on any habit', 'bronze', 'Habits', 'habitBest', 7],
    ['habit-month', '🗓️', 'Habit master', '30-day streak on any habit', 'gold', 'Habits', 'habitBest', 30],
    ['perfect-day', '🌟', 'Perfect day', 'Complete all habits in one day', 'bronze', 'Habits', 'perfect', 1],
    ['perfect-ten', '✨', 'Perfect ten', '10 perfect habit days', 'silver', 'Habits', 'perfect', 10],
    ['logger', '📝', 'Food logger', 'Log your food 7 days in a row', 'bronze', 'Food', 'foodStreak', 7],
    ['nutritionist', '🥗', 'Nutrition nerd', 'Log your food on 30 days', 'silver', 'Food', 'foodDays', 30],
    ['hydrated', '🌊', 'Hydration hero', 'Hit your water goal on 14 days', 'silver', 'Food', 'water', 14],
    ['deep-work', '🍅', 'Deep work', 'Finish 10 focus sessions', 'bronze', 'Mind', 'focus', 10],
    ['flow-state', '🧠', 'Flow state', 'Finish 50 focus sessions', 'gold', 'Mind', 'focus', 50],
    ['fasted', '⏳', 'Sixteen', 'Complete a 16-hour fast', 'bronze', 'Mind', 'fast16', 1],
    ['ascetic', '🧘', 'Steady faster', 'Complete 10 fasts', 'silver', 'Mind', 'fasts', 10],
    ['shipper', '📦', 'Shipper', 'Move 25 cards to Done on your board', 'silver', 'Mind', 'boardDone', 25],
    ['level-5', '⭐', 'Rising star', 'Reach level 5', 'silver', 'Levels', 'level', 5],
    ['level-10', '👑', 'Royalty', 'Reach level 10', 'gold', 'Levels', 'level', 10],
    ['level-20', '🐉', 'Legend', 'Reach level 20', 'epic', 'Levels', 'level', 20],
  ].map(([id, icon, name, desc, tier, cat, key, target]) => ({ id, icon, name, desc, tier, cat, key, target }));

  function state() {
    const xp = compute(); const ctx = context(xp);
    const badges = BADGES.map((b) => ({ ...b, cur: Math.min(ctx[b.key] || 0, b.target), done: (ctx[b.key] || 0) >= b.target, at: G().unlocked[b.id] }));
    return { xp, badges };
  }

  /* ---------- unlocking & celebrations ---------- */
  const queue = []; let showing = false;
  function check(silent) {
    const g = G(); const { xp, badges } = state();
    const fresh = badges.filter((b) => b.done && !g.unlocked[b.id]);
    if (!fresh.length && xp.level <= (g.level || 0) && g.init) return;
    const quiet = silent || !g.init; // first run: adopt existing progress without fireworks
    fresh.forEach((b) => { g.unlocked[b.id] = todayKey(); });
    const leveled = g.init && xp.level > (g.level || 0);
    g.level = Math.max(g.level || 0, xp.level); g.init = true;
    store.save('game');
    if (quiet) { if (fresh.length && !silent) PD.rewards?.announce(); return; }
    if (leveled) queue.push({ type: 'level', xp });
    fresh.forEach((b) => queue.push({ type: 'badge', b }));
    next();
  }

  function next() {
    if (showing || !queue.length) return;
    showing = true;
    const item = queue.shift();
    const el = document.createElement('div');
    if (item.type === 'level') {
      el.className = 'levelup';
      el.innerHTML = `<div class="levelup-inner"><span class="small">LEVEL UP</span><div class="level-medal big"><b>${item.xp.level}</b></div><h2>${esc(item.xp.title)}</h2><p>${fmt.num(item.xp.total)} XP · next level at ${fmt.num(item.xp.to)}</p></div>`;
      PD.fx.confetti({ count: 200 }); PD.fx.fanfare?.();
    } else {
      const rw = PD.rewards?.forBadge(item.b.id);
      el.className = `achv ${item.b.tier}`;
      el.innerHTML = `<div class="medal ${item.b.tier} shine"><span>${item.b.icon}</span></div><div><span class="small">Achievement unlocked</span><b>${esc(item.b.name)}</b><span class="small muted">${esc(item.b.desc)}</span>
        ${rw ? `<span class="gift">🎁 Unlocked: <b>${esc(rw.name)}</b> <span class="muted">(${esc(PD.rewards.TYPES[rw.type].label.toLowerCase().replace(/s$/, ''))})</span></span>` : ''}</div>
        ${rw ? '<button class="btn sm" data-useit>Use it</button>' : ''}`;
      if (['gold', 'epic'].includes(item.b.tier)) PD.fx.confetti({ count: 120, origin: { x: 0.5, y: 0.15 } }); else PD.fx.chime?.();
    }
    PD.haptic?.([30, 40, 30]);
    el.onclick = () => done();
    const use = el.querySelector('[data-useit]');
    if (use) use.onclick = (e) => { e.stopPropagation(); PD.rewards.equip(PD.rewards.forBadge(item.b.id)); done(); };
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    const t = setTimeout(done, item.type === 'level' ? 3800 : el.querySelector('[data-useit]') ? 6500 : 3400);
    function done() { clearTimeout(t); el.classList.remove('show'); setTimeout(() => { el.remove(); showing = false; next(); }, 400); }
  }

  const soon = PD.debounce(() => check(false), 900);
  store.onChange((key, opts) => {
    if (!['workouts', 'habits', 'diet', 'focus', 'fasting', 'tasks', 'strava', 'board'].includes(key)) return;
    if (opts?.fromSync) check(true); else soon();
  });

  /* ---------- UI ---------- */
  function card(el) {
    if (!el) return;
    const { xp, badges } = state();
    const pct = Math.round(((xp.total - xp.from) / (xp.to - xp.from)) * 100);
    const got = badges.filter((b) => b.done).sort((a, b) => (b.at || '').localeCompare(a.at || ''));
    const nextUp = badges.filter((b) => !b.done).sort((a, b) => b.cur / b.target - a.cur / a.target)[0];
    el.innerHTML = `
      <div class="game">
        <div class="level-medal" title="Level ${xp.level}"><b>${xp.level}</b></div>
        <div class="game-main">
          <div class="game-top"><h2>${esc(xp.title)} <span class="muted small">· level ${xp.level}</span></h2>${xp.today ? `<span class="pill small mint">+${xp.today} XP today</span>` : ''}</div>
          <div class="xp-bar"><i style="width:${pct}%"></i></div>
          <span class="small muted"><b data-count="${xp.total}">0</b> XP · ${fmt.num(xp.to - xp.total)} XP to level ${xp.level + 1}</span>
        </div>
        <div class="game-badges">
          ${got.slice(0, 4).map((b) => `<div class="medal ${b.tier} sm" title="${esc(b.name)}"><span>${b.icon}</span></div>`).join('')}
          <button class="btn sm ghost" id="allBadges">🏆 ${got.length}/${badges.length}</button>
          <button class="btn sm" id="openLocker">🎁 Locker</button>
        </div>
      </div>
      ${nextUp ? `<div class="next-badge"><div class="medal ${nextUp.tier} sm locked"><span>${nextUp.icon}</span></div><span class="small"><b>Next: ${esc(nextUp.name)}</b> — ${esc(nextUp.desc)}</span><span class="mini-bar"><i style="width:${(nextUp.cur / nextUp.target) * 100}%"></i></span><span class="small muted">${fmt.num(nextUp.cur)}/${fmt.num(nextUp.target)}</span></div>` : ''}`;
    $('#allBadges', el).onclick = gallery;
    $('#openLocker', el).onclick = () => PD.rewards.locker();
    PD.fx.countUp(el);
  }

  function gallery() {
    const { xp, badges } = state();
    const cats = [...new Set(badges.map((b) => b.cat))];
    const SRC = { workouts: '🏋️ Workouts', strava: '🚴 Strava', habits: '✅ Habits', food: '🥗 Food logging', water: '💧 Water goals', focus: '🍅 Focus', fasting: '⏳ Fasting', tasks: '📋 Tasks & cards' };
    PD.modal('Achievements', `
      <div class="row gap"><span class="muted small grow">Each badge unlocks a reward: themes, celebrations, effects and more.</span><button class="btn sm" id="galLocker">🎁 Open Locker</button></div>
      <div class="xp-sources">${Object.entries(xp.src).filter(([, v]) => v).map(([k, v]) => `<span class="pill">${SRC[k]} <b>${fmt.num(v)}</b></span>`).join('')}</div>
      <p class="muted small">You earn XP for everything you log: workouts (more for longer and programme sessions), Strava activities, habits, food and water, focus sessions, fasts and finished tasks.</p>
      ${cats.map((c) => `<h3 class="sub">${esc(c)}</h3><div class="badge-grid">${badges.filter((b) => b.cat === c).map((b) => `
        <div class="badge-item ${b.done ? '' : 'locked'}">
          <div class="medal ${b.tier}${b.done ? ' shine' : ' locked'}"><span>${b.icon}</span></div>
          <b>${esc(b.name)}</b><span class="small muted">${esc(b.desc)}</span>
          ${PD.rewards?.forBadge(b.id) ? `<span class="gift small">🎁 ${esc(PD.rewards.forBadge(b.id).name)}</span>` : ''}
          ${b.done ? `<span class="small tier-${b.tier}">${b.tier[0].toUpperCase() + b.tier.slice(1)}${b.at ? ` · ${esc(fmt.dayMonth(PD.parseKey(b.at)))}` : ''}</span>`
            : `<span class="mini-bar"><i style="width:${(b.cur / b.target) * 100}%"></i></span><span class="small muted">${fmt.num(b.cur)} / ${fmt.num(b.target)}</span>`}
        </div>`).join('')}</div>`).join('')}`, (body) => { $('#galLocker', body).onclick = () => PD.rewards.locker(); }, 'wide');
  }

  PD.game = { compute, state, check, card, gallery, xpWorkout };
})(window.PD);
