/**
 * Partículas de la lluvia radiactiva en el mapa: una muestra de las que simula el modelo
 * lagrangiano, en su posición de cada instante. Las que siguen en el aire van coloreadas por su
 * altura (blancas arriba, amarillas a media altura, naranjas a punto de tocar el suelo); las que ya
 * han caído quedan como puntos verdes oscuros. Así se ve llegar la pluma, curvarse con el viento y
 * posarse, en lugar de un óvalo que crece.
 */
import type { Map as MLMap, GeoJSONSource } from 'maplibre-gl';
import type { FalloutTracks } from '../physics/fallout';
import { localToLngLat } from './overlays';

const ID = 'fx-fallpts';
export interface FallSet { tracks: FalloutTracks; lat: number; lon: number; delay: number }

export class FalloutParticles {
  private map: MLMap;
  private sets: FallSet[] = [];
  private lastKey = '';
  /** oculto desde la pestaña Efectos */
  hidden = false;
  /** segundo en que ha caído la última partícula (después ya no se dibujan) */
  endS = 0;
  constructor(map: MLMap) { this.map = map; }
  setHidden(v: boolean) { this.hidden = v; this.lastKey = ''; }

  set(sets: FallSet[]) {
    this.sets = sets.filter((s) => s.tracks && s.tracks.n > 0);
    this.lastKey = '';
    this.endS = 0;
    for (const s of this.sets) for (let i = 0; i < s.tracks.n; i++) {
      const l = s.tracks.landS[i];
      this.endS = Math.max(this.endS, s.delay + (Number.isFinite(l) ? l : 48 * 3600));
    }
    this.ensure();
    this.update(-1);
  }

  private ensure() {
    const m = this.map;
    if (m.getSource(ID)) return;
    m.addSource(ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    m.addLayer({ id: ID, type: 'circle', source: ID, paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, ['case', ['get', 'air'], 1.6, 1], 9, ['case', ['get', 'air'], 2.6, 1.6], 13, ['case', ['get', 'air'], 3.4, 2.2]],
      'circle-color': ['case', ['get', 'air'], ['interpolate', ['linear'], ['get', 'z'], 0, '#f97316', 2, '#facc15', 6, '#f5f5dc', 14, '#ffffff'], '#3f6212'],
      'circle-opacity': ['case', ['get', 'air'], 0.85, 0.55],
      'circle-blur': 0.25,
      'circle-pitch-alignment': 'map',
    } });
  }

  /** dibuja el instante t (s desde la explosión); negativo para vaciar */
  update(t: number) {
    const src = this.map.getSource(ID) as GeoJSONSource | undefined;
    if (!src) return;
    const off = this.hidden || t < 0 || !this.sets.length || t > this.endS + 1800;
    const key = off ? 'off' : String(Math.round(t / 30));
    if (key === this.lastKey) return;
    this.lastKey = key;
    if (off) { src.setData({ type: 'FeatureCollection', features: [] }); return; }
    const feats: GeoJSON.Feature[] = [];
    for (const s of this.sets) {
      const ts = t - s.delay;
      if (ts < 0) continue;
      const T = s.tracks;
      for (let i = 0; i < T.n; i++) {
        const a = T.off[i], b = T.off[i + 1] - 1;
        if (b < a) continue;
        const x = Math.min(b - a, ts / T.dtS), k = Math.min(b - a - 1, Math.floor(x)), f = x - Math.max(0, k);
        let e: number, n: number, z: number;
        if (b === a || x >= b - a) { e = T.xyz[b * 3]; n = T.xyz[b * 3 + 1]; z = T.xyz[b * 3 + 2]; }
        else {
          const p = (a + Math.max(0, k)) * 3;
          e = T.xyz[p] + (T.xyz[p + 3] - T.xyz[p]) * f; n = T.xyz[p + 1] + (T.xyz[p + 4] - T.xyz[p + 1]) * f; z = T.xyz[p + 2] + (T.xyz[p + 5] - T.xyz[p + 2]) * f;
        }
        const air = ts < T.landS[i];
        feats.push({ type: 'Feature', properties: { air, z: z / 1000 }, geometry: { type: 'Point', coordinates: localToLngLat(s.lat, s.lon, e, n) } });
      }
    }
    src.setData({ type: 'FeatureCollection', features: feats });
  }
}
