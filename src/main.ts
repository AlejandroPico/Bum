import { Encyclopedia, BOOK_ICON } from './encyclopedia/Encyclopedia';
import { slug } from './encyclopedia/slug';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import maplibregl from 'maplibre-gl';
import * as THREE from 'three';
import { createMap, applyTimeOfDay, setGlobe, SKY_BLENDS } from './map/map';
import { BASEMAPS, setBasemap, type BasemapId } from './map/basemaps';
import { sampleElevation } from './map/elevation';
import { Overlays, localToLngLat, destination } from './map/overlays';
import { TestsLayer } from './map/tests-layer';
import { FxLayer } from './fx/FxLayer';
import { FxPlan } from './fx/plan';
import { Fireball } from './fx/Fireball';
import { Shock } from './fx/Shock';
import { Rubble } from './fx/Rubble';
import { Mushroom } from './fx/Mushroom';
import { Domes } from './fx/Domes';
import { Fires } from './fx/Fires';
import { Bolide } from './fx/Bolide';
import { Audio } from './fx/audio';
import { createPuffAtlas, createCloudNoise3D } from './fx/textures';
import { VolumeCloud } from './fx/VolumeCloud';
import type { FrameCtx } from './fx/types';
import { computeEffects, combinedCasualties } from './physics/effects';
import { nearestCity, haversineKm, setRealPopulation } from './data/cities';
import { loadRealPopulation } from './data/worldpop';
import { fetchInfrastructure } from './data/osm';
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
const fxLayer = new FxLayer();
const audio = new Audio();
let puffTex: THREE.Texture | null = null;
let cloudNoise: THREE.Data3DTexture | null = null;
createCloudNoise3D(64).then((t) => { cloudNoise = t; });

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
/** iluminación según la hora (o siempre de día si el usuario lo elige) */
function tod() { return applyTimeOfDay(map, state.view.forceDay ? 12.5 : state.env.hour); }

// preferencias de mapa guardadas en este navegador
const PREF_KEY = 'bum:mapprefs';
try {
  const pr = JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}');
  for (const k of ['basemap', 'fxOpacity', 'forceDay', 'terrain3d', 'buildings', 'mapLabels', 'tests', 'post', 'autoQ', 'quality', 'realPop'] as const) if (k in pr) (state.view as any)[k] = pr[k];
} catch { /* sin almacenamiento */ }
function savePrefs() {
  const V = state.view;
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ basemap: V.basemap, fxOpacity: V.fxOpacity, forceDay: V.forceDay, terrain3d: V.terrain3d, buildings: V.buildings, mapLabels: V.mapLabels, tests: V.tests, post: V.post, autoQ: V.autoQ, quality: V.quality, realPop: V.realPop })); } catch { /* sin almacenamiento */ }
}


// ---------------------------------------------------------------------------
// interfaz
// ---------------------------------------------------------------------------
const sidebar = new Sidebar(document.getElementById('sidebar')!, state, {
  onDetonate: () => detonate(),
  onClear: () => clearRun(),
  onTarget: (lat, lon, label, fly) => setTarget(lat, lon, label, fly),
  onEnv: () => { atmosphere = tod(); },
  onView: () => applyView(),
  onCollapse: () => toggleUI(),
  onProjection: (g) => applyProjection(g),
  onMulti: () => syncStrikeMarkers(),
});

const enc = new Encyclopedia((preset) => {
  if (sidebar.selectPreset(preset)) { toast(`Simulando: ${preset}`); setTimeout(() => detonate(), 400); }
});

const results = new ResultsPanel(document.getElementById('results')!, {
  onBook: (name) => { enc.hasPreset(name).then((ok) => enc.open(ok ? slug(name) : '')); },
  onToggle: () => syncHidden(),
  onHover: (id) => { overlays.highlight = id; overlays.refresh(); if (run) run.domes.highlight = id; map.triggerRepaint(); },
  onShare: () => share(),
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
  onGround: () => groundView(),
  onCloud: () => { if (run) { run.userCam = false; run.beats = Math.max(run.beats, 2); cloudShot(3500, run.t > run.plan.tau * 0.8, true); } },
});

const showBtn = h('button', { id: 'ui-show', class: 'icon-btn glass', title: 'Mostrar panel (H)', html: ICONS.show, onclick: () => toggleUI() });
document.getElementById('app')!.append(showBtn);

/** deja libre el espacio de los paneles para que la zona cero quede centrada en la parte visible */
function updatePadding() {
  const left = document.body.classList.contains('ui-collapsed') || window.innerWidth < 760 ? 0 : 340;
  const right = run && !document.getElementById('results')!.classList.contains('hidden') && window.innerWidth >= 760 ? 392 : 0;
  map.setPadding({ left, right, top: 0, bottom: 0 });
}

let globeBtn: HTMLButtonElement | null = null;
function applyProjection(globe: boolean) {
  state.view.globe = globe;
  setGlobe(map, globe);
  // el objeto de transformación cambia con la proyección: reinstala el ajuste del plano lejano
  setTimeout(() => fxLayer.patchFarPlane(), 0);
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
  detectSurface(lat, lon);
  marker.setLngLat([lon, lat]);
  markerEl.style.display = '';
  if (state.live) sidebar.loadWeather(true);
  if (fly) map.flyTo({ center: [lon, lat], zoom: 12.8, pitch: 62, duration: 2800, essential: true });
}

// ---------------------------------------------------------------------------
// mapa
// ---------------------------------------------------------------------------
class GlobeControl {
  onAdd() {
    const div = document.createElement('div');
    div.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    globeBtn = document.createElement('button');
    globeBtn.type = 'button';
    globeBtn.className = 'globe-btn';
    globeBtn.title = 'Cambiar entre mapa plano y globo 3D';
    globeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/></svg>';
    globeBtn.onclick = () => applyProjection(!state.view.globe);
    div.append(globeBtn);
    return div;
  }
  onRemove() {}
}
map.addControl(new GlobeControl() as any, 'top-right');

class BookControl {
  onAdd() {
    const div = document.createElement('div');
    div.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'book-btn';
    b.title = 'Enciclopedia (E)';
    b.setAttribute('aria-label', 'Abrir la enciclopedia');
    b.innerHTML = BOOK_ICON;
    b.onclick = () => enc.toggle();
    div.append(b);
    return div;
  }
  onRemove() {}
}
map.addControl(new BookControl() as any, 'top-right');

// ---------------------------------------------------------------- capas del mapa
const LAYERS_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="miter"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12.5l9 5 9-5"/><path d="M3 17l9 5 9-5"/></svg>';
const layersPanel = h('div', { id: 'layers-panel', class: 'glass hidden' });
document.getElementById('app')!.append(layersPanel);
function buildLayersPanel() {
  const V = state.view;
  layersPanel.innerHTML = '';
  layersPanel.append(h('div', { class: 'lp-h' }, 'Mapa base'));
  for (const b of BASEMAPS) {
    const row = h('button', { type: 'button', class: 'lp-base' + (V.basemap === b.id ? ' on' : ''), onclick: () => { V.basemap = b.id; applyMapPrefs(); buildLayersPanel(); } },
      h('b', {}, b.name), h('span', {}, b.desc));
    layersPanel.append(row);
  }
  layersPanel.append(h('div', { class: 'lp-h' }, 'Opciones'));
  const tg = (label: string, key: 'terrain3d' | 'buildings' | 'mapLabels' | 'forceDay' | 'tests') => {
    const inp = h('input', { type: 'checkbox' }) as HTMLInputElement;
    inp.checked = V[key];
    inp.addEventListener('change', () => { V[key] = inp.checked; applyMapPrefs(); });
    return h('label', { class: 'toggle' }, inp, h('span', { class: 'sw' }), label);
  };
  layersPanel.append(h('div', { class: 'toggles one lp-tg' }, tg('Relieve 3D', 'terrain3d'), tg('Edificios 3D', 'buildings'), tg('Nombres de lugares', 'mapLabels'), tg('Luz de día siempre', 'forceDay'), tg('Pruebas nucleares (1945–2017)', 'tests')));
  const val = h('b', {}, `${Math.round(V.fxOpacity * 100)} %`);
  const r = h('input', { type: 'range', min: 0, max: 100, step: 1, value: Math.round(V.fxOpacity * 100) }) as HTMLInputElement;
  setRangeFill(r);
  r.addEventListener('input', () => { V.fxOpacity = +r.value / 100; val.textContent = `${r.value} %`; setRangeFill(r); applyFxOpacity(); savePrefs(); });
  layersPanel.append(h('div', { class: 'lp-h' }, 'Efectos'), h('label', { class: 'field' }, h('div', { class: 'field-head' }, h('span', {}, 'Opacidad de anillos, cúpulas y marcas'), val), r));
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
class LayersControl {
  onAdd() {
    const div = document.createElement('div');
    div.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'layers-btn';
    b.title = 'Mapas y capas';
    b.setAttribute('aria-label', 'Mapas y capas');
    b.innerHTML = LAYERS_ICON;
    b.onclick = (e) => { e.stopPropagation(); const open = layersPanel.classList.toggle('hidden') === false; b.classList.toggle('on', open); if (open) { buildLayersPanel(); const r = b.getBoundingClientRect(); layersPanel.style.top = `${r.top}px`; layersPanel.style.right = `${window.innerWidth - r.left + 8}px`; } };
    div.append(b);
    document.addEventListener('click', (e) => { if (!layersPanel.contains(e.target as Node) && e.target !== b) { layersPanel.classList.add('hidden'); b.classList.remove('on'); } });
    return div;
  }
  onRemove() {}
}
map.addControl(new LayersControl() as any, 'top-right');

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

map.on('load', () => {
  overlays.install();
  testsLayer.install();
  applyMapPrefs();
  map.addLayer(fxLayer, 'fx-labels');
  atmosphere = tod();
  puffTex = createPuffAtlas(1024);
  if (state.view.globe) applyProjection(true);
  detectSurface(state.target.lat, state.target.lon);
  if (state.live) sidebar.loadWeather(true);
  document.getElementById('loading')!.classList.add('done');
  if (location.hash.length > 3) setTimeout(() => detonate(), 1200);
});

map.on('click', (e) => {
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

for (const ev of ['dragstart', 'rotatestart', 'pitchstart', 'wheel'] as const) {
  map.on(ev, (e: any) => { if (run && e.originalEvent) { run.userCam = true; run.orbit = null; } });
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
    for (const m of fxLayer.modules) if (m instanceof Fires) m.object.visible = V.fires;
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
  return Math.max(1.5, Math.min(16.5, Math.log2((40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * mpp))));
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
const autoQ = { last: 0, ratio: 0, fps: 60 };
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

// ---------------------------------------------------------------------------
// simulación
// ---------------------------------------------------------------------------
function clearRun() {
  resetFov();
  fxLayer.clear();
  fxLayer.animating = false;
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
  if (sc.kind === 'asteroid' && state.ast.surface === 'auto') {
    const info = surfaceInfo && surfaceInfo.lat === lat && surfaceInfo.lon === lon ? surfaceInfo : await detectSurface(lat, lon);
    const elev = info?.elev ?? 0;
    if (elev < -2) { sc.target = 'water'; sc.waterDepthM = Math.min(11000, -elev); }
    else { sc.target = elev > 1500 ? 'rock' : 'sediment'; sc.waterDepthM = 0; }
  }
  return sc;
}

async function detonate() {
  if (!puffTex) { map.once('load', () => setTimeout(() => detonate(), 300)); return; } // aún cargando: se lanza al terminar
  if (busy) return;
  busy = true;
  try {
    audio.unlock();
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
    let bearing = map.getBearing();
    if (plan.isAsteroid) {
      // vista lateral de la trayectoria para ver llegar el bólido
      const path = plan.entrySpeed * plan.entryDuration;
      r0 = Math.max(path * 0.6, plan.fireballR * 2.5, plan.h * 4, 30000) + spread;
      bearing = (list[0].azimuth ?? state.ast.azimuth) + 90;
    }
    const z0 = zoomForRadius(r0, cLat);
    if (far || Math.abs(map.getZoom() - z0) > 1.2 || plan.isAsteroid || comp.length > 1) {
      map.easeTo({ center: [cLon, cLat], zoom: z0, pitch: plan.isAsteroid ? 55 : 66, bearing, duration: far ? 2600 : 1600, essential: true });
      await waitIdle(far ? 6000 : 3500);
    }
    const elev = map.queryTerrainElevation([lon, lat]) ?? 0;
    fxLayer.setOrigin(lon, lat, elev);
    fxLayer.extentM = Math.max(...fx.rings.filter((r) => r.dome).map((r) => r.radiusM), fx.cloud.capRadiusM * 2.5, fx.cloud.topM * 1.5, 1000) + spread * 2;
    (map as any).transform?._calcMatrices?.();
    if (state.view.autoQ) {
      const dpr = window.devicePixelRatio || 1;
      state.view.quality = autoQ.fps < 22 || (autoQ.ratio && autoQ.ratio < dpr * 0.7) ? 0.5 : 1;
    } else if (autoQ.ratio) { autoQ.ratio = 0; map.setPixelRatio(window.devicePixelRatio || 1); }
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
      const domes = new Domes(pl);
      domes.enabled = state.view.domes;
      domes.opacity = state.view.fxOpacity;
      domes.hidden = new Set(results.hidden);
      mods.push(domes);
      if (primary && pl.isAsteroid) mods.push(new Bolide(pl, puffTex!));
      const fires = new Fires(pl, puffTex!, elevAt, primary ? q : q * 0.5);
      fires.object.visible = state.view.fires;
      mods.push(fires);
      if (cloudNoise) mods.push(new VolumeCloud(pl, cloudNoise, primary ? q : Math.min(q, 0.6)));
      mods.push(new Mushroom(pl, puffTex!, primary ? q : q * 0.5, !!cloudNoise));
      mods.push(new Shock(pl));
      if (Rubble.wanted(pl)) mods.push(new Rubble(pl, primary ? q : q * 0.5));
      mods.push(new Fireball(pl));
      for (const m of mods) { fxLayer.add(m); m.object.position.set(e, el, -n); m.object.updateMatrixWorld(); }
      void fxi;
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
    }
    updatePadding();

    run = {
      fx, plan, lat, lon, t: plan.isAsteroid ? -plan.entryDuration : 0, playing: true, speed: 1, lastReal: performance.now(),
      boomDone: false, flashDone: false, obsArrival: plan.shockTime(Math.hypot(dObs, plan.h)), obsPsi: fx.pressurePsiAt(dObs),
      domes: main.domes, beats: 0, userCam: !state.view.cinematic || comp.length > 1, lastOverlay: 0, skyFlash: false, rate: 1, orbit: null, flashReal: -1, wideDone: false,
      extras,
    };
    const ev: { t: number; label: string }[] = [{ t: plan.tMax, label: 'Destello' }];
    if (plan.psi5R) ev.push({ t: plan.shockTime(Math.hypot(plan.psi5R, plan.h)), label: 'Onda 5 psi' });
    if (plan.psi1R) ev.push({ t: plan.shockTime(Math.hypot(plan.psi1R, plan.h)), label: '1 psi' });
    ev.push({ t: plan.tau * 3, label: 'Nube estabilizada' });
    if (fx.fallout.length) ev.push({ t: 3600, label: 'H+1' });
    if (plan.isAsteroid) ev.push({ t: -plan.entryDuration * 0.98, label: 'Entrada' });
    timeline.configure(plan.isAsteroid ? -plan.entryDuration : 0, Math.max(plan.tEnd, ...extras.map((x) => x.plan.tEnd)), ev);
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
  return speed * Math.min(2400, 0.12 + 0.35 * t);
}

const flashEl = document.getElementById('flash')!;
const gradeEl = document.getElementById('grade')!;
function setFlash(a: number, g: number) {
  flashEl.style.opacity = String(a);
  gradeEl.style.opacity = String(g);
}

let shakeT = 0, shakeI = 0;
const mapEl = document.getElementById('map')!;

const tmpColor = new THREE.Color();
fxLayer.onFrame = (ctx: FrameCtx) => {
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
    setFlash(a * 0.95, Math.min(0.6, heat * 0.5) * envGrade);
    ctx.glare = envGrade;
    if (!R.flashDone && t > 0) { R.flashDone = true; audio.flash(Math.min(1, near)); }
  } else {
    setFlash(0, 0);
  }

  // cielo y luz del mapa durante el destello (limitado a ~8 Hz)
  if (now - R.lastOverlay > 120) {
    R.lastOverlay = now;
    if (heat > 0.03 && t > 0) {
      const k = Math.min(1, heat) * 0.85 * (R.flashReal < 0 ? 1 : 0.2 + 0.8 * Math.exp(-(now - R.flashReal) / 5000));
      const mix = (a: string, b: string, x: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), x).getHexString();
      map.setSky({ ...SKY_BLENDS, 'sky-color': mix(n > 0.5 ? '#03060f' : '#4f8fd6', '#ffe1b0', k), 'horizon-color': mix(n > 0.5 ? '#0b1428' : '#cfe2f3', '#ffb46b', k), 'fog-color': mix(n > 0.5 ? '#070b16' : '#c8d8e6', '#ff9a50', k * 0.9) });
      map.setLight({ anchor: 'map', position: [1.4, atmosphere.sunAz, 40], color: mix('#ffffff', '#ffb070', k), intensity: 0.35 + 0.55 * k });
      R.skyFlash = true;
    } else if (R.skyFlash) {
      R.skyFlash = false;
      atmosphere = tod();
    }
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
    shakeT = now; shakeI = I;
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

  // calidad automática: ajusta la resolución de dibujo según los fotogramas por segundo
  if (state.view.autoQ && R.playing && now - autoQ.last > 1500) {
    autoQ.last = now;
    const fps = 1000 / Math.max(1, fxLayer.frameMs);
    const dpr = window.devicePixelRatio || 1;
    let r = autoQ.ratio || dpr;
    if (fps < 24 && r > dpr * 0.5) r = Math.max(dpr * 0.5, r * 0.85);
    else if (fps > 48 && r < dpr) r = Math.min(dpr, r * 1.12);
    if (Math.abs(r - (autoQ.ratio || dpr)) > 0.01) { autoQ.ratio = r; map.setPixelRatio(r); }
    autoQ.fps = fps;
    sidebar.qualVal.textContent = `${Math.round(fps)} fps · ${Math.round((r / dpr) * 100)} %`;
  }

  // post-procesado
  const post = fxLayer.post;
  post.enabled = state.view.post;
  const pp = post.params;
  if (state.view.post && t > 0) {
    pp.fb.set(0, P.capZ(t), 0);
    pp.fbR = Math.max(P.fireballRadius(t), 1);
    const hk = Math.min(1.2, heat);
    pp.flare = hk * 0.9 * (0.5 + 0.5 * ctx.glare);
    pp.haze = P.flashK > 0 ? Math.min(1, hk * 1.2 + 0.55 * Math.exp(-t / (P.tau * 0.7 + 1))) * P.flashK : 0;
    const firesOn = state.view.fires && P.ignitionR > 0 && t > P.tMax * 4 ? 1 : 0;
    pp.bloom = Math.min(0.9, 0.45 * Math.min(1, hk * 1.4) + n * 0.4 * firesOn);
    pp.threshold = n > 0.5 ? 0.55 : 0.8;
    const gR = P.shockGroundR(t), lim = P.psi1R * 1.3;
    pp.shockR = gR;
    pp.shockK = gR > 0 && lim > 0 && gR < lim ? Math.pow(1 - gR / lim, 0.7) * (P.buried?.contained ? 0 : 1) : 0;
  } else { pp.flare = 0; pp.haze = 0; pp.bloom = 0; pp.shockK = 0; }

  fxLayer.animating = true;
};

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
    s.other.type = ot === 'volcano' || ot === 'dirtybomb' ? ot : 'reactor';
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
(window as any).__an = { map, state, detonate, enc, cloudShot, groundView, testsLayer, fxLayer, get run() { return run; }, seek: (t: number) => { if (run) { run.t = t; run.lastOverlay = 0; run.playing = false; map.triggerRepaint(); } }, fmtTime };

// ---------------------------------------------------------------- app instalable (PWA)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* sin service worker */ }); });
}
let installEvt: (Event & { prompt(): Promise<void> }) | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvt = e as never;
  const head = document.querySelector('.sb-head');
  if (head && !head.querySelector('.install-btn')) {
    const b = h('button', { class: 'btn-ghost install-btn', type: 'button', title: 'Instalar Bum como aplicación', onclick: async () => { if (!installEvt) return; await installEvt.prompt(); installEvt = null; b.remove(); } }, 'Instalar');
    head.insertBefore(b, head.querySelector('.icon-btn'));
  }
});

