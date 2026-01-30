const CACHE_NAME = 'remoteiq-v1';
const STATIC_ASSETS = [
    '/RemoteIQ-Mobile-App/',
    '/RemoteIQ-Mobile-App/index.html',
    '/RemoteIQ-Mobile-App/dashboard.html',
    '/RemoteIQ-Mobile-App/device.html',
    '/RemoteIQ-Mobile-App/css/styles.css',
    '/RemoteIQ-Mobile-App/js/api.js',
    '/RemoteIQ-Mobile-App/js/app.js'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests and API calls
    if (event.request.method !== 'GET') return;
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            // Return cached version or fetch from network
            const fetched = fetch(event.request).then((response) => {
                // Cache successful responses
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(() => cached);

            return cached || fetched;
        })
    );
});
