/**
 * Cálculo unificado de efectos para armas nucleares e impactos cósmicos.
 */
import { blastRange, pressureAt, optimumHeight1kt, shockArrivalTable, PSI, peakWind, decibels } from './blast';
import { atmosphericEntry, impactCrater, KT_J } from './asteroid';
import { computeFallout } from './fallout';
import { densityField, nearestCity } from '../data/cities';
import type { Effects, Environment, Ring, Scenario, Casualties } from './types';

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
  if (kt >= 1e6) return `${(kt / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 2 })} Gt`;
  if (kt >= 1000) return `${(kt / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} Mt`;
  if (kt >= 1) return `${kt.toLocaleString('es-ES', { maximumFractionDigits: 1 })} kt`;
  return `${(kt * 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} t`;
}

export function computeEffects(sc: Scenario, env: Environment, lat: number, lon: number): Effects {
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

  if (sc.kind === 'nuclear') {
    Y = Math.max(sc.yieldKt, 1e-6);
    const s = Math.cbrt(Y);
    h = sc.burst === 'surface' ? 0 : sc.burst === 'optimal' ? optimumHeight1kt(5) * s : Math.max(0, sc.heightM);
    const rfAir = 70 * Math.pow(Y, 0.4);
    const contact0 = h < rfAir ? 1 - h / rfAir : 0;
    fireballR = rfAir * (1 + 0.32 * contact0);
    thermalFrac = 0.35 - 0.17 * contact0;
    fissionKt = Y * sc.fission;
    seismicEnergyJ = 1e-4 * contact0 * Y * KT_J;
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
      fireballR = 0.002 * Math.cbrt(Ej);
      thermalFrac = 0;
      impactThermal = ent.impactVelocityKms > 15;
      seismicEnergyJ = 1e-4 * Ej;
      const cr = impactCrater(sc, ent.impactVelocityKms);
      crater = { diameterM: cr.diameterM, depthM: cr.depthM, transientM: cr.transientM, type: cr.type };
      if (ent.fate === 'fragmented-impact') notes.push(`Se fragmenta a ${(ent.breakupAltM! / 1000).toFixed(1)} km pero los fragmentos alcanzan el suelo a ${ent.impactVelocityKms.toFixed(1)} km/s.`);
      if (sc.target === 'water' && cr.waterTransientM) {
        const rimR = cr.waterTransientM / 2;
        const A = Math.min(0.07 * cr.waterTransientM, sc.waterDepthM);
        tsunami = { rimWaveM: A, at100kmM: (A * rimR) / 100000 };
        if (cr.type === 'water') crater = undefined;
      }
    }
  }

  const E_J = Y * KT_J;
  const contact = h < fireballR ? 1 - h / fireballR : 0;
  const tMax = 0.032 * Math.sqrt(Y);

  // ---------- nube en forma de hongo ----------
  const top = Y < 1000 ? 7540 * Math.pow(Y, 0.155) : 22000 * Math.pow(Y / 1000, 0.22);
  const cloudTop = h > 20000 ? h : Math.min(top, 80000) + (sc.kind === 'nuclear' ? h * 0.3 : 0);
  const cloud = {
    topM: cloudTop,
    capBottomM: cloudTop * 0.5,
    capRadiusM: 1800 * Math.pow(Y, 0.25),
    stemRadiusM: 1800 * Math.pow(Y, 0.25) * 0.24,
    riseTimeS: 60 + 25 * Math.log10(Math.max(Y, 1)),
  };

  // ---------- funciones físicas ----------
  const vis = Math.max(1, env.visibilityKm);
  const a = 0.6 * vis;
  const thermalFluenceSlant = (slantM: number): number => {
    const Rkm = slantM / 1000;
    if (isImpact) {
      if (!impactThermal) return 0;
      const horizon = Math.sqrt(2 * EARTH_R * fireballR);
      return ((3e-3 * E_J) / (2 * Math.PI * slantM * slantM) / CAL_J_M2) * Math.exp(-((slantM / horizon) ** 2));
    }
    const tau = 1 / (1 + Rkm / a);
    const Rcm = slantM * 100;
    return (thermalFrac * Y * 1e12 * tau) / (4 * Math.PI * Rcm * Rcm);
  };
  const thermalFluenceAt = (groundM: number) => thermalFluenceSlant(Math.hypot(groundM, h));
  const pressurePsiAt = (groundM: number) => pressureAt(Y, groundM, h);
  const doseRemAt = (groundM: number) => (sc.kind === 'nuclear' ? promptDose(Y, Math.hypot(groundM, h) / 1000) : 0);

  const rings: Ring[] = [];
  const push = (r: Ring) => { if (r.radiusM > 0.5) rings.push(r); };

  // bola de fuego
  push({
    id: 'fireball', group: 'fireball', label: 'Bola de fuego', radiusM: contact > 0 ? Math.sqrt(Math.max(0, fireballR ** 2 - h ** 2)) || fireballR : fireballR,
    color: '#ffcf4a', dome: contact > 0, value: `${fmtDist(fireballR)} de radio`,
    desc: contact > 0 ? 'Todo lo que queda dentro se vaporiza. La bola de fuego toca el suelo: genera lluvia radiactiva intensa.' : 'Plasma a millones de grados. Al no tocar el suelo, la lluvia radiactiva local es mínima.',
  });

  if (crater) {
    push({ id: 'crater', group: 'crater', label: 'Cráter', radiusM: crater.diameterM / 2, color: '#a0714f', value: `${fmtDist(crater.diameterM)} Ø · ${fmtDist(crater.depthM)} prof.`, desc: `Cráter ${crater.type === 'complex' ? 'complejo (con pico central)' : 'simple'} excavado por el impacto.` });
  } else if (sc.kind === 'nuclear' && contact > 0.5) {
    const r = 20 * Math.pow(Y, 0.3) * contact;
    crater = { diameterM: 2 * r, depthM: 0.5 * r, transientM: 2 * r, type: 'simple' };
    push({ id: 'crater', group: 'crater', label: 'Cráter', radiusM: r, color: '#a0714f', value: `${fmtDist(2 * r)} Ø`, desc: 'Cráter aparente en suelo seco.' });
  }

  // radiación ionizante
  if (sc.kind === 'nuclear') {
    const radLevels = [
      { rem: 5000, label: 'Radiación 5000 rem', color: '#00ff88', desc: 'Incapacitación en minutos, muerte en horas o pocos días.' },
      { rem: 1000, label: 'Radiación 1000 rem', color: '#2bff6a', desc: 'Dosis letal en prácticamente todos los casos sin tratamiento.' },
      { rem: 500, label: 'Radiación 500 rem', color: '#5cff3a', desc: 'Dosis letal media: muere entre el 50 % y el 90 % sin atención médica.' },
      { rem: 100, label: 'Radiación 100 rem', color: '#a8ff7a', desc: 'Síndrome de radiación agudo leve; aumento del riesgo de cáncer.' },
    ];
    for (const L of radLevels) {
      const slant = solveDecreasing((r) => promptDose(Y, r / 1000), L.rem, 1, 3e5);
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
    const r = blastRange(Y, L.psi, h);
    if (L.psi === 200 && r < fireballR) continue;
    const pa = L.psi * PSI;
    push({ id: `psi${L.psi}`, group: 'blast', label: L.label, radiusM: r, color: L.color, value: `${L.psi} psi · viento ${Math.round(peakWind(pa) * 3.6)} km/h · ${Math.round(decibels(pa))} dB`, desc: L.desc, dome: L.psi === 5 || L.psi === 1 || L.psi === 20 });
  }

  // térmico
  if (thermalFrac > 0 || impactThermal) {
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
  if (tsunami && tsunami.rimWaveM > 1) {
    const rimR = (crater?.transientM ?? 1000) / 2;
    for (const A of [10, 3]) {
      const r = (tsunami.rimWaveM * rimR) / A;
      if (r > rimR) push({ id: `tsu${A}`, group: 'tsunami', label: `Tsunami: olas de ${A} m`, radiusM: r, color: '#38bdf8', value: `${A} m`, desc: 'Amplitud de la ola en mar abierto; en la costa puede multiplicarse.' });
    }
  }

  // sísmico
  let seismic: Effects['seismic'] = null;
  if (seismicEnergyJ > 1e6) {
    const M = 0.67 * Math.log10(seismicEnergyJ) - 5.87;
    const meff = (rKm: number) => {
      if (rKm < 60) return M - 0.0238 * rKm;
      if (rKm < 700) return M - 0.0048 * rKm - 1.1644;
      const deg = rKm / 111.2;
      return M - 1.66 * Math.log10(deg) - 6.399;
    };
    const sr: Ring[] = [];
    for (const L of [
      { m: 6, label: 'Seísmo: Mercalli IX–X', desc: 'Daños graves en estructuras, grietas en el terreno.' },
      { m: 5, label: 'Seísmo: Mercalli VII–VIII', desc: 'Daños moderados; caída de chimeneas y muros débiles.' },
      { m: 4, label: 'Seísmo: Mercalli V–VI', desc: 'Lo siente todo el mundo; caída de objetos, daños leves.' },
    ]) {
      if (meff(0) < L.m) continue;
      let lo = 0, hi = 20000;
      for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (meff(mid) >= L.m) lo = mid; else hi = mid; }
      sr.push({ id: `seis${L.m}`, group: 'seismic', label: L.label, radiusM: lo * 1000, color: '#c084fc', value: `M ef. ≥ ${L.m}`, desc: L.desc });
    }
    seismic = { magnitude: M, rings: sr };
    rings.push(...sr);
  }

  rings.sort((x, y) => x.radiusM - y.radiusM);

  // ---------- lluvia radiactiva ----------
  const fallout = sc.kind === 'nuclear'
    ? computeFallout({ fissionKt, contact, cloudTopM: cloud.topM, capRadiusM: cloud.capRadiusM, windFromDeg: env.windFromDeg, windKmh: env.windKmh })
    : [];

  // ---------- frente de choque ----------
  const maxR = Math.max(...rings.map((r) => r.radiusM), 1000) * 1.3;
  const shock = shockArrivalTable(Y, Math.min(maxR, 3e6));

  // ---------- víctimas ----------
  const casualties = estimateCasualties(lat, lon, rings, { pressurePsiAt, thermalFluenceAt, doseRemAt, Y, isImpact, env, crater, fireballR: contact > 0 ? fireballR : 0 });

  if (fallout.length) notes.push(`Viento de ${Math.round(env.windKmh)} km/h desde ${compass(env.windFromDeg)}: la lluvia radiactiva se extiende hacia ${compass(env.windFromDeg + 180)}.`);
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
  const R = Math.min(maxR * 1.05, 1.2e6);
  const field = densityField(lat, lon, R / 1000);
  const nr = 90, na = 72;
  const day = c.env.hour >= 7 && c.env.hour <= 20;
  const outdoors = day ? 0.25 : 0.08;
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
    const dA = (Math.PI * (r1 * r1 - r0 * r0)) / 1e6 / na; // km²
    for (let j = 0; j < na; j++) {
      const th = ((j + 0.5) / na) * 2 * Math.PI;
      const pop = field.at((rm / 1000) * Math.sin(th), (rm / 1000) * Math.cos(th)) * dA;
      exposed += pop;
      deaths += pop * pd;
      inj += pop * pinj;
    }
  }
  const nc = nearestCity(lat, lon);
  return { deaths, injuries: inj, exposed, cityName: nc.km < 60 ? nc.city.name : undefined };
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
