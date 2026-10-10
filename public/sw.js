/* Service worker de Bum: la app funciona sin conexión y guarda en caché teselas y datos. */
const VERSION = 'bum-v0.7';
const SHELL = `${VERSION}-shell`;
const TILES = `${VERSION}-tiles`;
const DATA = `${VERSION}-data`;
const MAX_TILES = 4000;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['./', './index.html', './favicon.svg', './manifest.webmanifest'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
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
  // tiempo y búsqueda: primero la red, la caché si no hay conexión
  if (url.hostname.includes('open-meteo.com') || url.hostname.includes('nominatim.openstreetmap.org')) {
    e.respondWith(fetch(req).then((res) => { const cp = res.clone(); caches.open(DATA).then((c) => c.put(req, cp)); return res; }).catch(() => caches.match(req)));
    return;
  }
  // la propia app: caché y actualización en segundo plano
  if (url.origin === self.location.origin) {
    e.respondWith(caches.open(SHELL).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit || (req.mode === 'navigate' ? c.match('./index.html') : undefined));
      return hit || net;
    }));
  }
});
