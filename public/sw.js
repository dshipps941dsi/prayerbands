// Minimal service worker. Its purpose is to make the app installable (browsers
// require a registered SW with a fetch handler) — it intentionally does NOT
// cache aggressively, since the app's content is dynamic and personal.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => { /* pass through to the network */ })
