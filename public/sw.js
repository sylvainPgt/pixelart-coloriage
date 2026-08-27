const CACHE_VERSION = "v5";
const SHELL_CACHE = `mosaipix-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `mosaipix-runtime-${CACHE_VERSION}`;
const CACHE_NAMES = new Set([SHELL_CACHE, RUNTIME_CACHE]);
const RUNTIME_LIMIT = 60;
const APP_SHELL = [
  "/fr",
  "/en",
  "/fr/studio",
  "/en/studio",
  "/manifest.webmanifest",
  "/icon.svg",
  "/apple-icon.png",
  "/icons/mosaipix-192.png",
  "/icons/mosaipix-512.png",
  "/icons/mosaipix-maskable-512.png",
];

async function trimRuntimeCache() {
  const cache = await caches.open(RUNTIME_CACHE);
  const keys = await cache.keys();
  const excess = keys.length - RUNTIME_LIMIT;
  if (excess > 0) await Promise.all(keys.slice(0, excess).map((request) => cache.delete(request)));
}

async function precacheAppShell() {
  const cache = await caches.open(SHELL_CACHE);
  await cache.addAll(APP_SHELL);
  const pages = await Promise.all([cache.match("/fr"), cache.match("/fr/studio")]);
  const nextAssets = new Set(
    (await Promise.all(pages.filter(Boolean).map((page) => page.text())))
      .flatMap((html) => [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^\"]+)"/g)].map((match) => match[1])),
  );
  await Promise.all([...nextAssets].map(async (asset) => {
    try {
      await cache.add(asset);
    } catch {
      // One optional asset must not prevent the rest of the app from installing.
    }
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !CACHE_NAMES.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    const localePath = url.pathname.startsWith("/en") ? "/en" : "/fr";
    const pagePath = url.pathname.startsWith("/en/studio")
      ? "/en/studio"
      : url.pathname.startsWith("/fr/studio")
        ? "/fr/studio"
        : localePath;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(SHELL_CACHE).then((cache) => cache.put(pagePath, copy));
          }
          return response;
        })
        .catch(() => caches.match(pagePath).then((cached) => cached || caches.match(localePath)).then((cached) => cached || Response.error())),
    );
    return;
  }

  if (["font", "image", "script", "style"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(RUNTIME_CACHE)
            .then((cache) => cache.put(request, copy))
            .then(() => trimRuntimeCache());
        }
        return response;
      })),
    );
  }
});
