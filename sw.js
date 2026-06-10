/* Kessler Reach service worker — offline play after first visit.
   Bump VERSION on every deploy (keep in sync with ?v= asset params). */
const VERSION = 'kr-210';
const CORE = [
  './',
  'index.html',
  'css/style.css?v=210',
  'js/data.js?v=210',
  'js/world.js?v=210',
  'js/game.js?v=210',
  'lib/three.min.js',
  'icon.svg',
  'manifest.webmanifest',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(url.origin !== location.origin || e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, {ignoreSearch:false}).then(hit => {
      if(hit) return hit;
      return fetch(e.request).then(res => {
        if(res.ok){
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => {
        if(e.request.mode === 'navigate') return caches.match('./');
      });
    })
  );
});
