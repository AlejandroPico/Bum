/**
 * Mapa de pruebas nucleares: polígonos de pruebas con el número de ensayos (cifras públicas
 * redondeadas: Comisión Preparatoria de la OTPCE, SIPRI, Departamento de Energía de EE. UU.) y
 * algunas pruebas célebres, que se pueden simular en su lugar real.
 */
export interface TestSite { name: string; country: string; lat: number; lon: number; count: number; years: string; note: string }
export interface NotableTest { name: string; lat: number; lon: number; date: string; yieldKt: number; note: string; preset?: string; burst?: 'surface' | 'custom' | 'underground' | 'underwater'; heightM?: number; depthM?: number }

export const TEST_SITES: TestSite[] = [
  { name: 'Sitio de pruebas de Nevada', country: 'EE. UU.', lat: 37.12, lon: -116.05, count: 928, years: '1951–1992', note: '100 pruebas atmosféricas y 828 subterráneas: el lugar con más ensayos del mundo. También se usaron para 24 pruebas británicas.' },
  { name: 'Polígono de Semipalatinsk', country: 'URSS (Kazajistán)', lat: 50.07, lon: 78.43, count: 456, years: '1949–1989', note: 'Primera bomba soviética (RDS-1) y 340 pruebas subterráneas. Más de un millón de personas recibieron dosis por la lluvia radiactiva.' },
  { name: 'Moruroa', country: 'Francia', lat: -21.85, lon: -138.9, count: 181, years: '1966–1996', note: 'Atolón de la Polinesia francesa: 41 pruebas atmosféricas y 140 bajo el atolón.' },
  { name: 'Nueva Zembla', country: 'URSS (Rusia)', lat: 73.4, lon: 54.8, count: 130, years: '1955–1990', note: 'Archipiélago ártico: aquí estalló la Tsar Bomba (1961), la mayor explosión de la historia.' },
  { name: 'Lop Nur', country: 'China', lat: 41.5, lon: 88.4, count: 45, years: '1964–1996', note: 'Todas las pruebas chinas: 23 atmosféricas y 22 subterráneas.' },
  { name: 'Enewetak', country: 'EE. UU. (Islas Marshall)', lat: 11.5, lon: 162.3, count: 43, years: '1948–1958', note: 'Ivy Mike (1952), la primera bomba de hidrógeno, borró la isla de Elugelab.' },
  { name: 'Isla de Navidad (Kiritimati) y Malden', country: 'Reino Unido y EE. UU.', lat: 1.87, lon: -157.4, count: 33, years: '1957–1962', note: 'Pruebas termonucleares británicas Grapple y 24 lanzamientos estadounidenses de la operación Dominic.' },
  { name: 'Bikini', country: 'EE. UU. (Islas Marshall)', lat: 11.6, lon: 165.4, count: 23, years: '1946–1958', note: 'Crossroads (1946) y Castle Bravo (1954), la mayor prueba estadounidense. Sigue deshabitado.' },
  { name: 'In Ekker', country: 'Francia (Argelia)', lat: 24.05, lon: 5.05, count: 13, years: '1961–1966', note: 'Pruebas en galerías bajo el macizo de Taourirt Tan Afella; en el accidente Béryl (1962) escapó una nube radiactiva.' },
  { name: 'Atolón Johnston', country: 'EE. UU.', lat: 16.73, lon: -169.53, count: 12, years: '1958–1962', note: 'Explosiones a gran altura, como Starfish Prime (400 km), cuyo pulso electromagnético llegó a Hawái.' },
  { name: 'Fangataufa', country: 'Francia', lat: -22.23, lon: -138.73, count: 12, years: '1966–1996', note: 'Canopus (1968), la primera bomba de hidrógeno francesa.' },
  { name: 'Kapustin Yar', country: 'URSS (Rusia)', lat: 48.6, lon: 46.3, count: 10, years: '1951–1962', note: 'Pruebas con misiles y a gran altura (operación K).' },
  { name: 'Maralinga', country: 'Reino Unido (Australia)', lat: -30.16, lon: 131.6, count: 7, years: '1956–1957', note: 'Contaminó tierras de los pueblos anangu; se limpió en los años noventa.' },
  { name: 'Pokhran', country: 'India', lat: 27.08, lon: 71.72, count: 6, years: '1974 y 1998', note: 'Smiling Buddha (1974) y la serie Shakti (1998).' },
  { name: 'Punggye-ri', country: 'Corea del Norte', lat: 41.28, lon: 129.08, count: 6, years: '2006–2017', note: 'La última prueba, en 2017, pudo superar los 100 kt.' },
  { name: 'Chagai y Kharan', country: 'Pakistán', lat: 28.8, lon: 64.9, count: 6, years: '1998', note: 'Chagai-I y Chagai-II, dos semanas después de las pruebas indias.' },
  { name: 'Reggane', country: 'Francia (Argelia)', lat: 26.3, lon: 0.07, count: 4, years: '1960–1961', note: 'Gerboise Bleue (1960), la primera bomba francesa, en el Sáhara.' },
  { name: 'Islas Montebello', country: 'Reino Unido (Australia)', lat: -20.4, lon: 115.55, count: 3, years: '1952–1956', note: 'Operación Hurricane (1952), la primera bomba británica, en un barco.' },
  { name: 'Amchitka', country: 'EE. UU. (Alaska)', lat: 51.45, lon: 179.1, count: 3, years: '1965–1971', note: 'Cannikin (1971), la mayor prueba subterránea estadounidense (~5 Mt).' },
  { name: 'Emu Field', country: 'Reino Unido (Australia)', lat: -28.7, lon: 132.37, count: 2, years: '1953', note: 'Operación Totem: la «niebla negra» alcanzó a comunidades aborígenes.' },
  { name: 'Atlántico Sur (Argus)', country: 'EE. UU.', lat: -45, lon: -10, count: 3, years: '1958', note: 'Tres explosiones a 200–540 km de altura para crear cinturones de radiación artificiales.' },
  { name: 'Totskoye', country: 'URSS (Rusia)', lat: 52.6, lon: 52.8, count: 1, years: '1954', note: 'Maniobras militares con 45 000 soldados tras una bomba de 40 kt.' },
  { name: 'Alamogordo (Trinity)', country: 'EE. UU.', lat: 33.677, lon: -106.475, count: 1, years: '1945', note: 'La primera explosión nuclear de la historia, el 16 de julio de 1945.' },
  { name: 'Hiroshima y Nagasaki', country: 'Japón (uso en guerra)', lat: 34.3955, lon: 132.4536, count: 2, years: '1945', note: 'Los dos únicos usos de armas nucleares en una guerra.' },
];

export const NOTABLE_TESTS: NotableTest[] = [
  { name: 'Trinity', lat: 33.677, lon: -106.475, date: '16 jul 1945', yieldKt: 25, preset: 'Trinity (EE. UU., 1945)', note: 'Primera prueba nuclear: el «Gadget» de plutonio, en una torre de 30 m.' },
  { name: 'Little Boy', lat: 34.3955, lon: 132.4536, date: '6 ago 1945', yieldKt: 15, preset: 'Little Boy — Hiroshima (1945)', note: 'Hiroshima: unos 70 000–140 000 muertos hasta finales de 1945.' },
  { name: 'Fat Man', lat: 32.7737, lon: 129.8633, date: '9 ago 1945', yieldKt: 21, preset: 'Fat Man — Nagasaki (1945)', note: 'Nagasaki: unos 40 000–74 000 muertos hasta finales de 1945.' },
  { name: 'Crossroads Baker', lat: 11.58, lon: 165.51, date: '25 jul 1946', yieldKt: 23, burst: 'underwater', depthM: 27, note: 'Explosión a 27 m bajo la laguna de Bikini; la columna de agua contaminó la flota de prueba.' },
  { name: 'RDS-1', lat: 50.44, lon: 77.82, date: '29 ago 1949', yieldKt: 22, preset: 'RDS-1 (URSS, 1949)', note: 'Primera bomba soviética, copia del diseño de Fat Man.' },
  { name: 'Hurricane', lat: -20.4, lon: 115.55, date: '3 oct 1952', yieldKt: 25, burst: 'underwater', depthM: 3, note: 'Primera bomba británica, detonada en la fragata HMS Plym.' },
  { name: 'Ivy Mike', lat: 11.667, lon: 162.188, date: '1 nov 1952', yieldKt: 10400, preset: 'Ivy Mike (EE. UU., 1952)', note: 'Primera bomba de hidrógeno: un dispositivo de 74 t que dejó un cráter de 1,9 km.' },
  { name: 'Castle Bravo', lat: 11.697, lon: 165.272, date: '1 mar 1954', yieldKt: 15000, preset: 'Castle Bravo (EE. UU., 1954)', note: 'Dio 15 Mt en vez de 6: la lluvia radiactiva alcanzó Rongelap y el pesquero Daigo Fukuryū Maru.' },
  { name: 'RDS-37', lat: 50.4, lon: 77.7, date: '22 nov 1955', yieldKt: 1600, preset: 'RDS-37 (URSS, 1955)', note: 'Primera bomba soviética de dos etapas, lanzada desde un avión.' },
  { name: 'Grapple X', lat: 1.7, lon: -157.25, date: '8 nov 1957', yieldKt: 1800, preset: 'Grapple X (Reino Unido, 1957)', note: 'Primera bomba termonuclear británica que funcionó como tal.' },
  { name: 'Gerboise Bleue', lat: 26.31, lon: 0.06, date: '13 feb 1960', yieldKt: 70, burst: 'custom', heightM: 100, note: 'Primera bomba francesa, en una torre en el Sáhara argelino.' },
  { name: 'Tsar Bomba', lat: 73.85, lon: 54.5, date: '30 oct 1961', yieldKt: 50000, preset: 'Tsar Bomba (URSS, 1961)', note: 'La mayor explosión provocada por el ser humano: 50 Mt a 4 km de altura.' },
  { name: 'Starfish Prime', lat: 16.47, lon: -169.62, date: '9 jul 1962', yieldKt: 1400, preset: 'Starfish Prime (EE. UU., 1962)', note: '1,4 Mt a 400 km de altura: auroras artificiales y averías en Hawái.' },
  { name: 'Sedan', lat: 37.177, lon: -116.046, date: '6 jul 1962', yieldKt: 104, burst: 'underground', depthM: 194, note: 'Excavación nuclear (programa Plowshare): cráter de 390 m de diámetro.' },
  { name: '596', lat: 40.82, lon: 89.78, date: '16 oct 1964', yieldKt: 22, preset: '596 (China, 1964)', note: 'Primera bomba atómica china.' },
  { name: 'Chagan', lat: 49.94, lon: 79.01, date: '15 ene 1965', yieldKt: 140, burst: 'underground', depthM: 178, note: 'Explosión «pacífica» que creó el lago Chagan, aún radiactivo.' },
  { name: 'Prueba n.º 6', lat: 41.5, lon: 88.6, date: '17 jun 1967', yieldKt: 3300, preset: 'Prueba n.º 6 (China, 1967)', note: 'Primera bomba de hidrógeno china, solo 32 meses después de la primera atómica.' },
  { name: 'Canopus', lat: -22.23, lon: -138.73, date: '24 ago 1968', yieldKt: 2600, preset: 'Canopus (Francia, 1968)', note: 'Primera bomba termonuclear francesa.' },
  { name: 'Cannikin', lat: 51.47, lon: 179.1, date: '6 nov 1971', yieldKt: 5000, burst: 'underground', depthM: 1790, note: 'La mayor prueba subterránea de EE. UU., a 1,8 km de profundidad.' },
  { name: 'Smiling Buddha', lat: 27.095, lon: 71.753, date: '18 may 1974', yieldKt: 8, preset: 'Smiling Buddha (India, 1974)', note: 'Primera prueba india, presentada como «explosión pacífica».' },
  { name: 'Divider', lat: 37.02, lon: -116.03, date: '23 sep 1992', yieldKt: 5, burst: 'underground', depthM: 340, note: 'Última prueba nuclear de EE. UU.' },
  { name: 'Shakti I', lat: 27.08, lon: 71.72, date: '11 may 1998', yieldKt: 45, preset: 'Shakti I (India, 1998)', note: 'Prueba termonuclear india (rendimiento discutido).' },
  { name: 'Chagai-I', lat: 28.79, lon: 64.94, date: '28 may 1998', yieldKt: 40, preset: 'Chagai-I (Pakistán, 1998)', note: 'Primeras pruebas pakistaníes, en una galería bajo el monte Ras Koh.' },
  { name: 'Prueba 6 de Corea del Norte', lat: 41.3, lon: 129.08, date: '3 sep 2017', yieldKt: 250, preset: 'Hwasong-14 / prueba 6 (Corea del Norte, 2017)', note: 'La mayor prueba norcoreana; provocó un seísmo de magnitud 6,3.' },
];

export const TOTAL_TESTS = 2056;
