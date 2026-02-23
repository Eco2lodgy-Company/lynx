const CACHE_NAME = 'ecotech-cache-v2';
const ASSETS_TO_CACHE = [
    '/lynx/manifest.json',
    '/lynx/icon.svg',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete ALL old cache versions
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // CRITICAL: Never intercept API calls, auth routes, or cross-origin requests
    if (
        event.request.method !== 'GET' ||
        url.pathname.includes('/api/') ||
        url.pathname.includes('/auth/') ||
        url.origin !== self.location.origin
    ) {
        return; // Let the browser handle it natively
    }

    // Only serve from cache for static assets
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
