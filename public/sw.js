// Minimal service worker — required for Chrome's "Add to Home Screen" to
// offer full standalone install. No offline caching logic needed for this app.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {}); // no-op passthrough
