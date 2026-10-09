import { Encyclopedia, BOOK_ICON } from './encyclopedia/Encyclopedia';
import { slug } from './encyclopedia/slug';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import maplibregl from 'maplibre-gl';
import * as THREE from 'three';
import { createMap, applyTimeOfDay, setGlobe, SKY_BLENDS } from './map/map';
import { sampleElevation } from './map/elevation';
import { Overlays, localToLngLat, destination } from './map/overlays';
import { FxLayer } from './fx/FxLayer';
import { FxPlan } from './fx/plan';
import { Fireball } from './fx/Fireball';
import { Shock } from './fx/Shock';
import { Mushroom } from './fx/Mushroom';
import { Domes } from './fx/Domes';
import { Fires } from './fx/Fires';
import { Bolide } from './fx/Bolide';
import { Audio } from './fx/audio';
import { createPuffAtlas, createCloudNoise3D } from './fx/textures';
import { VolumeCloud } from './fx/VolumeCloud';
import type { FrameCtx } from './fx/types';
import { computeEffects } from './physics/effects';
import { nearestCity, haversineKm } from './data/cities';
import type { Effects } from './physics/types';
import { Sidebar, defaultState, type AppState } from './ui/sidebar';
import { ResultsPanel } from './ui/results';
import { Timeline } from './ui/timeline';
import { h, ICONS, toast, fmtTime } from './ui/dom';

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
}
let run: Run | null = null;
let atmosphere = { night: 0, sunAlt: 1, sunAz: 180 };

// ---------------------------------------------------------------------------
// interfaz
// ---------------------------------------------------------------------------
const sidebar = new Sidebar(document.getElementById('sidebar')!, state, {
  onDetonate: () => detonate(),
  onClear: () => clearRun(),
  onTarget: (lat, lon, label, fly) => setTarget(lat, lon, label, fly),
  onEnv: () => { atmosphere = applyTimeOfDay(map, state.env.hour); },
  onView: () => applyView(),
  onCollapse: () => toggleUI(),
  onProjection: (g) => applyProjection(g),
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

map.on('load', () => {
  overlays.install();
  map.addLayer(fxLayer, 'fx-labels');
  atmosphere = applyTimeOfDay(map, state.env.hour);
  puffTex = createPuffAtlas(1024);
  if (state.view.globe) applyProjection(true);
  detectSurface(state.target.lat, state.target.lon);
  if (state.live) sidebar.loadWeather(true);
  document.getElementById('loading')!.classList.add('done');
  if (location.hash.length > 3) setTimeout(() => detonate(), 1200);
});

map.on('click', (e) => {
  const c = nearestCity(e.lngLat.lat, e.lngLat.lng);
  const label = c.km < 25 ? c.city.name : '';
  setTarget(e.lngLat.lat, e.lngLat.lng, label, false);
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
    for (const m of fxLayer.modules) if (m instanceof Fires) m.object.visible = V.fires;
  }
  map.triggerRepaint();
}

function syncHidden() {
  overlays.setHidden(new Set(results.hidden));
  if (run) run.domes.hidden = new Set(results.hidden);
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

function cloudShot(duration = 6500, final = true, orbit = true) {
  if (!run) return;
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
  fxLayer.clear();
  fxLayer.animating = false;
  run = null;
  overlays.set(null);
  results.hide();
  updatePadding();
  document.getElementById('timeline')!.classList.add('hidden');
  document.body.classList.remove('detonated');
  setFlash(0, 0);
  atmosphere = applyTimeOfDay(map, state.env.hour);
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
async function detonate() {
  if (busy || !puffTex) return;
  busy = true;
  try {
    audio.unlock();
    const { lat, lon } = state.target;
    const sc = state.mode === 'nuclear' ? { ...state.nuke } : { ...state.ast };
    if (sc.kind === 'asteroid' && state.ast.surface === 'auto') {
      const info = surfaceInfo && surfaceInfo.lat === lat && surfaceInfo.lon === lon ? surfaceInfo : await detectSurface(lat, lon);
      const elev = info?.elev ?? 0;
      if (elev < -2) { sc.target = 'water'; sc.waterDepthM = Math.min(11000, -elev); }
      else { sc.target = elev > 1500 ? 'rock' : 'sediment'; sc.waterDepthM = 0; }
    }
    const env = { ...state.env };
    const fx = computeEffects(sc, env, lat, lon);
    clearRun();
    const plan = new FxPlan(fx, env);
    if (sc.kind === 'asteroid') plan.entryAzimuth = state.ast.azimuth;

    // encuadre inicial
    const c = map.getCenter();
    const far = haversineKm(c.lat, c.lng, lat, lon) > 3;
    let r0 = Math.max(plan.psi5R * 1.6, plan.fireballR * 7, plan.capTop * 0.5, 1500);
    let bearing = map.getBearing();
    if (plan.isAsteroid) {
      // vista lateral de la trayectoria para ver llegar el bólido
      const path = plan.entrySpeed * plan.entryDuration;
      r0 = Math.max(path * 0.6, plan.fireballR * 2.5, plan.h * 4, 30000);
      bearing = state.ast.azimuth + 90;
    }
    const z0 = zoomForRadius(r0, lat);
    if (far || Math.abs(map.getZoom() - z0) > 1.2 || plan.isAsteroid) {
      map.easeTo({ center: [lon, lat], zoom: z0, pitch: plan.isAsteroid ? 55 : 66, bearing, duration: far ? 2600 : 1600, essential: true });
      await waitIdle(far ? 6000 : 3500);
    }
    const elev = map.queryTerrainElevation([lon, lat]) ?? 0;
    fxLayer.setOrigin(lon, lat, elev);
    fxLayer.extentM = Math.max(...fx.rings.filter((r) => r.dome).map((r) => r.radiusM), fx.cloud.capRadiusM * 2.5, fx.cloud.topM * 1.5, 1000);
    (map as any).transform?._calcMatrices?.();
    const elevAt = (e: number, n: number) => {
      const [x, y] = localToLngLat(lat, lon, e, n);
      const v = map.queryTerrainElevation([x, y]);
      return v === null || v === undefined ? 0 : v - elev;
    };
    const q = state.view.quality;
    const domes = new Domes(plan);
    domes.enabled = state.view.domes;
    domes.hidden = new Set(results.hidden);
    fxLayer.add(domes);
    if (plan.isAsteroid) fxLayer.add(new Bolide(plan, puffTex));
    const fires = new Fires(plan, puffTex, elevAt, q);
    fires.object.visible = state.view.fires;
    fxLayer.add(fires);
    // espera a la textura de ruido 3D (se genera en segundo plano al cargar)
    for (let i = 0; i < 60 && !cloudNoise; i++) await new Promise((r) => setTimeout(r, 50));
    if (cloudNoise) fxLayer.add(new VolumeCloud(plan, cloudNoise, q));
    fxLayer.add(new Mushroom(plan, puffTex, q, !!cloudNoise));
    fxLayer.add(new Shock(plan));
    fxLayer.add(new Fireball(plan));

    // observador (cámara) para el sonido y la vibración
    const camLL = (map as any).transform.getCameraLngLat();
    const dObs = haversineKm(camLL.lat, camLL.lng, lat, lon) * 1000;

    results.hidden.clear();
    overlays.set(fx, lat, lon, fx.windKmh);
    overlays.gateT = plan.fbDone;
    overlays.falloutDelayS = Math.max(plan.fbDone, plan.tau);
    overlays.setReveal(0, 0);
    const place = state.target.label || nearestCity(lat, lon).city.name;
    results.render(fx, `${place}`);
    updatePadding();

    run = {
      fx, plan, lat, lon, t: plan.isAsteroid ? -plan.entryDuration : 0, playing: true, speed: 1, lastReal: performance.now(),
      boomDone: false, flashDone: false, obsArrival: plan.shockTime(Math.hypot(dObs, plan.h)), obsPsi: fx.pressurePsiAt(dObs),
      domes, beats: 0, userCam: !state.view.cinematic, lastOverlay: 0, skyFlash: false, rate: 1, orbit: null, flashReal: -1, wideDone: false,
    };
    const ev: { t: number; label: string }[] = [{ t: plan.tMax, label: 'Destello' }];
    if (plan.psi5R) ev.push({ t: plan.shockTime(Math.hypot(plan.psi5R, plan.h)), label: 'Onda 5 psi' });
    if (plan.psi1R) ev.push({ t: plan.shockTime(Math.hypot(plan.psi1R, plan.h)), label: '1 psi' });
    ev.push({ t: plan.tau * 3, label: 'Nube estabilizada' });
    if (fx.fallout.length) ev.push({ t: 3600, label: 'H+1' });
    if (plan.isAsteroid) ev.push({ t: -plan.entryDuration * 0.98, label: 'Entrada' });
    timeline.configure(plan.isAsteroid ? -plan.entryDuration : 0, plan.tEnd, ev);
    document.body.classList.add('detonated');
    markerEl.style.display = 'none';
    applyView();
    syncHidden();
    if (plan.isAsteroid) audio.rumble(plan.entryDuration / rateAt(-1, run.speed));
    writeHash();
    fxLayer.animating = true;
    map.triggerRepaint();
  } finally {
    busy = false;
  }
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
      atmosphere = applyTimeOfDay(map, state.env.hour);
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
  } else {
    const a = s.ast;
    p.set('m', 'a'); p.set('d', String(a.diameterM)); p.set('rho', String(a.densityKgM3)); p.set('v', String(a.velocityKms)); p.set('ang', String(a.angleDeg)); p.set('tg', a.surface); p.set('wd', String(a.waterDepthM)); p.set('az', String(a.azimuth)); p.set('nm', a.name);
  }
  if (s.view.globe) p.set('g', '1');
  p.set('wf', String(s.env.windFromDeg)); p.set('ws', String(s.env.windKmh)); p.set('hu', String(s.env.humidity)); p.set('vi', String(s.env.visibilityKm)); p.set('hr', String(s.env.hour));
  if (s.env.outdoorPct != null) p.set('op', String(s.env.outdoorPct));
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
  } else {
    s.mode = 'nuclear';
    Object.assign(s.nuke, { yieldKt: num('y', 1000), fission: num('f', 0.5), burst: (p.get('b') as any) || 'optimal', heightM: num('hb', 0), name: p.get('nm') || 'Arma', chemical: p.get('ch') === '1' });
  }
  if (p.get('g') === '1') s.view.globe = true;
  Object.assign(s.env, { windFromDeg: num('wf', 270), windKmh: num('ws', 24), humidity: num('hu', 60), visibilityKm: num('vi', 25), hour: num('hr', 12), outdoorPct: p.has('op') ? num('op', 25) : null });
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
(window as any).__an = { map, state, detonate, enc, cloudShot, fxLayer, get run() { return run; }, seek: (t: number) => { if (run) { run.t = t; run.lastOverlay = 0; run.playing = false; map.triggerRepaint(); } }, fmtTime };
