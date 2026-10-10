/**
 * Lluvia radiactiva local (modelo de partículas por capas, tipo WSEG-10 / Glasstone).
 *
 * Actividad total: 1 kt de fisión ≈ 3000 R/h·mi² a H+1 (Glasstone §9.92) ≈ 7770 R/h·km².
 * Se deposita localmente una fracción (≈60 % si la bola de fuego toca el suelo; más en
 * explosiones enterradas o submarinas).
 *
 * La nube se divide en capas (del pie del sombrero a la cima) y las partículas en clases de
 * tiempo de caída (distribución log-normal). Cada combinación capa × clase cae atravesando el
 * perfil de viento real —el viento de cada altura empuja la partícula mientras baja— y se
 * deposita como una mancha gaussiana que se ensancha con el tiempo de vuelo. Así, si el viento
 * gira con la altura, la pluma se curva. Con lluvia, parte de la actividad de las partículas
 * finas cae antes y forma «puntos calientes» cerca de la zona cero.
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
  /** pie del sombrero (m); por defecto la mitad de la cima */
  capBottomM?: number;
  /** viento a la altura z (m): km/h y dirección DESDE la que sopla */
  windAt: (zM: number) => { kmh: number; fromDeg: number };
  /** precipitación (mm/h) en el momento de la explosión */
  rainMmH?: number;
  /** fracción de la actividad que cae localmente (por defecto 0,6) */
  localFrac?: number;
  /** fracción en el núcleo junto a la zona cero (partículas gruesas del tallo) */
  coreFrac?: number;
}

interface Puff { e: number; n: number; s2: number; w: number; tH: number }

/** vector (km/h, este y norte) hacia donde sopla */
const vec = (w: { kmh: number; fromDeg: number }): [number, number] => {
  const a = ((w.fromDeg + 180) * Math.PI) / 180;
  return [Math.sin(a) * Math.max(0, w.kmh), Math.cos(a) * Math.max(0, w.kmh)];
};

/** cuantiles de una normal estándar (para las clases log-normales) */
function probit(p: number) {
  // aproximación de Acklam (suficiente aquí)
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155211301];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const q = Math.min(p, 1 - p);
  let x: number;
  if (q > 0.02425) { const r = q - 0.5, s = r * r; x = ((((((a[0] * s + a[1]) * s + a[2]) * s + a[3]) * s + a[4]) * s + a[5]) * r) / (((((b[0] * s + b[1]) * s + b[2]) * s + b[3]) * s + b[4]) * s + 1); }
  else { const r = Math.sqrt(-2 * Math.log(q)); x = (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) / ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1); }
  return p < 0.5 ? (q > 0.02425 ? x : x) : (q > 0.02425 ? -x : -x);
}

/** Modelo: tasa de dosis a H+1 (R/h) en cualquier punto (m al este, m al norte). */
export function falloutModel(p: FalloutParams) {
  const total = 7770 * p.fissionKt * (p.localFrac ?? 0.6) * p.contact; // R/h·km²
  const capR = p.capRadiusM / 1000; // km
  const Htop = p.cloudTopM;
  const Hbot = p.capBottomM ?? Htop * 0.5;
  const T50 = 1.2 + 2.2 * Math.min(Htop / 1000 / 20, 2.2); // h, mediana del tiempo de caída desde la cima
  const sLn = 0.95;
  const fCore = p.coreFrac ?? 0.3;
  const sigCore = Math.max(0.3, capR * 0.35);
  const rain = Math.max(0, p.rainMmH ?? 0);
  const fRain = Math.min(0.65, rain * 0.15); // fracción lavada por la lluvia
  const T_RAIN = 0.75; // h: con lluvia, las partículas finas caen en la primera hora

  const NL = 6, NC = 18;
  const puffs: Puff[] = [];
  const w0 = (1 - fCore) / (NL * NC);
  for (let j = 0; j < NL; j++) {
    const z0 = Hbot + ((j + 0.5) / NL) * (Htop - Hbot);
    for (let k = 0; k < NC; k++) {
      const q = probit((k + 0.5) / NC);
      const tTop = T50 * Math.exp(sLn * q); // tiempo de caída desde la cima
      const tFall = tTop * (0.55 + 0.45 * (z0 / Htop)); // las capas bajas tardan algo menos
      const split: [number, number][] = rain > 0 && tFall > T_RAIN ? [[tFall, 1 - fRain], [T_RAIN, fRain]] : [[tFall, 1]];
      for (const [tf, wf] of split) {
        // integración de la caída por el perfil de viento (descenso lineal)
        const steps = 12;
        let e = 0, n = 0;
        for (let s = 0; s < steps; s++) {
          const z = z0 * (1 - (s + 0.5) / steps);
          const [u, v] = vec(p.windAt(z));
          e += (u * tf) / steps; n += (v * tf) / steps;
        }
        // el borde a barlovento del sombrero también deposita: origen repartido en el sombrero
        const dist = Math.hypot(e, n);
        const s = capR * 0.45 + 0.07 * dist + 0.5;
        puffs.push({ e, n, s2: s * s, w: w0 * wf, tH: tf });
      }
    }
  }

  const rateKm = (e: number, n: number) => {
    if (total <= 0) return 0;
    let v = (fCore * total) / (2 * Math.PI * sigCore * sigCore) * Math.exp(-(e * e + n * n) / (2 * sigCore * sigCore));
    for (const pf of puffs) {
      const d2 = (e - pf.e) ** 2 + (n - pf.n) ** 2;
      if (d2 > pf.s2 * 25) continue;
      v += (pf.w * total) / (2 * Math.PI * pf.s2) * Math.exp(-d2 / (2 * pf.s2));
    }
    return v;
  };
  // dirección y viento efectivos (centro de masas de la pluma)
  let ce = 0, cn = 0, cw = 0, ct = 0;
  for (const pf of puffs) { ce += pf.e * pf.w; cn += pf.n * pf.w; cw += pf.w; ct += pf.tH * pf.w; }
  ce /= cw; cn /= cw; ct /= cw;
  const axisFrom = ((Math.atan2(-ce, -cn) * 180) / Math.PI + 360) % 360;
  const axisKmh = Math.hypot(ce, cn) / Math.max(0.1, ct);
  let maxE = capR * 2, minE = -capR * 2, maxN = capR * 2, minN = -capR * 2;
  for (const pf of puffs) { const s = Math.sqrt(pf.s2) * 2.5; maxE = Math.max(maxE, pf.e + s); minE = Math.min(minE, pf.e - s); maxN = Math.max(maxN, pf.n + s); minN = Math.min(minN, pf.n - s); }
  return {
    total, capR, puffs,
    bbox: { minE, maxE, minN, maxN },
    axisFromDeg: axisFrom, axisKmh,
    /** tasa en un punto (m al este, m al norte) */
    rateAtLocal: (eM: number, nM: number) => rateKm(eM / 1000, nM / 1000),
    rateKm,
  };
}

export function computeFallout(p: FalloutParams): FalloutContour[] {
  if (p.contact <= 0.01 || p.fissionKt <= 0) return [];
  const M = falloutModel(p);
  const { minE, maxE, minN, maxN } = M.bbox;
  const W = maxE - minE, Hh = maxN - minN;
  const nx = W > Hh ? 280 : Math.max(60, Math.round((280 * W) / Hh));
  const ny = W > Hh ? Math.max(60, Math.round((280 * Hh) / W)) : 280;
  const dx = W / (nx - 1), dy = Hh / (ny - 1);
  const grid = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) grid[j * nx + i] = M.rateKm(minE + i * dx, minN + j * dy);

  const gen = contours().size([nx, ny]).thresholds(LEVELS.map((l) => l.level));
  const result = gen(Array.from(grid));
  const out: FalloutContour[] = [];
  for (const c of result) {
    const meta = LEVELS.find((l) => l.level === c.value)!;
    if (!c.coordinates.length) continue;
    let cells = 0, maxD = 0;
    for (let k = 0; k < grid.length; k++) {
      if (grid[k] >= c.value) {
        cells++;
        const gi = k % nx, gj = (k - gi) / nx;
        maxD = Math.max(maxD, Math.hypot(minE + gi * dx, minN + gj * dy));
      }
    }
    const polys = c.coordinates.map((poly) => poly.map((ring) => ring.map(([gi, gj]) => [(minE + (gi - 0.5) * dx) * 1000, (minN + (gj - 0.5) * dy) * 1000] as [number, number])));
    out.push({ level: c.value, label: meta.label, color: meta.color, polygons: polys, areaKm2: cells * dx * dy, maxDownwindKm: maxD });
  }
  return out.sort((a, b) => a.level - b.level);
}
