/* Only public, same-origin static files enter these caches. Never store user data. */
const CACHE_PREFIX = "tutorflow-pwa-";
const SHELL_CACHE = `${CACHE_PREFIX}shell-v1`;
const STATIC_CACHE = `${CACHE_PREFIX}static-v1`;
const OFFLINE = "/offline.html";
const SHELL = [OFFLINE, "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png", "/icons/apple-touch-icon.png"];
const PUBLIC_ASSETS = new Set([...SHELL, "/favicon.svg", "/asset-watercolor-wash.png", "/asset-tutorflow-cup.png", "/asset-note-paper.png", "/asset-lavender-sprig.png", "/asset-books-lavender.png"]);
const APP_PAGE = /^\/(?:$|login\/?$|schedule\/?$|payments\/?$|statistics\/?$|students(?:\/[^/]+)?\/?$)/;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL)));
  // An update waits until existing app windows close; no forced reload during payment entry.
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== SHELL_CACHE && key !== STATIC_CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request, url = new URL(request.url);
  // Includes Auth, Firestore, Storage, token refresh, Firebase hosting helpers and APIs.
  if (request.method !== "GET" || url.origin !== self.location.origin || request.headers.has("authorization") || url.pathname.startsWith("/__/")) return;
  if (request.mode === "navigate" && APP_PAGE.test(url.pathname)) {
    // Online pages always come from the server. Offline users get a data-free shell.
    event.respondWith(fetch(request).catch(async () => (await caches.open(SHELL_CACHE)).match(OFFLINE)));
    return;
  }
  const buildAsset = url.pathname.startsWith("/_next/static/") && /\.(?:js|css|woff2?|png|svg|webp|ico)$/.test(url.pathname);
  if (!PUBLIC_ASSETS.has(url.pathname) && !buildAsset) return;
  if (request.headers.has("rsc") || request.headers.has("next-router-prefetch")) return;
  event.respondWith((async () => {
    const shell = await caches.open(SHELL_CACHE);
    const cache = await caches.open(STATIC_CACHE);
    const hit = await shell.match(request) || await cache.match(request);
    if (hit) return hit;
    const response = await fetch(request);
    if (response.ok && response.type === "basic" && !response.redirected && !/no-store|private/i.test(response.headers.get("cache-control") || "")) {
      await cache.put(request, response.clone());
      const keys = await cache.keys();
      await Promise.all(keys.slice(0, Math.max(0, keys.length - 100)).map(key => cache.delete(key)));
    }
    return response;
  })());
});
