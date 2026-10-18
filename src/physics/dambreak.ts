/**
 * Rotura de presa con un modelo hidráulico: ecuaciones de aguas someras en la aproximación
 * «inercial local» de Bates, Horritt y Fewtrell (2010), la que usa LISFLOOD-FP, sobre una rejilla del
 * relieve real. El agua del embalse sale por la brecha según un hidrograma (sube mientras se abre la
 * brecha, Froehlich 2008, y después baja hasta vaciar el volumen) y se reparte por el valle según la
 * pendiente de la superficie del agua y el rozamiento del terreno (Manning). Así la ola se encauza,
 * se frena en los llanos, rellena las depresiones y se para cuando ya no queda agua que empuje.
 *
 * No depende del navegador: se ejecuta en un «worker» y en las pruebas.
 */
export interface DamSimInput {
  /** cotas del terreno (m) en una rejilla N × N, fila a fila de sur a norte; NaN fuera de los datos */
  elev: Float32Array;
  N: number;
  /** lado de la celda (m) */
  cell: number;
  /** celda del pie de la presa */
  si: number; sj: number;
  /** volumen embalsado (m³), altura de la presa (m) y caudal punta de la brecha (m³/s) */
  V: number; H: number; Qp: number;
  /** rugosidad de Manning (s·m^-1/3) */
  manning?: number;
  /** límite de tiempo simulado (s) */
  maxS?: number;
}
export interface DamSimOutput {
  /** profundidad máxima (m) y hora de llegada (h; −1 si no llega) en cada celda */
  maxDepth: Float32Array;
  arrivalH: Float32Array;
  /** fotos de la profundidad en distintos instantes */
  snaps: { tS: number; depth: Float32Array }[];
  /** tiempo simulado (s), duración del vaciado (s) y tiempo de formación de la brecha (s) */
  endS: number; drainS: number; breachS: number;
  /** pasos de cálculo */
  steps: number;
}

const G = 9.81;

/** instantes de las fotos de la inundación (s) */
export const SNAP_TIMES = [300, 600, 1200, 1800, 2700, 3600, 5400, 7200, 10800, 14400, 21600, 28800, 43200, 57600, 86400, 129600, 172800];

export function simulateDamBreak(inp: DamSimInput): DamSimOutput {
  const { N, cell } = inp;
  const n2 = (inp.manning ?? 0.045) ** 2;
  const NN = N * N;
  const z = new Float32Array(NN);
  for (let k = 0; k < NN; k++) z[k] = Number.isFinite(inp.elev[k]) ? inp.elev[k] : 1e5;
  const h = new Float32Array(NN);
  const qx = new Float32Array(NN); // cara entre (i, j) y (i+1, j)
  const qy = new Float32Array(NN); // cara entre (i, j) y (i, j+1)
  const maxDepth = new Float32Array(NN);
  const arrivalH = new Float32Array(NN).fill(-1);
  // hidrograma de la brecha: tiempo de formación (Froehlich 2008, en horas) y vaciado exponencial
  const breachS = Math.min(6, Math.max(0.1, 0.00254 * Math.pow(inp.V, 0.53) * Math.pow(inp.H, -0.9))) * 3600;
  let Qp = inp.Qp;
  // que el volumen cuadre: Qp·tb/2 durante la apertura y Qp·τ después
  if (Qp * breachS / 2 > inp.V * 0.6) Qp = (inp.V * 0.6 * 2) / breachS;
  const tau = Math.max(600, (inp.V - (Qp * breachS) / 2) / Qp);
  const Q = (t: number) => (t < breachS ? Qp * (t / breachS) : Qp * Math.exp(-(t - breachS) / tau));
  const drainS = breachS + 4 * tau;
  const maxS = Math.min(inp.maxS ?? 172800, Math.max(4 * 3600, drainS * 1.6));
  // el caudal entra repartido en las celdas del pie de la presa (3 × 3)
  const src: number[] = [];
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const i = inp.si + di, j = inp.sj + dj;
    if (i > 0 && j > 0 && i < N - 1 && j < N - 1) src.push(j * N + i);
  }
  const A = cell * cell;
  const snaps: { tS: number; depth: Float32Array }[] = [];
  let snapI = 0;
  // zona activa (celdas mojadas y un margen) para no recorrer toda la rejilla al principio
  let i0 = Math.max(1, inp.si - 3), i1 = Math.min(N - 2, inp.si + 3), j0 = Math.max(1, inp.sj - 3), j1 = Math.min(N - 2, inp.sj + 3);
  let t = 0, steps = 0, hmax = 0.5;
  const ARR = 0.1; // m: se considera que el agua ha llegado
  while (t < maxS && steps < 400000) {
    // paso de tiempo estable (CFL de las ondas de gravedad)
    const dt = Math.min(60, 0.7 * cell / Math.sqrt(G * Math.max(0.5, hmax)));
    // caudales en las caras (con el rozamiento implícito)
    for (let j = j0; j <= j1; j++) {
      for (let i = i0 - 1; i <= i1; i++) {
        const k = j * N + i, kr = k + 1;
        const ea = z[k] + h[k], eb = z[kr] + h[kr];
        const hf = Math.max(ea, eb) - Math.max(z[k], z[kr]);
        if (hf <= 1e-3) { qx[k] = 0; continue; }
        const q0 = qx[k];
        qx[k] = (q0 - G * hf * dt * (eb - ea) / cell) / (1 + G * dt * n2 * Math.abs(q0) / Math.pow(hf, 7 / 3));
      }
    }
    for (let j = j0 - 1; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = j * N + i, ku = k + N;
        const ea = z[k] + h[k], eb = z[ku] + h[ku];
        const hf = Math.max(ea, eb) - Math.max(z[k], z[ku]);
        if (hf <= 1e-3) { qy[k] = 0; continue; }
        const q0 = qy[k];
        qy[k] = (q0 - G * hf * dt * (eb - ea) / cell) / (1 + G * dt * n2 * Math.abs(q0) / Math.pow(hf, 7 / 3));
      }
    }
    // entrada de agua por la brecha
    const inflow = Q(t) * dt / src.length / A;
    for (const k of src) h[k] += inflow;
    // balance de cada celda; el agua que llega a los bordes sale de la rejilla
    hmax = 0;
    let ni0 = N, ni1 = 0, nj0 = N, nj1 = 0;
    const tH = (t + dt) / 3600;
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = j * N + i;
        let v = h[k] + dt * (qx[k - 1] - qx[k] + qy[k - N] - qy[k]) / cell;
        if (v < 0) v = 0;
        if (i <= 1 || j <= 1 || i >= N - 2 || j >= N - 2) v = 0;
        h[k] = v;
        if (v > 1e-3) {
          if (v > hmax) hmax = v;
          if (v > maxDepth[k]) maxDepth[k] = v;
          if (v > ARR && arrivalH[k] < 0) arrivalH[k] = tH;
          if (i < ni0) ni0 = i; if (i > ni1) ni1 = i; if (j < nj0) nj0 = j; if (j > nj1) nj1 = j;
        }
      }
    }
    if (ni1 >= ni0) { i0 = Math.max(1, ni0 - 2); i1 = Math.min(N - 2, ni1 + 2); j0 = Math.max(1, nj0 - 2); j1 = Math.min(N - 2, nj1 + 2); }
    t += dt; steps++;
    while (snapI < SNAP_TIMES.length && SNAP_TIMES[snapI] <= t) { snaps.push({ tS: SNAP_TIMES[snapI], depth: h.slice() }); snapI++; }
    // ya vaciado y el agua casi quieta: se acaba antes
    if (t > drainS && steps % 50 === 0) {
      let qm = 0;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * N + i; qm = Math.max(qm, Math.abs(qx[k]), Math.abs(qy[k])); }
      if (qm < 0.05) break;
    }
  }
  snaps.push({ tS: t, depth: h.slice() });
  return { maxDepth, arrivalH, snaps, endS: t, drainS, breachS, steps };
}
