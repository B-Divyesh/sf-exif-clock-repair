const CACHE = 'exif-clock-repair-v4';
const SHELL = ['/', '/index.html', '/offline.html', '/manifest.webmanifest', '/notebook-bench.webp', '/legal.css'];
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  const index = await fetch('/index.html', { cache: 'reload' });
  const markup = await index.clone().text();
  const builtAssets = [...markup.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)].map(m => m[1]);
  await Promise.all([...new Set([...SHELL, ...builtAssets])].map(async path => {
    const response = path === '/index.html' ? index : await fetch(path, { cache: 'reload' });
    if (!response.ok) throw new Error(`Could not cache ${path}`);
    await cache.put(path, response);
  }));
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  await Promise.all((await caches.keys()).filter(name => name.startsWith('exif-clock-repair-') && name !== CACHE).map(name => caches.delete(name)));
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (request.mode === 'navigate') {
      try {
        const response = await fetch(request); if (response.ok) await cache.put(request, response.clone()); return response;
      } catch { return (await cache.match(request, { ignoreSearch: true })) || (await cache.match('/index.html')) || (await cache.match('/offline.html')) || Response.error(); }
    }
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      return Response.error();
    }
  })());
});
