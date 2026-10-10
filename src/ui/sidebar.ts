import { h, setRangeFill, ICONS, toast } from './dom';
import { NUKE_PRESETS, ASTEROID_PRESETS, COMPOSITIONS } from '../data/presets';
import { parseCoords, fetchWeather, type Weather } from './geo';
import { fmtEnergy } from '../physics/effects';
import type { NuclearInput, AsteroidInput, Environment, BurstMode, TargetType, Scenario, ReleaseInput, VolcanoInput, Isotope } from '../physics/types';
import { ISOTOPES } from '../physics/other';
import type { ThemeChoice } from './theme';

export interface ViewOptions {
  domes: boolean; rings: boolean; fallout: boolean; damage: boolean; fires: boolean; sound: boolean; cinematic: boolean; labels: boolean;
  globe: boolean;
  marks: boolean;
  basemap: string;
  fxOpacity: number;
  forceDay: boolean;
  terrain3d: boolean;
  buildings: boolean;
  mapLabels: boolean;
  quality: number;
  /** calidad automática según los fotogramas por segundo */
  autoQ: boolean;
  /** post-procesado: resplandor, destello de lente y distorsión por calor */
  post: boolean;
  /** población real (WorldPop) en lugar del modelo urbano */
  realPop: boolean;
  /** capa de pruebas nucleares en el mapa */
  tests: boolean;
  /** tema de la interfaz y de la luz del mapa */
  theme: ThemeChoice;
}

export interface AppState {
  mode: 'nuclear' | 'asteroid' | 'other';
  other: { type: 'reactor' | 'dirtybomb' | 'volcano'; release: ReleaseInput; volcano: VolcanoInput };
  nuke: NuclearInput;
  ast: AsteroidInput & { azimuth: number; surface: 'auto' | TargetType };
  env: Environment;
  target: { lat: number; lon: number; label: string };
  view: ViewOptions;
  /** tiempo real (Open-Meteo) al cambiar de objetivo */
  live: boolean;
  /** ataque con varias detonaciones */
  multi: { on: boolean; strikes: Strike[] };
}

export interface Strike { lat: number; lon: number; label: string; sc: Scenario; azimuth?: number }

export function defaultState(): AppState {
  return {
    mode: 'nuclear',
    nuke: { kind: 'nuclear', name: 'B83-1 (EE. UU.)', yieldKt: 1200, fission: 0.5, burst: 'optimal', heightM: 0 },
    ast: { kind: 'asteroid', name: 'Tunguska (Siberia, 1908)', diameterM: 60, densityKgM3: 3000, velocityKms: 15, angleDeg: 35, target: 'sediment', waterDepthM: 0, azimuth: 250, surface: 'auto' },
    env: { windFromDeg: 270, windKmh: 24, visibilityKm: 25, humidity: 65, hour: 12, outdoorPct: null },
    target: { lat: 40.4168, lon: -3.7038, label: 'Madrid' },
    view: { domes: true, rings: true, fallout: true, damage: true, fires: true, sound: true, cinematic: true, labels: true, globe: false, marks: true, quality: 1, basemap: 'relieve', fxOpacity: 1, forceDay: false, terrain3d: true, buildings: true, mapLabels: true, autoQ: true, post: true, realPop: true, tests: false, theme: 'auto' },
    live: true,
    other: { type: 'reactor', release: { kind: 'release', name: 'Chernóbil (1986)', source: 'reactor', isotope: 'Cs-137', activityTBq: 85000, heightM: 1000, durationH: 240 }, volcano: { kind: 'volcano', name: 'Yellowstone (supererupción)', vei: 8, volumeMul: 2.5 } },
    multi: { on: false, strikes: [] },
  };
}

export interface SidebarEvents {
  onDetonate(): void;
  onClear(): void;
  onTarget(lat: number, lon: number, label: string, fly: boolean): void;
  onEnv(): void;
  onView(): void;
  onCollapse(): void;
  onProjection(globe: boolean): void;
  onMulti(): void;
}

const logSlider = (min: number, max: number, val: number, step = 0.01) => {
  const r = h('input', { type: 'range', min, max, step, value: Math.log10(val) }) as HTMLInputElement;
  setRangeFill(r);
  return r;
};
const linSlider = (min: number, max: number, val: number, step = 1) => {
  const r = h('input', { type: 'range', min, max, step, value: val }) as HTMLInputElement;
  setRangeFill(r);
  return r;
};

function section(title: string, body: HTMLElement, closed = false) {
  const s = h('div', { class: 'section' + (closed ? ' closed' : '') }, h('div', { class: 'sec-title' }, title), h('div', { class: 'sec-body' }, body));
  s.querySelector('.sec-title')!.addEventListener('click', () => s.classList.toggle('closed'));
  return s;
}

function field(label: string, valueEl: HTMLElement | null, input: HTMLElement) {
  return h('label', { class: 'field' }, h('div', { class: 'field-head' }, h('span', {}, label), valueEl), input);
}

function seg<T extends string>(opts: [T, string][], value: T, onChange: (v: T) => void) {
  const el = h('div', { class: 'seg' });
  const set = (v: T) => { el.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); };
  for (const [v, l] of opts) el.append(h('button', { 'data-v': v, type: 'button', onclick: () => { set(v); onChange(v); } }, l));
  set(value);
  return { el, set };
}

function toggle(label: string, checked: boolean, onChange: (v: boolean) => void) {
  const inp = h('input', { type: 'checkbox' }) as HTMLInputElement;
  inp.checked = checked;
  inp.addEventListener('change', () => onChange(inp.checked));
  return h('label', { class: 'toggle' }, inp, h('span', { class: 'sw' }), label);
}

/** brújula SVG arrastrable; devuelve el ángulo (grados, 0 = N) */
function compassInput(value: number, onChange: (deg: number) => void, label = 'viento') {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '-50 -50 100 100');
  svg.classList.add('compass');
  svg.innerHTML = `
    <circle r="46" style="fill: rgba(var(--ink), 0.03); stroke: rgba(var(--ink), 0.14)"/>
    <circle r="34" fill="none" style="stroke: rgba(var(--ink), 0.07)"/>
    ${[0, 90, 180, 270].map((a) => `<text x="${Math.sin((a * Math.PI) / 180) * 40}" y="${-Math.cos((a * Math.PI) / 180) * 40 + 3.5}" font-size="9" style="fill: var(--muted)" text-anchor="middle" font-family="Inter" font-weight="700">${'NESO'[a / 90]}</text>`).join('')}
    <g class="arrow"><path d="M0 -30 L7 -14 L2 -16 L2 28 L-2 28 L-2 -16 L-7 -14 Z" fill="#ff8a3d"/></g>
    <circle r="3" style="fill: var(--hi)"/>`;
  const arrow = svg.querySelector('.arrow') as SVGGElement;
  // la flecha apunta hacia donde va el viento/objeto (desde + 180)
  const set = (deg: number) => arrow.setAttribute('transform', `rotate(${deg + 180})`);
  set(value);
  let drag = false;
  const handle = (ev: PointerEvent) => {
    const r = svg.getBoundingClientRect();
    const x = ev.clientX - (r.left + r.width / 2), y = ev.clientY - (r.top + r.height / 2);
    let toDeg = (Math.atan2(x, -y) * 180) / Math.PI;
    let from = Math.round((toDeg + 180 + 360) % 360);
    set(from);
    onChange(from);
  };
  svg.addEventListener('pointerdown', (e) => { drag = true; svg.setPointerCapture(e.pointerId); handle(e); });
  svg.addEventListener('pointermove', (e) => drag && handle(e));
  svg.addEventListener('pointerup', () => (drag = false));
  svg.setAttribute('aria-label', label);
  return { el: svg as unknown as HTMLElement, set };
}

const dirName = (deg: number) => ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round((((deg % 360) + 360) % 360) / 45) % 8];

export class Sidebar {
  el: HTMLElement;
  state: AppState;
  private ev: SidebarEvents;
  private coordsEl!: HTMLElement;
  private fireBtn!: HTMLButtonElement;
  private nukePanel!: HTMLElement;
  private astPanel!: HTMLElement;
  private otherPanel!: HTMLElement;
  private tabs!: HTMLElement;
  refresh: () => void = () => {};
  /** carga un arma con parámetros sueltos (pruebas del mapa) y actualiza el panel */
  setNuke: (v: Partial<NuclearInput> & { note?: string }) => void = () => {};
  projSeg!: { el: HTMLElement; set: (v: string) => void };
  detectNote!: HTMLElement;
  /** redibuja la lista del ataque múltiple */
  renderMulti: () => void = () => {};
  /** escenario actual (copia) */
  currentScenario(): Scenario {
    const S = this.state;
    if (S.mode === 'other') return S.other.type === 'volcano' ? { ...S.other.volcano } : { ...S.other.release, source: S.other.type === 'dirtybomb' ? 'dirtybomb' : 'reactor' };
    return S.mode === 'nuclear' ? { ...S.nuke } : { ...S.ast };
  }
  /** consulta el tiempo real en el objetivo y lo aplica al entorno */
  loadWeather: (quiet?: boolean) => Promise<void> = async () => {};

  private presetSelEl!: HTMLSelectElement;
  private aPresetEl!: HTMLSelectElement;

  /** selecciona un preset por su nombre exacto (arma o asteroide); devuelve false si no existe */
  selectPreset(name: string): boolean {
    let found = false;
    NUKE_PRESETS.forEach((g, gi) => g.items.forEach((it, ii) => {
      if (found || it.name !== name) return;
      found = true;
      this.setMode('nuclear');
      this.presetSelEl.value = `${gi}:${ii}`;
      this.presetSelEl.dispatchEvent(new Event('change'));
    }));
    if (found) return true;
    const ai = ASTEROID_PRESETS.findIndex((a) => a.name === name);
    if (ai < 0) return false;
    this.setMode('asteroid');
    this.aPresetEl.value = String(ai);
    this.aPresetEl.dispatchEvent(new Event('change'));
    return true;
  }

  /** muestra lo detectado en el punto objetivo */
  setDetected(text: string) { if (this.detectNote) this.detectNote.textContent = text; }

  constructor(el: HTMLElement, state: AppState, ev: SidebarEvents) {
    this.el = el;
    this.state = state;
    this.ev = ev;
    el.classList.add('glass');
    this.build();
  }

  setTarget(lat: number, lon: number, label: string) {
    this.state.target = { lat, lon, label };
    this.coordsEl.textContent = `${label ? label + ' · ' : ''}${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }

  private build() {
    const S = this.state;
    // pestañas (la marca, la versión y la instalación están en «Acerca de»)
    this.tabs = h('div', { class: 'tabs' },
      h('button', { class: 'tab', 'data-m': 'nuclear', title: 'Arma nuclear o explosivo', html: `${ICONS.atom}<span>Nuclear</span>`, onclick: () => this.setMode('nuclear') }),
      h('button', { class: 'tab', 'data-m': 'asteroid', title: 'Impacto de asteroide o cometa', html: `${ICONS.rock}<span>Asteroide</span>`, onclick: () => this.setMode('asteroid') }),
      h('button', { class: 'tab', 'data-m': 'other', title: 'Accidentes, bombas sucias y volcanes', html: `${ICONS.weather}<span>Otros</span>`, onclick: () => this.setMode('other') }),
    );
    const head = h('div', { class: 'sb-head' }, this.tabs,
      h('button', { class: 'icon-btn', title: 'Ocultar panel (H)', html: ICONS.hide, onclick: () => this.ev.onCollapse() }),
    );

    // ---------- objetivo ----------
    const searchIn = h('input', { type: 'text', placeholder: 'Lugar o coordenadas (40.42, -3.70)', spellcheck: 'false' }) as HTMLInputElement;
    const results = h('div', { class: 'search-results' });
    let timer = 0;
    const go = (lat: number, lon: number, label: string) => {
      results.classList.remove('open');
      this.setTarget(lat, lon, label);
      this.ev.onTarget(lat, lon, label, true);
    };
    const doSearch = async (enter = false) => {
      const q = searchIn.value.trim();
      if (q.length < 2) { results.classList.remove('open'); return; }
      const co = parseCoords(q);
      if (co) {
        const label = `${co.lat.toFixed(4)}, ${co.lon.toFixed(4)}`;
        if (enter) { go(co.lat, co.lon, ''); return; }
        results.innerHTML = '';
        results.append(h('div', { class: 'coord-hit', onclick: () => go(co.lat, co.lon, '') }, `Ir a las coordenadas ${label}`));
        results.classList.add('open');
        return;
      }
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=es&q=${encodeURIComponent(q)}`);
        const js = await r.json();
        results.innerHTML = '';
        for (const it of js) {
          const name = it.display_name as string;
          results.append(h('div', { onclick: () => { searchIn.value = name.split(',')[0]; go(+it.lat, +it.lon, name.split(',')[0]); } }, name));
        }
        if (!js.length) results.append(h('div', { class: 'empty' }, 'Sin resultados'));
        results.classList.add('open');
        if (enter && js.length === 1) { searchIn.value = js[0].display_name.split(',')[0]; go(+js[0].lat, +js[0].lon, searchIn.value); }
      } catch { toast('No se pudo buscar el lugar (sin conexión)'); }
    };
    searchIn.addEventListener('input', () => { clearTimeout(timer); timer = window.setTimeout(() => doSearch(), 450); });
    searchIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { clearTimeout(timer); doSearch(true); } if (e.key === 'Escape') results.classList.remove('open'); });
    document.addEventListener('click', (e) => { if (!results.contains(e.target as Node) && e.target !== searchIn) results.classList.remove('open'); });
    const locBtn = h('button', { class: 'in-btn', type: 'button', title: 'Mi ubicación', html: ICONS.locate, onclick: () => {
      if (!navigator.geolocation) { toast('Geolocalización no disponible'); return; }
      navigator.geolocation.getCurrentPosition((p) => go(p.coords.latitude, p.coords.longitude, 'Mi ubicación'), () => toast('No se pudo obtener tu ubicación'), { timeout: 10000 });
    } });
    this.coordsEl = h('div', { class: 'coords' });
    const targetSec = section('Objetivo', h('div', {}, h('div', { class: 'search', html: ICONS.search }, searchIn, locBtn, results), this.coordsEl, h('div', { class: 'hint' }, 'También puedes hacer clic en el mapa.')));
    this.setTarget(S.target.lat, S.target.lon, S.target.label);

    // ---------- arma nuclear ----------
    const nk = S.nuke;
    const presetSel = h('select') as HTMLSelectElement;
    presetSel.append(h('option', { value: '' }, '— Personalizada —'));
    NUKE_PRESETS.forEach((g, gi) => {
      const og = h('optgroup', { label: g.group });
      g.items.forEach((it, ii) => og.append(h('option', { value: `${gi}:${ii}` }, it.name)));
      presetSel.append(og);
    });
    this.presetSelEl = presetSel;
    const presetNote = h('div', { class: 'note' });
    const yieldVal = h('b');
    const yieldR = logSlider(-3, 5, nk.yieldKt);
    const yieldNum = h('input', { type: 'number', min: 0, step: 'any' }) as HTMLInputElement;
    const yieldUnit = h('select', {}, h('option', { value: '0.001' }, 'toneladas'), h('option', { value: '1' }, 'kilotones'), h('option', { value: '1000' }, 'megatones')) as HTMLSelectElement;
    const fisVal = h('b');
    const fisR = linSlider(0, 100, nk.fission * 100);
    const hVal = h('b');
    const hIn = h('input', { type: 'number', min: 0, step: 10, value: nk.heightM }) as HTMLInputElement;
    const hField = field('Altura de detonación (m)', hVal, hIn);
    const chemTg = toggle('Explosivo químico (sin radiación ni lluvia)', !!nk.chemical, (v) => { nk.chemical = v; });
    const burst = seg<BurstMode>([['surface', 'Superficie'], ['optimal', 'Aérea óptima'], ['custom', 'Altura fija'], ['underground', 'Bajo tierra'], ['underwater', 'Bajo el agua']], nk.burst, (v) => { nk.burst = v; updNuke(); });
    const depVal = h('b');
    const dIn = h('input', { type: 'number', min: 0, max: 5000, step: 10, value: nk.depthM ?? 50 }) as HTMLInputElement;
    const sIn = h('input', { type: 'number', min: 1, max: 11000, step: 10, value: nk.seaDepthM ?? 100 }) as HTMLInputElement;
    const dField = field('Profundidad de la explosión (m)', depVal, dIn);
    const sField = field('Profundidad del agua (m)', null, sIn);
    const dNote = h('div', { class: 'note' });

    const updNuke = (from?: 'slider' | 'num') => {
      if (from === 'slider') nk.yieldKt = Math.pow(10, +yieldR.value);
      if (from === 'num') {
        const v = (+yieldNum.value || 0) * +yieldUnit.value;
        if (v > 1e6) toast('Potencia máxima: 1 Gt (1000 Mt)');
        nk.yieldKt = Math.min(1e6, Math.max(1e-6, v));
      }
      if (from !== 'slider') yieldR.value = String(Math.log10(Math.max(1e-3, nk.yieldKt)));
      setRangeFill(yieldR);
      yieldVal.textContent = fmtEnergy(nk.yieldKt);
      if (from !== 'num') {
        const u = nk.yieldKt >= 1000 ? 1000 : nk.yieldKt >= 1 ? 1 : 0.001;
        yieldUnit.value = String(u);
        yieldNum.value = String(+(nk.yieldKt / u).toPrecision(4));
      }
      nk.fission = +fisR.value / 100;
      setRangeFill(fisR);
      fisVal.textContent = `${Math.round(nk.fission * 100)} %`;
      hField.style.display = nk.burst === 'custom' ? '' : 'none';
      const buried = nk.burst === 'underground' || nk.burst === 'underwater';
      dField.style.display = buried ? '' : 'none';
      sField.style.display = nk.burst === 'underwater' ? '' : 'none';
      nk.depthM = Math.min(5000, Math.max(0, +dIn.value || 0));
      nk.seaDepthM = Math.max(nk.depthM + 1, Math.min(11000, +sIn.value || 100));
      const sd = nk.depthM / Math.cbrt(Math.max(1e-6, nk.yieldKt));
      depVal.textContent = '';
      dNote.style.display = buried ? '' : 'none';
      dNote.textContent = `Profundidad escalada: ${Math.round(sd)} m/kt^⅓. ` + (nk.burst === 'underground'
        ? (sd >= 120 ? 'Contenida: sin bola de fuego ni lluvia radiactiva apreciable; terremoto y cráter de subsidencia.' : sd > 25 ? 'Poco profunda: gran cráter de excavación y lluvia radiactiva muy intensa (como Sedan, 1962).' : 'Casi en superficie: cráter y lluvia radiactiva intensa.')
        : (sd > 400 ? 'Profunda: sin columna; onda de choque en el agua y olas.' : 'Columna de agua, oleada de base radiactiva y olas (como Baker, 1946).'));
      nk.heightM = Math.min(2e6, Math.max(0, +hIn.value || 0));
      hVal.textContent = nk.heightM >= 1000 ? `${(nk.heightM / 1000).toLocaleString('es-ES')} km` : `${nk.heightM} m`;
    };
    presetSel.addEventListener('change', () => {
      if (!presetSel.value) { presetNote.style.display = 'none'; nk.name = 'Arma personalizada'; return; }
      const [gi, ii] = presetSel.value.split(':').map(Number);
      const p = NUKE_PRESETS[gi].items[ii];
      Object.assign(nk, { name: p.name, yieldKt: p.yieldKt, fission: p.fission, burst: p.burst, heightM: p.heightM, chemical: !!p.chemical });
      (chemTg.querySelector('input') as HTMLInputElement).checked = !!p.chemical;
      fisR.value = String(p.fission * 100);
      hIn.value = String(p.heightM);
      burst.set(p.burst);
      presetNote.textContent = p.note;
      presetNote.style.display = '';
      updNuke();
    });
    const markCustom = () => { presetSel.value = ''; presetNote.style.display = 'none'; nk.name = `Arma de ${fmtEnergy(nk.yieldKt)}`; };
    yieldR.addEventListener('input', () => { updNuke('slider'); markCustom(); });
    yieldNum.addEventListener('input', () => { updNuke('num'); markCustom(); });
    yieldUnit.addEventListener('change', () => { updNuke('num'); markCustom(); });
    fisR.addEventListener('input', () => updNuke());
    hIn.addEventListener('input', () => updNuke());
    dIn.addEventListener('input', () => updNuke());
    sIn.addEventListener('input', () => updNuke());
    // valor inicial del preset
    NUKE_PRESETS.forEach((g, gi) => g.items.forEach((it, ii) => { if (it.name === nk.name) { presetSel.value = `${gi}:${ii}`; presetNote.textContent = it.note; } }));

    this.nukePanel = h('div', {},
      section('Arma', h('div', {},
        field('Modelo', null, presetSel),
        presetNote,
        field('Potencia', yieldVal, yieldR),
        h('div', { class: 'row', style: { marginTop: '-4px', marginBottom: '12px' } }, yieldNum, yieldUnit),
        field('Fracción de fisión (lluvia radiactiva)', fisVal, fisR),
        field('Tipo de detonación', null, burst.el),
        hField,
        dField,
        sField,
        dNote,
        h('div', { class: 'toggles one' }, chemTg),
      )),
    );
    updNuke();
    this.setNuke = (v) => {
      this.setMode('nuclear');
      const { note, ...rest } = v;
      Object.assign(nk, rest);
      presetSel.value = '';
      NUKE_PRESETS.forEach((g, gi) => g.items.forEach((it, ii) => { if (it.name === nk.name) presetSel.value = `${gi}:${ii}`; }));
      presetNote.textContent = note ?? ''; presetNote.style.display = note ? '' : 'none';
      (chemTg.querySelector('input') as HTMLInputElement).checked = !!nk.chemical;
      fisR.value = String(nk.fission * 100); hIn.value = String(nk.heightM); dIn.value = String(nk.depthM ?? 50); sIn.value = String(nk.seaDepthM ?? 100);
      burst.set(nk.burst);
      updNuke();
    };

    // ---------- asteroide ----------
    const as = S.ast;
    const aPreset = h('select') as HTMLSelectElement;
    aPreset.append(h('option', { value: '' }, '— Personalizado —'));
    {
      const g1 = h('optgroup', { label: 'Impactos históricos e hipotéticos' }), g2 = h('optgroup', { label: 'Riesgos reales · lista Sentry (NASA/JPL)' });
      ASTEROID_PRESETS.forEach((p, i) => (p.group === 'sentry' ? g2 : g1).append(h('option', { value: String(i) }, p.name)));
      aPreset.append(g1, g2);
    }
    this.aPresetEl = aPreset;
    const aNote = h('div', { class: 'note' });
    const dVal = h('b'), dR = logSlider(0, 6, as.diameterM);
    const comp = h('select') as HTMLSelectElement;
    COMPOSITIONS.forEach((c) => comp.append(h('option', { value: String(c.density) }, `${c.name} · ${c.density} kg/m³`)));
    const densIn = h('input', { type: 'number', min: 300, max: 23000, step: 50, value: as.densityKgM3 }) as HTMLInputElement;
    const vVal = h('b'), vR = linSlider(11, 72, as.velocityKms, 0.1);
    const angVal = h('b'), angR = linSlider(5, 90, as.angleDeg, 1);
    const tgt = seg<'auto' | TargetType>([['auto', 'Auto'], ['sediment', 'Sedim.'], ['rock', 'Roca'], ['water', 'Agua'], ['ice', 'Hielo']], as.surface, (v) => { as.surface = v; if (v !== 'auto') as.target = v; updAst(); markA(); });
    this.detectNote = h('div', { class: 'note', style: { marginTop: '6px' } }, 'Se detectará automáticamente si el punto es tierra u océano (y su profundidad).');
    const depthIn = h('input', { type: 'number', min: 1, max: 11000, step: 10, value: as.waterDepthM || 3000 }) as HTMLInputElement;
    const depthField = field('Profundidad del agua (m)', null, depthIn);
    const azComp = compassInput(as.azimuth, (deg) => { as.azimuth = deg; azVal.textContent = `${deg}° (${dirName(deg)})`; });
    const azVal = h('b', {}, `${as.azimuth}° (${dirName(as.azimuth)})`);
    const updAst = () => {
      as.diameterM = Math.pow(10, +dR.value); setRangeFill(dR);
      dVal.textContent = as.diameterM >= 1000 ? `${(as.diameterM / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} km` : `${Math.round(as.diameterM)} m`;
      as.densityKgM3 = Math.min(23000, Math.max(300, +densIn.value || 3000));
      as.velocityKms = +vR.value; setRangeFill(vR); vVal.textContent = `${as.velocityKms.toFixed(1).replace('.', ',')} km/s`;
      as.angleDeg = +angR.value; setRangeFill(angR); angVal.textContent = `${as.angleDeg}°`;
      if (as.surface !== 'auto') as.waterDepthM = as.target === 'water' ? Math.min(11000, Math.max(1, +depthIn.value || 1000)) : 0;
      depthField.style.display = as.surface === 'water' ? '' : 'none';
      this.detectNote.style.display = as.surface === 'auto' ? '' : 'none';
    };
    const markA = () => { aPreset.value = ''; aNote.style.display = 'none'; as.name = 'Objeto personalizado'; };
    aPreset.addEventListener('change', () => {
      if (!aPreset.value) { markA(); return; }
      const p = ASTEROID_PRESETS[+aPreset.value];
      Object.assign(as, { name: p.name, diameterM: p.diameterM, densityKgM3: p.densityKgM3, velocityKms: p.velocityKms, angleDeg: p.angleDeg, target: p.target, waterDepthM: p.waterDepthM, surface: 'auto' });
      dR.value = String(Math.log10(p.diameterM)); densIn.value = String(p.densityKgM3); vR.value = String(p.velocityKms); angR.value = String(p.angleDeg); tgt.set('auto');
      if (p.target === 'water') depthIn.value = String(p.waterDepthM);
      comp.value = String(COMPOSITIONS.reduce((b, c) => (Math.abs(c.density - p.densityKgM3) < Math.abs(b.density - p.densityKgM3) ? c : b)).density);
      aNote.textContent = p.note; aNote.style.display = '';
      updAst();
    });
    comp.addEventListener('change', () => { densIn.value = comp.value; updAst(); markA(); });
    for (const el of [dR, vR, angR]) el.addEventListener('input', () => { updAst(); markA(); });
    for (const el of [densIn, depthIn]) el.addEventListener('input', () => { updAst(); markA(); });
    // fuera de rango: se corrige al salir del campo
    const clampField = (el: HTMLInputElement, a: number, b: number, what: string) => el.addEventListener('change', () => {
      const v = +el.value;
      if (!Number.isFinite(v) || v < a || v > b) { el.value = String(Math.min(b, Math.max(a, Number.isFinite(v) ? v : a))); toast(`${what}: valor ajustado al rango ${a.toLocaleString('es-ES')}–${b.toLocaleString('es-ES')}`); updAst(); }
    });
    clampField(densIn, 300, 23000, 'Densidad (kg/m³)');
    clampField(depthIn, 1, 11000, 'Profundidad (m)');
    ASTEROID_PRESETS.forEach((p, i) => { if (p.name === as.name) { aPreset.value = String(i); aNote.textContent = p.note; } });
    comp.value = '3000';

    this.astPanel = h('div', {},
      section('Objeto', h('div', {},
        field('Escenario', null, aPreset),
        aNote,
        field('Diámetro', dVal, dR),
        field('Composición', null, comp),
        field('Densidad (kg/m³)', null, densIn),
        field('Velocidad de entrada', vVal, vR),
        field('Ángulo de entrada (sobre el horizonte)', angVal, angR),
        field('Terreno del impacto', null, tgt.el),
        this.detectNote,
        depthField,
        h('div', { class: 'field' }, h('div', { class: 'field-head' }, h('span', {}, 'Dirección de llegada'), azVal), h('div', { class: 'compass-wrap' }, azComp.el, h('div', { class: 'grow note', style: { margin: 0 } }, 'Arrastra la flecha: indica hacia dónde viaja el objeto.'))),
      )),
    );
    updAst();

    // ---------- otros escenarios ----------
    const O = S.other;
    const REL_PRESETS: { type: 'reactor' | 'dirtybomb'; r: Omit<ReleaseInput, 'kind' | 'source'>; note: string; at?: [number, number, string] }[] = [
      { type: 'reactor', r: { name: 'Chernóbil (1986)', isotope: 'Cs-137', activityTBq: 85000, heightM: 1000, durationH: 240 }, at: [51.389, 30.099, 'Chernóbil'], note: 'Explosión e incendio del reactor 4: unos 85 PBq de cesio-137 durante 10 días.' },
      { type: 'reactor', r: { name: 'Chernóbil · yodo-131', isotope: 'I-131', activityTBq: 1760000, heightM: 1000, durationH: 240 }, at: [51.389, 30.099, 'Chernóbil'], note: 'El yodo-131 liberado (≈ 1760 PBq) causó miles de cánceres de tiroides infantiles.' },
      { type: 'reactor', r: { name: 'Fukushima Daiichi (2011)', isotope: 'Cs-137', activityTBq: 15000, heightM: 100, durationH: 400 }, at: [37.421, 141.033, 'Fukushima'], note: 'Unos 10–20 PBq de cesio-137 a la atmósfera; gran parte cayó sobre el océano.' },
      { type: 'reactor', r: { name: 'Kyshtym (1957)', isotope: 'Sr-90', activityTBq: 2000, heightM: 1000, durationH: 1 }, at: [55.713, 60.848, 'Mayak'], note: 'Explosión de un tanque de residuos en Mayak: sobre todo estroncio-90.' },
      { type: 'reactor', r: { name: 'Windscale (1957)', isotope: 'I-131', activityTBq: 740, heightM: 120, durationH: 24 }, at: [54.424, -3.497, 'Sellafield'], note: 'Incendio del reactor de plutonio británico.' },
      { type: 'dirtybomb', r: { name: 'Bomba sucia · fuente de cesio', isotope: 'Cs-137', activityTBq: 50, heightM: 20, explosiveKg: 10 }, note: 'Fuente médica o industrial de cesio (≈ 1350 Ci) con 10 kg de explosivo.' },
      { type: 'dirtybomb', r: { name: 'Bomba sucia · cobalto de radioterapia', isotope: 'Co-60', activityTBq: 400, heightM: 20, explosiveKg: 25 }, note: 'Cabezal de teleterapia de cobalto-60 (≈ 10 000 Ci) con 25 kg de explosivo.' },
      { type: 'dirtybomb', r: { name: 'Bomba sucia · americio', isotope: 'Am-241', activityTBq: 1, heightM: 20, explosiveKg: 5 }, note: 'Fuentes de americio de sondas de pozos petrolíferos.' },
    ];
    const VOL_PRESETS: { v: Omit<VolcanoInput, 'kind'>; note: string; at?: [number, number, string] }[] = [
      { v: { name: 'Yellowstone (supererupción)', vei: 8, volumeMul: 2.5 }, at: [44.43, -110.67, 'Yellowstone'], note: 'Erupción de la Huckleberry Ridge (2,1 Ma): unos 2500 km³.' },
      { v: { name: 'Toba (hace 74 000 años)', vei: 8, volumeMul: 2.8 }, at: [2.68, 98.88, 'Lago Toba'], note: 'La mayor erupción de los últimos dos millones de años (≈ 2800 km³).' },
      { v: { name: 'Campos Flégreos (hace 39 000 años)', vei: 7, volumeMul: 3 }, at: [40.827, 14.139, 'Pozzuoli'], note: 'Ignimbrita campaniense, junto a Nápoles.' },
      { v: { name: 'Tambora (1815)', vei: 7, volumeMul: 1.5 }, at: [-8.25, 118.0, 'Tambora'], note: 'Provocó el «año sin verano» de 1816.' },
      { v: { name: 'Krakatoa (1883)', vei: 6, volumeMul: 2 }, at: [-6.102, 105.423, 'Krakatoa'], note: 'Su explosión se oyó a 4800 km.' },
      { v: { name: 'Pinatubo (1991)', vei: 6, volumeMul: 1 }, at: [15.13, 120.35, 'Pinatubo'], note: 'Enfrió la Tierra ≈ 0,5 °C durante un año.' },
      { v: { name: 'Mount St. Helens (1980)', vei: 5, volumeMul: 1 }, at: [46.191, -122.194, 'Mount St. Helens'], note: 'Erupción lateral que arrasó 600 km² de bosque.' },
    ];
    const oType = seg<'reactor' | 'dirtybomb' | 'volcano'>([['reactor', 'Accidente nuclear'], ['dirtybomb', 'Bomba sucia'], ['volcano', 'Supervolcán']], O.type, (v) => { O.type = v; updOther(); });
    const oPreset = h('select') as HTMLSelectElement;
    const oNote = h('div', { class: 'note' });
    const isoSel = h('select') as HTMLSelectElement;
    (Object.keys(ISOTOPES) as Isotope[]).forEach((k) => isoSel.append(h('option', { value: k }, ISOTOPES[k].name)));
    const actVal = h('b'), actR = logSlider(-3, 7, O.release.activityTBq);
    const hgtIn = h('input', { type: 'number', min: 0, max: 3000, step: 10, value: O.release.heightM }) as HTMLInputElement;
    const durIn = h('input', { type: 'number', min: 0.1, max: 2000, step: 1, value: O.release.durationH ?? 240 }) as HTMLInputElement;
    const kgIn = h('input', { type: 'number', min: 0, max: 5000, step: 1, value: O.release.explosiveKg ?? 10 }) as HTMLInputElement;
    const veiVal = h('b'), veiR = linSlider(4, 8, O.volcano.vei, 1);
    const relBox = h('div', {}, field('Isótopo', null, isoSel), field('Actividad liberada', actVal, actR), field('Altura de la emisión (m)', null, hgtIn));
    const durF = field('Duración de la emisión (h)', null, durIn), kgF = field('Explosivo (kg de TNT)', null, kgIn);
    relBox.append(durF, kgF);
    const volBox = h('div', {}, field('Índice de explosividad (VEI)', veiVal, veiR));
    const fillPresets = () => {
      oPreset.innerHTML = '';
      oPreset.append(h('option', { value: '' }, '— Personalizado —'));
      if (O.type === 'volcano') VOL_PRESETS.forEach((p, i) => oPreset.append(h('option', { value: String(i) }, p.v.name)));
      else REL_PRESETS.forEach((p, i) => { if (p.type === O.type) oPreset.append(h('option', { value: String(i) }, p.r.name)); });
    };
    const updOther = (fromInputs = false) => {
      relBox.style.display = O.type === 'volcano' ? 'none' : '';
      volBox.style.display = O.type === 'volcano' ? '' : 'none';
      durF.style.display = O.type === 'reactor' ? '' : 'none';
      kgF.style.display = O.type === 'dirtybomb' ? '' : 'none';
      if (!fromInputs) fillPresets();
      const R = O.release;
      if (fromInputs) {
        R.isotope = isoSel.value as Isotope; R.activityTBq = Math.pow(10, +actR.value); R.heightM = +hgtIn.value || 0; R.durationH = +durIn.value || 1; R.explosiveKg = +kgIn.value || 0;
        O.volcano.vei = +veiR.value;
      } else { isoSel.value = R.isotope; actR.value = String(Math.log10(R.activityTBq)); hgtIn.value = String(R.heightM); durIn.value = String(R.durationH ?? 240); kgIn.value = String(R.explosiveKg ?? 10); veiR.value = String(O.volcano.vei); }
      setRangeFill(actR); setRangeFill(veiR);
      actVal.textContent = R.activityTBq >= 1000 ? `${(R.activityTBq / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} PBq` : `${R.activityTBq.toLocaleString('es-ES', { maximumFractionDigits: 3 })} TBq`;
      veiVal.textContent = `VEI ${O.volcano.vei}`;
    };
    oPreset.addEventListener('change', () => {
      if (!oPreset.value) { oNote.style.display = 'none'; return; }
      const p = O.type === 'volcano' ? VOL_PRESETS[+oPreset.value] : REL_PRESETS[+oPreset.value];
      if (O.type === 'volcano') { const v = p as typeof VOL_PRESETS[number]; O.volcano = { kind: 'volcano', ...v.v }; }
      else { const r = p as typeof REL_PRESETS[number]; O.release = { kind: 'release', source: r.type, ...r.r }; }
      oNote.textContent = p.note + (p.at ? ' Objetivo movido al lugar real.' : '');
      if (p.at) this.ev.onTarget(p.at[0], p.at[1], p.at[2], true);
      oNote.style.display = '';
      const keep = oPreset.value; updOther(); oPreset.value = keep;
    });
    const markO = () => { oPreset.value = ''; oNote.style.display = 'none'; if (O.type === 'volcano') O.volcano.name = 'Erupción personalizada'; else O.release.name = O.type === 'dirtybomb' ? 'Bomba sucia' : 'Liberación radiactiva'; };
    for (const el of [isoSel, actR, hgtIn, durIn, kgIn, veiR]) el.addEventListener('input', () => { updOther(true); markO(); });
    isoSel.addEventListener('change', () => { updOther(true); markO(); });
    this.otherPanel = h('div', {}, section('Escenario', h('div', {}, oType.el, field('Caso', null, oPreset), oNote, relBox, volBox)));
    updOther();
    oNote.style.display = 'none';

    // ---------- ataque múltiple ----------
    const MS = S.multi;
    const mList = h('div', { class: 'm-list' });
    const mTg = toggle('Varios objetivos (cada clic en el mapa añade uno)', MS.on, (v) => { MS.on = v; this.renderMulti(); this.ev.onMulti(); });
    const addBtn = h('button', { class: 'btn-line', type: 'button', onclick: () => { MS.strikes.push({ lat: S.target.lat, lon: S.target.lon, label: S.target.label, sc: this.currentScenario(), azimuth: S.ast.azimuth }); if (!MS.on) { MS.on = true; (mTg.querySelector('input') as HTMLInputElement).checked = true; } this.renderMulti(); this.ev.onMulti(); } }, '+ Añadir el objetivo actual con esta arma');
    const clearBtn = h('button', { class: 'btn-ghost', type: 'button', onclick: () => { MS.strikes.length = 0; this.renderMulti(); this.ev.onMulti(); } }, 'Vaciar');
    this.renderMulti = () => {
      mList.innerHTML = '';
      MS.strikes.forEach((st, i) => {
        const nm = st.sc.kind === 'nuclear' ? `${st.sc.name} · ${fmtEnergy(st.sc.yieldKt)}` : st.sc.name;
        mList.append(h('div', { class: 'm-item' }, h('b', {}, String(i + 1)), h('span', {}, h('i', {}, st.label || `${st.lat.toFixed(3)}, ${st.lon.toFixed(3)}`), nm),
          h('button', { class: 'icon-btn', type: 'button', title: 'Quitar', html: ICONS.close, onclick: () => { MS.strikes.splice(i, 1); this.renderMulti(); this.ev.onMulti(); } })));
      });
      if (!MS.strikes.length) mList.append(h('div', { class: 'hint' }, MS.on ? 'Haz clic en el mapa para añadir objetivos. Cada uno usa el arma configurada en ese momento.' : 'Activa la opción para preparar un ataque con varias detonaciones simultáneas.'));
      const verb = S.mode === 'nuclear' ? 'DETONAR' : S.mode === 'asteroid' ? 'IMPACTAR' : 'SIMULAR';
      this.fireBtn.textContent = MS.on && MS.strikes.length ? `${verb} · ${MS.strikes.length}` : verb;
    };
    const multiSec = section('Ataque múltiple', h('div', {}, h('div', { class: 'toggles one' }, mTg), mList, h('div', { class: 'row', style: { alignItems: 'center' } }, addBtn, clearBtn)), true);

    // ---------- entorno ----------
    const E = S.env;
    const wVal = h('b'), wR = linSlider(0, 150, E.windKmh, 1);
    const wdVal = h('b');
    const wComp = compassInput(E.windFromDeg, (deg) => { E.windFromDeg = deg; E.windProfile = null; updEnv(); if (wxNote) wxNote.textContent = 'Valores manuales (viento uniforme en altura).'; });
    const humVal = h('b'), humR = linSlider(0, 100, E.humidity, 1);
    const visVal = h('b'), visR = linSlider(2, 80, E.visibilityKm, 1);
    const hrVal = h('b'), hrR = linSlider(0, 24, E.hour, 0.25);
    const outVal = h('b'), outR = linSlider(0, 100, E.outdoorPct ?? 25, 1);
    const rainVal = h('b'), rainR = linSlider(0, 20, E.rainMmH ?? 0, 0.5);
    const updEnv = (silent = false) => {
      E.windKmh = +wR.value; setRangeFill(wR); wVal.textContent = `${E.windKmh} km/h`;
      wdVal.textContent = `desde ${dirName(E.windFromDeg)} (${E.windFromDeg}°)`;
      E.humidity = +humR.value; setRangeFill(humR); humVal.textContent = `${E.humidity} %`;
      E.visibilityKm = +visR.value; setRangeFill(visR); visVal.textContent = `${E.visibilityKm} km`;
      E.hour = +hrR.value; setRangeFill(hrR);
      const hh = Math.floor(E.hour) % 24, mm = Math.round((E.hour % 1) * 60);
      hrVal.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      setRangeFill(outR);
      E.rainMmH = +rainR.value; setRangeFill(rainR); rainVal.textContent = E.rainMmH > 0 ? `${String(E.rainMmH).replace('.', ',')} mm/h` : 'sin lluvia';
      const autoOut = E.hour >= 7 && E.hour <= 20 ? 25 : 8;
      if (E.outdoorPct == null) outR.value = String(autoOut), setRangeFill(outR);
      outVal.textContent = E.outdoorPct == null ? `auto · ${autoOut} %` : `${E.outdoorPct} %`;
      if (!silent) this.ev.onEnv();
    };
    rainR.addEventListener('input', () => updEnv());
    for (const r of [wR, humR, visR, hrR]) r.addEventListener('input', () => { if (r === wR) E.windProfile = null; updEnv(); wxNote.textContent = 'Valores manuales (viento uniforme en altura).'; });
    outR.addEventListener('input', () => { E.outdoorPct = +outR.value; updEnv(); });
    outVal.title = 'Doble clic: automático según la hora';
    outVal.addEventListener('dblclick', () => { E.outdoorPct = null; updEnv(); });

    // tiempo real (Open-Meteo, sin clave)
    const wxNote = h('div', { class: 'hint' }, 'Valores manuales.');
    const wxBtn = h('button', { class: 'btn-line', type: 'button', html: `${ICONS.weather}<span>Tiempo real en el objetivo</span>` }) as HTMLButtonElement;
    const applyWx = (w: Weather) => {
      wR.value = String(Math.min(150, Math.round(w.surfaceWindKmh)));
      E.windFromDeg = Math.round(w.surfaceWindFromDeg) % 360; wComp.set(E.windFromDeg);
      humR.value = String(Math.round(w.humidity));
      visR.value = String(Math.max(2, Math.min(80, Math.round(w.visibilityKm))));
      hrR.value = String(Math.round(w.hour * 4) / 4);
      rainR.value = String(Math.min(20, Math.round((w.rainMmH ?? 0) * 2) / 2));
      updEnv();
      E.windProfile = w.profile;
      const top = w.profile[w.profile.length - 1];
      wxNote.textContent = `Open-Meteo · ${w.localTime} · ${Math.round(w.tempC)} °C · nubes ${Math.round(w.cloudPct)} %${w.rainMmH > 0 ? ` · lluvia ${String(w.rainMmH).replace('.', ',')} mm/h` : ''} · viento a ${(top.zM / 1000).toFixed(0)} km: ${Math.round(top.kmh)} km/h desde ${dirName(top.fromDeg)}. La nube y la lluvia radiactiva usan el perfil de viento hasta la altura real de la nube.`;
    };
    this.loadWeather = async (quiet = false) => {
      wxBtn.disabled = true; wxBtn.classList.add('busy');
      try { applyWx(await fetchWeather(S.target.lat, S.target.lon)); }
      catch { if (!quiet) toast('No se pudo obtener el tiempo real (Open-Meteo)'); wxNote.textContent = 'Tiempo real no disponible: valores manuales.'; }
      finally { wxBtn.disabled = false; wxBtn.classList.remove('busy'); }
    };
    wxBtn.addEventListener('click', () => this.loadWeather());
    const liveTg = toggle('Actualizar al cambiar de objetivo', S.live, (v) => { S.live = v; if (v) this.loadWeather(); });

    const envSec = section('Entorno', h('div', {},
      wxBtn, h('div', { class: 'toggles one' }, liveTg), wxNote,
      h('div', { class: 'field' }, h('div', { class: 'field-head' }, h('span', {}, 'Viento'), wdVal), h('div', { class: 'compass-wrap' }, wComp.el, h('div', { class: 'grow' }, field('Velocidad', wVal, wR)))),
      field('Humedad relativa', humVal, humR),
      field('Visibilidad atmosférica', visVal, visR),
      field('Hora local', hrVal, hrR),
      field('Población al aire libre', outVal, outR),
      field('Lluvia', rainVal, rainR),
      h('div', { class: 'toggles one', style: { marginTop: '10px' } }, toggle('Población real (WorldPop 2020)', S.view.realPop, (v) => { S.view.realPop = v; })),
      h('div', { class: 'note' }, 'Con la población real activada se descarga la rejilla de WorldPop (100 m en el centro, 1 km alrededor). Sin conexión se usa el modelo urbano aproximado.'),
    ));
    updEnv(true);

    // ---------- visualización ----------
    const V = S.view;
    const qual = seg<string>([['auto', 'Auto'], ['0.5', 'Baja'], ['1', 'Alta'], ['1.6', 'Ultra']], V.autoQ ? 'auto' : String(V.quality), (v) => { V.autoQ = v === 'auto'; if (!V.autoQ) V.quality = +v; this.ev.onView(); });
    this.projSeg = seg<string>([['flat', 'Plano 2D'], ['globe', 'Globo 3D']], V.globe ? 'globe' : 'flat', (v) => { V.globe = v === 'globe'; this.ev.onProjection(V.globe); });
    const viewSec = section('Visualización', h('div', {},
      h('div', { class: 'field' }, h('div', { class: 'field-head' }, h('span', {}, 'Mapa')), this.projSeg.el),
      h('div', { class: 'toggles' },
        toggle('Cúpulas 3D', V.domes, (v) => { V.domes = v; this.ev.onView(); }),
        toggle('Anillos', V.rings, (v) => { V.rings = v; this.ev.onView(); }),
        toggle('Lluvia radiactiva', V.fallout, (v) => { V.fallout = v; this.ev.onView(); }),
        toggle('Marcas en el terreno', V.marks, (v) => { V.marks = v; this.ev.onView(); }),
        toggle('Daño a edificios', V.damage, (v) => { V.damage = v; this.ev.onView(); }),
        toggle('Incendios', V.fires, (v) => { V.fires = v; this.ev.onView(); }),
        toggle('Etiquetas', V.labels, (v) => { V.labels = v; this.ev.onView(); }),
        toggle('Sonido', V.sound, (v) => { V.sound = v; this.ev.onView(); }),
        toggle('Cámara cinemática', V.cinematic, (v) => { V.cinematic = v; this.ev.onView(); }),
        toggle('Post-procesado', V.post, (v) => { V.post = v; this.ev.onView(); }),
      ),
      h('div', { class: 'field', style: { marginTop: '12px' } }, h('div', { class: 'field-head' }, h('span', {}, 'Calidad'), this.qualVal), qual.el),
    ), true);

    this.multiSec = multiSec;
    const body = h('div', { class: 'sb-body' }, targetSec, this.nukePanel, this.astPanel, this.otherPanel, multiSec, envSec, viewSec);

    this.fireBtn = h('button', { class: 'btn-fire', type: 'button', onclick: () => this.ev.onDetonate() }, 'DETONAR') as HTMLButtonElement;
    const foot = h('div', { class: 'sb-foot' }, this.fireBtn, h('button', { class: 'btn-ghost', type: 'button', title: 'Borrar efectos', onclick: () => this.ev.onClear() }, 'Limpiar'));

    this.el.append(head, body, foot);
    this.setMode(S.mode);
  }

  private multiSec?: HTMLElement;
  /** indicador de la calidad automática (fps) */
  qualVal = h('b');
  setMode(m: 'nuclear' | 'asteroid' | 'other') {
    this.state.mode = m;
    this.tabs.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', (t as HTMLElement).dataset.m === m));
    this.nukePanel.style.display = m === 'nuclear' ? '' : 'none';
    this.astPanel.style.display = m === 'asteroid' ? '' : 'none';
    this.otherPanel.style.display = m === 'other' ? '' : 'none';
    if (this.multiSec) this.multiSec.style.display = m === 'other' ? 'none' : '';
    this.fireBtn.textContent = m === 'nuclear' ? 'DETONAR' : m === 'asteroid' ? 'IMPACTAR' : 'SIMULAR';
    this.renderMulti();
    if (this.modeReady) this.ev.onMulti();
    this.modeReady = true;
  }
  private modeReady = false;
}
