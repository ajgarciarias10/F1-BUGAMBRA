/*
 * Service worker de F1 Bugambra.
 *
 * Estrategia:
 *  - Navegaciones: se sirve el shell cacheado al instante y se revalida por
 *    detrás. Esperar al index.html por red antes de empezar a bajar el JS
 *    añadía medio segundo largo a cada apertura en móvil.
 *  - /assets/* (hash en el nombre): caché primero, son inmutables.
 *  - Iconos y manifest: caché con revalidación en segundo plano.
 *  - Firestore, Auth, Storage y cualquier API: nunca se tocan, van siempre a red.
 *
 * Sube SW_VERSION al cambiar este archivo para forzar la limpieza de cachés viejas.
 */
const SW_VERSION = "v2";
const SHELL_CACHE = `bugambra-shell-${SW_VERSION}`;
const ASSET_CACHE = `bugambra-assets-${SW_VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE];

const SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

// Dominios que jamás deben pasar por caché: datos en vivo y sesión.
const NEVER_CACHE_HOSTS = [
  "firestore.googleapis.com",
  "firebasestorage.googleapis.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com",
  "www.googleapis.com",
  "firebaseinstallations.googleapis.com",
  "decapi.me",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // addAll falla entera si un recurso da 404: cacheamos uno a uno.
      .then((cache) => Promise.all(SHELL_URLS.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !CURRENT_CACHES.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isNeverCached(url) {
  return NEVER_CACHE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

async function shellFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match("/");

  // La revalidación va aparte: si se esperase a ella no habría ganancia alguna.
  const fresca = fetch(request)
    .then(response => {
      if (response.ok) cache.put("/", response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    // Que la revalidación siga viva aunque ya hayamos respondido.
    fresca.catch(() => {});
    return cached;
  }

  // Primera visita: no hay shell todavía, toca esperar a la red.
  const response = await fresca;
  if (response) return response;
  throw new Error("Sin conexión y sin shell en caché");
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (isNeverCached(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(shellFirstNavigation(request));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest" || url.pathname === "/favicon.ico") {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  }
});
