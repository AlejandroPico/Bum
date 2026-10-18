/**
 * Pruebas de los cálculos físicos de Bum contra valores de referencia publicados.
 *   npm test
 *
 * Cada prueba compara un resultado del simulador con un valor de referencia y una tolerancia.
 * Las tolerancias son amplias a propósito: los modelos son empíricos y las propias fuentes
 * difieren entre sí. Lo que se busca es detectar regresiones y errores de orden de magnitud.
 *
 * Referencias principales:
 *   G&D   Glasstone y Dolan (1977), The Effects of Nuclear Weapons, 3.ª ed.
 *   NM    NUKEMAP (Wellerstein), que usa los mismos ajustes de G&D para 1 kt y 1 Mt
 *   EIEP  Collins, Melosh y Marcus (2005), Earth Impact Effects Program
 */
import { computeEffects } from '../src/physics/effects';
import { computeRelease, computeVolcano } from '../src/physics/other';
import type { Effects, Scenario } from '../src/physics/types';
import { fmtDist, fmtEnergy } from '../src/physics/effects';
import { assessPoint, localOffset } from '../src/physics/safety';
import { ballistic, greatCircleKm, greatCirclePath } from '../src/data/launch';
import { computeTerrainShadow } from '../src/physics/terrain';
import { geomagLat, auroraBoundary } from '../src/physics/disasters';
import { warSchedule, WAR_PRESETS, climateSeries } from '../src/data/war';
import { heatGrid } from '../src/physics/heat';
import { planFlight, profileFor, legAt } from '../src/data/flight';
import { combinedCasualties } from '../src/physics/effects';

const ENV = { windFromDeg: 270, windKmh: 24, visibilityKm: 22, humidity: 60, hour: 12 };
const MADRID: [number, number] = [40.4168, -3.7038];

let pass = 0, fail = 0;
const failures: string[] = [];
let group = '';
function section(name: string) { group = name; console.log(`\n\x1b[1m${name}\x1b[0m`); }
function check(name: string, got: number, ref: number, tol: number, src: string) {
  const ok = Number.isFinite(got) && Math.abs(got - ref) <= Math.abs(ref) * tol;
  const msg = `${name}: ${fmt(got)} (referencia ${fmt(ref)} ±${Math.round(tol * 100)} %, ${src})`;
  if (ok) { pass++; console.log(`  \x1b[32m✓\x1b[0m ${msg}`); } else { fail++; failures.push(`${group} › ${msg}`); console.log(`  \x1b[31m✗ ${msg}\x1b[0m`); }
}
function range(name: string, got: number, lo: number, hi: number, src: string) {
  const ok = Number.isFinite(got) && got >= lo && got <= hi;
  const msg = `${name}: ${fmt(got)} (esperado entre ${fmt(lo)} y ${fmt(hi)}, ${src})`;
  if (ok) { pass++; console.log(`  \x1b[32m✓\x1b[0m ${msg}`); } else { fail++; failures.push(`${group} › ${msg}`); console.log(`  \x1b[31m✗ ${msg}\x1b[0m`); }
}
function truthy(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); } else { fail++; failures.push(`${group} › ${name} ${detail}`); console.log(`  \x1b[31m✗ ${name} ${detail}\x1b[0m`); }
}
const fmt = (x: number) => (Math.abs(x) >= 1e5 || (Math.abs(x) < 0.01 && x !== 0) ? x.toExponential(3) : Number(x.toFixed(3)).toString());

function run(sc: Scenario, at: [number, number] = MADRID): Effects {
  if (sc.kind === 'release') return computeRelease(sc, ENV, at[0], at[1]);
  if (sc.kind === 'volcano') return computeVolcano(sc, ENV, at[0], at[1]);
  return computeEffects(sc, ENV, at[0], at[1]);
}
const ring = (e: Effects, re: RegExp) => e.rings.find((r) => re.test(r.label))?.radiusM ?? NaN;
const km = (m: number) => m / 1000;
const nuke = (yieldKt: number, burst: 'optimal' | 'surface' | 'custom' | 'underground' | 'underwater', extra: Record<string, number | boolean> = {}): Scenario =>
  ({ kind: 'nuclear', name: 'prueba', yieldKt, fission: 0.5, burst, heightM: 0, ...extra } as Scenario);

// ───────────────────────────────────────────────────────── armas nucleares
section('Explosión aérea de 1 kt a la altura óptima');
{
  const e = run(nuke(1, 'optimal'));
  check('Radio de la bola de fuego (m)', e.fireball.radiusM, 69, 0.15, 'G&D §2.129, ≈ 69 m');
  check('Radio de 5 psi (km)', km(ring(e, /5 psi/)), 0.71, 0.2, 'G&D fig. 3.73');
  check('Radio de 1 psi (km)', km(ring(e, /\(1 psi\)/)), 1.75, 0.25, 'G&D fig. 3.73');
  check('Dosis de 500 rem (km)', km(ring(e, /500 rem/)), 0.79, 0.2, 'NM 1 kt');
}

section('Explosión aérea de 1 Mt a la altura óptima');
{
  const e = run(nuke(1000, 'optimal'));
  check('Radio de 5 psi (km)', km(ring(e, /5 psi/)), 5.97, 0.15, 'NM');
  check('Radio de 1 psi (km)', km(ring(e, /\(1 psi\)/)), 15.9, 0.2, 'NM');
  check('Quemaduras de 3.er grado (km)', km(ring(e, /3\.er grado/)), 11.1, 0.2, 'NM');
  check('Radio de 20 psi (km)', km(ring(e, /20 psi/)), 2.2, 0.25, 'NM');
  range('Altura de la nube (km)', km(e.cloud.topM), 18, 30, 'G&D fig. 2.16, ≈ 22 km');
  truthy('Sin lluvia radiactiva local en explosión aérea', e.fallout.length === 0);
}

section('Explosión de 1 Mt en superficie');
{
  const e = run(nuke(1000, 'surface'));
  range('Diámetro del cráter (m)', e.crater?.diameterM ?? NaN, 250, 450, 'G&D cap. 6, suelo seco ≈ 300–400 m');
  truthy('Genera lluvia radiactiva', e.fallout.length > 0);
  const c1 = e.fallout.find((f) => f.level === 1);
  range('Alcance del contorno de 1 rad/h (km)', c1?.maxDownwindKm ?? NaN, 250, 900, 'G&D fig. 9.95, viento de 24 km/h');
  truthy('La superficie de 5 psi es menor que en explosión aérea', ring(e, /5 psi/) < ring(run(nuke(1000, 'optimal')), /5 psi/));
}

section('Ley de escala de la raíz cúbica');
{
  const a = ring(run(nuke(1, 'optimal')), /5 psi/), b = ring(run(nuke(1000, 'optimal')), /5 psi/);
  check('Radio de 5 psi: 1 Mt / 1 kt', b / a, 10, 0.08, 'Hopkinson-Cranz, 1000^(1/3) = 10');
}

section('Hiroshima (Little Boy, 15 kt a 600 m)');
{
  const e = run(nuke(15, 'custom', { heightM: 600, fission: 1 }), [34.3853, 132.4553]);
  check('Radio de 5 psi (km)', km(ring(e, /5 psi/)), 1.6, 0.2, 'G&D §5.139, daño grave hasta ≈ 1,6 km');
  check('Bola de fuego (m)', e.fireball.radiusM, 200, 0.2, 'G&D: ≈ 370–400 m de diámetro');
  range('Quemaduras de 2.º grado (km)', km(ring(e, /2\.º grado/)), 2.2, 3.6, 'RERF y G&D: quemaduras hasta 3–3,5 km');
  // con viento flojo, como aquella mañana
  const calm = computeEffects(nuke(15, 'custom', { heightM: 600, fission: 1 }), { ...ENV, windKmh: 6, humidity: 80 }, 34.3853, 132.4553);
  truthy('Con viento flojo: tormenta de fuego', calm.fires?.kind === 'firestorm', `(${calm.fires?.kind})`);
  range('Lluvia negra intensa (km²)', calm.blackRain?.heavyKm2 ?? NaN, 80, 400, 'Uda 1953: ≈ 19 × 11 km');
}

section('Sedan (104 kt enterrada a 194 m, Nevada, 1962)');
{
  const e = run(nuke(104, 'underground', { depthM: 194, fission: 0.3 }));
  check('Diámetro del cráter (m)', e.crater?.diameterM ?? NaN, 390, 0.3, 'Plowshare, 390 m');
  range('Profundidad del cráter (m)', e.crater?.depthM ?? NaN, 60, 140, 'Plowshare, 98 m');
}

section('Baker (23 kt a 27 m bajo el agua, Bikini, 1946)');
{
  const e = run(nuke(23, 'underwater', { depthM: 27, seaDepthM: 55, fission: 1 }));
  range('Altura de la columna de agua (m)', e.buried?.columnM ?? NaN, 1200, 3000, 'G&D §2.60, ≈ 1800 m');
  range('Radio de la oleada de base (km)', km(e.buried?.surgeR ?? NaN), 1.5, 4.5, 'G&D §2.63, ≈ 3 km a los 4 min');
}

section('Lluvia radiactiva: regla de desintegración t^−1,2');
{
  const e = run(nuke(1000, 'surface'));
  const x = 40000, y = 0; // 40 km a sotavento (viento del oeste)
  const r1 = e.falloutRateAt(x, y);
  const arr = e.falloutArrivalH?.(x, y) ?? 0;
  const t0 = Math.max(arr, 2), t1 = t0 * 2;
  const d = e.falloutDoseAt?.(x, y, t0, t1, 1) ?? NaN;
  const ideal = r1 * 5 * (Math.pow(t0, -0.2) - Math.pow(t1, -0.2));
  truthy('Tasa a H+1 positiva a sotavento', r1 > 0);
  check(`Dosis entre ${t0.toFixed(1)} y ${t1.toFixed(1)} h frente a la integral de R₁·t^−1,2`, d, ideal, 0.3, 'Way y Wigner (1948)');
  const up = e.falloutRateAt(-40000, 0);
  truthy('A barlovento la tasa es mucho menor', up < r1 * 0.05, `(${fmt(up)} frente a ${fmt(r1)})`);
}

section('Explosión a gran altitud (Starfish Prime, 1,4 Mt a 400 km)');
{
  const e = run(nuke(1400, 'custom', { heightM: 400000 }));
  range('Radio del pulso electromagnético (km)', km(ring(e, /EMP/)), 1800, 2500, 'horizonte geométrico a 400 km ≈ 2250 km');
  truthy('Sin víctimas directas', e.casualties.deaths < 1);
}

// ───────────────────────────────────────────────────────── asteroides
const ast = (diameterM: number, densityKgM3: number, velocityKms: number, angleDeg: number, target: 'rock' | 'sediment' | 'water' = 'rock', waterDepthM = 0): Scenario =>
  ({ kind: 'asteroid', name: 'prueba', diameterM, densityKgM3, velocityKms, angleDeg, target, waterDepthM } as Scenario);

section('Energía cinética');
{
  const e = run(ast(1000, 3000, 20, 45));
  const m = 3000 * Math.PI * 1000 ** 3 / 6, E = 0.5 * m * 20000 ** 2;
  check('Masa (kg) = ρ·π·d³/6', e.asteroid?.massKg ?? NaN, m, 0.001, 'definición');
  check('Energía de entrada (J) = ½·m·v²', e.asteroid?.energyJ ?? NaN, E, 0.001, 'definición');
  check('Energía en el impacto en kt (J / 4,184·10¹²)', e.energyKt, e.energyJ / 4.184e12, 0.001, '1 kt = 4,184·10¹² J');
  truthy('La atmósfera frena algo al objeto (v impacto < v entrada)', (e.asteroid?.impactVelocityKms ?? 99) < 20);
}

section('Cheliábinsk (19 m, 19 km/s, 18°, 2013)');
{
  const e = run(ast(19, 3300, 19, 18));
  range('Energía (kt)', e.energyKt, 400, 600, 'Popova et al. 2013: ≈ 500 kt');
  range('Altura de la explosión (km)', km(e.asteroid?.airburstAltM ?? NaN), 23, 36, 'Popova et al. 2013: 27–30 km');
  truthy('Sin cráter', !e.crater);
}

section('Tunguska (≈ 60 m, 15 km/s, 1908)');
{
  const e = run(ast(60, 3000, 15, 35));
  range('Energía (Mt)', e.energyKt / 1000, 3, 15, 'Boslough y Crawford 2008: 3–5 Mt; Ben-Menahem 1975: 12 Mt');
  range('Altura de la explosión (km)', km(e.asteroid?.airburstAltM ?? NaN), 5, 12, 'Chyba et al. 1993: 5–10 km');
  const area = Math.PI * km(ring(e, /\(1 psi\)/)) ** 2;
  range('Área con al menos 1 psi (km²)', area, 1000, 5000, 'árboles derribados en ≈ 2150 km²');
}

section('Meteor Crater (hierro de ≈ 50 m, 12,8 km/s)');
{
  const e = run(ast(50, 7800, 12.8, 45, 'sediment'));
  check('Diámetro del cráter (km)', km(e.crater?.diameterM ?? NaN), 1.19, 0.3, 'Kring 2007: 1,19 km');
  range('Energía (Mt)', e.energyKt / 1000, 3, 15, 'Melosh y Collins 2005: ≈ 10 Mt');
}

section('Chicxulub (10 km, 20 km/s)');
{
  const e = run(ast(10000, 2700, 20, 60, 'water', 200));
  range('Diámetro final del cráter (km)', km(e.crater?.diameterM ?? NaN), 100, 220, 'Hildebrand et al. 1991: ≈ 180 km');
  range('Energía (J)', e.energyJ, 1e23, 1e24, 'Schulte et al. 2010: ≈ 10²³ J');
  truthy('Clasificado como cráter complejo', e.crater?.type === 'complex');
}

section('Robustez ante valores extremos');
{
  const e = run(ast(10000, 1e22, 72, 90));
  truthy('Densidad absurda: resultados finitos', Number.isFinite(e.energyKt) && e.rings.every((r) => Number.isFinite(r.radiusM)));
  const t = run(nuke(0.001, 'surface'));
  truthy('1 tonelada: resultados finitos y positivos', t.rings.every((r) => Number.isFinite(r.radiusM) && r.radiusM >= 0));
}

// ───────────────────────────────────────────────────────── otros escenarios
section('Chernóbil (85 PBq de cesio-137 durante 10 días)');
{
  const e = run({ kind: 'release', name: 'Chernóbil', source: 'reactor', isotope: 'Cs-137', activityTBq: 85000, heightM: 1000, durationH: 240 }, [51.389, 30.099]);
  const area = (re: RegExp) => e.fallout.find((f) => re.test(f.label))?.areaKm2 ?? NaN;
  range('Área contaminada (≥ 37 kBq/m², km²)', area(/≥ 37 /), 60000, 400000, 'UNSCEAR 2000: ≈ 200 000 km² en Europa');
  range('Área de reasentamiento (≥ 555 kBq/m², km²)', area(/≥ 555 /), 1000, 30000, 'UNSCEAR 2000: ≈ 10 000 km²');
  truthy('Hay contaminación a más de 100 km', (e.release?.depositAt(150000, 0) ?? 0) > 37, `(${fmt(e.release?.depositAt(150000, 0) ?? NaN)} kBq/m² a 150 km)`);
}

section('Pinatubo (VEI 6, 1991)');
{
  const e = run({ kind: 'volcano', name: 'Pinatubo', vei: 6, volumeMul: 1 }, [15.13, 120.35]);
  range('Altura de la columna (km)', km(e.volcano?.columnM ?? NaN), 25, 45, 'USGS: ≈ 35 km');
  range('Enfriamiento global (°C)', -(e.volcano?.coolingC ?? NaN), 0.2, 0.8, 'NASA: ≈ 0,5 °C');
}

// ───────────────────────────────────────────────────────── viento hora a hora
section('Viento que cambia con las horas');
{
  // viento del oeste las 2 primeras horas y del sur después
  const prof = (from: number) => [{ zM: 10, kmh: 30, fromDeg: from }, { zM: 12000, kmh: 30, fromDeg: from }];
  const hourly = Array.from({ length: 48 }, (_, i) => prof(i < 2 ? 270 : 180));
  const envH = { ...ENV, windKmh: 30, windFromDeg: 270, windProfile: prof(270), windHourly: hourly };
  const sc = nuke(1000, 'surface');
  const fixed = computeEffects(sc, { ...ENV, windKmh: 30, windFromDeg: 270, windProfile: prof(270) }, MADRID[0], MADRID[1]);
  const turn = computeEffects(sc, envH, MADRID[0], MADRID[1]);
  // a 150 km al noreste la pluma que gira hacia el norte deja más actividad
  const pNE = [110000, 110000] as const;
  truthy('La pluma se curva al girar el viento (más lluvia radiactiva al noreste)', turn.falloutRateAt(...pNE) > fixed.falloutRateAt(...pNE) * 3,
    `(${fmt(turn.falloutRateAt(...pNE))} frente a ${fmt(fixed.falloutRateAt(...pNE))} R/h)`);
  const rel = { kind: 'release', name: 'C', source: 'reactor', isotope: 'Cs-137', activityTBq: 85000, heightM: 1000, durationH: 240 } as Scenario;
  const rot = Array.from({ length: 48 }, (_, i) => prof([270, 180, 90, 0][Math.floor(i / 12)]));
  const r = computeRelease(rel as never, { ...ENV, windKmh: 20, windProfile: rot[0], windHourly: rot }, 51.389, 30.099);
  const dirs = [[100000, 0], [0, 100000], [-100000, 0], [0, -100000]].filter(([e, n]) => (r.release?.depositAt(e, n) ?? 0) > 10).length;
  truthy('Emisión de 10 días con viento que rota: más de 10 kBq/m² a 100 km en al menos 3 direcciones', dirs >= 3, `(${dirs})`);
  const a37 = r.fallout.find((f) => /≥ 37 /.test(f.label))?.areaKm2 ?? NaN;
  range('Área contaminada con viento horario (≥ 37 kBq/m², km²)', a37, 50000, 500000, 'UNSCEAR 2000: ≈ 200 000 km²');
}

// ───────────────────────────────────────────────────────── ¿estoy a salvo?
section('«¿Estoy a salvo?»');
{
  const o = localOffset(40, -3, 40, -2);
  check('Distancia de 1° de longitud a 40° N (km)', o.d / 1000, 85.2, 0.01, 'geodesia');
  check('Rumbo hacia el este (°)', o.bearing, 90, 0.01, 'geodesia');
  const h = run(nuke(15, 'custom', { heightM: 600, fission: 1 }), [34.3853, 132.4553]);
  const near = assessPoint(h, 34.3853, 132.4553, 34.3943, 132.4553); // 1 km al norte
  truthy('Hiroshima a 1 km: peligro extremo o grave', near.level === 'extremo' || near.level === 'grave', `(${near.level})`);
  range('Hiroshima a 1 km: probabilidad de morir', near.pDeath, 0.4, 1, 'RERF: mortalidad > 50 % a 1 km');
  truthy('Hiroshima a 1 km: la onda llega en unos segundos', (near.shockS ?? 0) > 0.5 && (near.shockS ?? 99) < 6, `(${near.shockS} s)`);
  const far = assessPoint(h, 34.3853, 132.4553, 35.68, 139.69); // Tokio
  truthy('Hiroshima vista desde Tokio: fuera del alcance', far.level === 'fuera', `(${far.level})`);
  const m = run(nuke(1000, 'surface'));
  const dw = assessPoint(m, MADRID[0], MADRID[1], MADRID[0], MADRID[1] + 0.6); // ≈ 50 km al este, a sotavento
  truthy('1 Mt en superficie, 50 km a sotavento: aviso de lluvia radiactiva con hora de llegada', dw.falloutH != null && dw.items.some((i) => /Lluvia radiactiva/.test(i.label)), `(${dw.falloutH})`);
  truthy('…y recomienda refugiarse', dw.advice.some((a) => /sótano|refugi/.test(a)));
}

// ───────────────────────────────────────────────────────── misiles
section('Trayectoria de misiles');
{
  const d = greatCircleKm(54.03, 35.78, 38.9, -77.04); // Kozelsk → Washington
  check('Distancia Kozelsk–Washington (km)', d, 7840, 0.03, 'ortodrómica');
  check('Tiempo de vuelo de un ICBM a 10 000 km (min)', ballistic(10000).flightMin, 30, 0.1, 'Wright 2017: ≈ 30 min');
  range('Tiempo de vuelo a 1000 km (min)', ballistic(1000).flightMin, 7, 12, 'Wright 2017: ≈ 9–10 min');
  range('Apogeo a 10 000 km (km)', ballistic(10000).apogeeKm, 1000, 1400, 'trayectoria de energía mínima: ≈ 1200 km');
  const p = greatCirclePath(40, -3, 40.7, -74, 50);
  truthy('El arco empieza y acaba en los extremos', Math.abs(p[0][1] - 40) < 1e-6 && Math.abs(p[50][1] - 40.7) < 1e-6 && Math.abs(p[50][0] + 74) < 1e-6);
  truthy('El arco Madrid–Nueva York sube hacia el norte', Math.max(...p.map((x) => x[1])) > 45);
}

// ───────────────────────────────────────────────────────── relieve
section('Sombra del relieve');
{
  // llanura con una cordillera de 600 m entre 3 y 4 km al este de la zona cero
  const cos = Math.cos((40 * Math.PI) / 180);
  const ridge = (la: number, lo: number) => { const e = (lo + 3) * 111320 * cos; return e > 3000 && e < 4000 ? 600 : 0; };
  const s = computeTerrainShadow(ridge, 40, -3, 300, 10000)!;
  truthy('Detrás de la cordillera hay sombra', s.areaKm2 > 5, `(${fmt(s.areaKm2)} km²)`);
  range('Fracción del área a la sombra', s.frac, 0.03, 0.4, 'geometría: sólo el sector este, detrás de la cresta');
  const flat = computeTerrainShadow(() => 0, 40, -3, 300, 10000)!;
  truthy('En una llanura no hay sombra', flat.areaKm2 === 0);
  const high = computeTerrainShadow(ridge, 40, -3, 20000, 10000)!;
  truthy('Una explosión muy alta apenas deja sombra', high.areaKm2 < s.areaKm2 * 0.3, `(${fmt(high.areaKm2)} frente a ${fmt(s.areaKm2)} km²)`);
}

// ───────────────────────────────────────────────────────── presas y tormentas solares
section('Rotura de presa');
{
  // valle en V que baja hacia el sur (1 m cada 500 m) con laderas del 3 %
  const cos = Math.cos((40 * Math.PI) / 180);
  const valley = (la: number, lo: number) => { const n = (la - 40) * 110570, e = (lo + 3) * 111320 * cos; return 300 + n * 0.002 + Math.abs(e) * 0.03 + (n > 0 ? 500 : 0); };
  const dam = run({ kind: 'dam', name: 'prueba', volumeHm3: 500, heightM: 90, dem: valley } as Scenario, [40, -3]);
  truthy('Con relieve: se calcula la inundación', !!dam.dam?.demOk && (dam.dam?.floodKm2 ?? 0) > 5, `(${fmt(dam.dam?.floodKm2 ?? NaN)} km²)`);
  truthy('El agua baja por el valle (aguas abajo, al sur)', (dam.dam?.depthAt(0, -10000) ?? 0) > (dam.dam?.depthAt(0, 10000) ?? 0));
  truthy('La ola llega más tarde lejos de la presa', (dam.dam?.arrivalAt(0, -20000) ?? 99) > (dam.dam?.arrivalAt(0, -3000) ?? 0));
  range('Caudal punta de una presa de 93 m con 360 hm³ (m³/s)', run({ kind: 'dam', name: 'Teton', volumeHm3: 356, heightM: 93 } as Scenario).dam?.peakM3s ?? NaN, 30000, 120000, 'Teton 1976: ≈ 65 000 m³/s');
}
section('Tormenta solar');
{
  range('Latitud geomagnética de Madrid (°)', geomagLat(40.42, -3.7), 40, 46, 'IGRF: ≈ 43°');
  range('Latitud geomagnética de Ottawa (°)', geomagLat(45.42, -75.7), 52, 58, 'IGRF: ≈ 55°');
  range('Borde de las auroras en marzo de 1989 (Dst −589 nT)', auroraBoundary(-589), 38, 45, 'auroras vistas hasta Texas y el sur de Europa');
  range('Borde de las auroras en 1859 (Dst ≈ −1200 nT)', auroraBoundary(-1200), 20, 32, 'auroras vistas en Cuba y Hawái');
  const s = run({ kind: 'solar', name: 'Carrington', dstNt: -1200 } as Scenario);
  truthy('Carrington: población bajo riesgo alto > 300 millones (ciudades de la base)', (s.solar?.popHighRisk ?? 0) > 3e8, `(${fmt(s.solar?.popHighRisk ?? NaN)})`);
}

section('Guerra nuclear e invierno nuclear');
{
  const w = run({ kind: 'war', name: 'x', preset: 'usru-150' } as Scenario);
  check('EE. UU.–Rusia: muertes por hambre (millones)', w.war?.famineDeathsM ?? NaN, 5341, 0.001, 'Xia et al. 2022, tabla 1');
  check('India–Pakistán 5 Tg: muertes directas (millones)', run({ kind: 'war', name: 'x', preset: 'inpk-5' } as Scenario).war?.directDeathsM ?? NaN, 27, 0.001, 'Xia et al. 2022');
  const s = climateSeries(WAR_PRESETS.find((p) => p.id === 'usru-150')!);
  const peak = s.reduce((a, b) => (b.dT < a.dT ? b : a));
  range('Año del enfriamiento máximo', peak.t, 1, 3, 'Coupe et al. 2019: máximo en el 2.º–3.er año');
  check('Enfriamiento máximo con 150 Tg (°C)', -peak.dT, 9, 0.12, 'Coupe et al. 2019: ≈ 9 °C');
  truthy('Diez años después sigue haciendo frío (> 2 °C)', (s.find((x) => Math.abs(x.t - 10) < 0.05)?.dT ?? 0) < -2);
  const bySoot = [...WAR_PRESETS].sort((a, b) => a.sootTg - b.sootTg);
  truthy('Más hollín, más hambre (en todos los escenarios)', bySoot.every((p, i, a) => i === 0 || p.famineDeathsM >= a[i - 1].famineDeathsM));
  for (const p of WAR_PRESETS) {
    const ms = warSchedule(p, p.first ?? 0);
    truthy(`${p.id}: un misil por objetivo y cada uno llega después de salir`, ms.length === p.hit[0].length + p.hit[1].length && ms.every((m) => m.tImpact > m.tLaunch + 200));
    truthy(`${p.id}: cada bando ataca el territorio del otro`, ms.every((m) => p.hit[1 - m.side].some((t) => t[0] === m.to[0] && t[1] === m.to[1])));
  }
  const us = warSchedule(WAR_PRESETS.find((p) => p.id === 'usru-150')!, 0);
  const firstHit = Math.min(...us.filter((m) => m.side === 0).map((m) => m.tImpact));
  truthy('EE. UU.–Rusia: la respuesta sale antes de que lleguen las primeras ojivas', us.some((m) => m.side === 1 && m.tLaunch < firstHit));
}


section('Mapas de calor');
{
  const fx = computeEffects({ kind: 'nuclear', name: 'x', yieldKt: 300, fission: 0.5, burst: 'surface', heightM: 0 } as Scenario, ENV, MADRID[0], MADRID[1]);
  const st = [{ fx, lat: MADRID[0], lon: MADRID[1] }];
  const d = heatGrid('deaths', st)!;
  const ref = combinedCasualties(st).deaths;
  check('Víctimas: la suma del mapa coincide con el recuento combinado', d.total, ref, 0.08, 'misma malla y modelo');
  const p = heatGrid('pop', st)!;
  truthy('Población: el máximo está en la ciudad (> 2000 hab/km²)', p.max > 2000, `(${fmt(p.max)})`);
  truthy('Víctimas < población de la zona', d.total < p.total, `(${fmt(d.total)} < ${fmt(p.total)})`);
  const f = heatGrid('fallout', st);
  truthy('Lluvia radiactiva: hay muertes a sotavento sin refugio', !!f && f.total > 0, `(${fmt(f?.total ?? NaN)})`);
  check('Lluvia radiactiva: el mapa coincide con la estimación del resumen (sin refugio)', f?.total ?? NaN, fx.longTerm?.falloutDeathsNoShelter ?? NaN, 0.25, 'mismo modelo de dosis, mallas distintas');
  // el viento sopla del oeste: la lluvia radiactiva cae al este de la zona cero
  truthy('Lluvia radiactiva: la malla se extiende hacia el este', !!f && (f.east - MADRID[1]) > (MADRID[1] - f.west));
  truthy('Sin explosión: población alrededor de un punto', (heatGrid('pop', [], { lat: MADRID[0], lon: MADRID[1], radiusKm: 30 })?.total ?? 0) > 1e6);
  truthy('Sin explosión no hay mapa de víctimas', heatGrid('deaths', []) === null);
}


section('Vuelo del arma');
{
  const koz = { lat: 54.03, lon: 35.78 };
  const mad = [{ lat: 40.4168, lon: -3.7038 }];
  const b = planFlight('ballistic', koz, mad), g = planFlight('hgv', koz, mad), c = planFlight('cruise', koz, mad);
  range('Kozelsk–Madrid: tiempo de vuelo balístico (min)', b.flightMin, 15, 20, 'Wright 2017: ≈ 17 min para 3.300 km');
  truthy('El planeador hipersónico llega antes que el arco balístico', g.flightMin < b.flightMin, `(${g.flightMin.toFixed(1)} < ${b.flightMin.toFixed(1)} min)`);
  range('Altura de planeo del Avangard (km)', g.cruiseKm ?? NaN, 30, 80, 'planeo en la alta atmósfera, no a ras de suelo');
  range('Misil de crucero: horas de vuelo', c.flightMin / 60, 3, 5, 'subsónico, ≈ 850 km/h');
  truthy('Avangard se reconoce como planeador', profileFor('Avangard (Rusia)') === 'hgv');
  truthy('Kh-102 se reconoce como misil de crucero', profileFor('Kh-102 (Rusia)') === 'cruise');
  truthy('W88 vuela en misil balístico', profileFor('W88 (EE. UU.)') === 'ballistic');
  const mv = planFlight('ballistic', koz, [{ lat: 40.42, lon: -3.7 }, { lat: 41.39, lon: 2.17 }, { lat: 39.47, lon: -0.38 }]);
  truthy('Tres ciudades españolas: un solo misil con tres ojivas', mv.mirv === 3 && mv.legs.length === 4, `(mirv ${mv.mirv}, tramos ${mv.legs.length})`);
  const far = planFlight('ballistic', koz, [{ lat: 40.42, lon: -3.7 }, { lat: 40.71, lon: -74 }]);
  truthy('Madrid y Nueva York: un misil por objetivo', !far.mirv && far.legs.length === 2);
  const end = legAt(b.legs[0], 1)!;
  truthy('La trayectoria termina en el objetivo', Math.abs(end.p[1] - 40.4168) < 0.05 && Math.abs(((end.p[0] + 540) % 360) - 180 + 3.7038) < 0.05, `(${end.p[1].toFixed(3)}, ${end.p[0].toFixed(3)})`);
}

// ───────────────────────────────────────────────────────── formato
section('Formato de cifras');
truthy('fmtDist(850) = 850 m', fmtDist(850) === '850 m', `→ ${fmtDist(850)}`);
truthy('fmtDist(2850) = 2,85 km', fmtDist(2850) === '2,85 km', `→ ${fmtDist(2850)}`);
truthy('fmtEnergy(15) contiene «kt»', /kt/.test(fmtEnergy(15)), `→ ${fmtEnergy(15)}`);
truthy('fmtEnergy(50000) contiene «Mt»', /Mt/.test(fmtEnergy(50000)), `→ ${fmtEnergy(50000)}`);

console.log(`\n${pass} correctas, ${fail} fallidas`);
if (fail) { console.log('\nFallos:\n' + failures.map((f) => '  · ' + f).join('\n')); (globalThis as unknown as { process: { exit(c: number): void } }).process.exit(1); }


section('Historia de las pruebas nucleares');
{
  const H = (await import('../src/data/tests-history.json')).default as unknown as { regions: string[]; tests: [number, number, number, number, number, number, number, string, number][] };
  truthy('2057 explosiones (SIPRI 1945–1998 y Corea del Norte)', H.tests.length === 2057);
  truthy('ordenadas por fecha', H.tests.every((t, i, a) => i === 0 || t[0] >= a[i - 1][0]));
  truthy('todas con coordenadas válidas y zona conocida', H.tests.every((t) => Math.abs(t[2]) <= 90 && Math.abs(t[3]) <= 180 && !(t[2] === 0 && t[3] === 0) && H.regions[t[8]] !== undefined));
  const by = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const t of H.tests) by[t[1]]++;
  truthy('por países: EE. UU. 1032, URSS 714, Reino Unido 45, Francia 210, China 45, India 3, Pakistán 2, Corea del Norte 6', by.join() === '1032,714,45,210,45,3,2,6');
  truthy('Trinity es la primera y Hiroshima y Nagasaki van después', H.tests[0][7] === 'Trinity' && H.tests[1][5] === 4 && H.tests[2][5] === 4);
}
