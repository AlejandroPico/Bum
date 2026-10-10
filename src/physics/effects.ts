/**
 * Cálculo unificado de efectos para armas nucleares e impactos cósmicos.
 */
import { blastRange, pressureAt, optimumHeight1kt, shockArrivalTable, PSI, peakWind, decibels } from './blast';
import { atmosphericEntry, impactCrater, KT_J } from './asteroid';
import { computeFallout, falloutModel } from './fallout';
import { effectiveWind, windAt } from './wind';
import { densityField, nearestCity } from '../data/cities';
import { computeRelease, computeVolcano } from './other';
import type { Effects, Environment, Ring, Scenario, Casualties, NuclearInput, AsteroidInput } from './types';

const EARTH_R = 6371e3;
const CAL_J_M2 = 41840; // 1 cal/cm² en J/m²

// ---------- radiación inicial (anclada a la tabla de Glasstone) ----------
const RAD_Y = [1, 20, 1000, 20000];
const RAD_R500 = [0.8, 1.4, 2.3, 4.7]; // km, alcance oblicuo dosis letal

function r500km(y: number): number {
  const ly = Math.log(y);
  const xs = RAD_Y.map(Math.log), ys = RAD_R500.map(Math.log);
  let i = 0;
  if (ly <= xs[0]) i = 0;
  else if (ly >= xs[xs.length - 1]) i = xs.length - 2;
  else while (ly > xs[i + 1]) i++;
  const t = (ly - xs[i]) / (xs[i + 1] - xs[i]);
  return Math.exp(ys[i] + t * (ys[i + 1] - ys[i]));
}

/** Dosis (rem) a distancia oblicua `slantKm`. */
function promptDose(y: number, slantKm: number): number {
  const R5 = r500km(y);
  const lam = 0.5;
  const r = Math.max(slantKm, 0.01);
  return 500 * (R5 / r) ** 2 * Math.exp((R5 - r) / lam);
}

function solveDecreasing(f: (r: number) => number, target: number, lo = 0.1, hi = 5e7): number {
  if (f(lo) < target) return 0;
  for (let i = 0; i < 90; i++) {
    const mid = Math.sqrt(lo * hi);
    if (f(mid) >= target) lo = mid; else hi = mid;
  }
  return lo;
}

const toGround = (slant: number, h: number) => (slant > h ? Math.sqrt(slant * slant - h * h) : 0);

export function fmtEnergy(kt: number): string {
  if (kt >= 1e6) return `${(kt / 1e6).toLocaleString('es-ES', { maximumFractionDigits: kt >= 1e8 ? 0 : 2 })} Gt`;
  if (kt >= 1000) return `${(kt / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} Mt`;
  if (kt >= 1) return `${kt.toLocaleString('es-ES', { maximumFractionDigits: 1 })} kt`;
  return `${(kt * 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} t`;
}

/** Limita las entradas a rangos físicamente razonables (evita números absurdos). */
export function sanitizeScenario(sc: NuclearInput | AsteroidInput): NuclearInput | AsteroidInput {
  const cl = (x: number, a: number, b: number, d: number) => (Number.isFinite(x) ? Math.min(b, Math.max(a, x)) : d);
  if (sc.kind === 'nuclear') {
    return { ...sc, yieldKt: cl(sc.yieldKt, 1e-6, 1e6, 1), fission: sc.chemical ? 0 : cl(sc.fission, 0, 1, 0.5), heightM: cl(sc.heightM, 0, 2e6, 0), depthM: cl(sc.depthM ?? 50, 0, 5000, 50), seaDepthM: cl(sc.seaDepthM ?? 100, 1, 11000, 100) };
  }
  return {
    ...sc,
    diameterM: cl(sc.diameterM, 0.5, 1e6, 50),
    densityKgM3: cl(sc.densityKgM3, 300, 23000, 3000),
    velocityKms: cl(sc.velocityKms, 11, 72, 20),
    angleDeg: cl(sc.angleDeg, 5, 90, 45),
    waterDepthM: cl(sc.waterDepthM, 0, 11000, 0),
  };
}

export const HALF_EARTH_M = Math.PI * EARTH_R; // distancia a las antípodas

export function computeEffects(scIn: Scenario, env: Environment, lat: number, lon: number): Effects {
  if (scIn.kind === 'release') {
    const r = { ...scIn, activityTBq: Math.min(1e7, Math.max(1e-6, scIn.activityTBq)), heightM: Math.min(3000, Math.max(0, scIn.heightM)) };
    const blast = r.source === 'dirtybomb' && (r.explosiveKg ?? 0) > 0 ? computeEffects({ kind: 'nuclear', name: r.name, yieldKt: Math.min(1, (r.explosiveKg ?? 0) / 1e6), fission: 0, burst: 'surface', heightM: 0, chemical: true }, env, lat, lon) : undefined;
    return computeRelease(r, env, lat, lon, blast);
  }
  if (scIn.kind === 'volcano') return computeVolcano(scIn, env, lat, lon);
  const sc = sanitizeScenario(scIn);
  const notes: string[] = [];
  let Y: number; // kt
  let h: number; // altura de liberación de energía (m)
  let fireballR: number;
  let thermalFrac: number;
  let isImpact = false;
  let impactThermal = false;
  let asteroidInfo: Effects['asteroid'];
  let crater: Effects['crater'];
  let tsunami: Effects['tsunami'];
  let seismicEnergyJ = 0;
  let fissionKt = 0;
  // explosiones enterradas o submarinas
  let buried: Effects['buried'];
  let airFrac = 1, thermMul = 1, radMul = 1, fallMul = 1, localFrac = 0.6, coreFrac = 0.3, cloudMul = 1;
  const chem = sc.kind === 'nuclear' && !!sc.chemical;
  // energía equivalente para la onda: 1 kt nuclear ≈ 0,5 kt de TNT en onda (el resto es calor y radiación)
  let Yb = 0;

  if (sc.kind === 'nuclear') {
    Y = Math.max(sc.yieldKt, 1e-6);
    Yb = chem ? 2 * Y : Y;
    const s = Math.cbrt(Yb);
    h = sc.burst === 'surface' || sc.burst === 'underground' || sc.burst === 'underwater' ? 0 : sc.burst === 'optimal' ? optimumHeight1kt(5) * s : Math.max(0, sc.heightM);
    if (sc.burst === 'underground' || sc.burst === 'underwater') {
      const d = Math.max(0, sc.depthM ?? 50);
      const sd = d / Math.cbrt(Y); // profundidad escalada (m/kt^1/3)
      if (sc.burst === 'underground') {
        // por encima de ~120 m/kt^1/3 la explosión queda contenida (práctica de los polígonos de pruebas)
        const contained = sd >= 120;
        airFrac = Math.exp(-sd / 16);
        thermMul = Math.exp(-sd / 1.5);
        radMul = Math.exp(-sd / 4);
        fallMul = contained ? 0 : Math.max(0.05, 1 - sd / 120) * 1.3;
        localFrac = 0.85; coreFrac = 0.5;
        cloudMul = contained ? 0.02 : 0.25 + 0.75 * Math.exp(-sd / 10);
        buried = { mode: 'underground', depthM: d, scaledDepth: sd, contained, airFrac };
        notes.push(contained
          ? `Explosión subterránea contenida (${Math.round(sd)} m/kt^⅓): no hay bola de fuego visible ni onda en el aire apreciable; se forma una cavidad, después suele hundirse el terreno (cráter de subsidencia) y se registra como un terremoto.`
          : `Explosión subterránea poco profunda (${Math.round(sd)} m/kt^⅓): excava un gran cráter, expulsa una columna de tierra muy radiactiva y una oleada de base de polvo; la onda en el aire y el calor se reducen mucho.`);
      } else {
        const sea = Math.max(d + 1, sc.seaDepthM ?? Math.max(60, d * 2));
        const deep = sd > 400;
        airFrac = Math.exp(-sd / 25) * 0.8;
        thermMul = Math.exp(-sd / 1.0);
        radMul = Math.exp(-sd / 3);
        fallMul = deep ? 0.05 : Math.exp(-sd / 150);
        localFrac = 0.9; coreFrac = 0.55;
        const colH = deep ? 0 : 800 * Math.pow(Y, 0.25) * Math.exp(-sd / 300);
        const surgeR = deep ? 0 : 3200 * Math.pow(Y / 23, 0.3);
        cloudMul = deep ? 0.02 : 0.35;
        buried = { mode: 'underwater', depthM: d, scaledDepth: sd, contained: deep, airFrac, columnM: colH, surgeR };
        void sea;
        notes.push(deep
          ? 'Explosión submarina profunda: no rompe la superficie con una columna; su energía va a la onda de choque en el agua y a las olas.'
          : 'Explosión submarina: levanta una columna de agua de cientos de metros a kilómetros, una oleada de base de niebla radiactiva y olas que se propagan en todas direcciones (como Baker en Bikini, 1946).');
      }
    }
    // bola de fuego: nuclear (Glasstone, ∝Y^0,4) o química (∝W^0,32, mucho más fría y pequeña)
    const rfAir = chem ? 1.16 * Math.pow(Y * 1e6, 0.32) : 70 * Math.pow(Y, 0.4);
    const contact0 = h < rfAir ? 1 - h / rfAir : 0;
    fireballR = rfAir * (1 + 0.32 * contact0);
    thermalFrac = (chem ? 0.01 : 0.35 - 0.17 * contact0) * thermMul;
    fissionKt = Y * sc.fission * fallMul;
    // acoplamiento sísmico de una explosión en superficie (mucho menor que el de un impacto)
    seismicEnergyJ = 0.02 * contact0 * Y * KT_J;
    if (buried) {
      // magnitud empírica de explosiones enterradas: mb ≈ 4,45 + 0,75·log10(Y) en roca bien acoplada
      const mb = buried.mode === 'underground' ? 4.45 + 0.75 * Math.log10(Y) - 1.2 * (1 - Math.min(1, buried.scaledDepth / 120)) : 4.1 + 0.75 * Math.log10(Y);
      seismicEnergyJ = Math.pow(10, (mb + 5.87) / 0.67);
      if (buried.contained && buried.mode === 'underground') fireballR = 12 * Math.cbrt(Y); // cavidad
    }
    if (h > 30000) notes.push('Explosión a gran altitud: efectos en superficie mínimos, pero pulso electromagnético (EMP) de alcance continental.');
  } else {
    const ent = atmosphericEntry(sc);
    asteroidInfo = ent;
    Y = ent.energyJ / KT_J;
    if (ent.fate === 'airburst') {
      h = ent.airburstAltM!;
      fireballR = 0.6 * 70 * Math.pow(Y, 0.4);
      thermalFrac = 0.3;
      notes.push(`El objeto se fragmenta a ${(ent.breakupAltM! / 1000).toFixed(1)} km y estalla en el aire a ${(h / 1000).toFixed(1)} km de altitud (sin cráter).`);
    } else {
      isImpact = true;
      h = 0;
      Y = ent.impactEnergyKt;
      const Ej = Y * KT_J;
      fireballR = Math.min(0.002 * Math.cbrt(Ej), 0.3 * EARTH_R);
      thermalFrac = 0;
      impactThermal = ent.impactVelocityKms > 15;
      // Collins et al. (2005) ec. 40: la eficiencia sísmica (1e-4) ya está incluida en la constante
      seismicEnergyJ = Ej;
      const cr = impactCrater(sc, ent.impactVelocityKms);
      crater = { diameterM: cr.diameterM, depthM: cr.depthM, transientM: cr.transientM, type: cr.type };
      if (ent.fate === 'fragmented-impact') notes.push(`Se fragmenta a ${(ent.breakupAltM! / 1000).toFixed(1)} km pero los fragmentos alcanzan el suelo a ${ent.impactVelocityKms.toFixed(1)} km/s.`);
      if (sc.target === 'ice') notes.push('Impacto sobre una capa de hielo: gran parte de la energía funde y vaporiza el hielo (columna de vapor) y el cráter es transitorio; si el objeto es grande, llega a la roca de debajo.');
      if (sc.target === 'water' && cr.waterTransientM) {
        // Wünnemann et al. (2010): A(D) = min(0,14·Dtc, h)·Dtc/(2D)
        const Dtc = cr.waterTransientM;
        const A0 = Math.min(0.14 * Dtc, sc.waterDepthM);
        tsunami = { rimWaveM: A0, at1000kmM: (A0 * Dtc) / (2 * 1e6), transientM: Dtc, depthM: sc.waterDepthM };
        if (cr.type === 'water') crater = undefined;
      }
    }
  }

  if (!Yb) Yb = Y;
  const E_J = Y * KT_J;
  if (sc.kind === 'asteroid') {
    if (E_J > 5e27) notes.push('Energía suficiente para evaporar los océanos y esterilizar la superficie del planeta.');
    else if (E_J > 1e23) notes.push('Catástrofe global: la eyecta que reentra en la atmósfera incendia el planeta entero, seguida de un invierno de impacto y una extinción masiva (como la del límite K-Pg).');
    else if (E_J > 1e21) notes.push('Efectos climáticos globales: polvo y aerosoles en la estratosfera, años sin verano y colapso de cosechas.');
    if (sc.diameterM > 100000) notes.push('Objeto mayor que cualquier asteroide cercano conocido: impacto de escala planetaria (los modelos dejan de ser fiables).');
  }
  const contact = h < fireballR ? 1 - h / fireballR : 0;
  // tiempo hasta el máximo térmico: Glasstone para armas (limitado en megaexplosiones);
  // en impactos, la pluma de vapor se expande a ~6 km/s
  const tMax = isImpact
    ? Math.min(25, Math.max(0.05, fireballR / 6000))
    : chem ? 0.06 * Math.cbrt(Y) : Math.min(sc.kind === 'asteroid' ? 4 : 10, 0.032 * Math.sqrt(Y));

  // ---------- nube en forma de hongo ----------
  const top = Y < 1000 ? 7540 * Math.pow(Y, 0.155) : 22000 * Math.pow(Y / 1000, 0.22);
  // una explosión química no tiene una bola de fuego tan caliente: la nube sube mucho menos
  const cloudTop = h > 20000 ? h : (Math.min(top, 80000) + (sc.kind === 'nuclear' ? h * 0.3 : 0)) * (chem ? 0.35 : 1);
  let capR0 = Math.min(1800 * Math.pow(Y, 0.25), cloudTop * 5) * (chem ? 0.45 : 1) * (cloudMul < 1 ? 0.3 + 0.7 * cloudMul : 1);
  const cloudTopAdj = cloudMul < 1 ? Math.max(150, (buried?.columnM ? Math.max(buried.columnM * 1.7, cloudTop * cloudMul) : cloudTop * cloudMul)) : cloudTop;
  if (buried?.columnM) capR0 = Math.min(capR0, buried.columnM * 1.1);
  const cloud = {
    topM: cloudTopAdj,
    capBottomM: cloudTopAdj * 0.5,
    capRadiusM: capR0,
    stemRadiusM: capR0 * 0.24,
    riseTimeS: Math.min(480, 60 + 25 * Math.log10(Math.max(Y, 1))),
  };

  // ---------- funciones físicas ----------
  const vis = Math.max(1, env.visibilityKm);
  const a = 0.6 * vis;
  const thermalFluenceSlant = (slantM: number): number => {
    const Rkm = slantM / 1000;
    if (isImpact) {
      if (!impactThermal) return 0;
      // fracción de la bola de fuego visible sobre el horizonte (Collins et al. 2005, ec. 36-37)
      const dlt = Math.min(Math.PI, slantM / EARTH_R);
      const hd = (1 - Math.cos(dlt)) * EARTH_R;
      if (hd >= fireballR) return 0;
      const g = Math.acos(hd / fireballR);
      const f = (2 / Math.PI) * (g - (hd / fireballR) * Math.sin(g));
      return (f * (3e-3 * E_J)) / (2 * Math.PI * slantM * slantM) / CAL_J_M2;
    }
    const tau = 1 / (1 + Rkm / a);
    const Rcm = slantM * 100;
    return (thermalFrac * Y * 1e12 * tau) / (4 * Math.PI * Rcm * Rcm);
  };
  const thermalFluenceAt = (groundM: number) => thermalFluenceSlant(Math.hypot(groundM, h));
  // Collins et al.: para energías muy grandes el modelo sobrestima la onda (×2–5); la atmósfera
  // finita limita el escalado cúbico, así que reducimos el alcance progresivamente
  const blastK = Y > 1e7 ? Math.max(0.5, 1 / (1 + 0.25 * Math.log10(Y / 1e7))) : 1;
  if (blastK < 1) notes.push('Onda expansiva de escala continental: las distancias son muy inciertas (los modelos se extrapolan fuera de su rango).');
  const YbAir = Yb * airFrac;
  const pressurePsiAt = (groundM: number) => pressureAt(YbAir, groundM / blastK, h);
  const doseRemAt = (groundM: number) => (sc.kind === 'nuclear' && !chem ? promptDose(Y, Math.hypot(groundM, h) / 1000) * radMul : 0);

  const rings: Ring[] = [];
  const push = (r: Ring) => { if (r.radiusM > 0.5) rings.push(r); };

  // bola de fuego (o cavidad / columna en explosiones enterradas o submarinas)
  if (buried?.contained) push({ id: 'fireball', group: 'fireball', label: buried.mode === 'underground' ? 'Cavidad subterránea' : 'Burbuja de gas', radiusM: fireballR, color: '#ffcf4a', value: `${fmtDist(fireballR)} de radio`, desc: buried.mode === 'underground' ? 'La explosión vaporiza y funde la roca y deja una cavidad esférica que suele hundirse al cabo de horas o días.' : 'Burbuja de gases calientes que oscila bajo el agua y genera ondas de presión.' });
  else push({
    id: 'fireball', group: 'fireball', label: 'Bola de fuego', radiusM: contact > 0 ? Math.sqrt(Math.max(0, fireballR ** 2 - h ** 2)) || fireballR : fireballR,
    color: '#ffcf4a', dome: contact > 0, value: `${fmtDist(fireballR)} de radio`,
    desc: contact > 0 ? 'Todo lo que queda dentro se vaporiza. La bola de fuego toca el suelo: genera lluvia radiactiva intensa.' : 'Plasma a millones de grados. Al no tocar el suelo, la lluvia radiactiva local es mínima.',
  });

  if (crater) {
    push({ id: 'crater', group: 'crater', label: 'Cráter', radiusM: crater.diameterM / 2, color: '#a0714f', value: `${fmtDist(crater.diameterM)} Ø · ${fmtDist(crater.depthM)} prof.`, desc: `Cráter ${crater.type === 'complex' ? 'complejo (con pico central)' : 'simple'} excavado por el impacto.` });
  } else if (buried?.mode === 'underground') {
    // cráter aparente frente a la profundidad escalada (calibrado con Sedan: 104 kt a 194 m → 390 m)
    const sd = buried.scaledDepth;
    const Dsurf = 40 * Math.pow(Y, 0.3);
    const Dmax = 390 * Math.pow(Y / 104, 1 / 3.4);
    const D = sd <= 41 ? Dsurf + (Dmax - Dsurf) * (sd / 41) : sd < 120 ? Dmax * (1 - 0.45 * (sd - 41) / 79) : Dmax * 0.45;
    crater = { diameterM: D, depthM: D * (sd < 120 ? 0.26 : 0.08), transientM: D, type: 'simple' };
    push({ id: 'crater', group: 'crater', label: sd < 120 ? 'Cráter de excavación' : 'Cráter de subsidencia', radiusM: D / 2, color: '#a0714f', value: `${fmtDist(D)} Ø`, desc: sd < 120 ? 'Cráter excavado por la explosión: la tierra expulsada forma un anillo y cae alrededor, muy contaminada.' : 'Depresión que se forma cuando el techo de la cavidad se hunde.' });
  } else if (sc.kind === 'nuclear' && contact > 0.5 && buried?.mode !== 'underwater') {
    const r = 20 * Math.pow(Y, 0.3) * contact * (chem ? 1.5 : 1);
    crater = { diameterM: 2 * r, depthM: 0.5 * r, transientM: 2 * r, type: 'simple' };
    push({ id: 'crater', group: 'crater', label: 'Cráter', radiusM: r, color: '#a0714f', value: `${fmtDist(2 * r)} Ø`, desc: 'Cráter aparente en suelo seco.' });
  }

  // radiación ionizante
  if (sc.kind === 'nuclear' && !chem) {
    const radLevels = [
      { rem: 5000, label: 'Radiación 5000 rem', color: '#00ff88', desc: 'Incapacitación en minutos, muerte en horas o pocos días.' },
      { rem: 1000, label: 'Radiación 1000 rem', color: '#2bff6a', desc: 'Dosis letal en prácticamente todos los casos sin tratamiento.' },
      { rem: 500, label: 'Radiación 500 rem', color: '#5cff3a', desc: 'Dosis letal media: muere entre el 50 % y el 90 % sin atención médica.' },
      { rem: 100, label: 'Radiación 100 rem', color: '#a8ff7a', desc: 'Síndrome de radiación agudo leve; aumento del riesgo de cáncer.' },
    ];
    for (const L of radLevels) {
      if (radMul < 0.01) break;
      const slant = solveDecreasing((r) => promptDose(Y, r / 1000) * radMul, L.rem, 1, 3e5);
      const g = toGround(slant, h);
      if (g > fireballR * 0.9 || L.rem <= 500) push({ id: `rad${L.rem}`, group: 'radiation', label: L.label, radiusM: g, color: L.color, value: `${L.rem} rem`, desc: L.desc, dome: L.rem === 500 });
    }
  }

  // onda expansiva
  const blastLevels = [
    { psi: 200, label: 'Destrucción total (200 psi)', color: '#ff1f4b', desc: 'Incluso búnkeres reforzados quedan destruidos.' },
    { psi: 20, label: 'Daño grave por onda (20 psi)', color: '#ff3b30', desc: 'Los edificios de hormigón armado se derrumban. Mortalidad cercana al 100 %.' },
    { psi: 5, label: 'Daño moderado (5 psi)', color: '#ff7a1a', desc: 'La mayoría de las viviendas se derrumban. Heridos generalizados; muchas víctimas mortales.' },
    { psi: 1, label: 'Daño leve (1 psi)', color: '#8fa3bf', desc: 'Rotura de ventanas, heridas por cristales y escombros en exteriores.' },
    { psi: 0.2, label: 'Rotura de cristales (0,2 psi)', color: '#5d6b82', desc: 'Ventanas rotas; el estruendo se oye a cientos de kilómetros.' },
  ];
  for (const L of blastLevels) {
    const r = blastRange(YbAir, L.psi, h) * blastK;
    if (L.psi === 200 && r < fireballR) continue;
    const pa = L.psi * PSI;
    push({ id: `psi${L.psi}`, group: 'blast', label: L.label, radiusM: r, color: L.color, value: `${L.psi} psi · viento ${Math.round(peakWind(pa) * 3.6)} km/h · ${Math.round(decibels(pa))} dB`, desc: L.desc, dome: L.psi === 5 || L.psi === 1 || L.psi === 20 });
  }

  // térmico
  if ((thermalFrac > 0 && thermMul > 0.01) || impactThermal) {
    const scale = isImpact ? Math.pow(Y / 1000, 1 / 6) : Math.pow(Y / 1000, 0.065);
    const thermLevels = [
      { q: 15.7, id: 'ignite', label: 'Incendios generalizados', color: '#ff5a1f', desc: 'Prende madera seca, papel, tejidos y vegetación: posible tormenta de fuego.' },
      { q: 10, id: 'burn3', label: 'Quemaduras de 3.er grado', color: '#ffa31a', desc: 'Quemaduras que destruyen la piel; a menudo mortales sin tratamiento. Dolor, cicatrices graves.' },
      { q: 5.7, id: 'burn2', label: 'Quemaduras de 2.º grado', color: '#ffc04d', desc: 'Ampollas y cicatrices permanentes en piel expuesta.' },
      { q: 3.1, id: 'burn1', label: 'Quemaduras de 1.er grado', color: '#ffe0a3', desc: 'Como una quemadura solar fuerte.' },
    ];
    for (const L of thermLevels) {
      const thr = L.q * scale;
      const slant = solveDecreasing(thermalFluenceSlant, thr, 1, 2e7);
      push({ id: L.id, group: 'thermal', label: L.label, radiusM: toGround(slant, h), color: L.color, value: `${thr.toFixed(1)} cal/cm²`, desc: L.desc, dome: L.id === 'burn3' });
    }
  }

  // EMP a gran altitud
  if (sc.kind === 'nuclear' && h > 30000) {
    push({ id: 'emp', group: 'emp', label: 'Pulso electromagnético (EMP)', radiusM: Math.sqrt(2 * EARTH_R * h), color: '#4cc9f0', value: `hasta el horizonte`, desc: 'Daña redes eléctricas, electrónica y comunicaciones en toda el área visible desde la explosión.' });
  }

  // eyecta
  if (crater && isImpact) {
    const Dtc = crater.transientM;
    for (const t of [10, 1, 0.1]) {
      const r = Math.cbrt(Dtc ** 4 / (112 * t));
      if (r > crater.diameterM / 2) push({ id: `ejecta${t}`, group: 'ejecta', label: `Eyecta ${t >= 1 ? t + ' m' : t * 100 + ' cm'} de espesor`, radiusM: r, color: '#c79a6b', value: `${t} m`, desc: 'Roca pulverizada y fundida que cae desde el cielo y entierra el terreno.' });
    }
  }

  // tsunami
  if (tsunami && tsunami.rimWaveM > 0.5) {
    const Dtc = tsunami.transientM;
    const REACH = 13000e3; // alcance máximo razonable de la ola en una cuenca oceánica
    for (const A of [100, 10, 3]) {
      const r = (tsunami.rimWaveM * Dtc) / (2 * A);
      if (r <= Dtc / 2) continue;
      const basin = r >= REACH;
      push({
        id: `tsu${A}`, group: 'tsunami', label: `Tsunami: olas de ${A} m`, radiusM: Math.min(r, REACH), color: A >= 100 ? '#0ea5e9' : '#38bdf8',
        value: `${A} m`,
        desc: basin
          ? `Olas de más de ${A} m en mar abierto en toda la cuenca oceánica; al llegar a la costa se multiplican (varias veces su altura tierra adentro).`
          : 'Amplitud de la ola en mar abierto; al romper en la costa la altura y la inundación pueden multiplicarse.',
      });
    }
  }

  // oleada de base y olas (explosiones submarinas o enterradas poco profundas)
  if (buried && !buried.contained) {
    const sR = buried.surgeR ?? (buried.mode === 'underground' ? 1800 * Math.pow(Y / 100, 0.3) : 0);
    if (sR > 0) push({ id: 'surge', group: 'surge', label: buried.mode === 'underwater' ? 'Oleada de base (niebla radiactiva)' : 'Oleada de base (polvo radiactivo)', radiusM: sR, color: '#b4f0ff', value: 'radiactiva', desc: 'Anillo de niebla o polvo que se extiende a ras del suelo o del agua a gran velocidad y deposita radiactividad.' });
    if (buried.mode === 'underwater') {
      const sea = Math.max(buried.depthM + 1, (sc.kind === 'nuclear' && sc.seaDepthM) || Math.max(60, buried.depthM * 2));
      // olas: escalado de la prueba Baker (23 kt): ~29 m a 305 m del punto cero, decrecen como 1/R
      const Hk = 28.6 * 305 * Math.pow(Y / 23, 0.54);
      for (const A of [10, 3, 1]) {
        const r = Hk / A;
        if (A > sea * 0.78) continue;
        push({ id: `wave${A}`, group: 'tsunami', label: `Olas de ${A} m`, radiusM: r, color: A >= 10 ? '#0ea5e9' : '#38bdf8', value: `${A} m`, desc: 'Altura de las olas generadas por la explosión; al llegar a la costa pueden crecer e inundar.' });
      }
    }
  }

  // EMP de la región de origen (explosiones bajas): campos intensos cerca de la explosión
  if (sc.kind === 'nuclear' && !chem && h < 30000 && !buried?.contained) {
    push({ id: 'empsr', group: 'emp', label: 'Pulso electromagnético local', radiusM: 3000 * Math.pow(Y, 1 / 6), color: '#4cc9f0', value: 'decenas de kV/m', desc: 'Campos electromagnéticos intensos de la región de la explosión: dañan electrónica y comunicaciones, aunque en su mayor parte dentro de la zona destruida. Estimación aproximada.' });
  }

  // sísmico
  let seismic: Effects['seismic'] = null;
  if (seismicEnergyJ > 1e6) {
    const M = 0.67 * Math.log10(seismicEnergyJ) - 5.87;
    const meff = (rKm: number) => {
      if (rKm < 60) return M - 0.0238 * rKm;
      if (rKm < 700) return M - 0.0048 * rKm - 1.1644;
      const rad = Math.min(Math.PI, rKm / 6371); // distancia epicentral en radianes
      return M - 1.66 * Math.log10(rad) - 6.399;
    };
    const sr: Ring[] = [];
    // intensidad de Mercalli a partir de la magnitud efectiva: I ≈ 1,42·M_ef − 1,38 (Rumpf et al. 2017)
    const mFor = (I: number) => (I + 1.3787) / 1.4199;
    for (const L of [
      { m: mFor(9), label: 'Seísmo: intensidad IX', desc: 'Destructivo: daños graves incluso en edificios bien construidos; grietas en el terreno.' },
      { m: mFor(7), label: 'Seísmo: intensidad VII', desc: 'Daños moderados; caída de chimeneas, cornisas y muros débiles.' },
      { m: mFor(5), label: 'Seísmo: intensidad V', desc: 'Lo siente todo el mundo; caída de objetos y daños leves.' },
    ]) {
      if (meff(0) < L.m) continue;
      let lo = 0, hi = 20015;
      for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (meff(mid) >= L.m) lo = mid; else hi = mid; }
      sr.push({ id: `seis${Math.round(L.m * 10)}`, group: 'seismic', label: L.label, radiusM: lo * 1000, color: '#c084fc', value: `M ef. ≥ ${L.m.toFixed(1).replace('.', ',')}`, desc: L.desc });
    }
    seismic = { magnitude: M, rings: sr };
    rings.push(...sr);
  }

  // nada puede llegar más lejos que las antípodas
  for (const r of rings) {
    if (r.radiusM >= HALF_EARTH_M * 0.98) { r.radiusM = HALF_EARTH_M; r.global = true; r.dome = false; }
    else if (r.radiusM > 3000e3) r.dome = false; // una cúpula plana de miles de km no tiene sentido sobre una esfera
  }
  if (rings.some((r) => r.global)) notes.push('Algunos efectos alcanzan todo el planeta: se indican como «global».');
  rings.sort((x, y) => x.radiusM - y.radiusM);

  // ---------- lluvia radiactiva ----------
  // viento en la capa por la que viaja la nube (perfil vertical si hay tiempo real)
  const wEff = effectiveWind(env, cloud.topM, cloud.capBottomM);
  const fp = {
    fissionKt, contact: buried && !buried.contained ? 1 : contact, cloudTopM: cloud.topM, capBottomM: cloud.capBottomM, capRadiusM: cloud.capRadiusM,
    windAt: (z: number) => windAt(env, z), rainMmH: env.rainMmH ?? 0, localFrac, coreFrac,
  };
  const fallout = sc.kind === 'nuclear' && !chem ? computeFallout(fp) : [];
  const fModel = fallout.length ? falloutModel(fp) : null;
  const falloutRateAt = (eM: number, nM: number) => (fModel ? fModel.rateAtLocal(eM, nM) : 0);
  const fU = fModel ? Math.max(4, fModel.axisKmh) : Math.max(4, wEff.kmh);
  const falloutArrivalH = (eM: number, nM: number) => Math.max(0.25, Math.hypot(eM, nM) / 1000 / fU);
  /** dosis acumulada (rem) entre t1 y t2 horas tras la explosión, dentro de un refugio de factor pf */
  const falloutDoseAt = (eM: number, nM: number, t1: number, t2: number, pf: number) => {
    const R1 = falloutRateAt(eM, nM);
    if (R1 <= 0) return 0;
    const ta = Math.max(t1, falloutArrivalH(eM, nM));
    if (t2 <= ta) return 0;
    return (5 * R1 * (Math.pow(ta, -0.2) - Math.pow(t2, -0.2))) / Math.max(1, pf);
  };

  // ---------- frente de choque ----------
  const maxR = Math.max(...rings.map((r) => r.radiusM), 1000) * 1.3;
  const shock = shockArrivalTable(Yb, Math.min(maxR, 3e6));

  // ---------- víctimas ----------
  const casualties = estimateCasualties(lat, lon, rings, { pressurePsiAt, thermalFluenceAt, doseRemAt, Y, isImpact, env, crater, fireballR: contact > 0 ? fireballR : 0 });

  if (fallout.length && (env.rainMmH ?? 0) > 0.3) notes.push(`Llueve (${(env.rainMmH ?? 0).toLocaleString('es-ES', { maximumFractionDigits: 1 })} mm/h): la lluvia arrastra parte de la radiactividad y crea zonas muy contaminadas más cerca de la explosión.`);
  if (fallout.length) notes.push(`Viento de ${Math.round(fModel ? fModel.axisKmh : wEff.kmh)} km/h desde ${compass(fModel ? fModel.axisFromDeg : wEff.fromDeg)}${env.windProfile?.length ? ` (media entre el suelo y ${fmtDist(cloud.topM)}, tiempo real)` : ''}: la lluvia radiactiva se extiende hacia ${compass((fModel ? fModel.axisFromDeg : wEff.fromDeg) + 180)}.`);
  // ---------- pulso electromagnético de gran altitud ----------
  let empInfo: Effects['emp'];
  if (sc.kind === 'nuclear' && !chem && h > 30000) {
    const Rh = Math.sqrt(2 * EARTH_R * h);
    const peak = 50 * Math.min(1, Math.pow(Y / 100, 0.25)); // kV/m (saturación del E1 en armas grandes)
    const latSign = lat >= 0 ? 1 : -1; // el máximo ("sonrisa") queda hacia el ecuador magnético
    const fieldAt = (g: number, b: number) => {
      if (g > Rh) return 0;
      const toEq = latSign > 0 ? 180 : 0;
      const off = 0.3 * Rh;
      const ex = g * Math.sin((b * Math.PI) / 180) - off * Math.sin((toEq * Math.PI) / 180);
      const ny = g * Math.cos((b * Math.PI) / 180) - off * Math.cos((toEq * Math.PI) / 180);
      const dd = Math.hypot(ex, ny) / Rh;
      const north = 0.75 + 0.25 * Math.cos(((b - toEq) * Math.PI) / 180);
      return peak * (0.3 + 0.7 * Math.exp(-dd * dd / 0.35)) * north * (1 - 0.6 * Math.pow(g / Rh, 6));
    };
    empInfo = { heightM: h, horizonM: Rh, peakKVm: peak, fieldAt, latSign };
  }

  // ---------- incendios ----------
  let fireInfo: Effects['fires'];
  const ignR = rings.find((r) => r.id === 'ignite')?.radiusM ?? 0;
  if (ignR > 0 && !buried) {
    const prof0 = casualties.profile;
    const popIn = interp1(prof0.r, prof0.pop, ignR);
    const dens = popIn / Math.max(0.01, (Math.PI * ignR * ignR) / 1e6);
    const surf = windAt(env, 10).kmh;
    const area0 = (Math.PI * ignR * ignR) / 1e6;
    const storm = dens > 1500 && area0 > 1.3 && surf < 13;
    const v = storm ? 0 : Math.min(2.5, 0.15 + 0.06 * surf);
    const cap = Math.max(ignR * 1.6, (rings.find((r) => r.id === 'psi1')?.radiusM ?? ignR) * 1.1);
    const areaAt = (hh: number) => {
      const t = Math.min(hh, storm ? 3 : 12);
      if (storm) return area0 * (1 + 0.25 * Math.min(1, t / 3));
      const a = Math.min(cap, ignR + v * 1000 * t), b = Math.min(cap, ignR + 0.35 * v * 1000 * t);
      return (Math.PI * a * b) / 1e6;
    };
    fireInfo = {
      kind: storm ? 'firestorm' : dens > 200 ? 'conflagration' : 'none', ignitionR: ignR, spreadKmh: v, areaAt,
      reason: storm ? 'Zona urbana densa, gran superficie incendiada a la vez y viento flojo: los incendios se funden en una tormenta de fuego que aspira aire desde todas direcciones (como en Hiroshima o Hamburgo).' : dens > 200 ? `El viento (${Math.round(surf)} km/h) empuja el frente del incendio a ≈ ${v.toFixed(1).replace('.', ',')} km/h a sotavento.` : 'Poca densidad de combustible: incendios dispersos.',
    };
  }

  // ---------- efectos a largo plazo ----------
  let longTerm: Effects['longTerm'];
  if (sc.kind === 'nuclear' && !chem) {
    const prof0 = casualties.profile;
    const survAt = (r: number) => { const p = interp1(prof0.r, prof0.pop, r), d = interp1(prof0.r, prof0.deaths, r); return p > 0 ? 1 - d / p : 1; };
    let collective = 0, fdNo = 0, fdSh = 0, popF = 0;
    if (fModel) {
      const field = densityField(lat, lon, Math.max(50, ...fallout.map((f) => f.maxDownwindKm)) + 50);
      const { minE, maxE, minN, maxN } = fModel.bbox;
      const NX = 90, NY = 90, dx = (maxE - minE) / NX, dy = (maxN - minN) / NY;
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
        const e = minE + (i + 0.5) * dx, n = minN + (j + 0.5) * dy;
        const R1 = fModel.rateKm(e, n);
        if (R1 < 0.05) continue;
        const surv = survAt(Math.hypot(e, n) * 1000);
        const pop = field.at(e, n) * dx * dy * surv;
        popF += pop;
        const dNo = falloutDoseAt(e * 1000, n * 1000, 0, 168, 1.5);
        const dSh = falloutDoseAt(e * 1000, n * 1000, 0, 48, 10) + falloutDoseAt(e * 1000, n * 1000, 48, 168, 2);
        fdNo += pop * ll(dNo, 450, 6);
        fdSh += pop * ll(dSh, 450, 6);
        const dYear = dSh + falloutDoseAt(e * 1000, n * 1000, 168, 8760, 3);
        collective += pop * (1 - ll(dSh, 450, 6)) * Math.min(dYear, 400) / 100; // Sv
      }
    }
    // radiación inicial en los supervivientes
    for (let i = 1; i < prof0.r.length; i++) {
      const rm = (prof0.r[i] + prof0.r[i - 1]) / 2;
      const surv = (prof0.pop[i] - prof0.pop[i - 1]) - (prof0.deaths[i] - prof0.deaths[i - 1]);
      const dose = doseRemAt(rm) * 0.5;
      if (dose > 0.1 && surv > 0) collective += surv * Math.min(dose, 400) / 100;
    }
    longTerm = {
      falloutDeathsNoShelter: fdNo, falloutDeathsShelter: fdSh, cancerDeaths: collective * 0.05, collectiveSv: collective, popInFallout: popF,
      thyroidNote: 'El yodo-131 de la lluvia radiactiva se concentra en la leche y la tiroides, sobre todo en niños; las pastillas de yoduro potásico y no consumir alimentos frescos de la zona reducen ese riesgo.',
    };
  }

  if (sc.kind === 'nuclear' && contact === 0 && h < 30000) notes.push('Explosión aérea: la bola de fuego no toca el suelo, así que no hay lluvia radiactiva local significativa.');

  return {
    scenario: sc,
    energyKt: Y,
    energyJ: E_J,
    burstHeightM: h,
    groundContact: contact,
    fireball: { radiusM: fireballR, tMaxS: tMax, durationS: Math.max(tMax * 10, 0.3), visible: true },
    cloud,
    rings,
    crater,
    fallout,
    seismic,
    tsunami,
    shock,
    casualties,
    asteroid: asteroidInfo,
    notes,
    thermalFluenceAt,
    pressurePsiAt,
    doseRemAt,
    falloutRateAt,
    windKmh: fModel ? fModel.axisKmh : wEff.kmh,
    windFromDeg: fModel ? fModel.axisFromDeg : wEff.fromDeg,
    buried,
    falloutDoseAt,
    falloutArrivalH,
    emp: empInfo,
    fires: fireInfo,
    longTerm,
    chemical: chem,
    outdoorPct: env.outdoorPct != null ? Math.max(0, Math.min(100, env.outdoorPct)) : env.hour >= 7 && env.hour <= 20 ? 25 : 8,
    env: { ...env },
  };
}

interface CasualtyCtx {
  pressurePsiAt: (g: number) => number;
  thermalFluenceAt: (g: number) => number;
  doseRemAt: (g: number) => number;
  Y: number;
  isImpact: boolean;
  env: Environment;
  crater?: Effects['crater'];
  fireballR: number;
}

/** log-logística: 0 cuando x→0, 0,5 en x50 */
const ll = (x: number, x50: number, k: number) => (x <= 0 ? 0 : 1 / (1 + Math.pow(x50 / x, k)));

function estimateCasualties(lat: number, lon: number, rings: Ring[], c: CasualtyCtx): Casualties {
  const maxR = Math.max(...rings.filter((r) => r.group !== 'seismic' && r.group !== 'emp' && r.group !== 'tsunami').map((r) => r.radiusM), 500);
  const R = Math.min(maxR * 1.05, HALF_EARTH_M);
  const field = densityField(lat, lon, R / 1000);
  const nr = R > 2e6 ? 140 : 90, na = 72;
  // superficie de un casquete esférico de radio (arco) r
  const cap = (r: number) => 2 * Math.PI * EARTH_R * EARTH_R * (1 - Math.cos(r / EARTH_R));
  const la1 = (lat * Math.PI) / 180, lo1 = (lon * Math.PI) / 180;
  const day = c.env.hour >= 7 && c.env.hour <= 20;
  const outdoors = c.env.outdoorPct != null ? Math.max(0, Math.min(100, c.env.outdoorPct)) / 100 : day ? 0.25 : 0.08;
  const prof = { r: [0] as number[], pop: [0] as number[], deaths: [0] as number[], inj: [0] as number[], burns: [0] as number[] };
  let burns = 0;
  const scale = c.isImpact ? Math.pow(c.Y / 1000, 1 / 6) : Math.pow(c.Y / 1000, 0.065);
  let deaths = 0, inj = 0, exposed = 0;
  // radios en escala cuadrática para más resolución cerca del centro
  for (let i = 0; i < nr; i++) {
    const f0 = i / nr, f1 = (i + 1) / nr;
    const r0 = R * f0 * f0, r1 = R * f1 * f1;
    const rm = (r0 + r1) / 2;
    const psi = c.pressurePsiAt(rm);
    const q = c.thermalFluenceAt(rm) / scale;
    const dose = c.doseRemAt(rm) * 0.5; // blindaje medio de edificios
    // OTA (1979): 5–12 psi ≈ 50 % muertos, 2–5 psi ≈ 5 %, >12 psi ≈ 98 %
    let pd = 1 - (1 - ll(psi, 6, 4.25)) * (1 - outdoors * ll(q, 13, 4)) * (1 - ll(dose, 450, 6));
    if (rm < c.fireballR || (c.crater && rm < c.crater.diameterM / 2)) pd = 1;
    const pinj = Math.max(0, Math.min(1 - pd, ll(psi, 1.3, 3) * 0.6 + outdoors * ll(q, 4.5, 4) + ll(dose, 150, 4) * 0.5));
    const dA = (cap(r1) - cap(r0)) / 1e6 / na; // km²
    const dd = rm / EARTH_R;
    for (let j = 0; j < na; j++) {
      const th = ((j + 0.5) / na) * 2 * Math.PI;
      // punto a distancia rm y rumbo th (geodésico)
      const la2 = Math.asin(Math.sin(la1) * Math.cos(dd) + Math.cos(la1) * Math.sin(dd) * Math.cos(th));
      const lo2 = lo1 + Math.atan2(Math.sin(th) * Math.sin(dd) * Math.cos(la1), Math.cos(dd) - Math.sin(la1) * Math.sin(la2));
      const pop = field.atLatLon((la2 * 180) / Math.PI, (((lo2 * 180) / Math.PI + 540) % 360) - 180) * dA;
      exposed += pop;
      deaths += pop * pd;
      inj += pop * pinj;
      burns += pop * outdoors * ll(q, 4.5, 4) * (1 - pd);
    }
    prof.r.push(r1); prof.pop.push(exposed); prof.deaths.push(deaths); prof.inj.push(inj); prof.burns.push(burns);
  }
  const nc = nearestCity(lat, lon);
  return { deaths, injuries: inj, exposed, cityName: nc.km < 60 ? nc.city.name : undefined, profile: prof };
}

function interp1(xs: number[], ys: number[], x: number) {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) if (xs[i] >= x) return ys[i - 1] + ((x - xs[i - 1]) / (xs[i] - xs[i - 1] || 1)) * (ys[i] - ys[i - 1]);
  return ys[ys.length - 1];
}

export function fmtDist(m: number): string {
  if (m >= 1000) return `${(m / 1000).toLocaleString('es-ES', { maximumFractionDigits: m >= 100000 ? 0 : m >= 10000 ? 1 : 2 })} km`;
  return `${Math.round(m)} m`;
}

export function fmtArea(m: number): string {
  const km2 = (Math.PI * m * m) / 1e6;
  if (km2 >= 100) return `${Math.round(km2).toLocaleString('es-ES')} km²`;
  return `${km2.toLocaleString('es-ES', { maximumFractionDigits: 2 })} km²`;
}

export function compass(deg: number): string {
  const d = ((deg % 360) + 360) % 360;
  const names = ['el norte', 'el nordeste', 'el este', 'el sudeste', 'el sur', 'el suroeste', 'el oeste', 'el noroeste'];
  return names[Math.round(d / 45) % 8];
}

/** probabilidades de muerte y de heridas a una distancia (m) de la zona cero de un escenario ya calculado */
export function casualtyProbs(fx: Effects, rm: number): { pd: number; pinj: number } {
  const env = fx.env;
  const outdoors = fx.outdoorPct / 100;
  const isImpact = fx.scenario.kind === 'asteroid' && fx.burstHeightM === 0 && !!fx.crater;
  const Y = fx.energyKt;
  const scale = isImpact ? Math.pow(Y / 1000, 1 / 6) : Math.pow(Y / 1000, 0.065);
  void env;
  const psi = fx.pressurePsiAt(rm);
  const q = fx.thermalFluenceAt(rm) / scale;
  const dose = fx.doseRemAt(rm) * 0.5;
  let pd = 1 - (1 - ll(psi, 6, 4.25)) * (1 - outdoors * ll(q, 13, 4)) * (1 - ll(dose, 450, 6));
  const fbR = fx.groundContact > 0 ? fx.fireball.radiusM : 0;
  if (rm < fbR || (fx.crater && rm < fx.crater.diameterM / 2)) pd = 1;
  const pinj = Math.max(0, Math.min(1 - pd, ll(psi, 1.3, 3) * 0.6 + outdoors * ll(q, 4.5, 4) + ll(dose, 150, 4) * 0.5));
  return { pd, pinj };
}

/**
 * Víctimas de un ataque con varias detonaciones sin contar dos veces a nadie: en cada celda de
 * una malla se combinan las probabilidades de todas las explosiones (supervivencia = producto).
 */
export function combinedCasualties(strikes: { fx: Effects; lat: number; lon: number }[]): { deaths: number; injuries: number; exposed: number } {
  if (!strikes.length) return { deaths: 0, injuries: 0, exposed: 0 };
  const reach = (fx: Effects) => Math.min(2.5e6, Math.max(500, ...fx.rings.filter((r) => r.group !== 'seismic' && r.group !== 'emp' && r.group !== 'tsunami').map((r) => r.radiusM)) * 1.05);
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  const reachM = strikes.map((s) => reach(s.fx));
  // tablas radiales de probabilidad (mucho más rápido que evaluar la física en cada celda)
  const NT = 600;
  const tables = strikes.map((s, k) => {
    const pd = new Float32Array(NT + 1), pi = new Float32Array(NT + 1);
    for (let i = 0; i <= NT; i++) { const r = reachM[k] * (i / NT) ** 2; const p = casualtyProbs(s.fx, r); pd[i] = p.pd; pi[i] = p.pinj; }
    return { pd, pi };
  });
  const look = (k: number, r: number) => { const u = Math.sqrt(r / reachM[k]) * NT; const i = Math.min(NT - 1, Math.floor(u)), f = u - i; const T = tables[k]; return { pd: T.pd[i] + (T.pd[i + 1] - T.pd[i]) * f, pinj: T.pi[i] + (T.pi[i + 1] - T.pi[i]) * f }; };
  for (const [k, s] of strikes.entries()) {
    const R = reachM[k];
    const dLat = R / 111320, dLon = R / (111320 * Math.max(0.1, Math.cos((s.lat * Math.PI) / 180)));
    minLat = Math.min(minLat, s.lat - dLat); maxLat = Math.max(maxLat, s.lat + dLat);
    minLon = Math.min(minLon, s.lon - dLon); maxLon = Math.max(maxLon, s.lon + dLon);
  }
  minLat = Math.max(-89, minLat); maxLat = Math.min(89, maxLat);
  const cLat = (minLat + maxLat) / 2, cLon = (minLon + maxLon) / 2;
  const spanKm = Math.max((maxLat - minLat) * 111.32, (maxLon - minLon) * 111.32 * Math.cos((cLat * Math.PI) / 180));
  const field = densityField(cLat, cLon, spanKm);
  const N = 240;
  const dLa = (maxLat - minLat) / N, dLo = (maxLon - minLon) / N;
  let deaths = 0, injuries = 0, exposed = 0;
  for (let j = 0; j < N; j++) {
    const la = minLat + (j + 0.5) * dLa;
    const cosl = Math.cos((la * Math.PI) / 180);
    const cellKm2 = dLa * 111.32 * dLo * 111.32 * cosl;
    for (let i = 0; i < N; i++) {
      const lo = minLon + (i + 0.5) * dLo;
      let surv = 1, unhurt = 1, any = false;
      for (const [k, s] of strikes.entries()) {
        const dn = (la - s.lat) * 111320, de = (lo - s.lon) * 111320 * cosl;
        const r = Math.hypot(dn, de);
        if (r > reachM[k]) continue;
        any = true;
        const p = look(k, r);
        surv *= 1 - p.pd;
        unhurt *= Math.max(0, 1 - p.pd - p.pinj);
      }
      if (!any) continue;
      const pop = field.atLatLon(la, lo) * cellKm2;
      exposed += pop;
      deaths += pop * (1 - surv);
      injuries += pop * Math.max(0, surv - unhurt);
    }
  }
  return { deaths, injuries, exposed };
}
