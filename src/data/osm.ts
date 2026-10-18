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

/** edificios de OpenStreetMap dentro de cada radio (recuento en el servidor, sin descargar geometrías) */
export interface BuildingCounts { zones: { id: string; radiusM: number; count: number }[]; capped: boolean; maxR: number }
export async function fetchBuildingCounts(lat: number, lon: number, zones: { id: string; radiusM: number }[], capKm = 20): Promise<BuildingCounts | null> {
  if (!zones.length) return null;
  const maxR = capKm * 1000;
  const zs = zones.map((z) => ({ ...z, r: Math.round(Math.min(maxR, z.radiusM)) }));
  const body = '[out:json][timeout:90];' + zs.map((z) => `way["building"](around:${z.r},${lat.toFixed(5)},${lon.toFixed(5)});out count;`).join('');
  for (const url of ENDPOINTS) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 100000);
      const r = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: body }), signal: ctl.signal });
      clearTimeout(t);
      if (!r.ok) continue;
      const data = await r.json() as { elements: { type: string; tags?: { ways?: string; total?: string } }[] };
      const counts = data.elements.filter((e) => e.type === 'count').map((e) => +(e.tags?.ways ?? e.tags?.total ?? 0));
      if (counts.length !== zs.length) continue;
      return { zones: zs.map((z, i) => ({ id: z.id, radiusM: z.radiusM, count: counts[i] })), capped: zones.some((z) => z.radiusM > maxR), maxR };
    } catch { /* siguiente servidor */ }
  }
  return null;
}

/**
 * Refugios cercanos de OpenStreetMap: estaciones y bocas de metro, aparcamientos subterráneos y de
 * varias plantas y búnkeres o refugios antiaéreos señalados. Con el factor de protección orientativo
 * de cada tipo frente a la radiación de la lluvia radiactiva (FEMA, «Key Planning Factors», 2010).
 */
export interface Shelter { name: string; kind: 'metro' | 'parking' | 'parking-ms' | 'bunker'; lat: number; lon: number; distM: number }
export const SHELTER_KINDS: Record<Shelter['kind'], { label: string; pf: string; good: number }> = {
  metro: { label: 'Metro (subterráneo)', pf: 'protección muy alta (factor > 100)', good: 3 },
  bunker: { label: 'Refugio o búnker', pf: 'protección muy alta, si está abierto', good: 3 },
  parking: { label: 'Aparcamiento subterráneo', pf: 'protección alta (factor 50–200 en las plantas bajas)', good: 2 },
  'parking-ms': { label: 'Aparcamiento de varias plantas', pf: 'protección media (factor 10–40 en el centro de las plantas intermedias)', good: 1 },
};
export async function fetchShelters(lat: number, lon: number, radiusM = 2500): Promise<Shelter[] | null> {
  const a = `(around:${Math.round(radiusM)},${lat.toFixed(5)},${lon.toFixed(5)})`;
  const body = `[out:json][timeout:25];(node[railway=subway_entrance]${a};nwr[station=subway]${a};nwr[amenity=parking][parking~"^(underground|multi-storey)$"]${a};nwr[building=bunker]${a};nwr[military=bunker]${a};nwr[amenity=shelter][shelter_type=public_shelter]${a};);out center tags 300;`;
  let data: { elements: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] } | null = null;
  for (const url of ENDPOINTS) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 30000);
      const r = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: body }), signal: ctl.signal });
      clearTimeout(t);
      if (!r.ok) continue;
      data = await r.json();
      break;
    } catch { /* siguiente servidor */ }
  }
  if (!data) return null;
  const cos = Math.cos((lat * Math.PI) / 180);
  const out: Shelter[] = [];
  for (const e of data.elements) {
    const la = e.lat ?? e.center?.lat, lo = e.lon ?? e.center?.lon, g = e.tags ?? {};
    if (la === undefined || lo === undefined) continue;
    const kind: Shelter['kind'] = g.railway === 'subway_entrance' || g.station === 'subway' ? 'metro' : g.amenity === 'parking' ? (g.parking === 'underground' ? 'parking' : 'parking-ms') : 'bunker';
    // las bocas de metro sin nombre toman el de su estación más tarde; los búnkeres históricos en ruinas no sirven
    if (kind === 'bunker' && (g.ruins === 'yes' || g.abandoned === 'yes' || g.access === 'no')) continue;
    out.push({ name: g.name ?? g.ref ?? '', kind, lat: la, lon: lo, distM: Math.hypot((la - lat) * 110570, (lo - lon) * 111320 * cos) });
  }
  // una entrada por sitio: las bocas de una misma estación se agrupan (la más cercana)
  out.sort((x, y) => x.distM - y.distM);
  const seen: Shelter[] = [];
  for (const s of out) if (!seen.some((t) => t.kind === s.kind && Math.hypot((t.lat - s.lat) * 110570, (t.lon - s.lon) * 111320 * cos) < 150)) seen.push(s);
  return seen;
}
