/* Tiny localStorage-backed store. Everything lives in this browser only. */
(function (PD) {
  const PREFIX = 'pd.';

  function defaultRoutines() {
    let n = 0;
    const R = (name, emoji, color, rounds, rest, roundRest, items) => ({
      id: `r${++n}`, name, emoji, color, rounds, rest, roundRest, created: 0,
      items: items.map(([ex, mode, value, side]) => ({ id: `${n}-${ex}`, ex, mode, value, side: !!side })),
    });
    return [
      R('7-Minute Classic', '⚡', 'violet', 1, 10, 0, [
        ['jacks', 'time', 30], ['wallsit', 'time', 30], ['pushup', 'time', 30], ['crunch', 'time', 30], ['stepup', 'time', 30],
        ['squat', 'time', 30], ['dips', 'time', 30], ['plank', 'time', 30], ['highknees', 'time', 30], ['lunge', 'time', 30],
        ['taps', 'time', 30], ['sideplank', 'time', 15, true]]),
      R('Full Body HIIT', '💥', 'peach', 3, 20, 60, [
        ['burpee', 'time', 40], ['climber', 'time', 40], ['jumpsquat', 'time', 40], ['pushup', 'time', 40], ['highknees', 'time', 40], ['updown', 'time', 40]]),
      R('Core Crusher', '🔥', 'pink', 2, 15, 45, [
        ['plank', 'time', 40], ['bicycle', 'time', 30], ['legraise', 'reps', 12], ['twist', 'time', 30], ['deadbug', 'reps', 8, true], ['hollow', 'time', 20]]),
      R('Lower Body Burn', '🦵', 'mint', 3, 20, 60, [
        ['squat', 'reps', 15], ['lunge', 'reps', 10, true], ['bridge', 'reps', 15], ['jumpsquat', 'reps', 10], ['wallsit', 'time', 45], ['calf', 'reps', 20]]),
      R('Upper Body Strength', '💪', 'sky', 3, 30, 60, [
        ['pushup', 'reps', 12], ['pike', 'reps', 8], ['dips', 'reps', 12], ['taps', 'time', 30], ['superman', 'reps', 12]]),
      R('Band Strength', '🎗️', 'pink', 3, 30, 60, [
        ['b-squat', 'reps', 15], ['b-row', 'reps', 15], ['b-press', 'reps', 12], ['b-goodmorning', 'reps', 12], ['b-pullapart', 'reps', 15], ['b-curl', 'reps', 15]]),
      R('Head to Toe', '🧍', 'peach', 2, 20, 60, [
        ['widepush', 'reps', 10], ['yraise', 'reps', 12], ['chairless-dip', 'reps', 12], ['sideplankdip', 'reps', 10, true], ['heeltap', 'time', 30],
        ['curtsy', 'reps', 10, true], ['slbridge', 'reps', 10, true], ['sidelegraise', 'reps', 12, true], ['slcalf', 'reps', 15, true], ['bearcrawl', 'time', 30]]),
      R('Morning Mobility', '🌅', 'mint', 1, 5, 0, [
        ['catcow', 'time', 40], ['child', 'time', 40], ['cobra', 'time', 30], ['hipflexor', 'time', 30, true], ['toetouch', 'time', 30], ['sidebend', 'time', 30], ['armcircle', 'time', 30]]),
    ];
  }

  const DEFAULTS = {
    settings: {
      name: '',
      theme: 'auto',
      palette: 'aurora',
      location: { name: 'Westerlo, Belgium', lat: 51.0906, lon: 4.9164 },
      feeds: [
        { id: 'vrt', name: 'VRT NWS', url: 'https://www.vrt.be/vrtnws/nl.rss.articles.xml', enabled: true },
        { id: 'hln', name: 'HLN', url: 'https://www.hln.be/home/rss.xml', enabled: true },
        { id: 'sporza', name: 'Sporza', url: 'https://sporza.be/nl.rss.xml', enabled: true },
        { id: 'bbc', name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', enabled: true },
        { id: 'tweakers', name: 'Tweakers', url: 'https://feeds.feedburner.com/tweakers/mixed', enabled: false },
      ],
    },
    tasks: [],            // [{id, text, done, date}]
    habits: {
      list: [
        { id: 'h-water', name: 'Drink enough water', emoji: '💧', auto: 'water' },
        { id: 'h-move', name: 'Workout or 10k steps', emoji: '🏃', auto: 'move' },
        { id: 'h-read', name: 'Read 20 minutes', emoji: '📖' },
        { id: 'h-mind', name: 'Meditate or breathe', emoji: '🧘' },
        { id: 'h-sleep', name: 'In bed before 23:00', emoji: '🌙' },
      ],
      log: {},            // { 'YYYY-MM-DD': [habitId…] } manual check-ins
    },
    journal: {},          // { 'YYYY-MM-DD': { mood: 1-5, note } }
    focus: { work: 25, brk: 5, sessions: [] }, // sessions: [{id, date, start, minutes, label, taskId}]
    fasting: { goal: 16, active: null, history: [] }, // active: {start, goal}; history: [{id, start, end, goal}]
    board: {
      columns: [
        { id: 'todo', name: 'To do', color: 'sky' },
        { id: 'doing', name: 'In progress', color: 'peach' },
        { id: 'done', name: 'Done', color: 'mint' },
      ],
      cards: [],          // [{id, col, title, notes, due, label, order, created, doneAt}]
    },
    notes: { list: [] },  // [{id, title, body, color, pinned, created, updated}]
    game: { unlocked: {}, level: 0, init: false }, // achievements unlocked {badgeId: date}
    spotify: { clientId: '', accessToken: '', refreshToken: '', expiresAt: 0, user: '' }, // never synced or exported
    events: [],           // [{id, title, date, time, type: event|task|birthday, notes, done}]
    diet: {
      targets: { kcal: 2000, protein: 120, carbs: 230, fat: 70, water: 8 },
      log: {},            // { 'YYYY-MM-DD': [{id, meal, name, grams, kcal, p, c, f}] }
      water: {},          // { 'YYYY-MM-DD': glasses }
      myFoods: [],        // [{id, name, kcal, p, c, f, portion, portionG}] per 100 g
      recent: [],         // recent food snapshots for quick re-adding
      profile: { sex: 'm', age: 30, height: 180, weight: 80, activity: 1.375, goal: -500 },
    },
    health: {
      weight: {},         // { date: kg }
      daily: {},          // { date: { steps, sleep, rhr } }
      stepGoal: 10000,
      weightGoal: null,
    },
    workouts: {
      routines: defaultRoutines(),
      log: [],            // [{id, routineId, name, emoji, date, start, duration, active, kcal, exercises, rating, partial}]
      custom: [],         // user-made exercises
      media: {},          // { exerciseId: url } own video / GIF links
      weeklyGoal: 3,
      migrations: [],
      prefs: { voice: true, sound: true, getReady: 10 },
      programs: [],       // custom multi-week programs
      enrolled: null,     // { programId, start, days: [weekday…], done: [sessionIndex…], logs: {index: logId} }
      programHistory: [], // finished programs
    },
    cloud: {              // never synced or exported: your own sync server + the key for this browser
      url: '', key: '', on: true, version: 0, synced: {}, lastSync: 0,
    },
    google: {             // never synced or exported: credentials for this browser only
      clientId: '', clientSecret: '', accessToken: '', refreshToken: '', expiresAt: 0, email: '',
      calendars: [], calendarOn: true, syncOn: true, fileId: '', synced: {}, lastSync: 0,
    },
    strava: {
      clientId: '', clientSecret: '',
      accessToken: '', refreshToken: '', expiresAt: 0,
      athlete: null, stats: null, activities: [], lastSync: 0,
    },
  };

  const cache = {};

  function get(key) {
    if (cache[key]) return cache[key];
    let val;
    try { val = JSON.parse(localStorage.getItem(PREFIX + key)); } catch { val = null; }
    const def = structuredClone(DEFAULTS[key]);
    if (val == null) val = def;
    else if (def && typeof def === 'object' && !Array.isArray(def)) val = { ...def, ...val };
    cache[key] = val;
    return val;
  }

  /* last-modified time per key, used by sync to know what changed where */
  let meta;
  function getMeta() {
    if (!meta) { try { meta = JSON.parse(localStorage.getItem(`${PREFIX}meta`)) || {}; } catch { meta = {}; } }
    return meta;
  }
  /** When was this key last changed here? Data from before sync existed counts as "very old" (1). */
  const modified = (key) => getMeta()[key] || (localStorage.getItem(PREFIX + key) ? 1 : 0);
  function touch(key, t) { getMeta()[key] = t; try { localStorage.setItem(`${PREFIX}meta`, JSON.stringify(meta)); } catch { /* ignore */ } }

  const listeners = new Set();
  function save(key, opts = {}) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(cache[key])); } catch (e) { PD.toast('Could not save: storage full or blocked'); }
    touch(key, opts.t || Date.now());
    listeners.forEach((fn) => fn(key, opts));
  }
  /** Replace a key with data that came from another device (keeps its timestamp). */
  function setFromSync(key, value, t) { cache[key] = value; save(key, { t, fromSync: true }); }
  function set(key, value) { cache[key] = value; save(key); }
  const onChange = (fn) => listeners.add(fn);

  function exportAll() {
    const out = { app: 'personal-dashboard', version: 1, exported: new Date().toISOString() };
    Object.keys(DEFAULTS).forEach((k) => { out[k] = get(k); });
    // Never put Strava or Google credentials in a backup file.
    out.strava = { ...out.strava, clientSecret: '', accessToken: '', refreshToken: '', expiresAt: 0 };
    delete out.google; delete out.spotify; delete out.cloud;
    return JSON.stringify(out, null, 2);
  }
  function importAll(json) {
    const data = JSON.parse(json);
    if (data.app !== 'personal-dashboard') throw new Error('Not a dashboard backup file');
    Object.keys(DEFAULTS).forEach((k) => {
      if (!data[k] || k === 'google' || k === 'spotify' || k === 'cloud') return;
      if (k === 'strava') set(k, { ...get('strava'), ...data[k], clientSecret: get('strava').clientSecret, accessToken: get('strava').accessToken, refreshToken: get('strava').refreshToken, expiresAt: get('strava').expiresAt });
      else set(k, data[k]);
    });
  }
  function resetAll() {
    Object.keys(DEFAULTS).forEach((k) => { localStorage.removeItem(PREFIX + k); delete cache[k]; });
    localStorage.removeItem(`${PREFIX}meta`); meta = null;
  }

  /* one-time additions for data created by an older version (never removes anything) */
  function migrate() {
    const w = get('workouts');
    w.migrations = w.migrations || [];
    if (!w.migrations.includes('band-routine')) {
      const r = defaultRoutines().find((x) => x.name === 'Band Strength');
      // only write when something actually changes, so a fresh device doesn't look "edited" to sync
      if (r && localStorage.getItem(`${PREFIX}workouts`) && !w.routines.some((x) => x.name === r.name)) {
        w.routines.push({ ...r, id: `r-band-${Date.now().toString(36)}` });
        w.migrations.push('band-routine'); save('workouts');
      }
    }
    if (!w.migrations.includes('h2t-routine')) {
      const r = defaultRoutines().find((x) => x.name === 'Head to Toe');
      if (r && localStorage.getItem(`${PREFIX}workouts`) && !w.routines.some((x) => x.name === r.name)) {
        w.routines.push({ ...r, id: `r-h2t-${Date.now().toString(36)}` });
        w.migrations.push('h2t-routine'); save('workouts');
      }
    }
  }

  PD.store = { get, save, set, setFromSync, modified, onChange, exportAll, importAll, resetAll, migrate, DEFAULTS };
})(window.PD);
