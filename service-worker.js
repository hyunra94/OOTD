const SW_VERSION = "paper-closet-pwa-v9-ootd-category-filter";
const SHELL_CACHE = `${SW_VERSION}-shell`;
const API_CACHE = `${SW_VERSION}-api`;
const MEDIA_CACHE = `${SW_VERSION}-media`;

const CACHE_PREFIX = "paper-closet-pwa-";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-192.png",
  "./icons/maskable-512.png"
];

const MAX_API_CACHE_ENTRIES = 20;
const MAX_MEDIA_CACHE_ENTRIES = 120;
const NETWORK_TIMEOUT_MS = 8000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, API_CACHE, MEDIA_CACHE]);
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && !keep.has(key))
        .map((key) => caches.delete(key))
    );

    await self.clients.claim();
    await notifyClients({ type: "SW_ACTIVATED", version: SW_VERSION });
  })());
});

self.addEventListener("message", (event) => {
  const type = event.data && event.data.type;

  if (type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (type === "CLEAR_SW_CACHE") {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX))
          .map((key) => caches.delete(key))
      );

      await caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL));
      await notifyClients({ type: "SW_CACHE_CLEARED", version: SW_VERSION });
    })());
    return;
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    return;
  }

  if (isApiGetRequest(url)) {
    event.respondWith(networkFirstWithCache(request, API_CACHE, () => offlineJsonResponse()));
    return;
  }

  if (isMediaRequest(request, url)) {
    event.respondWith(cacheFirstWithRefresh(request, MEDIA_CACHE, MAX_MEDIA_CACHE_ENTRIES));
  }
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
    const cache = await caches.open(SHELL_CACHE);
    cache.put("./", response.clone());
    cache.put("./index.html", response.clone());
    return response;
  } catch (error) {
    return (
      await caches.match("./index.html") ||
      await caches.match("./") ||
      new Response("Paper Closet offline", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function networkFirstWithCache(request, cacheName, fallbackFactory) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
    if (isCacheableResponse(response)) {
      await cache.put(request, response.clone());
      await trimCache(cacheName, MAX_API_CACHE_ENTRIES);
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      await notifyClients({ type: "SW_USED_OFFLINE_API_CACHE" });
      return cached;
    }
    return fallbackFactory();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (isCacheableResponse(response)) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || networkPromise || offlineAssetResponse();
}

async function cacheFirstWithRefresh(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const refreshPromise = fetch(request)
    .then(async (response) => {
      if (isCacheableResponse(response)) {
        await cache.put(request, response.clone());
        await trimCache(cacheName, maxEntries);
      }
      return response;
    })
    .catch(() => null);

  return cached || refreshPromise || offlineAssetResponse();
}

function fetchWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Network timeout")), timeoutMs);

    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function isApiGetRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isMediaRequest(request, url) {
  if (request.destination === "image") return true;
  if (url.pathname.startsWith("/media/")) return true;
  return /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(url.pathname);
}

function isCacheableResponse(response) {
  return response && (response.ok || response.type === "opaque");
}

function offlineJsonResponse() {
  return new Response(JSON.stringify({
    ok: false,
    offline: true,
    error: "오프라인 상태라 최신 데이터를 불러올 수 없어. 캐시된 데이터도 아직 없어.",
  }), {
    status: 503,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function offlineAssetResponse() {
  return new Response("", { status: 503, statusText: "Offline" });
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length <= maxEntries) return;

  await Promise.all(
    keys
      .slice(0, keys.length - maxEntries)
      .map((request) => cache.delete(request))
  );
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  clients.forEach((client) => client.postMessage(message));
}
