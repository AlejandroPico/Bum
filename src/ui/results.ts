import { h, ICONS, fmtNum } from './dom';
import { fmtDist, fmtArea, fmtEnergy } from '../physics/effects';
import { buildStats, type StatSection } from './stats';
import type { Effects } from '../physics/types';

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

type Tab = 'sum' | 'eff' | 'pop' | 'phys' | 'rad' | 'cmp';
const TABS: [Tab, string][] = [['sum', 'Resumen'], ['eff', 'Efectos'], ['pop', 'Población'], ['phys', 'Física'], ['rad', 'Radiación'], ['cmp', 'Comparar']];

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
    this.makeDraggable();
  }

  hide() { this.el.classList.add('hidden'); cancelAnimationFrame(this.anim); }

  render(fx: Effects, place: string) {
    const el = this.el;
    el.innerHTML = '';
    el.classList.remove('hidden');
    const sc = fx.scenario;
    const hiro = fx.energyKt / 15;
    const kicker = sc.kind === 'nuclear'
      ? fx.chemical ? 'Explosión convencional' : 'Detonación nuclear'
      : fx.asteroid?.fate === 'airburst' ? 'Explosión aérea de asteroide' : 'Impacto de asteroide';
    const burst = fx.burstHeightM > 0 ? `a ${fmtDist(fx.burstHeightM)} de altura` : sc.kind === 'asteroid' && sc.target === 'water' ? `en el océano (${fmtDist(sc.waterDepthM)} de prof.)` : 'en superficie';
    const minBtn = h('button', { class: 'icon-btn', title: 'Minimizar', html: ICONS.min, onclick: () => { el.classList.toggle('min'); minBtn.innerHTML = el.classList.contains('min') ? ICONS.max : ICONS.min; } });
    const hiroTxt = hiro >= 1 ? `×${fmtNum(hiro)} Hiroshima` : `${(hiro * 100).toFixed(hiro < 0.01 ? 2 : 1).replace('.', ',')} % de Hiroshima`;
    const head = h('div', { class: 'res-head' },
      h('div', { class: 'ttl' },
        h('div', { class: 'kicker' }, kicker),
        h('h2', {}, sc.name || fmtEnergy(fx.energyKt)),
        h('div', { class: 'sub' }, `${fmtEnergy(fx.energyKt)} ${burst} · ${place}`),
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
      h('div', { class: 'cnt red' }, dEl, h('div', { class: 'l' }, 'Fallecidos')),
      h('div', { class: 'cnt amber' }, iEl, h('div', { class: 'l' }, 'Heridos')),
    );
    this.countUp([[dEl, c.deaths], [iEl, c.injuries]]);

    const stats = buildStats(fx);
    const tabsBar = h('div', { class: 'res-tabs' });
    const body = h('div', { class: 'res-body' });
    const avail = TABS.filter(([t]) => t === 'sum' || t === 'eff' || stats.some((s) => s.tab === t));
    if (!avail.some(([t]) => t === this.tab)) this.tab = 'sum';
    const show = (t: Tab) => {
      this.tab = t;
      tabsBar.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
      body.innerHTML = '';
      body.scrollTop = 0;
      if (t === 'sum') this.summary(body, fx, hiroTxt);
      else if (t === 'eff') this.effects(body, fx);
      else this.sections(body, stats.filter((s) => s.tab === t));
    };
    for (const [t, l] of avail) tabsBar.append(h('button', { type: 'button', 'data-t': t, onclick: () => show(t) }, l));
    show(this.tab);

    el.append(head, counters, tabsBar, body);
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
    const ring = (id: string) => fx.rings.find((r) => r.id === id);
    const kv: [string, string][] = [];
    const affected = fx.casualties.profile;
    kv.push(['Energía', `${fmtEnergy(fx.energyKt)} · ${hiroTxt}`]);
    kv.push(['Bola de fuego', `${fmtDist(fx.fireball.radiusM)} de radio`]);
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
    body.append(h('div', { class: 'kv' }, ...kv.flatMap(([k, v]) => [h('span', {}, k), h('span', {}, v)])));
    if (fx.notes.length) body.append(h('ul', { class: 'notes' }, ...fx.notes.map((t) => h('li', {}, t))));
    body.append(h('div', { class: 'disclaimer' },
      'Estimaciones orientativas con fines educativos. Modelos: Glasstone & Dolan, ',
      h('i', {}, 'The Effects of Nuclear Weapons'), ' (1977); Collins, Melosh & Marcus (2005) para impactos; Wünnemann et al. (2010) para tsunamis; lluvia radiactiva con un modelo analítico tipo WSEG-10; víctimas inmediatas con un modelo de densidad urbana aproximado (no censal) y probabilidades tipo OTA (1979). No incluyen incendios posteriores, efectos climáticos ni víctimas a largo plazo.',
    ));
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
      body.append(h('div', { class: 'res-h3' }, 'Lluvia radiactiva · tasa de dosis a H+1'));
      for (const f of [...fx.fallout].sort((a, b) => b.level - a.level)) {
        const desc = f.level >= 1000 ? 'Dosis letal en pocas horas a la intemperie.' : f.level >= 100 ? 'Dosis letal en un día sin refugio.' : f.level >= 10 ? 'Enfermedad por radiación sin refugio adecuado.' : 'Riesgo sanitario: evacuar o refugiarse varios días.';
        body.append(h('div', { class: 'eff' },
          h('span', { class: 'dot', style: { color: f.color } }),
          h('span', { class: 'name' }, f.label),
          h('span', { class: 'r' }, `${fmtNum(f.maxDownwindKm)} km`),
          h('div', { class: 'meta' }, `${desc} `, h('i', {}, `${fmtNum(f.areaKm2)} km² · alcance a sotavento`)),
        ));
      }
    }
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
