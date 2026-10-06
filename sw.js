/* Service worker: makes the dashboard installable and usable offline.
   App files: network-first for the page, stale-while-revalidate for scripts/styles/icons.
   Cross-origin APIs (weather, news, Google, Strava…) always go to the network. */
const VERSION = 'v5';
const CACHE = `daily-${VERSION}`;
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/util.js', './js/store.js', './js/fx.js', './js/charts.js', './js/exercises.js', './js/foods.js',
  './js/home.js', './js/health.js', './js/calendar.js', './js/diet.js', './js/workout.js', './js/programs.js',
  './js/google.js', './js/sync.js', './js/air.js', './js/scanner.js', './js/habits.js', './js/focus.js', './js/daily.js',
  './js/trains.js', './js/fasting.js', './js/review.js', './js/reminders.js', './js/palette.js', './js/polish.js', './js/settings.js', './js/app.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
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
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
