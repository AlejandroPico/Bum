/**
 * Guerra nuclear en el mapa, paso a paso: los misiles cruzan de un bando a otro por oleadas (una
 * línea por objetivo representativo, con la cabeza brillante), cada llegada es un destello que deja
 * sus zonas de daño, y de las ciudades sube el humo de los incendios, que en días se extiende como un
 * velo por todo el hemisferio (el origen del invierno nuclear).
 */
import type { Map as MLMap, GeoJSONSource } from 'maplibre-gl';
import { greatCirclePath } from '../data/launch';
import { destination } from './overlays';
import { tr } from '../i18n';
import type { WarMissile } from '../data/war';

const SIDE_COLOR = ['#ff6a3d', '#38bdf8'];
const ID = 'fx-war';

export interface WarSetup {
  missiles: WarMissile[];
  /** radios de daño de una ojiva: 1 psi, quemaduras de 3.er grado y 5 psi (m) */
  zones: [number, string][];
  sites: [[number, number, string][], [number, number, string][]];
  sootTg: number;
}

const circle = (lat: number, lon: number, r: number, n = 40): [number, number][] => {
  const ring: [number, number][] = [];
  for (let i = 0; i <= n; i++) ring.push(destination(lat, lon, r, (i / n) * 360) as [number, number]);
  return ring;
};

export class WarLayer {
  private map: MLMap;
  private W: WarSetup | null = null;
  private paths: [number, number][][] = [];
  private zoneRings: [number, number][][][] = [];
  private lastKey = '';
  /** segundos (desde el primer lanzamiento) en que estalla la última ojiva */
  endT = 0;
  /** capas ocultas desde la pestaña Efectos: war-arcs, war-zones, war-smoke */
  hidden = new Set<string>();

  constructor(map: MLMap) { this.map = map; }

  set(W: WarSetup | null) {
    this.W = W;
    this.lastKey = '';
    this.paths = W ? W.missiles.map((m) => greatCirclePath(m.from[0], m.from[1], m.to[0], m.to[1], 64)) : [];
    this.zoneRings = W ? W.missiles.map((m) => W.zones.map(([r]) => circle(m.to[0], m.to[1], r))) : [];
    this.endT = W ? Math.max(...W.missiles.map((m) => m.tImpact)) : 0;
    this.ensureLayers();
    this.update(W ? 0 : -1);
  }

  private ensureLayers() {
    const m = this.map;
    const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
    if (!m.getSource(ID)) m.addSource(ID, { type: 'geojson', data: empty });
    if (!m.getSource(ID + '-pt')) m.addSource(ID + '-pt', { type: 'geojson', data: empty });
    const add = (spec: any) => { if (!m.getLayer(spec.id)) m.addLayer(spec); };
    add({ id: ID, type: 'fill', source: ID, filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': ['get', 'c'], 'fill-opacity': ['get', 'o'] } });
    add({ id: ID + '-arc', type: 'line', source: ID, filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-cap': 'round' }, paint: { 'line-color': ['get', 'c'], 'line-width': ['get', 'w'], 'line-opacity': ['get', 'o'], 'line-blur': 0.6 } });
    add({ id: ID + '-site', type: 'circle', source: ID + '-pt', filter: ['==', ['get', 'k'], 'site'], paint: { 'circle-radius': 4, 'circle-color': '#0b0e15', 'circle-stroke-color': ['get', 'c'], 'circle-stroke-width': 2 } });
    add({ id: ID + '-flash', type: 'circle', source: ID + '-pt', filter: ['==', ['get', 'k'], 'flash'], paint: {
      // destello que crece y se apaga; después queda una brasa (la ciudad en llamas) que se oscurece en días
      'circle-radius': ['interpolate', ['linear'], ['get', 'age'], 0, 3, 40, 22, 200, 9, 600, 4.5, 86400, 4, 864000, 3],
      'circle-color': ['interpolate', ['linear'], ['get', 'age'], 0, '#ffffff', 40, '#ffd27a', 200, '#ff5a1f', 600, '#f97316', 21600, '#dc2626', 864000, '#5b1a0e'],
      'circle-opacity': ['interpolate', ['linear'], ['get', 'age'], 0, 1, 200, 0.9, 600, 0.85, 864000, 0.5],
      'circle-blur': ['interpolate', ['linear'], ['get', 'age'], 0, 0.2, 200, 0.6, 600, 0.35],
    } });
    add({ id: ID + '-head', type: 'circle', source: ID + '-pt', filter: ['==', ['get', 'k'], 'head'], paint: { 'circle-radius': 3.6, 'circle-color': '#fff7e0', 'circle-stroke-color': ['get', 'c'], 'circle-stroke-width': 2.2, 'circle-blur': 0.15 } });
    add({ id: ID + '-lbl', type: 'symbol', source: ID + '-pt', filter: ['any', ['==', ['get', 'k'], 'site'], ['==', ['get', 'k'], 'tgt']], minzoom: 3.2, layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.0], 'text-anchor': 'top', 'text-font': ['Noto Sans Regular'], 'text-max-width': 9 }, paint: { 'text-color': ['get', 'lc'], 'text-halo-color': '#000', 'text-halo-width': 1.2 } });
  }

  /** dibuja el instante `t` (segundos desde el primer lanzamiento); negativo para vaciar */
  update(t: number) {
    const m = this.map, W = this.W;
    const src = m.getSource(ID) as GeoJSONSource | undefined, pts = m.getSource(ID + '-pt') as GeoJSONSource | undefined;
    if (!src || !pts) return;
    if (!W || t < 0) { src.setData({ type: 'FeatureCollection', features: [] }); pts.setData({ type: 'FeatureCollection', features: [] }); return; }
    // tras el intercambio basta con redibujar el humo de vez en cuando
    const key = (t <= this.endT + 700 ? String(Math.round(t / 2)) : `s${Math.round(Math.log(t) * 40)}`) + [...this.hidden].join();
    if (key === this.lastKey) return;
    this.lastKey = key;
    const polys: GeoJSON.Feature[] = [], lines: GeoJSON.Feature[] = [], points: GeoJSON.Feature[] = [];
    const smokeK = Math.min(1, 0.35 + W.sootTg / 60);
    W.missiles.forEach((ms, i) => {
      const c = SIDE_COLOR[ms.side];
      if (t < ms.tLaunch) return;
      const path = this.paths[i];
      const f = Math.min(1, (t - ms.tLaunch) / (ms.tImpact - ms.tLaunch));
      const showArc = !this.hidden.has('war-arcs');
      if (f < 1) {
        if (!showArc) return;
        // tramo recorrido y cabeza del misil
        const k = Math.max(1, Math.round(f * (path.length - 1)));
        const head = path[k];
        lines.push({ type: 'Feature', properties: { c, w: 2, o: 0.85 }, geometry: { type: 'LineString', coordinates: path.slice(0, k + 1) } });
        points.push({ type: 'Feature', properties: { k: 'head', c }, geometry: { type: 'Point', coordinates: head } });
        return;
      }
      // después del impacto: la estela se apaga, queda el destello, las zonas de daño y el humo
      const age = t - ms.tImpact;
      const trail = Math.max(0.12, 0.85 - age / 400);
      if (showArc && t <= this.endT + 700) lines.push({ type: 'Feature', properties: { c, w: 1.2, o: trail }, geometry: { type: 'LineString', coordinates: path } });
      points.push({ type: 'Feature', properties: { k: 'flash', age }, geometry: { type: 'Point', coordinates: [ms.to[1], ms.to[0]] } });
      if (!this.hidden.has('war-zones')) this.zoneRings[i].forEach((ring, z) => polys.push({ type: 'Feature', properties: { c: W.zones[z][1], o: 0.26 * Math.min(1, age / 60) }, geometry: { type: 'Polygon', coordinates: [ring] } }));
      const hrs = age / 3600;
      if (hrs > 0.05 && !this.hidden.has('war-smoke')) {
        // columna de humo que se ensancha con el viento (más ancha cuanto más hollín)
        const r = Math.min(900e3, 15e3 + 110e3 * Math.sqrt(hrs));
        polys.push({ type: 'Feature', properties: { c: '#4a4038', o: Math.min(0.5, 0.15 + hrs * 0.15) * smokeK * Math.max(0.35, 1 - hrs / 400) }, geometry: { type: 'Polygon', coordinates: [circle(ms.to[0], ms.to[1], r, 32)] } });
      }
      points.push({ type: 'Feature', properties: { k: 'tgt', name: tr(ms.name), lc: '#ffd28a' }, geometry: { type: 'Point', coordinates: [ms.to[1], ms.to[0]] } });
    });
    // velo de hollín: en días rodea el planeta en la franja de latitudes de la guerra y se ensancha
    const days = (t - this.endT) / 86400;
    if (days > 0.3 && !this.hidden.has('war-smoke')) {
      const lat0 = W.missiles.reduce((a, b) => a + b.to[0], 0) / W.missiles.length;
      const lon0 = W.missiles.reduce((a, b) => a + b.to[1], 0) / W.missiles.length;
      const span = Math.min(360, 40 + 45 * days);
      const half = Math.min(45, (6 + 3 * days) * (0.5 + Math.min(1, W.sootTg / 40)));
      const s = Math.max(-80, lat0 - half), n = Math.min(80, lat0 + half);
      const w = span >= 360 ? -180 : lon0 - span / 2, e = span >= 360 ? 180 : lon0 + span / 2;
      const ring: [number, number][] = [];
      for (let x = w; x <= e; x += 4) ring.push([x, n]);
      for (let x = e; x >= w; x -= 4) ring.push([x, s]);
      ring.push(ring[0]);
      polys.unshift({ type: 'Feature', properties: { c: '#3a322b', o: Math.min(0.5, 0.12 + W.sootTg / 250) * Math.min(1, days / 4) }, geometry: { type: 'Polygon', coordinates: [ring] } });
    }
    W.sites.forEach((list, side) => list.forEach(([la, lo, name]) => points.push({ type: 'Feature', properties: { k: 'site', c: SIDE_COLOR[side], name: tr(name), lc: SIDE_COLOR[side] }, geometry: { type: 'Point', coordinates: [lo, la] } })));
    src.setData({ type: 'FeatureCollection', features: [...polys, ...lines] });
    pts.setData({ type: 'FeatureCollection', features: points });
  }

  /** cuántos misiles representativos han llegado y cuántos van en vuelo, por bando */
  counts(t: number) {
    const out = { landed: [0, 0], flying: [0, 0], total: [0, 0] };
    for (const ms of this.W?.missiles ?? []) {
      out.total[ms.side]++;
      if (t >= ms.tImpact) out.landed[ms.side]++;
      else if (t >= ms.tLaunch) out.flying[ms.side]++;
    }
    return out;
  }
}
