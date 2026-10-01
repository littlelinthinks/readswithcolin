/* READS WITH COLIN OS — Service Worker
 * 策略：App Shell 预缓存 + stale-while-revalidate
 * 目标：飞机上、地铁里、断网时依然能记录
 */
const CACHE = 'rwc-os-v5';
const SHELL = [
  './', './index.html', './app.css', './manifest.webmanifest',
  './js/app.js', './js/db.js', './js/store.js', './js/views.js', './js/ui.js', './js/xlsxio.js', './js/seed.js',
  './js/ai.js', './js/sync.js',
  './vendor/xlsx.full.min.js', './vendor/d3.v7.min.js',
  './img/icon-192.png', './img/icon-512.png', './img/logo-rwc.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(
    ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    const net = fetch(req).then((res) => {
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  })());
});
