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
      boardCards: (store.get('board').cards || []).length,
      notes: (store.get('notes').list || []).length,
      early10: log.filter((l) => hour(l) < 8).length,
      lunch: log.some((l) => hour(l) >= 12 && hour(l) < 14) ? 1 : 0,
      weekendBoth: (() => { const set = new Set(log.map((l) => l.date)); return [...set].some((d) => PD.parseKey(d).getDay() === 6 && set.has(PD.shiftKey(d, 1))) ? 1 : 0; })(),
      routines: new Set(log.map((l) => l.name)).size,
      stravaN: (store.get('strava').activities || []).length,
      focusMin: store.get('focus').sessions.reduce((s, x) => s + (x.minutes || 0), 0),
      fastMax: Math.floor(Math.max(0, ...fasts.map(fastHours))),
      moodDays: Object.values(store.get('journal') || {}).filter((j) => j?.mood).length,
      badgesUnlocked: Object.keys(G().unlocked || {}).length,
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
    // ---- second wave ----
    ['two-hundred', '🏟️', 'Double century', 'Finish 200 workouts', 'epic', 'Training', 'workouts', 200],
    ['weekend-warrior', '🛡️', 'Weekend warrior', 'Work out on a Saturday and the Sunday after', 'bronze', 'Training', 'weekendBoth', 1],
    ['lunch-break', '🥪', 'Lunch break', 'Start a workout between 12:00 and 14:00', 'bronze', 'Training', 'lunch', 1],
    ['variety', '🎨', 'Mix it up', 'Do 5 different routines', 'silver', 'Training', 'routines', 5],
    ['early-ten', '🌄', 'Morning person', '10 workouts before 8:00', 'silver', 'Training', 'early10', 10],
    ['streak-14', '🌩️', 'Lightning streak', 'Work out 14 days in a row', 'epic', 'Training', 'streak', 14],
    ['tri-grad', '📜', 'Triple graduate', 'Complete 3 programmes', 'epic', 'Training', 'programmes', 3],
    ['inferno', '🌡️', 'Inferno', 'Burn 20,000 kcal in workouts', 'epic', 'Training', 'kcal', 20000],
    ['strava-10', '📡', 'Tracked', '10 activities on Strava', 'bronze', 'Strava', 'stravaN', 10],
    ['strava-25', '🏔️', 'Explorer', '25 activities on Strava', 'silver', 'Strava', 'stravaN', 25],
    ['habit-100', '💎', 'Diamond habit', '100-day streak on any habit', 'epic', 'Habits', 'habitBest', 100],
    ['mood-30', '🌈', 'In touch', 'Log your mood on 30 days', 'silver', 'Habits', 'moodDays', 30],
    ['water-50', '🐳', 'Whale', 'Hit your water goal on 50 days', 'gold', 'Food', 'water', 50],
    ['logger-100', '📚', 'Food historian', 'Log your food on 100 days', 'gold', 'Food', 'foodDays', 100],
    ['focus-hours', '🎧', 'In the zone', '10 hours of focus sessions', 'silver', 'Mind', 'focusMin', 600],
    ['focus-100', '🧩', 'Centred', 'Finish 100 focus sessions', 'epic', 'Mind', 'focus', 100],
    ['fast-18', '🌙', 'Night fast', 'Complete an 18-hour fast', 'silver', 'Mind', 'fastMax', 18],
    ['note-taker', '🗒️', 'Note taker', 'Write 10 notes', 'bronze', 'Board', 'notes', 10],
    ['planner', '🗂️', 'Planner', 'Create 20 cards on your board', 'bronze', 'Board', 'boardCards', 20],
    ['board-100', '🚀', 'Productivity machine', 'Move 100 cards to Done', 'epic', 'Board', 'boardDone', 100],
    ['level-15', '🦸', 'Hero', 'Reach level 15', 'gold', 'Levels', 'level', 15],
    ['level-30', '🌌', 'Mythic', 'Reach level 30', 'epic', 'Levels', 'level', 30],
    ['collector', '🧸', 'Collector', 'Unlock 25 badges', 'gold', 'Levels', 'badgesUnlocked', 25],
    // ---- third wave: milestone ladders ----
    ['w-5', '🌱', 'Getting started', 'Finish 5 workouts', 'bronze', 'Training', 'workouts', 5],
    ['w-25', '🎽', 'Quarter century', 'Finish 25 workouts', 'bronze', 'Training', 'workouts', 25],
    ['w-75', '🥉', 'Seventy-five', 'Finish 75 workouts', 'silver', 'Training', 'workouts', 75],
    ['w-150', '🥈', '150 club', 'Finish 150 workouts', 'silver', 'Training', 'workouts', 150],
    ['w-250', '🥇', '250 club', 'Finish 250 workouts', 'gold', 'Training', 'workouts', 250],
    ['w-300', '🏛️', 'Spartan', 'Finish 300 workouts', 'gold', 'Training', 'workouts', 300],
    ['w-350', '🗻', '350 club', 'Finish 350 workouts', 'gold', 'Training', 'workouts', 350],
    ['w-400', '🎖️', '400 club', 'Finish 400 workouts', 'gold', 'Training', 'workouts', 400],
    ['w-450', '🌠', '450 club', 'Finish 450 workouts', 'epic', 'Training', 'workouts', 450],
    ['w-500', '🏆', 'Five hundred', 'Finish 500 workouts', 'epic', 'Training', 'workouts', 500],
    ['w-600', '🛡️', '600 club', 'Finish 600 workouts', 'epic', 'Training', 'workouts', 600],
    ['w-750', '🔱', '750 club', 'Finish 750 workouts', 'epic', 'Training', 'workouts', 750],
    ['w-1000', '♾️', 'One thousand', 'Finish 1,000 workouts', 'epic', 'Training', 'workouts', 1000],
    ['s-5', '🕯️', 'Warming up', 'Work out 5 days in a row', 'bronze', 'Training', 'streak', 5],
    ['s-10', '🧨', 'Ten-day fuse', 'Work out 10 days in a row', 'silver', 'Training', 'streak', 10],
    ['s-21', '🧱', 'Habit formed', 'Work out 21 days in a row', 'gold', 'Training', 'streak', 21],
    ['s-30', '🌕', 'Full moon', 'Work out 30 days in a row', 'epic', 'Training', 'streak', 30],
    ['s-50', '☄️', 'Comet streak', 'Work out 50 days in a row', 'epic', 'Training', 'streak', 50],
    ['m-100', '⏲️', 'Hundred minutes', '100 minutes of home workouts', 'bronze', 'Training', 'minutes', 100],
    ['m-500', '⌛', 'Time keeper', '500 minutes of home workouts', 'bronze', 'Training', 'minutes', 500],
    ['m-2000', '🕰️', 'Clockwork', '2,000 minutes of home workouts', 'silver', 'Training', 'minutes', 2000],
    ['m-3000', '🎞️', 'Feature length', '3,000 minutes of home workouts', 'gold', 'Training', 'minutes', 3000],
    ['m-7500', '🛰️', 'Satellite', '7,500 minutes of home workouts', 'epic', 'Training', 'minutes', 7500],
    ['m-10000', '🧭', 'Ten thousand', '10,000 minutes of home workouts', 'epic', 'Training', 'minutes', 10000],
    ['k-1000', '🪵', 'Kindling', 'Burn 1,000 kcal in workouts', 'bronze', 'Training', 'kcal', 1000],
    ['k-2500', '🍕', 'Pizza burner', 'Burn 2,500 kcal in workouts', 'bronze', 'Training', 'kcal', 2500],
    ['k-10000', '🚂', 'Steam engine', 'Burn 10,000 kcal in workouts', 'silver', 'Training', 'kcal', 10000],
    ['k-35000', '☀️', 'Solar flare', 'Burn 35,000 kcal in workouts', 'gold', 'Training', 'kcal', 35000],
    ['k-50000', '💥', 'Supernova', 'Burn 50,000 kcal in workouts', 'epic', 'Training', 'kcal', 50000],
    ['g-2', '✌️', 'Double goal', 'Hit your weekly goal 2 times', 'bronze', 'Training', 'goalWeeks', 2],
    ['g-8', '📈', 'Consistent', 'Hit your weekly goal 8 times', 'silver', 'Training', 'goalWeeks', 8],
    ['g-12', '🗓️', 'A quarter', 'Hit your weekly goal 12 times', 'gold', 'Training', 'goalWeeks', 12],
    ['g-26', '🌗', 'Half a year', 'Hit your weekly goal 26 times', 'gold', 'Training', 'goalWeeks', 26],
    ['g-52', '🎆', 'Full year', 'Hit your weekly goal 52 times', 'epic', 'Training', 'goalWeeks', 52],
    ['r-3', '🧳', 'Explorer', 'Do 3 different routines', 'bronze', 'Training', 'routines', 3],
    ['r-10', '🗺️', 'Globetrotter', 'Do 10 different routines', 'gold', 'Training', 'routines', 10],
    ['p-2', '📘', 'Second semester', 'Complete 2 programmes', 'silver', 'Training', 'programmes', 2],
    ['p-5', '🧑‍🏫', 'Professor', 'Complete 5 programmes', 'epic', 'Training', 'programmes', 5],
    ['km-100', '🚲', 'Century ride', '100 km on Strava', 'silver', 'Strava', 'km', 100],
    ['km-250', '🗾', 'Road tripper', '250 km on Strava', 'silver', 'Strava', 'km', 250],
    ['km-1000', '🌍', 'Thousand km', '1,000 km on Strava', 'epic', 'Strava', 'km', 1000],
    ['strava-50', '📶', 'Signal strong', '50 activities on Strava', 'gold', 'Strava', 'stravaN', 50],
    ['strava-100', '🏅', 'Hundred tracked', '100 activities on Strava', 'epic', 'Strava', 'stravaN', 100],
    ['h-3', '🌱', 'Seedling', '3-day streak on any habit', 'bronze', 'Habits', 'habitBest', 3],
    ['h-14', '🌿', 'Two weeks strong', '14-day streak on any habit', 'silver', 'Habits', 'habitBest', 14],
    ['h-50', '🌳', 'Deep roots', '50-day streak on any habit', 'gold', 'Habits', 'habitBest', 50],
    ['h-200', '🏔️', 'Mountain habit', '200-day streak on any habit', 'epic', 'Habits', 'habitBest', 200],
    ['h-365', '🌞', 'Every single day', '365-day streak on any habit', 'epic', 'Habits', 'habitBest', 365],
    ['pf-5', '💫', 'High five', '5 perfect habit days', 'bronze', 'Habits', 'perfect', 5],
    ['pf-30', '🎯', 'Bullseye month', '30 perfect habit days', 'gold', 'Habits', 'perfect', 30],
    ['pf-50', '🏵️', 'Flawless fifty', '50 perfect habit days', 'gold', 'Habits', 'perfect', 50],
    ['pf-100', '👼', 'Perfectionist', '100 perfect habit days', 'epic', 'Habits', 'perfect', 100],
    ['mood-7', '🙂', 'Check-in', 'Log your mood on 7 days', 'bronze', 'Habits', 'moodDays', 7],
    ['mood-100', '🧘', 'Self-aware', 'Log your mood on 100 days', 'epic', 'Habits', 'moodDays', 100],
    ['fs-14', '🥦', 'Fortnight fed', 'Log your food 14 days in a row', 'bronze', 'Food', 'foodStreak', 14],
    ['fs-30', '🍽️', 'Month of meals', 'Log your food 30 days in a row', 'silver', 'Food', 'foodStreak', 30],
    ['fd-60', '🍱', 'Meal tracker', 'Log your food on 60 days', 'silver', 'Food', 'foodDays', 60],
    ['fd-200', '📖', 'Food diary', 'Log your food on 200 days', 'gold', 'Food', 'foodDays', 200],
    ['fd-365', '🧺', 'Year of meals', 'Log your food on 365 days', 'epic', 'Food', 'foodDays', 365],
    ['wa-7', '💦', 'Splash', 'Hit your water goal on 7 days', 'bronze', 'Food', 'water', 7],
    ['wa-30', '🐬', 'Dolphin', 'Hit your water goal on 30 days', 'silver', 'Food', 'water', 30],
    ['wa-100', '🌧️', 'Rainmaker', 'Hit your water goal on 100 days', 'gold', 'Food', 'water', 100],
    ['wa-200', '🌊', 'Ocean', 'Hit your water goal on 200 days', 'epic', 'Food', 'water', 200],
    ['fo-1', '🎬', 'First focus', 'Finish your first focus session', 'bronze', 'Mind', 'focus', 1],
    ['fo-25', '🔦', 'Spotlight', 'Finish 25 focus sessions', 'silver', 'Mind', 'focus', 25],
    ['fo-200', '🦉', 'Wise owl', 'Finish 200 focus sessions', 'epic', 'Mind', 'focus', 200],
    ['fm-1500', '📚', 'Bookworm', '25 hours of focus sessions', 'silver', 'Mind', 'focusMin', 1500],
    ['fm-3000', '🧠', 'Big brain', '50 hours of focus sessions', 'gold', 'Mind', 'focusMin', 3000],
    ['fm-6000', '🌌', 'Hundred hours', '100 hours of focus sessions', 'epic', 'Mind', 'focusMin', 6000],
    ['fa-5', '🍵', 'Patience', 'Complete 5 fasts', 'bronze', 'Mind', 'fasts', 5],
    ['fa-25', '🕊️', 'Discipline', 'Complete 25 fasts', 'gold', 'Mind', 'fasts', 25],
    ['fa-50', '🏯', 'Master of fasting', 'Complete 50 fasts', 'epic', 'Mind', 'fasts', 50],
    ['fx-20', '🌘', 'Twenty hours', 'Complete a 20-hour fast', 'silver', 'Mind', 'fastMax', 20],
    ['fx-24', '🌑', 'Full-day fast', 'Complete a 24-hour fast', 'gold', 'Mind', 'fastMax', 24],
    ['bd-10', '✔️', 'Done & dusted', 'Move 10 cards to Done', 'bronze', 'Board', 'boardDone', 10],
    ['bd-50', '📤', 'Delivery', 'Move 50 cards to Done', 'silver', 'Board', 'boardDone', 50],
    ['bd-250', '🏗️', 'Builder', 'Move 250 cards to Done', 'epic', 'Board', 'boardDone', 250],
    ['nt-25', '✍️', 'Writer', 'Write 25 notes', 'silver', 'Board', 'notes', 25],
    ['nt-50', '📓', 'Author', 'Write 50 notes', 'gold', 'Board', 'notes', 50],
    ['bc-50', '🧷', 'Organiser', 'Create 50 cards on your board', 'bronze', 'Board', 'boardCards', 50],
    ['bc-100', '🗄️', 'Archivist', 'Create 100 cards on your board', 'silver', 'Board', 'boardCards', 100],
    ['lv-2', '🐣', 'Hatched', 'Reach level 2', 'bronze', 'Levels', 'level', 2],
    ['lv-3', '🌿', 'Sprout', 'Reach level 3', 'bronze', 'Levels', 'level', 3],
    ['lv-7', '🎲', 'Lucky seven', 'Reach level 7', 'silver', 'Levels', 'level', 7],
    ['lv-12', '🧗', 'Climber', 'Reach level 12', 'silver', 'Levels', 'level', 12],
    ['lv-25', '🪐', 'Orbit', 'Reach level 25', 'gold', 'Levels', 'level', 25],
    ['lv-35', '🔮', 'Oracle', 'Reach level 35', 'epic', 'Levels', 'level', 35],
    ['lv-40', '🌋', 'Volcanic', 'Reach level 40', 'epic', 'Levels', 'level', 40],
    ['lv-50', '🏰', 'Grandmaster', 'Reach level 50', 'epic', 'Levels', 'level', 50],
    ['col-10', '🎒', 'Starter pack', 'Unlock 10 badges', 'bronze', 'Levels', 'badgesUnlocked', 10],
    ['col-50', '🧳', 'Hoarder', 'Unlock 50 badges', 'gold', 'Levels', 'badgesUnlocked', 50],
    ['col-75', '🏺', 'Curator', 'Unlock 75 badges', 'epic', 'Levels', 'badgesUnlocked', 75],
    ['col-100', '🗝️', 'Keymaster', 'Unlock 100 badges', 'epic', 'Levels', 'badgesUnlocked', 100],
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
    fresh.slice(0, 3).forEach((b) => queue.push({ type: 'badge', b }));
    if (fresh.length > 3) setTimeout(() => PD.toast(`🏆 +${fresh.length - 3} more badges unlocked — see Achievements`), 1000);
    next();
  }

  function next() {
    if (showing || !queue.length) return;
    showing = true;
    const item = queue.shift();
    const el = document.createElement('div');
    if (item.type === 'level') {
      el.className = 'levelup';
      el.innerHTML = `<div class="levelup-inner"><span class="small">LEVEL UP</span><span class="medal-frame big"><span class="medal-ring"><div class="level-medal big"><b>${item.xp.level}</b></div></span></span><h2>${esc(item.xp.title)}</h2><p>${fmt.num(item.xp.total)} XP · next level at ${fmt.num(item.xp.to)}</p></div>`;
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
        <span class="medal-frame"><span class="medal-ring"><div class="level-medal" title="Level ${xp.level}"><b>${xp.level}</b></div></span></span>
        <div class="game-main">
          <div class="game-top"><h2>${esc(xp.title)} <span class="muted small">· level ${xp.level}</span></h2>${PD.rewards?.title() ? `<span class="title-pill">🏷️ ${esc(PD.rewards.title())}</span>` : ''}${xp.today ? `<span class="pill small mint">+${xp.today} XP today</span>` : ''}</div>
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

  let galShow = 'all';
  function gallery() {
    const { xp, badges: all } = state();
    const badges = all.filter((b) => galShow === 'all' || (galShow === 'done' ? b.done : !b.done));
    const cats = [...new Set(badges.map((b) => b.cat))];
    const SRC = { workouts: '🏋️ Workouts', strava: '🚴 Strava', habits: '✅ Habits', food: '🥗 Food logging', water: '💧 Water goals', focus: '🍅 Focus', fasting: '⏳ Fasting', tasks: '📋 Tasks & cards' };
    PD.modal('Achievements', `
      <div class="row gap"><span class="muted small grow">Each badge unlocks a reward: themes, celebrations, effects and more.</span><button class="btn sm" id="galLocker">🎁 Open Locker</button></div>
      <div class="xp-sources">${Object.entries(xp.src).filter(([, v]) => v).map(([k, v]) => `<span class="pill">${SRC[k]} <b>${fmt.num(v)}</b></span>`).join('')}</div>
      <div class="chips">${[['all', `All ${all.length}`], ['done', `✓ Unlocked ${all.filter((b) => b.done).length}`], ['todo', `🔒 To do ${all.filter((b) => !b.done).length}`]].map(([k, l]) => `<button class="chip${galShow === k ? ' active' : ''}" data-gal="${k}">${l}</button>`).join('')}</div>
      <p class="muted small">You earn XP for everything you log: workouts (more for longer and programme sessions), Strava activities, habits, food and water, focus sessions, fasts and finished tasks.</p>
      ${cats.map((c) => `<h3 class="sub">${esc(c)}</h3><div class="badge-grid">${badges.filter((b) => b.cat === c).map((b) => `
        <div class="badge-item ${b.done ? '' : 'locked'}">
          <div class="medal ${b.tier}${b.done ? ' shine' : ' locked'}"><span>${b.icon}</span></div>
          <b>${esc(b.name)}</b><span class="small muted">${esc(b.desc)}</span>
          ${PD.rewards?.forBadge(b.id) ? `<span class="gift small">🎁 ${esc(PD.rewards.forBadge(b.id).name)}</span>` : ''}
          ${b.done ? `<span class="small tier-${b.tier}">${b.tier[0].toUpperCase() + b.tier.slice(1)}${b.at ? ` · ${esc(fmt.dayMonth(PD.parseKey(b.at)))}` : ''}</span>`
            : `<span class="mini-bar"><i style="width:${(b.cur / b.target) * 100}%"></i></span><span class="small muted">${fmt.num(b.cur)} / ${fmt.num(b.target)}</span>`}
        </div>`).join('')}</div>`).join('')}`, (body, close) => {
      $('#galLocker', body).onclick = () => PD.rewards.locker();
      $$('[data-gal]', body).forEach((c) => (c.onclick = () => { galShow = c.dataset.gal; gallery(); }));
    }, 'wide');
  }

  PD.game = { compute, state, check, card, gallery, xpWorkout };
})(window.PD);
