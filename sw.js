/* Reads with Colin · Service Worker (PWA) · rwc-pwa-v1
 * 策略：页面与数据「网络优先」（保证部署后立刻看到新内容），
 *       静态资源（css/js/img/covers）「缓存优先」（离线可读）。
 * 部署新版时请把下方 CACHE 版本号 +1，旧缓存会在 activate 时自动清理。
 */
const CACHE = 'rwc-pwa-v1';
const CORE = [
  './',
  './index.html',
  './archive.html',
  './categories.html',
  './about.html',
  './3-2-1.html',
  './offline.html',
  './manifest.webmanifest',
  './img/icon-192.png',
  './img/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 文章数据：网络优先，失败回退缓存（保证部署后不是旧内容）
  if (url.pathname.endsWith('/data/posts.json') || url.pathname.endsWith('posts.json')) {
    event.respondWith(networkFirst(req));
    return;
  }

  // 导航请求（HTML 页面）：网络优先，失败回退缓存首页 / 离线页
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(req).then((r) => r || caches.match('./index.html')).then((r) => r || caches.match('./offline.html'))
      )
    );
    return;
  }

  // 静态资源：缓存优先，缺失则网络拉取并补缓存
  event.respondWith(cacheFirst(req));
});

function cacheFirst(req) {
  return caches.match(req).then((cached) => {
    if (cached) return cached;
    return fetch(req).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => cachedOffline(req));
  });
}

function networkFirst(req) {
  return fetch(req)
    .then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })
    .catch(() => caches.match(req));
}

function cachedOffline(req) {
  if (req.mode === 'navigate') return caches.match('./offline.html');
  return undefined;
}
