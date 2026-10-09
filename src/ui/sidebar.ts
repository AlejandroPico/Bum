import { h, setRangeFill, ICONS, toast } from './dom';
import { NUKE_PRESETS, ASTEROID_PRESETS, COMPOSITIONS, QUICK_TARGETS } from '../data/presets';
import { fmtEnergy } from '../physics/effects';
import type { NuclearInput, AsteroidInput, Environment, BurstMode, TargetType } from '../physics/types';

export interface ViewOptions {
  domes: boolean; rings: boolean; fallout: boolean; damage: boolean; fires: boolean; sound: boolean; cinematic: boolean; labels: boolean;
  quality: number;
}

export interface AppState {
  mode: 'nuclear' | 'asteroid';
  nuke: NuclearInput;
  ast: AsteroidInput & { azimuth: number };
  env: Environment;
  target: { lat: number; lon: number; label: string };
  view: ViewOptions;
}

export function defaultState(): AppState {
  return {
    mode: 'nuclear',
    nuke: { kind: 'nuclear', name: 'B83 (1,2 Mt)', yieldKt: 1200, fission: 0.5, burst: 'optimal', heightM: 0 },
    ast: { kind: 'asteroid', name: 'Tunguska (1908)', diameterM: 60, densityKgM3: 3000, velocityKms: 15, angleDeg: 35, target: 'sediment', waterDepthM: 0, azimuth: 250 },
    env: { windFromDeg: 270, windKmh: 24, visibilityKm: 25, humidity: 65, hour: 12 },
    target: { lat: 40.4168, lon: -3.7038, label: 'Madrid' },
    view: { domes: true, rings: true, fallout: true, damage: true, fires: true, sound: true, cinematic: true, labels: true, quality: 1 },
  };
}

export interface SidebarEvents {
  onDetonate(): void;
  onClear(): void;
  onTarget(lat: number, lon: number, label: string, fly: boolean): void;
  onEnv(): void;
  onView(): void;
  onCollapse(): void;
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
    <circle r="46" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.12)"/>
    <circle r="34" fill="none" stroke="rgba(255,255,255,0.06)"/>
    ${[0, 90, 180, 270].map((a) => `<text x="${Math.sin((a * Math.PI) / 180) * 40}" y="${-Math.cos((a * Math.PI) / 180) * 40 + 3.5}" font-size="9" fill="#8b93a7" text-anchor="middle" font-family="Inter" font-weight="700">${'NESO'[a / 90]}</text>`).join('')}
    <g class="arrow"><path d="M0 -30 L7 -14 L2 -16 L2 28 L-2 28 L-2 -16 L-7 -14 Z" fill="#ff8a3d"/></g>
    <circle r="3" fill="#fff"/>`;
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
  private tabs!: HTMLElement;
  refresh: () => void = () => {};

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
    const head = h('div', { class: 'sb-head' },
      h('div', { class: 'logo' }),
      h('div', { class: 'brand' }, h('h1', {}, 'BUM'), h('p', {}, 'Simulador 3D de ataques nucleares · v0.3')),
      h('button', { class: 'icon-btn', title: 'Ocultar panel (H)', html: ICONS.hide, onclick: () => this.ev.onCollapse() }),
    );

    // pestañas
    this.tabs = h('div', { class: 'tabs' },
      h('button', { class: 'tab', 'data-m': 'nuclear', html: `${ICONS.atom}<span>Arma nuclear</span>`, onclick: () => this.setMode('nuclear') }),
      h('button', { class: 'tab', 'data-m': 'asteroid', html: `${ICONS.rock}<span>Impacto cósmico</span>`, onclick: () => this.setMode('asteroid') }),
    );

    // ---------- objetivo ----------
    const searchIn = h('input', { type: 'text', placeholder: 'Buscar ciudad, dirección o lugar…' }) as HTMLInputElement;
    const results = h('div', { class: 'search-results' });
    let timer = 0;
    const doSearch = async () => {
      const q = searchIn.value.trim();
      if (q.length < 2) { results.classList.remove('open'); return; }
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=es&q=${encodeURIComponent(q)}`);
        const js = await r.json();
        results.innerHTML = '';
        for (const it of js) {
          const name = it.display_name as string;
          results.append(h('div', { onclick: () => { results.classList.remove('open'); searchIn.value = name.split(',')[0]; this.setTarget(+it.lat, +it.lon, name.split(',')[0]); this.ev.onTarget(+it.lat, +it.lon, name.split(',')[0], true); } }, name));
        }
        results.classList.toggle('open', js.length > 0);
      } catch { toast('No se pudo buscar el lugar (sin conexión)'); }
    };
    searchIn.addEventListener('input', () => { clearTimeout(timer); timer = window.setTimeout(doSearch, 450); });
    searchIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { clearTimeout(timer); doSearch(); } });
    document.addEventListener('click', (e) => { if (!results.contains(e.target as Node) && e.target !== searchIn) results.classList.remove('open'); });
    this.coordsEl = h('div', { class: 'coords' });
    const chips = h('div', { class: 'chips' }, ...QUICK_TARGETS.map((q) => h('button', { class: 'chip', type: 'button', onclick: () => { this.setTarget(q.lat, q.lon, q.name); this.ev.onTarget(q.lat, q.lon, q.name, true); } }, q.name)));
    const targetSec = section('Objetivo', h('div', {}, h('div', { class: 'search', html: ICONS.search }, searchIn, results), chips, this.coordsEl));
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
    const burst = seg<BurstMode>([['surface', 'Superficie'], ['optimal', 'Aérea óptima'], ['custom', 'Altura…']], nk.burst, (v) => { nk.burst = v; updNuke(); });

    const updNuke = (from?: 'slider' | 'num') => {
      if (from === 'slider') nk.yieldKt = Math.pow(10, +yieldR.value);
      if (from === 'num') nk.yieldKt = Math.max(1e-6, (+yieldNum.value || 0) * +yieldUnit.value);
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
      nk.heightM = +hIn.value || 0;
      hVal.textContent = nk.heightM >= 1000 ? `${(nk.heightM / 1000).toLocaleString('es-ES')} km` : `${nk.heightM} m`;
    };
    presetSel.addEventListener('change', () => {
      if (!presetSel.value) { presetNote.style.display = 'none'; nk.name = 'Arma personalizada'; return; }
      const [gi, ii] = presetSel.value.split(':').map(Number);
      const p = NUKE_PRESETS[gi].items[ii];
      Object.assign(nk, { name: p.name, yieldKt: p.yieldKt, fission: p.fission, burst: p.burst, heightM: p.heightM });
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
      )),
    );
    updNuke();

    // ---------- asteroide ----------
    const as = S.ast;
    const aPreset = h('select') as HTMLSelectElement;
    aPreset.append(h('option', { value: '' }, '— Personalizado —'));
    ASTEROID_PRESETS.forEach((p, i) => aPreset.append(h('option', { value: String(i) }, p.name)));
    const aNote = h('div', { class: 'note' });
    const dVal = h('b'), dR = logSlider(0, 4.3, as.diameterM);
    const comp = h('select') as HTMLSelectElement;
    COMPOSITIONS.forEach((c) => comp.append(h('option', { value: String(c.density) }, `${c.name} · ${c.density} kg/m³`)));
    const densIn = h('input', { type: 'number', min: 100, max: 20000, step: 50, value: as.densityKgM3 }) as HTMLInputElement;
    const vVal = h('b'), vR = linSlider(11, 72, as.velocityKms, 0.1);
    const angVal = h('b'), angR = linSlider(5, 90, as.angleDeg, 1);
    const tgt = seg<TargetType>([['sediment', 'Sedimento'], ['rock', 'Roca'], ['water', 'Agua']], as.target, (v) => { as.target = v; updAst(); markA(); });
    const depthIn = h('input', { type: 'number', min: 1, max: 11000, step: 10, value: as.waterDepthM || 3000 }) as HTMLInputElement;
    const depthField = field('Profundidad del agua (m)', null, depthIn);
    const azComp = compassInput(as.azimuth, (deg) => { as.azimuth = deg; azVal.textContent = `${deg}° (${dirName(deg)})`; });
    const azVal = h('b', {}, `${as.azimuth}° (${dirName(as.azimuth)})`);
    const updAst = () => {
      as.diameterM = Math.pow(10, +dR.value); setRangeFill(dR);
      dVal.textContent = as.diameterM >= 1000 ? `${(as.diameterM / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} km` : `${Math.round(as.diameterM)} m`;
      as.densityKgM3 = +densIn.value || 3000;
      as.velocityKms = +vR.value; setRangeFill(vR); vVal.textContent = `${as.velocityKms.toFixed(1).replace('.', ',')} km/s`;
      as.angleDeg = +angR.value; setRangeFill(angR); angVal.textContent = `${as.angleDeg}°`;
      as.waterDepthM = as.target === 'water' ? +depthIn.value || 1000 : 0;
      depthField.style.display = as.target === 'water' ? '' : 'none';
    };
    const markA = () => { aPreset.value = ''; aNote.style.display = 'none'; as.name = 'Objeto personalizado'; };
    aPreset.addEventListener('change', () => {
      if (!aPreset.value) { markA(); return; }
      const p = ASTEROID_PRESETS[+aPreset.value];
      Object.assign(as, { name: p.name, diameterM: p.diameterM, densityKgM3: p.densityKgM3, velocityKms: p.velocityKms, angleDeg: p.angleDeg, target: p.target, waterDepthM: p.waterDepthM });
      dR.value = String(Math.log10(p.diameterM)); densIn.value = String(p.densityKgM3); vR.value = String(p.velocityKms); angR.value = String(p.angleDeg); tgt.set(p.target);
      if (p.target === 'water') depthIn.value = String(p.waterDepthM);
      comp.value = String(COMPOSITIONS.reduce((b, c) => (Math.abs(c.density - p.densityKgM3) < Math.abs(b.density - p.densityKgM3) ? c : b)).density);
      aNote.textContent = p.note; aNote.style.display = '';
      updAst();
    });
    comp.addEventListener('change', () => { densIn.value = comp.value; updAst(); markA(); });
    for (const el of [dR, vR, angR]) el.addEventListener('input', () => { updAst(); markA(); });
    for (const el of [densIn, depthIn]) el.addEventListener('input', () => { updAst(); markA(); });
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
        depthField,
        h('div', { class: 'field' }, h('div', { class: 'field-head' }, h('span', {}, 'Dirección de llegada'), azVal), h('div', { class: 'compass-wrap' }, azComp.el, h('div', { class: 'grow note', style: { margin: 0 } }, 'Arrastra la flecha: indica hacia dónde viaja el objeto.'))),
      )),
    );
    updAst();

    // ---------- entorno ----------
    const E = S.env;
    const wVal = h('b'), wR = linSlider(0, 150, E.windKmh, 1);
    const wdVal = h('b');
    const wComp = compassInput(E.windFromDeg, (deg) => { E.windFromDeg = deg; updEnv(); });
    const humVal = h('b'), humR = linSlider(0, 100, E.humidity, 1);
    const visVal = h('b'), visR = linSlider(2, 80, E.visibilityKm, 1);
    const hrVal = h('b'), hrR = linSlider(0, 24, E.hour, 0.25);
    const updEnv = (silent = false) => {
      E.windKmh = +wR.value; setRangeFill(wR); wVal.textContent = `${E.windKmh} km/h`;
      wdVal.textContent = `desde ${dirName(E.windFromDeg)} (${E.windFromDeg}°)`;
      E.humidity = +humR.value; setRangeFill(humR); humVal.textContent = `${E.humidity} %`;
      E.visibilityKm = +visR.value; setRangeFill(visR); visVal.textContent = `${E.visibilityKm} km`;
      E.hour = +hrR.value; setRangeFill(hrR);
      const hh = Math.floor(E.hour) % 24, mm = Math.round((E.hour % 1) * 60);
      hrVal.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      if (!silent) this.ev.onEnv();
    };
    for (const r of [wR, humR, visR, hrR]) r.addEventListener('input', () => updEnv());
    const envSec = section('Entorno', h('div', {},
      h('div', { class: 'field' }, h('div', { class: 'field-head' }, h('span', {}, 'Viento'), wdVal), h('div', { class: 'compass-wrap' }, wComp.el, h('div', { class: 'grow' }, field('Velocidad', wVal, wR)))),
      field('Humedad relativa', humVal, humR),
      field('Visibilidad atmosférica', visVal, visR),
      field('Hora local', hrVal, hrR),
    ));
    updEnv(true);

    // ---------- visualización ----------
    const V = S.view;
    const qual = seg<string>([['0.5', 'Baja'], ['1', 'Alta'], ['1.6', 'Ultra']], String(V.quality), (v) => { V.quality = +v; this.ev.onView(); });
    const viewSec = section('Visualización', h('div', {},
      h('div', { class: 'toggles' },
        toggle('Cúpulas 3D', V.domes, (v) => { V.domes = v; this.ev.onView(); }),
        toggle('Anillos', V.rings, (v) => { V.rings = v; this.ev.onView(); }),
        toggle('Lluvia radiactiva', V.fallout, (v) => { V.fallout = v; this.ev.onView(); }),
        toggle('Daño a edificios', V.damage, (v) => { V.damage = v; this.ev.onView(); }),
        toggle('Incendios', V.fires, (v) => { V.fires = v; this.ev.onView(); }),
        toggle('Etiquetas', V.labels, (v) => { V.labels = v; this.ev.onView(); }),
        toggle('Sonido', V.sound, (v) => { V.sound = v; this.ev.onView(); }),
        toggle('Cámara cinemática', V.cinematic, (v) => { V.cinematic = v; this.ev.onView(); }),
      ),
      h('div', { class: 'field', style: { marginTop: '12px' } }, h('div', { class: 'field-head' }, h('span', {}, 'Calidad de partículas')), qual.el),
    ), true);

    const body = h('div', { class: 'sb-body' }, targetSec, this.nukePanel, this.astPanel, envSec, viewSec);

    this.fireBtn = h('button', { class: 'btn-fire', type: 'button', onclick: () => this.ev.onDetonate() }, 'DETONAR') as HTMLButtonElement;
    const foot = h('div', { class: 'sb-foot' }, this.fireBtn, h('button', { class: 'btn-ghost', type: 'button', title: 'Borrar efectos', onclick: () => this.ev.onClear() }, 'Limpiar'));

    this.el.append(head, this.tabs, body, foot);
    this.setMode(S.mode);
  }

  setMode(m: 'nuclear' | 'asteroid') {
    this.state.mode = m;
    this.tabs.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', (t as HTMLElement).dataset.m === m));
    this.nukePanel.style.display = m === 'nuclear' ? '' : 'none';
    this.astPanel.style.display = m === 'asteroid' ? '' : 'none';
    this.fireBtn.textContent = m === 'nuclear' ? 'DETONAR' : 'IMPACTAR';
  }
}
