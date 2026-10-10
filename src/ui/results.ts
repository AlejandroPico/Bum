import { h, ICONS, fmtNum, setRangeFill } from './dom';
import { fmtDist, fmtArea, fmtEnergy } from '../physics/effects';
import { buildStats, type StatSection } from './stats';
import type { Effects } from '../physics/types';
import { INFRA, type InfraResult } from '../data/osm';

const n1 = (x: number, d = 1) => x.toLocaleString('es-ES', { maximumFractionDigits: d });
const dur = (s: number) => { if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min`; if (s < 86400 * 2) { const hh = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return m ? `${hh} h ${m} min` : `${hh} h`; } return `${n1(s / 86400, s < 86400 * 10 ? 1 : 0)} días`; };

export interface ResultsEvents {
  onToggle(id: string, visible: boolean): void;
  onHover(id: string | null): void;
  onShare(): void;
  onFocus(id: string): void;
  /** abrir la ficha de la enciclopedia del escenario */
  onBook(name: string): void;
}

const GROUP_NAMES: Record<string, string> = {
  fireball: 'Bola de fuego', crater: 'Cráter', radiation: 'Radiación inicial', blast: 'Onda expansiva', thermal: 'Radiación térmica',
  seismic: 'Sismicidad', emp: 'Pulso electromagnético', ejecta: 'Eyecta', tsunami: 'Tsunami',
};

type Tab = 'sum' | 'eff' | 'pop' | 'phys' | 'rad' | 'def' | 'cmp';

/** resumen de un ataque con varias detonaciones */
export interface MultiInfo { deaths: number; injuries: number; exposed: number; items: { name: string; place: string; energyKt: number; deaths: number }[] }

const SHELTERS: [string, number][] = [
  ['A la intemperie', 1], ['Coche', 1.5], ['Casa de madera o prefabricada', 3], ['Casa de ladrillo, planta baja', 10],
  ['Piso intermedio de un edificio grande', 40], ['Sótano', 40], ['Centro de un gran edificio de hormigón', 200], ['Refugio antinuclear', 1000],
];
const TABS: [Tab, string][] = [['sum', 'Resumen'], ['eff', 'Efectos'], ['pop', 'Población'], ['phys', 'Física'], ['rad', 'Radiación'], ['def', 'Defensa'], ['cmp', 'Comparar']];

export class ResultsPanel {
  el: HTMLElement;
  private ev: ResultsEvents;
  hidden = new Set<string>();
  private tab: Tab = 'sum';
  private anim = 0;

  constructor(el: HTMLElement, ev: ResultsEvents) {
    this.el = el;
    this.ev = ev;
    el.classList.add('glass');
    // panel fijo a la derecha, como el izquierdo; avisa al resto de la interfaz cuando se abre o se pliega
    const sync = () => {
      document.body.classList.toggle('rp-open', !el.classList.contains('hidden'));
      document.body.classList.toggle('rp-min', el.classList.contains('min'));
    };
    new MutationObserver(sync).observe(el, { attributes: true, attributeFilter: ['class'] });
    sync();
  }

  hide() { this.el.classList.add('hidden'); cancelAnimationFrame(this.anim); }

  /** infraestructuras de OpenStreetMap por zona (llegan después, de forma asíncrona) */
  private infra: InfraResult | 'loading' | 'error' | null = null;
  private reshow: (() => void) | null = null;
  setInfra(r: InfraResult | 'loading' | 'error' | null) {
    this.infra = r;
    if (this.tab === 'pop') this.reshow?.();
  }
  private infraBlock(body: HTMLElement) {
    const r = this.infra;
    if (!r) return;
    body.append(h('div', { class: 'res-h3' }, 'Infraestructuras en cada zona (OpenStreetMap)'));
    if (r === 'loading') { body.append(h('div', { class: 'sec-note' }, 'Consultando OpenStreetMap…')); return; }
    if (r === 'error') { body.append(h('div', { class: 'sec-note' }, 'No se pudo consultar OpenStreetMap (servidor Overpass ocupado o sin conexión).')); return; }
    const zs = r.zones;
    const tbl = h('table', { class: 'infra' });
    tbl.append(h('tr', {}, h('th', {}, ''), ...zs.map((z) => h('th', {}, z.label))));
    for (const c of INFRA) {
      if (!zs.some((z) => z.counts[c.key] > 0)) continue;
      tbl.append(h('tr', {}, h('td', {}, c.label), ...zs.map((z) => h('td', {}, z.radiusM > r.maxR ? `≥ ${fmtNum(z.counts[c.key])}` : fmtNum(z.counts[c.key])))));
    }
    body.append(h('div', { class: 'infra-wrap' }, tbl), h('div', { class: 'sec-note' }, `Recuento acumulado desde la zona cero con los datos actuales de OpenStreetMap (puede estar incompleto).${r.capped ? ` Búsqueda limitada a ${fmtDist(r.maxR)}: las zonas mayores muestran un mínimo.` : ''}`));
  }

  render(fx: Effects, place: string, multi?: MultiInfo) {
    const el = this.el;
    el.innerHTML = '';
    el.classList.remove('hidden');
    const sc = fx.scenario;
    const hiro = fx.energyKt / 15;
    const kicker = sc.kind === 'release' ? (sc.source === 'dirtybomb' ? 'Bomba sucia' : 'Accidente nuclear') : sc.kind === 'volcano' ? 'Erupción volcánica' : sc.kind === 'nuclear'
      ? fx.chemical ? 'Explosión convencional' : 'Detonación nuclear'
      : fx.asteroid?.fate === 'airburst' ? 'Explosión aérea de asteroide' : 'Impacto de asteroide';
    const burst = sc.kind === 'release' ? `${fx.release?.isoName ?? ''}` : sc.kind === 'volcano' ? `VEI ${sc.vei}` : fx.buried ? `${fx.buried.mode === 'underground' ? 'bajo tierra' : 'bajo el agua'} a ${fmtDist(fx.buried.depthM)}` : fx.burstHeightM > 0 ? `a ${fmtDist(fx.burstHeightM)} de altura` : sc.kind === 'asteroid' && sc.target === 'water' ? `en el océano (${fmtDist(sc.waterDepthM)} de prof.)` : 'en superficie';
    const minBtn = h('button', { class: 'icon-btn', title: 'Minimizar', html: ICONS.min, onclick: () => { el.classList.toggle('min'); minBtn.innerHTML = el.classList.contains('min') ? ICONS.max : ICONS.min; } });
    const hiroTxt = hiro >= 1 ? `×${fmtNum(hiro)} Hiroshima` : `${(hiro * 100).toFixed(hiro < 0.01 ? 2 : 1).replace('.', ',')} % de Hiroshima`;
    const head = h('div', { class: 'res-head' },
      h('div', { class: 'ttl' },
        h('div', { class: 'kicker' }, kicker),
        h('h2', {}, sc.name || fmtEnergy(fx.energyKt)),
        h('div', { class: 'sub' }, `${fx.energyKt > 0 && sc.kind !== 'release' && sc.kind !== 'volcano' ? fmtEnergy(fx.energyKt) + ' ' : ''}${burst} · ${place}`),
      ),
      h('button', { class: 'icon-btn', title: 'Ficha en la enciclopedia', html: ICONS.book, onclick: () => this.ev.onBook(sc.name) }),
      h('button', { class: 'icon-btn', title: 'Compartir enlace', html: ICONS.share, onclick: () => this.ev.onShare() }),
      minBtn,
    );

    // contadores (siempre visibles)
    const c = fx.casualties;
    const dEl = h('div', { class: 'v' }, '0');
    const iEl = h('div', { class: 'v' }, '0');
    const counters = h('div', { class: 'counters' },
      h('div', { class: 'cnt red' }, dEl, h('div', { class: 'l' }, fx.release ? 'Muertes estimadas' : 'Fallecidos')),
      h('div', { class: 'cnt amber' }, iEl, h('div', { class: 'l' }, fx.release ? 'En zona de evacuación' : 'Heridos')),
    );
    if (fx.release) this.countUp([[dEl, c.deaths + fx.release.cancerDeaths], [iEl, fx.release.popZone]]);
    else this.countUp([[dEl, multi?.deaths ?? c.deaths], [iEl, multi?.injuries ?? c.injuries]]);

    const stats = buildStats(fx);
    const tabsBar = h('div', { class: 'res-tabs' });
    const body = h('div', { class: 'res-body' });
    const avail = TABS.filter(([t]) => t === 'sum' || t === 'eff' || (t === 'def' && fx.scenario.kind === 'asteroid') || (t === 'rad' && fx.fallout.length > 0 && !fx.volcano) || stats.some((s) => s.tab === t));
    if (!avail.some(([t]) => t === this.tab)) this.tab = 'sum';
    const show = (t: Tab) => {
      this.tab = t;
      tabsBar.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
      body.innerHTML = '';
      body.scrollTop = 0;
      if (t === 'sum') { if (multi) this.multiBlock(body, multi); this.summary(body, fx, hiroTxt); }
      else if (t === 'eff') this.effects(body, fx);
      else if (t === 'def') this.defense(body, fx);
      else { this.sections(body, stats.filter((s) => s.tab === t)); if (t === 'pop') this.infraBlock(body); if (t === 'rad' && fx.fallout.length && fx.falloutDoseAt && !fx.release) this.shelter(body, fx); }
    };
    this.reshow = () => show(this.tab);
    for (const [t, l] of avail) tabsBar.append(h('button', { type: 'button', 'data-t': t, onclick: () => show(t) }, l));
    show(this.tab);

    el.append(head, counters, tabsBar, body);
  }

  private multiBlock(body: HTMLElement, m: MultiInfo) {
    body.append(h('div', { class: 'res-h3' }, `Ataque con ${m.items.length} detonaciones`));
    const kv = h('div', { class: 'kv' });
    m.items.forEach((it, i) => kv.append(h('span', { class: 'k' }, `${i + 1}. ${it.name}`, h('small', {}, it.place)), h('span', {}, `${fmtEnergy(it.energyKt)} · ${fmtNum(it.deaths)} †`)));
    kv.append(h('span', { class: 'k' }, 'Energía total'), h('span', { class: 'strong' }, fmtEnergy(m.items.reduce((a, b) => a + b.energyKt, 0))));
    kv.append(h('span', { class: 'k' }, 'Población expuesta'), h('span', {}, fmtNum(m.exposed)));
    body.append(kv, h('div', { class: 'sec-note' }, 'Los contadores combinan todas las detonaciones sin contar dos veces a nadie: en cada punto se suman las probabilidades de todas las explosiones. Las pestañas siguientes muestran la primera detonación.'));
  }

  /** calculadora de refugio frente a la lluvia radiactiva */
  private shelter(body: HTMLElement, fx: Effects) {
    const maxKm = Math.max(5, ...fx.fallout.map((f) => f.maxDownwindKm));
    body.append(h('div', { class: 'res-h3' }, 'Calculadora de refugio'));
    const to = ((fx.windFromDeg + 180) * Math.PI) / 180;
    const dist = h('input', { type: 'range', min: 0, max: 1000, step: 1, value: 300 }) as HTMLInputElement;
    const dVal = h('b');
    const sel = h('select') as HTMLSelectElement;
    SHELTERS.forEach(([n, pf], i) => sel.append(h('option', { value: String(i) }, `${n} (protección ×${pf})`)));
    sel.value = '3';
    const out = h('div', { class: 'kv' });
    const upd = () => {
      setRangeFill(dist);
      const km = Math.max(1, maxKm * Math.pow(+dist.value / 1000, 1.6));
      dVal.textContent = `${n1(km, km < 10 ? 1 : 0)} km a sotavento`;
      const e = Math.sin(to) * km * 1000, n = Math.cos(to) * km * 1000;
      const pf = SHELTERS[+sel.value][1];
      const R1 = fx.falloutRateAt(e, n);
      const ta = fx.falloutArrivalH!(e, n);
      const D = (a: number, b: number, p: number) => fx.falloutDoseAt!(e, n, a, b, p);
      const risk = (d: number) => (d >= 600 ? 'mortal casi seguro' : d >= 400 ? 'mortal para la mitad' : d >= 200 ? 'síndrome de radiación grave' : d >= 100 ? 'síndrome de radiación leve' : d >= 25 ? 'sin síntomas; más riesgo de cáncer' : 'riesgo bajo');
      const tFor = (lvl: number) => (R1 <= lvl ? 0 : Math.pow(R1 / lvl, 1 / 1.2));
      const evac = (t: number) => (R1 * Math.pow(Math.max(t, ta), -1.2)) * 1; // 1 h al aire libre
      const rows: [string, string, string?][] = [
        ['Tasa de dosis a H+1', `${R1 >= 10 ? fmtNum(R1) : n1(R1, 1)} R/h`],
        ['Llegada de la lluvia radiactiva', dur(ta * 3600)],
        ['Dosis en 48 h a la intemperie', `${fmtNum(D(0, 48, 1))} rem`, risk(D(0, 48, 1))],
        ['Dosis en 48 h en el refugio elegido', `${fmtNum(D(0, 48, pf))} rem`, risk(D(0, 48, pf))],
        ['Dosis en 7 días en el refugio', `${fmtNum(D(0, 168, pf))} rem`, risk(D(0, 168, pf))],
        ['La tasa baja de 1 R/h', R1 > 1 ? `a las ${dur(tFor(1) * 3600)}` : 'desde el principio'],
        ['La tasa baja de 0,1 R/h', R1 > 0.1 ? `a las ${dur(tFor(0.1) * 3600)}` : 'desde el principio'],
        ['Evacuar a pie 1 h a las 24 h', `≈ ${fmtNum(evac(24))} rem`, 'dosis del trayecto al aire libre'],
        ['Evacuar a pie 1 h a las 72 h', `≈ ${fmtNum(evac(72))} rem`],
      ];
      out.innerHTML = '';
      for (const [k, v, hint] of rows) out.append(h('span', { class: hint ? 'k has-hint' : 'k' }, k, hint ? h('small', {}, hint) : null), h('span', {}, v));
    };
    dist.addEventListener('input', upd);
    sel.addEventListener('change', upd);
    body.append(h('label', { class: 'field' }, h('div', { class: 'field-head' }, h('span', {}, 'Distancia'), dVal), dist), h('label', { class: 'field' }, h('div', { class: 'field-head' }, h('span', {}, 'Dónde te refugias')), sel), out,
      h('div', { class: 'sec-note' }, 'Recomendación general de protección civil: entrar en el edificio más sólido posible, ir al centro o al sótano, quedarse al menos 24 h (mejor 48–72 h) y seguir las instrucciones oficiales. La radiación cae ×10 por cada ×7 de tiempo.'));
    upd();
  }

  /** defensa planetaria: ¿se podría haber desviado? */
  private defense(body: HTMLElement, fx: Effects) {
    const sc = fx.scenario;
    if (sc.kind !== 'asteroid' || !fx.asteroid) return;
    const M = fx.asteroid.massKg;
    body.append(h('div', { class: 'res-h3' }, 'Desvío con impactadores cinéticos (tipo DART)'));
    const yr = h('input', { type: 'range', min: 0, max: 1000, step: 1, value: 500 }) as HTMLInputElement;
    const yrV = h('b');
    const nI = h('input', { type: 'range', min: 1, max: 50, step: 1, value: 1 }) as HTMLInputElement;
    const nV = h('b');
    const out = h('div', { class: 'kv' });
    const vInf = Math.sqrt(Math.max(1, sc.velocityKms ** 2 - 11.2 ** 2));
    const bCrit = 6371 * Math.sqrt(1 + (11.2 / vInf) ** 2); // km (con el enfoque gravitatorio)
    const upd = () => {
      setRangeFill(yr); setRangeFill(nI);
      const years = Math.pow(10, -1 + 2.7 * (+yr.value / 1000)); // 0,1 a 50 años
      yrV.textContent = `${n1(years, years < 2 ? 1 : 0)} años`;
      const N = +nI.value; nV.textContent = String(N);
      const beta = 3.6, mi = 580, vi = 6100; // DART: β medido ≈ 3,6
      const dv = (N * beta * mi * vi) / M; // m/s
      const dx = 3 * dv * years * 3.156e7 / 1000; // km (desplazamiento a lo largo de la órbita)
      const need = Math.ceil(bCrit / Math.max(1e-12, 3 * ((beta * mi * vi) / M) * years * 3.156e7 / 1000));
      const ok = dx >= bCrit;
      const rows: [string, string, string?][] = [
        ['Masa del objeto', `${(M / 1e9).toLocaleString('es-ES', { maximumFractionDigits: M > 1e12 ? 0 : 2 })} millones de t`],
        ['Cambio de velocidad', dv >= 0.01 ? `${n1(dv * 100, 2)} cm/s` : `${(dv * 1000).toLocaleString('es-ES', { maximumFractionDigits: 3 })} mm/s`, `${N} impactador${N > 1 ? 'es' : ''} de 580 kg a 6,1 km/s, β ≈ 3,6`],
        ['Desplazamiento en el momento del encuentro', `${fmtNum(dx)} km`, '≈ 3 × Δv × tiempo de aviso (empujón a lo largo de la órbita)'],
        ['Distancia necesaria para fallar', `${fmtNum(bCrit)} km`, 'radio terrestre ampliado por la atracción de la Tierra'],
        ['Resultado', ok ? 'el objeto NO impacta' : 'el objeto impacta igualmente'],
        ['Impactadores necesarios con este aviso', need > 1e6 ? 'inviable' : fmtNum(need)],
      ];
      out.innerHTML = '';
      for (const [k, v, hint] of rows) out.append(h('span', { class: hint ? 'k has-hint' : 'k' }, k, hint ? h('small', {}, hint) : null), h('span', { class: k === 'Resultado' ? 'strong' : '' }, v));
      (out.lastElementChild?.previousElementSibling?.previousElementSibling?.nextElementSibling as HTMLElement | null)?.classList.toggle('ok', ok);
    };
    yr.addEventListener('input', upd); nI.addEventListener('input', upd);
    body.append(h('label', { class: 'field' }, h('div', { class: 'field-head' }, h('span', {}, 'Tiempo de aviso'), yrV), yr), h('label', { class: 'field' }, h('div', { class: 'field-head' }, h('span', {}, 'Número de impactadores'), nV), nI), out,
      h('div', { class: 'sec-note' }, 'DART (2022) cambió el periodo de Dimorphos en 33 minutos. Desviar es mucho más fácil con décadas de aviso: por eso son clave los sondeos de objetos cercanos (Vera Rubin, NEO Surveyor). Para objetos de varios kilómetros o avisos cortos, se estudian explosiones nucleares a distancia. Cálculo de orden de magnitud.'));
    upd();
  }

  /** contadores que suben rápido hasta la cifra final (como NUKEMAP) */
  private countUp(items: [HTMLElement, number][]) {
    cancelAnimationFrame(this.anim);
    const t0 = performance.now();
    const dur = 2600;
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      const e = k >= 1 ? 1 : 1 - Math.pow(2, -10 * k); // ease-out exponencial
      for (const [el, v] of items) el.textContent = Math.round(v * e).toLocaleString('es-ES');
      if (k < 1) this.anim = requestAnimationFrame(step);
      else for (const [el, v] of items) { el.textContent = fmtFull(v); el.title = Math.round(v).toLocaleString('es-ES'); }
    };
    this.anim = requestAnimationFrame(step);
  }

  private summary(body: HTMLElement, fx: Effects, hiroTxt: string) {
    if (fx.release || fx.volcano) return this.summaryOther(body, fx);
    const ring = (id: string) => fx.rings.find((r) => r.id === id);
    const kv: [string, string][] = [];
    const affected = fx.casualties.profile;
    kv.push(['Energía', `${fmtEnergy(fx.energyKt)} · ${hiroTxt}`]);
    if (fx.buried?.columnM) kv.push(['Columna de agua', fmtDist(fx.buried.columnM)]);
    else if (fx.buried?.contained) kv.push([fx.buried.mode === 'underground' ? 'Cavidad' : 'Burbuja', `${fmtDist(fx.fireball.radiusM)} de radio`]);
    else kv.push(['Bola de fuego', `${fmtDist(fx.fireball.radiusM)} de radio`]);
    if (!fx.chemical || fx.cloud.topM > 500) kv.push(['Altura de la nube', fmtDist(fx.cloud.topM)]);
    const add = (id: string, k: string) => { const r = ring(id); if (r) kv.push([k, r.global ? 'todo el planeta' : `${fmtDist(r.radiusM)} · ${fmtArea(r.radiusM)}`]); };
    add('psi20', 'Destrucción total (20 psi)');
    add('psi5', 'Daño grave (5 psi)');
    add('psi1', 'Rotura de cristales (1 psi)');
    add('burn3', 'Quemaduras de 3.er grado');
    add('rad500', 'Radiación letal (500 rem)');
    if (fx.crater) kv.push(['Cráter', `${fmtDist(fx.crater.diameterM)} × ${fmtDist(fx.crater.depthM)}`]);
    if (fx.seismic) kv.push(['Magnitud sísmica', fx.seismic.magnitude.toFixed(1).replace('.', ',')]);
    if (fx.tsunami) kv.push(['Ola a 1000 km', fmtDist(fx.tsunami.at1000kmM)]);
    if (fx.fallout.length) {
      const f1 = fx.fallout.find((f) => f.level === 1) ?? fx.fallout[0];
      kv.push(['Lluvia radiactiva (≥ 1 rad/h)', `${fmtNum(f1.areaKm2)} km² · ${fmtNum(f1.maxDownwindKm)} km`]);
    }
    const n = affected.pop.length;
    if (n) kv.push(['Población en la zona de cálculo', fmtNum(affected.pop[n - 1])]);
    kv.push(['Datos de población', fx.popSource ?? 'modelo urbano aproximado']);
    body.append(h('div', { class: 'kv' }, ...kv.flatMap(([k, v]) => [h('span', {}, k), h('span', {}, v)])));
    if (fx.notes.length) body.append(h('ul', { class: 'notes' }, ...fx.notes.map((t) => h('li', {}, t))));
    body.append(h('div', { class: 'disclaimer' },
      'Estimaciones orientativas con fines educativos. Modelos: Glasstone & Dolan, ',
      h('i', {}, 'The Effects of Nuclear Weapons'), ' (1977); Collins, Melosh & Marcus (2005) para impactos; Wünnemann et al. (2010) para tsunamis; lluvia radiactiva con un modelo analítico tipo WSEG-10; víctimas inmediatas con probabilidades tipo OTA (1979) sobre ', fx.popSource ? `la población real de ${fx.popSource}` : 'un modelo de densidad urbana aproximado (no censal)', '. No incluyen incendios posteriores, efectos climáticos ni víctimas a largo plazo.',
    ));
  }

  /** resumen de accidentes, bombas sucias y erupciones */
  private summaryOther(body: HTMLElement, fx: Effects) {
    const kv: [string, string][] = [];
    const zones = [...fx.fallout].sort((a, b) => b.level - a.level);
    if (fx.release) {
      const r = fx.release;
      const sc = fx.scenario;
      kv.push(['Isótopo', r.isoName]);
      kv.push(['Actividad dispersada', r.activityBq >= 1e15 ? `${n1(r.activityBq / 1e15, 1)} PBq` : `${n1(r.activityBq / 1e12, r.activityBq < 1e13 ? 2 : 0)} TBq`]);
      if (sc.kind === 'release' && sc.source === 'dirtybomb' && fx.energyKt > 0) kv.push(['Explosivo', fmtEnergy(fx.energyKt)]);
      const km2 = (a: number) => (a < 1 ? (a < 0.01 ? '< 0,01' : n1(a, 2)) : fmtNum(a));
      for (const z of zones) kv.push([z.label, `${km2(z.areaKm2)} km² · hasta ${z.maxDownwindKm < 10 ? n1(z.maxDownwindKm, 1) : fmtNum(z.maxDownwindKm)} km`]);
      kv.push(['Población en zona contaminada', fmtNum(r.popAny)]);
      kv.push(['Población a evacuar', fmtNum(r.popZone)]);
      kv.push(['Dosis colectiva (primer año)', `${fmtNum(r.collectiveSv)} Sv·persona`]);
      kv.push(['Cánceres mortales adicionales', `≈ ${fmtNum(r.cancerDeaths)}`]);
      if (fx.casualties.deaths > 0) kv.push(['Víctimas de la explosión', fmtNum(fx.casualties.deaths)]);
    } else if (fx.volcano) {
      const v = fx.volcano;
      kv.push(['Índice de explosividad (VEI)', String(v.vei)]);
      kv.push(['Volumen expulsado', `${v.volumeKm3.toLocaleString('es-ES', { maximumFractionDigits: v.volumeKm3 < 1 ? 2 : 0 })} km³`]);
      kv.push(['Columna eruptiva', fmtDist(v.columnM)]);
      kv.push(['Energía térmica', fmtEnergy(fx.energyKt)]);
      kv.push(['Flujos piroclásticos', `${fmtDist(v.pdcR)} · ${fmtArea(v.pdcR)}`]);
      for (const z of zones) kv.push([z.label, `${fmtNum(z.areaKm2)} km²`]);
      kv.push(['Enfriamiento global', `${n1(v.coolingC, 1)} °C`]);
      kv.push(['Población expuesta', fmtNum(fx.casualties.exposed)]);
    }
    kv.push(['Datos de población', fx.popSource ?? 'modelo urbano aproximado']);
    body.append(h('div', { class: 'kv' }, ...kv.flatMap(([k, v]) => [h('span', {}, k), h('span', {}, v)])));
    if (fx.notes.length) body.append(h('ul', { class: 'notes' }, ...fx.notes.map((t) => h('li', {}, t))));
    body.append(h('div', { class: 'disclaimer' }, fx.release
      ? 'Estimaciones orientativas con fines educativos. Pluma gaussiana con coeficientes de Briggs (atmósfera neutra) y depósito seco; dosis externa del primer año con ocupación del 30 % y riesgo lineal sin umbral (5 % por Sv, CIPR). Las cifras de cánceres son estadísticas y muy inciertas a dosis bajas.'
      : 'Estimaciones orientativas con fines educativos. Espesor de ceniza con la ley exponencial de Pyle (1989) alargada por el viento; alcance de los flujos piroclásticos y enfriamiento según erupciones históricas. Población según un modelo de densidad aproximado.'));
  }

  private effects(body: HTMLElement, fx: Effects) {
    // de dentro hacia fuera: del efecto más severo (bola de fuego) al más leve
    const sorted = [...fx.rings].sort((a, b) => (a.global ? 1 : 0) - (b.global ? 1 : 0) || a.radiusM - b.radiusM);
    for (const r of sorted) {
      const row = h('div', { class: 'eff' + (this.hidden.has(r.id) ? ' off' : ''), title: 'Clic: mostrar/ocultar · Doble clic: centrar' },
        h('span', { class: 'dot', style: { color: r.color } }),
        h('span', { class: 'name' }, r.label),
        h('span', { class: 'r' }, r.global ? 'Global' : fmtDist(r.radiusM)),
        h('div', { class: 'meta' }, `${r.desc} `, h('i', {}, [GROUP_NAMES[r.group], r.value, r.global ? 'todo el planeta' : fmtArea(r.radiusM)].filter(Boolean).join(' · '))),
      );
      row.addEventListener('mouseenter', () => this.ev.onHover(r.id));
      row.addEventListener('mouseleave', () => this.ev.onHover(null));
      row.addEventListener('click', () => {
        const vis = this.hidden.has(r.id);
        if (vis) this.hidden.delete(r.id); else this.hidden.add(r.id);
        row.classList.toggle('off', !vis);
        this.ev.onToggle(r.id, vis);
      });
      row.addEventListener('dblclick', () => this.ev.onFocus(r.id));
      body.append(row);
    }
    if (fx.fallout.length) {
      body.append(h('div', { class: 'res-h3' }, fx.release ? 'Contaminación del suelo' : fx.volcano ? 'Caída de ceniza' : 'Lluvia radiactiva · tasa de dosis a H+1'));
      for (const f of [...fx.fallout].sort((a, b) => b.level - a.level)) {
        const desc = fx.release || fx.volcano ? f.label : f.level >= 1000 ? 'Dosis letal en pocas horas a la intemperie.' : f.level >= 100 ? 'Dosis letal en un día sin refugio.' : f.level >= 10 ? 'Enfermedad por radiación sin refugio adecuado.' : 'Riesgo sanitario: evacuar o refugiarse varios días.';
        body.append(this.toggleRow(`fo:${f.level}`, f.color, f.label, `${fmtNum(f.maxDownwindKm)} km`, h('div', { class: 'meta' }, `${desc} `, h('i', {}, `${fmtNum(f.areaKm2)} km² · alcance a sotavento`))));
      }
    }
    const extra: HTMLElement[] = [];
    if (fx.tsunami || fx.rings.some((r) => r.group === 'tsunami')) {
      extra.push(this.toggleRow('tsu-iso', '#7dd3fc', 'Llegada del tsunami (isócronas)', 'cada 1–2 h', h('div', { class: 'meta' }, 'Líneas azules: hasta dónde ha llegado la ola en cada hora, calculado sobre el fondo marino real. Aparecen cuando termina el cálculo.')));
      extra.push(this.toggleRow('tsu-coast', '#facc15', 'Altura de la ola en la costa', '', h('div', { class: 'meta' }, 'Cada punto es un tramo de costa; su color indica la altura de la ola al llegar. Pasa el ratón por encima para ver la altura y la hora de llegada. ',
        h('span', { class: 'tsu-legend' }, ...([['#7dd3fc', '< 1 m'], ['#38bdf8', '1–3 m'], ['#facc15', '3–10 m'], ['#fb923c', '10–30 m'], ['#ef4444', '> 30 m']] as const).map(([c, t]) => h('span', {}, h('b', { style: { background: c } }), t))))));
    }
    if (fx.fires && fx.fires.kind !== 'none') extra.push(this.toggleRow('burn', '#ff6a1a', fx.fires.kind === 'firestorm' ? 'Tormenta de fuego' : 'Incendios que avanzan con el viento', '', h('div', { class: 'meta' }, 'Superficie quemada en las horas siguientes a la explosión.')));
    if (fx.emp && fx.emp.peakKVm >= 6) extra.push(this.toggleRow('emp', '#4cc9f0', 'Campo del pulso electromagnético', '', h('div', { class: 'meta' }, 'Zonas con más de 6, 12,5 y 25 kV/m (pulso E1 de gran altitud).')));
    if (extra.length) body.append(h('div', { class: 'res-h3' }, 'Otras capas del mapa'), ...extra);
  }

  /** fila de la pestaña Efectos que se puede activar y desactivar en el mapa */
  private toggleRow(id: string, color: string, name: string, right: string, meta: HTMLElement) {
    const row = h('div', { class: 'eff' + (this.hidden.has(id) ? ' off' : ''), title: 'Clic: mostrar/ocultar en el mapa' },
      h('span', { class: 'dot', style: { color } }), h('span', { class: 'name' }, name), h('span', { class: 'r' }, right), meta);
    row.addEventListener('click', () => {
      const vis = this.hidden.has(id);
      if (vis) this.hidden.delete(id); else this.hidden.add(id);
      row.classList.toggle('off', !vis);
      this.ev.onToggle(id, vis);
    });
    return row;
  }

  private sections(body: HTMLElement, secs: StatSection[]) {
    for (const s of secs) {
      body.append(h('div', { class: 'res-h3' }, s.title));
      const g = h('div', { class: 'kv' });
      for (const r of s.rows) {
        g.append(
          h('span', { class: r.hint ? 'k has-hint' : 'k' }, r.k, r.hint ? h('small', {}, r.hint) : null),
          h('span', { class: r.strong ? 'strong' : '' }, r.v),
        );
      }
      body.append(g);
      if (s.note) body.append(h('div', { class: 'sec-note' }, s.note));
    }
  }

  private makeDraggable() {
    let sx = 0, sy = 0, ox = 0, oy = 0, drag = false;
    this.el.addEventListener('pointerdown', (e) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.res-head') || t.closest('button')) return;
      drag = true; sx = e.clientX; sy = e.clientY;
      const r = this.el.getBoundingClientRect(); ox = r.left; oy = r.top;
      this.el.setPointerCapture(e.pointerId);
    });
    this.el.addEventListener('pointermove', (e) => {
      if (!drag) return;
      this.el.style.left = `${ox + e.clientX - sx}px`;
      this.el.style.top = `${oy + e.clientY - sy}px`;
      this.el.style.right = 'auto';
    });
    this.el.addEventListener('pointerup', () => (drag = false));
  }
}

/** cifra completa con separador de miles (hasta 999 millones); por encima, abreviada */
function fmtFull(v: number) {
  return v >= 1e9 ? fmtNum(v) : Math.round(v).toLocaleString('es-ES');
}
