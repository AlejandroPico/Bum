import type { NuclearInput, AsteroidInput } from '../physics/types';

/** Rendimientos según fuentes públicas (estimaciones redondeadas). */
export const NUKE_PRESETS: { group: string; items: (Omit<NuclearInput, 'kind'> & { note: string })[] }[] = [
  {
    group: 'Históricas',
    items: [
      { name: 'Trinity (1945)', yieldKt: 21, fission: 1, burst: 'custom', heightM: 30, note: 'Primera prueba nuclear, Nuevo México.' },
      { name: 'Little Boy — Hiroshima', yieldKt: 15, fission: 1, burst: 'custom', heightM: 580, note: 'Bomba de uranio lanzada el 6 de agosto de 1945.' },
      { name: 'Fat Man — Nagasaki', yieldKt: 21, fission: 1, burst: 'custom', heightM: 503, note: 'Bomba de plutonio lanzada el 9 de agosto de 1945.' },
      { name: 'Ivy Mike (1952)', yieldKt: 10400, fission: 0.77, burst: 'surface', heightM: 0, note: 'Primera bomba termonuclear (EE. UU.).' },
      { name: 'Castle Bravo (1954)', yieldKt: 15000, fission: 0.67, burst: 'surface', heightM: 0, note: 'Mayor prueba de EE. UU.; grave contaminación en las Islas Marshall.' },
      { name: 'Tsar Bomba (1961)', yieldKt: 50000, fission: 0.03, burst: 'custom', heightM: 4000, note: 'La mayor explosión de la historia (URSS).' },
      { name: 'Starfish Prime (1962)', yieldKt: 1400, fission: 0.5, burst: 'custom', heightM: 400000, note: 'Explosión espacial: EMP sobre Hawái a 1400 km.' },
    ],
  },
  {
    group: 'Arsenales actuales (estimaciones públicas)',
    items: [
      { name: 'Davy Crockett (20 t)', yieldKt: 0.02, fission: 1, burst: 'surface', heightM: 0, note: 'Arma táctica portátil de los años 60.' },
      { name: 'W76-2 (≈ 8 kt)', yieldKt: 8, fission: 1, burst: 'optimal', heightM: 0, note: 'Ojiva de bajo rendimiento para misiles Trident.' },
      { name: 'B61-12 (máx. 50 kt)', yieldKt: 50, fission: 0.5, burst: 'optimal', heightM: 0, note: 'Bomba gravitatoria de rendimiento variable.' },
      { name: 'W76-1 (90 kt)', yieldKt: 90, fission: 0.5, burst: 'optimal', heightM: 0, note: 'Ojiva principal de los SLBM Trident II.' },
      { name: 'DF-41 (≈ 250 kt)', yieldKt: 250, fission: 0.5, burst: 'optimal', heightM: 0, note: 'ICBM chino; ojiva estimada.' },
      { name: 'W87 (300 kt)', yieldKt: 300, fission: 0.5, burst: 'optimal', heightM: 0, note: 'Ojiva del ICBM Minuteman III.' },
      { name: 'W88 (475 kt)', yieldKt: 475, fission: 0.5, burst: 'optimal', heightM: 0, note: 'Ojiva de alto rendimiento del Trident II.' },
      { name: 'RS-28 Sarmat (≈ 750 kt por ojiva)', yieldKt: 750, fission: 0.5, burst: 'optimal', heightM: 0, note: 'ICBM pesado ruso; cifra estimada.' },
      { name: 'B83 (1,2 Mt)', yieldKt: 1200, fission: 0.5, burst: 'optimal', heightM: 0, note: 'Mayor arma del arsenal de EE. UU.' },
      { name: 'DF-5 (≈ 4 Mt)', yieldKt: 4000, fission: 0.5, burst: 'optimal', heightM: 0, note: 'ICBM chino de ojiva única.' },
      { name: 'R-36M (20 Mt)', yieldKt: 20000, fission: 0.5, burst: 'optimal', heightM: 0, note: 'Variante de ojiva única de la Guerra Fría ("Satan").' },
    ],
  },
];

export const ASTEROID_PRESETS: (Omit<AsteroidInput, 'kind'> & { note: string })[] = [
  { name: 'Cheliábinsk (2013)', diameterM: 19, densityKgM3: 3300, velocityKms: 19, angleDeg: 18, target: 'sediment', waterDepthM: 0, note: 'Estalló sobre Rusia; ~1500 heridos por cristales.' },
  { name: 'Tunguska (1908)', diameterM: 60, densityKgM3: 3000, velocityKms: 15, angleDeg: 35, target: 'sediment', waterDepthM: 0, note: 'Arrasó 2000 km² de bosque en Siberia.' },
  { name: 'Cráter Barringer (50 000 a. C.)', diameterM: 50, densityKgM3: 7800, velocityKms: 12.8, angleDeg: 45, target: 'sediment', waterDepthM: 0, note: 'Meteorito metálico que creó el cráter de Arizona.' },
  { name: 'Apophis (hipotético)', diameterM: 370, densityKgM3: 3000, velocityKms: 12.6, angleDeg: 45, target: 'rock', waterDepthM: 0, note: 'Pasará a 32 000 km de la Tierra en 2029. Aquí, si impactara.' },
  { name: 'Bennu (hipotético)', diameterM: 490, densityKgM3: 1190, velocityKms: 12.7, angleDeg: 45, target: 'rock', waterDepthM: 0, note: 'Asteroide de escombros visitado por OSIRIS-REx.' },
  { name: 'Asteroide de 1 km', diameterM: 1000, densityKgM3: 3000, velocityKms: 20, angleDeg: 45, target: 'rock', waterDepthM: 0, note: 'Catástrofe regional con efectos climáticos globales.' },
  { name: 'Cometa de 5 km', diameterM: 5000, densityKgM3: 600, velocityKms: 50, angleDeg: 40, target: 'rock', waterDepthM: 0, note: 'Núcleo de hielo y polvo a gran velocidad.' },
  { name: 'Chicxulub (extinción K-Pg)', diameterM: 10000, densityKgM3: 2700, velocityKms: 20, angleDeg: 60, target: 'water', waterDepthM: 200, note: 'Acabó con los dinosaurios hace 66 millones de años.' },
];

export const COMPOSITIONS = [
  { name: 'Hielo (cometa)', density: 1000 },
  { name: 'Roca porosa', density: 1500 },
  { name: 'Roca densa', density: 3000 },
  { name: 'Hierro', density: 7800 },
];

export const QUICK_TARGETS: { name: string; lat: number; lon: number }[] = [
  { name: 'Madrid', lat: 40.4168, lon: -3.7038 },
  { name: 'Barcelona', lat: 41.3874, lon: 2.1686 },
  { name: 'Nueva York', lat: 40.758, lon: -73.9855 },
  { name: 'Londres', lat: 51.5072, lon: -0.1276 },
  { name: 'París', lat: 48.8584, lon: 2.2945 },
  { name: 'Tokio', lat: 35.6762, lon: 139.6503 },
  { name: 'Hiroshima', lat: 34.3955, lon: 132.4536 },
  { name: 'Moscú', lat: 55.7539, lon: 37.6208 },
];
