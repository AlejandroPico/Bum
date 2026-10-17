/**
 * Día y noche en el planeta: el punto subsolar (donde el Sol está en el cénit) para un instante,
 * la sombra de la noche (con los crepúsculos civil, náutico y astronómico en tonos cada vez más
 * oscuros) y la luz del globo 3D orientada hacia el Sol, para que el lado iluminado del planeta y
 * su atmósfera coincidan con la hora.
 */
import type { Map as MLMap, GeoJSONSource } from 'maplibre-gl';

const RAD = Math.PI / 180;

/** punto subsolar (grados) en una fecha */
export function subsolar(date: Date): { lat: number; lon: number } {
  const d = date.getTime() / 86400000 + 2440587.5 - 2451545.0; // días desde J2000
  const g = (357.529 + 0.98560028 * d) * RAD;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const e = (23.439 - 0.00000036 * d) * RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = (((18.697374558 + 24.06570982441908 * d) % 24) + 24) % 24;
  let lon = ra / RAD - gmst * 15;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  return { lat: dec / RAD, lon };
}

/**
 * Punto subsolar para una hora solar local fija en una longitud (los temas «día», «tarde» y
 * «noche»): la declinación es la de la fecha y el Sol está donde toca para que en `lon` sean las
 * `hour` horas.
 */
export function subsolarAtLocalHour(date: Date, hour: number, lon: number) {
  const { lat } = subsolar(date);
  let sl = lon - (hour - 12) * 15;
  sl = ((((sl + 180) % 360) + 360) % 360) - 180;
  return { lat, lon: sl };
}

/** curva de puntos donde el Sol está a `alt` grados (de -180 a 180 de longitud) */
function altitudeLine(sub: { lat: number; lon: number }, alt: number): [number, number][] {
  const dec = sub.lat * RAD, sa = Math.sin(alt * RAD);
  const out: [number, number][] = [];
  for (let lo = -180; lo <= 180; lo += 2) {
    const H = (lo - sub.lon) * RAD;
    // sen(alt) = sen(φ)·sen(δ) + cos(φ)·cos(δ)·cos(H) = R·sen(φ + ψ)
    const A = Math.sin(dec), B = Math.cos(dec) * Math.cos(H);
    const R = Math.hypot(A, B), psi = Math.atan2(B, A);
    let phi: number;
    if (Math.abs(sa) >= R) phi = sa * Math.sign(A || 1) > 0 ? 90 : -90;
    else {
      // de las dos soluciones, la que cae en [-90°, 90°]
      const a1 = Math.asin(sa / R) - psi, a2 = Math.PI - Math.asin(sa / R) - psi;
      const norm = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
      const n1 = norm(a1), n2 = norm(a2);
      phi = (Math.abs(n1) <= Math.PI / 2 ? n1 : n2) / RAD;
    }
    out.push([lo, Math.max(-89.9, Math.min(89.9, phi))]);
  }
  return out;
}

/** polígono de la zona donde el Sol está por debajo de `alt` grados */
function darkPolygon(sub: { lat: number; lon: number }, alt: number): GeoJSON.Polygon {
  const line = altitudeLine(sub, alt);
  // con declinación norte, el polo sur es el que queda a oscuras (y al revés)
  const pole = sub.lat >= 0 ? -89.9 : 89.9;
  return { type: 'Polygon', coordinates: [[...line, [180, pole], [-180, pole], line[0]]] };
}

/** polígono de la cara de día (el Sol sobre el horizonte) */
export function sunlitPolygon(sub: { lat: number; lon: number }): GeoJSON.Polygon {
  const line = altitudeLine(sub, 0);
  const pole = sub.lat >= 0 ? 89.9 : -89.9;
  return { type: 'Polygon', coordinates: [[...line, [180, pole], [-180, pole], line[0]]] };
}

const ID = 'fx-night';
/** opacidad de la noche: sólo cuando se ve el planeta entero o un continente */
const fade = (o: number): unknown => ['interpolate', ['linear'], ['zoom'], 0, o, 4, o, 6, 0];

/** dibuja (o actualiza) la sombra de la noche sobre el mapa */
export function setNightShade(map: MLMap, sub: { lat: number; lon: number } | null, before?: string) {
  const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: sub
    ? [0, -3, -6, -9, -12, -18].map((a) => ({ type: 'Feature', properties: {}, geometry: darkPolygon(sub, a) }))
    : [] };
  const src = map.getSource(ID) as GeoJSONSource | undefined;
  if (src) { src.setData(fc); return; }
  if (!sub) return;
  map.addSource(ID, { type: 'geojson', data: fc });
  map.addLayer({ id: ID, type: 'fill', source: ID, paint: { 'fill-color': '#020611', 'fill-opacity': fade(0.1) as any, 'fill-antialias': false } }, before && map.getLayer(before) ? before : undefined);
}

/**
 * Posición de la luz (anclada al mapa) que pone el Sol sobre el punto subsolar en el globo. MapLibre
 * coloca el Sol de la atmósfera en la dirección contraria al vector de la luz, en las coordenadas del
 * globo (x hacia 90° E, y hacia el polo norte, z hacia 0°/0°).
 */
export function globeLightPosition(sub: { lat: number; lon: number }): [number, number, number] {
  const cl = Math.cos(sub.lat * RAD);
  const S = [Math.sin(sub.lon * RAD) * cl, Math.sin(sub.lat * RAD), Math.cos(sub.lon * RAD) * cl];
  const lp = [-S[0], -S[1], -S[2]];
  const polar = Math.acos(Math.max(-1, Math.min(1, lp[2]))) / RAD;
  const az = Math.atan2(lp[1], lp[0]) / RAD - 90;
  return [1.5, ((az % 360) + 360) % 360, polar];
}
