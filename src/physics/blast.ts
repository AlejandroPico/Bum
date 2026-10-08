/**
 * Onda expansiva (sobrepresión).
 *
 * Base: ajuste de Glasstone & Dolan (1977) para explosión en superficie de 1 kt
 * (forma usada por Collins, Melosh & Marcus 2005, Earth Impact Effects Program):
 *   p(r1) = px·rx/(4·r1) · (1 + 3·(rx/r1)^1.3)   [Pa],  r1 = r / Y^(1/3)  [m]
 * Para explosión aérea a altura óptima se aplica el realce de la onda de Mach
 * (factor de alcance k(psi)), calibrado con la tabla de "The Effects of Nuclear
 * Weapons": 1 kt óptimo → 20 psi ≈ 0,24 km · 5 psi ≈ 0,6 km · 1 psi ≈ 1,7 km.
 */

export const P0 = 101325; // Pa, presión atmosférica
export const C0 = 340; // m/s, velocidad del sonido
export const PSI = 6894.76; // Pa

const PX = 75000;
const RX = 290;

/** Sobrepresión de explosión en superficie para 1 kt a distancia escalada r1 (m). */
export function surfacePressure1kt(r1: number): number {
  const r = Math.max(r1, 1);
  return ((PX * RX) / (4 * r)) * (1 + 3 * Math.pow(RX / r, 1.3));
}

/** Distancia escalada (m, 1 kt) a la que la explosión en superficie alcanza `pa` Pa. */
export function surfaceRange1kt(pa: number): number {
  let lo = 1, hi = 1e6;
  for (let i = 0; i < 80; i++) {
    const mid = Math.sqrt(lo * hi);
    if (surfacePressure1kt(mid) > pa) lo = mid; else hi = mid;
  }
  return Math.sqrt(lo * hi);
}

/** Factor de realce de Mach para la altura óptima (relativo a superficie). */
function machFactor(psi: number): number {
  const pts: [number, number][] = [
    [0.05, 1.42], [1, 1.44], [2, 1.45], [5, 1.41], [10, 1.3], [20, 1.12], [50, 1.0], [200, 0.95], [10000, 0.95],
  ];
  const lp = Math.log(Math.max(psi, 0.05));
  for (let i = 0; i < pts.length - 1; i++) {
    const a = Math.log(pts[i][0]), b = Math.log(pts[i + 1][0]);
    if (lp <= b) {
      const t = (lp - a) / (b - a);
      return pts[i][1] + t * (pts[i + 1][1] - pts[i][1]);
    }
  }
  return 0.95;
}

function interpLogPsi(psi: number, pts: [number, number][]): number {
  const lp = Math.log(psi);
  if (lp <= Math.log(pts[0][0])) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = Math.log(pts[i][0]), b = Math.log(pts[i + 1][0]);
    if (lp <= b) return pts[i][1] + ((lp - a) / (b - a)) * (pts[i + 1][1] - pts[i][1]);
  }
  return pts[pts.length - 1][1];
}
/** altura óptima / alcance óptimo (curvas HOB de Glasstone, aprox.) */
const HOPT_K: [number, number][] = [[1, 0.36], [5, 0.4], [20, 0.6], [100, 0.6]];
/** altura máxima a la que `psi` llega al suelo / alcance óptimo */
const HMAX_K: [number, number][] = [[1, 0.75], [5, 0.9], [20, 1.25], [100, 1.1]];

/** Altura óptima escalada (m, 1 kt) para maximizar el alcance de `psi`. */
export function optimumHeight1kt(psi: number): number {
  const ro = surfaceRange1kt(psi * PSI) * machFactor(psi);
  return interpLogPsi(psi, HOPT_K) * ro;
}

/**
 * Alcance en suelo (m) de la sobrepresión `psi` para una explosión de `yieldKt`
 * a `heightM` metros sobre el suelo.
 */
export function blastRange(yieldKt: number, psi: number, heightM: number): number {
  const s = Math.cbrt(Math.max(yieldKt, 1e-9));
  const h1 = Math.max(0, heightM) / s;
  const rs = surfaceRange1kt(psi * PSI);
  const ro = rs * machFactor(psi);
  const hopt = interpLogPsi(psi, HOPT_K) * ro;
  const hmax = Math.max(interpLogPsi(psi, HMAX_K) * ro, hopt * 1.05);
  let r1: number;
  if (h1 <= hopt) {
    const f = Math.sin((Math.PI / 2) * (h1 / hopt));
    r1 = rs + (ro - rs) * f;
  } else if (h1 < hmax) {
    const t = (h1 - hopt) / (hmax - hopt);
    r1 = ro * Math.sqrt(1 - t * t);
  } else r1 = 0;
  return r1 * s;
}

/** Sobrepresión (psi) en un punto del suelo a distancia `groundM` de la zona cero. */
export function pressureAt(yieldKt: number, groundM: number, heightM: number): number {
  let lo = Math.log(1e-4), hi = Math.log(1e5);
  if (blastRange(yieldKt, Math.exp(lo), heightM) < groundM) return 0;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (blastRange(yieldKt, Math.exp(mid), heightM) >= groundM) lo = mid; else hi = mid;
  }
  return Math.exp(lo);
}

/** Velocidad máxima del viento tras el frente (m/s) para sobrepresión `pa` (Pa). */
export function peakWind(pa: number): number {
  const x = pa / P0;
  return ((5 * x) / 7) * C0 / Math.sqrt(1 + (6 * x) / 7);
}

/** Nivel sonoro equivalente (dB SPL) de una sobrepresión en Pa. */
export function decibels(pa: number): number {
  return 20 * Math.log10(Math.max(pa, 2e-5) / 2e-5);
}

/**
 * Tabla tiempo de llegada del frente de choque frente a distancia (desde el punto de
 * detonación). Integra dr/dt = c0·sqrt(1 + 6p/7P0).
 */
export function shockArrivalTable(yieldKt: number, maxR: number): { r: number[]; t: number[] } {
  const s = Math.cbrt(Math.max(yieldKt, 1e-9));
  const r: number[] = [0];
  const t: number[] = [0];
  let rr = 0.5 * s;
  let tt = 0;
  r.push(rr); t.push(0.0001 * s);
  tt = 0.0001 * s;
  while (rr < maxR) {
    const p = Math.min(surfacePressure1kt(rr / s) * 0.6, 5e8);
    const u = C0 * Math.sqrt(1 + (6 * p) / (7 * P0));
    const dr = Math.max(rr * 0.02, 1);
    tt += dr / u;
    rr += dr;
    r.push(rr); t.push(tt);
  }
  return { r, t };
}

export function interpTable(xs: number[], ys: number[], x: number): number {
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  let lo = 0, hi = xs.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (xs[m] <= x) lo = m; else hi = m;
  }
  const f = (x - xs[lo]) / (xs[hi] - xs[lo]);
  return ys[lo] + f * (ys[hi] - ys[lo]);
}
