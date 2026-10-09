/**
 * "Micro base de datos" de estadísticas derivadas de un escenario: población, viviendas,
 * sanidad, física de la explosión, radiación, lluvia radiactiva, sismicidad, tsunami, clima,
 * economía y comparativas de energía. Todo son estimaciones de orden de magnitud.
 */
import { fmtDist, fmtEnergy, compass } from '../physics/effects';
import { interpTable, PSI, peakWind, decibels } from '../physics/blast';
import { fmtNum } from './dom';
import type { Effects, Ring } from '../physics/types';

export interface StatRow { k: string; v: string; hint?: string; strong?: boolean }
export interface StatSection { tab: 'pop' | 'phys' | 'rad' | 'cmp'; title: string; rows: StatRow[]; note?: string }

const KT_J = 4.184e12;
const n1 = (x: number, d = 1) => x.toLocaleString('es-ES', { maximumFractionDigits: d });
const pct = (x: number) => `${n1(x * 100, x < 0.01 ? 2 : 1)} %`;
const sci = (x: number) => {
  if (!isFinite(x)) return '—';
  if (x !== 0 && (Math.abs(x) >= 1e7 || Math.abs(x) < 1e-3)) {
    const e = Math.floor(Math.log10(Math.abs(x)));
    return `${n1(x / 10 ** e, 2)} × 10${sup(e)}`;
  }
  return n1(x, Math.abs(x) >= 100 ? 0 : 2);
};
/** duración legible: µs … años */
const dur = (s: number): string => {
  if (!isFinite(s)) return '—';
  if (s < 1e-6) return `${sci(s * 1e9)} ns`;
  if (s < 1e-3) return `${n1(s * 1e6, 0)} µs`;
  if (s < 1) return `${n1(s * 1000, 0)} ms`;
  if (s < 60) return `${n1(s, s < 10 ? 1 : 0)} s`;
  if (s < 3600) { const m = Math.floor(s / 60), r = Math.round(s % 60); return r ? `${m} min ${r} s` : `${m} min`; }
  if (s < 86400) { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return m ? `${h} h ${m} min` : `${h} h`; }
  const d = s / 86400;
  if (d < 60) return `${n1(d, d < 10 ? 1 : 0)} días`;
  const y = s / 3.156e7;
  if (y < 2) return `${n1(y * 12, 0)} meses`;
  return y >= 1e7 ? `${sci(y)} años` : `${fmtNum(y)} años`;
};
const mass = (t: number) => (t < 1 ? `${fmtNum(t * 1000)} kg` : t < 1e6 ? `${fmtNum(t)} t` : t < 1e9 ? `${n1(t / 1e6, 1)} millones de t` : `${sci(t / 1e9)} mil millones de t`);
const volume = (m3: number) => (m3 < 1e6 ? `${fmtNum(m3)} m³` : `${sci(m3 / 1e9)} km³`);
const area = (km2: number) => (km2 <= 0 ? '0' : km2 < 1 ? `${n1(km2 * 100, km2 < 0.1 ? 2 : 1)} ha` : `${fmtNum(km2)} km²`);
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (e: number) => (e < 0 ? '⁻' : '') + String(Math.abs(e)).split('').map((d) => SUP[+d]).join('');
const ratio = (x: number) => (x >= 10 ? `× ${fmtNum(x)}` : x >= 1 ? `× ${n1(x, 1)}` : x >= 1e-4 ? pct(x) : x > 0 ? `1 / ${fmtNum(1 / x)}` : '—');
const psiFmt = (p: number) => (p >= 10 ? n1(p, 0) : p >= 1 ? n1(p, 1) : n1(p, 2));

const QUAKES: [string, number][] = [
  ['Lorca (España, 2011)', 5.1], ['Ciudad de México (1985)', 8.0], ["L'Aquila (Italia, 2009)", 6.3], ['Northridge (EE. UU., 1994)', 6.7],
  ['Kobe (Japón, 1995)', 6.9], ['Haití (2010)', 7.0], ['Turquía-Siria (2023)', 7.8], ['San Francisco (1906)', 7.9],
  ['Lisboa (1755)', 8.7], ['Sumatra (2004)', 9.1], ['Tohoku (Japón, 2011)', 9.1], ['Valdivia (Chile, 1960, el mayor registrado)', 9.5],
];

export function buildStats(fx: Effects): StatSection[] {
  const S: StatSection[] = [];
  const sc = fx.scenario;
  const c = fx.casualties;
  const prof = c.profile;
  const at = (arr: number[], r: number) => (r <= 0 ? 0 : interpTable(prof.r, arr, Math.min(r, prof.r[prof.r.length - 1])));
  const ring = (id: string) => fx.rings.find((r) => r.id === id);
  const R = (id: string) => ring(id)?.radiusM ?? 0;
  const r1psi = R('psi1'), r5 = R('psi5'), r20 = R('psi20');
  const affectedR = Math.max(r1psi, R('burn2'), R('rad100'), R('fireball'));
  const isNuke = sc.kind === 'nuclear' && !fx.chemical;

  // ---------------------------------------------------------------- población
  const popAff = at(prof.pop, affectedR);
  const dwell = (r: number) => at(prof.pop, r) / 2.5; // ≈ 2,5 personas por vivienda
  const destroyed = dwell(Math.max(r5, R('fireball'), R('crater')));
  const heavy = Math.max(0, dwell((r5 + r1psi) / 2) - destroyed);
  const light = Math.max(0, dwell(r1psi) - destroyed - heavy);
  const rHome = (r5 + r1psi) / 2;
  const homeless = Math.max(0, at(prof.pop, rHome) - at(prof.deaths, rHome)) * 0.8;
  S.push({
    tab: 'pop', title: 'Población',
    rows: [
      { k: 'Personas en la zona afectada', v: fmtNum(popAff), hint: `dentro de ${fmtDist(affectedR)}` },
      { k: 'Fallecidos (inmediatos)', v: fmtNum(c.deaths), strong: true },
      { k: 'Heridos', v: fmtNum(c.injuries), strong: true },
      { k: 'De ellos, con quemaduras', v: fmtNum(prof.burns[prof.burns.length - 1] ?? 0) },
      { k: 'Mortalidad en la zona afectada', v: popAff > 0 ? pct(Math.min(1, c.deaths / popAff)) : '—' },
      { k: 'Personas sin hogar', v: fmtNum(homeless), hint: 'supervivientes con la vivienda destruida o inhabitable' },
      { k: 'Población al aire libre supuesta', v: `${n1(outdoorPct(fx), 0)} %`, hint: 'las personas en el exterior sufren más quemaduras' },
    ],
  });

  // por zona (de dentro afuera)
  const zoneRows: StatRow[] = [];
  const zones = [...fx.rings].filter((r) => !r.global && r.group !== 'seismic' && r.group !== 'tsunami' && r.group !== 'emp').sort((a, b) => a.radiusM - b.radiusM);
  for (const z of zones) {
    const p = at(prof.pop, z.radiusM), d = at(prof.deaths, z.radiusM);
    if (p < 1 && d < 1) continue;
    zoneRows.push({ k: z.label, v: `${fmtNum(p)} hab.`, hint: `${fmtDist(z.radiusM)} · ${fmtNum(d)} muertos dentro` });
  }
  if (zoneRows.length) S.push({ tab: 'pop', title: 'Población dentro de cada zona', rows: zoneRows, note: 'Cifras acumuladas desde la zona cero.' });

  S.push({
    tab: 'pop', title: 'Viviendas y edificios',
    rows: [
      { k: 'Viviendas destruidas', v: fmtNum(destroyed), hint: 'dentro del radio de 5 psi' },
      { k: 'Viviendas con daños graves', v: fmtNum(heavy) },
      { k: 'Viviendas con daños leves', v: fmtNum(light), hint: 'cristales, tejados, tabiques' },
      { k: 'Superficie arrasada (5 psi)', v: area((Math.PI * r5 * r5) / 1e6) },
      { k: 'Superficie con daños (1 psi)', v: area((Math.PI * r1psi * r1psi) / 1e6) },
    ],
  });

  const bedR = Math.max(50000, r1psi * 3);
  const beds = at(prof.pop, bedR) * 0.003; // ≈ 3 camas por 1000 habitantes
  const bedsLost = at(prof.pop, r5) * 0.003;
  const bedsLeft = Math.max(0, beds - bedsLost);
  S.push({
    tab: 'pop', title: 'Sanidad',
    rows: [
      { k: 'Camas hospitalarias en la región', v: fmtNum(beds), hint: `≈ 3 por 1000 hab. en ${fmtDist(bedR)}` },
      { k: 'Camas perdidas en la zona arrasada', v: fmtNum(bedsLost) },
      { k: 'Heridos por cama disponible', v: bedsLeft > 0 ? n1(c.injuries / bedsLeft, 1) : '∞', strong: true },
      { k: 'Grandes quemados', v: fmtNum((prof.burns[prof.burns.length - 1] ?? 0) * 0.3), hint: 'un país europeo tiene del orden de 100–300 camas de quemados' },
      { k: 'Donaciones de sangre necesarias (est.)', v: fmtNum(c.injuries * 0.3 * 4), hint: '≈ 4 unidades por herido grave' },
    ],
  });

  // ---------------------------------------------------------------- física
  const fbR = fx.fireball.radiusM;
  const tMax = fx.fireball.tMaxS;
  const pulse = Math.max(0.05, tMax * 10);
  const inner = Math.max(fbR, fx.crater ? fx.crater.diameterM / 2 : 0);
  const fb: StatRow[] = [
    { k: 'Radio máximo de la bola de fuego', v: fmtDist(fbR) },
    { k: 'Altura de la explosión', v: fx.burstHeightM > 0 ? fmtDist(fx.burstHeightM) : 'en superficie' },
    { k: 'Tiempo hasta el máximo térmico', v: dur(tMax) },
    { k: 'Duración del pulso térmico', v: dur(pulse) },
    { k: 'Temperatura inicial', v: isNuke ? 'decenas de millones de °C' : fx.chemical ? '≈ 3000–4000 °C' : '> 10 000 °C (plasma)' },
    { k: 'Temperatura superficial en el máximo', v: isNuke ? '≈ 6000–8000 °C' : fx.chemical ? '≈ 2500 °C' : '≈ 5000–10 000 °C' },
    { k: 'Altura máxima de la nube', v: fmtDist(fx.cloud.topM) },
    { k: 'Diámetro del sombrero', v: fmtDist(fx.cloud.capRadiusM * 2) },
    { k: 'Tiempo hasta estabilizarse', v: dur(fx.cloud.riseTimeS * 3) },
    { k: 'Deriva de la nube', v: `${n1(Math.max(4, fx.windKmh), 0)} km/h hacia ${compass(fx.windFromDeg + 180)}` },
  ];
  // brillo frente al Sol
  for (const dk of [10, 50, 200]) {
    if (dk * 1000 < inner * 1.5) continue;
    const W = (fx.thermalFluenceAt(dk * 1000) * 41840) / pulse; // W/m²
    if (W / 1361 > 1e-3) fb.push({ k: `Brillo a ${dk} km`, v: `${ratio(W / 1361)} el Sol`, hint: 'irradiancia media durante el pulso' });
  }
  S.push({ tab: 'phys', title: 'Bola de fuego y nube', rows: fb });

  // onda expansiva por distancia
  const dists = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000];
  const maxBlast = R('psi0.2') * 1.2;
  const bRows: StatRow[] = [];
  for (const d of dists) {
    if (d > maxBlast) break;
    if (d < inner) continue;
    const p = fx.pressurePsiAt(d);
    if (p <= 0.01) break;
    const tArr = interpTable(fx.shock.r, fx.shock.t, Math.hypot(d, fx.burstHeightM));
    bRows.push({ k: `A ${fmtDist(d)}`, v: `${psiFmt(p)} psi`, hint: `llega en ${dur(tArr)} · viento ${fmtNum(peakWind(p * PSI) * 3.6)} km/h · ${Math.round(decibels(p * PSI))} dB` });
  }
  if (bRows.length) S.push({ tab: 'phys', title: 'Onda expansiva por distancia', rows: bRows });
  const audible = R('psi0.2') * 4;
  const dB10 = Math.max(10000, Math.ceil((inner * 3) / 10000) * 10000);
  S.push({
    tab: 'phys', title: 'Sonido',
    rows: [
      { k: 'Nivel en el borde de la bola de fuego', v: ((db) => (db > 194 ? `${db} dB (onda de choque)` : `${db} dB`))(Math.round(decibels(Math.min(1e7, fx.pressurePsiAt(Math.max(fbR, 1)) * PSI)))), hint: 'más allá de 194 dB ya no es sonido sino una onda de choque; el umbral del dolor es 130 dB' },
      { k: `Nivel a ${fmtDist(dB10)}`, v: `${Math.round(decibels(fx.pressurePsiAt(dB10) * PSI))} dB`, hint: 'un avión despegando a 25 m ≈ 150 dB' },
      { k: 'Se oye con claridad hasta', v: fmtDist(Math.min(audible, 20015e3)) },
      { k: 'Velocidad de la onda lejos', v: '≈ 1235 km/h (velocidad del sonido)' },
    ],
  });

  // térmica
  const tRows: StatRow[] = [];
  for (const d of [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000]) {
    if (d < inner) continue;
    if (tRows.length >= 6) break;
    const q = fx.thermalFluenceAt(d);
    if (q < 0.5) break;
    tRows.push({ k: `A ${fmtDist(d)}`, v: `${n1(q, q < 10 ? 1 : 0)} cal/cm²`, hint: q > 15 ? 'prende madera y tejidos' : q > 8 ? 'quemaduras de 3.er grado' : q > 4 ? 'quemaduras de 2.º grado' : 'quemaduras de 1.er grado' });
  }
  const solve = (target: number) => { let lo = 1, hi = 2e7; if (fx.thermalFluenceAt(lo) < target) return 0; for (let i = 0; i < 60; i++) { const m = Math.sqrt(lo * hi); if (fx.thermalFluenceAt(m) >= target) lo = m; else hi = m; } return lo; };
  const blindDay = solve(0.4), blindNight = solve(0.08);
  if (blindDay > 0) tRows.push({ k: 'Ceguera temporal (de día)', v: fmtDist(blindDay), hint: 'deslumbramiento de varios minutos mirando hacia la explosión' });
  if (blindNight > 0) tRows.push({ k: 'Ceguera temporal (de noche)', v: fmtDist(blindNight), hint: 'la pupila dilatada capta más luz' });
  if (tRows.length) S.push({ tab: 'phys', title: 'Radiación térmica', rows: tRows });

  // sismicidad
  if (fx.seismic) {
    const M = fx.seismic.magnitude;
    const near = QUAKES.reduce((b, q) => (Math.abs(q[1] - M) < Math.abs(b[1] - M) ? q : b));
    const cmpQ = M >= 4.6 ? `${near[0]} (M ${n1(near[1], 1)})` : M >= 3 ? 'un temblor leve: se nota cerca, sin daños sísmicos' : 'imperceptible salvo con sismógrafos';
    const yrs = M >= 9 ? 'menos de uno al año en el mundo' : M >= 8 ? '≈ 1 al año en el mundo' : M >= 7 ? '≈ 15 al año en el mundo' : M >= 6 ? '≈ 130 al año en el mundo' : M >= 5 ? '≈ 1300 al año en el mundo' : 'decenas de miles al año';
    S.push({
      tab: 'phys', title: 'Sismicidad',
      rows: [
        { k: 'Magnitud equivalente', v: n1(M, 1), strong: true },
        { k: 'Comparable a', v: cmpQ },
        { k: 'Terremotos naturales así', v: yrs },
        { k: 'Energía sísmica', v: `${sci(Math.pow(10, 1.5 * M + 4.8))} J`, hint: 'Gutenberg-Richter' },
        { k: 'Llegada de la sacudida a 100 km', v: dur(100 / 5) },
        { k: 'Llegada a 1000 km', v: dur(1000 / 5) },
        ...fx.seismic.rings.map((r) => ({ k: r.label, v: fmtDist(r.radiusM) })),
      ],
    });
  }

  // cráter
  if (fx.crater) {
    const Dt = fx.crater.transientM;
    const vol = (Math.PI / 8) * Dt * Dt * (Dt / 2.83);
    S.push({
      tab: 'phys', title: 'Cráter y eyecta',
      rows: [
        { k: 'Diámetro final', v: fmtDist(fx.crater.diameterM) },
        { k: 'Profundidad', v: fmtDist(fx.crater.depthM) },
        { k: 'Tipo', v: fx.crater.type === 'complex' ? 'complejo (con pico central)' : 'simple (en cuenco)' },
        { k: 'Volumen excavado', v: volume(vol) },
        { k: 'Masa expulsada', v: mass((vol * 2500) / 1000) },
        ...fx.rings.filter((r) => r.group === 'ejecta').map((r) => ({ k: r.label, v: fmtDist(r.radiusM) })),
      ],
    });
  }

  // impacto
  if (fx.asteroid && sc.kind === 'asteroid') {
    const a = fx.asteroid;
    const lost = 1 - a.impactEnergyKt * KT_J / a.energyJ;
    const rows: StatRow[] = [
      { k: 'Diámetro', v: fmtDist(sc.diameterM) },
      { k: 'Densidad', v: `${fmtNum(sc.densityKgM3)} kg/m³` },
      { k: 'Masa', v: mass(a.massKg / 1000) },
      { k: 'Velocidad de entrada', v: `${n1(sc.velocityKms, 1)} km/s (${fmtNum(sc.velocityKms * 3600)} km/h)` },
      { k: 'Ángulo', v: `${sc.angleDeg}°` },
      { k: 'Energía cinética', v: fmtEnergy(a.energyJ / KT_J) },
      { k: 'Fragmentación', v: a.breakupAltM ? `a ${fmtDist(a.breakupAltM)}` : 'no (llega intacto)' },
      { k: 'Explosión aérea', v: a.airburstAltM ? `a ${fmtDist(a.airburstAltM)}` : 'no' },
      { k: 'Velocidad al llegar al suelo', v: a.fate === 'airburst' ? '—' : `${n1(a.impactVelocityKms, 1)} km/s` },
      { k: 'Energía perdida en la atmósfera', v: a.fate === 'airburst' ? '100 % (estalla en el aire)' : pct(Math.max(0, lost)) },
      { k: 'Frecuencia de un impacto así', v: a.recurrenceYears < 1 ? 'varias veces al año' : `1 cada ${fmtNum(a.recurrenceYears)} años` },
    ];
    S.push({ tab: 'phys', title: 'El objeto', rows });
  }

  // tsunami
  if (fx.tsunami) {
    const T = fx.tsunami;
    const cw = Math.sqrt(9.81 * Math.max(10, T.depthM));
    const rows: StatRow[] = [
      { k: 'Profundidad del agua', v: fmtDist(T.depthM) },
      { k: 'Velocidad de la ola', v: `${fmtNum(cw * 3.6)} km/h` },
      { k: 'Ola inicial', v: fmtDist(T.rimWaveM) },
    ];
    for (const d of [100e3, 500e3, 1000e3, 3000e3, 10000e3]) {
      const A = (T.rimWaveM * T.transientM) / (2 * d);
      if (d < T.transientM / 2 || d > 13000e3) continue;
      rows.push({ k: `A ${fmtDist(d)}`, v: `${A >= 10 ? fmtNum(A) : n1(A, 1)} m`, hint: `llega en ${dur(d / cw)} · en la costa ×2–3` });
    }
    S.push({ tab: 'phys', title: 'Tsunami', rows });
  }

  // ---------------------------------------------------------------- radiación
  if (isNuke) {
    const rRows: StatRow[] = [];
    for (const d of [500, 1000, 1500, 2000, 3000, 5000]) {
      const D = fx.doseRemAt(d);
      if (D < 1) break;
      rRows.push({ k: `A ${fmtDist(d)}`, v: `${fmtNum(D)} rem`, hint: D > 1000 ? 'mortal' : D > 450 ? 'mortal en el 50 %' : D > 100 ? 'síndrome de radiación' : 'riesgo de cáncer' });
    }
    if (rRows.length) S.push({ tab: 'rad', title: 'Radiación inicial (primer minuto)', rows: rRows, note: 'Dosis a la intemperie; dentro de un edificio se reduce a la mitad o menos.' });
  }
  if (isNuke && sc.kind === 'nuclear') {
    const fk = sc.yieldKt * sc.fission; // kt de fisión
    if (fk > 0) {
      // 1 kt de fisión ≈ 1,45 × 10²³ fisiones; rendimientos de fisión acumulados (U-235 térmico)
      const N = fk * 1.45e23;
      const act = (yieldF: number, halfS: number) => (Math.LN2 / halfS) * N * yieldF; // Bq
      const cs = act(0.062, 30.17 * 3.156e7), sr = act(0.058, 28.8 * 3.156e7), io = act(0.029, 8.02 * 86400);
      S.push({
        tab: 'rad', title: 'Isótopos producidos',
        rows: [
          { k: 'Energía de fisión', v: fmtEnergy(fk), hint: `${pct(sc.fission)} del total` },
          { k: 'Productos de fisión', v: `${sci(fk * 0.0573)} kg`, hint: '≈ 57 g por kt de fisión' },
          { k: 'Yodo-131 (8 días)', v: `${sci(io / 1e15)} PBq`, hint: `Chernóbil liberó ≈ 1760 PBq → ${ratio(io / 1.76e18)}` },
          { k: 'Cesio-137 (30 años)', v: `${sci(cs / 1e15)} PBq`, hint: `Chernóbil liberó ≈ 85 PBq → ${ratio(cs / 8.5e16)}` },
          { k: 'Estroncio-90 (29 años)', v: `${sci(sr / 1e15)} PBq`, hint: 'se fija en los huesos' },
          { k: 'Depósito local', v: pct(0.6 * fx.groundContact), hint: 'fracción que cae en las primeras 24 h (si la bola de fuego toca el suelo)' },
        ],
        note: 'Actividad en el momento de la explosión. En explosiones aéreas casi toda la radiactividad sube a la estratosfera y cae durante meses en todo el hemisferio.',
      });
    }
  }
  if (fx.fallout.length) {
    const to = ((fx.windFromDeg + 180) * Math.PI) / 180;
    const ex = Math.sin(to), ny = Math.cos(to);
    const u = Math.max(4, fx.windKmh);
    const fRows: StatRow[] = [];
    for (const dk of [5, 10, 25, 50, 100, 200, 400]) {
      const R1 = fx.falloutRateAt(dk * 1000 * ex, dk * 1000 * ny);
      if (R1 < 0.05) continue;
      const ta = Math.max(0.5, dk / u); // h de llegada
      const dose = (t1: number) => (t1 <= ta ? 0 : 5 * R1 * (Math.pow(ta, -0.2) - Math.pow(t1, -0.2)));
      const safe = Math.pow(R1 / 0.1, 1 / 1.2); // h hasta < 0,1 R/h
      fRows.push({
        k: `${dk} km a sotavento`,
        v: `${R1 >= 10 ? fmtNum(R1) : n1(R1, 1)} R/h a H+1`,
        hint: `llega en ${dur(ta * 3600)} · 24 h: ${fmtNum(dose(24))} rem (en refugio ${fmtNum(dose(24) / 40)}) · 7 días: ${fmtNum(dose(168))} rem · < 0,1 R/h tras ${dur(safe * 3600)}`,
      });
    }
    S.push({ tab: 'rad', title: 'Lluvia radiactiva en el eje del viento', rows: fRows, note: 'La tasa de dosis cae según t⁻¹·² (regla del 7-10: cada 7× de tiempo, 10× menos radiación). En un sótano o refugio (factor de protección 40) la dosis se divide por 40.' });
    S.push({
      tab: 'rad', title: 'Superficie contaminada',
      rows: [...fx.fallout].sort((a, b) => b.level - a.level).map((f) => ({ k: `Más de ${f.label}`, v: area(f.areaKm2), hint: `hasta ${fmtNum(f.maxDownwindKm)} km a sotavento${f.areaKm2 >= 605 ? ` · ≈ ${fmtNum(f.areaKm2 / 605)} veces el municipio de Madrid` : ''}` })),
    });
    S.push({
      tab: 'rad', title: 'Protección civil',
      rows: [
        { k: 'Refugiarse durante al menos', v: '24–48 h', hint: 'lo peor de la radiación decae en los primeros días' },
        { k: 'Radiación a las 7 h', v: '10 % de la de H+1' },
        { k: 'Radiación a las 49 h', v: '1 % de la de H+1' },
        { k: 'Radiación a las 2 semanas', v: '0,1 % de la de H+1' },
      ],
    });
  }

  // ---------------------------------------------------------------- comparativas
  const E = fx.energyJ;
  const kt = fx.energyKt;
  const cmp: StatRow[] = [
    { k: 'Energía', v: `${sci(E)} J`, strong: true },
    { k: 'Equivalente en TNT', v: fmtEnergy(kt) },
    { k: 'Equivalente en kWh', v: `${sci(E / 3.6e6)} kWh` },
    { k: 'Bombas de Hiroshima', v: ratio(kt / 15) },
    { k: 'Tsar Bomba (50 Mt)', v: ratio(kt / 50000) },
    { k: 'Bomba MOAB (11 t)', v: ratio(kt / 0.011) },
    { k: 'Explosión de Beirut 2020 (0,8 kt)', v: ratio(kt / 0.8) },
    { k: 'Erupción del Krakatoa (≈ 200 Mt)', v: ratio(kt / 200000) },
    { k: 'Erupción del St. Helens (≈ 24 Mt)', v: ratio(kt / 24000) },
    { k: 'Luz solar que recibe la Tierra', v: `${dur(E / 1.74e17)} de sol`, hint: '1,74 × 10¹⁷ W' },
    { k: 'Consumo energético mundial', v: `${dur(E / (6.2e20 / 3.156e7))}`, hint: '≈ 620 EJ al año' },
    { k: 'Electricidad de España', v: `${dur(E / (9e17 / 3.156e7))}`, hint: '≈ 250 TWh al año' },
  ];
  S.push({ tab: 'cmp', title: 'Energía', rows: cmp });

  // clima
  const burnR = R('ignite');
  let sootTg = 0;
  if (burnR > 0) {
    // hollín: superficie urbana incendiada (≈ 0,004 Tg/km² en zonas densas, Robock y Toon)
    const urbanFrac = Math.min(1, at(prof.pop, burnR) / Math.max(1, (Math.PI * burnR * burnR) / 1e6) / 5000);
    sootTg = ((Math.PI * burnR * burnR) / 1e6) * urbanFrac * 0.004;
  }
  const dT = sootTg > 0.01 ? -1.25 * Math.pow(sootTg / 5, 0.55) : 0;
  const clim: StatRow[] = [
    { k: 'Superficie incendiada', v: burnR ? area((Math.PI * burnR * burnR) / 1e6) : '—' },
    { k: 'Hollín a la estratosfera (est.)', v: sootTg >= 0.01 ? `${n1(sootTg, 2)} millones de t` : sootTg * 1e6 >= 1 ? `${fmtNum(sootTg * 1e6)} t` : 'insignificante' },
    { k: 'Enfriamiento global (est.)', v: dT ? `${n1(dT, 2)} °C` : 'inapreciable', hint: 'con 5 Mt de hollín (100 Hiroshimas) ≈ −1,25 °C durante años' },
  ];
  if (sc.kind === 'asteroid' && E > 1e21) clim.push({ k: 'Invierno de impacto', v: E > 1e23 ? 'global y prolongado' : 'probable (años)', hint: 'polvo y aerosoles en la estratosfera' });
  if (isNuke) clim.push({ k: 'Capa de ozono', v: kt > 1000 ? 'daño regional apreciable' : 'efecto local', hint: 'los óxidos de nitrógeno de la bola de fuego destruyen ozono' });
  S.push({ tab: 'cmp', title: 'Clima y medio ambiente', rows: clim });

  const cost = destroyed * 180000 + heavy * 60000 + light * 8000;
  S.push({
    tab: 'cmp', title: 'Economía (orden de magnitud)',
    rows: [
      { k: 'Daños en viviendas', v: `${sci(cost / 1e9)} mil millones de €` },
      { k: 'Con infraestructuras y empresas', v: `${sci((cost * 2.5) / 1e9)} mil millones de €`, hint: 'sin contar pérdidas humanas ni efectos a largo plazo' },
    ],
  });
  return S;
}

function outdoorPct(fx: Effects): number { return fx.outdoorPct; }

export type { Ring };
