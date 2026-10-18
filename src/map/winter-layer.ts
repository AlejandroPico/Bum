/**
 * Invierno nuclear en el mapa: cuánto bajaría la temperatura en cada lugar del planeta, mes a mes
 * durante diez años, y cuánta cosecha se perdería.
 *
 * El enfriamiento medio del planeta sale de la serie del escenario (Robock 2007, Coupe 2019,
 * Xia 2022). Se reparte con el patrón de esos modelos climáticos: los continentes se enfrían dos o
 * tres veces más que el océano (que guarda el calor), el interior más que la costa, las latitudes
 * medias y altas del hemisferio norte mucho más que los trópicos (el humo sube sobre todo allí), y
 * el verano más que el invierno (hay más sol que tapar). La pérdida de cosechas crece con el frío
 * y con la falta de lluvia, y se ajusta para que la media coincida con la del escenario.
 */
import type { Map as MLMap, ImageSource } from 'maplibre-gl';
import { isLand } from '../data/landmask';
import { h } from '../ui/dom';
import { tr } from '../i18n';
import { DEC, LOCALE } from '../i18n/locale';

const ID = 'fx-winter';
const W = 360, H = 240, LAT_MAX = 85;
const RAD = Math.PI / 180;
type Mode = 'temp' | 'crops';
type WarFx = { series: { t: number; dT: number; dP: number }[]; caloriesPct: number; coolingC: number; sootTg: number };

/** filas de la imagen en proyección Mercator: latitud del centro de cada fila */
const rowLat = (j: number) => {
  const m = Math.log(Math.tan(Math.PI / 4 + (LAT_MAX * RAD) / 2));
  const y = m - ((j + 0.5) / H) * 2 * m;
  return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) / RAD;
};

/** patrón de enfriamiento (media del planeta = 1) y peso de cada casilla en las cosechas */
function pattern() {
  const P = new Float32Array(W * H), crop = new Float32Array(W * H), land = new Uint8Array(W * H), lats = new Float32Array(H);
  let num = 0, den = 0;
  // fracción de tierra alrededor (continentalidad), en una ventana de ±4°
  const near = (la: number, lo: number) => { let c = 0, n = 0; for (let a = -4; a <= 4; a += 2) for (let b = -4; b <= 4; b += 2) { n++; if (isLand(la + a, lo + b)) c++; } return c / n; };
  for (let j = 0; j < H; j++) {
    const la = rowLat(j); lats[j] = la;
    const g = 0.5 + 1.15 * Math.exp(-(((la - 55) / 22) ** 2)) + 0.35 * Math.exp(-(((la + 45) / 20) ** 2));
    for (let i = 0; i < W; i++) {
      const lo = -180 + i + 0.5, k = j * W + i;
      const L = isLand(la, lo);
      land[k] = L ? 1 : 0;
      const f = g * (L ? 1.4 + 0.9 * near(la, lo) : 0.55);
      P[k] = f;
      // peso real por área (no por píxel de Mercator)
      const a = Math.cos(la * RAD) ** 2;
      num += f * a; den += a;
      // tierras de cultivo: latitudes templadas y tropicales sin desiertos polares
      crop[k] = L && Math.abs(la) < 62 && Math.abs(la) > 8 ? 1 : L && Math.abs(la) <= 8 ? 0.5 : 0;
    }
  }
  const mean = num / den;
  for (let k = 0; k < P.length; k++) P[k] /= mean;
  return { P, crop, land, lats };
}
let PAT: ReturnType<typeof pattern> | null = null;

/** colores: azules cada vez más oscuros con el frío; amarillo → rojo oscuro con la pérdida de cosecha */
const TEMP: [number, number[]][] = [[0.5, [0, 0, 0, 0]], [2, [186, 230, 253, 150]], [5, [96, 165, 250, 175]], [10, [37, 99, 235, 195]], [20, [76, 29, 149, 210]], [30, [30, 10, 70, 225]]];
const CROP: [number, number[]][] = [[0.03, [0, 0, 0, 0]], [0.15, [254, 240, 138, 150]], [0.4, [251, 146, 60, 180]], [0.7, [220, 38, 38, 200]], [0.95, [91, 14, 14, 215]]];
function ramp(stops: [number, number[]][], v: number) {
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) {
    const [a, ca] = stops[i - 1], [b, cb] = stops[i], k = (v - a) / (b - a);
    return ca.map((c, n) => c + (cb[n] - c) * k);
  }
  return stops[stops.length - 1][1];
}

export class WinterLayer {
  private map: MLMap;
  private cv = document.createElement('canvas');
  private war: WarFx | null = null;
  private month = 0;
  private mode: Mode = 'temp';
  private playing = false;
  private timer = 0;
  private panel: HTMLElement | null = null;
  private ui!: { month: HTMLElement; mean: HTMLElement; slider: HTMLInputElement; play: HTMLButtonElement; legend: HTMLElement };
  private start = new Date();
  /** factor que hace que la pérdida media de cosecha del año 2 sea la del escenario */
  private cropK = 1;
  onClose: (() => void) | null = null;
  get active() { return !!this.panel; }

  constructor(map: MLMap) { this.map = map; this.cv.width = W; this.cv.height = H; }

  open(war: WarFx, container: HTMLElement) {
    this.close();
    PAT ??= pattern();
    this.war = war; this.month = 6; this.mode = 'temp'; this.start = new Date();
    this.calibrate();
    const slider = h('input', { type: 'range', min: 0, max: 120, step: 1, value: this.month }) as HTMLInputElement;
    slider.addEventListener('input', () => { this.month = +slider.value; this.draw(); });
    const play = h('button', { type: 'button', class: 'wl-b', title: 'Reproducir o pausar', onclick: () => this.toggle() }) as HTMLButtonElement;
    const seg = h('div', { class: 'seg wl-seg' });
    for (const [m, l] of [['temp', 'Temperatura'], ['crops', 'Cosechas']] as const) seg.append(h('button', { type: 'button', class: m === this.mode ? 'on' : '', onclick: (e: MouseEvent) => { this.mode = m; seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); this.draw(); } }, l));
    const legend = h('div', { class: 'wl-legend' });
    const month = h('div', { class: 'wl-month' }), mean = h('div', { class: 'wl-mean' });
    this.panel = h('div', { id: 'winter-panel', class: 'glass' },
      h('div', { class: 'wl-head' }, h('b', {}, 'Invierno nuclear'), h('button', { type: 'button', class: 'wl-x', title: 'Cerrar', onclick: () => this.close() }, '✕')),
      month, mean, h('div', { class: 'wl-row' }, play, slider), seg, legend,
      h('div', { class: 'wl-note' }, 'Reparto aproximado del enfriamiento medio del escenario con el patrón de los modelos climáticos (Robock 2007, Coupe 2019, Xia 2022).'));
    this.ui = { month, mean, slider, play, legend };
    container.append(this.panel);
    this.ensure();
    this.draw();
    this.toggle(true);
  }

  close() {
    clearInterval(this.timer); this.playing = false;
    this.panel?.remove(); this.panel = null;
    if (this.map.getLayer(ID)) this.map.removeLayer(ID);
    if (this.map.getSource(ID)) this.map.removeSource(ID);
    const cb = this.onClose; this.onClose = null; cb?.();
  }

  private toggle(on = !this.playing) {
    this.playing = on;
    clearInterval(this.timer);
    if (on) this.timer = window.setInterval(() => {
      if (!this.panel) return;
      this.month = this.month >= 120 ? 0 : this.month + 1;
      this.draw();
    }, 260);
    if (this.ui) this.ui.play.textContent = on ? '❚❚' : '▶';
  }

  private ensure() {
    const m = this.map;
    if (m.getSource(ID)) return;
    const c: [[number, number], [number, number], [number, number], [number, number]] = [[-180, LAT_MAX], [180, LAT_MAX], [180, -LAT_MAX], [-180, -LAT_MAX]];
    m.addSource(ID, { type: 'image', url: this.cv.toDataURL(), coordinates: c });
    // por debajo de los rótulos del mapa
    const firstSym = m.getStyle().layers.find((l) => l.type === 'symbol')?.id;
    m.addLayer({ id: ID, type: 'raster', source: ID, paint: { 'raster-opacity': 0.85, 'raster-fade-duration': 0, 'raster-resampling': 'linear' } }, firstSym);
  }

  /** enfriamiento medio del planeta (°C, negativo) y lluvia (%) en un mes desde la guerra */
  private at(month: number) {
    const S = this.war!.series;
    const t = month / 12;
    let i = 0;
    while (i < S.length - 2 && S[i + 1].t < t) i++;
    const a = S[i], b = S[i + 1] ?? a, k = b.t > a.t ? Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))) : 0;
    return { dT: a.dT + (b.dT - a.dT) * k, dP: a.dP + (b.dP - a.dP) * k };
  }
  /** factor estacional (más enfriamiento en el verano de cada hemisferio) */
  private season(month: number, lat: number) {
    const m = (this.start.getMonth() + month) % 12; // 0 = enero
    const s = Math.sin((2 * Math.PI * (m - 3)) / 12); // máximo en junio–julio
    return 1 + 0.35 * s * Math.sign(lat) * Math.min(1, Math.abs(lat) / 40);
  }
  private cropLoss(dT: number, dP: number) {
    return Math.min(0.98, this.cropK * (Math.pow(Math.abs(dT), 0.9) * 0.06 + Math.max(0, -dP) / 100 * 0.6));
  }
  private calibrate() {
    const P = PAT!;
    this.cropK = 1;
    let s = 0, n = 0;
    for (let mo = 12; mo < 24; mo++) {
      const { dT, dP } = this.at(mo);
      for (let k = 0; k < P.P.length; k += 7) {
        if (!P.crop[k]) continue;
        const la = P.lats[Math.floor(k / W)];
        s += this.cropLoss(dT * P.P[k] * this.season(mo, la), dP) * P.crop[k]; n += P.crop[k];
      }
    }
    const mean = n ? s / n : 0;
    this.cropK = mean > 0 ? (this.war!.caloriesPct / 100) / mean : 1;
  }

  private draw() {
    if (!this.panel || !this.war) return;
    const P = PAT!;
    const { dT, dP } = this.at(this.month);
    const g = this.cv.getContext('2d')!;
    const img = g.createImageData(W, H);
    let landSum = 0, landN = 0, cropSum = 0, cropN = 0;
    for (let j = 0; j < H; j++) {
      const sea = this.season(this.month, P.lats[j]);
      for (let i = 0; i < W; i++) {
        const k = j * W + i;
        const d = dT * P.P[k] * sea; // °C (negativo)
        let c: number[];
        if (this.mode === 'temp') c = ramp(TEMP, -d);
        else { const loss = P.crop[k] ? this.cropLoss(d, dP) : 0; c = P.land[k] ? ramp(CROP, loss) : [0, 0, 0, 0]; if (P.crop[k]) { cropSum += loss * P.crop[k]; cropN += P.crop[k]; } }
        if (P.land[k]) { landSum += d; landN++; }
        img.data.set(c.map(Math.round), k * 4);
      }
    }
    g.putImageData(img, 0, 0);
    (this.map.getSource(ID) as ImageSource | undefined)?.updateImage({ url: this.cv.toDataURL(), coordinates: [[-180, LAT_MAX], [180, LAT_MAX], [180, -LAT_MAX], [-180, -LAT_MAX]] });
    const date = new Date(this.start.getFullYear(), this.start.getMonth() + this.month, 1);
    let ds = date.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
    ds = ds.charAt(0).toUpperCase() + ds.slice(1);
    const y = Math.floor(this.month / 12), mm = this.month % 12;
    this.ui.month.textContent = `${tr(y ? `Año ${y + 1}, mes ${mm + 1}` : `Mes ${mm + 1}`)} · ${ds}`;
    const n1 = (x: number) => (Math.abs(x) < 10 ? x.toFixed(1) : String(Math.round(x))).replace('.', DEC);
    this.ui.mean.textContent = this.mode === 'temp'
      ? tr(`Planeta: ${n1(dT)} °C · continentes: ${n1(landN ? landSum / landN : 0)} °C · lluvia ${n1(dP)} %`)
      : tr(`Cosechas perdidas en las tierras de cultivo: ${Math.round(cropN ? (cropSum / cropN) * 100 : 0)} %`);
    if (document.activeElement !== this.ui.slider) this.ui.slider.value = String(this.month);
    const L = this.mode === 'temp' ? TEMP : CROP;
    const key = this.mode;
    if (this.ui.legend.dataset.k !== key) {
      this.ui.legend.dataset.k = key;
      this.ui.legend.innerHTML = '';
      for (const [v, c] of L.slice(1)) this.ui.legend.append(h('span', {}, h('b', { style: { background: `rgba(${c[0]},${c[1]},${c[2]},${(c[3] / 255).toFixed(2)})` } }), this.mode === 'temp' ? `−${v} °C` : `${Math.round(v * 100)} %`));
    }
  }
}
