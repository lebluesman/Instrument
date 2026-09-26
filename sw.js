/* Service worker : rend l'application installable et utilisable hors connexion.
   À chaque nouvelle version, changer VERSION ici ET les ?v= dans index.html. */
const VERSION = '4.1';
const CACHE = 'fretboard-' + VERSION;
// Bibliothèque externe de partitions (version figée dans l'URL) : cache séparé, gardé entre les versions
const LIB_CACHE = 'lib-abcjs';
const LIB_PREFIX = 'https://cdn.jsdelivr.net/npm/abcjs@';
const CORE = [
    './',
    './style.css?v=' + VERSION,
    './app.js?v=' + VERSION,
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k.startsWith('fretboard-') && k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;

    // abcjs (lecteur de partitions) : cache d'abord, pour fonctionner hors ligne après la première utilisation
    if (req.url.startsWith(LIB_PREFIX)) {
        event.respondWith(
            caches.open(LIB_CACHE).then(c => c.match(req).then(cached => cached || fetch(req).then(res => {
                if (res.ok || res.type === 'opaque') c.put(req, res.clone());
                return res;
            })))
        );
        return;
    }
    if (new URL(req.url).origin !== self.location.origin) return;

    // Pages : réseau d'abord, sans le cache HTTP (pour recevoir les mises à jour tout de suite), cache si hors ligne
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
                .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
                .catch(() => caches.match(req).then(r => r || caches.match('./')))
        );
        return;
    }

    // Fichiers (versionnés) : cache d'abord
    event.respondWith(
        caches.match(req).then(cached => cached || fetch(req).then(res => {
            if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
            return res;
        }))
    );
});
