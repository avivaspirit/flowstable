// Flow's Table Service Worker — offline caching
const CACHE = "flowstable-v2";
const ASSETS = [
  "/",
  "/index.html",
  "/articles.html",
  "/flow-society.html",
  "/guests.html",
  "/reels.html",
  "/about.html",
  "/assets/styles.min.css",
  "/assets/site.min.js",
  "/assets/site-config.js",
  "/assets/sanity-client.js",
  "/manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Only handle GET
  if (e.request.method !== "GET") return;
  
  // Network-first for HTML, cache-first for assets
  if (e.request.mode === "navigate" || e.request.destination === "document") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else if (e.request.destination === "image" || e.request.destination === "style" || e.request.destination === "script") {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        return cached || fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        });
      })
    );
  }
});
