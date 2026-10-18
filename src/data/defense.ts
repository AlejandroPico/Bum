/**
 * Defensa antimisiles: qué sistemas protegen la zona del objetivo, en qué capa actúan y con qué
 * probabilidad derriban cada ojiva. Las capas se suceden: el curso medio en el espacio (GMD), la
 * capa alta exoatmosférica (SM-3, Arrow 3), la alta endoatmosférica (THAAD, Arrow 2) y la terminal
 * (Patriot, SAMP/T, A-135). Cada capa lanza una salva de interceptores contra cada ojiva y tiene un
 * número limitado: con muchas ojivas, la defensa se satura y las demás pasan sin oposición.
 *
 * Las probabilidades son de divulgación, a partir del historial de pruebas publicado y de los
 * análisis independientes (MDA, GAO, CSIS Missile Defense Project, UCS «Shielded from Oversight»,
 * Wilkening 2000). En combate real, con señuelos, maniobras y ataques por sorpresa, serían menores.
 */
import { greatCircleKm, greatCirclePath } from './launch';
import { legAt, type FlightPlan, type FlightProfile } from './flight';

type Layer = 'mid' | 'exo' | 'endo' | 'term';
export const LAYER_NAMES: Record<Layer, string> = {
  mid: 'Curso medio (en el espacio)',
  exo: 'Capa alta (fuera de la atmósfera)',
  endo: 'Capa alta (dentro de la atmósfera)',
  term: 'Defensa terminal',
};

interface System {
  id: string;
  name: string;
  layer: Layer;
  /** bases [lat, lon, nombre]; vacío: baterías junto a la ciudad (defensa de punto) */
  sites: [number, number, string][];
  /** radio (km) que protege cada base */
  coverKm: number;
  /** probabilidad de derribo de un interceptor contra un misil balístico ideal */
  pk: number;
  /** interceptores por ojiva y en total */
  salvo: number;
  inventory: number;
  /** alcances del misil atacante (km) contra los que está diseñado */
  rangeKm: [number, number];
  /** velocidad del interceptor (km/s), para la animación */
  speedKms: number;
  /** probabilidad contra misiles de crucero y aviones (0: no puede) */
  pkAir?: number;
  note: string;
}

const PATRIOT: System = { id: 'pac3', name: 'Patriot PAC-3 / SAMP/T', layer: 'term', sites: [], coverKm: 0, pk: 0.6, salvo: 2, inventory: 16, rangeKm: [0, 1500], speedKms: 1.7, pkAir: 0.65, note: 'Baterías de defensa de punto: protegen unas decenas de kilómetros alrededor. Han derribado misiles balísticos de corto alcance en Ucrania e Israel.' };

interface Region { id: string; name: string; test: (la: number, lo: number) => boolean; systems: System[] }
const box = (la: number, lo: number, s: number, w: number, n: number, e: number) => la >= s && la <= n && lo >= w && lo <= e;
const near = (la: number, lo: number, cla: number, clo: number, km: number) => greatCircleKm(la, lo, cla, clo) <= km;

const REGIONS: Region[] = [
  { id: 'moscow', name: 'Moscú', test: (la, lo) => near(la, lo, 55.75, 37.62, 170), systems: [
    { id: 'a135', name: 'A-135 / A-235 (interceptores 53T6)', layer: 'term', sites: [[56.17, 37.9, 'Sofrino'], [55.42, 37.1, 'Naro-Fominsk'], [56.0, 38.5, 'Sergiev Posad']], coverKm: 160, pk: 0.5, salvo: 2, inventory: 68, rangeKm: [500, 20000], speedKms: 4, note: 'El único escudo de una capital contra misiles intercontinentales; los interceptores originales llevaban carga nuclear.' },
    { id: 's400', name: 'S-400 / S-500', layer: 'term', sites: [], coverKm: 0, pk: 0.3, salvo: 2, inventory: 24, rangeKm: [0, 3000], speedKms: 2, pkAir: 0.65, note: 'Defensa aérea de largo alcance alrededor de la ciudad.' },
  ] },
  { id: 'il', name: 'Israel', test: (la, lo) => box(la, lo, 29.4, 34.2, 33.4, 35.9), systems: [
    { id: 'arrow3', name: 'Arrow 3', layer: 'exo', sites: [[31.8, 34.9, 'Tal Shahar']], coverKm: 900, pk: 0.7, salvo: 2, inventory: 30, rangeKm: [500, 6000], speedKms: 3, note: 'Interceptor fuera de la atmósfera; derribó la mayoría de los misiles iraníes de 2024 y 2025.' },
    { id: 'thaad-il', name: 'THAAD (EE. UU.)', layer: 'endo', sites: [[31.2, 35.0, 'Négev']], coverKm: 250, pk: 0.75, salvo: 2, inventory: 48, rangeKm: [200, 3500], speedKms: 2.8, note: 'Batería estadounidense desplegada en 2024.' },
    { id: 'arrow2', name: 'Arrow 2', layer: 'endo', sites: [[31.9, 34.7, 'Palmachim']], coverKm: 300, pk: 0.7, salvo: 2, inventory: 50, rangeKm: [300, 3000], speedKms: 2.5, note: 'Interceptor en la alta atmósfera, con carga de fragmentación.' },
    { id: 'sling', name: 'Honda de David', layer: 'term', sites: [], coverKm: 0, pk: 0.5, salvo: 2, inventory: 24, rangeKm: [0, 400], speedKms: 2, pkAir: 0.75, note: 'Contra misiles de corto alcance, de crucero y aviones.' },
  ] },
  { id: 'kr', name: 'Corea del Sur', test: (la, lo) => box(la, lo, 33, 124.5, 38.4, 129.7) && (la < 37.9 || lo > 127.4), systems: [
    { id: 'thaad-kr', name: 'THAAD', layer: 'endo', sites: [[35.94, 128.13, 'Seongju']], coverKm: 230, pk: 0.75, salvo: 2, inventory: 48, rangeKm: [200, 3500], speedKms: 2.8, note: 'Una batería estadounidense: protege el sur del país, no Seúl.' },
    { ...PATRIOT, name: 'Patriot PAC-3 / Cheongung II', inventory: 24 },
  ] },
  { id: 'jp', name: 'Japón', test: (la, lo) => box(la, lo, 24, 122.9, 45.6, 146), systems: [
    { id: 'sm3-jp', name: 'Aegis SM-3 Block IIA (destructores)', layer: 'exo', sites: [[38.5, 135.5, 'Mar de Japón'], [33.5, 131.5, 'Mar de la China Oriental']], coverKm: 1400, pk: 0.55, salvo: 2, inventory: 32, rangeKm: [500, 13000], speedKms: 4.5, note: 'Destructores con radar Aegis; el SM-3 IIA derribó un blanco de tipo ICBM en una prueba de 2020.' },
    { ...PATRIOT, name: 'Patriot PAC-3 MSE' },
  ] },
  { id: 'tw', name: 'Taiwán', test: (la, lo) => box(la, lo, 21.8, 119.9, 25.4, 122.1), systems: [
    { ...PATRIOT, name: 'Patriot PAC-3 / Tien Kung III', inventory: 24, pk: 0.55 },
  ] },
  { id: 'na', name: 'Estados Unidos y Canadá', test: (la, lo) => (box(la, lo, 31.3, -170, 72, -52) || box(la, lo, 24.4, -97.5, 31.3, -79) || box(la, lo, 18.5, -161, 22.5, -154)), systems: [
    { id: 'gmd', name: 'GMD (interceptores GBI)', layer: 'mid', sites: [[63.95, -145.73, 'Fort Greely (Alaska)'], [34.73, -120.57, 'Vandenberg (California)']], coverKm: 12000, pk: 0.55, salvo: 4, inventory: 44, rangeKm: [3000, 20000], speedKms: 7.5, note: '44 interceptores pensados contra un puñado de misiles de Corea del Norte o Irán; han acertado en algo más de la mitad de sus pruebas, siempre preparadas.' },
    { id: 'norad', name: 'NORAD (cazas y NASAMS)', layer: 'term', sites: [], coverKm: 0, pk: 0, salvo: 1, inventory: 12, rangeKm: [0, 0], speedKms: 1, pkAir: 0.4, note: 'Contra misiles de crucero y aviones; ninguna defensa terminal antimisil en las ciudades.' },
  ] },
  { id: 'ua', name: 'Ucrania', test: (la, lo) => box(la, lo, 44.4, 22.1, 52.4, 40.2) && !(la > 51.3 && lo < 32.8 && la > 51.5), systems: [
    { ...PATRIOT, name: 'Patriot PAC-3 / SAMP/T', inventory: 8 },
  ] },
  { id: 'eu', name: 'Europa (OTAN)', test: (la, lo) => (box(la, lo, 35, -25, 71.5, 31) && !box(la, lo, 51.3, 23.2, 56.2, 32.8) && !box(la, lo, 54.3, 19.6, 55.3, 22.9)) || box(la, lo, 36, 26, 42.2, 45), systems: [
    { id: 'sm3-eu', name: 'Aegis Ashore SM-3 Block IB', layer: 'exo', sites: [[44.08, 24.4, 'Deveselu (Rumanía)'], [54.48, 17.1, 'Redzikowo (Polonia)']], coverKm: 2200, pk: 0.45, salvo: 2, inventory: 48, rangeKm: [800, 5500], speedKms: 3.5, note: 'Escudo de la OTAN pensado contra misiles de alcance medio de Oriente Medio; no puede alcanzar los ICBM rusos que vuelan sobre el Ártico.' },
    { id: 'arrow3-de', name: 'Arrow 3 (Alemania)', layer: 'exo', sites: [[51.77, 13.17, 'Holzdorf']], coverKm: 1600, pk: 0.6, salvo: 2, inventory: 24, rangeKm: [500, 6000], speedKms: 3, note: 'Comprado a Israel; en servicio desde finales de 2025.' },
    PATRIOT,
  ] },
  { id: 'gulf', name: 'Golfo Pérsico', test: (la, lo) => box(la, lo, 16, 34.5, 32, 56.5), systems: [
    { id: 'thaad-g', name: 'THAAD', layer: 'endo', sites: [[24.25, 54.55, 'Al Dhafra (EAU)'], [24.7, 46.7, 'Riad']], coverKm: 300, pk: 0.75, salvo: 2, inventory: 48, rangeKm: [200, 3500], speedKms: 2.8, note: 'Baterías de Arabia Saudí y Emiratos.' },
    PATRIOT,
  ] },
  { id: 'delhi', name: 'Nueva Delhi', test: (la, lo) => near(la, lo, 28.61, 77.21, 160), systems: [
    { id: 'pad', name: 'Escudo de Delhi (PAD / AAD)', layer: 'endo', sites: [[28.9, 77.4, 'Delhi']], coverKm: 200, pk: 0.5, salvo: 2, inventory: 16, rangeKm: [300, 2500], speedKms: 3, note: 'Primera fase del escudo indio, pensado contra misiles de Pakistán.' },
    { id: 's400-in', name: 'S-400', layer: 'term', sites: [], coverKm: 0, pk: 0.2, salvo: 2, inventory: 16, rangeKm: [0, 1500], speedKms: 2, pkAir: 0.6, note: 'Defensa aérea de largo alcance.' },
  ] },
  { id: 'ru', name: 'Rusia', test: (la, lo) => (la >= 55 && lo >= 28) || (la >= 52 && lo >= 32 && lo <= 50) || (la >= 50 && lo >= 87) || box(la, lo, 42, 130, 50, 142), systems: [
    { id: 's400-ru', name: 'S-400', layer: 'term', sites: [], coverKm: 0, pk: 0, salvo: 1, inventory: 12, rangeKm: [0, 0], speedKms: 2, pkAir: 0.55, note: 'Sólo contra misiles de crucero y aviones; ninguna defensa antimisil fuera de Moscú.' },
  ] },
  { id: 'cn', name: 'China', test: (la, lo) => box(la, lo, 20, 98, 42.5, 123) || box(la, lo, 35, 73, 49, 98), systems: [
    { id: 'hq9', name: 'HQ-9', layer: 'term', sites: [], coverKm: 0, pk: 0, salvo: 1, inventory: 12, rangeKm: [0, 0], speedKms: 2, pkAir: 0.5, note: 'Defensa aérea contra misiles de crucero y aviones; el escudo antimisil chino (HQ-19) sigue en pruebas.' },
  ] },
];

export interface Attempt {
  system: string;
  layer: Layer;
  site: [number, number, string];
  /** punto [lon, lat] y altura (km) de la intercepción */
  pt: [number, number]; altKm: number;
  /** fracción del vuelo total en que despega el interceptor y en que llega */
  fLaunch: number; fHit: number;
  hit: boolean;
  speedKms: number;
}
export interface DefenseResult {
  region: string | null;
  systems: { name: string; layer: Layer; sites: string[]; note: string; shots: number; kills: number; pk: number; saturated: number }[];
  /** probabilidad de derribo de cada ojiva y si fue derribada */
  perTarget: { p: number; killed: boolean; attempts: Attempt[] }[];
  intercepted: number;
  total: number;
  /** probabilidad media de que pase cada ojiva */
  pThrough: number;
  attempts: Attempt[];
  /** contramedidas del atacante (señuelos) */
  decoys: boolean;
}

/** fracción global del vuelo en que suele actuar cada capa */
const LAYER_F: Record<Layer, number> = { mid: 0.68, exo: 0.8, endo: 0.92, term: 0.975 };

/** probabilidad de derribo por interceptor según el vector y las contramedidas */
function pkFor(S: System, profile: FlightProfile, rangeKm: number, decoys: boolean): number {
  if (profile === 'cruise' || profile === 'aircraft') return S.pkAir ?? 0;
  if (rangeKm < S.rangeKm[0] || rangeKm > S.rangeKm[1]) return 0;
  let pk = S.pk;
  // los señuelos y las ayudas a la penetración engañan sobre todo fuera de la atmósfera
  if (decoys && (S.layer === 'mid' || S.layer === 'exo')) pk *= 0.5;
  // el planeador hipersónico vuela demasiado bajo para las capas exoatmosféricas y maniobra
  if (profile === 'hgv') pk *= S.layer === 'mid' || S.layer === 'exo' ? 0 : S.layer === 'endo' ? 0.3 : 0.4;
  return pk;
}

const DECOY_COUNTRIES = new Set(['Estados Unidos', 'Rusia', 'China', 'Francia', 'Reino Unido']);

/** sistemas que protegen un punto (para la nota de la barra lateral) */
export function defenseAt(lat: number, lon: number): { region: string; systems: string[] } | null {
  const R = REGIONS.find((r) => r.test(lat, lon));
  return R ? { region: R.name, systems: R.systems.map((s) => s.name) } : null;
}

/**
 * Enfrenta el vuelo con las defensas de la zona de cada objetivo. `rand` decide los aciertos (se
 * puede sustituir en las pruebas). Las ojivas derribadas se recortan en el plan de vuelo (el tramo
 * acaba en el punto de intercepción).
 */
export function engage(plan: FlightPlan, launch: { lat: number; lon: number; country: string }, targets: { lat: number; lon: number }[], rand: () => number = Math.random): DefenseResult {
  const decoys = DECOY_COUNTRIES.has(launch.country);
  const flightS = plan.flightMin * 60;
  const left = new Map<string, number>();
  const sysStats = new Map<string, DefenseResult['systems'][number]>();
  const perTarget: DefenseResult['perTarget'] = targets.map(() => ({ p: 0, killed: false, attempts: [] }));
  let regionName: string | null = null;
  // las ojivas se enfrentan por orden de llegada
  const order = targets.map((_, i) => i).sort((a, b) => plan.delays[a] - plan.delays[b]);
  for (const i of order) {
    const T = targets[i];
    const R = REGIONS.find((r) => r.test(T.lat, T.lon));
    if (!R) continue;
    regionName ??= R.name;
    const leg = plan.legs.find((L) => L.target === i);
    if (!leg) continue;
    let pSurv = 1;
    const layers = [...R.systems].sort((a, b) => LAYER_F[a.layer] - LAYER_F[b.layer]);
    let fPrev = 0;
    for (const S of layers) {
      const pk = pkFor(S, plan.profile, plan.rangeKm, decoys);
      // base más cercana que cubra el objetivo (o batería junto a la ciudad)
      let site: [number, number, string] | null = null;
      if (S.sites.length) {
        const best = S.sites.map((s) => ({ s, d: greatCircleKm(s[0], s[1], T.lat, T.lon) })).sort((a, b) => a.d - b.d)[0];
        if (best.d <= S.coverKm) site = best.s;
      } else {
        // a unos 18 km de la ciudad, hacia el lado por el que llega el misil
        const p = greatCirclePath(T.lat, T.lon, launch.lat, launch.lon, 400)[1];
        const k = Math.min(1, 18 / Math.max(1, greatCircleKm(T.lat, T.lon, p[1], p[0])));
        site = [T.lat + (p[1] - T.lat) * k, T.lon + (p[0] - T.lon) * k, ''];
      }
      if (!site) continue;
      const st = sysStats.get(S.id) ?? { name: S.name, layer: S.layer, sites: [...new Set(S.sites.map((s) => s[2]))], note: S.note, shots: 0, kills: 0, pk, saturated: 0 };
      sysStats.set(S.id, st);
      if (pk <= 0) continue;
      const salvo = S.salvo;
      const inv = left.get(S.id) ?? S.inventory;
      if (inv < salvo) { st.saturated++; continue; }
      if (perTarget[i].killed) continue;
      left.set(S.id, inv - salvo);
      st.shots += salvo;
      const pKill = 1 - (1 - pk) ** salvo;
      pSurv *= 1 - pKill;
      const hit = rand() < pKill;
      // punto de intercepción sobre el tramo de esta ojiva
      const fHit = Math.max(fPrev + 0.01, leg.f0 + (leg.f1 - leg.f0) * Math.max(0.12, Math.min(0.985, (LAYER_F[S.layer] - leg.f0) / Math.max(1e-6, 1 - leg.f0))));
      fPrev = fHit;
      const a = legAt(leg, fHit)!;
      const dKm = Math.hypot(greatCircleKm(site[0], site[1], a.p[1], a.p[0]), a.alt);
      const fLaunch = Math.max(plan.boostMin * 60 / flightS + 0.02, fHit - dKm / S.speedKms / flightS);
      perTarget[i].attempts.push({ system: S.name, layer: S.layer, site, pt: a.p, altKm: a.alt, fLaunch, fHit, hit, speedKms: S.speedKms });
      if (hit) { perTarget[i].killed = true; st.kills++; }
    }
    perTarget[i].p = 1 - pSurv;
  }
  // las ojivas derribadas acaban en el punto de intercepción
  perTarget.forEach((r, i) => {
    if (!r.killed) return;
    const fCut = r.attempts[r.attempts.length - 1].fHit;
    const L = plan.legs.find((x) => x.target === i);
    if (!L) return;
    const N = L.pts.length - 1;
    const g = (fCut - L.f0) / (L.f1 - L.f0);
    const n = Math.max(1, Math.round(g * N));
    // mismo ritmo de avance: el tramo acaba antes, en el punto n de la trayectoria
    L.f1 = L.f0 + (L.f1 - L.f0) * (n / N);
    L.pts = L.pts.slice(0, n + 1); L.alt = L.alt.slice(0, n + 1);
    L.killed = true;
    // la intercepción se dibuja donde acaba el tramo
    const last = r.attempts[r.attempts.length - 1];
    last.fHit = L.f1; last.pt = L.pts[n]; last.altKm = L.alt[n];
  });
  const attempts = perTarget.flatMap((r) => r.attempts).sort((a, b) => a.fHit - b.fHit);
  const intercepted = perTarget.filter((r) => r.killed).length;
  return {
    region: regionName,
    systems: [...sysStats.values()],
    perTarget, intercepted, total: targets.length,
    pThrough: perTarget.reduce((s, r) => s + (1 - r.p), 0) / Math.max(1, targets.length),
    attempts, decoys,
  };
}
