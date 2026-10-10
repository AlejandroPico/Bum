/**
 * Temas de la interfaz: día, tarde y noche, o automático según la altura del Sol en el lugar
 * del ordenador (fecha y hora locales). La ubicación se estima por la zona horaria del sistema,
 * así que el cambio a tarde o noche sigue las estaciones: en invierno oscurece antes.
 */
export type ThemeId = 'day' | 'evening' | 'night';
export type ThemeChoice = ThemeId | 'auto';

/** hora «equivalente» con la que se ilumina el mapa en cada tema */
export const THEME_HOUR: Record<ThemeId, number> = { day: 12.5, evening: 17.4, night: 23 };

export const THEME_NAMES: Record<ThemeChoice, string> = { day: 'Día', evening: 'Tarde', night: 'Noche', auto: 'Automático' };

const S = 'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square"';
export const THEME_ICONS: Record<ThemeChoice, string> = {
  day: `<svg ${S}><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>`,
  evening: `<svg ${S}><path d="M2 18h20M5 21h14"/><path d="M6.5 18a5.5 5.5 0 0 1 11 0"/><path d="M12 6v3M4.6 9.6l2 2M19.4 9.6l-2 2"/></svg>`,
  night: `<svg ${S}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>`,
  auto: `<svg ${S}><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/></svg>`,
};

/** coordenadas aproximadas de las zonas horarias más comunes */
const TZ: Record<string, [number, number]> = {
  'Europe/Madrid': [40.4, -3.7], 'Atlantic/Canary': [28.1, -15.4], 'Europe/Lisbon': [38.7, -9.1], 'Europe/London': [51.5, -0.1],
  'Europe/Dublin': [53.3, -6.3], 'Europe/Paris': [48.9, 2.35], 'Europe/Brussels': [50.8, 4.35], 'Europe/Amsterdam': [52.4, 4.9],
  'Europe/Berlin': [52.5, 13.4], 'Europe/Zurich': [47.4, 8.5], 'Europe/Rome': [41.9, 12.5], 'Europe/Vienna': [48.2, 16.4],
  'Europe/Warsaw': [52.2, 21], 'Europe/Prague': [50.1, 14.4], 'Europe/Stockholm': [59.3, 18.1], 'Europe/Oslo': [59.9, 10.8],
  'Europe/Helsinki': [60.2, 24.9], 'Europe/Athens': [38, 23.7], 'Europe/Istanbul': [41, 29], 'Europe/Kiev': [50.45, 30.5],
  'Europe/Kyiv': [50.45, 30.5], 'Europe/Moscow': [55.75, 37.6], 'Africa/Casablanca': [33.6, -7.6], 'Africa/Cairo': [30, 31.2],
  'Africa/Lagos': [6.5, 3.4], 'Africa/Johannesburg': [-26.2, 28], 'Asia/Dubai': [25.2, 55.3], 'Asia/Kolkata': [22.6, 88.4],
  'Asia/Shanghai': [31.2, 121.5], 'Asia/Hong_Kong': [22.3, 114.2], 'Asia/Tokyo': [35.7, 139.7], 'Asia/Seoul': [37.6, 127],
  'Asia/Singapore': [1.35, 103.8], 'Asia/Bangkok': [13.75, 100.5], 'Asia/Jakarta': [-6.2, 106.8], 'Australia/Sydney': [-33.9, 151.2],
  'Australia/Melbourne': [-37.8, 145], 'Australia/Perth': [-31.95, 115.9], 'Pacific/Auckland': [-36.85, 174.8],
  'America/New_York': [40.7, -74], 'America/Chicago': [41.9, -87.6], 'America/Denver': [39.7, -105], 'America/Phoenix': [33.4, -112],
  'America/Los_Angeles': [34, -118.2], 'America/Toronto': [43.7, -79.4], 'America/Vancouver': [49.3, -123.1],
  'America/Mexico_City': [19.4, -99.1], 'America/Guatemala': [14.6, -90.5], 'America/Havana': [23.1, -82.4],
  'America/Bogota': [4.7, -74.1], 'America/Caracas': [10.5, -66.9], 'America/Lima': [-12, -77], 'America/La_Paz': [-16.5, -68.1],
  'America/Santiago': [-33.4, -70.6], 'America/Argentina/Buenos_Aires': [-34.6, -58.4], 'America/Buenos_Aires': [-34.6, -58.4],
  'America/Montevideo': [-34.9, -56.2], 'America/Asuncion': [-25.3, -57.6], 'America/Sao_Paulo': [-23.5, -46.6],
  'America/Panama': [9, -79.5], 'America/Costa_Rica': [9.9, -84.1], 'America/Santo_Domingo': [18.5, -69.9], 'America/Puerto_Rico': [18.4, -66.1],
};

/** ubicación aproximada del ordenador a partir de su zona horaria */
export function guessLocation(): [number, number] {
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''; } catch { /* sin Intl */ }
  if (TZ[tz]) return TZ[tz];
  const lon = Math.max(-180, Math.min(180, (-new Date().getTimezoneOffset() / 60) * 15));
  const south = /^(Australia|Antarctica|America\/(Argentina|Santiago|Sao_Paulo|Montevideo|Asuncion|Lima|La_Paz))|Pacific\/(Auckland|Fiji)|Africa\/(Johannesburg|Maputo|Harare)/.test(tz);
  return [south ? -30 : 40, lon];
}

/** altura del Sol (grados) en un instante y lugar */
export function sunElevation(date: Date, lat: number, lon: number): number {
  const rad = Math.PI / 180;
  const d = date.getTime() / 86400000 + 2440587.5 - 2451545.0; // días desde J2000
  const g = (357.529 + 0.98560028 * d) * rad;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const e = (23.439 - 0.00000036 * d) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = (((18.697374558 + 24.06570982441908 * d) % 24) + 24) % 24;
  const H = (gmst * 15 + lon) * rad - ra;
  return Math.asin(Math.sin(lat * rad) * Math.sin(dec) + Math.cos(lat * rad) * Math.cos(dec) * Math.cos(H)) / rad;
}

/** tema que toca ahora mismo: de día con el Sol alto, de tarde en el crepúsculo, de noche con el Sol bajo el horizonte */
export function autoTheme(date = new Date()): ThemeId {
  const [lat, lon] = guessLocation();
  const el = sunElevation(date, lat, lon);
  return el > 8 ? 'day' : el > -7 ? 'evening' : 'night';
}

export function resolveTheme(c: ThemeChoice): ThemeId { return c === 'auto' ? autoTheme() : c; }

export function applyThemeClass(t: ThemeId) {
  document.documentElement.dataset.theme = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', t === 'day' ? '#f4f5f8' : t === 'evening' ? '#1e141a' : '#0b0e15');
}
