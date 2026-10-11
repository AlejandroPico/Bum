/**
 * Bases de lanzamiento de misiles balísticos conocidas públicamente (ubicaciones aproximadas de las
 * divisiones de misiles, de las bases de submarinos o de los polígonos de ensayo) y un modelo
 * sencillo de trayectoria balística de energía mínima.
 *
 * Fuentes: FAS, Nuclear Notebook (Bulletin of the Atomic Scientists); Union of Concerned Scientists;
 * Wright, D. (2017) «Flight times of ballistic missiles».
 */
export interface LaunchSite { id: string; name: string; country: string; lat: number; lon: number; kind: 'icbm' | 'slbm' | 'irbm'; note: string }

export const LAUNCH_SITES: LaunchSite[] = [
  { id: 'us-minot', name: 'Base aérea de Minot (Dakota del Norte)', country: 'Estados Unidos', lat: 48.42, lon: -101.36, kind: 'icbm', note: 'Silos de Minuteman III del 91.º Ala de Misiles.' },
  { id: 'us-malmstrom', name: 'Base aérea de Malmstrom (Montana)', country: 'Estados Unidos', lat: 47.51, lon: -111.18, kind: 'icbm', note: 'Silos de Minuteman III del 341.º Ala de Misiles.' },
  { id: 'us-warren', name: 'Base aérea F. E. Warren (Wyoming)', country: 'Estados Unidos', lat: 41.13, lon: -104.87, kind: 'icbm', note: 'Silos de Minuteman III del 90.º Ala de Misiles.' },
  { id: 'us-atl', name: 'Submarino en el Atlántico Norte', country: 'Estados Unidos', lat: 45, lon: -35, kind: 'slbm', note: 'Patrulla de un submarino de la clase Ohio con misiles Trident II.' },
  { id: 'us-pac', name: 'Submarino en el Pacífico Norte', country: 'Estados Unidos', lat: 45, lon: -170, kind: 'slbm', note: 'Patrulla de un submarino de la clase Ohio con misiles Trident II.' },
  { id: 'ru-kozelsk', name: 'Kozelsk (región de Kaluga)', country: 'Rusia', lat: 54.03, lon: 35.78, kind: 'icbm', note: 'División de misiles con silos de RS-24 Yars.' },
  { id: 'ru-tatish', name: 'Tatíshchevo (región de Sarátov)', country: 'Rusia', lat: 51.68, lon: 45.6, kind: 'icbm', note: 'División de misiles con silos de Topol-M.' },
  { id: 'ru-dombar', name: 'Dombarovski (región de Oremburgo)', country: 'Rusia', lat: 51.1, lon: 59.85, kind: 'icbm', note: 'Silos de R-36M2 y de Avangard.' },
  { id: 'ru-uzhur', name: 'Uzhur (región de Krasnoyarsk)', country: 'Rusia', lat: 55.3, lon: 89.8, kind: 'icbm', note: 'Silos de R-36M2; previstos para Sarmat.' },
  { id: 'ru-barents', name: 'Submarino en el mar de Barents', country: 'Rusia', lat: 72, lon: 38, kind: 'slbm', note: 'Bastión de la Flota del Norte: submarinos de las clases Borei y Delfín.' },
  { id: 'cn-yumen', name: 'Campo de silos de Yumen (Gansu)', country: 'China', lat: 40.15, lon: 96.55, kind: 'icbm', note: 'Uno de los campos de silos descubiertos en 2021 por imágenes de satélite.' },
  { id: 'cn-hami', name: 'Campo de silos de Hami (Xinjiang)', country: 'China', lat: 42.6, lon: 93.0, kind: 'icbm', note: 'Campo de silos descubierto en 2021.' },
  { id: 'cn-luoyang', name: 'Luoyang (Henan)', country: 'China', lat: 34.6, lon: 112.45, kind: 'icbm', note: 'Mando de la Fuerza de Cohetes con brigadas de DF-5 y DF-41.' },
  { id: 'fr-longue', name: 'Submarino desde Île Longue (Bretaña)', country: 'Francia', lat: 47.0, lon: -10.0, kind: 'slbm', note: 'Submarinos de la clase Triomphant con misiles M51.' },
  { id: 'uk-faslane', name: 'Submarino desde Faslane (Escocia)', country: 'Reino Unido', lat: 58.5, lon: -12.0, kind: 'slbm', note: 'Submarinos de la clase Vanguard con misiles Trident II.' },
  { id: 'kp-sunan', name: 'Sunan (Pionyang)', country: 'Corea del Norte', lat: 39.2, lon: 125.67, kind: 'icbm', note: 'Lugar de varios lanzamientos de Hwasong-15 y Hwasong-17.' },
  { id: 'in-kalam', name: 'Isla Abdul Kalam (Odisha)', country: 'India', lat: 20.76, lon: 87.08, kind: 'irbm', note: 'Polígono de ensayos de los misiles Agni.' },
  { id: 'pk-sonmiani', name: 'Sonmiani (Baluchistán)', country: 'Pakistán', lat: 25.2, lon: 66.75, kind: 'irbm', note: 'Polígono de ensayos de los misiles Shaheen.' },
  { id: 'il-palmachim', name: 'Palmachim', country: 'Israel', lat: 31.9, lon: 34.69, kind: 'irbm', note: 'Base asociada a los misiles Jericó (no reconocidos oficialmente).' },
];

const RE = 6371;
/** distancia ortodrómica (km) */
export function greatCircleKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * RE * Math.asin(Math.min(1, Math.sqrt(a)));
}
/** puntos intermedios de la ortodrómica [lon, lat] */
export function greatCirclePath(lat1: number, lon1: number, lat2: number, lon2: number, n = 128): [number, number][] {
  const r = Math.PI / 180;
  const p1 = [Math.cos(lat1 * r) * Math.cos(lon1 * r), Math.cos(lat1 * r) * Math.sin(lon1 * r), Math.sin(lat1 * r)];
  const p2 = [Math.cos(lat2 * r) * Math.cos(lon2 * r), Math.cos(lat2 * r) * Math.sin(lon2 * r), Math.sin(lat2 * r)];
  const d = Math.acos(Math.max(-1, Math.min(1, p1[0] * p2[0] + p1[1] * p2[1] + p1[2] * p2[2])));
  const out: [number, number][] = [];
  let prevLon = lon1;
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = d < 1e-9 ? 1 - f : Math.sin((1 - f) * d) / Math.sin(d), B = d < 1e-9 ? f : Math.sin(f * d) / Math.sin(d);
    const x = A * p1[0] + B * p2[0], y = A * p1[1] + B * p2[1], z = A * p1[2] + B * p2[2];
    let lon = Math.atan2(y, x) / r;
    const lat = Math.atan2(z, Math.hypot(x, y)) / r;
    // continuidad al cruzar el antimeridiano (MapLibre admite longitudes > 180)
    while (lon - prevLon > 180) lon -= 360;
    while (lon - prevLon < -180) lon += 360;
    prevLon = lon;
    out.push([lon, lat]);
  }
  return out;
}

const interp = (xs: number[], ys: number[], x: number) => {
  if (x <= xs[0]) return ys[0] * (x / xs[0]);
  for (let i = 1; i < xs.length; i++) if (x <= xs[i]) { const k = (x - xs[i - 1]) / (xs[i] - xs[i - 1]); return ys[i - 1] + (ys[i] - ys[i - 1]) * k; }
  return ys[ys.length - 1];
};
/**
 * Trayectoria de energía mínima (sin rotación terrestre): tiempo de vuelo, apogeo y velocidad de
 * reentrada en función del alcance. Tabla basada en Wright (2017) y en los cálculos clásicos de
 * Kepler para una Tierra esférica.
 */
export function ballistic(rangeKm: number) {
  const R = [300, 1000, 2000, 3000, 5000, 8000, 10000, 12000, 14000, 16000, 20000];
  const T = [5.5, 9, 13, 16, 21, 27, 30, 33, 36, 39, 45]; // min
  const H = [85, 250, 450, 600, 850, 1100, 1250, 1300, 1300, 1250, 1100]; // km
  const V = [1.7, 3, 4.2, 5, 5.9, 6.7, 7.1, 7.3, 7.4, 7.5, 7.6]; // km/s
  const t = interp(R, T, rangeKm);
  const boost = rangeKm > 3000 ? 3 : rangeKm > 1000 ? 2 : 1;
  return {
    flightMin: t,
    apogeeKm: interp(R, H, rangeKm),
    reentryKms: interp(R, V, rangeKm),
    boostMin: boost,
    /** aviso aproximado: los satélites detectan el lanzamiento al minuto del despegue y el radar confirma después */
    warningMin: Math.max(1, t - 1.5),
  };
}
