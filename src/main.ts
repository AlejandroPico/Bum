import { Encyclopedia, BOOK_ICON } from './encyclopedia/Encyclopedia';
import { THEME_ICONS, THEME_NAMES, THEME_HOUR, autoTheme, resolveTheme, applyThemeClass, type ThemeChoice, type ThemeId } from './ui/theme';
import logoUrl from '../favicon.svg';
import { slug } from './encyclopedia/slug';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import maplibregl from 'maplibre-gl';
import type * as THREE from 'three';
import { createMap, applyTimeOfDay, setGlobe, SKY_BLENDS } from './map/map';
import { NUKE_PRESETS, ASTEROID_PRESETS } from './data/presets';
import { BASEMAPS, setBasemap, type BasemapId } from './map/basemaps';
import { sampleElevation, elevationSampler } from './map/elevation';
import { computeTerrainShadow } from './physics/terrain';
import { geomagLat } from './physics/disasters';
import { Overlays, localToLngLat, destination } from './map/overlays';
import { TestsLayer } from './map/tests-layer';
import type { FxLayer } from './fx/FxLayer';
import { FxPlan } from './fx/plan';
import type { Domes } from './fx/Domes';
import type { Fires } from './fx/Fires';
import { Audio } from './fx/audio';
import type { FrameCtx } from './fx/types';
import { computeEffects, combinedCasualties } from './physics/effects';
import { heatGrid, type HeatKind } from './physics/heat';
import { HeatLayer } from './map/heat';
import { Tour } from './tour';
import { WeatherLayer } from './map/weather';
import type { Weather } from './ui/geo';
import { assessPoint, type SafetyReport } from './physics/safety';
import { nearestCity, haversineKm, setRealPopulation } from './data/cities';
import { loadRealPopulation } from './data/worldpop';
import { fetchInfrastructure, fetchBuildingCounts } from './data/osm';
import { LAUNCH_SITES, greatCircleKm, greatCirclePath, ballistic } from './data/launch';
import type { Effects, Scenario } from './physics/types';
import type { FxModule } from './fx/types';
import { Sidebar, defaultState, type AppState, type Strike } from './ui/sidebar';
import { ResultsPanel, type MultiInfo } from './ui/results';
import { Timeline } from './ui/timeline';
import { h, ICONS, toast, fmtTime, setRangeFill } from './ui/dom';

// ---------------------------------------------------------------------------
// estado
// ---------------------------------------------------------------------------
const state: AppState = defaultState();
readHash(state);

const map = createMap(document.getElementById('map')!, [state.target.lon, state.target.lat]);
const overlays = new Overlays(map);
// tiempo real en el mapa (nubes, radar, lluvia en pantalla y niebla)
const weatherLayer: WeatherLayer = new WeatherLayer(map, document.getElementById('app')!);
weatherLayer.enabled = state.view.weather;
weatherLayer.target = { lat: state.target.lat, lon: state.target.lon };
weatherLayer.onUpdate = () => { if (mapLoaded) atmosphere = tod(); };
// el motor 3D (three.js) se descarga en paralelo con el mapa y se instala al cargarse éste
let FX!: typeof import('./fx/engine');
let fxLayer!: FxLayer;
const fxReady = import('./fx/engine').then((m) => {
  FX = m;
  fxLayer = new m.FxLayer();
  fxLayer.onFrame = onFxFrame;
  tmpColor = new m.Color();
  m.createCloudNoise3D(64).then((t) => { cloudNoise = t; });
  return m;
});
const audio = new Audio();
let puffTex: THREE.Texture | null = null;
let cloudNoise: THREE.Data3DTexture | null = null;

interface Run {
  fx: Effects;
  plan: FxPlan;
  lat: number;
  lon: number;
  t: number;
  playing: boolean;
  speed: number;
  lastReal: number;
  boomDone: boolean;
  flashDone: boolean;
  obsArrival: number;
  obsPsi: number;
  domes: Domes;
  beats: number;
  userCam: boolean;
  lastOverlay: number;
  skyFlash: boolean;
  rate: number;
  orbit: { bearing: number; final: boolean } | null;
  flashReal: number;
  wideDone: boolean;
  /** detonaciones adicionales (ataque múltiple) */
  extras: { fx: Effects; plan: FxPlan; domes: Domes; fires: Fires; lat: number; lon: number }[];
}
let run: Run | null = null;
let atmosphere = { night: 0, sunAlt: 1, sunAz: 180 };
/** iluminación del mapa según el tema (día, tarde o noche); la hora del entorno sólo influye en los cálculos */
function tod() {
  const a = applyTimeOfDay(map, THEME_HOUR[resolveTheme(state.view.theme)], skyWeather());
  weatherLayer?.setNight(a.night);
  return a;
}
/** tiempo que se ve en el cielo (si está activado el tiempo en el mapa) */
let lastWx: Weather | null = null;
function skyWeather() {
  if (!state.view.weather || !weatherLayer) return null;
  const E = state.env;
  const cloud = lastWx ? lastWx.cloudPct / 100 : weatherLayer.coverAt(state.target.lat, state.target.lon) ?? 0;
  return { cloud, visKm: E.visibilityKm, rainMmH: E.rainMmH ?? 0 };
}
/** pasa a la capa del tiempo las condiciones del entorno (reales o manuales) */
function syncLocalWeather() {
  const E = state.env;
  weatherLayer.setLocal({ rainMmH: E.rainMmH ?? 0, visibilityKm: E.visibilityKm, cloudPct: lastWx?.cloudPct ?? 0, tempC: lastWx?.tempC ?? null, windFromDeg: E.windFromDeg, windKmh: E.windKmh });
}

// preferencias de mapa guardadas en este navegador
const PREF_KEY = 'bum:mapprefs';
try {
  const pr = JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}');
  for (const k of ['basemap', 'fxOpacity', 'theme', 'terrain3d', 'buildings', 'mapLabels', 'tests', 'post', 'autoQ', 'quality', 'realPop', 'reduceFlash', 'weather', 'radar'] as const) if (k in pr) (state.view as any)[k] = pr[k];
  // sin preferencia guardada, se respeta el ajuste del sistema «reducir movimiento»
  if (!('reduceFlash' in pr)) state.view.reduceFlash = matchMedia('(prefers-reduced-motion: reduce)').matches;
} catch { /* sin almacenamiento */ }
if (!['day', 'evening', 'night', 'auto'].includes(state.view.theme)) state.view.theme = 'auto';
function savePrefs() {
  const V = state.view;
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ basemap: V.basemap, fxOpacity: V.fxOpacity, theme: V.theme, terrain3d: V.terrain3d, buildings: V.buildings, mapLabels: V.mapLabels, tests: V.tests, post: V.post, autoQ: V.autoQ, quality: V.quality, realPop: V.realPop, reduceFlash: V.reduceFlash, weather: V.weather, radar: V.radar })); } catch { /* sin almacenamiento */ }
}


// ---------------------------------------------------------------------------
// interfaz
// ---------------------------------------------------------------------------
const sidebar = new Sidebar(document.getElementById('sidebar')!, state, {
  onDetonate: () => detonate(),
  onClear: () => { clearRun(); void refreshHeat(); },
  onTarget: (lat, lon, label, fly) => setTarget(lat, lon, label, fly),
  onEnv: () => { atmosphere = tod(); syncLocalWeather(); },
  onWeather: (w) => { lastWx = w; syncLocalWeather(); atmosphere = tod(); },
  onView: () => applyView(),
  onCollapse: () => toggleUI(),
  onProjection: (g) => applyProjection(g),
  onMulti: () => syncStrikeMarkers(),
});

const enc = new Encyclopedia((preset) => {
  if (sidebar.selectPreset(preset)) { toast(`Simulando: ${preset}`); setTimeout(() => detonate(), 400); }
});

const results = new ResultsPanel(document.getElementById('results')!, {
  onBook: (name) => { void enc.openBest(name); },
  onToggle: () => syncHidden(),
  onHover: (id) => { overlays.highlight = id; overlays.refresh(); if (run) run.domes.highlight = id; map.triggerRepaint(); },
  onShare: () => share(),
  onCompare: () => openCompare(),
  onHeat: (k) => setHeat(k),
  onFocus: (id) => {
    if (!run) return;
    const r = run.fx.rings.find((x) => x.id === id);
    if (r) frame(r.radiusM * 1.3, 1500);
  },
});

const timeline = new Timeline(document.getElementById('timeline')!, {
  onPlayPause: () => { if (run) { run.playing = !run.playing; run.lastReal = performance.now(); fxLayer.animating = true; map.triggerRepaint(); } },
  onRestart: () => { if (run) { restartClock(); } },
  onSeek: (t) => { if (run) { run.t = t; run.lastOverlay = 0; run.boomDone = t > run.obsArrival; run.flashDone = t > 0.5; run.flashReal = t > 0.5 ? performance.now() - 1e5 : -1; map.triggerRepaint(); } },
  onSpeed: (s) => { if (run) run.speed = s; },
  onGround: () => { tour.stop(); groundView(); },
  onCloud: () => { if (run) { tour.stop(); run.userCam = false; run.beats = Math.max(run.beats, 2); cloudShot(3500, run.t > run.plan.tau * 0.8, true); } },
  onTour: () => { if (tour.active) tour.stop(); else tour.start(); },
});

const showBtn = h('button', { id: 'ui-show', class: 'icon-btn glass', title: 'Mostrar panel (H)', html: ICONS.show, onclick: () => toggleUI() });
document.getElementById('app')!.append(showBtn);

/** deja libre el espacio de los paneles para que la zona cero quede centrada en la parte visible */
function updatePadding() {
  if (document.body.classList.contains('touring')) { map.setPadding({ left: 0, right: 0, top: 0, bottom: 0 }); return; }
  const phone = window.innerWidth <= 760;
  const collapsed = document.body.classList.contains('ui-collapsed');
  const left = collapsed || phone ? 0 : 340;
  const rp = document.getElementById('results')!;
  const rpOpen = !!run && !rp.classList.contains('hidden') && !rp.classList.contains('min');
  const right = rpOpen && !phone ? 392 : 0;
  // en el móvil los paneles son hojas inferiores: el centro del mapa sube por encima de ellas
  const bottom = !phone ? 0 : rpOpen ? rp.offsetHeight + 64 : collapsed ? 0 : document.getElementById('sidebar')!.offsetHeight;
  map.setPadding({ left, right, top: 0, bottom: Math.min(bottom, window.innerHeight * 0.7) });
}
window.addEventListener('resize', () => updatePadding());

let globeBtn: HTMLButtonElement | null = null;
function applyProjection(globe: boolean) {
  state.view.globe = globe;
  setGlobe(map, globe);
  // el objeto de transformación cambia con la proyección: reinstala el ajuste del plano lejano
  setTimeout(() => fxLayer?.patchFarPlane(), 0);
  sidebar.projSeg?.set(globe ? 'globe' : 'flat');
  if (globeBtn) globeBtn.classList.toggle('on', globe);
  map.triggerRepaint();
}

function toggleUI() {
  const c = !document.body.classList.contains('ui-collapsed');
  document.body.classList.toggle('ui-collapsed', c);
  document.getElementById('sidebar')!.classList.toggle('collapsed', c);
  updatePadding();
}

window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).closest('input, select, textarea')) return;
  if (enc.isOpen) return;
  if (e.key === 'e' || e.key === 'E') { enc.toggle(); return; }
  if (e.key === 'h' || e.key === 'H') toggleUI();
  if (e.key === ' ' && run) { e.preventDefault(); run.playing = !run.playing; run.lastReal = performance.now(); fxLayer.animating = true; map.triggerRepaint(); }
  if (e.key === 'd' || e.key === 'D') detonate();
});

// marcador del objetivo
const markerEl = h('div', { class: 'target-marker', html: `<svg viewBox="-23 -23 46 46"><circle class="pulse" r="18" fill="none" stroke="#ff5a1f" stroke-width="1.5"/><circle r="9" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M0 -20V-12M0 12V20M-20 0H-12M12 0H20" stroke="#fff" stroke-width="1.5"/><circle r="2" fill="#ff5a1f"/></svg>` });
const marker = new maplibregl.Marker({ element: markerEl, pitchAlignment: 'map', rotationAlignment: 'map' }).setLngLat([state.target.lon, state.target.lat]).addTo(map);

/** superficie detectada en el objetivo (tierra / océano y profundidad) */
let surfaceInfo: { lat: number; lon: number; elev: number | null } | null = null;
async function detectSurface(lat: number, lon: number) {
  sidebar.setDetected('Detectando el terreno…');
  const elev = await sampleElevation(lat, lon);
  if (state.target.lat !== lat || state.target.lon !== lon) return surfaceInfo;
  surfaceInfo = { lat, lon, elev };
  if (elev === null) sidebar.setDetected('No se pudo leer el relieve: se asume tierra (sedimento).');
  else if (elev < -2) sidebar.setDetected(`Detectado: océano / mar · ${Math.round(-elev).toLocaleString('es-ES')} m de profundidad.`);
  else sidebar.setDetected(`Detectado: tierra firme · ${Math.round(elev).toLocaleString('es-ES')} m de altitud.`);
  return surfaceInfo;
}

// marcadores numerados de los objetivos del ataque múltiple
let strikeMarkers: maplibregl.Marker[] = [];
function syncStrikeMarkers() {
  for (const m of strikeMarkers) m.remove();
  strikeMarkers = [];
  if (!state.multi.on || state.mode === 'other' || document.body.classList.contains('detonated')) return;
  state.multi.strikes.forEach((st, i) => {
    const el = h('div', { class: 'strike-marker' }, String(i + 1));
    strikeMarkers.push(new maplibregl.Marker({ element: el }).setLngLat([st.lon, st.lat]).addTo(map));
  });
}

function setTarget(lat: number, lon: number, label: string, fly: boolean) {
  state.target = { lat, lon, label };
  sidebar.setTarget(lat, lon, label);
  sidebar.updLaunch();
  detectSurface(lat, lon);
  marker.setLngLat([lon, lat]);
  markerEl.style.display = '';
  if (state.live) sidebar.loadWeather(true);
  else lastWx = null;
  if (state.view.weather) void weatherLayer.load(lat, lon); else weatherLayer.target = { lat, lon };
  syncLocalWeather();
  if (fly) map.flyTo({ center: [lon, lat], zoom: 12.8, pitch: 62, duration: 2800, essential: true });
}

// ---------------------------------------------------------------------------
// mapa
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------- capas del mapa
const LAYERS_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="miter"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12.5l9 5 9-5"/><path d="M3 17l9 5 9-5"/></svg>';
const layersPanel = h('div', { id: 'layers-panel', class: 'glass hidden' });
document.getElementById('app')!.append(layersPanel);
function wxSummary() {
  const E = state.env, g = weatherLayer.grid;
  const cloud = lastWx ? lastWx.cloudPct : g ? Math.round((weatherLayer.coverAt(state.target.lat, state.target.lon) ?? 0) * 100) : null;
  const parts = [lastWx ? `${Math.round(lastWx.tempC)} °C` : '', cloud != null ? `nubes ${Math.round(cloud)} %` : '', (E.rainMmH ?? 0) > 0 ? `lluvia ${String(E.rainMmH).replace('.', ',')} mm/h` : 'sin lluvia', `visibilidad ${Math.round(E.visibilityKm)} km`].filter(Boolean);
  return `En el objetivo: ${parts.join(' · ')}. Nubes de Open-Meteo en unos 1.200 km a la redonda; la lluvia se ve al acercarte al suelo.`;
}
function buildLayersPanel() {
  const V = state.view;
  layersPanel.innerHTML = '';
  layersPanel.append(h('div', { class: 'lp-h' }, 'Mapa base'));
  for (const b of BASEMAPS) {
    const row = h('button', { type: 'button', class: 'lp-base' + (V.basemap === b.id ? ' on' : ''), onclick: () => { V.basemap = b.id; applyMapPrefs(); buildLayersPanel(); } },
      h('b', {}, b.name), h('span', {}, b.desc));
    layersPanel.append(row);
  }
  layersPanel.append(h('div', { class: 'lp-h' }, 'Tiempo'));
  const wtg = (label: string, key: 'weather' | 'radar') => {
    const inp = h('input', { type: 'checkbox' }) as HTMLInputElement;
    inp.checked = V[key];
    inp.addEventListener('change', () => {
      V[key] = inp.checked; savePrefs();
      if (key === 'weather') { weatherLayer.setEnabled(V.weather); atmosphere = tod(); } else void weatherLayer.setRadar(V.radar);
      buildLayersPanel();
    });
    return h('label', { class: 'toggle' }, inp, h('span', { class: 'sw' }), label);
  };
  layersPanel.append(h('div', { class: 'toggles one lp-tg' }, wtg('Tiempo real en el mapa (nubes, lluvia y niebla)', 'weather'), wtg('Radar de lluvia (RainViewer)', 'radar')));
  if (V.weather) layersPanel.append(h('div', { class: 'lp-note' }, wxSummary()));
  layersPanel.append(h('div', { class: 'lp-h' }, 'Mapa de calor'));
  const hs = h('div', { class: 'seg lp-heat' });
  for (const [k, l] of [['off', 'Ninguno'], ['pop', 'Población'], ['deaths', 'Víctimas'], ['fallout', 'Lluvia rad.']] as const) {
    hs.append(h('button', { type: 'button', class: V.heat === k ? 'on' : '', title: HEAT_TITLES[k], onclick: () => { setHeat(k); buildLayersPanel(); } }, l));
  }
  layersPanel.append(hs);
  layersPanel.append(h('div', { class: 'lp-h' }, 'Opciones'));
  const tg = (label: string, key: 'terrain3d' | 'buildings' | 'mapLabels' | 'forceDay' | 'tests' | 'reduceFlash') => {
    const inp = h('input', { type: 'checkbox' }) as HTMLInputElement;
    inp.checked = V[key];
    inp.addEventListener('change', () => { V[key] = inp.checked; if (key === 'reduceFlash') { applyReduceFlash(); savePrefs(); } else applyMapPrefs(); });
    return h('label', { class: 'toggle' }, inp, h('span', { class: 'sw' }), label);
  };
  layersPanel.append(h('div', { class: 'toggles one lp-tg' }, tg('Relieve 3D', 'terrain3d'), tg('Edificios 3D', 'buildings'), tg('Nombres de lugares', 'mapLabels'), tg('Pruebas nucleares (1945–2017)', 'tests')));
  const val = h('b', {}, `${Math.round(V.fxOpacity * 100)} %`);
  const r = h('input', { type: 'range', min: 0, max: 100, step: 1, value: Math.round(V.fxOpacity * 100) }) as HTMLInputElement;
  setRangeFill(r);
  r.addEventListener('input', () => { V.fxOpacity = +r.value / 100; val.textContent = `${r.value} %`; setRangeFill(r); applyFxOpacity(); savePrefs(); });
  layersPanel.append(h('div', { class: 'lp-h' }, 'Efectos'), h('label', { class: 'field' }, h('div', { class: 'field-head' }, h('span', {}, 'Opacidad de anillos, cúpulas y marcas'), val), r),
    h('div', { class: 'toggles one lp-tg' }, tg('Reducir destellos (fotosensibilidad)', 'reduceFlash')));
}
// ---------------------------------------------------------------- mapa de calor
const HEAT_TITLES: Record<'off' | HeatKind, string> = {
  off: 'Sin mapa de calor',
  pop: 'Densidad de población (WorldPop o modelo urbano)',
  deaths: 'Muertes inmediatas por la onda, el calor y la radiación inicial',
  fallout: 'Muertes por la lluvia radiactiva de la primera semana, sin refugio',
};
const heatLayer = new HeatLayer(map, document.getElementById('app')!);
heatLayer.onClose = () => setHeat('off');
let heatToken = 0;
/** cambia el mapa de calor visible */
function setHeat(k: 'off' | HeatKind) {
  state.view.heat = k;
  results.setHeat(k);
  void refreshHeat(true);
}
/** recalcula el mapa de calor con la simulación actual (o la vista, para la población) */
async function refreshHeat(explicit = false) {
  const k = state.view.heat;
  const token = ++heatToken;
  if (k === 'off' || !mapLoaded) { heatLayer.set(null); return; }
  const strikes = run ? [{ fx: run.fx, lat: run.lat, lon: run.lon }, ...run.extras.map((x) => ({ fx: x.fx, lat: x.lat, lon: x.lon }))] : [];
  let area: { lat: number; lon: number; radiusKm: number } | undefined;
  const nuclear = strikes.some((s) => !s.fx.release && !s.fx.volcano && !s.fx.dam && !s.fx.solar && !s.fx.war);
  if (k === 'pop' && !nuclear) {
    // sin explosión: la población de la zona que se ve en el mapa
    const b = map.getBounds(), c = map.getCenter();
    const rKm = Math.min(300, Math.max(3, haversineKm(c.lat, c.lng, b.getNorth(), b.getEast()) * 0.85));
    area = { lat: c.lat, lon: c.lng, radiusKm: rKm };
    if (state.view.realPop) { setRealPopulation(true); await loadRealPopulation(c.lat, c.lng, rKm).catch(() => null); }
    if (token !== heatToken) return;
  }
  await new Promise((r) => setTimeout(r, 0));
  const g = heatGrid(k, nuclear ? strikes : [], area);
  if (token !== heatToken) return;
  if (!g || g.max <= 0) {
    heatLayer.set(null);
    if (explicit) toast(k === 'pop' ? 'Sin datos de población en esta zona' : run ? 'Este escenario no tiene ese mapa de calor' : 'Lanza primero una simulación para ver las víctimas', 3000);
    return;
  }
  heatLayer.set(g);
}
// la población sin simulación se recalcula al mover el mapa
map.on('moveend', () => { if (state.view.heat === 'pop' && !run) void refreshHeat(); });

// ---------------------------------------------------------------- barra de botones (arriba a la derecha)
const GLOBE_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/></svg>';
const INFO_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 10.5V17M12 7v.5" stroke-width="2"/></svg>';
const toolbar = h('div', { id: 'toolbar', class: 'glass' });
document.getElementById('app')!.append(toolbar);
const tbBtn = (cls: string, title: string, icon: string, onclick: (e: MouseEvent) => void) => {
  const b = h('button', { type: 'button', class: `tb-btn ${cls}`, title, 'aria-label': title, html: icon, onclick }) as HTMLButtonElement;
  toolbar.append(b);
  return b;
};
/** abre un menú emergente bajo su botón (y cierra los demás) */
const popovers: { el: HTMLElement; btn: HTMLElement }[] = [];
function togglePopover(el: HTMLElement, btn: HTMLElement, build: () => void) {
  const open = el.classList.contains('hidden');
  for (const p of popovers) { p.el.classList.add('hidden'); p.btn.classList.remove('on'); }
  if (!open) return;
  build();
  el.classList.remove('hidden');
  btn.classList.add('on');
  const r = btn.getBoundingClientRect();
  el.style.top = `${r.bottom + 8}px`;
  el.style.right = `${Math.max(8, window.innerWidth - r.right)}px`;
}
document.addEventListener('click', (e) => {
  for (const p of popovers) if (!p.el.contains(e.target as Node) && !p.btn.contains(e.target as Node)) { p.el.classList.add('hidden'); p.btn.classList.remove('on'); }
});
globeBtn = tbBtn('globe-btn', 'Mapa plano o globo 3D', GLOBE_ICON, () => applyProjection(!state.view.globe));
globeBtn.classList.toggle('on', state.view.globe);
tbBtn('book-btn', 'Enciclopedia (E)', BOOK_ICON, () => enc.toggle());
const layersBtn = tbBtn('layers-btn', 'Mapas y capas', LAYERS_ICON, (e) => { e.stopPropagation(); togglePopover(layersPanel, layersBtn, buildLayersPanel); });
popovers.push({ el: layersPanel, btn: layersBtn });

// edificios visibles: recuento uno a uno por sobrepresión con las teselas ya cargadas
function countVisibleBuildings() {
  if (!run || run.fx.release || run.fx.volcano || !map.getLayer('buildings') || map.getZoom() < 13 || !state.view.buildings) { results.setViewBuildings(null); return; }
  const fx = run.fx, lat = run.lat, lon = run.lon;
  const feats = map.querySourceFeatures('omt', { sourceLayer: 'building' });
  const seen = new Set<string>();
  const c = { destroyed: 0, severe: 0, moderate: 0, light: 0, intact: 0 };
  const cos = Math.cos((lat * Math.PI) / 180);
  for (const f of feats) {
    const g = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
    const ring = g.type === 'Polygon' ? g.coordinates[0] : g.type === 'MultiPolygon' ? g.coordinates[0]?.[0] : null;
    if (!ring?.length) continue;
    let x = 0, y = 0;
    for (const p of ring) { x += p[0]; y += p[1]; }
    x /= ring.length; y /= ring.length;
    const key = f.id != null ? String(f.id) : `${x.toFixed(6)},${y.toFixed(6)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const d = Math.hypot((y - lat) * 110570, (x - lon) * 111320 * cos);
    const psi = fx.pressurePsiAt(d);
    if (psi >= 20) c.destroyed++; else if (psi >= 5) c.severe++; else if (psi >= 2) c.moderate++; else if (psi >= 1) c.light++; else c.intact++;
  }
  results.setViewBuildings(seen.size ? { ...c, total: seen.size } : null);
}
map.on('idle', () => { if (run && !run.playing) countVisibleBuildings(); });
map.on('moveend', () => { if (run) setTimeout(countVisibleBuildings, 300); });

// comparación de dos escenarios: segundo mapa sincronizado con un divisor arrastrable
let split: { map: maplibregl.Map; el: HTMLElement; bar: HTMLElement; tags: HTMLElement; sync: () => void; x: number } | null = null;
function closeSplit() {
  if (!split) return;
  map.off('move', split.sync);
  split.map.remove();
  split.el.remove(); split.bar.remove(); split.tags.remove();
  split = null;
}
function openCompare() {
  if (!run) return;
  document.getElementById('cmp-panel')?.remove();
  const sel = h('select') as HTMLSelectElement;
  NUKE_PRESETS.forEach((g, gi) => { const og = h('optgroup', { label: g.group }); g.items.forEach((it, ii) => og.append(h('option', { value: `n:${gi}:${ii}` }, it.name))); sel.append(og); });
  const oa = h('optgroup', { label: 'Asteroides y cometas' });
  ASTEROID_PRESETS.forEach((a, i) => oa.append(h('option', { value: `a:${i}` }, a.name)));
  sel.append(oa);
  const cur = run.fx.scenario.name;
  const firstOther = [...sel.options].find((o) => o.textContent !== cur && /Little Boy|Hiroshima/.test(o.textContent ?? ''));
  if (firstOther) sel.value = firstOther.value;
  const panel = h('div', { id: 'cmp-panel', class: 'glass' },
    h('div', { class: 'sp-h' }, 'Comparar en el mapa partido'),
    h('p', { class: 'sp-note' }, `A la izquierda, «${cur}». Elige qué se ve a la derecha, en el mismo lugar. Arrastra la línea central para mover la división.`),
    h('label', { class: 'field' }, h('div', { class: 'field-head' }, h('span', {}, 'Escenario B')), sel),
    h('div', { class: 'sp-btns' },
      h('button', { type: 'button', class: 'btn-line', onclick: () => { startSplit(sel.value); panel.remove(); } }, 'Ver mapa partido'),
      h('button', { type: 'button', class: 'btn-ghost', onclick: () => panel.remove() }, 'Cancelar')));
  document.getElementById('app')!.append(panel);
}
function startSplit(val: string) {
  if (!run) return;
  closeSplit();
  const [k, a, b] = val.split(':');
  let sc: Scenario;
  if (k === 'n') { const it = NUKE_PRESETS[+a].items[+b]; const { note: _n, ...rest } = it; void _n; sc = { kind: 'nuclear', ...rest } as Scenario; }
  else { const it = ASTEROID_PRESETS[+a]; const { note: _n, group: _g, ...rest } = it; void _n; void _g; sc = { kind: 'asteroid', ...rest } as Scenario; }
  const fxB = computeEffects(sc, { ...state.env }, run.lat, run.lon);
  const el = h('div', { id: 'map2' });
  document.getElementById('map')!.after(el);
  const m2 = createMap(el, [map.getCenter().lng, map.getCenter().lat]);
  const sync = () => m2.jumpTo({ center: map.getCenter(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch(), padding: map.getPadding() });
  const bar = h('div', { id: 'split-bar', title: 'Arrastra para mover la división' }, h('span', {}, '⟷'));
  const tags = h('div', { id: 'split-tags' }, h('b', { class: 'a' }, `A · ${run.fx.scenario.name || fmtEnergyShort(run.fx.energyKt)}`), h('b', { class: 'b' }, `B · ${sc.name}`), h('button', { type: 'button', title: 'Cerrar la comparación', onclick: () => closeSplit() }, '✕'));
  document.getElementById('app')!.append(bar, tags);
  const mapRect = () => document.getElementById('map')!.getBoundingClientRect();
  const setX = (x: number) => {
    const r = mapRect();
    const cx = Math.max(r.left + 40, Math.min(r.right - 40, x));
    split!.x = cx;
    el.style.clipPath = `inset(0 0 0 ${cx - r.left}px)`;
    bar.style.left = `${cx}px`;
  };
  split = { map: m2, el, bar, tags, sync, x: 0 };
  // la división pasa por la zona cero: cada mitad muestra medio escenario, uno junto al otro
  const r0 = mapRect();
  setX(r0.left + map.project([run.lon, run.lat]).x);
  let drag = false;
  bar.addEventListener('pointerdown', (e) => { drag = true; bar.setPointerCapture(e.pointerId); });
  bar.addEventListener('pointermove', (e) => { if (drag) setX(e.clientX); });
  bar.addEventListener('pointerup', () => { drag = false; });
  map.on('move', sync);
  m2.on('load', () => {
    const ov = new Overlays(m2);
    ov.install();
    ov.set(fxB, run!.lat, run!.lon, fxB.windKmh);
    applyBasemapTo(m2);
    sync();
  });
  sync();
  toast(`B: ${sc.name}`, 2500);
}
const fmtEnergyShort = (kt: number) => (kt >= 1000 ? `${(kt / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} Mt` : `${kt.toLocaleString('es-ES', { maximumFractionDigits: 1 })} kt`);
function applyBasemapTo(m: maplibregl.Map) {
  const V = state.view;
  try { setBasemap(m, (BASEMAPS.some((b) => b.id === V.basemap) ? V.basemap : 'relieve') as BasemapId); } catch { /* sin mapa base */ }
  if (m.getLayer('buildings')) m.setLayoutProperty('buildings', 'visibility', 'none');
}

// guerra a gran escala: círculos de daño en cada objetivo representativo
function setWarLayer(fx: Effects | null) {
  const W = fx?.war;
  const feats: GeoJSON.Feature[] = [];
  if (W) {
    const one = computeEffects({ kind: 'nuclear', name: 'ojiva', yieldKt: W.yieldKt, fission: 0.5, burst: 'optimal', heightM: 0 }, state.env, W.targets[0][0], W.targets[0][1]);
    const rr = (id: string) => one.rings.find((r) => r.id === id)?.radiusM ?? 0;
    const zones: [number, string][] = [[rr('psi1'), '#facc15'], [rr('burn3'), '#f97316'], [rr('psi5'), '#ef4444']];
    for (const [la, lo, name] of W.targets) {
      for (const [r, c] of zones) {
        if (r <= 0) continue;
        const ring: [number, number][] = [];
        for (let i = 0; i <= 48; i++) ring.push(destination(la, lo, r, (i / 48) * 360) as [number, number]);
        feats.push({ type: 'Feature', properties: { c }, geometry: { type: 'Polygon', coordinates: [ring] } });
      }
      feats.push({ type: 'Feature', properties: { name }, geometry: { type: 'Point', coordinates: [lo, la] } });
    }
  }
  const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: feats };
  const src = map.getSource('fx-war') as maplibregl.GeoJSONSource | undefined;
  if (src) { src.setData(fc); return; }
  if (!W) return;
  map.addSource('fx-war', { type: 'geojson', data: fc });
  map.addLayer({ id: 'fx-war', type: 'fill', source: 'fx-war', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': ['get', 'c'], 'fill-opacity': 0.28 } });
  map.addLayer({ id: 'fx-war-pt', type: 'circle', source: 'fx-war', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 3.5, 'circle-color': '#fff3d6', 'circle-stroke-color': '#ff3b1a', 'circle-stroke-width': 2, 'circle-blur': 0.2 } });
  map.addLayer({ id: 'fx-war-lbl', type: 'symbol', source: 'fx-war', filter: ['==', ['geometry-type'], 'Point'], minzoom: 3.5, layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-font': ['Noto Sans Regular'] }, paint: { 'text-color': '#ffd28a', 'text-halo-color': '#000', 'text-halo-width': 1.2 } });
}

// tormenta solar: bandas de latitud geomagnética y óvalo auroral
function setSolarLayer(fx: Effects | null) {
  const S = fx?.solar;
  const lineAt = (m: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let lo = -180; lo <= 180; lo += 3) {
      // latitud geográfica cuya latitud geomagnética es m en este meridiano (bisección)
      let a = m > 0 ? -10 : -85, b = m > 0 ? 85 : 10;
      for (let i = 0; i < 40; i++) { const c = (a + b) / 2; if (geomagLat(c, lo) < m) a = c; else b = c; }
      out.push([lo, Math.max(-84, Math.min(84, (a + b) / 2))]);
    }
    return out;
  };
  const band = (m1: number, m2: number): GeoJSON.Polygon => {
    const A = m2 >= 89 ? lineAt(m1).map(([x]) => [x, 84] as [number, number]) : lineAt(m2), B = lineAt(m1);
    return { type: 'Polygon', coordinates: [[...B, ...A.reverse(), B[0]]] };
  };
  const feats: GeoJSON.Feature[] = [];
  if (S) {
    const Am = S.auroraMlat;
    const zones: [number, number, string][] = [[Am, 90, '#ef4444'], [Am - 8, Am, '#f97316'], [Am - 18, Am - 8, '#facc15']];
    for (const [m1, m2, c] of zones) {
      if (m2 <= 0) continue;
      const lo1 = Math.max(0.5, m1);
      feats.push({ type: 'Feature', properties: { c }, geometry: band(lo1, m2) });
      const s = band(-Math.min(89.9, m2), -lo1); // hemisferio sur
      feats.push({ type: 'Feature', properties: { c }, geometry: m2 >= 89 ? { type: 'Polygon', coordinates: [[...lineAt(-lo1).map(([x]) => [x, -84]), ...lineAt(-lo1).reverse()]] } : s });
    }
    feats.push({ type: 'Feature', properties: { aur: 1 }, geometry: { type: 'LineString', coordinates: lineAt(Am) } });
    feats.push({ type: 'Feature', properties: { aur: 1 }, geometry: { type: 'LineString', coordinates: lineAt(-Am) } });
  }
  const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: feats };
  const src = map.getSource('fx-solar') as maplibregl.GeoJSONSource | undefined;
  if (src) { src.setData(fc); return; }
  if (!S) return;
  map.addSource('fx-solar', { type: 'geojson', data: fc });
  map.addLayer({ id: 'fx-solar', type: 'fill', source: 'fx-solar', filter: ['!', ['has', 'aur']], paint: { 'fill-color': ['get', 'c'], 'fill-opacity': 0.2 } });
  map.addLayer({ id: 'fx-solar-aur', type: 'line', source: 'fx-solar', filter: ['has', 'aur'], paint: { 'line-color': '#4ade80', 'line-width': 3, 'line-blur': 2, 'line-opacity': 0.9 } });
}

// lluvia negra (aparece en el mapa a los ~20 min de la explosión)
function setBlackRainLayer(br: Effects['blackRain'] | undefined, lat: number, lon: number) {
  const cos = Math.cos((lat * Math.PI) / 180);
  const toLL = ([e, n]: [number, number]) => [lon + e / (111320 * cos), lat + n / 110570];
  const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: br ? [
    { type: 'Feature', properties: { k: 'light' }, geometry: { type: 'Polygon', coordinates: [br.light.map(toLL)] } },
    { type: 'Feature', properties: { k: 'heavy' }, geometry: { type: 'Polygon', coordinates: [br.heavy.map(toLL)] } },
  ] : [] };
  const src = map.getSource('fx-blackrain') as maplibregl.GeoJSONSource | undefined;
  if (src) { src.setData(fc); }
  else if (br) {
    map.addSource('fx-blackrain', { type: 'geojson', data: fc });
    const before = map.getLayer('fx-labels') ? 'fx-labels' : undefined;
    map.addLayer({ id: 'fx-blackrain', type: 'fill', source: 'fx-blackrain', layout: { visibility: 'none' }, paint: { 'fill-color': ['match', ['get', 'k'], 'heavy', '#0b0b0f', '#2b2b33'], 'fill-opacity': ['match', ['get', 'k'], 'heavy', 0.45, 0.25] } }, before);
    map.addLayer({ id: 'fx-blackrain-line', type: 'line', source: 'fx-blackrain', layout: { visibility: 'none' }, paint: { 'line-color': '#9ca3af', 'line-width': 1, 'line-dasharray': [1, 2], 'line-opacity': 0.7 } }, before);
  }
}
function showBlackRain(on: boolean) {
  // con un mapa de calor a la vista, la lluvia negra lo taparía
  if (state.view.heat !== 'off') on = false;
  for (const id of ['fx-blackrain', 'fx-blackrain-line']) if (map.getLayer(id) && (map.getLayoutProperty(id, 'visibility') === 'visible') !== on) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
}

// zonas a la sombra del relieve
function setShadowLayer(polys: [number, number][][][] | null, lat: number, lon: number) {
  const cos = Math.cos((lat * Math.PI) / 180);
  const toLL = ([e, n]: [number, number]) => [lon + e / (111320 * cos), lat + n / 110570];
  const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: (polys ?? []).map((p) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: p.map((ring) => ring.map(toLL)) } })) };
  const src = map.getSource('fx-shadow') as maplibregl.GeoJSONSource | undefined;
  if (src) { src.setData(fc); return; }
  if (!polys) return;
  map.addSource('fx-shadow', { type: 'geojson', data: fc });
  map.addLayer({ id: 'fx-shadow', type: 'fill', source: 'fx-shadow', paint: { 'fill-color': '#1e3a5f', 'fill-opacity': 0.38 } }, map.getLayer('fx-labels') ? 'fx-labels' : undefined);
  map.addLayer({ id: 'fx-shadow-line', type: 'line', source: 'fx-shadow', paint: { 'line-color': '#7dd3fc', 'line-width': 1, 'line-opacity': 0.6, 'line-dasharray': [2, 2] } }, map.getLayer('fx-labels') ? 'fx-labels' : undefined);
}

// trayectoria del misil sobre el mapa
function setMissilePath(path: [number, number][] | null, dot?: [number, number]) {
  const line: GeoJSON.Feature = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: path ?? [] } };
  const pt: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: dot ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: dot } }] : [] };
  if (!map.getSource('fx-missile')) {
    if (!path) return;
    map.addSource('fx-missile', { type: 'geojson', data: line });
    map.addSource('fx-missile-dot', { type: 'geojson', data: pt });
    map.addLayer({ id: 'fx-missile-glow', type: 'line', source: 'fx-missile', paint: { 'line-color': '#ff6a1a', 'line-width': 7, 'line-opacity': 0.18, 'line-blur': 4 } });
    map.addLayer({ id: 'fx-missile-line', type: 'line', source: 'fx-missile', paint: { 'line-color': '#ffb020', 'line-width': 1.8, 'line-dasharray': [3, 2], 'line-opacity': 0.9 } });
    map.addLayer({ id: 'fx-missile-dot', type: 'circle', source: 'fx-missile-dot', paint: { 'circle-radius': 6, 'circle-color': '#fff3d6', 'circle-stroke-color': '#ff6a1a', 'circle-stroke-width': 3, 'circle-blur': 0.15 } });
    return;
  }
  (map.getSource('fx-missile') as maplibregl.GeoJSONSource).setData(line);
  (map.getSource('fx-missile-dot') as maplibregl.GeoJSONSource).setData(pt);
}
let missileLabel: maplibregl.Marker | null = null;
/** encuadra el arco completo y anima el vuelo (unos segundos que representan el tiempo real de vuelo) */
async function missileIntro(la0: number, lo0: number, la1: number, lo1: number, flightMin: number, apogeeKm: number) {
  const path = greatCirclePath(la0, lo0, la1, lo1, 200);
  setMissilePath(path, path[0]);
  let minX = 999, maxX = -999, minY = 90, maxY = -90;
  for (const [x, y] of path) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  map.fitBounds([[minX, minY], [maxX, maxY]], { padding: { top: 90, bottom: 120, left: 60, right: 60 }, pitch: 30, bearing: 0, duration: 1800, maxZoom: 7 });
  await waitIdle(4000);
  const el = h('div', { class: 'missile-lbl' });
  missileLabel?.remove();
  missileLabel = new maplibregl.Marker({ element: el, anchor: 'left', offset: [12, 0] }).setLngLat(path[0]).addTo(map);
  const dur = Math.min(7000, 3000 + flightMin * 120);
  const t0 = performance.now();
  await new Promise<void>((done) => {
    const step = () => {
      const f = Math.min(1, (performance.now() - t0) / dur);
      const k = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      const i = Math.min(path.length - 1, Math.round(k * (path.length - 1)));
      setMissilePath(path.slice(0, i + 1), path[i]);
      missileLabel!.setLngLat(path[i]);
      const left = flightMin * (1 - k);
      el.innerHTML = `<b>T−${left >= 1 ? Math.ceil(left) + ' min' : Math.ceil(left * 60) + ' s'}</b><span>${Math.round(apogeeKm * Math.sin(Math.PI * k)).toLocaleString('es-ES')} km de altura</span>`;
      if (f < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });
  missileLabel.remove(); missileLabel = null;
  setMissilePath(path);
}

// ¿Estoy a salvo? — efectos en un punto concreto (tu ubicación o uno elegido en el mapa)
const SAFE_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>';
const safePop = h('div', { id: 'safe-pop', class: 'glass hidden' });
document.getElementById('app')!.append(safePop);
let safePoint: { lat: number; lon: number; label: string } | null = null;
let safePick = false;
let safeMarker: maplibregl.Marker | null = null;
const safeBtn = tbBtn('safe-btn', '¿Estoy a salvo?', SAFE_ICON, (e) => { e.stopPropagation(); togglePopover(safePop, safeBtn, buildSafePop); });
popovers.push({ el: safePop, btn: safeBtn });
function openSafe() { if (safePop.classList.contains('hidden')) togglePopover(safePop, safeBtn, buildSafePop); else buildSafePop(); }
function setSafePoint(lat: number, lon: number, label: string) {
  safePoint = { lat, lon, label };
  if (!safeMarker) {
    const el = h('div', { class: 'safe-marker', title: 'Tu punto' });
    safeMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' });
  }
  safeMarker.setLngLat([lon, lat]).addTo(map);
  // tras el clic en el mapa (el mismo clic llega después al documento y cerraría el menú)
  setTimeout(openSafe, 30);
}
function buildSafePop() {
  safePop.innerHTML = '';
  safePop.append(h('div', { class: 'sp-h' }, '¿Estoy a salvo?'));
  const locBtn = h('button', { type: 'button', class: 'btn-line', onclick: (ev: MouseEvent) => {
    ev.stopPropagation();
    if (!navigator.geolocation) { toast('Este navegador no permite conocer tu ubicación'); return; }
    locBtn.textContent = 'Buscando tu ubicación…';
    navigator.geolocation.getCurrentPosition((p) => setSafePoint(p.coords.latitude, p.coords.longitude, 'Tu ubicación'),
      () => { toast('No se pudo obtener tu ubicación: elige el punto en el mapa'); buildSafePop(); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  } }, 'Usar mi ubicación');
  const pickBtn = h('button', { type: 'button', class: 'btn-ghost', onclick: (ev: MouseEvent) => {
    ev.stopPropagation(); safePick = true; safePop.classList.add('hidden'); safeBtn.classList.remove('on');
    toast('Toca el mapa en el punto que quieres comprobar', 4000);
  } }, 'Elegir en el mapa');
  safePop.append(h('div', { class: 'sp-btns' }, locBtn, pickBtn));
  if (!run) { safePop.append(h('p', { class: 'sp-note' }, 'Lanza primero una simulación. Después podrás ver qué efectos llegarían a tu casa, tu trabajo o cualquier otro punto, cuándo llegarían y qué convendría hacer.')); return; }
  if (!safePoint) { safePop.append(h('p', { class: 'sp-note' }, 'Elige un punto: se calcularán la onda expansiva, el calor, la radiación y la lluvia radiactiva que le llegarían, con la hora de llegada y consejos de protección civil.')); return; }
  // detonación más cercana (en un ataque múltiple)
  const all = [{ fx: run.fx, lat: run.lat, lon: run.lon }, ...run.extras];
  const order = ['fuera', 'bajo', 'riesgo', 'grave', 'extremo'];
  let rep: SafetyReport | null = null;
  for (const s of all) { const r = assessPoint(s.fx, s.lat, s.lon, safePoint.lat, safePoint.lon); if (!rep || order.indexOf(r.level) > order.indexOf(rep.level) || (r.level === rep.level && r.distanceKm < rep.distanceKm)) rep = r; }
  const R = rep!;
  const dir = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'][Math.round(R.bearingDeg / 45) % 8];
  const pct = (x: number) => (x < 0.005 ? '< 1 %' : `${Math.round(x * 100)} %`);
  safePop.append(
    h('div', { class: `sp-verdict lv-${R.level}` }, h('b', {}, R.headline), h('span', {}, `${safePoint.label} · a ${R.distanceKm < 10 ? R.distanceKm.toFixed(1).replace('.', ',') : Math.round(R.distanceKm)} km al ${dir} de la zona cero`)),
  );
  if (!run.fx.release && !run.fx.volcano && !run.fx.dam && !run.fx.solar && !run.fx.war) safePop.append(h('div', { class: 'sp-prob' }, h('span', {}, 'Probabilidad de morir ', h('b', {}, pct(R.pDeath))), h('span', {}, 'de resultar herido ', h('b', {}, pct(R.pInjury)))));
  const list = h('div', { class: 'sp-items' });
  for (const it of R.items) list.append(h('div', { class: `sp-it lv-${it.level}` }, h('div', {}, h('b', {}, it.label), h('span', {}, it.value)), h('p', {}, it.detail)));
  if (!R.items.length) list.append(h('p', { class: 'sp-note' }, 'Ningún efecto calculado llega a este punto.'));
  safePop.append(list, h('div', { class: 'sp-h2' }, 'Qué hacer'), h('ul', { class: 'sp-adv' }, ...R.advice.map((a) => h('li', {}, a))),
    h('p', { class: 'sp-note' }, 'Estimación orientativa con los mismos modelos del simulador. En una emergencia real, sigue siempre las instrucciones de las autoridades.'));
}

// tema: día, tarde, noche o automático
const themePop = h('div', { id: 'theme-pop', class: 'glass hidden' });
document.getElementById('app')!.append(themePop);
const themeBtn = tbBtn('theme-btn', 'Tema', THEME_ICONS[state.view.theme], (e) => { e.stopPropagation(); togglePopover(themePop, themeBtn, buildThemePop); });
popovers.push({ el: themePop, btn: themeBtn });
function buildThemePop() {
  themePop.innerHTML = '';
  for (const c of ['day', 'evening', 'night', 'auto'] as ThemeChoice[]) {
    const now = c === 'auto' ? ` · ahora ${THEME_NAMES[autoTheme()].toLowerCase()}` : '';
    themePop.append(h('button', { type: 'button', class: 'tp-opt' + (state.view.theme === c ? ' on' : ''), onclick: () => { state.view.theme = c; applyTheme(); savePrefs(); buildThemePop(); } },
      h('span', { class: 'tp-ic', html: THEME_ICONS[c] }), h('span', {}, THEME_NAMES[c], h('small', {}, c === 'auto' ? `Según la hora y la fecha de tu equipo${now}` : c === 'day' ? 'Interfaz clara y mapa a pleno sol' : c === 'evening' ? 'Tonos cálidos y luz de atardecer' : 'Interfaz oscura y mapa nocturno'))));
  }
}
let themeNow: ThemeId | null = null;
function applyTheme() {
  const t = resolveTheme(state.view.theme);
  themeBtn.innerHTML = THEME_ICONS[state.view.theme];
  themeBtn.title = `Tema: ${THEME_NAMES[state.view.theme]}${state.view.theme === 'auto' ? ` (${THEME_NAMES[t].toLowerCase()})` : ''}`;
  if (t === themeNow) return;
  themeNow = t;
  applyThemeClass(t);
  if (map.loaded()) atmosphere = tod();
}
applyTheme();
// en automático, revisa cada pocos minutos si ha cambiado la luz
setInterval(() => { if (state.view.theme === 'auto' && !(run && run.skyFlash)) applyTheme(); }, 5 * 60 * 1000);

tbBtn('about-btn', 'Acerca de Bum', INFO_ICON, () => openAbout());

// ---------------------------------------------------------------- acerca de
const APP_VERSION = '1.4';
const LINKS = {
  repo: 'https://github.com/AlejandroPico/Bum',
  portfolio: 'https://alejandropico.github.io/Portfolio/',
};
const aboutEl = h('div', { id: 'about', class: 'hidden' });
document.getElementById('app')!.append(aboutEl);
aboutEl.addEventListener('click', (e) => { if (e.target === aboutEl) closeAbout(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !aboutEl.classList.contains('hidden')) closeAbout(); });
function closeAbout() { aboutEl.classList.add('hidden'); }
function openAbout() {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
  const install = h('button', { type: 'button', class: 'btn-line about-install', onclick: async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    installEvt = null;
    openAbout();
  } }, h('span', { html: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg>' }), 'Instalar como aplicación');
  const feat = (t: string, d: string) => h('li', {}, h('b', {}, t), ' ', d);
  aboutEl.innerHTML = '';
  aboutEl.append(h('div', { class: 'about-card glass', role: 'dialog', 'aria-label': 'Acerca de Bum' },
    h('button', { type: 'button', class: 'icon-btn about-x', title: 'Cerrar', html: ICONS.close, onclick: () => closeAbout() }),
    // cabecera fija: nombre, versión y presentación
    h('div', { class: 'about-top' },
      h('div', { class: 'about-head' },
        h('img', { src: logoUrl, alt: '', class: 'about-logo' }),
        h('div', {}, h('h2', {}, 'Bum'), h('div', { class: 'about-ver' }, `Versión ${APP_VERSION}`))),
      h('p', { class: 'about-lead' }, 'Simulador que muestra, sobre un mapa 3D de cualquier lugar del mundo, qué pasaría si allí estallara un arma nuclear, cayera un asteroide o se produjera otra gran catástrofe: hasta dónde llega cada efecto, cuántas personas se verían afectadas y cómo evoluciona todo con el paso de las horas.')),
    // contenido (en el móvil es lo único que se desplaza)
    h('div', { class: 'about-mid' },
      h('ul', { class: 'about-feat' },
        feat('Armas nucleares y explosivos.', 'Más de 70 armas reales, de las bombas de Hiroshima y Nagasaki a la Bomba del Zar y los arsenales actuales, o una potencia a tu medida; en superficie, en el aire, en el espacio, bajo tierra o bajo el agua, y ataques con varias detonaciones a la vez.'),
        feat('Asteroides y cometas.', 'Impactos históricos e hipotéticos y los objetos reales que vigila la NASA, con su cráter, el terremoto, el tsunami que recorre los océanos y la posibilidad de desviarlos a tiempo.'),
        feat('Otras catástrofes.', 'Accidentes nucleares como Chernóbil o Fukushima, bombas sucias, supervolcanes como Yellowstone, roturas de grandes presas, tormentas solares como la de 1859 y guerras nucleares a gran escala con su invierno nuclear.'),
        feat('¿Estoy a salvo?', 'Elige tu casa o cualquier punto y verás qué te llegaría, cuándo, y qué hacer para protegerte; también puedes comparar dos escenarios en un mapa partido o seguir el vuelo del misil desde su base.'),
        feat('Efectos y víctimas.', 'Bola de fuego, onda expansiva, quemaduras, radiación, lluvia radiactiva, incendios, pulso electromagnético, ceniza y contaminación, con la población real de la zona, los hospitales y servicios afectados y cuánto protege cada tipo de refugio.'),
        feat('Tiempo real.', 'El viento de las próximas horas, la lluvia, el relieve y la hora del lugar cambian el resultado, y el mapa muestra las nubes, la lluvia, la niebla y el radar de precipitación de ahora mismo; una línea de tiempo deja ver la explosión a cámara lenta o el avance de la nube durante días.'),
        feat('Mapas de calor y recorrido de cine.', 'Mapas de calor de la población, de las víctimas y de las muertes por la lluvia radiactiva, y un recorrido automático con planos de cine y rótulos que cuenta la catástrofe de principio a fin.'),
        feat('Enciclopedia.', 'Cientos de artículos sobre la historia, la ciencia y los efectos de estas armas y catástrofes, con esquemas animados y modelos 3D que se pueden desmontar.'),
      ),
      h('p', { class: 'about-note' }, 'Herramienta divulgativa y educativa: las cifras son estimaciones a partir de modelos científicos públicos y no sustituyen a los planes oficiales de protección civil.'),
      standalone ? h('div', { class: 'about-installed' }, 'Instalada como aplicación en este equipo.') : installEvt ? install : h('div', { class: 'about-installed' }, 'Para instalarla como aplicación, usa la opción «Instalar» del menú de tu navegador.')),
    // pie fijo: enlaces y autor
    h('div', { class: 'about-foot' },
      h('div', { class: 'about-links' },
        h('a', { href: LINKS.repo, target: '_blank', rel: 'noopener' }, h('span', {}, 'Repositorio del proyecto'), h('small', {}, 'GitHub · código fuente de Bum')),
        h('a', { href: LINKS.portfolio, target: '_blank', rel: 'noopener' }, h('span', {}, 'Portfolio del autor'), h('small', {}, 'Otros proyectos de Alejandro'))),
      h('div', { class: 'about-by' }, 'Creado por ', h('b', {}, 'Alejandro Pico Pérez'))),
  ));
  aboutEl.classList.remove('hidden');
}

function applyFxOpacity() {
  overlays.setOpacity(state.view.fxOpacity);
  if (run) { run.domes.opacity = state.view.fxOpacity; for (const x of run.extras) x.domes.opacity = state.view.fxOpacity; }
  map.triggerRepaint();
}
function applyMapPrefs() {
  const V = state.view;
  setBasemap(map, (BASEMAPS.some((b) => b.id === V.basemap) ? V.basemap : 'relieve') as BasemapId);
  map.setTerrain(V.terrain3d ? { source: 'terrain', exaggeration: 1 } : null);
  if (map.getLayer('buildings')) map.setLayoutProperty('buildings', 'visibility', V.buildings ? 'visible' : 'none');
  if (map.getLayer('place-labels')) map.setLayoutProperty('place-labels', 'visibility', V.mapLabels ? 'visible' : 'none');
  if (map.getLayer('vb-labels')) map.setLayoutProperty('vb-labels', 'visibility', V.mapLabels ? 'visible' : 'none');
  testsLayer.setVisible(V.tests);
  atmosphere = tod();
  applyFxOpacity();
  savePrefs();
}


/** ficha al pasar el ratón por los puntos de costa y las isócronas del tsunami */
function installTsunamiHover() {
  const tip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'bum-popup bum-tip', offset: 12, maxWidth: '260px' });
  const hrs = (h: number) => { const m = Math.round(h * 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`; };
  const effect = (a: number) => a < 1 ? 'Corrientes peligrosas en puertos y playas.' : a < 3 ? 'Inunda la primera línea de costa.' : a < 10 ? 'Ola destructiva: arrasa paseos marítimos y puertos.' : 'Catastrófica: penetra kilómetros tierra adentro.';
  map.on('mousemove', 'fx-tsu-coast', (e) => {
    const p = e.features?.[0]?.properties as { amp: number; h: number } | undefined;
    if (!p) return;
    const a = +p.amp;
    tip.setLngLat(e.lngLat).setHTML(`<div class="tp-k">Tsunami · costa</div><h3>Ola de ${a >= 10 ? Math.round(a) : a.toLocaleString('es-ES', { maximumFractionDigits: 1 })} m</h3><p>Llega ${hrs(+p.h)} después de la explosión. ${effect(a)}</p>`).addTo(map);
    map.getCanvas().style.cursor = 'help';
  });
  map.on('mouseleave', 'fx-tsu-coast', () => { tip.remove(); map.getCanvas().style.cursor = ''; });
  map.on('mousemove', 'fx-tsu-iso', (e) => {
    const p = e.features?.[0]?.properties as { hours: number } | undefined;
    if (!p) return;
    tip.setLngLat(e.lngLat).setHTML(`<div class="tp-k">Tsunami · frente de la ola</div><h3>${p.hours} h</h3><p>Hasta aquí ha llegado la ola ${p.hours} h después de la explosión.</p>`).addTo(map);
  });
  map.on('mouseleave', 'fx-tsu-iso', () => tip.remove());
}

// capa de pruebas nucleares
const testsLayer = new TestsLayer(map);
testsLayer.onBook = (name) => { void enc.openBest(name); };
testsLayer.onSimulate = (t) => {
  if (!(t.preset && sidebar.selectPreset(t.preset))) {
    sidebar.setNuke({ name: `${t.name} (${t.date.slice(-4)})`, yieldKt: t.yieldKt, fission: 0.5, burst: t.burst ?? 'surface', heightM: t.heightM ?? 0, depthM: t.depthM ?? 50, seaDepthM: t.burst === 'underwater' ? Math.max((t.depthM ?? 27) + 30, 60) : 100, chemical: false, note: t.note });
  }
  setTarget(t.lat, t.lon, t.name, true);
  setTimeout(() => detonate(), 3200);
};

let mapLoaded = false;
map.on('load', async () => {
  mapLoaded = true;
  overlays.install();
  testsLayer.install();
  installTsunamiHover();
  applyMapPrefs();
  atmosphere = tod();
  await fxReady;
  map.addLayer(fxLayer, 'fx-labels');
  puffTex = FX.createPuffAtlas(1024);
  if (state.view.globe) applyProjection(true);
  detectSurface(state.target.lat, state.target.lon);
  if (state.live) sidebar.loadWeather(true);
  syncLocalWeather();
  if (state.view.weather) { void weatherLayer.load(state.target.lat, state.target.lon); if (state.view.radar) void weatherLayer.setRadar(true); }
  document.getElementById('loading')!.classList.add('done');
  if (location.hash.length > 3) setTimeout(() => detonate(), 1200);
});

map.on('click', (e) => {
  if (safePick) { safePick = false; const c = nearestCity(e.lngLat.lat, e.lngLat.lng); setSafePoint(e.lngLat.lat, e.lngLat.lng, c.km < 15 ? `Cerca de ${c.city.name}` : 'Punto elegido'); return; }
  if (testsLayer.handleClick(e)) return;
  const c = nearestCity(e.lngLat.lat, e.lngLat.lng);
  const label = c.km < 25 ? c.city.name : '';
  setTarget(e.lngLat.lat, e.lngLat.lng, label, false);
  if (state.multi.on && state.mode !== 'other') {
    state.multi.strikes.push({ lat: e.lngLat.lat, lon: e.lngLat.lng, label, sc: sidebar.currentScenario(), azimuth: state.ast.azimuth });
    sidebar.renderMulti();
    syncStrikeMarkers();
  }
});

// doble clic derecho: norte arriba y vista cenital (sustituye al botón de la brújula)
{
  let rDown: { x: number; y: number } | null = null;
  let lastCtx = 0;
  map.getCanvasContainer().addEventListener('mousedown', (e) => { if (e.button === 2) rDown = { x: e.clientX, y: e.clientY }; });
  map.on('contextmenu', (e) => {
    const oe = e.originalEvent;
    oe.preventDefault();
    // si ha arrastrado para girar, no cuenta como clic
    if (rDown && Math.hypot(oe.clientX - rDown.x, oe.clientY - rDown.y) > 5) { lastCtx = 0; return; }
    const now = performance.now();
    if (now - lastCtx < 450) {
      lastCtx = 0;
      if (run) { run.userCam = true; run.orbit = null; }
      resetFov();
      map.easeTo({ bearing: 0, pitch: 0, duration: 900, essential: true });
    } else lastCtx = now;
  });
  // en pantallas táctiles, el equivalente es un doble toque con dos dedos
  const cc = map.getCanvasContainer();
  let t2: { t: number; x: number; y: number } | null = null, last2 = 0, moved = false;
  cc.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) { const [a, b] = [e.touches[0], e.touches[1]]; t2 = { t: performance.now(), x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }; moved = false; }
  }, { passive: true });
  cc.addEventListener('touchmove', (e) => {
    if (t2 && e.touches.length === 2) { const [a, b] = [e.touches[0], e.touches[1]]; if (Math.hypot((a.clientX + b.clientX) / 2 - t2.x, (a.clientY + b.clientY) / 2 - t2.y) > 12) moved = true; }
  }, { passive: true });
  cc.addEventListener('touchend', (e) => {
    if (!t2 || e.touches.length > 0) return;
    const now = performance.now(), quick = now - t2.t < 300 && !moved;
    t2 = null;
    if (!quick) { last2 = 0; return; }
    if (now - last2 < 500) {
      last2 = 0;
      if (run) { run.userCam = true; run.orbit = null; }
      resetFov();
      map.easeTo({ bearing: 0, pitch: 0, duration: 900, essential: true });
    } else last2 = now;
  }, { passive: true });
}

for (const ev of ['dragstart', 'rotatestart', 'pitchstart', 'wheel'] as const) {
  map.on(ev, (e: any) => { if (run && e.originalEvent) { run.userCam = true; run.orbit = null; tour.stop(); } });
}

function applyView() {
  const V = state.view;
  overlays.showRings = V.rings;
  overlays.showFallout = V.fallout;
  overlays.showDamage = V.damage;
  overlays.showMarks = V.marks;
  overlays.refresh();
  overlays.updateBuildings(run ? run.plan.shockGroundR(run.t) : Infinity);
  for (const id of ['fx-labels', 'fx-fallout-labels']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', V.labels ? 'visible' : 'none');
  audio.enabled = V.sound;
  if (run) {
    run.domes.enabled = V.domes;
    for (const x of run.extras) { x.domes.enabled = V.domes; x.fires.object.visible = V.fires; }
    if (fxLayer) for (const m of fxLayer.modules) if (m instanceof FX.Fires) m.object.visible = V.fires;
  }
  map.triggerRepaint();
}

function syncHidden() {
  overlays.setHidden(new Set(results.hidden));
  if (run) { run.domes.hidden = new Set(results.hidden); for (const x of run.extras) x.domes.hidden = new Set(results.hidden); }
  map.triggerRepaint();
}

function zoomForRadius(r: number, lat: number) {
  const el = map.getContainer();
  const pad = map.getPadding();
  const minDim = Math.min(el.clientWidth - (pad.left ?? 0) - (pad.right ?? 0), el.clientHeight);
  const mpp = (2 * r) / (Math.max(320, minDim) * 0.85);
  return Math.max(0.5, Math.min(16.5, Math.log2((40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * mpp))));
}

function frame(r: number, duration = 3500, pitch?: number, bearingDelta = 0) {
  if (!run) return;
  map.easeTo({
    center: [run.lon, run.lat],
    zoom: zoomForRadius(r, run.lat),
    pitch: pitch ?? Math.min(72, map.getPitch() < 30 ? 60 : map.getPitch()),
    bearing: map.getBearing() + bearingDelta,
    duration,
    essential: true,
    easing: (x) => 1 - Math.pow(1 - x, 3),
  });
}

/**
 * Plano lateral del hongo completo: la cámara se sitúa a la distancia necesaria para que
 * quepan el tronco y el sombrero (según el campo de visión) y mira a media altura de la nube.
 */
function cloudCamera(bearingDeg: number, final = true) {
  if (!run) return null;
  const P = run.plan, t = run.t;
  const H = Math.max(final ? P.capTop + P.capR * 0.15 : P.capZ(t) + P.capRadius(t) * 0.7, 1500);
  const Wr = Math.max(final ? P.capR : P.capRadius(t), P.stemR * 2);
  const el = map.getContainer();
  const pad = map.getPadding();
  const w = Math.max(320, el.clientWidth - (pad.left ?? 0) - (pad.right ?? 0));
  const hgt = el.clientHeight;
  const fovV = (((map as any).transform.fov as number) || 36.87) * Math.PI / 180;
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * (w / hgt));
  const D = Math.max((H * 0.58) / Math.tan(fovV * 0.5 * 0.82), (Wr * 1.3) / Math.tan(fovH * 0.5 * 0.82), 3500);
  const pitch = 80;
  const down = ((90 - pitch) * Math.PI) / 180;
  const Hm = H * 0.47;
  const A = Hm + D * Math.tan(down); // altura de la cámara sobre el suelo
  const ahead = A / Math.tan(down) - D; // de la zona cero al punto central del mapa
  // la cámara queda anclada a la zona cero: la nube deriva con el viento y sale del encuadre
  const center = destination(run.lat, run.lon, ahead, bearingDeg);
  const dist = A / Math.sin(down);
  const ctcPx = (0.5 * hgt) / Math.tan(fovV / 2);
  const mpp = dist / ctcPx;
  const zoom = Math.log2((40075016.686 * Math.cos((center[1] * Math.PI) / 180)) / (512 * mpp));
  return { center, zoom: Math.max(1, Math.min(18, zoom)), pitch, bearing: bearingDeg };
}

/**
 * Vista de un testigo a pie de calle: la cámara se coloca a 1,7 m del suelo, a una distancia a la
 * que cabe la nube entera (o en el límite de los daños leves), mirando hacia la zona cero.
 * Cada pulsación aleja al testigo un poco más.
 */
/** estado de la calidad automática */
const autoQ = { last: 0, fps: 60 };
let groundStep = 0;
let groundFov = false;
/** vuelve al campo de visión normal tras la vista desde el suelo */
function resetFov() { if (groundFov) { groundFov = false; map.setVerticalFieldOfView(36.87); } }
function groundView() {
  if (!run) return;
  const P = run.plan;
  const H = Math.max(P.capTop, P.fireballR * 4, 300);
  const base = Math.max(P.psi1R * 1.1, H * 2, 1500);
  const dist = base * [1, 1.8, 0.55][groundStep % 3];
  groundStep++;
  const bearing = map.getBearing();
  const from = destination(run.lat, run.lon, dist, bearing + 180);
  const elevFrom = map.queryTerrainElevation({ lng: from[0], lat: from[1] }) ?? 0;
  try {
    // horizonte en el centro y campo de visión amplio: cabe la nube entera sin mirar hacia arriba
    map.setVerticalFieldOfView(62);
    groundFov = true;
    const cam = map.calculateCameraOptionsFromCameraLngLatAltRotation(new maplibregl.LngLat(from[0], from[1]), elevFrom + 1.7, bearing, 88.5);
    run.userCam = true;
    run.orbit = null;
    map.easeTo({ center: cam.center, zoom: cam.zoom, pitch: cam.pitch, bearing: cam.bearing, duration: 4000, essential: true, easing: (x) => 1 - Math.pow(1 - x, 3) });
    toast(`Testigo a ${dist >= 1000 ? (dist / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' km' : Math.round(dist) + ' m'} de la zona cero`, 2200);
  } catch { toast('Vista desde el suelo no disponible en esta proyección', 2500); }
}

function cloudShot(duration = 6500, final = true, orbit = true) {
  if (!run) return;
  resetFov();
  const b = map.getBearing();
  const cam = cloudCamera(b, final);
  if (!cam) return;
  map.easeTo({ ...cam, duration, essential: true, easing: (x) => 1 - Math.pow(1 - x, 3) });
  run.orbit = orbit ? { bearing: b, final } : null;
}

// recorrido cinematográfico automático
const tour = new Tour({
  map,
  run: () => run,
  place: () => { if (!run) return ''; const c = nearestCity(run.lat, run.lon); return state.target.label || (c.km < 25 ? c.city.name : `${run.lat.toFixed(3)}, ${run.lon.toFixed(3)}`); },
  restart: () => restartClock(),
  seek: (t) => { if (run) { run.t = t; run.lastOverlay = 0; run.boomDone = t > run.obsArrival; run.flashDone = t > 0.5; run.flashReal = t > 0.5 ? performance.now() - 1e5 : -1; map.triggerRepaint(); } },
  zoomForRadius,
  cloudCamera: (b, f) => cloudCamera(b, f) as never,
  destination: (la, lo, d, b) => destination(la, lo, d, b) as [number, number],
  setWideFov: (on) => { if (on) { map.setVerticalFieldOfView(62); groundFov = true; } else resetFov(); },
  heat: (k) => { const prev = state.view.heat; if (prev !== k) setHeat(k); return prev; },
  layout: () => updatePadding(),
  repaint: () => map.triggerRepaint(),
}, document.getElementById('app')!);

// ---------------------------------------------------------------------------
// simulación
// ---------------------------------------------------------------------------
function clearRun() {
  tour.stop(true);
  resetFov();
  setMissilePath(null);
  setShadowLayer(null, 0, 0);
  setBlackRainLayer(undefined, 0, 0); showBlackRain(false);
  setSolarLayer(null);
  setWarLayer(null);
  heatLayer.set(null);
  closeSplit();
  document.getElementById('cmp-panel')?.remove();
  fxLayer?.clear();
  if (fxLayer) fxLayer.animating = false;
  run = null;
  overlays.extras = [];
  tsuWorker?.terminate(); tsuWorker = null;
  overlays.setTsunami(null);
  overlays.set(null);
  results.hide();
  updatePadding();
  document.getElementById('timeline')!.classList.add('hidden');
  document.body.classList.remove('detonated');
  syncStrikeMarkers();
  setFlash(0, 0);
  atmosphere = tod();
  map.triggerRepaint();
}

async function waitIdle(ms: number) {
  await new Promise<void>((res) => {
    let done = false;
    const fin = () => { if (!done) { done = true; res(); } };
    map.once('idle', fin);
    setTimeout(fin, ms);
  });
}

let busy = false;
/** fuente de la población del último cálculo (null = modelo aproximado) */
let popSource: string | null = null;
let infraToken = 0;
const fmtDistShort = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toLocaleString('es-ES', { maximumFractionDigits: m < 10000 ? 1 : 0 })} km`);
/** completa un escenario (detección automática del terreno en impactos) */
async function prepScenario(sc0: Scenario, lat: number, lon: number): Promise<Scenario> {
  const sc = { ...sc0 } as Scenario;
  if (sc.kind === 'dam') {
    const V = Math.max(0.01, sc.volumeHm3) * 1e6, Ld = 12000 * Math.pow(V / 1e9, 0.35) + 3000;
    const R = Math.min(250e3, Math.max(15e3, Ld * 6));
    const tt = setTimeout(() => toast('Cargando el relieve del valle…', 3000), 400);
    sc.dem = await elevationSampler(lat, lon, R).catch(() => null);
    clearTimeout(tt);
  }
  if (sc.kind === 'asteroid' && state.ast.surface === 'auto') {
    const info = surfaceInfo && surfaceInfo.lat === lat && surfaceInfo.lon === lon ? surfaceInfo : await detectSurface(lat, lon);
    const elev = info?.elev ?? 0;
    if (elev < -2) { sc.target = 'water'; sc.waterDepthM = Math.min(11000, -elev); }
    else { sc.target = elev > 1500 ? 'rock' : 'sediment'; sc.waterDepthM = 0; }
  }
  return sc;
}

async function detonate() {
  if (!puffTex) { // aún cargando el mapa o el motor 3D: se lanza al terminar
    const go = () => setTimeout(() => detonate(), 300);
    if (mapLoaded) fxReady.then(() => setTimeout(go, 200)); else map.once('load', () => fxReady.then(() => setTimeout(go, 200)));
    return;
  }
  if (busy) return;
  busy = true;
  try {
    audio.unlock();
    if (state.mode !== 'other') photoWarning();
    // en móviles y tabletas se pliega el panel de ajustes para dejar ver la explosión y los resultados
    if (window.innerWidth <= 1180 && !document.body.classList.contains('ui-collapsed')) toggleUI();
    const multi = state.multi.on && state.multi.strikes.length > 0 && state.mode !== 'other';
    const list: Strike[] = multi ? state.multi.strikes.slice(0, 24) : [{ lat: state.target.lat, lon: state.target.lon, label: state.target.label, sc: sidebar.currentScenario(), azimuth: state.ast.azimuth }];
    const env = { ...state.env };
    const comp: { st: Strike; fx: Effects }[] = [];
    for (const st of list) {
      const sc = await prepScenario(st.sc, st.lat, st.lon);
      comp.push({ st, fx: computeEffects(sc, env, st.lat, st.lon) });
    }
    // población real (WorldPop): se descarga para la zona afectada y se recalculan las víctimas
    setRealPopulation(state.view.realPop);
    popSource = null;
    if (state.view.realPop) {
      const reach = (f: Effects) => Math.min(600, Math.max(5, ...f.rings.filter((r) => !r.global && r.group !== 'seismic' && r.group !== 'tsunami' && r.group !== 'emp').map((r) => r.radiusM / 1000), ...f.fallout.map((x) => x.maxDownwindKm * 0.8)));
      const tt = setTimeout(() => toast('Descargando la población real (WorldPop 2020)…', 2500), 600);
      const srcs = await Promise.all(comp.slice(0, 8).map((c) => loadRealPopulation(c.st.lat, c.st.lon, reach(c.fx)).catch(() => null)));
      clearTimeout(tt);
      popSource = srcs.find((x) => x) ?? null;
      if (popSource) for (const c of comp) { c.fx = computeEffects(c.fx.scenario, env, c.st.lat, c.st.lon); c.fx.popSource = popSource; }
      else toast('Población real no disponible: se usa el modelo urbano aproximado', 3000);
    }
    const { lat, lon } = list[0];
    const fx = comp[0].fx;
    const sc = fx.scenario;
    clearRun();
    syncStrikeMarkers();
    // trayectoria del misil: arco desde la base de lanzamiento y animación del vuelo
    const site = sc.kind === 'nuclear' && !comp[1] ? LAUNCH_SITES.find((s) => s.id === state.launch) : undefined;
    if (site) {
      const rangeKm = greatCircleKm(site.lat, site.lon, lat, lon);
      const b = ballistic(rangeKm);
      fx.missile = { site: site.name, country: site.country, rangeKm, ...b };
      await missileIntro(site.lat, site.lon, lat, lon, fx.missile.flightMin, fx.missile.apogeeKm);
    }
    const plan = new FxPlan(fx, env);
    if (sc.kind === 'asteroid') plan.entryAzimuth = list[0].azimuth ?? state.ast.azimuth;

    // encuadre inicial (todas las detonaciones a la vista)
    const c = map.getCenter();
    let cLat = lat, cLon = lon, spread = 0;
    if (comp.length > 1) {
      cLat = comp.reduce((a, b) => a + b.st.lat, 0) / comp.length;
      cLon = comp.reduce((a, b) => a + b.st.lon, 0) / comp.length;
      spread = Math.max(...comp.map((x) => haversineKm(cLat, cLon, x.st.lat, x.st.lon) * 1000));
    }
    const far = haversineKm(c.lat, c.lng, cLat, cLon) > 3;
    let r0 = Math.max(plan.psi5R * 1.6, plan.fireballR * 7, plan.capTop * 0.5, 1500) + spread;
    if (fx.volcano) r0 = Math.max(plan.capR * 1.25, fx.volcano.pdcR * 1.6) + spread;
    else if (fx.release) r0 = Math.max(plan.capTop * 2.5, 2500) + spread;
    else if (fx.dam) r0 = Math.max(8000, (fx.dam.reachKm * 1000) * 0.7);
    else if (fx.solar) { r0 = 7e6; if (!state.view.globe) applyProjection(true); setSolarLayer(fx); }
    else if (fx.war) {
      if (!state.view.globe) applyProjection(true);
      setWarLayer(fx);
      // encuadre: centro y extensión de los objetivos (los dos bandos a la vista)
      const T = fx.war.targets;
      const x = T.reduce((s, p) => s + Math.cos((p[1] * Math.PI) / 180) * Math.cos((p[0] * Math.PI) / 180), 0), y = T.reduce((s, p) => s + Math.sin((p[1] * Math.PI) / 180) * Math.cos((p[0] * Math.PI) / 180), 0), z = T.reduce((s, p) => s + Math.sin((p[0] * Math.PI) / 180), 0);
      cLat = (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI; cLon = (Math.atan2(y, x) * 180) / Math.PI;
      r0 = Math.max(...T.map((p) => haversineKm(cLat, cLon, p[0], p[1]) * 1000)) * 1.15;
    }
    let bearing = map.getBearing();
    if (plan.isAsteroid) {
      // vista lateral de la trayectoria para ver llegar el bólido
      const path = plan.entrySpeed * plan.entryDuration;
      r0 = Math.max(path * 0.6, plan.fireballR * 2.5, plan.h * 4, 30000) + spread;
      bearing = (list[0].azimuth ?? state.ast.azimuth) + 90;
    }
    const z0 = zoomForRadius(r0, cLat);
    if (far || Math.abs(map.getZoom() - z0) > 1.2 || plan.isAsteroid || comp.length > 1) {
      map.easeTo({ center: [cLon, cLat], zoom: z0, pitch: fx.war || fx.solar ? 0 : plan.isAsteroid ? 55 : 66, bearing: fx.war || fx.solar ? 0 : bearing, duration: far ? 2600 : 1600, essential: true });
      await waitIdle(far ? 6000 : 3500);
    }
    const elev = map.queryTerrainElevation([lon, lat]) ?? 0;
    fxLayer.setOrigin(lon, lat, elev);
    fxLayer.extentM = Math.max(...fx.rings.filter((r) => r.dome).map((r) => r.radiusM), fx.cloud.capRadiusM * 2.5, fx.cloud.topM * 1.5, 1000) + spread * 2;
    (map as any).transform?._calcMatrices?.();
    if (state.view.autoQ) state.view.quality = autoQ.fps < 22 ? 0.5 : 1;
    const q = state.view.quality;
    // espera a la textura de ruido 3D (se genera en segundo plano al cargar)
    for (let i = 0; i < 60 && !cloudNoise; i++) await new Promise((r) => setTimeout(r, 50));

    /** crea los efectos 3D de una detonación desplazada (e, n) metros respecto a la principal */
    const build = (fxi: Effects, pl: FxPlan, la: number, lo: number, primary: boolean) => {
      const cos0 = Math.cos((lat * Math.PI) / 180);
      const e = (lo - lon) * 111320 * cos0, n = (la - lat) * 110540;
      const el = (map.queryTerrainElevation([lo, la]) ?? elev) - elev;
      const elevAt = (de: number, dn: number) => {
        const [x, y] = localToLngLat(la, lo, de, dn);
        const v = map.queryTerrainElevation([x, y]);
        return v === null || v === undefined ? 0 : v - elev - el;
      };
      const mods: FxModule[] = [];
      const domes = new FX.Domes(pl);
      domes.enabled = state.view.domes;
      domes.opacity = state.view.fxOpacity;
      domes.hidden = new Set(results.hidden);
      mods.push(domes);
      if (primary && pl.isAsteroid) mods.push(new FX.Bolide(pl, puffTex!));
      const fires = new FX.Fires(pl, puffTex!, elevAt, primary ? q : q * 0.5);
      fires.object.visible = state.view.fires;
      mods.push(fires);
      // presas y tormentas solares no tienen nube, onda ni bola de fuego
      if (!fxi.dam && !fxi.solar && !fxi.war) {
        if (cloudNoise) mods.push(new FX.VolumeCloud(pl, cloudNoise, primary ? q : Math.min(q, 0.6)));
        mods.push(new FX.Mushroom(pl, puffTex!, primary ? q : q * 0.5, !!cloudNoise));
        mods.push(new FX.Shock(pl));
        if (FX.Rubble.wanted(pl)) mods.push(new FX.Rubble(pl, primary ? q : q * 0.5));
        mods.push(new FX.Fireball(pl));
      }
      for (const m of mods) { fxLayer.add(m); m.object.position.set(e, el, -n); m.object.updateMatrixWorld(); }
      return { domes, fires };
    };
    const main = build(fx, plan, lat, lon, true);
    const extras: Run['extras'] = [];
    for (let k = 1; k < comp.length; k++) {
      const pk = new FxPlan(comp[k].fx, env);
      const b = build(comp[k].fx, pk, comp[k].st.lat, comp[k].st.lon, false);
      extras.push({ fx: comp[k].fx, plan: pk, domes: b.domes, fires: b.fires, lat: comp[k].st.lat, lon: comp[k].st.lon });
    }

    // observador (cámara) para el sonido y la vibración
    const camLL = (map as any).transform.getCameraLngLat();
    const dObs = haversineKm(camLL.lat, camLL.lng, lat, lon) * 1000;

    results.hidden.clear();
    overlays.setHidden(new Set());
    overlays.set(fx, lat, lon, fx.windKmh);
    overlays.extras = extras.map((x) => ({ fx: x.fx, lat: x.lat, lon: x.lon }));
    overlays.gateT = plan.fbDone;
    overlays.falloutDelayS = Math.max(plan.fbDone, plan.tau);
    overlays.setReveal(0, 0);
    const place = list[0].label || nearestCity(lat, lon).city.name;
    let multiInfo: MultiInfo | undefined;
    if (comp.length > 1) {
      const tot = combinedCasualties(comp.map((x) => ({ fx: x.fx, lat: x.st.lat, lon: x.st.lon })));
      multiInfo = { deaths: tot.deaths, injuries: tot.injuries, exposed: tot.exposed, items: comp.map((x) => ({ name: x.fx.scenario.name, place: x.st.label || nearestCity(x.st.lat, x.st.lon).city.name, energyKt: x.fx.energyKt, deaths: x.fx.casualties.deaths })) };
    }
    results.setInfra(null);
    results.setBuildings(null);
    results.render(fx, `${place}`, multiInfo);
    // infraestructuras reales por zona (OpenStreetMap), en segundo plano
    if (!fx.release && !fx.volcano) {
      const zs = ['psi20', 'psi5', 'psi1', 'burn3'].map((id) => fx.rings.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r && !r.global && r.radiusM > 50)
        .sort((a, b) => a.radiusM - b.radiusM).map((r) => ({ id: r.id, label: `${({ psi20: '20 psi', psi5: '5 psi', psi1: '1 psi', burn3: 'Quemad. 3.º' } as Record<string, string>)[r.id]}\n${fmtDistShort(r.radiusM)}`, radiusM: r.radiusM }));
      if (zs.length) {
        const token = ++infraToken;
        results.setInfra('loading');
        fetchInfrastructure(lat, lon, zs).then((r) => { if (token === infraToken) results.setInfra(r ?? 'error'); }, () => { if (token === infraToken) results.setInfra('error'); });
      }
      setBlackRainLayer(fx.blackRain, lat, lon);
      // sombra del relieve sobre el destello (líneas de visión con el modelo del terreno)
      const burnR = Math.min(40000, fx.rings.find((r) => r.id === 'burn2')?.radiusM ?? fx.rings.find((r) => r.id === 'burn1')?.radiusM ?? 0);
      results.setShadow(null);
      setShadowLayer(null, lat, lon);
      if (burnR > 300 && !fx.buried && !fx.chemical && fx.fireball.visible) {
        const tokenS = infraToken;
        results.setShadow('loading');
        elevationSampler(lat, lon, burnR).then((smp) => {
          if (tokenS !== infraToken) return;
          if (!smp) { results.setShadow(null); return; }
          const s = computeTerrainShadow(smp, lat, lon, fx.burstHeightM, burnR);
          results.setShadow(s);
          setShadowLayer(s?.polygons.length ? s.polygons : null, lat, lon);
        }, () => results.setShadow(null));
      }
      // edificios por zona de daño (recuento en el servidor)
      const bz = ['psi20', 'psi5', 'psi1'].map((id) => fx.rings.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r && !r.global && r.radiusM > 30).map((r) => ({ id: r.id, radiusM: r.radiusM }));
      if (bz.length) {
        const tokenB = infraToken;
        results.setBuildings('loading');
        fetchBuildingCounts(lat, lon, bz).then((r) => { if (tokenB === infraToken) results.setBuildings(r ?? 'error'); }, () => { if (tokenB === infraToken) results.setBuildings('error'); });
      }
    }
    updatePadding();
    // el cambio de márgenes interrumpe el encuadre: en guerras y tormentas solares se repite
    if (fx.war || fx.solar) map.easeTo({ center: [cLon, cLat], zoom: z0, pitch: 0, bearing: 0, duration: 1400, essential: true });

    run = {
      fx, plan, lat, lon, t: plan.isAsteroid ? -plan.entryDuration : 0, playing: true, speed: 1, lastReal: performance.now(),
      boomDone: false, flashDone: false, obsArrival: plan.shockTime(Math.hypot(dObs, plan.h)), obsPsi: fx.pressurePsiAt(dObs),
      domes: main.domes, beats: 0, userCam: !state.view.cinematic || comp.length > 1 || !!fx.dam || !!fx.solar || !!fx.war, lastOverlay: 0, skyFlash: false, rate: 1, orbit: null, flashReal: -1, wideDone: false,
      extras,
    };
    const ev: { t: number; label: string }[] = [{ t: plan.tMax, label: 'Destello' }];
    if (plan.psi5R) ev.push({ t: plan.shockTime(Math.hypot(plan.psi5R, plan.h)), label: 'Onda 5 psi' });
    if (plan.psi1R) ev.push({ t: plan.shockTime(Math.hypot(plan.psi1R, plan.h)), label: '1 psi' });
    ev.push({ t: plan.tau * 3, label: 'Nube estabilizada' });
    if (fx.fallout.length) ev.push({ t: 3600, label: 'H+1' });
    if (plan.isAsteroid) ev.push({ t: -plan.entryDuration * 0.98, label: 'Entrada' });
    timeline.configure(plan.isAsteroid ? -plan.entryDuration : 0, Math.max(plan.tEnd, ...extras.map((x) => x.plan.tEnd)), ev);
    timeline.setTour(Tour.available(fx));
    document.body.classList.add('detonated');
    syncStrikeMarkers();
    markerEl.style.display = 'none';
    applyView();
    syncHidden();
    if (plan.isAsteroid) audio.rumble(plan.entryDuration / rateAt(-1, run.speed));
    writeHash();
    fxLayer.animating = true;
    map.triggerRepaint();
    startTsunami(fx, lat, lon);
    if (state.view.heat !== 'off') void refreshHeat();
  } finally {
    busy = false;
  }
}

// ---------------------------------------------------------------- tsunami sobre la batimetría real
let tsuWorker: Worker | null = null;
function startTsunami(fx: Effects, lat: number, lon: number) {
  tsuWorker?.terminate(); tsuWorker = null;
  let K = 0, cap = 0, depth = 0, reachKm = 0;
  if (fx.tsunami && fx.tsunami.rimWaveM > 0.5) {
    K = (fx.tsunami.rimWaveM * fx.tsunami.transientM) / 2; cap = fx.tsunami.rimWaveM; depth = fx.tsunami.depthM;
    reachKm = Math.min(13000, K / 0.3 / 1000);
  } else if (fx.buried?.mode === 'underwater' && !fx.buried.contained) {
    const w1 = fx.rings.find((r) => r.id === 'wave1');
    if (!w1) return;
    K = w1.radiusM; cap = 10; depth = (fx.scenario.kind === 'nuclear' && fx.scenario.seaDepthM) || 100;
    reachKm = Math.min(3000, K / 0.1 / 1000);
  } else return;
  if (reachKm < 30) return;
  toast('Calculando la propagación del tsunami sobre el fondo marino…', 4000);
  const w = new Worker(new URL('./physics/tsunami.worker.ts', import.meta.url), { type: 'module' });
  tsuWorker = w;
  w.onmessage = (e) => {
    const d = e.data;
    if (d.done) { overlays.setTsunami(d); toast('Tsunami: isócronas de llegada (cada hora) y altura de la ola en la costa', 3500); w.terminate(); if (tsuWorker === w) tsuWorker = null; }
    else if (d.error) { console.warn('tsunami', d.error); toast('No se pudo calcular el tsunami sobre la batimetría', 3000); w.terminate(); }
  };
  w.postMessage({ lat, lon, reachKm, K, capM: cap, srcDepthM: depth });
}

function restartClock() {
  if (!run) return;
  run.t = run.plan.isAsteroid ? -run.plan.entryDuration : 0;
  run.playing = true;
  run.boomDone = false;
  run.flashDone = false;
  run.flashReal = -1;
  run.wideDone = false;
  run.beats = 0;
  run.lastReal = performance.now();
  overlays.setReveal(0, 0);
  fxLayer.animating = true;
  map.triggerRepaint();
}

/** ritmo de la simulación: cámara lenta en el destello, acelerado después */
function rateAt(t: number, speed: number) {
  if (t < 0) return 0.6 * speed;
  // con el paso de los días se acelera para recorrer la lluvia radiactiva o la ceniza en pocos minutos
  return speed * Math.min(Math.max(2400, t / 36), 0.12 + 0.35 * t);
}

const flashEl = document.getElementById('flash')!;
const gradeEl = document.getElementById('grade')!;
/** atenuación de destellos: 1 normal, menor si el usuario pidió reducirlos */
const flashMul = (normal = 1, reduced = 0.15) => (state.view.reduceFlash ? reduced : normal);
function applyReduceFlash() { document.body.classList.toggle('reduce-flash', state.view.reduceFlash); }
applyReduceFlash();
/** aviso de fotosensibilidad la primera vez que se lanza una simulación con destello */
function photoWarning() {
  try { if (localStorage.getItem('bum:photowarn')) return; localStorage.setItem('bum:photowarn', '1'); } catch { return; }
  if (state.view.reduceFlash) return;
  const box = h('div', { id: 'photowarn', role: 'alertdialog', 'aria-label': 'Aviso de fotosensibilidad' },
    h('b', {}, 'Aviso de fotosensibilidad'),
    h('p', {}, 'La simulación muestra destellos intensos y cambios bruscos de luz. Si eres sensible a ellos, puedes reducirlos ahora o más tarde en Mapas y capas → Efectos.'),
    h('div', {},
      h('button', { type: 'button', class: 'btn-line', onclick: () => { state.view.reduceFlash = true; applyReduceFlash(); savePrefs(); box.remove(); toast('Destellos reducidos'); } }, 'Reducir destellos'),
      h('button', { type: 'button', class: 'btn-ghost', onclick: () => box.remove() }, 'Entendido')));
  document.getElementById('app')!.append(box);
  setTimeout(() => box.remove(), 30000);
}
function setFlash(a: number, g: number) {
  flashEl.style.opacity = String(a);
  gradeEl.style.opacity = String(g);
}

let shakeT = 0, shakeI = 0;
const mapEl = document.getElementById('map')!;

let tmpColor!: THREE.Color;
function onFxFrame(ctx: FrameCtx) {
  const now = performance.now();
  ctx.real = now / 1000;
  if (!run) return;
  const R = run;
  const P = R.plan;
  const dt = Math.min(0.1, (now - R.lastReal) / 1000);
  R.lastReal = now;
  if (R.playing) {
    R.rate = rateAt(R.t, R.speed);
    R.t += dt * R.rate;
    if (R.t >= P.tEnd) { R.t = P.tEnd; R.playing = false; }
  }
  const t = R.t;
  ctx.t = t;

  // iluminación ambiental
  const alt = Math.max(-0.2, atmosphere.sunAlt) * 1.1;
  const az = (atmosphere.sunAz * Math.PI) / 180;
  const n = atmosphere.night;
  if (atmosphere.sunAlt > -0.05) {
    ctx.sunDir.set(Math.sin(az) * Math.cos(alt), Math.max(0.08, Math.sin(alt)), -Math.cos(az) * Math.cos(alt)).normalize();
  } else ctx.sunDir.set(0.3, 0.85, -0.3).normalize();
  const dusk = Math.max(0, 1 - Math.abs(atmosphere.sunAlt) / 0.35);
  ctx.sunColor.setRGB(0.92, 0.86 - 0.25 * dusk, 0.78 - 0.4 * dusk).lerp(tmpColor.setRGB(0.12, 0.14, 0.2), n);
  ctx.ambient.setRGB(0.26, 0.29, 0.36).lerp(tmpColor.setRGB(0.11, 0.1, 0.11), n);
  ctx.fogColor.setRGB(0.78, 0.84, 0.9).lerp(tmpColor.setRGB(0.03, 0.04, 0.07), n);
  ctx.night = n;
  // la bola de fuego ilumina el entorno
  const heat = P.heat(t);
  if (heat > 0.02) {
    const k = Math.min(1.5, heat * heat);
    const kg = k * (0.4 + 0.6 * ctx.glare);
    ctx.ambient.r += 0.9 * kg; ctx.ambient.g += 0.5 * kg; ctx.ambient.b += 0.2 * kg;
  }

  // destello en pantalla
  if (t > 0) {
    const fxp = map.project([R.lon, R.lat]);
    flashEl.style.setProperty('--fx', `${(fxp.x / mapEl.clientWidth) * 100}%`);
    flashEl.style.setProperty('--fy', `${(fxp.y / mapEl.clientHeight) * 100 - 8}%`);
    const camLL = (map as any).transform.getCameraLngLat();
    const dCam = haversineKm(camLL.lat, camLL.lng, R.lat, R.lon) * 1000 + 1;
    const near = Math.min(1, Math.max(0.35, (P.fireballR * 25) / dCam));
    if (R.flashReal < 0) R.flashReal = now;
    // el deslumbramiento dura pocos segundos reales aunque la bola de fuego siga caliente
    const since = now - R.flashReal;
    const envFlash = Math.exp(-since / 1600);
    const envGrade = 0.25 + 0.75 * Math.exp(-since / 5000);
    const a = Math.min(1, Math.max(0, (heat - 0.55) / 0.55)) ** 1.6 * near * envFlash;
    // con destellos reducidos, el brillo sube despacio (≥ 0,6 s) y se queda en un resplandor suave
    const ramp = state.view.reduceFlash ? Math.min(1, since / 600) : 1;
    setFlash(a * 0.95 * flashMul(1, 0.12) * ramp, Math.min(0.6, heat * 0.5) * envGrade * flashMul(1, 0.5));
    ctx.glare = envGrade;
    if (!R.flashDone && t > 0) { R.flashDone = true; audio.flash(Math.min(1, near)); }
  } else {
    setFlash(0, 0);
  }

  // cielo y luz del mapa durante el destello (limitado a ~8 Hz)
  if (now - R.lastOverlay > 120) {
    R.lastOverlay = now;
    if (heat > 0.03 && t > 0) {
      const k = Math.min(1, heat) * 0.85 * (R.flashReal < 0 ? 1 : 0.2 + 0.8 * Math.exp(-(now - R.flashReal) / 5000)) * flashMul(1, 0.3);
      const mix = (a: string, b: string, x: number) => '#' + new FX.Color(a).lerp(new FX.Color(b), x).getHexString();
      map.setSky({ ...SKY_BLENDS, 'sky-color': mix(n > 0.5 ? '#03060f' : '#4f8fd6', '#ffe1b0', k), 'horizon-color': mix(n > 0.5 ? '#0b1428' : '#cfe2f3', '#ffb46b', k), 'fog-color': mix(n > 0.5 ? '#070b16' : '#c8d8e6', '#ff9a50', k * 0.9) });
      map.setLight({ anchor: 'map', position: [1.4, atmosphere.sunAz, 40], color: mix('#ffffff', '#ffb070', k), intensity: 0.35 + 0.55 * k });
      R.skyFlash = true;
    } else if (R.skyFlash) {
      R.skyFlash = false;
      atmosphere = tod();
    }
    if (R.fx.blackRain) showBlackRain(t >= R.fx.blackRain.startMin * 60 && state.view.fallout);
    const g = P.shockGroundR(t);
    overlays.setReveal(t <= 0 ? 0 : t > P.shockTime(P.psi1R * 3 + P.h) ? Infinity : Math.max(g, t > P.tMax * 3 ? Math.max(P.burnR, P.fireballR) : 0), t / 3600, t);
    overlays.updateBuildings(t <= 0 ? 0 : g);
    timeline.update(t, R.playing, R.playing ? R.rate : 0);
  }

  // llegada de la onda al observador: estampido + vibración
  if (!R.boomDone && t >= R.obsArrival && t > 0) {
    R.boomDone = true;
    const I = Math.min(1, Math.max(0.15, R.obsPsi / 1.5));
    audio.boom(I);
    shakeT = now; shakeI = I * flashMul(1, 0.25);
  }
  const st = (now - shakeT) / 1000;
  if (shakeI > 0 && st < 3) {
    const k = shakeI * Math.exp(-st * 1.6) * 14;
    mapEl.style.transform = `translate(${(Math.random() - 0.5) * k}px, ${(Math.random() - 0.5) * k}px)`;
  } else if (mapEl.style.transform) mapEl.style.transform = '';

  // cámara cinemática
  if (!R.userCam && !map.isMoving()) {
    if (R.beats === 0 && t > 0 && t > Math.min(P.shockTime(Math.hypot(P.psi5R || P.fireballR * 3, P.h)) * 0.6, P.tau * 0.4)) {
      R.beats = 1;
      frame(Math.max(Math.min(P.psi1R * 1.25, P.capTop * 4), P.capTop * 0.9, P.fireballR * 8), 6000, 64, -25);
    } else if (R.beats >= 2 && !R.wideDone && P.psi1R > P.capTop * 4 && t > P.shockTime(Math.hypot(P.psi1R, P.h)) * 0.7) {
      // efectos gigantes: plano general cuando la onda ya ha recorrido la región
      R.wideDone = true;
      R.orbit = null;
      frame(P.psi1R * 1.15, 8000, 50, 0);
    } else if (R.beats === 1 && t > P.tau * 0.8 && !P.highAltitude) {
      R.beats = 2;
      cloudShot(7000, true, true);
    } else if (R.beats === 2 && R.fx.fallout.length && t > 1800) {
      R.beats = 3;
      R.orbit = null;
      frame(Math.max(Math.min(P.falloutExtKm * 1000, P.falloutFront(4 * 3600)) * 0.6, P.psi1R * 2, P.capR * 3), 8000, 55, 0);
    } else if (R.beats === 3 && t > 4 * 3600) {
      R.beats = 4;
      frame(Math.max(Math.min(P.falloutExtKm * 1000, P.falloutFront(P.tEnd)) * 0.6, P.psi1R * 2), 8000, 50, 0);
    } else if (R.orbit) {
      // órbita lenta alrededor del hongo
      R.orbit.bearing += dt * 2;
      const cam = cloudCamera(R.orbit.bearing, R.orbit.final);
      if (cam) map.jumpTo(cam);
    } else if (R.playing) {
      map.setBearing(map.getBearing() + dt * 1.2);
    }
  }

  // calidad automática: mide los fotogramas por segundo para elegir la calidad de la próxima
  // simulación (nunca baja la resolución del mapa: los textos y las líneas se verían borrosos)
  if (state.view.autoQ && R.playing && now - autoQ.last > 1500) {
    autoQ.last = now;
    autoQ.fps = 1000 / Math.max(1, fxLayer.frameMs);
    sidebar.qualVal.textContent = `${Math.round(autoQ.fps)} fps`;
  }

  // post-procesado
  const post = fxLayer.post;
  post.enabled = state.view.post;
  const pp = post.params;
  if (state.view.post && t > 0) {
    pp.fb.set(0, P.capZ(t), 0);
    pp.fbR = Math.max(P.fireballRadius(t), 1);
    const hk = Math.min(1.2, heat);
    pp.flare = hk * 0.9 * (0.5 + 0.5 * ctx.glare) * flashMul(1, 0.25);
    pp.haze = P.flashK > 0 ? Math.min(1, hk * 1.2 + 0.55 * Math.exp(-t / (P.tau * 0.7 + 1))) * P.flashK * flashMul(1, 0.4) : 0;
    pp.bloom = hk > 0.05 ? Math.min(0.6, 0.45 * Math.min(1, hk * 1.4)) * flashMul(1, 0.3) : 0;
    pp.threshold = 0.85;
    const gR = P.shockGroundR(t), lim = P.psi1R * 1.3;
    pp.shockR = gR;
    pp.shockK = gR > 0 && lim > 0 && gR < lim ? Math.pow(1 - gR / lim, 0.7) * (P.buried?.contained ? 0 : 1) : 0;
  } else { pp.flare = 0; pp.haze = 0; pp.bloom = 0; pp.shockK = 0; }

  fxLayer.animating = true;
}

// ---------------------------------------------------------------------------
// enlaces compartibles
// ---------------------------------------------------------------------------
function writeHash() {
  const p = new URLSearchParams();
  const s = state;
  p.set('lat', s.target.lat.toFixed(5));
  p.set('lon', s.target.lon.toFixed(5));
  if (s.mode === 'nuclear') {
    p.set('m', 'n'); p.set('y', String(s.nuke.yieldKt)); p.set('f', String(s.nuke.fission)); p.set('b', s.nuke.burst); p.set('hb', String(s.nuke.heightM)); p.set('nm', s.nuke.name);
    if (s.nuke.chemical) p.set('ch', '1');
    if (s.nuke.burst === 'underground' || s.nuke.burst === 'underwater') { p.set('dp', String(s.nuke.depthM ?? 50)); p.set('sw', String(s.nuke.seaDepthM ?? 100)); }
  } else if (s.mode === 'other') {
    const o = s.other;
    p.set('m', 'o'); p.set('ot', o.type);
    if (o.type === 'volcano') { p.set('vei', String(o.volcano.vei)); p.set('vm', String(o.volcano.volumeMul ?? 1)); p.set('nm', o.volcano.name); }
    else { const r = o.release; p.set('iso', r.isotope); p.set('act', String(r.activityTBq)); p.set('hg', String(r.heightM)); p.set('du', String(r.durationH ?? 1)); if (r.explosiveKg) p.set('kg', String(r.explosiveKg)); p.set('nm', r.name); }
  } else {
    const a = s.ast;
    p.set('m', 'a'); p.set('d', String(+a.diameterM.toPrecision(4))); p.set('rho', String(a.densityKgM3)); p.set('v', String(a.velocityKms)); p.set('ang', String(a.angleDeg)); p.set('tg', a.surface); p.set('wd', String(a.waterDepthM)); p.set('az', String(a.azimuth)); p.set('nm', a.name);
  }
  if (s.view.globe) p.set('g', '1');
  p.set('wf', String(s.env.windFromDeg)); p.set('ws', String(s.env.windKmh)); p.set('hu', String(s.env.humidity)); p.set('vi', String(s.env.visibilityKm)); p.set('hr', String(s.env.hour));
  if (s.env.outdoorPct != null) p.set('op', String(s.env.outdoorPct));
  if (s.env.rainMmH) p.set('rn', String(s.env.rainMmH));
  if (s.env.windProfile?.length) p.set('wp', s.env.windProfile.map((l) => `${Math.round(l.zM)}:${Math.round(l.fromDeg)}:${Math.round(l.kmh)}`).join(';'));
  history.replaceState(null, '', '#' + p.toString());
}

function readHash(s: AppState) {
  if (location.hash.length < 3) return;
  const p = new URLSearchParams(location.hash.slice(1));
  const num = (k: string, d: number) => (p.has(k) && isFinite(+p.get(k)!) ? +p.get(k)! : d);
  s.target = { lat: num('lat', s.target.lat), lon: num('lon', s.target.lon), label: '' };
  s.target.label = nearestCity(s.target.lat, s.target.lon).km < 25 ? nearestCity(s.target.lat, s.target.lon).city.name : '';
  if (p.get('m') === 'a') {
    s.mode = 'asteroid';
    Object.assign(s.ast, { diameterM: num('d', 60), densityKgM3: num('rho', 3000), velocityKms: num('v', 17), angleDeg: num('ang', 45), target: (p.get('tg') && p.get('tg') !== 'auto' ? p.get('tg') : 'sediment') as any, surface: (p.get('tg') as any) || 'auto', waterDepthM: num('wd', 0), azimuth: num('az', 250), name: p.get('nm') || 'Objeto' });
  } else if (p.get('m') === 'o') {
    s.mode = 'other';
    const ot = p.get('ot');
    s.other.type = ot === 'volcano' || ot === 'dirtybomb' || ot === 'dam' || ot === 'solar' ? ot : 'reactor';
    if (s.other.type === 'volcano') Object.assign(s.other.volcano, { vei: Math.max(4, Math.min(8, num('vei', 8))), volumeMul: num('vm', 1), name: p.get('nm') || 'Volcán' });
    else Object.assign(s.other.release, { source: s.other.type, isotope: (['Cs-137','I-131','Co-60','Sr-90','Am-241'].includes(p.get('iso') ?? '') ? p.get('iso') : 'Cs-137') as any, activityTBq: num('act', 85000), heightM: num('hg', 1000), durationH: num('du', 240), explosiveKg: p.has('kg') ? num('kg', 50) : undefined, name: p.get('nm') || 'Emisión' });
  } else {
    s.mode = 'nuclear';
    Object.assign(s.nuke, { yieldKt: num('y', 1000), fission: num('f', 0.5), burst: (p.get('b') as any) || 'optimal', heightM: num('hb', 0), name: p.get('nm') || 'Arma', chemical: p.get('ch') === '1', depthM: num('dp', 50), seaDepthM: num('sw', 100) });
  }
  if (p.get('g') === '1') s.view.globe = true;
  Object.assign(s.env, { windFromDeg: num('wf', 270), windKmh: num('ws', 24), humidity: num('hu', 60), visibilityKm: num('vi', 25), hour: num('hr', 12), outdoorPct: p.has('op') ? num('op', 25) : null, rainMmH: num('rn', 0) });
  const wp = p.get('wp');
  s.env.windProfile = wp ? wp.split(';').map((x) => x.split(':').map(Number)).filter((a) => a.length === 3 && a.every(Number.isFinite)).map(([zM, fromDeg, kmh]) => ({ zM, fromDeg, kmh })) : null;
  // un enlace compartido conserva su entorno: no se sustituye por el tiempo real
  s.live = false;
}

function share() {
  writeHash();
  navigator.clipboard?.writeText(location.href).then(() => toast('Enlace copiado al portapapeles'), () => toast(location.href, 5000));
}

// depuración / pruebas automáticas
(window as any).__an = { map, state, detonate, enc, cloudShot, groundView, testsLayer, setHeat, tour, weatherLayer, heatLayer, get fxLayer() { return fxLayer; }, get run() { return run; }, seek: (t: number) => { if (run) { run.t = t; run.lastOverlay = 0; run.playing = false; map.triggerRepaint(); } }, fmtTime };

// ---------------------------------------------------------------- app instalable (PWA)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* sin service worker */ }); });
}
let installEvt: (Event & { prompt(): Promise<void> }) | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvt = e as never;
});
window.addEventListener('appinstalled', () => { installEvt = null; });

