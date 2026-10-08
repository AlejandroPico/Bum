import maplibregl, { type StyleSpecification, type Map as MLMap } from 'maplibre-gl';

export const SOURCES = {
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  terrarium: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
  // mismo conjunto de datos servido desde otro host: evita colisiones de caché/CORS entre las dos fuentes
  terrariumAlt: 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png',
  vector: 'https://tiles.openfreemap.org/planet',
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
};

export const BUILDING_COLOR = '#d9d4cc';

function style(): StyleSpecification {
  return {
    version: 8,
    glyphs: SOURCES.glyphs,
    sources: {
      satellite: {
        type: 'raster',
        tiles: [SOURCES.satellite],
        tileSize: 256,
        maxzoom: 19,
        attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics',
      },
      terrain: {
        type: 'raster-dem',
        tiles: [SOURCES.terrarium],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 14,
        attribution: 'Relieve: Mapzen / AWS Terrain Tiles',
      },
      hillshadeSrc: {
        type: 'raster-dem',
        tiles: [SOURCES.terrariumAlt],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 13,
      },
      omt: {
        type: 'vector',
        url: SOURCES.vector,
        attribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#020306' } },
      {
        id: 'sat',
        type: 'raster',
        source: 'satellite',
        paint: { 'raster-saturation': -0.18, 'raster-contrast': 0.12, 'raster-brightness-max': 0.92, 'raster-fade-duration': 200 },
      },
      {
        id: 'hillshade',
        type: 'hillshade',
        source: 'hillshadeSrc',
        paint: { 'hillshade-exaggeration': 0.35, 'hillshade-shadow-color': '#0a0d14', 'hillshade-highlight-color': '#ffffff', 'hillshade-accent-color': '#1b2030' },
      },
      // luces de la ciudad (sólo visibles de noche)
      {
        id: 'city-lights-glow',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'street']]],
        paint: {
          'line-color': '#ffb35c',
          'line-opacity': 0,
          'line-blur': 6,
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 8, 1.5, 12, 4, 16, 18],
        },
      },
      {
        id: 'city-lights',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'street']]],
        paint: {
          'line-color': '#ffd59a',
          'line-opacity': 0,
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 8, 0.3, 12, 0.8, 16, 3],
        },
      },
      {
        id: 'buildings',
        type: 'fill-extrusion',
        source: 'omt',
        'source-layer': 'building',
        minzoom: 12.5,
        paint: {
          'fill-extrusion-color': BUILDING_COLOR,
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 12.5, 0, 13.5, 0.92],
          'fill-extrusion-vertical-gradient': true,
        },
      },
      {
        id: 'place-labels',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'place',
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'capital', 'state', 'country']]],
        layout: {
          'text-field': ['coalesce', ['get', 'name:es'], ['get', 'name']],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 11, 10, 14, 14, 16],
          'text-letter-spacing': 0.06,
          'text-transform': 'uppercase',
          'text-max-width': 8,
        },
        paint: { 'text-color': 'rgba(235,240,250,0.85)', 'text-halo-color': 'rgba(0,0,0,0.75)', 'text-halo-width': 1.4 },
      },
    ],
    terrain: { source: 'terrain', exaggeration: 1 },
    sky: {
      'sky-color': '#4f8fd6',
      'horizon-color': '#cfe2f3',
      'fog-color': '#c8d8e6',
      'fog-ground-blend': 0.7,
      'horizon-fog-blend': 0.6,
      'sky-horizon-blend': 0.6,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 1, 12, 0],
    },
    light: { anchor: 'map', position: [1.4, 210, 40], color: '#ffffff', intensity: 0.35 },
  };
}

export function createMap(container: HTMLElement, center: [number, number]): MLMap {
  const map = new maplibregl.Map({
    container,
    style: style(),
    center,
    zoom: 12.6,
    pitch: 62,
    bearing: -20,
    maxPitch: 85,
    canvasContextAttributes: { antialias: true, preserveDrawingBuffer: false },
    attributionControl: { compact: true },
    fadeDuration: 150,
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
  return map;
}

export interface Atmosphere {
  night: number; // 0 día · 1 noche
}

/** Ajusta cielo, luz y brillo de la imagen según la hora del día. */
export function applyTimeOfDay(map: MLMap, hour: number) {
  const sunAlt = Math.sin((Math.PI * (hour - 6)) / 12); // -1..1
  const night = Math.min(1, Math.max(0, (0.15 - sunAlt) / 0.35));
  const dusk = Math.max(0, 1 - Math.abs(sunAlt) / 0.3) * (1 - night * 0.6);
  const mix = (a: string, b: string, t: number) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const c = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
    return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0')}`;
  };
  const sky = mix(mix('#4f8fd6', '#d8784a', dusk * 0.6), '#03060f', night);
  const horizon = mix(mix('#cfe2f3', '#ffb07a', dusk), '#0b1428', night);
  const fog = mix(mix('#c8d8e6', '#e8a27a', dusk * 0.7), '#070b16', night);
  map.setSky({
    'sky-color': sky,
    'horizon-color': horizon,
    'fog-color': fog,
    'fog-ground-blend': 0.7,
    'horizon-fog-blend': 0.6,
    'sky-horizon-blend': 0.6,
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 1, 12, 0],
  });
  map.setPaintProperty('sat', 'raster-brightness-max', 0.92 - night * 0.8);
  map.setPaintProperty('sat', 'raster-saturation', -0.18 - night * 0.5);
  map.setPaintProperty('city-lights', 'line-opacity', night * 0.9);
  map.setPaintProperty('city-lights-glow', 'line-opacity', night * 0.35);
  map.setPaintProperty('hillshade', 'hillshade-exaggeration', 0.35 * (1 - night * 0.7));
  const az = 90 + ((hour - 6) / 12) * 180;
  map.setLight({ anchor: 'map', position: [1.4, az, Math.max(10, 90 - Math.max(0, sunAlt) * 70)], color: mix('#ffffff', '#6a7fb0', night), intensity: 0.35 - night * 0.15 });
  return { night, sunAlt, sunAz: az };
}
