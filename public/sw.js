// Kill switch for a stale next-pwa service worker.
//
// PWA/service-worker generation is disabled in next.config.ts, but any
// browser that visited this app while it WAS enabled still has an old
// service worker registered at this scope. The browser refetches this exact
// URL (bypassing HTTP cache) on every navigation to check for byte changes —
// that check happens independently of whether the rest of the app's JS
// loads correctly, which is what makes this reliable even when the old SW
// is itself the thing serving a stale app shell. Once the browser sees this
// file differs from whatever it had, it installs it, and this immediately
// unregisters itself, clears every cache it can see, and forces every open
// tab to reload from network.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {}
      try {
        await self.registration.unregister();
      } catch {}
      try {
        const clientsList = await self.clients.matchAll({ type: 'window' });
        clientsList.forEach((client) => client.navigate(client.url));
      } catch {}
    })()
  );
});

// Never intercept fetches — always let the network handle everything.
self.addEventListener('fetch', () => {});
