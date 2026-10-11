/**
 * Sombra del relieve: desde la bola de fuego se trazan líneas de visión sobre el modelo digital del
 * terreno. Un punto queda «a la sombra» si una colina o una montaña tapa la bola de fuego: el
 * destello de calor no le llega directamente (sólo la luz dispersada, mucho más débil) y la onda
 * expansiva se atenúa algo al rodear el obstáculo (Glasstone y Dolan, §3.70 y §7.40).
 */
import { contours } from 'd3-contour';

export interface TerrainShadow {
  /** polígonos (anillos [e, n] en metros respecto a la zona cero) */
  polygons: [number, number][][][];
  /** km² a la sombra dentro del radio de quemaduras */
  areaKm2: number;
  /** fracción del área de quemaduras de 2.º grado que queda a la sombra */
  frac: number;
  radiusM: number;
  /** relieve máximo encontrado (m sobre la zona cero) */
  reliefM: number;
}

export function computeTerrainShadow(sample: (la: number, lo: number) => number | null, lat: number, lon: number, burstHeightM: number, radiusM: number): TerrainShadow | null {
  const z0 = sample(lat, lon) ?? 0;
  const H = z0 + Math.max(2, burstHeightM); // altura de la bola de fuego sobre el nivel del mar
  const NA = 360, NR = 220;
  const cosL = Math.cos((lat * Math.PI) / 180);
  const mask = new Uint8Array(NA * NR);
  let relief = 0;
  for (let a = 0; a < NA; a++) {
    const th = (a / NA) * 2 * Math.PI, se = Math.sin(th), cn = Math.cos(th);
    let maxSlope = -Infinity;
    for (let k = 0; k < NR; k++) {
      const r = ((k + 1) / NR) * radiusM;
      const e = se * r, n = cn * r;
      const h = sample(lat + n / 110570, lon + e / (111320 * cosL));
      if (h == null) continue;
      relief = Math.max(relief, h - z0);
      const eye = (h + 2 - H) / r; // pendiente hacia una persona de pie
      if (eye < maxSlope - 0.002) mask[a * NR + k] = 1;
      maxSlope = Math.max(maxSlope, (h - H) / r);
    }
  }
  // a rejilla cartesiana para dibujar contornos
  const N = 240, half = radiusM;
  const grid = new Float64Array(N * N);
  let shadowCells = 0, total = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const e = -half + ((i + 0.5) / N) * 2 * half, n = -half + ((j + 0.5) / N) * 2 * half;
    const r = Math.hypot(e, n);
    if (r > radiusM || r < radiusM / NR) continue;
    total++;
    const a = Math.round(((Math.atan2(e, n) / (2 * Math.PI) + 1) % 1) * NA) % NA;
    const k = Math.min(NR - 1, Math.max(0, Math.round((r / radiusM) * NR) - 1));
    const v = mask[a * NR + k];
    grid[j * N + i] = v;
    shadowCells += v;
  }
  if (!shadowCells) return { polygons: [], areaKm2: 0, frac: 0, radiusM, reliefM: relief };
  const cell = (2 * half) / N;
  const cs = contours().size([N, N]).thresholds([0.5])(Array.from(grid));
  const polygons = cs[0].coordinates.map((poly) => poly.map((ring) => ring.map(([gi, gj]) => [-half + gi * cell, -half + gj * cell] as [number, number])));
  return { polygons, areaKm2: (shadowCells * cell * cell) / 1e6, frac: shadowCells / Math.max(1, total), radiusM, reliefM: relief };
}
