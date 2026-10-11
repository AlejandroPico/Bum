/**
 * Vuelo del arma desde su base hasta el objetivo, según el tipo de vector:
 *  - balístico (ICBM, SLBM, IRBM): arco por el espacio con apogeo de cientos de km (`ballistic`);
 *  - planeador hipersónico (Avangard, DF-17): un cohete lo sube a unos 100 km y después planea por
 *    la alta atmósfera (≈ 40–70 km) a Mach 15–20, maniobrando para despistar a las defensas;
 *  - misil de crucero (Kh-102, Tomahawk…): vuelo rasante a 50–100 m, subsónico, con una ruta de
 *    puntos de paso que esquiva defensas; tarda horas en distancias largas;
 *  - avión (bombas de gravedad): bombardero a unos 11 km de altura.
 * Con varios objetivos y un misil balístico, un único misil lleva varias ojivas (MIRV): el «bus»
 * se separa a mitad del vuelo y suelta cada ojiva hacia su objetivo, si están dentro de su huella.
 *
 * Valores de divulgación (FAS, CSIS Missile Threat, Wright 2017, Acton 2013 «Silver Bullet?»).
 */
import { ballistic, greatCircleKm, greatCirclePath } from './launch';

export type FlightProfile = 'ballistic' | 'hgv' | 'cruise' | 'aircraft';
export const PROFILE_NAMES: Record<FlightProfile, string> = {
  ballistic: 'Misil balístico',
  hgv: 'Planeador hipersónico',
  cruise: 'Misil de crucero',
  aircraft: 'Bombardero',
};

/** tipo de vector que corresponde a un arma por su nombre */
export function profileFor(name: string): FlightProfile {
  const n = name.toLowerCase();
  if (/avangard|df-17|df-zf|planeador/.test(n)) return 'hgv';
  if (/kh-\d|tomahawk|w80|kalibr|burevestnik|asmp|crucero|agm-86|lrso|slcm/.test(n)) return 'cruise';
  if (/^b-?\d|\bb61|\bb83|\bb53|\bb41|\bb28|little boy|fat man|bomba/.test(n)) return 'aircraft';
  return 'ballistic';
}

export interface FlightLeg {
  /** puntos [lon, lat] y altura (km) en cada uno */
  pts: [number, number][];
  alt: number[];
  /** fracción del vuelo total en que empieza y acaba este tramo */
  f0: number; f1: number;
  /** índice del objetivo (−1: el «bus» de un MIRV) */
  target: number;
}
export interface FlightPlan {
  profile: FlightProfile;
  name: string;
  rangeKm: number;
  flightMin: number;
  apogeeKm: number;
  /** velocidad final (km/s) */
  reentryKms: number;
  boostMin: number;
  warningMin: number;
  /** altura de crucero o de planeo (km), si la hay */
  cruiseKm?: number;
  /** número de ojivas del mismo misil (MIRV) */
  mirv?: number;
  legs: FlightLeg[];
  /** fase del vuelo en una fracción f */
  phase(f: number): string;
}

const RAD = Math.PI / 180;
function bearingDeg(la1: number, lo1: number, la2: number, lo2: number) {
  const y = Math.sin((lo2 - lo1) * RAD) * Math.cos(la2 * RAD);
  const x = Math.cos(la1 * RAD) * Math.sin(la2 * RAD) - Math.sin(la1 * RAD) * Math.cos(la2 * RAD) * Math.cos((lo2 - lo1) * RAD);
  return Math.atan2(y, x) / RAD;
}
function dest(la: number, lo: number, km: number, brg: number): [number, number] {
  const d = km / 6371, b = brg * RAD, p1 = la * RAD, l1 = lo * RAD;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [l2 / RAD, p2 / RAD];
}

/** recorrido sobre el suelo con desvíos laterales (maniobras o puntos de paso) */
function track(la0: number, lo0: number, la1: number, lo1: number, n: number, ampKm: number, waves: number, seed: number): [number, number][] {
  const base = greatCirclePath(la0, lo0, la1, lo1, n);
  if (ampKm <= 0) return base;
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const [lo, la] = base[i];
    const j = Math.min(n, i + 1), k = Math.max(0, i - 1);
    const b = bearingDeg(base[k][1], base[k][0], base[j][1], base[j][0]);
    // nulo en los extremos; varias ondas de distinta amplitud para que no parezca una sinusoide
    const env = Math.sin(Math.PI * f) ** 1.2;
    const off = ampKm * env * (Math.sin(2 * Math.PI * waves * f + seed) * 0.75 + Math.sin(2 * Math.PI * (waves * 0.43) * f + seed * 2.1) * 0.25);
    out.push(off === 0 ? [lo, la] : dest(la, lo, Math.abs(off), b + (off > 0 ? 90 : -90)));
  }
  // continuidad de longitudes
  for (let i = 1; i < out.length; i++) { while (out[i][0] - out[i - 1][0] > 180) out[i][0] -= 360; while (out[i][0] - out[i - 1][0] < -180) out[i][0] += 360; }
  return out;
}

/** perfil de altura (km) en la fracción f de un tramo */
function altitude(p: FlightProfile, f: number, apogee: number, cruise: number, boostF: number): number {
  switch (p) {
    case 'ballistic': return apogee * 4 * f * (1 - f);
    case 'hgv': {
      // sube con el cohete, cae a la capa de planeo, planea perdiendo altura y se lanza en picado al final
      if (f < boostF) return 100 * Math.sin((f / boostF) * Math.PI / 2);
      const g = (f - boostF) / (1 - boostF);
      const glide = 100 - (100 - cruise) * Math.min(1, g / 0.15);
      const sag = glide - 20 * Math.max(0, g - 0.15);
      return g > 0.92 ? sag * (1 - (g - 0.92) / 0.08) : sag;
    }
    case 'cruise': return f < 0.02 ? (cruise * f) / 0.02 : cruise;
    case 'aircraft': return f < 0.06 ? (cruise * f) / 0.06 : cruise;
  }
}

/**
 * Plan de vuelo desde una base hasta uno o varios objetivos. Con varios objetivos y un vector
 * balístico, si caben en la huella de un misil (≈ 1.500 km) van en un solo misil con ojivas
 * múltiples; si no, un misil por objetivo, todos desde la misma base.
 */
export function planFlight(profile: FlightProfile, site: { lat: number; lon: number }, targets: { lat: number; lon: number }[]): FlightPlan {
  const cLat = targets.reduce((a, t) => a + t.lat, 0) / targets.length;
  const cLon = targets.reduce((a, t) => a + t.lon, 0) / targets.length;
  const rangeKm = greatCircleKm(site.lat, site.lon, cLat, cLon);
  const B = ballistic(rangeKm);
  let flightMin = B.flightMin, apogeeKm = B.apogeeKm, reentryKms = B.reentryKms, boostMin = B.boostMin, warningMin = B.warningMin;
  let cruiseKm: number | undefined, amp = 0, waves = 2;
  if (profile === 'hgv') {
    // planeo a unos 6 km/s de media tras 2–3 min de cohete; más rápido y más bajo que un ICBM
    boostMin = 2.5;
    flightMin = boostMin + Math.max(0, rangeKm - 300) / 5.2 / 60;
    apogeeKm = 100; cruiseKm = 55; reentryKms = 3;
    // los radares de alerta (sobre el horizonte) lo ven tarde: vuela bajo y cambia de rumbo
    warningMin = Math.max(1, Math.min(flightMin * 0.45, 6));
    amp = Math.min(260, rangeKm * 0.07); waves = 1.6;
  } else if (profile === 'cruise') {
    boostMin = 0.2;
    flightMin = rangeKm / 0.24 / 60; // ≈ 860 km/h
    apogeeKm = 0.1; cruiseKm = 0.06; reentryKms = 0.24;
    // a ras de suelo, el radar sólo lo ve a unas decenas de km
    warningMin = Math.min(flightMin, 4);
    amp = Math.min(160, rangeKm * 0.05); waves = 2.6;
  } else if (profile === 'aircraft') {
    boostMin = 0;
    flightMin = rangeKm / 0.25 / 60; // ≈ 900 km/h
    apogeeKm = 11; cruiseKm = 11; reentryKms = 0.25;
    warningMin = Math.min(flightMin, 40);
    amp = Math.min(120, rangeKm * 0.03); waves = 1.2;
  }
  const boostF = Math.min(0.4, boostMin / Math.max(1, flightMin));
  const legs: FlightLeg[] = [];
  const mk = (la0: number, lo0: number, la1: number, lo1: number, f0: number, f1: number, target: number, a0: number, a1: number, seed: number, ampK = amp) => {
    const n = 140;
    const pts = track(la0, lo0, la1, lo1, n, ampK, waves, seed);
    const alt = pts.map((_, i) => { const g = a0 + (a1 - a0) * (i / n); return altitude(profile, g, apogeeKm, cruiseKm ?? 0, boostF); });
    legs.push({ pts, alt, f0, f1, target });
  };
  const spread = Math.max(...targets.map((t) => greatCircleKm(cLat, cLon, t.lat, t.lon)));
  const mirv = profile === 'ballistic' && targets.length > 1 && spread < 1500;
  if (mirv) {
    // el «bus» sigue el arco hasta la mitad del vuelo y después suelta las ojivas
    const fs = 0.55;
    const sep = greatCirclePath(site.lat, site.lon, cLat, cLon, 100)[55];
    mk(site.lat, site.lon, cLat, cLon, 0, fs, -1, 0, 1, 0, 0);
    // el tramo del bus se recorta al punto de separación
    const bus = legs[0];
    const k = Math.round(bus.pts.length * fs);
    bus.pts = bus.pts.slice(0, k + 1); bus.alt = bus.alt.slice(0, k + 1);
    targets.forEach((t, i) => {
      mk(sep[1], sep[0], t.lat, t.lon, fs, 1, i, fs, 1, i, 0);
      const L = legs[legs.length - 1];
      L.alt = L.alt.map((_, j) => altitude('ballistic', fs + (1 - fs) * (j / (L.alt.length - 1)), apogeeKm, 0, 0));
    });
  } else {
    targets.forEach((t, i) => mk(site.lat, site.lon, t.lat, t.lon, 0, 1, i, 0, 1, i * 1.7 + 0.4));
  }
  const phase = (f: number): string => {
    if (profile === 'ballistic') return f < boostF ? 'Fase propulsada' : f < (mirv ? 0.55 : 0.85) ? 'Curso medio (en el espacio)' : mirv && f < 0.85 ? 'Separación de las ojivas' : 'Reentrada';
    if (profile === 'hgv') return f < boostF ? 'Cohete acelerador' : f < 0.92 ? 'Planeo hipersónico' : 'Picado final';
    if (profile === 'cruise') return f < 0.02 ? 'Lanzamiento' : f < 0.97 ? 'Vuelo rasante' : 'Ataque';
    return f < 0.06 ? 'Despegue' : f < 0.98 ? 'Vuelo de crucero' : 'Lanzamiento de la bomba';
  };
  return { profile, name: PROFILE_NAMES[profile], rangeKm, flightMin, apogeeKm, reentryKms, boostMin, warningMin, cruiseKm, mirv: mirv ? targets.length : undefined, legs, phase };
}

/** posición y altura de un tramo en la fracción global f (null si el tramo aún no ha empezado) */
export function legAt(L: FlightLeg, f: number): { p: [number, number]; alt: number; i: number } | null {
  if (f < L.f0) return null;
  const g = Math.min(1, (f - L.f0) / Math.max(1e-6, L.f1 - L.f0));
  const x = g * (L.pts.length - 1), i = Math.min(L.pts.length - 2, Math.floor(x)), k = x - i;
  const a = L.pts[i], b = L.pts[i + 1];
  return { p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], alt: L.alt[i] + (L.alt[i + 1] - L.alt[i]) * k, i };
}
