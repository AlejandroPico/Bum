/**
 * Mapas de calor: población, víctimas mortales inmediatas y muertes por la lluvia radiactiva
 * (sin refugio) en una malla regular de latitud y longitud. Los valores son densidades por km²,
 * con los mismos modelos que el recuento de víctimas del simulador.
 */
import type { Effects } from './types';
import { casualtyProbs, ll } from './effects';
import { densityField } from '../data/cities';

export type HeatKind = 'pop' | 'deaths' | 'fallout';
export interface HeatGrid {
  kind: HeatKind;
  w: number; h: number;
  north: number; south: number; west: number; east: number;
  /** valor por km² de cada celda (fila 0 = norte) */
  val: Float32Array;
  max: number;
  /** suma de la malla (personas o víctimas) */
  total: number;
}
export interface HeatStrike { fx: Effects; lat: number; lon: number }

const M_LAT = 110570, M_LON = 111320;

/** alcance (m) de los efectos que causan víctimas inmediatas */
export function lethalReach(fx: Effects): number {
  const rs = fx.rings.filter((r) => !r.global && r.group !== 'seismic' && r.group !== 'emp' && r.group !== 'tsunami').map((r) => r.radiusM);
  return Math.min(2.5e6, Math.max(500, ...rs) * 1.05);
}

/** caja que contiene la lluvia radiactiva de una detonación (m este / m norte desde la zona cero) */
function falloutBox(fx: Effects) {
  let minE = Infinity, maxE = -Infinity, minN = Infinity, maxN = -Infinity;
  for (const c of fx.fallout) for (const p of c.polygons) for (const ring of p) for (const [e, n] of ring) {
    if (e < minE) minE = e; if (e > maxE) maxE = e; if (n < minN) minN = n; if (n > maxN) maxN = n;
  }
  if (!Number.isFinite(minE)) return null;
  const pad = 0.06 * Math.max(maxE - minE, maxN - minN);
  return { minE: minE - pad, maxE: maxE + pad, minN: minN - pad, maxN: maxN + pad };
}

/** número de celdas por lado según la forma de la caja */
function dims(north: number, south: number, west: number, east: number, N: number) {
  const cLat = (north + south) / 2;
  const kmX = (east - west) * M_LON * Math.cos((cLat * Math.PI) / 180), kmY = (north - south) * M_LAT;
  const a = kmX / Math.max(1, kmY);
  return a >= 1 ? { w: N, h: Math.max(24, Math.round(N / a)) } : { w: Math.max(24, Math.round(N * a)), h: N };
}

/**
 * Calcula una malla de calor. `strikes` son las detonaciones; sin ellas (o en «Otros») el mapa de
 * población usa `area` (centro y radio en km).
 */
export function heatGrid(kind: HeatKind, strikes: HeatStrike[], area?: { lat: number; lon: number; radiusKm: number }, N = 220): HeatGrid | null {
  let north = -90, south = 90, west = 180, east = -180;
  const grow = (lat: number, lon: number, eMin: number, eMax: number, nMin: number, nMax: number) => {
    const cos = Math.max(0.05, Math.cos((lat * Math.PI) / 180));
    north = Math.max(north, lat + nMax / M_LAT); south = Math.min(south, lat + nMin / M_LAT);
    east = Math.max(east, lon + eMax / (M_LON * cos)); west = Math.min(west, lon + eMin / (M_LON * cos));
  };
  const nuclear = strikes.filter((s) => !s.fx.release && !s.fx.volcano && !s.fx.dam && !s.fx.solar && !s.fx.war);
  if (kind === 'deaths') {
    if (!nuclear.length) return null;
    for (const s of nuclear) { const R = lethalReach(s.fx); grow(s.lat, s.lon, -R, R, -R, R); }
  } else if (kind === 'fallout') {
    const withF = nuclear.filter((s) => s.fx.fallout.length && s.fx.falloutDoseAt);
    if (!withF.length) return null;
    for (const s of withF) { const b = falloutBox(s.fx); if (b) grow(s.lat, s.lon, b.minE, b.maxE, b.minN, b.maxN); }
    if (north < south) return null;
  } else {
    if (nuclear.length) for (const s of nuclear) { const R = Math.max(lethalReach(s.fx) * 1.4, 8000); grow(s.lat, s.lon, -R, R, -R, R); }
    else if (area) { const R = Math.max(2, area.radiusKm) * 1000; grow(area.lat, area.lon, -R, R, -R, R); }
    else return null;
  }
  north = Math.min(84, north); south = Math.max(-84, south);
  if (east - west > 359) { west = -180; east = 180; }
  const { w, h } = dims(north, south, west, east, kind === 'fallout' ? Math.min(N, 160) : N);
  const dLa = (north - south) / h, dLo = (east - west) / w;
  const cLat = (north + south) / 2, cLon = (east + west) / 2;
  const spanKm = Math.max((north - south) * M_LAT, (east - west) * M_LON * Math.cos((cLat * Math.PI) / 180)) / 1000;
  const field = densityField(cLat, cLon, spanKm / 2 + 20);
  const val = new Float32Array(w * h);

  // tablas radiales de probabilidad de muerte (como en el recuento combinado)
  const NT = 600;
  const src = kind === 'pop' ? [] : nuclear;
  const reach = src.map((s) => lethalReach(s.fx));
  const tables = src.map((s, k) => {
    const pd = new Float32Array(NT + 1);
    for (let i = 0; i <= NT; i++) pd[i] = casualtyProbs(s.fx, reach[k] * (i / NT) ** 2).pd;
    return pd;
  });
  const pdAt = (k: number, r: number) => {
    if (r >= reach[k]) return 0;
    const u = Math.sqrt(r / reach[k]) * NT, i = Math.min(NT - 1, Math.floor(u)), f = u - i, T = tables[k];
    return T[i] + (T[i + 1] - T[i]) * f;
  };

  let max = 0, total = 0;
  for (let j = 0; j < h; j++) {
    const la = north - (j + 0.5) * dLa;
    const cosl = Math.cos((la * Math.PI) / 180);
    const cellKm2 = dLa * (M_LAT / 1000) * dLo * (M_LON / 1000) * cosl;
    for (let i = 0; i < w; i++) {
      const lo = west + (i + 0.5) * dLo;
      let v = 0;
      if (kind === 'pop') v = field.atLatLon(la, lo);
      else {
        let surv = 1, any = false;
        for (let k = 0; k < src.length; k++) {
          const s = src[k];
          const r = Math.hypot((la - s.lat) * M_LAT, (lo - s.lon) * M_LON * cosl);
          if (r < reach[k]) { any = true; surv *= 1 - pdAt(k, r); }
        }
        if (kind === 'deaths') { if (any && surv < 0.9999) v = field.atLatLon(la, lo) * (1 - surv); }
        else {
          // muertes por la lluvia radiactiva entre los supervivientes, a la intemperie o en casas ligeras
          let pSurvF = 1;
          for (const s of src) {
            if (!s.fx.fallout.length || !s.fx.falloutDoseAt) continue;
            const e = (lo - s.lon) * M_LON * cosl, n = (la - s.lat) * M_LAT;
            if (s.fx.falloutRateAt(e, n) < 0.05) continue;
            pSurvF *= 1 - ll(s.fx.falloutDoseAt(e, n, 0, 168, 1.5), 450, 6);
          }
          if (pSurvF < 0.9999) v = field.atLatLon(la, lo) * surv * (1 - pSurvF);
        }
      }
      val[j * w + i] = v;
      if (v > max) max = v;
      total += v * cellKm2;
    }
  }
  return { kind, w, h, north, south, west, east, val, max, total };
}
