/**
 * Infraestructuras reales dentro de cada zona de daño, contadas con la API Overpass de
 * OpenStreetMap (hospitales, colegios, bomberos, centrales eléctricas, aeropuertos…).
 * Una sola consulta: cada categoría termina con un elemento marcador («make») que indica a qué
 * categoría pertenecen los elementos anteriores.
 */
export interface InfraCat { key: string; label: string; q: string }
export const INFRA: InfraCat[] = [
  { key: 'hosp', label: 'Hospitales', q: 'nwr[amenity=hospital]' },
  { key: 'clin', label: 'Centros de salud', q: 'nwr[amenity~"^(clinic|doctors)$"]' },
  { key: 'fire', label: 'Parques de bomberos', q: 'nwr[amenity=fire_station]' },
  { key: 'pol', label: 'Comisarías', q: 'nwr[amenity=police]' },
  { key: 'sch', label: 'Colegios y guarderías', q: 'nwr[amenity~"^(school|kindergarten)$"]' },
  { key: 'uni', label: 'Universidades', q: 'nwr[amenity~"^(university|college)$"]' },
  { key: 'pow', label: 'Centrales eléctricas', q: 'nwr[power=plant]' },
  { key: 'sub', label: 'Subestaciones', q: 'nwr[power=substation]' },
  { key: 'wat', label: 'Potabilizadoras y depuradoras', q: 'nwr[man_made~"^(water_works|wastewater_plant)$"]' },
  { key: 'air', label: 'Aeropuertos y aeródromos', q: 'nwr[aeroway=aerodrome]' },
  { key: 'rail', label: 'Estaciones de tren y metro', q: 'nwr[railway=station]' },
  { key: 'fuel', label: 'Gasolineras', q: 'nwr[amenity=fuel]' },
];

const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];

export interface InfraZone { id: string; label: string; radiusM: number; counts: Record<string, number> }
export interface InfraResult { zones: InfraZone[]; capped: boolean; maxR: number }

/** cuenta las infraestructuras dentro de cada radio (acumulado desde la zona cero) */
export async function fetchInfrastructure(lat: number, lon: number, zones: { id: string; label: string; radiusM: number }[], capKm = 25): Promise<InfraResult | null> {
  if (!zones.length) return null;
  const maxR = Math.min(capKm * 1000, Math.max(...zones.map((z) => z.radiusM)));
  const R = Math.round(maxR);
  const body = '[out:json][timeout:60];' + INFRA.map((c) => `(${c.q}(around:${R},${lat.toFixed(5)},${lon.toFixed(5)}););out ids center;make m c="${c.key}";out;`).join('');
  let data: { elements: { type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: { c?: string } }[] } | null = null;
  for (const url of ENDPOINTS) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 70000);
      const r = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: body }), signal: ctl.signal });
      clearTimeout(t);
      if (!r.ok) continue;
      data = await r.json();
      break;
    } catch { /* siguiente servidor */ }
  }
  if (!data) return null;
  const out: InfraZone[] = zones.map((z) => ({ ...z, counts: Object.fromEntries(INFRA.map((c) => [c.key, 0])) }));
  const cos = Math.cos((lat * Math.PI) / 180);
  let pending: { la: number; lo: number }[] = [];
  for (const e of data.elements) {
    if (e.type === 'm') {
      const key = e.tags?.c ?? '';
      for (const p of pending) {
        const d = Math.hypot((p.la - lat) * 110570, (p.lo - lon) * 111320 * cos);
        for (const z of out) if (d <= z.radiusM && d <= maxR) z.counts[key] = (z.counts[key] ?? 0) + 1;
      }
      pending = [];
      continue;
    }
    const la = e.lat ?? e.center?.lat, lo = e.lon ?? e.center?.lon;
    if (la !== undefined && lo !== undefined) pending.push({ la, lo });
  }
  return { zones: out, capped: Math.max(...zones.map((z) => z.radiusM)) > maxR, maxR };
}
