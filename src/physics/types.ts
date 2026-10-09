export type BurstMode = 'surface' | 'optimal' | 'custom';
export type TargetType = 'sediment' | 'rock' | 'water';

export interface NuclearInput {
  kind: 'nuclear';
  name: string;
  yieldKt: number;
  /** fracción de fisión 0..1 (afecta a la lluvia radiactiva) */
  fission: number;
  burst: BurstMode;
  heightM: number;
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

export type Scenario = NuclearInput | AsteroidInput;

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
}

export type EffectGroup = 'fireball' | 'blast' | 'thermal' | 'radiation' | 'crater' | 'seismic' | 'emp' | 'ejecta' | 'tsunami';

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
}
