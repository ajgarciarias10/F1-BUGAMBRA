/*
 * Service worker de F1 Bugambra.
 *
 * Estrategia:
 *  - Navegaciones: red primero, con el index.html cacheado como respaldo offline.
 *  - /assets/* (hash en el nombre): caché primero, son inmutables.
 *  - Iconos y manifest: caché con revalidación en segundo plano.
 *  - Firestore, Auth, Storage y cualquier API: nunca se tocan, van siempre a red.
 *
 * Sube SW_VERSION al cambiar este archivo para forzar la limpieza de cachés viejas.
 */
const SW_VERSION = "v1";
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

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    // Guardamos la última copia buena del shell para el modo offline.
    if (response.ok) cache.put("/", response.clone());
    return response;
  } catch (error) {
    const cached = (await cache.match(request)) || (await cache.match("/"));
    if (cached) return cached;
    throw error;
  }
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
    event.respondWith(networkFirstNavigation(request));
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
