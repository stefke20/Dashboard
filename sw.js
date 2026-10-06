/* Service worker: makes the dashboard installable and usable offline.
   App files are fetched network-first (so updates always arrive together) and fall back to the cache offline.
   Cross-origin APIs (weather, news, Google, Strava…) always go to the network. */
const VERSION = 'v15';
const CACHE = `daily-${VERSION}`;
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/util.js', './js/store.js', './js/fx.js', './js/charts.js', './js/exercises.js', './js/foods.js',
  './js/home.js', './js/health.js', './js/calendar.js', './js/diet.js', './js/workout.js', './js/programs.js', './js/random.js', './js/tour.js',
  './js/google.js', './js/cloud.js', './js/sync.js', './js/air.js', './js/scanner.js', './js/habits.js', './js/focus.js', './js/daily.js',
  './js/fasting.js', './js/board.js', './js/game.js', './js/rewards.js', './js/spotify.js', './js/seasons.js', './js/review.js', './js/reminders.js', './js/palette.js', './js/polish.js', './js/mole.js', './js/settings.js', './js/app.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' skips the browser's HTTP cache, so a new version never stores old files
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('daily-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !fonts) return; // APIs: straight to the network
  if (url.search.includes('state=') || url.search.includes('code=')) return; // OAuth redirects

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async (c) => {
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    } catch {
      return (await c.match(req, { ignoreSearch: true })) || Response.error();
    }
  }));
});
