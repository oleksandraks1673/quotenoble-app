// Keep installed apps on the current live document exporter.
// App records remain in their existing storage; only obsolete shell caches are removed.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('quotenoble-shell-')) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
// Requests use the network normally; do not serve cached HTML or account data.
