/* Service worker de Bum: la app funciona sin conexión y guarda en caché teselas y datos. */
const VERSION = 'bum-v1.22';
const SHELL = `${VERSION}-shell`;
// teselas y datos se conservan entre versiones: sólo se renueva la propia aplicación
const TILES = 'bum-tiles';
const DATA = 'bum-data';
const MAX_TILES = 4000;

self.addEventListener('install', (e) => {
  // «reload»: sin pasar por la caché HTTP del navegador (GitHub Pages la guarda 10 minutos)
  const urls = ['./', './index.html', './favicon.svg', './manifest.webmanifest'].map((u) => new Request(u, { cache: 'reload' }));
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(urls)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSION) && k !== TILES && k !== DATA).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const TILE_HOSTS = ['server.arcgisonline.com', 'tiles.openfreemap.org', 'elevation-tiles-prod', 's3.amazonaws.com', 'tile.openstreetmap.org', 'tiles.maps.eox.at'];
let trimming = false;
async function trim() {
  if (trimming) return; trimming = true;
  try { const c = await caches.open(TILES); const ks = await c.keys(); for (let i = 0; i < ks.length - MAX_TILES; i++) await c.delete(ks[i]); } finally { trimming = false; }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // teselas: primero la caché
  if (TILE_HOSTS.some((h) => url.hostname.includes(h))) {
    e.respondWith(caches.open(TILES).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') { c.put(req, res.clone()); trim(); }
      return res;
    }));
    return;
  }
  // tiempo, búsqueda y población: primero la red, la caché si no hay conexión
  if (url.hostname.includes('open-meteo.com') || url.hostname.includes('nominatim.openstreetmap.org') || url.hostname.includes('worldpop.arcgis.com')) {
    e.respondWith(fetch(req).then((res) => { const cp = res.clone(); caches.open(DATA).then((c) => c.put(req, cp)); return res; }).catch(() => caches.match(req)));
    return;
  }
  if (url.origin !== self.location.origin) return;
  // la página: primero la red (así se ve enseguida cada versión nueva); sin conexión, la guardada
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
    e.respondWith(caches.open(SHELL).then(async (c) => {
      try {
        const res = await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
        if (res.ok) c.put(req.url, res.clone());
        return res;
      } catch {
        return (await c.match(req)) || (await c.match('./index.html')) || Response.error();
      }
    }));
    return;
  }
  // código y estilos con huella en el nombre (assets/…): no cambian nunca, primero la caché
  if (url.pathname.includes('/assets/')) {
    e.respondWith(caches.open(SHELL).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  // el resto (icono, manifiesto…): caché y actualización en segundo plano
  e.respondWith(caches.open(SHELL).then(async (c) => {
    const hit = await c.match(req);
    const net = fetch(req.url, { cache: 'no-cache' }).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
