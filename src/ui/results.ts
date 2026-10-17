import { h, ICONS, fmtNum, setRangeFill } from './dom';
import { fmtDist, fmtArea, fmtEnergy } from '../physics/effects';
import { buildStats, type StatSection } from './stats';
import type { Effects } from '../physics/types';
import { INFRA, type InfraResult, type BuildingCounts } from '../data/osm';
import type { TerrainShadow } from '../physics/terrain';
import { LOCALE, DEC } from '../i18n/locale';
import { tr } from '../i18n';

const n1 = (x: number, d = 1) => x.toLocaleString(LOCALE, { maximumFractionDigits: d });
const dur = (s: number) => { if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min`; if (s < 86400 * 2) { const hh = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return m ? `${hh} h ${m} min` : `${hh} h`; } return `${n1(s / 86400, s < 86400 * 10 ? 1 : 0)} días`; };

export interface ResultsEvents {
  onToggle(id: string, visible: boolean): void;
  onHover(id: string | null): void;
  onShare(): void;
  onFocus(id: string): void;
  /** abrir la ficha de la enciclopedia del escenario */
  onBook(name: string): void;
  /** comparar con otro escenario en el mapa partido */
  onCompare?(): void;
  onHeat?(k: 'off' | 'pop' | 'deaths' | 'fallout'): void;
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

  /** mapa de calor activo (para marcar el botón) */
  private heat: 'off' | 'pop' | 'deaths' | 'fallout' = 'off';
  setHeat(k: 'off' | 'pop' | 'deaths' | 'fallout') { this.heat = k; if (this.tab === 'pop' || this.tab === 'eff') this.reshow?.(); }
  private heatBlock(body: HTMLElement, fx: Effects) {
    if (!this.ev.onHeat) return;
    const nuc = !fx.release && !fx.volcano && !fx.dam && !fx.solar && !fx.war;
    const opts: ['pop' | 'deaths' | 'fallout', string][] = [['pop', 'Población']];
    if (nuc) opts.push(['deaths', 'Víctimas']);
    if (nuc && fx.fallout.length && fx.falloutDoseAt) opts.push(['fallout', 'Lluvia radiactiva']);
    const row = h('div', { class: 'seg heat-row' });
    for (const [k, l] of opts) row.append(h('button', { type: 'button', class: this.heat === k ? 'on' : '', onclick: () => this.ev.onHeat!(this.heat === k ? 'off' : k) }, l));
    body.append(h('div', { class: 'heat-blk' }, h('div', { class: 'heat-h' }, 'Mapa de calor'), row));
  }

  /** infraestructuras de OpenStreetMap por zona (llegan después, de forma asíncrona) */
  private infra: InfraResult | 'loading' | 'error' | null = null;
  private reshow: (() => void) | null = null;
  private bld: BuildingCounts | 'loading' | 'error' | null = null;
  setBuildings(r: BuildingCounts | 'loading' | 'error' | null) {
    this.bld = r;
    if (this.tab === 'pop') this.reshow?.();
  }
  private shadow: TerrainShadow | 'loading' | null = null;
  setShadow(s: TerrainShadow | 'loading' | null) { this.shadow = s; if (this.tab === 'phys' || this.tab === 'eff') this.reshow?.(); }
  private shadowBlock(body: HTMLElement) {
    const s = this.shadow;
    if (!s) return;
    body.append(h('div', { class: 'res-h3' }, 'Sombra del relieve'));
    if (s === 'loading') { body.append(h('div', { class: 'sec-note' }, 'Calculando las líneas de visión con el modelo del terreno…')); return; }
    if (!s.areaKm2) { body.append(h('div', { class: 'sec-note' }, `El terreno es lo bastante llano (relieve máximo de ${fmtDist(Math.max(0, s.reliefM))} sobre la zona cero) para que la bola de fuego se vea desde todas partes en ${fmtDist(s.radiusM)} a la redonda.`)); return; }
    body.append(h('div', { class: 'bld' },
      h('div', { class: 'bld-r' }, h('div', {}, h('b', {}, 'Zona protegida del destello'), h('span', {}, 'colinas y montañas tapan la bola de fuego')), h('strong', {}, fmtArea(s.areaKm2 * 1e6))),
      h('div', { class: 'bld-r' }, h('div', {}, h('b', {}, 'Del área con quemaduras'), h('span', {}, `hasta ${fmtDist(s.radiusM)}`)), h('strong', {}, `${Math.round(s.frac * 100)} %`))),
      h('div', { class: 'sec-note' }, 'En las zonas sombreadas del mapa el calor no llega directamente (sólo la luz dispersada por el aire, mucho más débil) y la onda expansiva se debilita un poco al rodear el obstáculo. En Nagasaki, las colinas del valle del Urakami protegieron así a buena parte de la ciudad.'));
  }
  private vb: { destroyed: number; severe: number; moderate: number; light: number; intact: number; total: number } | null = null;
  setViewBuildings(v: { destroyed: number; severe: number; moderate: number; light: number; intact: number; total: number } | null) {
    const same = JSON.stringify(v) === JSON.stringify(this.vb);
    this.vb = v;
    if (!same && this.tab === 'pop') this.reshow?.();
  }
  private buildingsBlock(body: HTMLElement) {
    const v = this.vb;
    if (v) {
      body.append(h('div', { class: 'res-h3' }, 'Edificios en la vista actual, uno a uno'));
      const tbl = h('div', { class: 'bld' });
      const rows: [string, string, number][] = [['Destruidos', '≥ 20 psi', v.destroyed], ['Muy dañados', '5–20 psi', v.severe], ['Dañados', '2–5 psi', v.moderate], ['Daños leves', '1–2 psi', v.light], ['Sin daños graves', '< 1 psi', v.intact]];
      for (const [k, hint, n] of rows) if (n > 0) tbl.append(h('div', { class: 'bld-r' }, h('div', {}, h('b', {}, k), h('span', {}, hint)), h('strong', {}, fmtNum(n))));
      body.append(tbl, h('div', { class: 'sec-note' }, `${fmtNum(v.total)} edificios del mapa que se ven ahora (acércate o muévete para contar otras zonas). Cada uno se clasifica por la sobrepresión en su centro.`));
    }
    const r = this.bld;
    if (!r) return;
    body.append(h('div', { class: 'res-h3' }, 'Edificios dañados (OpenStreetMap)'));
    if (r === 'loading') { body.append(h('div', { class: 'sec-note' }, 'Contando edificios en OpenStreetMap…')); return; }
    if (r === 'error') { body.append(h('div', { class: 'sec-note' }, 'No se pudo contar los edificios (servidor Overpass ocupado o sin conexión).')); return; }
    const get = (id: string) => r.zones.find((z) => z.id === id);
    const z20 = get('psi20'), z5 = get('psi5'), z1 = get('psi1');
    const rows: [string, string, number | null, boolean][] = [];
    if (z20) rows.push(['Destruidos', '≥ 20 psi: se derrumban incluso los de hormigón armado', z20.count, z20.radiusM > r.maxR]);
    if (z5) rows.push(['Destruidos o muy dañados', '5–20 psi: casas derrumbadas, estructuras de acero deformadas', z5.count - (z20?.count ?? 0), z5.radiusM > r.maxR]);
    if (z1) rows.push(['Con daños', '1–5 psi: cristales, puertas, tabiques y tejados', z1.count - (z5?.count ?? 0), z1.radiusM > r.maxR]);
    const tbl = h('div', { class: 'bld' });
    for (const [k, hint, n, cap] of rows) tbl.append(h('div', { class: 'bld-r' }, h('div', {}, h('b', {}, k), h('span', {}, hint)), h('strong', {}, n == null ? '—' : `${cap ? '≥ ' : ''}${fmtNum(Math.max(0, n))}`)));
    const tot = z1?.count ?? z5?.count ?? z20?.count ?? 0;
    body.append(tbl, h('div', { class: 'sec-note' }, `En total, ${fmtNum(tot)} edificios cartografiados dentro del radio de 1 psi. En el mapa, cada edificio se colorea y se hunde según la sobrepresión que le llega. OpenStreetMap no recoge todos los edificios en algunas zonas.${r.capped ? ` Recuento limitado a ${fmtDist(r.maxR)} de la zona cero.` : ''}`));
  }
  setInfra(r: InfraResult | 'loading' | 'error' | null) {
    this.infra = r;
    if (this.tab === 'pop') this.reshow?.();
  }
  private infraBlock(body: HTMLElement) {
    this.buildingsBlock(body);
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
    const kicker = sc.kind === 'war' ? 'Guerra nuclear e invierno nuclear' : sc.kind === 'dam' ? 'Rotura de presa' : sc.kind === 'solar' ? 'Tormenta geomagnética' : sc.kind === 'release' ? (sc.source === 'dirtybomb' ? 'Bomba sucia' : 'Accidente nuclear') : sc.kind === 'volcano' ? 'Erupción volcánica' : sc.kind === 'nuclear'
      ? fx.chemical ? 'Explosión convencional' : 'Detonación nuclear'
      : fx.asteroid?.fate === 'airburst' ? 'Explosión aérea de asteroide' : 'Impacto de asteroide';
    const burst = sc.kind === 'war' ? `${fx.war?.sides.map((x) => tr(x)).join(' · ')}` : sc.kind === 'dam' ? `${Math.round(sc.heightM)} m · ${sc.volumeHm3.toLocaleString(LOCALE)} hm³` : sc.kind === 'solar' ? `Dst ${Math.round(sc.dstNt)} nT` : sc.kind === 'release' ? `${fx.release?.isoName ?? ''}` : sc.kind === 'volcano' ? `VEI ${sc.vei}` : fx.buried ? `${fx.buried.mode === 'underground' ? 'bajo tierra' : 'bajo el agua'} a ${fmtDist(fx.buried.depthM)}` : fx.burstHeightM > 0 ? `a ${fmtDist(fx.burstHeightM)} de altura` : sc.kind === 'asteroid' && sc.target === 'water' ? `en el océano (${fmtDist(sc.waterDepthM)} de prof.)` : 'en superficie';
    const burstTr = tr(burst);
    const minBtn = h('button', { class: 'icon-btn', title: 'Minimizar', html: ICONS.min, onclick: () => { el.classList.toggle('min'); minBtn.innerHTML = el.classList.contains('min') ? ICONS.max : ICONS.min; } });
    const hiroTxt = hiro >= 1 ? `×${fmtNum(hiro)} Hiroshima` : `${(hiro * 100).toFixed(hiro < 0.01 ? 2 : 1).replace('.', DEC)} % de Hiroshima`;
    const head = h('div', { class: 'res-head' },
      h('div', { class: 'ttl' },
        h('div', { class: 'kicker' }, kicker),
        h('h2', {}, sc.name || fmtEnergy(fx.energyKt)),
        h('div', { class: 'sub' }, `${fx.energyKt > 0 && sc.kind !== 'release' && sc.kind !== 'volcano' ? fmtEnergy(fx.energyKt) + ' ' : ''}${burstTr}${sc.kind === 'solar' || sc.kind === 'war' ? tr(' · todo el planeta') : ` · ${place}`}`),
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
      h('div', { class: 'cnt red' }, dEl, h('div', { class: 'l' }, fx.war ? 'Muertes por las explosiones' : fx.solar ? 'En zona de riesgo alto' : fx.release ? 'Muertes estimadas' : 'Fallecidos')),
      h('div', { class: 'cnt amber' }, iEl, h('div', { class: 'l' }, fx.war ? 'Muertes por hambre (2 años)' : fx.solar ? 'Coste (billones de $)' : fx.dam ? 'En la zona inundada' : fx.release ? 'En zona de evacuación' : 'Heridos')),
    );
    if (fx.war) { dEl.classList.add('long'); iEl.classList.add('long'); this.countUp([[dEl, fx.war.directDeathsM * 1e6], [iEl, fx.war.famineDeathsM * 1e6]]); }
    else if (fx.solar) { this.countUp([[dEl, fx.solar.popHighRisk]]); iEl.textContent = `${n1(fx.solar.costUSDtn[0], 1)}–${n1(fx.solar.costUSDtn[1], 1)}`; }
    else if (fx.dam) this.countUp([[dEl, c.deaths], [iEl, fx.dam.popFlooded]]);
    else if (fx.release) this.countUp([[dEl, c.deaths + fx.release.cancerDeaths], [iEl, fx.release.popZone]]);
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
      else {
        if (t === 'cmp' && this.ev.onCompare && (sc.kind === 'nuclear' || sc.kind === 'asteroid')) body.append(h('button', { type: 'button', class: 'btn-line cmp-split', onclick: () => this.ev.onCompare!() }, 'Comparar con otro escenario en el mapa partido'));
        if (t === 'pop') this.heatBlock(body, fx);
        this.sections(body, stats.filter((s) => s.tab === t)); if (t === 'pop') this.infraBlock(body); if (t === 'phys') this.shadowBlock(body); if (t === 'rad' && fx.fallout.length && fx.falloutDoseAt && !fx.release) this.shelter(body, fx); }
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
        ['Masa del objeto', `${(M / 1e9).toLocaleString(LOCALE, { maximumFractionDigits: M > 1e12 ? 0 : 2 })} millones de t`],
        ['Cambio de velocidad', dv >= 0.01 ? `${n1(dv * 100, 2)} cm/s` : `${(dv * 1000).toLocaleString(LOCALE, { maximumFractionDigits: 3 })} mm/s`, `${N} ${N > 1 ? 'impactadores' : 'impactador'} de 580 kg a 6,1 km/s, β ≈ 3,6`],
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
      for (const [el, v] of items) el.textContent = Math.round(v * e).toLocaleString(LOCALE);
      if (k < 1) this.anim = requestAnimationFrame(step);
      else for (const [el, v] of items) { el.textContent = fmtFull(v); el.title = Math.round(v).toLocaleString(LOCALE); }
    };
    this.anim = requestAnimationFrame(step);
  }

  private summary(body: HTMLElement, fx: Effects, hiroTxt: string) {
    if (fx.release || fx.volcano || fx.dam || fx.solar || fx.war) return this.summaryOther(body, fx);
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
    if (fx.seismic) kv.push(['Magnitud sísmica', fx.seismic.magnitude.toFixed(1).replace('.', DEC)]);
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

  /** gráfico del invierno nuclear: anomalía de temperatura y de lluvia durante 15 años */
  private winterChart(S: { t: number; dT: number; dP: number }[]) {
    const W = 340, H = 150, pl = 34, pr = 34, pt = 12, pb = 24;
    const tMax = S[S.length - 1].t, dTmin = Math.min(-1, ...S.map((s) => s.dT)), dPmin = Math.min(-5, ...S.map((s) => s.dP));
    const x = (t: number) => pl + (t / tMax) * (W - pl - pr);
    const yT = (v: number) => pt + (v / dTmin) * (H - pt - pb), yP = (v: number) => pt + (v / dPmin) * (H - pt - pb);
    const path = (f: (s: { t: number; dT: number; dP: number }) => number) => S.map((s, i) => `${i ? 'L' : 'M'}${x(s.t).toFixed(1)},${f(s).toFixed(1)}`).join('');
    const ticks = [0, 5, 10, 15].filter((v) => v <= tMax).map((v) => `<text x="${x(v)}" y="${H - 6}" text-anchor="middle">${v}</text><line x1="${x(v)}" x2="${x(v)}" y1="${pt}" y2="${H - pb}" class="g"/>`).join('');
    const svg = `<svg viewBox="0 0 ${W} ${H}" class="winter"><line x1="${pl}" x2="${W - pr}" y1="${pt}" y2="${pt}" class="g"/>${ticks}
      ${Array.from({ length: Math.floor(tMax) }, (_, k) => { const yr = S.filter((s) => s.t >= k && s.t < k + 1); const m = yr.reduce((a, s) => a + s.dP, 0) / Math.max(1, yr.length); const bw = (W - pl - pr) / tMax; return `<rect x="${(x(k) + bw * 0.18).toFixed(1)}" y="${pt}" width="${(bw * 0.64).toFixed(1)}" height="${Math.max(0, yP(m) - pt).toFixed(1)}" class="pb"/>`; }).join('')}
      <path d="${path((s) => yT(s.dT))}" class="t"/>
      <text x="${pl - 4}" y="${pt + 4}" text-anchor="end">0</text><text x="${pl - 4}" y="${H - pb}" text-anchor="end" class="t">${dTmin.toFixed(0)} °C</text>
      <text x="${W - pr + 4}" y="${H - pb}" class="p">${dPmin.toFixed(0)} %</text><text x="${W / 2}" y="${H - 6 + 0}" text-anchor="middle" dy="0" class="ax"> </text></svg>`;
    return h('div', { class: 'winter-wrap' }, h('div', { class: 'res-h3' }, 'Invierno nuclear: los años siguientes'), h('div', { html: svg }),
      h('div', { class: 'winter-leg' }, h('span', { class: 't' }, 'Temperatura media mundial'), h('span', { class: 'p' }, 'Lluvias'), h('span', {}, 'años después de la guerra')));
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
    } else if (fx.dam) {
      const d = fx.dam;
      kv.push(['Altura de la presa', `${Math.round(d.heightM)} m`]);
      kv.push(['Agua embalsada', `${d.volumeHm3.toLocaleString(LOCALE)} hm³`]);
      kv.push(['Caudal punta de la brecha', `${fmtNum(d.peakM3s)} m³/s`]);
      if (d.demOk) {
        kv.push(['Zona inundada', `${fmtNum(d.floodKm2)} km²`]);
        kv.push(['Alcance de la ola', `${fmtNum(d.reachKm)} km`]);
        for (const z of zones) kv.push([z.label, `${fmtNum(z.areaKm2)} km²`]);
        kv.push(['Población en la zona inundada', fmtNum(d.popFlooded)]);
        kv.push(['Víctimas estimadas', `≈ ${fmtNum(fx.casualties.deaths)}`]);
      } else kv.push(['Zona inundada', 'sin datos del relieve']);
    } else if (fx.war) {
      const w = fx.war;
      kv.push(['Ojivas', `${fmtNum(w.warheads)} × ${fmtNum(w.yieldKt)} kt`]);
      kv.push(['Energía total', fmtEnergy(w.warheads * w.yieldKt)]);
      kv.push(['Hollín en la estratosfera', `${fmtNum(w.sootTg)} millones de t`]);
      kv.push(['Enfriamiento global máximo', `−${n1(w.coolingC, 1)} °C`]);
      kv.push(['Lluvias', `−${w.precipPct} %`]);
      kv.push(['Calorías disponibles en el mundo', `−${w.caloriesPct} % a los 3–5 años`]);
      kv.push(['Muertes directas', `${fmtNum(w.directDeathsM)} millones`]);
      kv.push(['Muertes por hambre', `${fmtNum(w.famineDeathsM)} millones`]);
    } else if (fx.solar) {
      const s = fx.solar;
      kv.push(['Índice Dst', `${Math.round(s.dstNt)} nT`]);
      kv.push(['Auroras visibles hasta', `${Math.round(s.auroraMlat)}° de latitud geomagnética`]);
      for (const b of s.bands) kv.push([b.label, b.risk]);
      kv.push(['Población urbana en riesgo alto', fmtNum(s.popHighRisk)]);
      kv.push(['Coste mundial estimado', `${n1(s.costUSDtn[0], 1)}–${n1(s.costUSDtn[1], 1)} billones de dólares`]);
    } else if (fx.volcano) {
      const v = fx.volcano;
      kv.push(['Índice de explosividad (VEI)', String(v.vei)]);
      kv.push(['Volumen expulsado', `${v.volumeKm3.toLocaleString(LOCALE, { maximumFractionDigits: v.volumeKm3 < 1 ? 2 : 0 })} km³`]);
      kv.push(['Columna eruptiva', fmtDist(v.columnM)]);
      kv.push(['Energía térmica', fmtEnergy(fx.energyKt)]);
      kv.push(['Flujos piroclásticos', `${fmtDist(v.pdcR)} · ${fmtArea(v.pdcR)}`]);
      for (const z of zones) kv.push([z.label, `${fmtNum(z.areaKm2)} km²`]);
      kv.push(['Enfriamiento global', `${n1(v.coolingC, 1)} °C`]);
      kv.push(['Población expuesta', fmtNum(fx.casualties.exposed)]);
    }
    kv.push(['Datos de población', fx.popSource ?? 'modelo urbano aproximado']);
    body.append(h('div', { class: 'kv' }, ...kv.flatMap(([k, v]) => [h('span', {}, k), h('span', {}, v)])));
    if (fx.war) body.append(this.winterChart(fx.war.series));
    if (fx.notes.length) body.append(h('ul', { class: 'notes' }, ...fx.notes.map((t) => h('li', {}, t))));
    body.append(h('div', { class: 'disclaimer' }, fx.war
      ? 'Estimaciones de los estudios científicos de referencia (Xia et al. 2022, Nature Food; Toon et al. 2019, Science Advances; Coupe et al. 2019), con modelos climáticos acoplados. Las curvas del gráfico son una aproximación a sus resultados. Las cifras dependen mucho de cuánto ardan las ciudades.'
      : fx.dam
      ? 'Estimaciones orientativas con fines educativos. Caudal punta según las fórmulas empíricas de roturas históricas (Froehlich); la ola se propaga por el relieve real y se atenúa con la distancia; mortalidad según la profundidad y el tiempo de aviso (Jonkman, 2007). No sustituye a un estudio hidráulico.'
      : fx.solar ? 'Estimaciones orientativas con fines educativos. Latitud geomagnética con un dipolo centrado (IGRF); borde de las auroras según tormentas históricas; coste a partir del informe de Lloyd\'s (2013) sobre una tormenta como la de 1859, extrapolado a todo el mundo.'
      : fx.release
      ? 'Estimaciones orientativas con fines educativos. Pluma gaussiana con coeficientes de Briggs (atmósfera neutra) y depósito seco; dosis externa del primer año con ocupación del 30 % y riesgo lineal sin umbral (5 % por Sv, CIPR). Las cifras de cánceres son estadísticas y muy inciertas a dosis bajas.'
      : 'Estimaciones orientativas con fines educativos. Espesor de ceniza con la ley exponencial de Pyle (1989) alargada por el viento; alcance de los flujos piroclásticos y enfriamiento según erupciones históricas. Población según un modelo de densidad aproximado.'));
  }

  private effects(body: HTMLElement, fx: Effects) {
    if (fx.solar) return this.solarEffects(body, fx);
    if (fx.war) return this.warEffects(body, fx);
    // de dentro hacia fuera: del efecto más severo (bola de fuego) al más leve
    const sorted = [...fx.rings].sort((a, b) => (a.global ? 1 : 0) - (b.global ? 1 : 0) || a.radiusM - b.radiusM);
    for (const r of sorted) {
      const row = h('div', { class: 'eff' + (this.hidden.has(r.id) ? ' off' : ''), title: 'Clic: mostrar/ocultar · Doble clic: centrar' },
        h('span', { class: 'dot', style: { color: r.color } }),
        h('span', { class: 'name' }, r.label),
        h('span', { class: 'r' }, r.global ? 'Global' : fmtDist(r.radiusM)),
        h('div', { class: 'meta' }, `${r.desc} `, h('i', {}, [GROUP_NAMES[r.group], r.value, r.global ? 'todo el planeta' : fmtArea(r.radiusM)].filter(Boolean).map((x) => tr(String(x))).join(' · '))),
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
    // marcas que deja la explosión en el suelo (las manchas oscuras concéntricas)
    const marks = this.groundMarks(fx);
    if (marks.length) extra.push(this.toggleRow('scorch', '#3a2414', 'Suelo quemado y marcas del terreno', '', h('div', { class: 'meta' },
      'Manchas concéntricas que quedan en el suelo tras la explosión. ', h('span', { class: 'marks' }, ...marks.map(([c, t]) => h('span', {}, h('b', { style: { background: c } }), t))))));
    if (fx.blackRain) extra.push(this.toggleRow('blackrain', '#2b2b33', 'Lluvia negra', `${fmtNum(Math.round(fx.blackRain.heavyKm2 + fx.blackRain.lightKm2))} km²`, h('div', { class: 'meta' },
      `Los dos óvalos grises a sotavento: unos ${fx.blackRain.startMin} minutos después, el humo del incendio forma nubes de tormenta que descargan una lluvia de hollín y polvo radiactivo, como en Hiroshima. El óvalo oscuro es la lluvia intensa (${fmtNum(Math.round(fx.blackRain.heavyKm2))} km²); el claro, la débil (${fmtNum(Math.round(fx.blackRain.lightKm2))} km²). Aparece a su hora en la línea de tiempo.`)));
    const sh = this.shadow;
    if (sh && sh !== 'loading' && sh.areaKm2 > 0) extra.push(this.toggleRow('shadow', '#1e3a5f', 'Sombra del relieve', fmtArea(sh.areaKm2 * 1e6), h('div', { class: 'meta' },
      'Zonas azuladas con borde discontinuo: colinas y montañas tapan la bola de fuego y el destello de calor no llega directamente.')));
    if (extra.length) body.append(h('div', { class: 'res-h3' }, 'Otras capas del mapa'), ...extra);
    // los mismos mapas de calor que en «Mapas y capas»
    this.heatBlock(body, fx);
  }

  /** tormenta solar: lo que va apareciendo en el mapa, en orden, y cuándo */
  private solarEffects(body: HTMLElement, fx: Effects) {
    const S = fx.solar!;
    const hh = (x: number) => (x < 48 ? `${Math.round(x)} h` : `${n1(x / 24, 1)} días`);
    body.append(h('div', { class: 'sec-note' }, 'El mapa sigue la tormenta en el tiempo: dale al play o mueve la línea de tiempo para ver cada fase. Cada capa se puede ocultar con un clic.'));
    body.append(
      this.toggleRow('sol-radio', '#60a5fa', 'Apagón de radio en la cara de día', 'a los 8 min', h('div', { class: 'meta' }, 'Los rayos X de la fulguración llegan a la velocidad de la luz y alteran la ionosfera en la mitad de la Tierra donde es de día: la radio de onda corta (aviones, barcos, radioaficionados) se corta durante una o dos horas.')),
      this.toggleRow('sol-proton', '#a78bfa', 'Protones por los polos', '30 min – 2 días', h('div', { class: 'meta' }, 'Partículas muy rápidas que el campo magnético canaliza hacia los polos: dañan satélites, obligan a desviar los vuelos que cruzan el Ártico y apagan la radio en los casquetes polares.')),
      this.toggleRow('sol-zones', '#ef4444', 'Zonas de riesgo para la red eléctrica', `máximo a las ${hh(S.peakH)}`, h('div', { class: 'meta' }, `Cuando llega la eyección de masa coronal (a las ${hh(S.arrivalH)}), el campo magnético terrestre se sacude e induce corrientes en el suelo y en las líneas eléctricas largas. Las bandas bajan hacia el ecuador al crecer la tormenta y vuelven a subir al calmarse.`,
        h('span', { class: 'marks' }, ...([['#ef4444', 'Bajo el óvalo auroral: transformadores en peligro'], ['#f97316', 'Borde de las auroras: riesgo alto'], ['#facc15', 'Latitudes medias: fallos puntuales']] as const).map(([c, t]) => h('span', {}, h('b', { style: { background: c } }), t))))),
      this.toggleRow('sol-aurora', '#4ade80', 'Hasta dónde se ven las auroras', `${Math.round(S.auroraMlat)}° geomagn.`, h('div', { class: 'meta' }, 'Línea verde: el borde del óvalo auroral. Al norte (y al sur, en el otro hemisferio) de ella se verían auroras de noche. La latitud geomagnética se mide desde el polo magnético, por eso la línea está inclinada respecto a los paralelos.')),
    );
    body.append(h('div', { class: 'sec-note' }, 'No hay daño directo a las personas en tierra: el peligro está en los apagones largos y en lo que dependen de la electricidad (agua, hospitales, comunicaciones, pagos).'));
  }

  /** guerra nuclear: qué se ve en el mapa y cuándo */
  private warEffects(body: HTMLElement, fx: Effects) {
    const W = fx.war!;
    const A = W.first, B = 1 - A;
    body.append(h('div', { class: 'sec-note' }, 'El mapa cuenta la guerra en el tiempo: dale al play o mueve la línea de tiempo. Cada capa se puede ocultar con un clic.'));
    body.append(
      this.toggleRow('war-arcs', '#ff6a3d', 'Misiles en vuelo', 'primeros 40 min', h('div', { class: 'meta' }, `Cada línea es un misil hacia uno de los objetivos representativos (en realidad irían muchos más). `,
        h('span', { class: 'marks' }, h('span', {}, h('b', { style: { background: '#ff6a3d' } }), tr(W.sides[0])), h('span', {}, h('b', { style: { background: '#38bdf8' } }), tr(W.sides[1]))),
        h('div', {}, `${tr(W.sides[A])} lanza primero; ${tr(W.sides[B])} detecta el ataque con sus satélites y radares y responde en unos minutos, antes de que lleguen las ojivas. Después vienen segundas oleadas desde submarinos y desde las bases que quedan. Un misil intercontinental tarda unos 30 minutos; uno de alcance medio, menos de 10.`))),
      this.toggleRow('war-zones', '#ef4444', 'Explosiones y zonas de daño', `${fmtNum(W.warheads)} × ${fmtNum(W.yieldKt)} kt`, h('div', { class: 'meta' }, 'Cada llegada es un destello que deja una brasa (la ciudad o la base en llamas) y las zonas de daño de una ojiva: ',
        h('span', { class: 'marks' }, ...([['#ef4444', 'Daño grave (5 psi)'], ['#f97316', 'Quemaduras de 3.er grado'], ['#facc15', 'Rotura de cristales (1 psi)']] as const).map(([c, t]) => h('span', {}, h('b', { style: { background: c } }), t))))),
      this.toggleRow('war-smoke', '#4a4038', 'Humo de los incendios y velo de hollín', `${fmtNum(W.sootTg)} millones de t`, h('div', { class: 'meta' }, 'De las ciudades en llamas sube humo durante horas; las tormentas de fuego lo elevan hasta la estratosfera, donde el viento lo extiende en una o dos semanas alrededor del planeta. Ese velo es el que tapa el sol y provoca el invierno nuclear de la pestaña Resumen.')),
    );
  }

  /** qué marcas del suelo dibuja el mapa en este escenario (color y nombre) */
  private groundMarks(fx: Effects): [string, string][] {
    const out: [string, string][] = [];
    const ring = (id: string) => fx.rings.find((r) => r.id === id)?.radiusM ?? 0;
    if (ring('burn3') > 0) {
      out.push(['#050302', 'Zona cero calcinada (bajo la bola de fuego)']);
      if (ring('psi5') > 0) out.push(['#120a06', 'Suelo arrasado (más de 5 psi)']);
      out.push(['#1a0f08', 'Suelo chamuscado (quemaduras de tercer grado)']);
    }
    if (ring('rad500') > 0 && fx.groundContact > 0 && !fx.chemical) out.push(['#7dff3a', 'Suelo activado por los neutrones']);
    if (fx.rings.some((r) => r.id === 'surge')) out.push(['#b4f0ff', 'Oleada de base radiactiva']);
    if (fx.rings.some((r) => r.group === 'ejecta')) out.push(['#4a3826', 'Manto de eyecta']);
    if (fx.crater) out.push(['#0a0806', 'Cráter']);
    return out;
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
  return v >= 1e9 ? fmtNum(v) : Math.round(v).toLocaleString(LOCALE);
}
