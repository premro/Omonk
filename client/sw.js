const CACHE_NAME = 'lossless-studio-v8.9.8';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/player.js',
  '/algorithm.js',
  '/vibeEngine.js',
  '/offline.js',
  '/lyrics.js',
  '/importer.js',
  '/miniplayer.js',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/app-icon.png',
  '/favicon.png',
  '/favicon.ico',
  '/assets/omonk_logo.png',
  '/assets/omonk_logo.jpg',
  '/assets/hero_banner.jpg',
  '/assets/foryou_friday.jpg',
  '/assets/foryou_radar.jpg',
  '/assets/foryou_finds.jpg',
  '/assets/foryou_tamil50.jpg',
  '/assets/foryou_mood.jpg',
  '/assets/foryou_chill.jpg',
  '/assets/foryou_latest_tamil.jpg'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Pass API and stream requests straight to network
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/server/')) {
    return;
  }
  // Network first for scripts, html, and css so updates take effect immediately
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.html') || url.pathname.endsWith('.css') || url.pathname === '/') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
