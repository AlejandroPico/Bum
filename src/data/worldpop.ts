/**
 * Población real: rejillas de WorldPop 2020 (estimaciones por píxel de 100 m y 1 km) servidas por
 * el ImageServer público de WorldPop en ArcGIS. Se piden en crudo (float32, banda única) y se
 * convierten en densidad (hab/km²), que el modelo de víctimas usa en lugar del modelo urbano
 * aproximado allí donde la rejilla cubre el punto.
 */
import { addPopGrid, type PopGrid } from './cities';
export { addPopGrid };

const BASE = 'https://worldpop.arcgis.com/arcgis/rest/services';
const T2020 = 1577836800000;
const cache = new Map<string, PopGrid>();

export interface PopFetch { grid: PopGrid | null; error?: string }

/**
 * Carga la población real para un escenario: una rejilla amplia de 1 km y, en el centro, otra de
 * 100 m (más detalle donde los efectos son más intensos). Devuelve la fuente o null si falla.
 */
export async function loadRealPopulation(lat: number, lon: number, radiusKm: number): Promise<string | null> {
  const R = Math.max(5, radiusKm);
  const jobs = [R > 18 ? fetchPopGrid(lat, lon, R) : Promise.resolve<PopFetch>({ grid: null }), fetchPopGrid(lat, lon, Math.min(15, R))];
  const [broad, fine] = await Promise.all(jobs);
  if (broad.grid) addPopGrid(broad.grid);
  if (fine.grid) addPopGrid(fine.grid);
  if (!broad.grid && !fine.grid) return null;
  return fine.grid && broad.grid ? 'WorldPop 2020 (100 m y 1 km)' : (fine.grid ?? broad.grid)!.source;
}

/** pide la rejilla que cubre un círculo de `radiusKm` alrededor del punto (máx. ~600 km) */
export async function fetchPopGrid(lat: number, lon: number, radiusKm: number, timeoutMs = 14000): Promise<PopFetch> {
  const R = Math.max(2, Math.min(650, radiusKm));
  const fine = R <= 18; // 100 m para radios pequeños
  const svc = fine ? 'WorldPop_Total_Population_100m' : 'WorldPop_Total_Population_1km';
  const native = fine ? 0.000833333 : 0.00833333;
  const cos = Math.max(0.05, Math.cos((lat * Math.PI) / 180));
  const dLat = R / 110.57, dLon = R / (111.32 * cos);
  const lat0 = Math.min(84, lat + dLat), lat1 = Math.max(-72, lat - dLat);
  const lon0 = Math.max(-180, lon - dLon), lon1 = Math.min(180, lon + dLon);
  // tamaño: resolución nativa si cabe, como mucho 480 px por lado
  const w = Math.max(16, Math.min(480, Math.round((lon1 - lon0) / native)));
  const h = Math.max(16, Math.min(480, Math.round((lat0 - lat1) / native)));
  const key = `${svc}|${lat0.toFixed(3)}|${lon0.toFixed(3)}|${w}x${h}`;
  const hit = cache.get(key);
  if (hit) return { grid: hit };
  const url = `${BASE}/${svc}/ImageServer/exportImage?bbox=${lon0},${lat1},${lon1},${lat0}&bboxSR=4326&imageSR=4326&size=${w},${h}` +
    `&format=bsq&pixelType=F32&noData=0&interpolation=RSP_NearestNeighbor&time=${T2020}&f=image`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) return { grid: null, error: `HTTP ${r.status}` };
    const buf = await r.arrayBuffer();
    // tras los datos va una máscara de validez de 1 bit por píxel
    if (buf.byteLength < w * h * 4) return { grid: null, error: 'respuesta incompleta' };
    const raw = new Float32Array(buf, 0, w * h);
    const dens = new Float32Array(w * h);
    let total = 0;
    for (let j = 0; j < h; j++) {
      const la = lat0 - ((j + 0.5) / h) * (lat0 - lat1);
      // área de un píxel NATIVO (los valores son personas por píxel nativo)
      const cellKm2 = (native * 110.57) * (native * 111.32 * Math.cos((la * Math.PI) / 180));
      const pxKm2 = ((lat0 - lat1) / h) * 110.57 * ((lon1 - lon0) / w) * 111.32 * Math.cos((la * Math.PI) / 180);
      for (let i = 0; i < w; i++) {
        const v = raw[j * w + i];
        const d = Number.isFinite(v) && v > 0 && v < 1e6 ? v / cellKm2 : 0;
        dens[j * w + i] = d;
        total += d * pxKm2;
      }
    }
    const grid: PopGrid = { w, h, lat0, lon0, dLat: (lat0 - lat1) / h, dLon: (lon1 - lon0) / w, dens, total, source: fine ? 'WorldPop 2020 (100 m)' : 'WorldPop 2020 (1 km)' };
    cache.set(key, grid);
    if (cache.size > 8) cache.delete(cache.keys().next().value!);
    return { grid };
  } catch (e) {
    return { grid: null, error: (e as Error).name === 'AbortError' ? 'tiempo agotado' : String(e) };
  } finally {
    clearTimeout(timer);
  }
}
