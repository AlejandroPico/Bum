/**
 * Tiempo real dibujado en el mapa:
 *  - nubes: cobertura de Open-Meteo en una rejilla de 9 × 9 puntos alrededor de la zona, modulada
 *    con ruido fractal para que tenga textura, como imagen georreferenciada (se ve desde lejos);
 *  - radar de precipitación observado (RainViewer), opcional;
 *  - lluvia o nieve en pantalla cuando la cámara está cerca del suelo en la zona;
 *  - niebla y cielo cubierto según la visibilidad y las nubes (lo aplica `applyTimeOfDay`).
 */
import type maplibregl from 'maplibre-gl';
import { cacheGet, cacheSet } from '../ui/geo';
import { putCanvas, dropLayer } from './canvas-layer';

export interface LocalWx { rainMmH: number; visibilityKm: number; cloudPct: number; tempC: number | null; windFromDeg: number; windKmh: number }
interface CloudGrid { lat: number; lon: number; n: number; stepKm: number; cover: number[]; low: number[]; rain: number[]; temp: number[]; vis: number[]; /** viento a la altura de las nubes (700 hPa, ≈ 3 km): hacia el este y hacia el norte, km/h */ windE?: number; windN?: number }

const CID = 'wx-clouds', RID = 'wx-radar';
const N = 9, STEP_KM = 140;
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const invMercY = (y: number) => (360 / Math.PI) * Math.atan(Math.exp(y)) - 90;

/** ruido fractal periódico (256 × 256) para dar textura a las nubes */
let NOISE: Float32Array | null = null;
function noise(): Float32Array {
  if (NOISE) return NOISE;
  const S = 256, out = new Float32Array(S * S);
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let amp = 1, total = 0;
  for (let oct = 0; oct < 5; oct++) {
    const g = 4 << oct; // celdas por lado
    const lat = new Float32Array(g * g).map(() => rnd());
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const fx = (x / S) * g, fy = (y / S) * g;
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const v = (i: number, j: number) => lat[((j % g) * g) + (i % g)];
      const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * sx, b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * sx;
      out[y * S + x] += (a + (b - a) * sy) * amp;
    }
    total += amp; amp *= 0.52;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  // estira el histograma a 0..1
  let lo = 1, hi = 0;
  for (const v of out) { if (v < lo) lo = v; if (v > hi) hi = v; }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) / (hi - lo || 1);
  NOISE = out;
  return out;
}

async function fetchCloudGrid(lat: number, lon: number): Promise<CloudGrid | null> {
  const cLat = Math.round(lat * 2) / 2, cLon = Math.round(lon * 2) / 2;
  const key = `bum:wxg2:${cLat},${cLon}`;
  const hit = cacheGet<CloudGrid>(key, 20 * 60 * 1000);
  if (hit) return hit;
  const lats: number[] = [], lons: number[] = [];
  const cos = Math.max(0.15, Math.cos((cLat * Math.PI) / 180));
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    lats.push(+(cLat + ((N - 1) / 2 - j) * STEP_KM / 110.57).toFixed(3));
    lons.push(+(((cLon + (i - (N - 1) / 2) * STEP_KM / (111.32 * cos)) + 540) % 360 - 180).toFixed(3));
  }
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(',')}&longitude=${lons.join(',')}&current=cloud_cover,cloud_cover_low,precipitation,temperature_2m,visibility,wind_speed_700hPa,wind_direction_700hPa&timezone=GMT`;
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) return null;
    const js = await r.json();
    const arr = Array.isArray(js) ? js : [js];
    if (arr.length !== N * N) return null;
    const g: CloudGrid = { lat: cLat, lon: cLon, n: N, stepKm: STEP_KM, cover: [], low: [], rain: [], temp: [], vis: [] };
    let we = 0, wn = 0, nw = 0;
    for (const p of arr) {
      const c = p.current ?? {};
      g.cover.push(+(c.cloud_cover ?? 0) / 100); g.low.push(+(c.cloud_cover_low ?? 0) / 100);
      g.rain.push(+(c.precipitation ?? 0)); g.temp.push(+(c.temperature_2m ?? 15)); g.vis.push(+(c.visibility ?? 30000) / 1000);
      // el viento «viene de» una dirección: las nubes van hacia la contraria
      const ws = +(c.wind_speed_700hPa ?? NaN), wd = +(c.wind_direction_700hPa ?? NaN);
      if (Number.isFinite(ws) && Number.isFinite(wd)) { const to = ((wd + 180) * Math.PI) / 180; we += ws * Math.sin(to); wn += ws * Math.cos(to); nw++; }
    }
    if (nw) { g.windE = we / nw; g.windN = wn / nw; }
    cacheSet(key, g);
    return g;
  } catch { return null; } finally { clearTimeout(to); }
}

export class WeatherLayer {
  private map: maplibregl.Map;
  enabled = true;
  radar = false;
  night = 0;
  grid: CloudGrid | null = null;
  local: LocalWx | null = null;
  target = { lat: 0, lon: 0 };
  private canvas: HTMLCanvasElement;
  private cloudCanvas = document.createElement('canvas');
  private raf = 0;
  private drops: { x: number; y: number; l: number; v: number; p: number }[] = [];
  private lastT = 0;
  private loading = false;
  private radarTimer = 0;
  onUpdate: (() => void) | null = null;
  private _lite = false;
  /** desplazamiento de las nubes con el viento (km hacia el este y el norte) y el del último dibujo */
  private drift = { e: 0, n: 0 };
  private drawn = { e: NaN, n: NaN };
  private loadedAt = 0;
  private simS = 0;
  private lastDraw = 0;
  /** modo ligero: lluvia a menos resolución, con menos gotas y a 30 fotogramas por segundo */
  get lite() { return this._lite; }
  set lite(v: boolean) { if (v !== this._lite) { this._lite = v; this.resize(); } }

  constructor(map: maplibregl.Map, parent: HTMLElement) {
    this.map = map;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'wx-rain';
    parent.append(this.canvas);
    map.on('move', () => this.checkRain());
    map.on('moveend', () => this.maybeReload());
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  private resize() {
    const r = this.map.getContainer().getBoundingClientRect();
    const d = Math.min(this._lite ? 1 : 1.5, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(r.width * d); this.canvas.height = Math.round(r.height * d);
    this.canvas.style.width = `${r.width}px`; this.canvas.style.height = `${r.height}px`;
    this.drops = [];
  }

  /** cobertura de nubes (0..1) interpolada en un punto, o null fuera de la rejilla */
  private sample(arr: number[], lat: number, lon: number): number | null {
    const g = this.grid;
    if (!g) return null;
    const cos = Math.max(0.15, Math.cos((g.lat * Math.PI) / 180));
    const fx = (lon - g.lon) * 111.32 * cos / g.stepKm + (g.n - 1) / 2, fy = (g.lat - lat) * 110.57 / g.stepKm + (g.n - 1) / 2;
    if (fx < -0.5 || fy < -0.5 || fx > g.n - 0.5 || fy > g.n - 0.5) return null;
    const cx = Math.max(0, Math.min(g.n - 1.0001, fx)), cy = Math.max(0, Math.min(g.n - 1.0001, fy));
    const i = Math.floor(cx), j = Math.floor(cy), tx = cx - i, ty = cy - j;
    const v = (a: number, b: number) => arr[Math.min(g.n - 1, b) * g.n + Math.min(g.n - 1, a)];
    return (v(i, j) * (1 - tx) + v(i + 1, j) * tx) * (1 - ty) + (v(i, j + 1) * (1 - tx) + v(i + 1, j + 1) * tx) * ty;
  }
  /** nubes en el punto (para el cielo) */
  coverAt(lat: number, lon: number) { return this.sample(this.grid?.cover ?? [], lat, lon); }

  // ---------------------------------------------------------------- nubes
  async load(lat: number, lon: number) {
    this.target = { lat, lon };
    if (!this.enabled || this.loading) return;
    this.loading = true;
    try {
      const g = await fetchCloudGrid(lat, lon);
      if (g) { this.grid = g; this.loadedAt = performance.now(); this.drift = { e: 0, n: 0 }; this.drawClouds(); this.onUpdate?.(); }
    } finally { this.loading = false; }
  }
  /** tiempo simulado (s) desde la detonación: las nubes avanzan con el viento lo que corresponda */
  setSimTime(tS: number) { this.simS = Math.max(0, tS); this.advance(); }
  /** mueve las nubes según el viento y el tiempo pasado (real desde que se cargaron, más el simulado) */
  advance() {
    const g = this.grid;
    if (!g || !this.enabled) return;
    const we = g.windE ?? (this.local ? this.local.windKmh * 1.5 * Math.sin(((this.local.windFromDeg + 180) * Math.PI) / 180) : 0);
    const wn = g.windN ?? (this.local ? this.local.windKmh * 1.5 * Math.cos(((this.local.windFromDeg + 180) * Math.PI) / 180) : 0);
    // pasadas unas horas, la rejilla de nubes ya no sirve (la previsión cambia): se queda a medio camino
    const hours = Math.min(8, (performance.now() - this.loadedAt) / 3.6e6 + this.simS / 3600);
    this.drift = { e: we * hours, n: wn * hours };
    // se vuelve a dibujar cuando se han movido algo más de un píxel del lienzo (o como mucho 4 veces por segundo)
    const kmPx = (g.n * g.stepKm) / (this._lite ? 256 : 512);
    const now = performance.now();
    if ((!Number.isFinite(this.drawn.e) || Math.hypot(this.drift.e - this.drawn.e, this.drift.n - this.drawn.n) > kmPx * 1.2) && now - this.lastDraw > 250) this.drawClouds();
  }
  /** al mirar lejos de la rejilla cargada, se pide otra para la nueva zona */
  private maybeReload() {
    if (!this.enabled || !this.grid || this.map.getZoom() > 9) return;
    const c = this.map.getCenter(), g = this.grid;
    const dKm = Math.hypot((c.lat - g.lat) * 110.57, (c.lng - g.lon) * 111.32 * Math.cos((g.lat * Math.PI) / 180));
    if (dKm > 380 && this.map.getZoom() > 3.5) void this.load(c.lat, c.lng);
  }

  private drawClouds() {
    const m = this.map, g = this.grid;
    if (!g || !this.enabled) { this.remove(CID); return; }
    const half = ((g.n - 1) / 2 + 0.5) * g.stepKm;
    const cos = Math.max(0.15, Math.cos((g.lat * Math.PI) / 180));
    const north = Math.min(84, g.lat + half / 110.57), south = Math.max(-84, g.lat - half / 110.57);
    const west = g.lon - half / (111.32 * cos), east = g.lon + half / (111.32 * cos);
    const W = this._lite ? 256 : 512, H = W, nz = noise(), S = 256;
    this.drawn = { ...this.drift }; this.lastDraw = performance.now();
    const dLat = this.drift.n / 110.57, dLon = this.drift.e / (111.32 * cos);
    // el ruido (la forma de las nubes) se mueve con ellas: desplazamiento en píxeles del lienzo
    const pxE = (this.drift.e / (2 * half)) * W, pxN = (this.drift.n / (2 * half)) * H;
    const kx = 512 / W;
    const cv = this.cloudCanvas;
    if (cv.width !== W) { cv.width = W; cv.height = H; }
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(W, H);
    const yN = mercY(north), yS = mercY(south);
    const n = this.night;
    // color: blanco de día, gris azulado de noche
    const col = [255 - 175 * n, 255 - 170 * n, 255 - 150 * n];
    for (let y = 0; y < H; y++) {
      const lat = invMercY(yN + ((y + 0.5) / H) * (yS - yN));
      for (let x = 0; x < W; x++) {
        const lon = west + ((x + 0.5) / W) * (east - west);
        // lo que hay ahora en (lat, lon) es lo que estaba viento arriba hace un rato
        const c = this.sample(g.cover, lat - dLat, lon - dLon) ?? 0;
        const lowC = this.sample(g.low, lat - dLat, lon - dLon) ?? 0;
        // textura: dos escalas del ruido, desplazadas para que no se repitan a la vista
        const xs = (x - pxE / kx) * kx, ys = (y + pxN / kx) * kx;
        const md = (a: number) => ((a % S) + S) % S | 0;
        const u = md(xs * 1.7), v = md(ys * 1.7), u2 = md(xs * 0.55 + 91), v2 = md(ys * 0.55 + 37);
        const tex = nz[v * S + u] * 0.45 + nz[v2 * S + u2] * 0.55;
        const th = 1 - c;
        let d = Math.max(0, Math.min(1, (tex - th + 0.14) / 0.3));
        d = d * d * (3 - 2 * d);
        // borde difuminado de la rejilla
        const rr = Math.hypot(x - W / 2, y - H / 2) / (W / 2);
        const edge = Math.max(0, Math.min(1, (1 - rr) / 0.45));
        const a = d * (0.55 + 0.35 * lowC + 0.1 * c) * (0.72 + 0.28 * tex) * edge * (1 - 0.45 * n);
        const o = (y * W + x) * 4;
        const shade = 1 - 0.18 * d * c; // la base de las nubes densas, algo más gris
        img.data[o] = col[0] * shade; img.data[o + 1] = col[1] * shade; img.data[o + 2] = col[2] * shade;
        img.data[o + 3] = Math.round(255 * Math.min(0.92, a));
      }
    }
    ctx.putImageData(img, 0, 0);
    // por encima del mapa salvo los rótulos de los efectos: desde lejos, las nubes tapan el suelo
    putCanvas(m, CID, cv, [[west, north], [east, north], [east, south], [west, south]],
      { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.95, 7, 0.85, 9.5, 0.45, 11.5, 0], 'raster-fade-duration': 0, 'raster-resampling': 'linear' }, 'fx-labels');
  }

  // ---------------------------------------------------------------- radar
  async setRadar(on: boolean) {
    this.radar = on;
    clearInterval(this.radarTimer);
    if (!on || !this.enabled) { this.remove(RID); return; }
    const refresh = async () => {
      try {
        const r = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const js = await r.json();
        const last = js?.radar?.past?.[js.radar.past.length - 1];
        if (!last) return;
        const tiles = [`${js.host}${last.path}/256/{z}/{x}/{y}/2/1_1.png`];
        this.remove(RID);
        if (!this.radar) return;
        this.map.addSource(RID, { type: 'raster', tiles, tileSize: 256, maxzoom: 7, attribution: 'Radar: <a href="https://www.rainviewer.com" target="_blank" rel="noopener">RainViewer</a>' });
        this.map.addLayer({ id: RID, type: 'raster', source: RID, paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.75, 10, 0.6, 13, 0.25], 'raster-fade-duration': 0 } }, this.map.getLayer(CID) ? CID : this.map.getLayer('fx-labels') ? 'fx-labels' : undefined);
      } catch { /* sin radar */ }
    };
    await refresh();
    this.radarTimer = window.setInterval(refresh, 10 * 60 * 1000);
  }

  // ---------------------------------------------------------------- lluvia y nieve en pantalla
  setLocal(w: LocalWx) { this.local = w; this.drops = []; this.checkRain(); }

  /** intensidad de la lluvia que se ve ahora (0 = nada) */
  private rainNow(): { mm: number; snow: boolean } {
    if (!this.enabled || !this.local) return { mm: 0, snow: false };
    const m = this.map;
    if (m.getZoom() < 10) return { mm: 0, snow: false };
    const c = m.getCenter();
    const dKm = Math.hypot((c.lat - this.target.lat) * 110.57, (c.lng - this.target.lon) * 111.32 * Math.cos((this.target.lat * Math.PI) / 180));
    // cerca del objetivo manda el tiempo del entorno; más lejos, la rejilla de nubes
    let mm = this.local.rainMmH, t = this.local.tempC;
    if (dKm > 40) { mm = this.sample(this.grid?.rain ?? [], c.lat, c.lng) ?? 0; t = this.sample(this.grid?.temp ?? [], c.lat, c.lng); }
    return { mm, snow: t !== null && t <= 0.5 };
  }

  private checkRain() {
    const r = this.rainNow();
    const on = r.mm >= 0.1;
    this.canvas.classList.toggle('on', on);
    if (on && !this.raf) { this.lastT = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  }

  private frame = (now: number) => {
    if (this._lite && now - this.lastT < 30) { this.raf = requestAnimationFrame(this.frame); return; }
    const r = this.rainNow();
    const ctx = this.canvas.getContext('2d')!;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (r.mm < 0.1) { this.raf = 0; this.canvas.classList.remove('on'); return; }
    const dt = Math.min(0.05, (now - this.lastT) / 1000);
    this.lastT = now;
    const k = Math.min(1, Math.log10(1 + r.mm) / Math.log10(26)); // 0,1 → 0,03 · 25 mm/h → 1
    const count = Math.round((W * H) / (1600 * 900) * (r.snow ? 160 + 900 * k : 120 + 1400 * k) * (this._lite ? 0.5 : 1));
    const pitch = this.map.getPitch() / 90;
    // el viento inclina las gotas según hacia dónde mira la cámara
    const L = this.local!;
    const to = ((L.windFromDeg + 180 - this.map.getBearing()) * Math.PI) / 180;
    const slant = Math.sin(to) * Math.min(1.2, L.windKmh / 40);
    while (this.drops.length < count) this.drops.push({ x: Math.random() * W, y: Math.random() * H, l: 0.5 + Math.random(), v: 0.7 + Math.random() * 0.6, p: Math.random() * 6.28 });
    if (this.drops.length > count) this.drops.length = count;
    const night = this.night;
    if (r.snow) {
      ctx.fillStyle = `rgba(255,255,255,${0.75 - 0.3 * night})`;
      for (const d of this.drops) {
        d.y += dt * H * 0.08 * d.v * (0.4 + pitch); d.x += dt * W * 0.02 * (slant + Math.sin(now / 900 + d.p) * 0.6);
        if (d.y > H) { d.y = -4; d.x = Math.random() * W; } if (d.x > W) d.x -= W; if (d.x < 0) d.x += W;
        ctx.beginPath(); ctx.arc(d.x, d.y, 1 + d.l * 1.6, 0, 6.283); ctx.fill();
      }
    } else {
      const len = (8 + 26 * pitch) * (W / 1600 + 0.4);
      ctx.strokeStyle = night > 0.5 ? 'rgba(170,190,220,0.32)' : 'rgba(225,235,248,0.45)';
      ctx.lineWidth = Math.max(1, W / 1400);
      ctx.beginPath();
      for (const d of this.drops) {
        const sp = dt * H * (0.9 + 1.3 * pitch) * d.v;
        d.y += sp; d.x += sp * slant * 0.35;
        if (d.y > H) { d.y = -len; d.x = Math.random() * W; } if (d.x > W) d.x -= W; if (d.x < 0) d.x += W;
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - slant * len * 0.35 * d.l, d.y - len * d.l);
      }
      ctx.stroke();
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  // ---------------------------------------------------------------- conmutadores
  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) { this.remove(CID); this.remove(RID); clearInterval(this.radarTimer); this.checkRain(); return; }
    if (this.grid) this.drawClouds(); else void this.load(this.target.lat, this.target.lon);
    if (this.radar) void this.setRadar(true);
    this.checkRain();
  }
  setNight(n: number) {
    if (Math.abs(n - this.night) < 0.05) return;
    this.night = n;
    if (this.grid && this.enabled) this.drawClouds();
  }
  /** vuelve a poner las capas tras cambiar el mapa base */
  reinstall() { if (this.enabled && this.grid) this.drawClouds(); if (this.enabled && this.radar) void this.setRadar(true); }

  private remove(id: string) { dropLayer(this.map, id); }
}
