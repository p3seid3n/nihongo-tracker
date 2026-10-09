/* Nihongo Tracker service worker. The version and file list are filled in at build time. */
const VERSION = "__VERSION__";
const CACHE = "nt4-" + VERSION;
const PRECACHE = __PRECACHE__;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // fetch with cache: "reload" so we never pre-cache an old copy from the browser HTTP cache
      await Promise.all(
        PRECACHE.map(async ({ url }) => {
          const res = await fetch(new Request(url, { cache: "reload" }));
          if (!res.ok) throw new Error("precache failed: " + url);
          await cache.put(url, res);
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // remove every older cache, including the ones from previous app versions (nihongo-v3 etc.)
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API calls (Supabase) go straight to the network

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (req.mode === "navigate") {
        // single page app: always answer navigations with the cached shell of this build
        const shell = await cache.match("./", { ignoreVary: true });
        if (shell) return shell;
        try { return await fetch(req); } catch { return new Response("Offline", { status: 503 }); }
      }
      const hit = await cache.match(req, { ignoreSearch: true, ignoreVary: true });
      if (hit) return hit;
      try {
        const res = await fetch(req);
        return res;
      } catch {
        return new Response("", { status: 504 });
      }
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  if (event.data === "GET_VERSION") event.source?.postMessage({ type: "VERSION", version: VERSION });
});
