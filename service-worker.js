// Service Worker for MTG Commander Tracker PWA
const CACHE_NAME = 'mtg-commander-tracker-v23';
const STATIC_CACHE_NAME = 'mtg-commander-static-v23';

// Static assets to cache immediately (relative paths for GitHub Pages compatibility)
const STATIC_ASSETS = [
    './',
    './index.html',
    './renderer.js',
    './storage-adapter.js',
    './pwa-storage.js',
    './firebase-sync.js',
    './firebase-config.js',
    './manifest.json',
    './icons/Seasons-Past-Header.svg',
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js',
    'https://cdn.jsdelivr.net/npm/mana-font@latest/css/mana.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// API endpoints that use network-first strategy
const API_PATTERNS = [
    /api\.scryfall\.com/,
    /api2\.moxfield\.com/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http')))
                    .catch(err => console.log('Some assets failed to cache:', err));
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE_NAME)
                        .map((name) => {
                            console.log('Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Check if this is an API request
    const isApiRequest = API_PATTERNS.some(pattern => pattern.test(url.href));

    // Check if this is an HTML request (use network-first to ensure updates)
    const isHtmlRequest = event.request.headers.get('Accept')?.includes('text/html') ||
                          url.pathname.endsWith('.html') ||
                          url.pathname === '/' ||
                          url.pathname.endsWith('/');

    if (isApiRequest) {
        // Network-first strategy for API calls
        event.respondWith(networkFirstStrategy(event.request));
    } else if (isHtmlRequest) {
        // Network-first strategy for HTML to ensure updates are received
        event.respondWith(networkFirstStrategy(event.request));
    } else {
        // Cache-first strategy for other static assets (JS, CSS, images)
        event.respondWith(cacheFirstStrategy(event.request));
    }
});

// Cache-first strategy - try cache, fall back to network
async function cacheFirstStrategy(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);

        // Only cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('Network request failed:', error);

        // Return a fallback response for HTML requests
        if (request.headers.get('Accept')?.includes('text/html')) {
            return caches.match('./index.html');
        }

        throw error;
    }
}

// Network-first strategy - try network, fall back to cache
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);

        // Cache successful API responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('Network request failed, trying cache:', error);

        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}

// Handle messages from the main app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
