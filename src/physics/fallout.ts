/**
 * Lluvia radiactiva local (modelo analítico simplificado tipo WSEG-10 / Glasstone).
 *
 * Actividad total: 1 kt de fisión ≈ 3000 R/h·mi² a H+1 (Glasstone §9.92) ≈ 7770 R/h·km².
 * Se deposita ~60 % localmente si la bola de fuego toca el suelo.
 * Distribución: un núcleo alrededor de la zona cero (partículas grandes del tallo)
 * + un penacho a sotavento con distribución log-normal de tiempos de caída y
 * dispersión lateral creciente.
 */
import { contours } from 'd3-contour';
import type { FalloutContour } from './types';

const LEVELS: { level: number; label: string; color: string }[] = [
  { level: 1000, label: '1000 rad/h', color: '#d6ff1f' },
  { level: 100, label: '100 rad/h', color: '#9be22d' },
  { level: 10, label: '10 rad/h', color: '#4fb83a' },
  { level: 1, label: '1 rad/h', color: '#2d7d46' },
];

export interface FalloutParams {
  fissionKt: number; // kt de fisión efectivos
  contact: number; // 0..1
  cloudTopM: number;
  capRadiusM: number;
  windFromDeg: number;
  windKmh: number;
}

export function computeFallout(p: FalloutParams): FalloutContour[] {
  if (p.contact <= 0.01 || p.fissionKt <= 0) return [];
  const total = 7770 * p.fissionKt * 0.6 * p.contact; // R/h·km²
  const u = Math.max(p.windKmh, 4); // km/h
  const capR = p.capRadiusM / 1000; // km
  const Htop = p.cloudTopM / 1000;
  const T50 = 1.2 + 2.2 * Math.min(Htop / 20, 2.2); // h, mediana del tiempo de caída
  const xm = u * T50; // km
  const sLn = 0.95;

  const fCore = 0.3;
  const sigCore = Math.max(0.3, capR * 0.35);

  // dominio
  const xMax = xm * 9 + capR * 2;
  const xMin = -Math.max(capR * 1.6, 2);
  const yMax = capR * 1.4 + 0.12 * xMax + 2;
  const nx = 260, ny = 120;
  const dx = (xMax - xMin) / (nx - 1);
  const dy = (2 * yMax) / (ny - 1);
  const grid = new Float64Array(nx * ny);

  const sigY = (x: number) => capR * 0.45 + 0.07 * Math.max(x, 0) + 0.5;
  // normalización del penacho (integral de la log-normal en x = 1)
  for (let j = 0; j < ny; j++) {
    const y = -yMax + j * dy;
    for (let i = 0; i < nx; i++) {
      const x = xMin + i * dx;
      let v = 0;
      // núcleo
      const r2 = x * x + y * y;
      v += (fCore * total) / (2 * Math.PI * sigCore * sigCore) * Math.exp(-r2 / (2 * sigCore * sigCore));
      // penacho: densidad lineal log-normal en x · gaussiana en y
      const xe = x + capR * 0.6; // el borde a barlovento del sombrero también deposita
      if (xe > 0.05) {
        const lx = Math.log(xe / xm);
        const gx = Math.exp(-(lx * lx) / (2 * sLn * sLn)) / (xe * sLn * Math.sqrt(2 * Math.PI));
        const sy = sigY(xe);
        const gy = Math.exp(-(y * y) / (2 * sy * sy)) / (sy * Math.sqrt(2 * Math.PI));
        v += (1 - fCore) * total * gx * gy;
      }
      grid[j * nx + i] = v;
    }
  }

  const downwind = ((p.windFromDeg + 180) * Math.PI) / 180; // rumbo hacia el que va
  const ex = Math.sin(downwind), ny_ = Math.cos(downwind); // vector unitario (este, norte)
  const toLocal = (gi: number, gj: number): [number, number] => {
    const x = (xMin + gi * dx) * 1000;
    const y = (-yMax + gj * dy) * 1000;
    // x a lo largo del viento, y perpendicular (izquierda)
    const e = x * ex - y * ny_;
    const n = x * ny_ + y * ex;
    return [e, n];
  };

  const gen = contours().size([nx, ny]).thresholds(LEVELS.map((l) => l.level));
  const result = gen(Array.from(grid));
  const out: FalloutContour[] = [];
  for (const c of result) {
    const meta = LEVELS.find((l) => l.level === c.value)!;
    if (!c.coordinates.length) continue;
    let cells = 0;
    let maxX = 0;
    for (let k = 0; k < grid.length; k++) {
      if (grid[k] >= c.value) {
        cells++;
        const gi = k % nx;
        maxX = Math.max(maxX, xMin + gi * dx);
      }
    }
    const polys = c.coordinates.map((poly) => poly.map((ring) => ring.map(([gi, gj]) => toLocal(gi - 0.5, gj - 0.5))));
    out.push({
      level: c.value,
      label: meta.label,
      color: meta.color,
      polygons: polys,
      areaKm2: cells * dx * dy,
      maxDownwindKm: maxX,
    });
  }
  return out.sort((a, b) => a.level - b.level);
}
