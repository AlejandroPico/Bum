/**
 * Capa del mapa de calor: dibuja una malla de `physics/heat.ts` en un lienzo (remuestreado en
 * Mercator para que coincida con el mapa) y la coloca como imagen georreferenciada, con su leyenda.
 */
import type maplibregl from 'maplibre-gl';
import type { HeatGrid, HeatKind } from '../physics/heat';
import { h } from '../ui/dom';
import { putCanvas, dropLayer } from './canvas-layer';

const ID = 'fx-heat';

/** rampas de color (posición 0..1 → color) */
const RAMPS: Record<HeatKind, [number, [number, number, number]][]> = {
  pop: [[0, [40, 70, 160]], [0.3, [30, 125, 175]], [0.55, [42, 157, 143]], [0.78, [233, 196, 106]], [1, [255, 247, 214]]],
  deaths: [[0, [125, 12, 40]], [0.3, [185, 10, 35]], [0.55, [235, 50, 20]], [0.8, [255, 168, 0]], [1, [255, 245, 200]]],
  fallout: [[0, [95, 35, 170]], [0.35, [140, 45, 200]], [0.65, [205, 50, 200]], [0.88, [250, 140, 190]], [1, [255, 230, 240]]],
};
const TITLES: Record<HeatKind, string> = {
  pop: 'Población (habitantes por km²)',
  deaths: 'Muertes inmediatas por km²',
  fallout: 'Muertes por la lluvia radiactiva por km² (sin refugio)',
};
const TOTALS: Record<HeatKind, string> = { pop: 'habitantes en la zona', deaths: 'muertes en la zona', fallout: 'muertes sin refugio' };

function rampColor(kind: HeatKind, u: number): [number, number, number] {
  const R = RAMPS[kind];
  for (let i = 1; i < R.length; i++) if (u <= R[i][0]) {
    const [p0, c0] = R[i - 1], [p1, c1] = R[i], f = (u - p0) / (p1 - p0 || 1);
    return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
  }
  return R[R.length - 1][1];
}

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const invMercY = (y: number) => (360 / Math.PI) * Math.atan(Math.exp(y)) - 90;
const fmtN = (x: number) => (x >= 1e6 ? `${(x / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 })} mill.` : Math.round(x).toLocaleString('es-ES'));

/** escala logarítmica: valor mínimo representado y máximo */
function scale(g: HeatGrid) {
  const lo = g.kind === 'pop' ? 5 : 0.5;
  const hi = Math.max(lo * 20, g.max);
  return { lo, hi, k: 1 / Math.log(hi / lo) };
}

export class HeatLayer {
  private map: maplibregl.Map;
  private legend: HTMLElement;
  grid: HeatGrid | null = null;
  onClose: (() => void) | null = null;
  opacity = 0.78;
  private canvas = document.createElement('canvas');

  constructor(map: maplibregl.Map, parent: HTMLElement) {
    this.map = map;
    this.legend = h('div', { id: 'heat-legend', class: 'glass hidden' });
    parent.append(this.legend);
  }

  /** dibuja la malla (o la quita con null) */
  set(g: HeatGrid | null) {
    this.grid = g;
    const m = this.map;
    if (!g || g.max <= 0) {
      dropLayer(m, ID);
      this.legend.classList.add('hidden');
      return;
    }
    this.paint(g);
    // encima de los rellenos de los efectos y debajo de sus líneas y rótulos
    const first = m.getLayer('fx-rings-glow') ? 'fx-rings-glow' : m.getStyle().layers.find((l) => l.id.startsWith('fx-') && l.id !== ID)?.id;
    putCanvas(m, ID, this.canvas, [[g.west, g.north], [g.east, g.north], [g.east, g.south], [g.west, g.south]],
      { 'raster-opacity': this.opacity, 'raster-fade-duration': 0, 'raster-resampling': 'linear' }, first);
    this.showLegend(g);
  }

  /** pinta la malla en el lienzo con filas equiespaciadas en Mercator */
  private paint(g: HeatGrid) {
    const W = Math.min(640, g.w * 2), H = Math.min(640, g.h * 2);
    const cv = this.canvas;
    if (cv.width !== W) cv.width = W;
    if (cv.height !== H) cv.height = H;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(W, H);
    const yN = mercY(g.north), yS = mercY(g.south);
    const { lo, k } = scale(g);
    for (let y = 0; y < H; y++) {
      const lat = invMercY(yN + ((y + 0.5) / H) * (yS - yN));
      const fy = ((g.north - lat) / (g.north - g.south)) * g.h - 0.5;
      const j0 = Math.max(0, Math.min(g.h - 1, Math.floor(fy))), j1 = Math.min(g.h - 1, j0 + 1), ty = Math.max(0, Math.min(1, fy - j0));
      for (let x = 0; x < W; x++) {
        const fx = ((x + 0.5) / W) * g.w - 0.5;
        const i0 = Math.max(0, Math.min(g.w - 1, Math.floor(fx))), i1 = Math.min(g.w - 1, i0 + 1), tx = Math.max(0, Math.min(1, fx - i0));
        const v = (g.val[j0 * g.w + i0] * (1 - tx) + g.val[j0 * g.w + i1] * tx) * (1 - ty) + (g.val[j1 * g.w + i0] * (1 - tx) + g.val[j1 * g.w + i1] * tx) * ty;
        const o = (y * W + x) * 4;
        if (v < lo) { img.data[o + 3] = 0; continue; }
        const u = Math.min(1, Math.log(v / lo) * k);
        const [r, gg, b] = rampColor(g.kind, u);
        img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = b;
        img.data[o + 3] = Math.round(255 * (0.28 + 0.72 * Math.pow(u, 0.7)));
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  private showLegend(g: HeatGrid) {
    const { lo, hi } = scale(g);
    const stops = RAMPS[g.kind].map(([p, c]) => `rgb(${c.join(',')}) ${p * 100}%`).join(',');
    const mid = Math.sqrt(lo * hi);
    this.legend.innerHTML = '';
    this.legend.append(
      h('div', { class: 'hl-h' }, h('b', {}, TITLES[g.kind]), h('button', { type: 'button', title: 'Quitar el mapa de calor', onclick: () => this.onClose?.() }, '✕')),
      h('div', { class: 'hl-bar', style: { background: `linear-gradient(90deg, ${stops})` } }),
      h('div', { class: 'hl-ticks' }, h('span', {}, fmtN(lo)), h('span', {}, fmtN(mid)), h('span', {}, fmtN(hi))),
      h('div', { class: 'hl-tot' }, `≈ ${fmtN(g.total)} ${TOTALS[g.kind]}`),
    );
    this.legend.classList.remove('hidden');
  }
}
