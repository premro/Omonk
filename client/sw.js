const CACHE_NAME = 'lossless-studio-v8.19.13';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './player.js',
  './algorithm.js',
  './vibeEngine.js',
  './offline.js',
  './lyrics.js',
  './importer.js',
  './miniplayer.js',
  './manifest.json',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './app-icon.png',
  './favicon.png',
  './favicon.ico',
  './assets/silence.mp3',
  './assets/silence.m4a',
  './assets/beggin_madcon.jpg',
  './assets/omonk_logo.png',
  './assets/omonk_logo.jpg',
  './assets/hero_banner.jpg',
  './assets/foryou_friday.jpg',
  './assets/foryou_radar.jpg',
  './assets/foryou_finds.jpg',
  './assets/foryou_tamil50.jpg',
  './assets/foryou_mood.jpg',
  './assets/foryou_chill.jpg',
  './assets/foryou_latest_tamil.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(ASSETS.map((asset) => cache.add(asset).catch(() => null))))
      .then(() => {
        // Activate immediately only on fresh installs; updates wait for SKIP_WAITING so active playback is never interrupted
        if (!self.registration || !self.registration.active) {
          return self.skipWaiting();
        }
      })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME && k.startsWith('lossless-')).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Never intercept cross-origin CDN requests (audio streams, external artwork) or media/range requests
  if (url.origin !== self.location.origin || e.request.headers.has('range') || e.request.destination === 'audio' || e.request.destination === 'video') {
    return;
  }
  // Pass API, streaming, download, server, and Vercel Analytics requests straight to network
  if (
    url.pathname.includes('/api/') ||
    url.pathname.includes('/server/') ||
    url.pathname.startsWith('/_vercel/') ||
    url.pathname.includes('/stream') ||
    url.pathname.includes('/download') ||
    url.pathname.endsWith('.flac') ||
    url.pathname.endsWith('.wav')
  ) {
    return;
  }
  // Network first for core scripts, html, css, and json so updates take effect immediately
  const isNavigation = e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/app') || url.pathname.endsWith('.html');
  if (
    isNavigation ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.json')
  ) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            const cacheTarget = isNavigation ? './index.html' : e.request;
            caches.open(CACHE_NAME).then((cache) => cache.put(cacheTarget, clone));
          }
          return response;
        })
        .catch(() => caches.match(e.request).then((hit) => hit || (isNavigation ? caches.match('./index.html') : undefined)))
    );
    return;
  }
  // Cache first for heavy images/media assets
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request).then((netRes) => {
        if (netRes && netRes.status === 200) {
          const clone = netRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return netRes;
      });
    })
  );
});
