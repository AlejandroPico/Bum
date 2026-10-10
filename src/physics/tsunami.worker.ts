/// <reference lib="webworker" />
/**
 * Propagación de un tsunami sobre la batimetría real (teselas Terrarium de AWS).
 * Calcula el tiempo de llegada en cada celda con un algoritmo de Dijkstra sobre el océano
 * (velocidad de las ondas largas c = √(g·h)) y la altura de la ola en la costa con la ley de
 * Green (la ola crece al disminuir la profundidad: A ∝ h^-¼). Los continentes hacen sombra.
 */

interface Req { lat: number; lon: number; reachKm: number; K: number; capM: number; srcDepthM: number }

const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';
const R = 6371000;

const lon2x = (lon: number, z: number) => ((lon + 180) / 360) * 256 * 2 ** z;
const lat2y = (lat: number, z: number) => { const s = Math.sin((lat * Math.PI) / 180); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256 * 2 ** z; };
const x2lon = (x: number, z: number) => (x / (256 * 2 ** z)) * 360 - 180;
const y2lat = (y: number, z: number) => { const n = Math.PI - (2 * Math.PI * y) / (256 * 2 ** z); return (180 / Math.PI) * Math.atan(Math.sinh(n)); };

async function tile(z: number, x: number, y: number): Promise<Float32Array | null> {
  try {
    const n = 2 ** z;
    const xx = ((x % n) + n) % n;
    const r = await fetch(`${TERRARIUM}/${z}/${xx}/${y}.png`);
    if (!r.ok) return null;
    const bmp = await createImageBitmap(await r.blob());
    const c = new OffscreenCanvas(256, 256);
    const g = c.getContext('2d')!;
    g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, 256, 256).data;
    const out = new Float32Array(256 * 256);
    for (let i = 0; i < out.length; i++) out[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
    return out;
  } catch { return null; }
}

/** montículo binario mínimo por clave flotante */
class Heap {
  k: Float64Array; v: Int32Array; n = 0;
  constructor(cap: number) { this.k = new Float64Array(cap); this.v = new Int32Array(cap); }
  push(key: number, val: number) {
    if (this.n >= this.k.length) { const k2 = new Float64Array(this.k.length * 2); k2.set(this.k); this.k = k2; const v2 = new Int32Array(this.v.length * 2); v2.set(this.v); this.v = v2; }
    let i = this.n++;
    while (i > 0) { const p = (i - 1) >> 1; if (this.k[p] <= key) break; this.k[i] = this.k[p]; this.v[i] = this.v[p]; i = p; }
    this.k[i] = key; this.v[i] = val;
  }
  pop(): number {
    const top = this.v[0];
    const key = this.k[--this.n], val = this.v[this.n];
    let i = 0;
    for (;;) { let c = 2 * i + 1; if (c >= this.n) break; if (c + 1 < this.n && this.k[c + 1] < this.k[c]) c++; if (this.k[c] >= key) break; this.k[i] = this.k[c]; this.v[i] = this.v[c]; i = c; }
    this.k[i] = key; this.v[i] = val;
    return top;
  }
}

self.onmessage = async (ev: MessageEvent<Req>) => {
  const q = ev.data;
  try {
    // zoom según el alcance: el planeta entero a z=2, regiones a más detalle
    const reach = Math.min(20000, q.reachKm);
    let z = reach > 4000 ? 2 : reach > 1500 ? 3 : reach > 600 ? 4 : 5;
    const pxM = (2 * Math.PI * R) / (256 * 2 ** z);
    const cx = lon2x(q.lon, z), cy = lat2y(q.lat, z);
    const halfPx = Math.min(2 ** z * 128, (reach * 1000) / (pxM * Math.max(0.2, Math.cos((q.lat * Math.PI) / 180))) * 1.1);
    const full = 256 * 2 ** z;
    let tx0 = Math.floor((cx - halfPx) / 256), tx1 = Math.floor((cx + halfPx) / 256);
    const ty0 = Math.max(0, Math.floor((cy - halfPx) / 256)), ty1 = Math.min(2 ** z - 1, Math.floor((cy + halfPx) / 256));
    if (tx1 - tx0 + 1 > 2 ** z) { tx0 = 0; tx1 = 2 ** z - 1; }
    const W = (tx1 - tx0 + 1) * 256, H = (ty1 - ty0 + 1) * 256;
    const elev = new Float32Array(W * H).fill(1);
    const jobs: Promise<void>[] = [];
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      jobs.push(tile(z, tx, ty).then((d) => {
        if (!d) return;
        const ox = (tx - tx0) * 256, oy = (ty - ty0) * 256;
        for (let y = 0; y < 256; y++) elev.set(d.subarray(y * 256, y * 256 + 256), (oy + y) * W + ox);
      }));
    }
    await Promise.all(jobs);
    (self as unknown as Worker).postMessage({ progress: 0.4 });

    // Dijkstra sobre las celdas de agua
    const T = new Float32Array(W * H).fill(Infinity);
    const sx = Math.round(cx - tx0 * 256), sy = Math.round(cy - ty0 * 256);
    const heap = new Heap(1 << 16);
    const start = Math.max(0, Math.min(H - 1, sy)) * W + Math.max(0, Math.min(W - 1, sx));
    // si el punto cae en tierra (resolución gruesa), busca el agua más cercana
    let s0 = start;
    if (elev[s0] >= 0) {
      let best = -1, bd = 1e9;
      for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { const i = (sy + dy) * W + (sx + dx); if (i >= 0 && i < W * H && elev[i] < 0 && dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = i; } }
      if (best >= 0) s0 = best;
    }
    T[s0] = 0; heap.push(0, s0);
    const rowM = new Float32Array(H);
    for (let y = 0; y < H; y++) rowM[y] = pxM * Math.cos((y2lat(ty0 * 256 + y + 0.5, z) * Math.PI) / 180);
    const spd = (i: number) => Math.sqrt(9.81 * Math.max(5, -elev[i]));
    const maxT = 30 * 3600;
    const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    let popped = 0;
    while (heap.n > 0) {
      const i = heap.pop();
      const ti = T[i];
      const x = i % W, y = (i - x) / W;
      if (++popped % 200000 === 0) (self as unknown as Worker).postMessage({ progress: 0.4 + 0.5 * Math.min(1, popped / (W * H * 0.6)) });
      if (ti > maxT) continue;
      const ci = spd(i);
      for (const [dx, dy] of N8) {
        let nx = x + dx;
        const ny = y + dy;
        if (ny < 0 || ny >= H) continue;
        if (nx < 0 || nx >= W) { if (W === full) nx = (nx + W) % W; else continue; }
        const j = ny * W + nx;
        if (elev[j] >= 0) continue;
        const d = Math.hypot(dx, dy) * rowM[y];
        const t = ti + d / ((ci + spd(j)) / 2);
        if (t < T[j]) { T[j] = t; heap.push(t, j); }
      }
    }

    // isócronas (horas)
    let tMaxS = 0;
    for (let i = 0; i < T.length; i++) if (T[i] < Infinity && T[i] > tMaxS) tMaxS = T[i];
    const hrsMax = Math.max(1, Math.min(30, Math.ceil(tMaxS / 3600)));
    const step = hrsMax > 16 ? 2 : 1;
    const th: number[] = [];
    for (let hh = step; hh <= hrsMax; hh += step) th.push(hh);
    // isócronas por "marching squares" sólo sobre el agua (sin dibujar las costas)
    const toLL = (px: number, py: number): [number, number] => [x2lon(tx0 * 256 + px, z), y2lat(ty0 * 256 + py, z)];
    const k = W * H > 600000 ? 2 : 1;
    const gw = Math.floor(W / k), gh = Math.floor(H / k);
    const g = new Float32Array(gw * gh);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) g[y * gw + x] = T[y * k * W + x * k] / 3600;
    const iso: { hours: number; coords: [number, number][][] }[] = [];
    for (const lv of th) {
      const segs: [number, number][][] = [];
      for (let y = 0; y < gh - 1; y++) for (let x = 0; x < gw - 1; x++) {
        const a = g[y * gw + x], b = g[y * gw + x + 1], c = g[(y + 1) * gw + x + 1], d = g[(y + 1) * gw + x];
        if (!(a < 900 && b < 900 && c < 900 && d < 900)) continue;
        const pts: [number, number][] = [];
        const edge = (v0: number, v1: number, x0: number, y0: number, x1: number, y1: number) => { if ((v0 < lv) !== (v1 < lv)) { const f = (lv - v0) / (v1 - v0); pts.push([(x0 + (x1 - x0) * f) * k, (y0 + (y1 - y0) * f) * k]); } };
        edge(a, b, x, y, x + 1, y); edge(b, c, x + 1, y, x + 1, y + 1); edge(c, d, x + 1, y + 1, x, y + 1); edge(d, a, x, y + 1, x, y);
        if (pts.length >= 2) segs.push([toLL(pts[0][0], pts[0][1]), toLL(pts[1][0], pts[1][1])]);
        if (pts.length === 4) segs.push([toLL(pts[2][0], pts[2][1]), toLL(pts[3][0], pts[3][1])]);
      }
      if (segs.length) iso.push({ hours: lv, coords: segs });
    }

    // costas: celdas de agua junto a tierra
    const srcLat = q.lat, srcLon = q.lon;
    const coast: { lon: number; lat: number; h: number; amp: number }[] = [];
    const every = Math.max(1, Math.round(Math.sqrt((W * H) / 600000)));
    for (let y = 1; y < H - 1; y += every) for (let x = 1; x < W - 1; x += every) {
      const i = y * W + x;
      if (!Number.isFinite(T[i]) || elev[i] >= 0) continue;
      if (elev[i - 1] < 0 && elev[i + 1] < 0 && elev[i - W] < 0 && elev[i + W] < 0) continue;
      const [lo, la] = toLL(x + 0.5, y + 0.5);
      const dLat = ((la - srcLat) * Math.PI) / 180, dLon = ((lo - srcLon) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((srcLat * Math.PI) / 180) * Math.cos((la * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      const r = 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
      const deep = Math.min(q.capM, q.K / Math.max(1, r));
      const amp = deep * Math.pow(Math.max(20, q.srcDepthM) / Math.max(10, -elev[i]), 0.25);
      if (amp < 0.05) continue;
      coast.push({ lon: lo, lat: la, h: T[i] / 3600, amp });
    }
    (self as unknown as Worker).postMessage({ done: true, iso, coast, zoom: z });
  } catch (e) {
    (self as unknown as Worker).postMessage({ error: String(e) });
  }
};
