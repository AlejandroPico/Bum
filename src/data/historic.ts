/**
 * Explosiones reales reconstruidas: la misma arma o el mismo asteroide, en el mismo sitio, a la misma
 * hora y con el tiempo de aquel día (lo que se sabe de él), y lo que se midió o se documentó después,
 * para comparar el modelo con la realidad.
 *
 * Fuentes: Glasstone y Dolan (1977); US Strategic Bombing Survey (1946); RERF; Uda (1953) sobre la
 * lluvia negra; DOE/NV-209 (pruebas de EE. UU.); Sublette, «Nuclear Weapon Archive» (Castle Bravo,
 * Tsar Bomba); Simon et al. (2010) sobre las dosis de Rongelap; Khalturin et al. (2005); Popova et al.
 * (2013) para Cheliábinsk; Boslough y Crawford (2008) y Chyba et al. (1993) para Tunguska.
 */
import type { Effects, Environment } from '../physics/types';
import { localOffset } from '../physics/safety';

export interface HistRow {
  label: string;
  /** valor real (intervalo con la incertidumbre de las fuentes) */
  real: [number, number];
  unit: string;
  /** valor del modelo en la misma unidad (null si no aplica) */
  model: (fx: Effects, gz: { lat: number; lon: number }) => number | null;
  /** false: no son comparables (p. ej. la población de 1945 y la de hoy); se explica en la nota */
  comparable?: boolean;
  note?: string;
}
export interface HistCase {
  id: string;
  title: string;
  /** fecha legible y hora local */
  dateText: string;
  place: string;
  /** preset del simulador (arma o asteroide) */
  preset: string;
  lat: number; lon: number; label: string;
  env: Partial<Environment>;
  summary: string;
  story: string;
  rows: HistRow[];
  sources: string;
  /** artículo de la enciclopedia */
  book: string;
}

const ring = (fx: Effects, id: string) => fx.rings.find((r) => r.id === id)?.radiusM ?? null;
const km = (m: number | null) => (m == null ? null : m / 1000);
const area = (m: number | null) => (m == null ? null : (Math.PI * m * m) / 1e6);
/** dosis (rem) acumulada a la intemperie en un punto entre la llegada de la lluvia radiactiva y tH horas */
const doseAt = (fx: Effects, gz: { lat: number; lon: number }, lat: number, lon: number, tH: number, pf = 1) => {
  if (!fx.falloutDoseAt) return null;
  const o = localOffset(gz.lat, gz.lon, lat, lon);
  return fx.falloutDoseAt(o.e, o.n, 0, tH, pf);
};

export const HISTORIC: HistCase[] = [
  {
    id: 'trinity', title: 'Trinity', dateText: '16 de julio de 1945, 5:29', place: 'Alamogordo (Nuevo México)', preset: 'Trinity (EE. UU., 1945)',
    lat: 33.6773, lon: -106.4754, label: 'Trinity, Nuevo México',
    env: { hour: 5.5, windFromDeg: 225, windKmh: 15, humidity: 55, visibilityKm: 60, rainMmH: 0 },
    summary: 'La primera explosión nuclear de la historia, sobre una torre de 30 m en el desierto.',
    story: 'A las 5:29 de la mañana, tras una noche de tormenta, el «Gadget» de plutonio estalló sobre una torre de acero de 30 m. La luz se vio a más de 250 km y la nube subió en pocos minutos hasta la estratosfera; el viento la llevó hacia el noreste, sobre ranchos que nadie evacuó. Se calculó entonces una potencia de 20 kt; en 2021 se reestimó en 24,8 kt.',
    rows: [
      { label: 'Altura de la nube', real: [11, 12.5], unit: 'km', model: (fx) => fx.cloud.topM / 1000 },
    ],
    sources: 'DOE/NV-209; Los Alamos (2021); Sublette.', book: 'Trinity',
  },
  {
    id: 'hiroshima', title: 'Hiroshima', dateText: '6 de agosto de 1945, 8:15', place: 'Hiroshima (Japón)', preset: 'Little Boy — Hiroshima (1945)',
    lat: 34.3947, lon: 132.4547, label: 'Hiroshima (hipocentro, hospital Shima)',
    env: { hour: 8.25, windFromDeg: 135, windKmh: 6, humidity: 80, visibilityKm: 30, rainMmH: 0 },
    summary: 'La primera bomba atómica lanzada sobre una ciudad: 15 kt a unos 580 m de altura.',
    story: 'Little Boy, una bomba de uranio de unos 15 kt, estalló a unos 580 m sobre el hospital Shima en una mañana despejada y casi sin viento. La onda arrasó casi todo en 1,6 km y los incendios se unieron en una tormenta de fuego que quemó unos 13 km² de la ciudad. Media hora después cayó al noroeste una «lluvia negra» de hollín y polvo radiactivo. A finales de 1945 habían muerto entre 90 000 y 166 000 personas.',
    rows: [
      { label: 'Destrucción casi total (radio)', real: [1.5, 1.8], unit: 'km', model: (fx) => km(ring(fx, 'psi5')) },
      { label: 'Quemaduras en la piel expuesta (hasta)', real: [3, 4], unit: 'km', model: (fx) => km(ring(fx, 'burn1')) },
      { label: 'Zona arrasada por el fuego', real: [11, 13], unit: 'km²', model: (fx) => area(ring(fx, 'ignite')) },
      { label: 'Lluvia negra intensa', real: [150, 210], unit: 'km²', model: (fx) => fx.blackRain?.heavyKm2 ?? null, note: 'El óvalo de Uda (1953): unos 19 × 11 km al noroeste.' },
      { label: 'Muertos hasta finales de 1945', real: [90000, 166000], unit: 'personas', model: (fx) => fx.casualties.deaths, comparable: false, note: 'En 1945 vivían en Hiroshima unas 350 000 personas y la mayoría estaba en la calle o en casas de madera; el modelo usa la población y los edificios de hoy.' },
    ],
    sources: 'US Strategic Bombing Survey (1946); RERF; Glasstone y Dolan (1977); Uda (1953).', book: 'Bombardeo atómico de Hiroshima',
  },
  {
    id: 'nagasaki', title: 'Nagasaki', dateText: '9 de agosto de 1945, 11:02', place: 'Nagasaki (Japón)', preset: 'Fat Man — Nagasaki (1945)',
    lat: 32.7737, lon: 129.8633, label: 'Nagasaki (hipocentro, Matsuyama)',
    env: { hour: 11.05, windFromDeg: 270, windKmh: 12, humidity: 70, visibilityKm: 25, rainMmH: 0 },
    summary: 'La bomba de plutonio sobre el valle de Urakami: 21 kt a unos 500 m.',
    story: 'Fat Man se lanzó sobre Nagasaki porque Kokura, el objetivo, estaba cubierto de nubes. Estalló a unos 500 m sobre el valle de Urakami, a 3 km del centro previsto: las colinas protegieron gran parte de la ciudad, así que la zona destruida fue menor que en Hiroshima pese a la mayor potencia. A finales de 1945 habían muerto unas 74 000 personas.',
    rows: [
      { label: 'Destrucción casi total (radio)', real: [1.6, 2.0], unit: 'km', model: (fx) => km(ring(fx, 'psi5')) },
      { label: 'Superficie destruida', real: [6, 7.5], unit: 'km²', model: (fx) => area(ring(fx, 'psi5')), note: 'Las colinas del valle de Urakami frenaron la onda: el modelo supone terreno llano.' },
      { label: 'Muertos hasta finales de 1945', real: [60000, 80000], unit: 'personas', model: (fx) => fx.casualties.deaths, comparable: false, note: 'La ciudad de 1945 (unas 240 000 personas) no es la de hoy.' },
    ],
    sources: 'US Strategic Bombing Survey (1946); RERF; Glasstone y Dolan (1977).', book: 'Bombardeo atómico de Nagasaki',
  },
  {
    id: 'bravo', title: 'Castle Bravo', dateText: '1 de marzo de 1954, 6:45', place: 'Atolón de Bikini (Islas Marshall)', preset: 'Castle Bravo (EE. UU., 1954)',
    lat: 11.6969, lon: 165.2734, label: 'Bikini, arrecife de Namu',
    env: {
      hour: 6.75, windFromDeg: 260, windKmh: 30, humidity: 80, visibilityKm: 40, rainMmH: 0,
      // alisios del este cerca del suelo y vientos del oeste en altura: la lluvia radiactiva fue hacia el este,
      // con el eje de la pluma algo al norte de Rongelap (lo que se reconstruyó después)
      windProfile: [{ zM: 10, kmh: 20, fromDeg: 80 }, { zM: 1500, kmh: 20, fromDeg: 90 }, { zM: 5000, kmh: 25, fromDeg: 270 }, { zM: 10000, kmh: 45, fromDeg: 280 }, { zM: 18000, kmh: 55, fromDeg: 278 }, { zM: 30000, kmh: 40, fromDeg: 270 }],
    },
    summary: 'La mayor prueba de Estados Unidos: 15 Mt en vez de los 6 previstos, y la peor contaminación de la historia de las pruebas.',
    story: 'Un error de cálculo sobre el litio-7 hizo que la bomba diera 15 Mt, más del doble de lo esperado. Abrió un cráter de 2 km en el arrecife y la nube subió hasta unos 40 km. El viento en altura, que había cambiado por la noche, llevó la lluvia radiactiva hacia el este: cayó sobre el pesquero japonés Daigo Fukuryū Maru y sobre los habitantes de Rongelap, a 180 km, que no fueron evacuados hasta dos días después.',
    rows: [
      { label: 'Diámetro del cráter', real: [1.9, 2.0], unit: 'km', model: (fx) => km(fx.crater?.diameterM ?? null), note: 'En un arrecife de coral empapado de agua el cráter sale mucho más ancho y menos hondo que en tierra firme, que es lo que supone el modelo.' },
      { label: 'Profundidad del cráter', real: [70, 80], unit: 'm', model: (fx) => fx.crater?.depthM ?? null },
      { label: 'Diámetro de la bola de fuego', real: [6.4, 7.2], unit: 'km', model: (fx) => (fx.fireball.radiusM * 2) / 1000 },
      { label: 'Altura de la nube', real: [35, 41], unit: 'km', model: (fx) => fx.cloud.topM / 1000 },
      { label: 'Dosis en Rongelap hasta la evacuación (51 h)', real: [150, 200], unit: 'rem', model: (fx, gz) => doseAt(fx, gz, 11.165, 166.84, 51), note: 'Muy sensible al viento de aquella mañana, que sólo se conoce a grandes rasgos.' },
    ],
    sources: 'DOE/NV-209; Sublette; Simon et al. (2010); Glasstone y Dolan (1977).', book: 'Castle Bravo',
  },
  {
    id: 'tsar', title: 'Tsar Bomba', dateText: '30 de octubre de 1961, 11:32', place: 'Nueva Zembla (Unión Soviética)', preset: 'Tsar Bomba (URSS, 1961)',
    lat: 73.85, lon: 54.5, label: 'Mityushikha, Nueva Zembla',
    env: { hour: 11.5, windFromDeg: 270, windKmh: 25, humidity: 70, visibilityKm: 80, rainMmH: 0 },
    summary: 'La mayor explosión provocada jamás: 50 Mt a 4 km de altura.',
    story: 'Lanzada desde un bombardero Tu-95 con un paracaídas de 800 kg para darle tiempo a escapar, la bomba estalló a unos 4 km de altura. La bola de fuego, de unos 8 km, casi tocó el suelo; la nube subió hasta 67 km. La onda rompió ventanas a cientos de kilómetros, en Noruega y Finlandia, y dio tres vueltas a la Tierra.',
    rows: [
      { label: 'Diámetro de la bola de fuego', real: [7.5, 9.5], unit: 'km', model: (fx) => (fx.fireball.radiusM * 2) / 1000 },
      { label: 'Altura de la nube', real: [60, 67], unit: 'km', model: (fx) => fx.cloud.topM / 1000 },
      { label: 'Diámetro del sombrero', real: [90, 100], unit: 'km', model: (fx) => (fx.cloud.capRadiusM * 2) / 1000 },
      { label: 'Quemaduras de 3.er grado (hasta)', real: [90, 100], unit: 'km', model: (fx) => km(ring(fx, 'burn3')) },
      { label: 'Cristales rotos (hasta)', real: [780, 900], unit: 'km', model: (fx) => km(ring(fx, 'psi0.2')), note: 'A esas distancias la atmósfera enfoca la onda hacia el suelo en algunos sitios; el modelo no lo tiene en cuenta.' },
    ],
    sources: 'Khalturin et al. (2005); Sublette; Adamsky y Smirnov (1994).', book: 'Tsar Bomba',
  },
  {
    id: 'tunguska', title: 'Tunguska', dateText: '30 de junio de 1908, 7:17', place: 'Siberia central', preset: 'Tunguska (Siberia, 1908)',
    lat: 60.886, lon: 101.894, label: 'Tunguska, Siberia',
    env: { hour: 7.3, windFromDeg: 270, windKmh: 10, humidity: 60, visibilityKm: 50, rainMmH: 0 },
    summary: 'Un asteroide de unos 50–60 m estalló en el aire y derribó 80 millones de árboles.',
    story: 'Una bola de fuego cruzó el cielo de Siberia y estalló a varios kilómetros de altura con la energía de unas mil bombas de Hiroshima. No dejó cráter: la onda tumbó los árboles en forma de mariposa en más de 2000 km² y en el centro quedaron de pie, sin ramas, los que recibieron la onda desde arriba. Un hombre a 65 km fue derribado de su silla por el calor y el aire.',
    rows: [
      { label: 'Energía', real: [5, 15], unit: 'Mt', model: (fx) => fx.energyKt / 1000 },
      { label: 'Altura de la explosión', real: [5, 10], unit: 'km', model: (fx) => km(fx.asteroid?.airburstAltM ?? null) },
      { label: 'Bosque arrasado', real: [2000, 2200], unit: 'km²', model: (fx) => { const a = ring(fx, 'psi5'), b = ring(fx, 'psi1'); return a && b ? area(Math.sqrt(a * b)) : null; }, note: 'Los árboles caen con unos 2–3 psi: el modelo da la superficie entre sus anillos de 5 y 1 psi.' },
    ],
    sources: 'Boslough y Crawford (2008); Chyba et al. (1993); Longo (2007).', book: 'Evento de Tunguska',
  },
  {
    id: 'chelyabinsk', title: 'Cheliábinsk', dateText: '15 de febrero de 2013, 9:20', place: 'Cheliábinsk (Rusia)', preset: 'Cheliábinsk (Rusia, 2013)',
    lat: 54.85, lon: 61.2, label: 'Sobre Korkino, al sur de Cheliábinsk',
    env: { hour: 9.33, windFromDeg: 240, windKmh: 15, humidity: 80, visibilityKm: 25, rainMmH: 0 },
    summary: 'Un asteroide de 19 m estalló a unos 27 km de altura sobre una ciudad de un millón de habitantes.',
    story: 'Entró en la atmósfera a 19 km/s, más brillante que el Sol, y se rompió a unos 27–30 km de altura. Un minuto y medio después llegó la onda: rompió cristales en unos 7200 edificios de seis ciudades y hubo unos 1500 heridos, casi todos por los cristales de la gente que se había asomado a la ventana a mirar el destello.',
    rows: [
      { label: 'Energía', real: [400, 550], unit: 'kt', model: (fx) => fx.energyKt },
      { label: 'Altura de la explosión', real: [23, 30], unit: 'km', model: (fx) => km(fx.asteroid?.airburstAltM ?? fx.asteroid?.breakupAltM ?? null) },
      { label: 'Cristales rotos (hasta)', real: [80, 120], unit: 'km', model: (fx) => km(ring(fx, 'psi0.2')), note: 'Allí se rompieron ventanas con apenas 0,5–1 kPa (menos de 0,15 psi), por debajo del umbral de 0,2 psi que usa el modelo.' },
      { label: 'Heridos', real: [1400, 1600], unit: 'personas', model: (fx) => fx.casualties.injuries, note: 'Casi todos por cristales, sobre todo de quienes se asomaron a mirar el destello: el modelo no sabe que la gente fue a la ventana.' },
    ],
    sources: 'Popova et al. (2013); Brown et al. (2013).', book: 'Meteoro de Cheliábinsk',
  },
];
