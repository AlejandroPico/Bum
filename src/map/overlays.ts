import type { Map as MLMap, GeoJSONSource, ExpressionSpecification } from 'maplibre-gl';
import type { Effects, Ring } from '../physics/types';
import { fmtDist } from '../physics/effects';
import { BUILDING_COLOR } from './map';

type FC = GeoJSON.FeatureCollection;
const empty = (): FC => ({ type: 'FeatureCollection', features: [] });

export function destination(lat: number, lon: number, distM: number, bearingDeg: number): [number, number] {
  const R = 6371e3;
  const d = distM / R;
  const b = (bearingDeg * Math.PI) / 180;
  const p1 = (lat * Math.PI) / 180, l1 = (lon * Math.PI) / 180;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [((l2 * 180) / Math.PI + 540) % 360 - 180, (p2 * 180) / Math.PI];
}

function circle(lat: number, lon: number, r: number, n = 180): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) pts.push(destination(lat, lon, r, (i / n) * 360));
  return pts;
}

/** convierte metros locales (este, norte) a lng/lat */
export function localToLngLat(lat: number, lon: number, e: number, n: number): [number, number] {
  const cos = Math.cos((lat * Math.PI) / 180);
  return [lon + e / (111320 * cos), lat + n / 110540];
}

export class Overlays {
  private map: MLMap;
  private hidden = new Set<string>();
  private current: { fx: Effects; lat: number; lon: number; wind: number } | null = null;
  private revealR = Infinity;
  private falloutT = Infinity;
  showRings = true;
  showFallout = true;
  showDamage = true;

  constructor(map: MLMap) {
    this.map = map;
  }

  install() {
    const m = this.map;
    for (const id of ['fx-rings', 'fx-fallout', 'fx-labels', 'fx-scorch']) m.addSource(id, { type: 'geojson', data: empty() });
    const before = 'buildings';
    m.addLayer({ id: 'fx-scorch', type: 'fill', source: 'fx-scorch', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'opacity'] } }, before);
    m.addLayer({
      id: 'fx-fallout', type: 'fill', source: 'fx-fallout',
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.2, 'fill-antialias': true },
    }, before);
    m.addLayer({ id: 'fx-fallout-line', type: 'line', source: 'fx-fallout', paint: { 'line-color': ['get', 'color'], 'line-width': 1.4, 'line-opacity': 0.9 } }, before);
    m.addLayer({ id: 'fx-rings-fill', type: 'fill', source: 'fx-rings', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'fillOpacity'] } }, before);
    m.addLayer({ id: 'fx-rings-glow', type: 'line', source: 'fx-rings', paint: { 'line-color': ['get', 'color'], 'line-width': 9, 'line-blur': 8, 'line-opacity': ['*', 0.55, ['get', 'lineOpacity']] } }, before);
    m.addLayer({ id: 'fx-rings-line', type: 'line', source: 'fx-rings', paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['boolean', ['get', 'hl'], false], 3.2, 1.6], 'line-opacity': ['get', 'lineOpacity'] } }, before);
    m.addLayer({
      id: 'fx-labels', type: 'symbol', source: 'fx-labels',
      layout: {
        'text-field': ['get', 'text'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 11.5,
        'text-letter-spacing': 0.04,
        'text-allow-overlap': false,
        'text-padding': 4,
        'symbol-sort-key': ['get', 'order'],
      },
      paint: { 'text-color': ['get', 'color'], 'text-halo-color': 'rgba(0,0,0,0.85)', 'text-halo-width': 1.6 },
    });
  }

  set(fx: Effects | null, lat = 0, lon = 0, windKmh = 20) {
    this.current = fx ? { fx, lat, lon, wind: windKmh } : null;
    this.revealR = Infinity;
    this.falloutT = Infinity;
    this.refresh();
    this.updateBuildings(Infinity);
  }

  setHidden(ids: Set<string>) {
    this.hidden = ids;
    this.refresh();
  }

  highlight: string | null = null;

  /** Muestra los anillos hasta el radio que ya ha alcanzado el frente de choque. */
  setReveal(r: number, falloutHours: number) {
    const changed = Math.abs(r - this.revealR) > Math.max(5, this.revealR * 0.01) || (r === Infinity) !== (this.revealR === Infinity);
    const fchanged = Math.abs(falloutHours - this.falloutT) > 0.05 || (falloutHours === Infinity) !== (this.falloutT === Infinity);
    this.revealR = r;
    this.falloutT = falloutHours;
    if (changed || fchanged) this.refresh();
  }

  refresh() {
    const m = this.map;
    const src = (id: string) => m.getSource(id) as GeoJSONSource | undefined;
    if (!this.current) {
      for (const id of ['fx-rings', 'fx-fallout', 'fx-labels', 'fx-scorch']) src(id)?.setData(empty());
      return;
    }
    const { fx, lat, lon } = this.current;
    const rings: GeoJSON.Feature[] = [];
    const labels: GeoJSON.Feature[] = [];
    const visible = fx.rings.filter((r) => !this.hidden.has(r.id) && this.showRings);
    // de mayor a menor para que los pequeños queden encima
    const sorted = [...visible].sort((a, b) => b.radiusM - a.radiusM);
    sorted.forEach((r: Ring, i) => {
      const reveal = Math.min(1, Math.max(0, (this.revealR - r.radiusM * 0.98) / Math.max(r.radiusM * 0.05, 1)));
      if (reveal <= 0 && r.group !== 'thermal' && r.group !== 'radiation' && r.group !== 'fireball') return;
      const hl = this.highlight === r.id;
      rings.push({
        type: 'Feature',
        properties: { color: r.color, fillOpacity: (hl ? 0.22 : 0.07) * (r.group === 'fireball' ? 2 : 1), lineOpacity: hl ? 1 : 0.85, hl },
        geometry: { type: 'Polygon', coordinates: [circle(lat, lon, r.radiusM)] },
      });
      labels.push({
        type: 'Feature',
        properties: { text: `${r.label} · ${fmtDist(r.radiusM)}`, color: r.color, order: i },
        geometry: { type: 'Point', coordinates: destination(lat, lon, r.radiusM, 180 + (i % 2 ? 18 : -18) * (i % 3)) },
      });
    });
    src('fx-rings')?.setData({ type: 'FeatureCollection', features: rings });
    src('fx-labels')?.setData({ type: 'FeatureCollection', features: labels });

    // lluvia radiactiva (se revela a medida que avanza el viento)
    const ff: GeoJSON.Feature[] = [];
    if (this.showFallout && !this.hidden.has('fallout')) {
      const windKmh = Math.max(4, this.current.wind);
      const front = this.falloutT === Infinity ? Infinity : windKmh * this.falloutT * 1000 + fx.cloud.capRadiusM;
      for (const c of fx.fallout) {
        for (const poly of c.polygons) {
          const coords = poly.map((ring) => {
            const pts = ring.map(([e, n]) => {
              // recorta al frente de deposición
              const d = Math.hypot(e, n);
              const k = d > front ? front / d : 1;
              return localToLngLat(lat, lon, e * k, n * k);
            });
            return pts;
          });
          ff.push({ type: 'Feature', properties: { color: c.color, level: c.level }, geometry: { type: 'Polygon', coordinates: coords } });
        }
      }
    }
    src('fx-fallout')?.setData({ type: 'FeatureCollection', features: ff });

    // terreno chamuscado
    const sc: GeoJSON.Feature[] = [];
    const scorchR = Math.min(this.revealR, fx.rings.find((r) => r.id === 'burn3')?.radiusM ?? 0);
    if (scorchR > 0 && this.showDamage) {
      const steps = [
        { r: scorchR, color: '#1a0f08', opacity: 0.35 },
        { r: Math.min(scorchR, fx.rings.find((r) => r.id === 'psi5')?.radiusM ?? 0), color: '#120a06', opacity: 0.35 },
        { r: Math.min(scorchR, fx.rings.find((r) => r.id === 'fireball')?.radiusM ?? 0) * 1.2, color: '#050302', opacity: 0.6 },
      ];
      for (const s of steps) if (s.r > 1) sc.push({ type: 'Feature', properties: { color: s.color, opacity: s.opacity }, geometry: { type: 'Polygon', coordinates: [circle(lat, lon, s.r, 120)] } });
    }
    src('fx-scorch')?.setData({ type: 'FeatureCollection', features: sc });
  }

  private lastBuild = '';
  /** Colorea y "derrumba" los edificios según la distancia a la zona cero. */
  updateBuildings(shockR: number) {
    const m = this.map;
    if (!m.getLayer('buildings')) return;
    if (!this.current || !this.showDamage) {
      if (this.lastBuild !== 'none') {
        m.setPaintProperty('buildings', 'fill-extrusion-color', BUILDING_COLOR);
        m.setPaintProperty('buildings', 'fill-extrusion-height', ['coalesce', ['get', 'render_height'], 8]);
        this.lastBuild = 'none';
      }
      return;
    }
    const { fx, lat, lon } = this.current;
    const get = (id: string) => fx.rings.find((r) => r.id === id)?.radiusM ?? 0;
    const rFire = Math.max(get('fireball'), get('crater'));
    const r20 = Math.max(get('psi20'), rFire + 1);
    const r5 = Math.max(get('psi5'), r20 + 1);
    const r1 = Math.max(get('psi1'), r5 + 1);
    // se actualiza sólo al cruzar cada umbral (re-evaluar la expresión en todos los edificios es caro)
    const steps = [0, rFire, r20, r5, (r5 + r1) / 2, r1 * 1.05];
    let R = 0;
    for (const s of steps) if (shockR >= s) R = s;
    if (shockR === Infinity) R = r1 * 1.05;
    const key = `${R}|${lat}|${lon}`;
    if (key === this.lastBuild) return;
    this.lastBuild = key;
    const gz: GeoJSON.Point = { type: 'Point', coordinates: [lon, lat] };
    const dist: ExpressionSpecification = ['distance', gz];
    const color: ExpressionSpecification = ['case', ['>', dist, R], BUILDING_COLOR,
      ['interpolate', ['linear'], dist, 0, '#0b0806', rFire, '#140c08', r20, '#2a1a12', r5, '#6b4a33', r1, '#a8968a']];
    const factor: ExpressionSpecification = ['case', ['>', dist, R], 1,
      ['interpolate', ['linear'], dist, 0, 0.0, rFire, 0.02, r20, 0.12, r5, 0.45, r1, 0.95]];
    m.setPaintProperty('buildings', 'fill-extrusion-color', color);
    m.setPaintProperty('buildings', 'fill-extrusion-height', ['*', ['coalesce', ['get', 'render_height'], 8], factor]);
  }
}
