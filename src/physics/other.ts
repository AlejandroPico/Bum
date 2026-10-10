/**
 * Otros escenarios: liberaciones radiactivas (accidente de un reactor, bomba sucia) y
 * erupciones de supervolcanes. Devuelven la misma estructura de efectos que las armas para que
 * el mapa, los resultados y la animación funcionen igual.
 */
import { contours } from 'd3-contour';
import { densityField, nearestCity } from '../data/cities';
import { windAt } from './wind';
import type { Effects, Environment, FalloutContour, Ring, ReleaseInput, VolcanoInput, Isotope } from './types';

const KT_J = 4.184e12;

/** propiedades de los isótopos: semivida, velocidad de depósito, dosis externa y umbrales de zonas */
export const ISOTOPES: Record<Isotope, { name: string; halfLifeY: number; vd: number; nSvhPerkBq: number; zones: [number, string][]; note: string }> = {
  'Cs-137': { name: 'Cesio-137', halfLifeY: 30.17, vd: 0.002, nSvhPerkBq: 2.1, zones: [[1480, 'Exclusión (≥ 1480 kBq/m²)'], [555, 'Reasentamiento (≥ 555 kBq/m²)'], [185, 'Control estricto (≥ 185 kBq/m²)'], [37, 'Contaminada (≥ 37 kBq/m²)']], note: 'Zonas de contaminación de Chernóbil (1, 5, 15 y 40 Ci/km²).' },
  'I-131': { name: 'Yodo-131', halfLifeY: 8.02 / 365.25, vd: 0.005, nSvhPerkBq: 1.3, zones: [[10000, 'Muy alta (≥ 10 MBq/m²)'], [1000, 'Alta (≥ 1 MBq/m²)'], [100, 'Yodo profiláctico (≥ 100 kBq/m²)'], [10, 'Vigilancia de alimentos (≥ 10 kBq/m²)']], note: 'Decae a la mitad en 8 días; el riesgo principal es la leche y la tiroides.' },
  'Co-60': { name: 'Cobalto-60', halfLifeY: 5.27, vd: 0.002, nSvhPerkBq: 8.2, zones: [[380, 'Exclusión (dosis como 1480 kBq/m² de Cs)'], [140, 'Reasentamiento'], [48, 'Control estricto'], [10, 'Contaminada']], note: 'Emisor gamma muy penetrante, usado en radioterapia y esterilización.' },
  'Sr-90': { name: 'Estroncio-90', halfLifeY: 28.8, vd: 0.002, nSvhPerkBq: 0.01, zones: [[111, 'Reasentamiento (≥ 111 kBq/m²)'], [74, 'Control estricto (≥ 74 kBq/m²)'], [37, 'Vigilancia (≥ 37 kBq/m²)'], [5.5, 'Contaminada (≥ 5,5 kBq/m²)']], note: 'Emisor beta: apenas irradia desde fuera, pero se fija en los huesos si se ingiere.' },
  'Am-241': { name: 'Americio-241', halfLifeY: 432, vd: 0.002, nSvhPerkBq: 0.06, zones: [[3.7, 'Exclusión (≥ 3,7 kBq/m², como el plutonio de Chernóbil)'], [1.8, 'Reasentamiento'], [0.37, 'Control estricto'], [0.07, 'Contaminada']], note: 'Emisor alfa: peligroso sobre todo si se inhala.' },
};

const ZONE_COLORS = ['#ff3df2', '#c026d3', '#9333ea', '#6d28d9'];

function emptyEffects(env: Environment): Pick<Effects, 'thermalFluenceAt' | 'pressurePsiAt' | 'doseRemAt' | 'falloutRateAt' | 'chemical' | 'env' | 'outdoorPct' | 'seismic' | 'shock' | 'groundContact' | 'burstHeightM'> {
  return {
    thermalFluenceAt: () => 0, pressurePsiAt: () => 0, doseRemAt: () => 0, falloutRateAt: () => 0, chemical: false, env: { ...env },
    outdoorPct: env.outdoorPct ?? 25, seismic: null, shock: { r: [0, 1e3, 1e7], t: [0, 3, 3e4] }, groundContact: 0, burstHeightM: 0,
  };
}

// ======================================================================== liberación radiactiva
/**
 * Pluma gaussiana (dispersión de Briggs, atmósfera neutra) con depósito seco. Para liberaciones
 * largas (días) la pluma serpentea: se ensancha con la duración. Más allá de donde la pluma llena
 * la capa de mezcla (~1 km) la concentración se reparte en vertical.
 */
export function computeRelease(sc: ReleaseInput, env: Environment, lat: number, lon: number, blast?: Effects): Effects {
  const iso = ISOTOPES[sc.isotope];
  const Q = Math.max(1e6, sc.activityTBq * 1e12) * (sc.source === 'dirtybomb' ? 0.2 : 1); // Bq dispersados
  const H = sc.source === 'dirtybomb' ? 20 : Math.max(10, sc.heightM);
  const Hmix = 1000;
  const W = windAt(env, Math.min(H, 800));
  const u = Math.max(1, W.kmh / 3.6);
  const durH = sc.source === 'dirtybomb' ? 0.05 : Math.max(0.1, sc.durationH ?? 240);
  const meander = Math.pow(Math.max(1, (durH * 60) / 10), 0.2);
  const sy = (x: number) => 0.08 * x * Math.pow(1 + 0.0001 * x, -0.5) * meander + 5;
  const sz = (x: number) => 0.06 * x * Math.pow(1 + 0.0015 * x, -0.5) + 2;
  /** depósito (Bq/m²) en coordenadas a lo largo (x) y perpendicular (y) al viento, m */
  const dep = (x: number, y: number) => {
    if (x <= 1) return 0;
    const Sy = sy(x), Sz = sz(x);
    const Fy = Math.exp(-(y * y) / (2 * Sy * Sy)) / (Math.sqrt(2 * Math.PI) * Sy);
    const Fz = Sz < Hmix / 2 ? (2 / (Math.sqrt(2 * Math.PI) * Sz)) * Math.exp(-(H * H) / (2 * Sz * Sz)) : 1 / Hmix;
    const deplete = Math.exp(-(iso.vd * x) / (u * Hmix)); // pérdida por el depósito a lo largo del camino
    return (iso.vd * Q * Fy * Fz * deplete) / u;
  };
  const to = ((W.fromDeg + 180) * Math.PI) / 180;
  const ex = Math.sin(to), ny = Math.cos(to);
  const depLocal = (e: number, n: number) => dep(e * ex + n * ny, -e * ny + n * ex);

  // malla a lo largo del viento y contornos (kBq/m²)
  const xMax = 1.5e6, yMax = 2.5e5;
  const nx = 300, nyy = 120;
  const xs = (i: number) => 50 * Math.pow(xMax / 50, i / (nx - 1));
  const grid = new Float64Array(nx * nyy);
  for (let j = 0; j < nyy; j++) for (let i = 0; i < nx; i++) {
    const y = ((j / (nyy - 1)) * 2 - 1) * Math.min(yMax, 0.4 * xs(i) + 2000);
    grid[j * nx + i] = dep(xs(i), y) / 1000;
  }
  const levels = iso.zones.map(([v]) => v);
  const cs = contours().size([nx, nyy]).thresholds(levels)(Array.from(grid));
  const fallout: FalloutContour[] = [];
  for (const c of cs) {
    const zi = levels.indexOf(c.value);
    if (!c.coordinates.length) continue;
    let maxX = 0, area = 0;
    for (let j = 0; j < nyy - 1; j++) for (let i = 0; i < nx - 1; i++) {
      if (grid[j * nx + i] < c.value) continue;
      const x0 = xs(i), x1 = xs(i + 1);
      const hw = Math.min(yMax, 0.4 * x0 + 2000);
      area += ((x1 - x0) * (2 * hw)) / (nyy - 1) / 1e6;
      maxX = Math.max(maxX, x0);
    }
    const polys = c.coordinates.map((poly) => poly.map((ring) => ring.map(([gi, gj]) => {
      const fi = Math.max(0, Math.min(nx - 1, gi - 0.5)), fj = Math.max(0, Math.min(nyy - 1, gj - 0.5));
      const x = 50 * Math.pow(xMax / 50, fi / (nx - 1));
      const y = ((fj / (nyy - 1)) * 2 - 1) * Math.min(yMax, 0.4 * x + 2000);
      return [x * ex - y * ny, x * ny + y * ex] as [number, number];
    })));
    fallout.push({ level: c.value, label: iso.zones[zi][1], color: ZONE_COLORS[zi], polygons: polys, areaKm2: area, maxDownwindKm: maxX / 1000 });
  }
  fallout.sort((a, b) => a.level - b.level);

  // población afectada y dosis colectiva del primer año (exposición externa, ocupación 0,3)
  const field = densityField(lat, lon, 600);
  let popZone = 0, popAny = 0, collective = 0;
  const low = levels[levels.length - 1], high = levels[Math.min(1, levels.length - 1)]; // evacuación: zona de reasentamiento
  for (let j = 0; j < nyy - 1; j += 2) for (let i = 0; i < nx - 1; i += 2) {
    const kBq = grid[j * nx + i];
    if (kBq < low) continue;
    const x0 = xs(i), x1 = xs(i + 2);
    const y = ((j / (nyy - 1)) * 2 - 1) * Math.min(yMax, 0.4 * x0 + 2000);
    const hw = Math.min(yMax, 0.4 * x0 + 2000);
    const aKm2 = ((x1 - x0) * (4 * hw)) / (nyy - 1) / 1e6;
    const e = (x0 * ex - y * ny) / 1000, n = (x0 * ny + y * ex) / 1000;
    const pop = field.at(e, n) * aKm2;
    popAny += pop;
    if (kBq >= high) popZone += pop;
    const yearFrac = iso.halfLifeY < 1 ? (iso.halfLifeY / Math.LN2) * (1 - Math.exp((-Math.LN2 * 1) / iso.halfLifeY)) : 1;
    collective += pop * kBq * iso.nSvhPerkBq * 1e-9 * 8760 * 0.3 * yearFrac; // Sv
  }
  const name = sc.source === 'dirtybomb' ? 'Bomba sucia' : 'Liberación de un reactor';
  const base = blast ?? null;
  const rings: Ring[] = base ? [...base.rings] : [];
  const notes: string[] = [
    `${iso.name}: ${Q >= 1e15 ? (Q / 1e15).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' PBq' : (Q / 1e12).toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' TBq'} dispersados${sc.source === 'dirtybomb' ? ' (≈ 20 % del material, en aerosol)' : ''}, liberados a ${Math.round(H)} m de altura con viento de ${Math.round(W.kmh)} km/h.`,
    iso.note,
    sc.source === 'reactor' ? 'Una sola dirección de viento: en un accidente real el viento cambia durante los días de emisión y reparte la contaminación en varias direcciones (en Chernóbil, durante 10 días).' : 'Una bomba sucia apenas mata por radiación: su efecto principal es el pánico, la contaminación y el coste de limpieza.',
  ];
  return {
    ...emptyEffects(env),
    ...(base ? { pressurePsiAt: base.pressurePsiAt, thermalFluenceAt: base.thermalFluenceAt, shock: base.shock } : {}),
    scenario: sc,
    energyKt: base?.energyKt ?? 0,
    energyJ: base?.energyJ ?? 0,
    fireball: base?.fireball ?? { radiusM: 0, tMaxS: 0.01, durationS: 0.1, visible: false },
    cloud: sc.source === 'reactor'
      ? { topM: Math.max(300, H * 1.3), capBottomM: H * 0.8, capRadiusM: Math.max(150, H * 0.28), stemRadiusM: Math.max(50, H * 0.12), riseTimeS: 240 }
      : base ? base.cloud : { topM: 200, capBottomM: 100, capRadiusM: 150, stemRadiusM: 30, riseTimeS: 60 },
    rings,
    fallout,
    casualties: base?.casualties ?? { deaths: 0, injuries: 0, exposed: popAny, profile: { r: [0, 1], pop: [0, 0], deaths: [0, 0], inj: [0, 0], burns: [0, 0] }, cityName: nearestCity(lat, lon).city.name },
    notes,
    falloutRateAt: (e: number, n: number) => (depLocal(e, n) / 1000) * iso.nSvhPerkBq * 1e-4, // rem/h ≈ 100 µSv/h
    windKmh: W.kmh,
    windFromDeg: W.fromDeg,
    noFlash: true,
    release: { isotope: sc.isotope, isoName: iso.name, activityBq: Q, popZone, popAny, collectiveSv: collective, cancerDeaths: collective * 0.05, depositAt: (e, n) => depLocal(e, n) / 1000, nSvhPerkBq: iso.nSvhPerkBq, name },
  } as Effects;
}

// ======================================================================== supervolcán
const VEI_COL = [0, 1, 5, 12, 20, 28, 35, 42, 50]; // km, altura de la columna por índice VEI
export function computeVolcano(sc: VolcanoInput, env: Environment, lat: number, lon: number): Effects {
  const vei = Math.max(4, Math.min(8, sc.vei));
  const V = Math.pow(10, vei - 5) * (sc.volumeMul ?? 1); // km³ de tefra
  const col = VEI_COL[vei] * 1000;
  const E = V * 2.5e12 * 1000 * 1000; // energía térmica aproximada (J)
  const L = 15 * Math.pow(10, 0.33 * (vei - 4)); // km, escala de adelgazamiento de la ceniza
  const T0 = V / (6 * Math.PI * L * L) * 1000; // m de ceniza en el centro
  const W = windAt(env, col * 0.6);
  const to = ((W.fromDeg + 180) * Math.PI) / 180;
  const ex = Math.sin(to), ny = Math.cos(to);
  const ash = (eKm: number, nKm: number) => {
    const x = eKm * ex + nKm * ny, y = -eKm * ny + nKm * ex;
    const r = Math.hypot(x > 0 ? x / 3 : x, y);
    return T0 * Math.exp(-r / L);
  };
  // contornos de espesor de ceniza (m)
  const R = Math.min(5000, L * 9);
  const N = 220;
  const grid = new Float64Array(N * N);
  const xmin = -R * 0.4, xmax = R * 2.6;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = xmin + ((xmax - xmin) * i) / (N - 1), y = -R + (2 * R * j) / (N - 1);
    grid[j * N + i] = ash(x * ex - y * ny, x * ny + y * ex);
  }
  const lv: [number, string, string][] = [[1, 'Ceniza ≥ 1 m', '#e5e7eb'], [0.1, 'Ceniza ≥ 10 cm (hunde tejados)', '#cbd5e1'], [0.01, 'Ceniza ≥ 1 cm (cosechas perdidas)', '#94a3b8'], [0.001, 'Ceniza ≥ 1 mm (aeropuertos cerrados)', '#64748b']];
  const cs = contours().size([N, N]).thresholds(lv.map((l) => l[0]))(Array.from(grid));
  const dx = (xmax - xmin) / (N - 1), dy = (2 * R) / (N - 1);
  const fallout: FalloutContour[] = [];
  for (const c of cs) {
    const meta = lv.find((l) => l[0] === c.value)!;
    if (!c.coordinates.length) continue;
    let cells = 0, maxD = 0;
    for (let k = 0; k < grid.length; k++) if (grid[k] >= c.value) { cells++; const gi = k % N, gj = (k - gi) / N; maxD = Math.max(maxD, Math.hypot(xmin + gi * dx, -R + gj * dy)); }
    const polys = c.coordinates.map((poly) => poly.map((ring) => ring.map(([gi, gj]) => { const x = (xmin + (gi - 0.5) * dx) * 1000, y = (-R + (gj - 0.5) * dy) * 1000; return [x * ex - y * ny, x * ny + y * ex] as [number, number]; })));
    fallout.push({ level: c.value, label: meta[1], color: meta[2], polygons: polys, areaKm2: cells * dx * dy, maxDownwindKm: maxD });
  }
  fallout.sort((a, b) => a.level - b.level);
  const pdcR = (vei >= 8 ? 100 : vei === 7 ? 50 : vei === 6 ? 20 : 10) * 1000;
  const rings: Ring[] = [
    { id: 'vent', group: 'crater', label: vei >= 7 ? 'Caldera' : 'Cráter', radiusM: (vei >= 8 ? 30 : vei === 7 ? 6 : 2) * 1000, color: '#a0714f', desc: 'Hundimiento del techo de la cámara magmática vaciada.' },
    { id: 'pdc', group: 'fire', label: 'Flujos piroclásticos', radiusM: pdcR, color: '#ff5a1f', desc: 'Avalanchas de gas y ceniza a cientos de grados y más de 100 km/h: nada sobrevive a su paso.', dome: true },
  ];
  const field = densityField(lat, lon, Math.max(200, pdcR / 1000 * 2));
  let deaths = 0, inj = 0, exposed = 0;
  const prof = { r: [0] as number[], pop: [0] as number[], deaths: [0] as number[], inj: [0] as number[], burns: [0] as number[] };
  const Rmax = Math.min(3000e3, Math.max(pdcR * 2, ...fallout.map((f) => f.maxDownwindKm * 1000)));
  for (let i = 0; i < 80; i++) {
    const r0 = Rmax * (i / 80) ** 2, r1 = Rmax * ((i + 1) / 80) ** 2, rm = (r0 + r1) / 2;
    const dA = Math.PI * (r1 * r1 - r0 * r0) / 1e6 / 48;
    for (let k = 0; k < 48; k++) {
      const a = (k / 48) * Math.PI * 2;
      const e = (Math.sin(a) * rm) / 1000, n = (Math.cos(a) * rm) / 1000;
      const pop = field.at(e, n) * dA;
      const th = ash(e, n);
      const pd = rm < pdcR ? 0.9 : th > 1 ? 0.25 : th > 0.3 ? 0.05 : 0;
      const pi = rm < pdcR * 1.3 ? 0.08 : th > 0.1 ? 0.03 : th > 0.01 ? 0.005 : 0;
      exposed += pop; deaths += pop * pd; inj += pop * Math.min(1 - pd, pi);
    }
    prof.r.push(r1); prof.pop.push(exposed); prof.deaths.push(deaths); prof.inj.push(inj); prof.burns.push(0);
  }
  const dT = vei >= 8 ? -4 : vei === 7 ? -0.6 : vei === 6 ? -0.3 : -0.1;
  return {
    ...emptyEffects(env),
    scenario: sc, energyKt: E / KT_J, energyJ: E, groundContact: 1,
    fireball: { radiusM: 0, tMaxS: 0.5, durationS: 1, visible: false },
    cloud: { topM: col, capBottomM: col * 0.55, capRadiusM: Math.min(col * 12, 50000 * Math.pow(V, 0.25)), stemRadiusM: Math.max(800, col * 0.06), riseTimeS: 600 },
    rings, fallout,
    casualties: { deaths, injuries: inj, exposed, profile: prof, cityName: nearestCity(lat, lon).city.name },
    notes: [
      `Erupción de índice VEI ${vei}: unos ${V.toLocaleString('es-ES', { maximumFractionDigits: 1 })} km³ de ceniza y roca, columna eruptiva de ${Math.round(col / 1000)} km.`,
      vei >= 8 ? 'Supererupción: la ceniza cubriría un continente y el enfriamiento global duraría años (como Toba hace 74 000 años o Yellowstone hace 640 000).' : vei === 7 ? 'Como el Tambora (1815), que provocó el «año sin verano».' : 'Erupción muy grande, como el Pinatubo (1991) o el Krakatoa (1883).',
      'Modelo simplificado: el espesor de la ceniza decrece exponencialmente con la distancia (Pyle, 1989) y se alarga con el viento.',
    ],
    windKmh: W.kmh, windFromDeg: W.fromDeg, noFlash: true,
    volcano: { vei, volumeKm3: V, columnM: col, pdcR, coolingC: dT, ashAt: (eM, nM) => ash(eM / 1000, nM / 1000), T0 },
  } as Effects;
}
