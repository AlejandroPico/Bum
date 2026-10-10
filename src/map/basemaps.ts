import type { Map as MLMap, LayerSpecification } from 'maplibre-gl';

/**
 * Mapas base intercambiables. Se insertan por debajo del sombreado y de las capas del
 * simulador, de modo que cambiar de mapa no borra los efectos dibujados.
 */
export type BasemapId = 'relieve' | 'satelite' | 'sentinel' | 'politico' | 'oscuro' | 'callejero' | 'topo';

export const BASEMAPS: { id: BasemapId; name: string; desc: string }[] = [
  { id: 'relieve', name: 'Satélite con relieve', desc: 'Imágenes de satélite (Esri) con sombreado del terreno' },
  { id: 'satelite', name: 'Satélite', desc: 'Imágenes de satélite (Esri) sin sombreado' },
  { id: 'sentinel', name: 'Satélite Sentinel-2', desc: 'Mosaico sin nubes de Sentinel-2 (EOX), alternativa a Esri' },
  { id: 'politico', name: 'Político claro', desc: 'Mapa plano con fronteras, provincias y ciudades' },
  { id: 'oscuro', name: 'Político oscuro', desc: 'Mapa plano oscuro, ideal para ver los efectos' },
  { id: 'callejero', name: 'Callejero (OpenStreetMap)', desc: 'Mapa estándar de OpenStreetMap' },
  { id: 'topo', name: 'Topográfico', desc: 'Mapa topográfico (Esri World Topo)' },
];

const RASTER: Partial<Record<BasemapId, { tiles: string[]; maxzoom: number; attribution: string; tileSize?: number }>> = {
  relieve: { tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], maxzoom: 19, attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics' },
  satelite: { tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], maxzoom: 19, attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics' },
  sentinel: { tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg'], maxzoom: 15, attribution: '<a href="https://s2maps.eu" target="_blank">Sentinel-2 cloudless</a> de EOX IT Services GmbH (datos modificados de Copernicus Sentinel 2020)' },
  callejero: { tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], maxzoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">colaboradores de OpenStreetMap</a>' },
  topo: { tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'], maxzoom: 19, attribution: 'Mapa © Esri, HERE, Garmin, USGS, NGA' },
};

/** paleta de los mapas vectoriales */
const VEC = {
  politico: { bg: '#f2efe9', water: '#a9cbe6', land: '#e7e3da', wood: '#d6e3c8', road: '#ffffff', road2: '#f3d9a4', bnd: '#8c6fa8', bnd2: '#b8a6c9', text: '#3b3f47', halo: '#ffffff', bld: '#d9d4cc' },
  oscuro: { bg: '#0d1117', water: '#14273a', land: '#12161d', wood: '#141c18', road: '#252c38', road2: '#3a3326', bnd: '#7a6aa0', bnd2: '#4a4360', text: '#c9d1dd', halo: '#05070a', bld: '#3a404a' },
};

export const BASE_RASTER_LAYER = 'base-raster';
const VEC_LAYERS = ['vb-bg', 'vb-land', 'vb-wood', 'vb-water', 'vb-road2', 'vb-road', 'vb-bnd2', 'vb-bnd', 'vb-labels'];

let current: BasemapId = 'relieve';
export const currentBasemap = () => current;
export const isVectorBase = (id: BasemapId = current) => id === 'politico' || id === 'oscuro';

export function setBasemap(map: MLMap, id: BasemapId, before = 'hillshade') {
  current = id;
  // quita la base anterior
  if (map.getLayer(BASE_RASTER_LAYER)) map.removeLayer(BASE_RASTER_LAYER);
  for (const l of VEC_LAYERS) if (map.getLayer(l)) map.removeLayer(l);
  for (const k of Object.keys(RASTER)) if (map.getSource(`base-${k}`) && k !== id) map.removeSource(`base-${k}`);
  if (map.getLayer('sat')) map.removeLayer('sat');
  const beforeId = map.getLayer(before) ? before : undefined;

  const r = RASTER[id];
  if (r) {
    const src = `base-${id}`;
    if (!map.getSource(src)) map.addSource(src, { type: 'raster', tiles: r.tiles, tileSize: r.tileSize ?? 256, maxzoom: r.maxzoom, attribution: r.attribution });
    const sat = id === 'relieve' || id === 'satelite' || id === 'sentinel';
    map.addLayer({ id: BASE_RASTER_LAYER, type: 'raster', source: src, paint: sat ? { 'raster-saturation': -0.18, 'raster-contrast': 0.12, 'raster-brightness-max': 0.92, 'raster-fade-duration': 200 } : { 'raster-fade-duration': 200 } }, beforeId);
  } else {
    const c = VEC[id as 'politico' | 'oscuro'];
    const name = ['coalesce', ['get', 'name:es'], ['get', 'name']] as unknown as string;
    const layers: LayerSpecification[] = [
      { id: 'vb-bg', type: 'background', paint: { 'background-color': c.bg } },
      { id: 'vb-land', type: 'fill', source: 'omt', 'source-layer': 'landuse', paint: { 'fill-color': c.land, 'fill-opacity': 0.6 } },
      { id: 'vb-wood', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass', 'forest']]], paint: { 'fill-color': c.wood, 'fill-opacity': 0.7 } },
      { id: 'vb-water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': c.water } },
      { id: 'vb-road2', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]], paint: { 'line-color': c.road2, 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 5, 0.4, 10, 1.6, 15, 8] } },
      { id: 'vb-road', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 9, filter: ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary', 'minor', 'street']]], paint: { 'line-color': c.road, 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 9, 0.3, 13, 1.2, 16, 6] } },
      { id: 'vb-bnd2', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['all', ['>=', ['get', 'admin_level'], 3], ['<=', ['get', 'admin_level'], 6], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': c.bnd2, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.4, 10, 1.2], 'line-dasharray': [3, 2] } },
      { id: 'vb-bnd', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['all', ['<=', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': c.bnd, 'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.8, 8, 2.2] } },
      { id: 'vb-labels', type: 'symbol', source: 'omt', 'source-layer': 'place', filter: ['in', ['get', 'class'], ['literal', ['country', 'state', 'province']]], layout: { 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-size': ['match', ['get', 'class'], 'country', 13, 11], 'text-transform': 'uppercase', 'text-letter-spacing': 0.12, 'text-max-width': 8 }, paint: { 'text-color': c.text, 'text-halo-color': c.halo, 'text-halo-width': 1.2, 'text-opacity': 0.8 } },
    ];
    for (const l of layers) map.addLayer(l, beforeId);
  }
  // sombreado sólo en la variante "con relieve" y en el topográfico
  if (map.getLayer('hillshade')) map.setLayoutProperty('hillshade', 'visibility', id === 'relieve' || id === 'topo' || id === 'politico' ? 'visible' : 'none');
  if (map.getLayer('hillshade')) map.setPaintProperty('hillshade', 'hillshade-exaggeration', id === 'relieve' ? 0.35 : 0.2);
  // edificios y etiquetas a juego
  if (map.getLayer('buildings')) map.setLayoutProperty('buildings', 'visibility', 'visible');
  if (map.getLayer('place-labels')) {
    const dark = id !== 'politico' && id !== 'callejero' && id !== 'topo';
    map.setPaintProperty('place-labels', 'text-color', dark ? 'rgba(235,240,250,0.85)' : '#2b2f36');
    map.setPaintProperty('place-labels', 'text-halo-color', dark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.85)');
  }
}

/** brillo nocturno de la base: las bases claras también se oscurecen un poco de noche */
export function dimBase(map: MLMap, night: number) {
  if (map.getLayer(BASE_RASTER_LAYER)) {
    const sat = current === 'relieve' || current === 'satelite' || current === 'sentinel';
    map.setPaintProperty(BASE_RASTER_LAYER, 'raster-brightness-max', sat ? 0.92 - night * 0.8 : 1 - night * 0.55);
    if (sat) map.setPaintProperty(BASE_RASTER_LAYER, 'raster-saturation', -0.18 - night * 0.5);
  }
  if (map.getLayer('vb-bg') && current === 'politico') {
    map.setPaintProperty('vb-bg', 'background-color', night > 0.5 ? '#b9b6b0' : '#f2efe9');
  }
}
