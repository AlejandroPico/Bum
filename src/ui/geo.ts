/**
 * Utilidades geográficas de la interfaz: lectura de coordenadas escritas a mano y tiempo real
 * (Open-Meteo, gratuito y sin clave — datos CC BY 4.0).
 */

/**
 * Interpreta coordenadas en los formatos habituales:
 *  - decimal: "40.4168, -3.7038" · "40.4168 -3.7038" · "40,4168; -3,7038"
 *  - con hemisferio: "40.4168 N, 3.7038 W" (también O = oeste)
 *  - grados-minutos-segundos: 40°25'08"N 3°42'14"O
 *  - enlaces de mapas con "@lat,lon"
 */
export function parseCoords(q: string): { lat: number; lon: number } | null {
  const s = q.trim();
  const ok = (lat: number, lon: number) => (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null);
  let m = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (m) return ok(+m[1], +m[2]);
  m = s.match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (m) return ok(+m[1], +m[2]);
  m = s.match(/^(-?\d+,\d+)\s*[;\s]\s*(-?\d+,\d+)$/);
  if (m) return ok(+m[1].replace(',', '.'), +m[2].replace(',', '.'));

  // con hemisferios y/o grados-minutos-segundos
  const U = s.toUpperCase().replace(/[′’]/g, "'").replace(/[″”]/g, '"').replace(/''/g, '"').replace(/º/g, '°');
  if (!/[NSEWO°'"]/.test(U)) return null;
  // hemisferio delante ("N 40.4 W 3.7") o detrás ("40.4 N 3.7 W")
  const pre = /^[NSEWO]/.test(U.trim());
  const re = pre
    ? /([NSEWO])\s*(-?\d+(?:[.,]\d+)?)\s*°?\s*(?:(\d+(?:[.,]\d+)?)\s*'\s*)?(?:(\d+(?:[.,]\d+)?)\s*"\s*)?()/g
    : /()(-?\d+(?:[.,]\d+)?)\s*°?\s*(?:(\d+(?:[.,]\d+)?)\s*'\s*)?(?:(\d+(?:[.,]\d+)?)\s*"\s*)?([NSEWO])?/g;
  const parts: { v: number; hemi?: string }[] = [];
  let k: RegExpExecArray | null;
  while ((k = re.exec(U)) && parts.length < 2) {
    if (!k[2]) { re.lastIndex++; continue; }
    const num = (x?: string) => (x ? +x.replace(',', '.') : 0);
    let v = Math.abs(num(k[2])) + num(k[3]) / 60 + num(k[4]) / 3600;
    if (k[2].startsWith('-')) v = -v;
    const hemi = k[1] || k[5];
    if (hemi === 'S' || hemi === 'W' || hemi === 'O') v = -Math.abs(v);
    parts.push({ v, hemi });
    if (k[0].length === 0) re.lastIndex++;
  }
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  const isLon = (p: { hemi?: string }) => p.hemi === 'E' || p.hemi === 'W' || p.hemi === 'O';
  return isLon(a) && !isLon(b) ? ok(b.v, a.v) : ok(a.v, b.v);
}

import type { WindLevel } from '../physics/types';

export interface Weather {
  /** viento en superficie (10 m) */
  surfaceWindKmh: number;
  surfaceWindFromDeg: number;
  /** perfil vertical: 10 m, 850, 700, 500, 300, 250 y 200 hPa */
  profile: WindLevel[];
  humidity: number;
  visibilityKm: number;
  tempC: number;
  cloudPct: number;
  /** precipitación actual (mm/h) */
  rainMmH: number;
  /** hora local decimal en el objetivo */
  hour: number;
  localTime: string;
}

const LEVELS: [string, number][] = [['850hPa', 1460], ['700hPa', 3010], ['500hPa', 5570], ['300hPa', 9160], ['250hPa', 10360], ['200hPa', 11790]];
const CACHE_MS = 20 * 60 * 1000;

/** caché local de respuestas (respeta los límites de la API gratuita) */
function cacheGet<T>(key: string, maxAge: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw);
    return Date.now() - t < maxAge ? (v as T) : null;
  } catch { return null; }
}
function cacheSet(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), v })); } catch { /* sin almacenamiento */ }
}

export async function fetchWeather(lat: number, lon: number): Promise<Weather> {
  const key = `bum:wx2:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cacheGet<Weather>(key, CACHE_MS);
  if (hit) return hit;
  const lv = LEVELS.map(([l]) => `wind_speed_${l},wind_direction_${l},geopotential_height_${l}`).join(',');
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`
    + '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,cloud_cover,precipitation'
    + `&hourly=visibility,${lv}`
    + '&forecast_hours=1&wind_speed_unit=kmh&timezone=auto';
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const js = await r.json();
    const cur = js.current ?? {};
    const hr = js.hourly ?? {};
    const elev = +(js.elevation ?? 0);
    const first = (k: string): number | null => (Array.isArray(hr[k]) && hr[k][0] != null ? +hr[k][0] : null);
    const sSp = +(cur.wind_speed_10m ?? 0), sDir = +(cur.wind_direction_10m ?? 0);
    const profile: WindLevel[] = [{ zM: 10, kmh: sSp, fromDeg: sDir }];
    for (const [l, zStd] of LEVELS) {
      const sp = first(`wind_speed_${l}`), dir = first(`wind_direction_${l}`), gh = first(`geopotential_height_${l}`);
      if (sp == null || dir == null) continue;
      const z = (gh ?? zStd) - elev;
      if (z > 20) profile.push({ zM: z, kmh: sp, fromDeg: dir });
    }
    const time: string = cur.time ?? '';
    const tm = time.match(/T(\d{2}):(\d{2})/);
    const hour = tm ? +tm[1] + +tm[2] / 60 : 12;
    const vis = first('visibility');
    const w: Weather = {
      surfaceWindKmh: sSp, surfaceWindFromDeg: sDir, profile,
      humidity: +(cur.relative_humidity_2m ?? 60),
      visibilityKm: vis != null ? vis / 1000 : 25,
      tempC: +(cur.temperature_2m ?? 15),
      cloudPct: +(cur.cloud_cover ?? 0),
      rainMmH: +(cur.precipitation ?? 0),
      hour, localTime: tm ? `${tm[1]}:${tm[2]}` : '—',
    };
    cacheSet(key, w);
    return w;
  } finally {
    clearTimeout(to);
  }
}

export { cacheGet, cacheSet };
