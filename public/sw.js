const CACHE = 'greenteam-v1';
const FILES = [
    '/', '/index.html', '/dashboard.html', '/water.html', '/plant.html',
    '/css/style.css',
    '/js/i18n.js', '/js/api.js', '/js/login.js', '/js/dashboard.js',
    '/js/water.js', '/js/plant.js', '/js/queue.js', '/js/sync.js',
    '/manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// pages and scripts: internet first, saved copy when offline. API calls are never touched here.
self.addEventListener('fetch', (e) => {
    const req = e.request;
    const url = new URL(req.url);
    if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

    e.respondWith(
        fetch(req)
            .then(res => {
                if (res.ok) {
                    const copy = res.clone();
                    caches.open(CACHE).then(c => c.put(req, copy));
                }
                return res;
            })
            .catch(() => caches.match(req, { ignoreSearch: true }))
    );
});