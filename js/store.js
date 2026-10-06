/* Tiny localStorage-backed store. Everything lives in this browser only. */
(function (PD) {
  const PREFIX = 'pd.';

  const DEFAULTS = {
    settings: {
      name: '',
      theme: 'auto',
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

  const listeners = new Set();
  function save(key) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(cache[key])); } catch (e) { PD.toast('Could not save: storage full or blocked'); }
    listeners.forEach((fn) => fn(key));
  }
  function set(key, value) { cache[key] = value; save(key); }
  const onChange = (fn) => listeners.add(fn);

  function exportAll() {
    const out = { app: 'personal-dashboard', version: 1, exported: new Date().toISOString() };
    Object.keys(DEFAULTS).forEach((k) => { out[k] = get(k); });
    // Never put Strava secrets in a backup file.
    out.strava = { ...out.strava, clientSecret: '', accessToken: '', refreshToken: '', expiresAt: 0 };
    return JSON.stringify(out, null, 2);
  }
  function importAll(json) {
    const data = JSON.parse(json);
    if (data.app !== 'personal-dashboard') throw new Error('Not a dashboard backup file');
    Object.keys(DEFAULTS).forEach((k) => {
      if (!data[k]) return;
      if (k === 'strava') set(k, { ...get('strava'), ...data[k], clientSecret: get('strava').clientSecret, accessToken: get('strava').accessToken, refreshToken: get('strava').refreshToken, expiresAt: get('strava').expiresAt });
      else set(k, data[k]);
    });
  }
  function resetAll() {
    Object.keys(DEFAULTS).forEach((k) => { localStorage.removeItem(PREFIX + k); delete cache[k]; });
  }

  PD.store = { get, save, set, onChange, exportAll, importAll, resetAll, DEFAULTS };
})(window.PD);
