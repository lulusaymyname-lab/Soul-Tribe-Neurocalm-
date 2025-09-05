// A unique name for the cache
const CACHE_NAME = 'neurocalm-v1';

// The assets that will be cached automatically
// This list is tailored to the single-file structure of the app.
const ASSETS = [
  '/',
  'index.html',
  'offline.html'
];

// --- EVENT LISTENERS ---

// 1. INSTALL: Triggered when the service worker is first installed.
// It opens the cache and adds the core assets to it.
self.addEventListener('install', evt => {
  // waitUntil() ensures the service worker won't install until the code inside has successfully completed.
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Caching core assets...');
      return cache.addAll(ASSETS);
    }).catch(err => {
        console.error('Service Worker: Caching failed', err);
    })
  );
});

// 2. ACTIVATE: Triggered when the service worker is activated.
// This is a good place to manage old caches.
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys => {
      // Deletes any old caches that don't match the current CACHE_NAME.
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// 3. FETCH: Triggered for every network request made by the page.
// This is where we define how to respond to requests (e.g., from cache or network).
self.addEventListener('fetch', evt => {
  const isNavigation = (evt.request.mode === 'navigate' || evt.request.destination === 'document');

  evt.respondWith(
    // First, try to find a matching response in the cache.
    caches.match(evt.request).then(cachedResponse => {
      // If a cached response is found, return it.
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, try to fetch it from the network.
      return fetch(evt.request)
        .then(networkResponse => {
          // If the fetch is successful, cache the new response for future offline use.
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(evt.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(error => {
          // If the network fetch fails (e.g., user is offline):
          // For page navigation requests, show the 'offline.html' page.
          if (isNavigation && ASSETS.includes('offline.html')) {
            return caches.match('offline.html');
          }
          // For other failed requests (like images or API calls), return a generic error.
          return new Response("Network unavailable / Item not cached", {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
    })
  );
});

