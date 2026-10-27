/* Service worker: caches the app shell so the app opens instantly and works offline.
   Your data is never touched here — it lives in localStorage, not in this cache.
   Strategy: stale-while-revalidate for same-origin GETs (serve the cached copy, refresh it in the
   background, so a new version shows up on the next launch). Bump VERSION on each release to
   drop old caches and re-precache. */
const VERSION = 'v3.14.0';
const CACHE = `finance-tracker-${VERSION}`;
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'js/vendor/chart.umd.min.js',
  'js/core/utils.js', 'js/core/projection.js', 'js/core/store.js', 'js/core/chart-plugins.js', 'js/core/icons.js', 'js/core/income.js',
  'js/views/overview.js', 'js/views/projections.js', 'js/views/cashflow.js', 'js/app.js', 'js/pwa.js',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/icon-maskable-512.png', 'assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('finance-tracker-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      return cached || (await network) || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
    })
  );
});
