// ⚠️ FONTOS: Minden feltöltés előtt növeld a verziószámot! (v1 → v2 → v3...)
const CACHE_VERSION = 'v9';
const CACHE_NAME = `frissido-${CACHE_VERSION}`;

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './logo.png',
    './manifest.json',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Telepítés
self.addEventListener('install', event => {
    console.log('🔧 Service Worker telepítése:', CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.warn('⚠️ Néhány fájl nem cache-elhető:', err);
            });
        })
    );
    self.skipWaiting();
});

// Aktiválás - régi cache törlése
self.addEventListener('activate', event => {
    console.log('✅ Service Worker aktiválva:', CACHE_VERSION);
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Régi cache törlése:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch stratégia
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // API és csempe hívásokat ne cache-eljük
    if (url.includes('api.openweathermap.org') ||
        url.includes('api.rainviewer.com') ||
        url.includes('tile.openweathermap.org') ||
        url.includes('basemaps.cartocdn.com') ||
        url.includes('tilecache.rainviewer.com') ||
        url.includes('openweathermap.org/img')) {
        return;
    }

    // Saját fájlok (HTML, CSS, JS) → NETWORK-FIRST
    if (url.includes(self.location.origin)) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response && response.status === 200 && event.request.method === 'GET') {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request).then(cached => {
                        if (cached) return cached;
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                    });
                })
        );
        return;
    }

    // Külső erőforrások → CACHE-FIRST
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).then(fetchResponse => {
                if (fetchResponse && fetchResponse.status === 200) {
                    const responseClone = fetchResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return fetchResponse;
            });
        })
    );
});