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

const EARTH_R = 6371e3;
const POLE_LAT = 89.9;

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** anillo geodésico con longitudes "desenrolladas" (continuas aunque crucen el antimeridiano) */
function ringUnwrapped(lat: number, lon: number, r: number, n: number): [number, number][] {
  const pts: [number, number][] = [];
  let prev = 0;
  for (let i = 0; i <= n; i++) {
    let [x, y] = destination(lat, lon, r, (i / n) * 360);
    if (i > 0) {
      while (x - prev > 180) x -= 360;
      while (x - prev < -180) x += 360;
    } else {
      while (x - lon > 180) x -= 360;
      while (x - lon < -180) x += 360;
    }
    prev = x;
    pts.push([x, y]);
  }
  return pts;
}

/**
 * Polígono GeoJSON de un círculo geodésico de radio `r` (m), correcto para radios enormes:
 * cruza el antimeridiano, contiene un polo o incluso ambos (entonces es el planeta menos un
 * casquete alrededor de las antípodas).
 */
export function circlePolygon(lat: number, lon: number, r: number, n = 180): [number, number][][] {
  const half = Math.PI * EARTH_R;
  const world: [number, number][] = [[-180, -POLE_LAT], [180, -POLE_LAT], [180, POLE_LAT], [-180, POLE_LAT], [-180, -POLE_LAT]];
  if (r >= half * 0.995) return [world];
  const nIn = haversineM(lat, lon, 90, 0) < r;
  const sIn = haversineM(lat, lon, -90, 0) < r;
  if (nIn && sIn) {
    // el complemento es un casquete alrededor de las antípodas
    const alat = -lat, alon = lon > 0 ? lon - 180 : lon + 180;
    const hole = ringUnwrapped(alat, alon, half - r, n).reverse();
    return [world, hole];
  }
  const ring = ringUnwrapped(lat, lon, r, n);
  if (nIn || sIn) {
    const pl = nIn ? POLE_LAT : -POLE_LAT;
    const first = ring[0], last = ring[ring.length - 1];
    // cierra el anillo pasando por el polo
    ring.push([last[0], pl], [first[0], pl], first);
  }
  return [ring];
}

/** contorno (líneas) del círculo, sin los tramos auxiliares de cierre por los polos */
export function circleLine(lat: number, lon: number, r: number, n = 180): [number, number][][] {
  const half = Math.PI * EARTH_R;
  if (r >= half * 0.995) return [];
  const nIn = haversineM(lat, lon, 90, 0) < r;
  const sIn = haversineM(lat, lon, -90, 0) < r;
  if (nIn && sIn) {
    const alat = -lat, alon = lon > 0 ? lon - 180 : lon + 180;
    return [ringUnwrapped(alat, alon, half - r, n)];
  }
  return [ringUnwrapped(lat, lon, r, n)];
}


/** convierte metros locales (este, norte) a lng/lat */
export function localToLngLat(lat: number, lon: number, e: number, n: number): [number, number] {
  const cos = Math.cos((lat * Math.PI) / 180);
  return [lon + e / (111320 * cos), lat + n / 110540];
}

const SOURCES = ['fx-rings', 'fx-ring-lines', 'fx-fallout', 'fx-labels', 'fx-scorch', 'fx-deposit', 'fx-fallout-labels'];

/** trama rayada para marcar el suelo contaminado */
function hatchImage() {
  const n = 16;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const d = (x + y) % 8;
    const on = d < 2;
    const i = (y * n + x) * 4;
    data[i] = 214; data[i + 1] = 255; data[i + 2] = 31; data[i + 3] = on ? 150 : 0;
  }
  return { width: n, height: n, data };
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
  showMarks = true;

  constructor(map: MLMap) {
    this.map = map;
  }

  install() {
    const m = this.map;
    for (const id of SOURCES) m.addSource(id, { type: 'geojson', data: empty() });
    const before = 'buildings';
    if (!m.hasImage('fx-hatch')) m.addImage('fx-hatch', hatchImage(), { pixelRatio: 2 });
    m.addLayer({ id: 'fx-scorch', type: 'fill', source: 'fx-scorch', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'opacity'] } }, before);
    // marcas persistentes: suelo contaminado (rayado) y zona de radiación inducida
    m.addLayer({ id: 'fx-deposit', type: 'fill', source: 'fx-deposit', paint: { 'fill-pattern': 'fx-hatch', 'fill-opacity': ['get', 'opacity'] } }, before);
    m.addLayer({ id: 'fx-deposit-line', type: 'line', source: 'fx-deposit', paint: { 'line-color': '#d6ff1f', 'line-width': 1, 'line-dasharray': [3, 3], 'line-opacity': ['*', 0.9, ['get', 'opacity']] } }, before);
    m.addLayer({ id: 'fx-fallout-labels', type: 'symbol', source: 'fx-fallout-labels',
      layout: { 'text-field': ['get', 'text'], 'text-font': ['Noto Sans Bold'], 'text-size': 11, 'text-allow-overlap': false, 'text-padding': 6, 'text-offset': [0, -0.8] },
      paint: { 'text-color': ['get', 'color'], 'text-halo-color': 'rgba(0,0,0,0.85)', 'text-halo-width': 1.6 } });
    m.addLayer({
      id: 'fx-fallout', type: 'fill', source: 'fx-fallout',
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.2, 'fill-antialias': true },
    }, before);
    m.addLayer({ id: 'fx-fallout-line', type: 'line', source: 'fx-fallout', paint: { 'line-color': ['get', 'color'], 'line-width': 1.4, 'line-opacity': 0.9 } }, before);
    m.addLayer({ id: 'fx-rings-fill', type: 'fill', source: 'fx-rings', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'fillOpacity'] } }, before);
    m.addLayer({ id: 'fx-rings-glow', type: 'line', source: 'fx-ring-lines', paint: { 'line-color': ['get', 'color'], 'line-width': 9, 'line-blur': 8, 'line-opacity': ['*', 0.55, ['get', 'lineOpacity']] } }, before);
    m.addLayer({ id: 'fx-rings-line', type: 'line', source: 'fx-ring-lines', paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['boolean', ['get', 'hl'], false], 3.2, 1.6], 'line-opacity': ['get', 'lineOpacity'] } }, before);
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
  setReveal(r: number, falloutHours: number, t = Infinity) {
    const changed = Math.abs(r - this.revealR) > Math.max(5, this.revealR * 0.01) || (r === Infinity) !== (this.revealR === Infinity);
    const fchanged = Math.abs(falloutHours - this.falloutT) > 0.01 || (falloutHours === Infinity) !== (this.falloutT === Infinity);
    this.revealR = r;
    this.falloutT = falloutHours;
    this.simT = t;
    const key = this.current ? this.current.fx.rings.map((x) => (this.reached(x) >= x.radiusM * 0.98 ? 1 : 0)).join('') : '';
    if (changed || fchanged || key !== this.revealKey) { this.revealKey = key; this.refresh(); }
  }

  private simT = Infinity;
  private revealKey = '';
  /** instante (s) en que acaba la fase luminosa de la bola de fuego: antes no se dibuja ningún anillo */
  gateT = 0;
  /** segundos hasta que empieza a caer la lluvia radiactiva (subida de la nube) */
  falloutDelayS = 0;
  /** distancia alcanzada por cada tipo de efecto en el instante actual */
  private reached(r: Ring): number {
    const t = this.simT;
    if (t === Infinity) return Infinity;
    if (t <= 0 || t < this.gateT) return 0;
    const fx = this.current!.fx;
    switch (r.group) {
      case 'tsunami': return Math.sqrt(9.81 * Math.max(10, fx.tsunami?.depthM ?? 4000)) * t; // ondas largas: √(g·h)
      case 'seismic': return 5000 * t; // ondas superficiales ≈ 5 km/s
      case 'ejecta': return 0.5 * 9.81 * t * t; // vuelo balístico a 45°
      case 'thermal': case 'radiation': case 'fireball': case 'crater': case 'emp': return Infinity;
      default: return this.revealR;
    }
  }

  refresh() {
    const m = this.map;
    const src = (id: string) => m.getSource(id) as GeoJSONSource | undefined;
    if (!this.current) {
      for (const id of SOURCES) src(id)?.setData(empty());
      return;
    }
    const { fx, lat, lon } = this.current;
    const rings: GeoJSON.Feature[] = [];
    const labels: GeoJSON.Feature[] = [];
    const lines: GeoJSON.Feature[] = [];
    const visible = fx.rings.filter((r) => !this.hidden.has(r.id) && this.showRings && !r.global);
    // de mayor a menor para que los pequeños queden encima
    const sorted = [...visible].sort((a, b) => b.radiusM - a.radiusM);
    sorted.forEach((r: Ring, i) => {
      if (this.reached(r) < r.radiusM * 0.98) return;
      const hl = this.highlight === r.id;
      rings.push({
        type: 'Feature',
        properties: { color: r.color, fillOpacity: (hl ? 0.22 : 0.07) * (r.group === 'fireball' ? 2 : 1), lineOpacity: hl ? 1 : 0.85, hl },
        geometry: { type: 'Polygon', coordinates: circlePolygon(lat, lon, r.radiusM) },
      });
      lines.push({
        type: 'Feature',
        properties: { color: r.color, lineOpacity: hl ? 1 : 0.85, hl },
        geometry: { type: 'MultiLineString', coordinates: circleLine(lat, lon, r.radiusM) },
      });
      labels.push({
        type: 'Feature',
        properties: { text: `${r.label} · ${fmtDist(r.radiusM)}`, color: r.color, order: i },
        geometry: { type: 'Point', coordinates: destination(lat, lon, r.radiusM, 180 + (i % 2 ? 18 : -18) * (i % 3)) },
      });
    });
    src('fx-rings')?.setData({ type: 'FeatureCollection', features: rings });
    src('fx-ring-lines')?.setData({ type: 'FeatureCollection', features: lines });
    src('fx-labels')?.setData({ type: 'FeatureCollection', features: labels });

    // lluvia radiactiva (se revela a medida que avanza el viento)
    const ff: GeoJSON.Feature[] = [];
    const dep: GeoJSON.Feature[] = [];
    const flab: GeoJSON.Feature[] = [];
    if ((this.showFallout || this.showMarks) && !this.hidden.has('fallout') && this.falloutT * 3600 > this.falloutDelayS) {
      const windKmh = Math.max(4, this.current.wind);
      // las partículas empiezan a caer cuando la nube ya ha subido y se ha extendido
      const tS = this.falloutT * 3600 - this.falloutDelayS;
      const front = this.falloutT === Infinity ? Infinity : tS <= 0 ? 0 : windKmh * (tS / 3600) * 1000 + fx.cloud.capRadiusM * Math.min(1, tS / Math.max(1, this.falloutDelayS * 2));
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
          if (c.level >= 10) dep.push({ type: 'Feature', properties: { opacity: c.level >= 100 ? 0.75 : 0.45 }, geometry: { type: 'Polygon', coordinates: coords } });
        }
        // etiqueta en el extremo a sotavento de cada isolínea
        const reach = Math.min(c.maxDownwindKm * 1000, front);
        if (reach > 500 && this.showFallout) {
          const to = (fx.windFromDeg + 180) % 360;
          flab.push({ type: 'Feature', properties: { text: `${c.label} · ${fmtDist(reach)}`, color: c.color }, geometry: { type: 'Point', coordinates: destination(lat, lon, reach, to) } });
        }
      }
    }
    src('fx-fallout')?.setData({ type: 'FeatureCollection', features: this.showFallout ? ff : [] });
    src('fx-deposit')?.setData({ type: 'FeatureCollection', features: this.showMarks ? dep : [] });
    src('fx-fallout-labels')?.setData({ type: 'FeatureCollection', features: flab });

    // terreno chamuscado
    const sc: GeoJSON.Feature[] = [];
    const scorchR = Math.min(this.revealR, fx.rings.find((r) => r.id === 'burn3')?.radiusM ?? 0);
    if (scorchR > 0 && this.showMarks && this.simT >= this.gateT) {
      const steps = [
        { r: scorchR, color: '#1a0f08', opacity: 0.35 },
        { r: Math.min(scorchR, fx.rings.find((r) => r.id === 'psi5')?.radiusM ?? 0), color: '#120a06', opacity: 0.35 },
        { r: Math.min(scorchR, fx.rings.find((r) => r.id === 'fireball')?.radiusM ?? 0) * 1.2, color: '#050302', opacity: 0.6 },
      ];
      // suelo activado por los neutrones (radiación inducida) en explosiones bajas
      const rad = fx.rings.find((r) => r.id === 'rad500')?.radiusM ?? 0;
      if (rad > 0 && fx.groundContact > 0 && !fx.chemical) steps.push({ r: Math.min(rad, scorchR * 3), color: '#7dff3a', opacity: 0.06 });
      // manto de eyecta y cráter en impactos
      const ej = fx.rings.filter((r) => r.group === 'ejecta').sort((a, b) => a.radiusM - b.radiusM);
      if (ej.length) {
        const ejR = Math.min(ej[ej.length - 1].radiusM, this.reached(ej[ej.length - 1]));
        if (ejR > 1) steps.unshift({ r: ejR, color: '#4a3826', opacity: 0.3 });
      }
      if (fx.crater) steps.push({ r: fx.crater.diameterM / 2, color: '#0a0806', opacity: 0.7 });
      for (const s of steps) if (s.r > 1) sc.push({ type: 'Feature', properties: { color: s.color, opacity: s.opacity }, geometry: { type: 'Polygon', coordinates: circlePolygon(lat, lon, s.r, 120) } });
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
