import type { NuclearInput, AsteroidInput } from '../physics/types';

type NukePreset = Omit<NuclearInput, 'kind'> & { note: string };

const n = (name: string, yieldKt: number, fission: number, burst: NuclearInput['burst'], heightM: number, note: string): NukePreset =>
  ({ name, yieldKt, fission, burst, heightM, note });
const c = (name: string, yieldKt: number, note: string, heightM = 0): NukePreset =>
  ({ name, yieldKt, fission: 0, burst: heightM ? 'custom' : 'surface', heightM, note, chemical: true });

/**
 * Rendimientos según fuentes públicas (Wikipedia, Nuclear Weapon Archive, FAS / Bulletin of
 * the Atomic Scientists). Las cifras de armas en servicio son estimaciones; donde hay rango se
 * usa el valor máximo publicado. Cada grupo está ordenado de mayor a menor potencia.
 */
const GROUPS: { group: string; items: NukePreset[] }[] = [
  {
    group: 'Pruebas y bombas históricas',
    items: [
      n('Tsar Bomba (URSS, 1961)', 50000, 0.03, 'custom', 4000, 'La mayor explosión jamás provocada. Diseñada para 100 Mt; se probó a la mitad.'),
      n('Prueba 219 (URSS, 1962)', 24200, 0.5, 'custom', 3750, 'Segunda mayor prueba de la historia, sobre Nueva Zembla.'),
      n('Castle Bravo (EE. UU., 1954)', 15000, 0.67, 'surface', 0, 'Mayor prueba de EE. UU.; grave contaminación en las Islas Marshall.'),
      n('Castle Yankee (EE. UU., 1954)', 13500, 0.5, 'surface', 0, 'Segunda mayor prueba estadounidense.'),
      n('Ivy Mike (EE. UU., 1952)', 10400, 0.77, 'surface', 0, 'Primer dispositivo termonuclear (bomba de hidrógeno).'),
      n('Prueba n.º 6 (China, 1967)', 3300, 0.5, 'custom', 2960, 'Primera bomba de hidrógeno china.'),
      n('Canopus (Francia, 1968)', 2600, 0.5, 'custom', 520, 'Primera bomba termonuclear francesa, en Fangataufa.'),
      n('Grapple X (Reino Unido, 1957)', 1800, 0.5, 'custom', 2250, 'Primera bomba termonuclear británica que funcionó como tal.'),
      n('RDS-37 (URSS, 1955)', 1600, 0.5, 'custom', 1550, 'Primera bomba soviética de dos etapas.'),
      n('Starfish Prime (EE. UU., 1962)', 1400, 0.5, 'custom', 400000, 'Explosión espacial: el pulso electromagnético afectó a Hawái a 1400 km.'),
      n('Orange Herald (Reino Unido, 1957)', 720, 1, 'custom', 2300, 'La mayor bomba de fisión probada (fusión potenciada fallida).'),
      n('Hwasong-14 / prueba 6 (Corea del Norte, 2017)', 250, 0.5, 'surface', 0, 'Prueba subterránea; estimaciones de 100 a 250 kt.'),
      n('Sedan (EE. UU., 1962)', 104, 0.3, 'surface', 0, 'Prueba de excavación nuclear: dejó un cráter de 390 m.'),
      n('Shakti I (India, 1998)', 45, 0.5, 'surface', 0, 'Rendimiento declarado; estimaciones independientes menores.'),
      n('Chagai-I (Pakistán, 1998)', 40, 1, 'surface', 0, 'Rendimiento declarado por Pakistán.'),
      n('Trinity (EE. UU., 1945)', 25, 1, 'custom', 30, 'Primera prueba nuclear (Nuevo México). Reestimada en 24,8 kt en 2021.'),
      n('RDS-1 (URSS, 1949)', 22, 1, 'custom', 30, 'Primera bomba atómica soviética.'),
      n('596 (China, 1964)', 22, 1, 'custom', 102, 'Primera bomba atómica china.'),
      n('Fat Man — Nagasaki (1945)', 21, 1, 'custom', 503, 'Bomba de plutonio lanzada el 9 de agosto de 1945.'),
      n('Little Boy — Hiroshima (1945)', 15, 1, 'custom', 580, 'Bomba de uranio lanzada el 6 de agosto de 1945.'),
      n('Grable (EE. UU., 1953)', 15, 1, 'custom', 160, 'Único proyectil nuclear disparado por un cañón (280 mm).'),
      n('Smiling Buddha (India, 1974)', 8, 1, 'surface', 0, 'Primera prueba nuclear india.'),
    ],
  },
  {
    group: 'Armas de la Guerra Fría (retiradas)',
    items: [
      n('B41 (EE. UU.)', 25000, 0.5, 'optimal', 0, 'El arma de mayor potencia que llegó a desplegar EE. UU.'),
      n('R-36M ojiva única (URSS)', 20000, 0.5, 'optimal', 0, 'Misil SS-18 "Satan" con una sola ojiva de 20 Mt.'),
      n('Mk-17 (EE. UU.)', 15000, 0.5, 'optimal', 0, 'La bomba más pesada de EE. UU. (19 t).'),
      n('B53 / W53 (EE. UU.)', 9000, 0.5, 'optimal', 0, 'Bomba y ojiva del misil Titan II; retirada en 2011.'),
      n('DF-5 ojiva única (China)', 4000, 0.5, 'optimal', 0, 'ICBM chino original de ojiva única (estimación).'),
      n('B28 (EE. UU.)', 1450, 0.5, 'optimal', 0, 'Bomba termonuclear táctica-estratégica de los años 60.'),
      n('W56 (EE. UU.)', 1200, 0.5, 'optimal', 0, 'Ojiva del Minuteman II.'),
      n('B43 (EE. UU.)', 1000, 0.5, 'optimal', 0, 'Bomba de 1 Mt para cazabombarderos.'),
      n('W62 (EE. UU.)', 170, 0.5, 'optimal', 0, 'Ojiva del Minuteman III original.'),
      n('W48 (EE. UU.)', 0.072, 1, 'surface', 0, 'Proyectil de artillería de 155 mm.'),
      n('W54 / Davy Crockett (EE. UU.)', 0.02, 1, 'surface', 0, 'Lanzador nuclear portátil de infantería.'),
    ],
  },
  {
    group: 'Arsenales actuales (estimaciones públicas)',
    items: [
      n('Poseidón / Status-6 (Rusia)', 2000, 0.5, 'surface', 0, 'Torpedo nuclear. Se ha afirmado hasta 100 Mt; los análisis independientes estiman unos 2 Mt.'),
      n('Avangard (Rusia)', 2000, 0.5, 'optimal', 0, 'Vehículo planeador hipersónico; rendimiento estimado.'),
      n('B83-1 (EE. UU.)', 1200, 0.5, 'optimal', 0, 'Mayor arma del arsenal estadounidense actual.'),
      n('R-36M2 ojiva MIRV (Rusia)', 800, 0.5, 'optimal', 0, 'Cada una de las 10 ojivas del SS-18 Mod 4/5.'),
      n('RS-28 Sarmat, ojiva (Rusia)', 750, 0.5, 'optimal', 0, 'ICBM pesado de nueva generación (estimación por ojiva).'),
      n('Topol-M (Rusia)', 550, 0.5, 'optimal', 0, 'ICBM SS-27 de ojiva única.'),
      n('W88 (EE. UU.)', 475, 0.5, 'optimal', 0, 'Ojiva de alto rendimiento del Trident II.'),
      n('B61-11 (EE. UU.)', 400, 0.5, 'surface', 0, 'Versión penetrante (anti-búnker) de la B61.'),
      n('B61-13 (EE. UU.)', 360, 0.5, 'optimal', 0, 'Nueva variante de alto rendimiento (2023).'),
      n('W78 (EE. UU.)', 350, 0.5, 'optimal', 0, 'Ojiva del Minuteman III (Mk12A).'),
      n('W87 (EE. UU.)', 300, 0.5, 'optimal', 0, 'Ojiva del Minuteman III (Mk21).'),
      n('TNA / ASMP-A (Francia)', 300, 0.5, 'optimal', 0, 'Misil de crucero aire-superficie francés.'),
      n('Kh-102 (Rusia)', 250, 0.5, 'optimal', 0, 'Misil de crucero estratégico lanzado desde bombarderos.'),
      n('DF-41, ojiva (China)', 250, 0.5, 'optimal', 0, 'ICBM móvil MIRV (estimación por ojiva).'),
      n('Hwasong-17 (Corea del Norte)', 250, 0.5, 'optimal', 0, 'ICBM norcoreano; rendimiento estimado.'),
      n('W80-1 (EE. UU.)', 150, 0.5, 'optimal', 0, 'Ojiva de misiles de crucero (5–150 kt).'),
      n('Bulava, ojiva (Rusia)', 150, 0.5, 'optimal', 0, 'SLBM de los submarinos clase Borei (estimación).'),
      n('Yars RS-24, ojiva (Rusia)', 150, 0.5, 'optimal', 0, 'ICBM móvil MIRV (estimación por ojiva).'),
      n('Holbrook / Trident (Reino Unido)', 100, 0.5, 'optimal', 0, 'Ojiva británica del Trident II (estimación).'),
      n('TN 75 / TNO (Francia)', 100, 0.5, 'optimal', 0, 'Ojivas de los misiles M51 de los submarinos franceses.'),
      n('W76-1 (EE. UU.)', 90, 0.5, 'optimal', 0, 'Ojiva más numerosa del arsenal de EE. UU. (Trident II).'),
      n('B61-12 (EE. UU.)', 50, 0.5, 'optimal', 0, 'Bomba guiada de rendimiento variable (0,3–50 kt).'),
      n('Iskander-M nuclear (Rusia)', 50, 1, 'optimal', 0, 'Misil táctico de corto alcance (estimación 10–50 kt).'),
      n('W76-2 (EE. UU.)', 8, 1, 'optimal', 0, 'Ojiva de bajo rendimiento para Trident (≈ 5–8 kt).'),
    ],
  },
  {
    group: 'Explosiones no nucleares (accidentes y pruebas)',
    items: [
      c('Minor Scale (EE. UU., 1985)', 4, 'Mayor explosión convencional planificada: 4800 t de ANFO.'),
      c('Heligoland "British Bang" (1947)', 3.2, 'Voladura de la munición alemana sobrante en la isla.'),
      c('Halifax (Canadá, 1917)', 2.9, 'Choque de un carguero lleno de explosivos; unos 2000 muertos.'),
      c('Port Chicago (EE. UU., 1944)', 1.9, 'Explosión de munición al cargar un barco.'),
      c('Oppau (Alemania, 1921)', 1.5, 'Explosión de nitrato amónico en una fábrica de BASF.'),
      c('Beirut (Líbano, 2020)', 0.8, '2750 t de nitrato amónico almacenadas en el puerto.'),
      c('Texas City (EE. UU., 1947)', 0.79, 'Barco cargado de nitrato amónico; el peor accidente industrial de EE. UU.'),
      c('Tianjin (China, 2015)', 0.3, 'Explosiones en un almacén de productos químicos.'),
    ],
  },
  {
    group: 'Bombas convencionales',
    items: [
      c('FOAB "Padre de todas las bombas" (Rusia)', 0.044, 'Bomba termobárica; se le atribuyen 44 t de TNT equivalente.', 30),
      c('GBU-43/B MOAB "Madre de todas las bombas" (EE. UU.)', 0.011, 'Bomba de 9,8 t; unas 11 t de TNT equivalente. Usada en Afganistán en 2017.', 6),
      c('BLU-82 "Daisy Cutter" (EE. UU.)', 0.0068, 'Bomba de 6,8 t de mezcla explosiva, para despejar zonas de aterrizaje.', 1),
      c('Grand Slam (Reino Unido, 1945)', 0.0065, 'Bomba "terremoto" de 10 t (4,1 t de Torpex).'),
      c('Tallboy (Reino Unido, 1944)', 0.0036, 'Bomba sísmica de 5,4 t; hundió el acorazado Tirpitz.'),
      c('GBU-57 MOP (EE. UU.)', 0.0026, 'Bomba anti-búnker de 13,6 t (unas 2,4 t de explosivo).'),
      c('Mk 84 / GBU-31 (EE. UU.)', 0.0006, 'Bomba de 900 kg, la más común de su tipo.'),
    ],
  },
];

export const NUKE_PRESETS = GROUPS.map((g) => ({ group: g.group, items: [...g.items].sort((a, b) => b.yieldKt - a.yieldKt) }));

export const ASTEROID_PRESETS: (Omit<AsteroidInput, 'kind'> & { note: string })[] = [
  { name: '2008 TC3 (Sudán, 2008)', diameterM: 4, densityKgM3: 2600, velocityKms: 12.4, angleDeg: 20, target: 'sediment', waterDepthM: 0, note: 'Primer asteroide detectado antes de su impacto; estalló a 37 km de altura.' },
  { name: 'Sikhote-Alin (Rusia, 1947)', diameterM: 3, densityKgM3: 7800, velocityKms: 14, angleDeg: 41, target: 'rock', waterDepthM: 0, note: 'Lluvia de meteoritos de hierro; más de 100 cráteres pequeños.' },
  { name: 'Cheliábinsk (Rusia, 2013)', diameterM: 19, densityKgM3: 3300, velocityKms: 19, angleDeg: 18, target: 'sediment', waterDepthM: 0, note: 'Estalló sobre Rusia; ~1500 heridos por cristales.' },
  { name: 'Cráter Barringer (50 000 a. C.)', diameterM: 50, densityKgM3: 7800, velocityKms: 12.8, angleDeg: 45, target: 'sediment', waterDepthM: 0, note: 'Meteorito metálico que creó el cráter de Arizona.' },
  { name: 'Tunguska (Siberia, 1908)', diameterM: 60, densityKgM3: 3000, velocityKms: 15, angleDeg: 35, target: 'sediment', waterDepthM: 0, note: 'Arrasó 2000 km² de bosque en Siberia.' },
  { name: '2024 YR4 (hipotético)', diameterM: 60, densityKgM3: 2600, velocityKms: 17, angleDeg: 45, target: 'sediment', waterDepthM: 0, note: 'Tuvo hasta un 3 % de probabilidad de impactar en 2032; descartado después.' },
  { name: 'Dimorphos (hipotético)', diameterM: 160, densityKgM3: 2400, velocityKms: 20, angleDeg: 45, target: 'rock', waterDepthM: 0, note: 'La luna asteroide desviada por la misión DART en 2022.' },
  { name: '‘Oumuamua (hipotético)', diameterM: 200, densityKgM3: 2000, velocityKms: 30, angleDeg: 45, target: 'rock', waterDepthM: 0, note: 'Primer objeto interestelar conocido, a gran velocidad.' },
  { name: 'Itokawa (hipotético)', diameterM: 330, densityKgM3: 1900, velocityKms: 15, angleDeg: 45, target: 'rock', waterDepthM: 0, note: 'Asteroide de escombros visitado por la sonda Hayabusa.' },
  { name: 'Apophis (hipotético)', diameterM: 370, densityKgM3: 3000, velocityKms: 12.6, angleDeg: 45, target: 'rock', waterDepthM: 0, note: 'Pasará a 32 000 km de la Tierra en 2029. Aquí, si impactara.' },
  { name: 'Bennu (hipotético)', diameterM: 490, densityKgM3: 1190, velocityKms: 12.7, angleDeg: 45, target: 'rock', waterDepthM: 0, note: 'Asteroide de escombros visitado por OSIRIS-REx.' },
  { name: 'Didymos (hipotético)', diameterM: 780, densityKgM3: 2400, velocityKms: 20, angleDeg: 45, target: 'rock', waterDepthM: 0, note: 'El asteroide principal del sistema que estudió DART.' },
  { name: 'Ryugu (hipotético)', diameterM: 900, densityKgM3: 1190, velocityKms: 15, angleDeg: 45, target: 'rock', waterDepthM: 0, note: 'Asteroide carbonáceo muestreado por Hayabusa2.' },
  { name: 'Asteroide de 1 km', diameterM: 1000, densityKgM3: 3000, velocityKms: 20, angleDeg: 45, target: 'rock', waterDepthM: 0, note: 'Catástrofe regional con efectos climáticos globales.' },
  { name: 'Fragmento de Shoemaker-Levy 9', diameterM: 2000, densityKgM3: 600, velocityKms: 60, angleDeg: 45, target: 'rock', waterDepthM: 0, note: 'Como los que chocaron contra Júpiter en 1994, pero en la Tierra.' },
  { name: 'Cometa de 5 km', diameterM: 5000, densityKgM3: 600, velocityKms: 50, angleDeg: 40, target: 'rock', waterDepthM: 0, note: 'Núcleo de hielo y polvo a gran velocidad.' },
  { name: 'Popigai (Siberia, 35 Ma)', diameterM: 7000, densityKgM3: 3000, velocityKms: 20, angleDeg: 45, target: 'rock', waterDepthM: 0, note: 'Cráter de 100 km, famoso por sus diamantes de impacto.' },
  { name: 'Chicxulub (extinción K-Pg)', diameterM: 10000, densityKgM3: 2700, velocityKms: 20, angleDeg: 60, target: 'water', waterDepthM: 200, note: 'Acabó con los dinosaurios hace 66 millones de años.' },
  { name: 'Cometa Halley (hipotético)', diameterM: 11000, densityKgM3: 600, velocityKms: 70, angleDeg: 45, target: 'rock', waterDepthM: 0, note: 'Su núcleo, a la velocidad de una órbita retrógrada.' },
  { name: 'Vredefort (Sudáfrica, 2000 Ma)', diameterM: 15000, densityKgM3: 3000, velocityKms: 20, angleDeg: 45, target: 'rock', waterDepthM: 0, note: 'La mayor estructura de impacto conocida en la Tierra.' },
  { name: 'Eros (hipotético)', diameterM: 16800, densityKgM3: 2670, velocityKms: 20, angleDeg: 45, target: 'rock', waterDepthM: 0, note: 'Segundo mayor asteroide cercano a la Tierra.' },
  { name: 'Cometa Hale-Bopp (hipotético)', diameterM: 60000, densityKgM3: 600, velocityKms: 50, angleDeg: 45, target: 'rock', waterDepthM: 0, note: 'Uno de los cometas más grandes observados.' },
];

export const COMPOSITIONS = [
  { name: 'Hielo (cometa)', density: 600 },
  { name: 'Hielo compacto', density: 1000 },
  { name: 'Roca porosa / escombros', density: 1500 },
  { name: 'Condrita (roca)', density: 3000 },
  { name: 'Hierro-níquel', density: 7800 },
];
