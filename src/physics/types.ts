export type BurstMode = 'surface' | 'optimal' | 'custom' | 'underground' | 'underwater';
export type TargetType = 'sediment' | 'rock' | 'water' | 'ice';

export interface NuclearInput {
  kind: 'nuclear';
  name: string;
  yieldKt: number;
  /** fracción de fisión 0..1 (afecta a la lluvia radiactiva) */
  fission: number;
  burst: BurstMode;
  heightM: number;
  /** profundidad (m) en explosiones subterráneas o submarinas */
  depthM?: number;
  /** profundidad del fondo marino (m) en explosiones submarinas */
  seaDepthM?: number;
  /** explosivo químico (convencional o accidental): sin radiación ni lluvia radiactiva */
  chemical?: boolean;
}

export interface AsteroidInput {
  kind: 'asteroid';
  name: string;
  diameterM: number;
  densityKgM3: number;
  velocityKms: number;
  angleDeg: number;
  target: TargetType;
  waterDepthM: number;
}

export type Isotope = 'Cs-137' | 'I-131' | 'Co-60' | 'Sr-90' | 'Am-241';

/** liberación radiactiva: accidente de un reactor o bomba sucia */
export interface ReleaseInput {
  kind: 'release';
  name: string;
  source: 'reactor' | 'dirtybomb';
  isotope: Isotope;
  /** actividad total (TBq) */
  activityTBq: number;
  /** altura de la emisión (m) */
  heightM: number;
  /** duración de la emisión (h) */
  durationH?: number;
  /** explosivo de la bomba sucia (kg de TNT) */
  explosiveKg?: number;
}

/** erupción volcánica explosiva */
export interface VolcanoInput {
  kind: 'volcano';
  name: string;
  /** índice de explosividad volcánica 4..8 */
  vei: number;
  volumeMul?: number;
}

export type Scenario = NuclearInput | AsteroidInput | ReleaseInput | VolcanoInput;

export interface Environment {
  /** dirección DESDE la que sopla el viento, grados (0 = norte) */
  windFromDeg: number;
  windKmh: number;
  /** visibilidad atmosférica (km) */
  visibilityKm: number;
  /** humedad relativa 0..100 */
  humidity: number;
  /** hora local 0..24 */
  hour: number;
  /** % de población al aire libre (null = automático según la hora) */
  outdoorPct?: number | null;
  /** precipitación (mm/h) — con lluvia la lluvia radiactiva se concentra cerca */
  rainMmH?: number;
  /** perfil vertical de viento (tiempo real); si falta, el viento es uniforme en altura */
  windProfile?: WindLevel[] | null;
}

export interface WindLevel {
  /** altura aproximada sobre el suelo (m) */
  zM: number;
  /** dirección DESDE la que sopla (°) */
  fromDeg: number;
  kmh: number;
}

export type EffectGroup = 'fireball' | 'blast' | 'thermal' | 'radiation' | 'crater' | 'seismic' | 'emp' | 'ejecta' | 'tsunami' | 'surge' | 'fire';

export interface Ring {
  id: string;
  group: EffectGroup;
  label: string;
  /** radio en suelo (m) */
  radiusM: number;
  color: string;
  desc: string;
  /** valor físico mostrado (p.ej. "5 psi") */
  value?: string;
  /** dibujar como cúpula 3D */
  dome?: boolean;
  /** el efecto alcanza (o supera) todo el planeta */
  global?: boolean;
}

export interface FalloutContour {
  level: number; // rad/h a H+1
  label: string;
  color: string;
  /** polígonos en coordenadas locales (m): x = este, y = norte */
  polygons: [number, number][][][];
  areaKm2: number;
  maxDownwindKm: number;
}

export interface Casualties {
  deaths: number;
  injuries: number;
  exposed: number;
  cityName?: string;
  /** perfil acumulado desde la zona cero: radio (m) → población, muertos y heridos dentro */
  profile: { r: number[]; pop: number[]; deaths: number[]; inj: number[]; burns: number[] };
}

export interface AsteroidInfo {
  massKg: number;
  energyJ: number;
  breakupAltM: number | null;
  airburstAltM: number | null;
  impactVelocityKms: number;
  impactEnergyKt: number;
  recurrenceYears: number;
  fate: 'intact' | 'airburst' | 'fragmented-impact';
}

export interface Effects {
  scenario: Scenario;
  energyKt: number;
  energyJ: number;
  /** altura de la liberación de energía (m) */
  burstHeightM: number;
  groundContact: number; // 0..1, cuánto toca la bola de fuego el suelo
  fireball: { radiusM: number; tMaxS: number; durationS: number; visible: boolean };
  cloud: { topM: number; capBottomM: number; capRadiusM: number; stemRadiusM: number; riseTimeS: number };
  rings: Ring[];
  crater?: { diameterM: number; depthM: number; transientM: number; type: 'simple' | 'complex' | 'water' };
  fallout: FalloutContour[];
  seismic: { magnitude: number; rings: Ring[] } | null;
  tsunami?: { rimWaveM: number; at1000kmM: number; transientM: number; depthM: number };
  shock: { r: number[]; t: number[] };
  casualties: Casualties;
  asteroid?: AsteroidInfo;
  notes: string[];
  thermalFluenceAt: (groundM: number) => number;
  pressurePsiAt: (groundM: number) => number;
  doseRemAt: (groundM: number) => number;
  /** tasa de dosis de la lluvia radiactiva a H+1 (R/h) en un punto (m este, m norte) */
  falloutRateAt: (eM: number, nM: number) => number;
  /** viento usado para la lluvia radiactiva */
  windKmh: number;
  windFromDeg: number;
  chemical: boolean;
  /** % de población al aire libre usado en las víctimas */
  outdoorPct: number;
  /** entorno usado en el cálculo */
  env: Environment;
  /** explosión enterrada o submarina */
  buried?: { mode: 'underground' | 'underwater'; depthM: number; scaledDepth: number; contained: boolean; airFrac: number; columnM?: number; surgeR?: number };
  /** pulso electromagnético de gran altitud: campo pico (kV/m) en función de la distancia y el rumbo */
  emp?: { heightM: number; horizonM: number; peakKVm: number; fieldAt: (groundM: number, bearingDeg: number) => number; latSign: number };
  /** incendios: tormenta de fuego o incendio que avanza con el viento */
  fires?: { kind: 'firestorm' | 'conflagration' | 'none'; ignitionR: number; spreadKmh: number; areaAt: (h: number) => number; reason: string };
  /** efectos a largo plazo (estimaciones) */
  longTerm?: { falloutDeathsNoShelter: number; falloutDeathsShelter: number; cancerDeaths: number; collectiveSv: number; popInFallout: number; thyroidNote: string };
  /** funciones de la lluvia radiactiva: dosis acumulada (rem) en un punto entre ta y t (h) con un factor de protección */
  falloutDoseAt?: (eM: number, nM: number, tStartH: number, tEndH: number, pf: number) => number;
  /** sin destello ni bola de fuego (liberaciones, volcanes) */
  noFlash?: boolean;
  release?: { isotope: Isotope; isoName: string; activityBq: number; popZone: number; popAny: number; collectiveSv: number; cancerDeaths: number; depositAt: (eM: number, nM: number) => number; nSvhPerkBq: number; name: string };
  volcano?: { vei: number; volumeKm3: number; columnM: number; pdcR: number; coolingC: number; ashAt: (eM: number, nM: number) => number; T0: number };
  /** fuente de los datos de población (si se usó población real) */
  popSource?: string;
  /** hora de llegada (h) de la lluvia radiactiva a un punto */
  falloutArrivalH?: (eM: number, nM: number) => number;
}
