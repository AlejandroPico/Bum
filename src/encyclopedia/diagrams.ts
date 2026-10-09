import type { DiagramId } from './types';

/*
 * Esquemas animados de la enciclopedia (SVG). Cada esquema tiene fases con su rótulo; la
 * animación es determinista en el tiempo, de modo que se puede pausar o saltar a una fase.
 * Nivel divulgativo: principios físicos, sin medidas ni parámetros de diseño.
 */

const NS = 'http://www.w3.org/2000/svg';
const W = 720, H = 405;
const C = {
  text: '#e9edf5', muted: '#8b93a7', faint: '#5b6378', line: 'rgba(255,255,255,0.14)',
  neutron: '#9fb4cc', proton: '#ff6b5e', electron: '#7dd3fc', gamma: '#ffb020', explosive: '#ff5a1f',
  uranium: '#8bd450', plutonium: '#c084fc', fusion: '#5eead4', steel: '#6f7a86', ground: '#3a332b',
};

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (k: number) => { k = clamp(k); return k * k * (3 - 2 * k); };
const seg = (k: number, a: number, b: number) => ease((k - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** pseudoaleatorio estable */
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

type Attrs = Record<string, string | number>;
class Kit {
  svg: SVGSVGElement;
  constructor(svg: SVGSVGElement) { this.svg = svg; }
  el<K extends keyof SVGElementTagNameMap>(tag: K, a: Attrs = {}, parent: SVGElement = this.svg): SVGElementTagNameMap[K] {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v));
    parent.append(e);
    return e;
  }
  g(a: Attrs = {}, p?: SVGElement) { return this.el('g', a, p); }
  circle(cx: number, cy: number, r: number, fill: string, a: Attrs = {}, p?: SVGElement) { return this.el('circle', { cx, cy, r, fill, ...a }, p); }
  line(x1: number, y1: number, x2: number, y2: number, stroke = C.line, a: Attrs = {}, p?: SVGElement) { return this.el('line', { x1, y1, x2, y2, stroke, 'stroke-width': 1.2, ...a }, p); }
  path(d: string, a: Attrs = {}, p?: SVGElement) { return this.el('path', { d, fill: 'none', stroke: C.text, 'stroke-width': 1.4, ...a }, p); }
  rect(x: number, y: number, w: number, h: number, fill: string, a: Attrs = {}, p?: SVGElement) { return this.el('rect', { x, y, width: w, height: h, fill, ...a }, p); }
  text(x: number, y: number, s: string, a: Attrs = {}, p?: SVGElement) { const t = this.el('text', { x, y, fill: C.muted, 'font-size': 12, 'font-family': 'Inter, sans-serif', ...a }, p); t.textContent = s; return t; }
  /** etiqueta con línea guía */
  label(x: number, y: number, tx: number, ty: number, s: string, color = C.muted, p?: SVGElement) {
    const g = this.g({}, p);
    this.line(x, y, tx, ty, 'rgba(255,255,255,0.3)', { 'stroke-width': 0.8 }, g);
    this.circle(x, y, 1.8, 'rgba(255,255,255,0.6)', {}, g);
    this.text(tx + (tx >= x ? 4 : -4), ty + 4, s, { fill: color, 'text-anchor': tx >= x ? 'start' : 'end' }, g);
    return g;
  }
  /** núcleo dibujado como racimo de nucleones */
  nucleus(cx: number, cy: number, n: number, r: number, frac: number, p?: SVGElement, seed = 1, pColor = C.proton, nColor = C.neutron) {
    const g = this.g({}, p);
    const rr = r / Math.sqrt(n) * 0.95;
    const order: number[] = [];
    for (let i = 0; i < n; i++) order.push(i);
    order.sort((a, b) => rnd(a * 7 + seed) - rnd(b * 7 + seed));
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996, d = Math.sqrt((i + 0.5) / n) * (r - rr);
      const isP = order[i] < n * frac;
      this.circle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr, isP ? pColor : nColor, { stroke: 'rgba(0,0,0,0.35)', 'stroke-width': 0.6 }, g);
    }
    return g;
  }
  set(e: SVGElement, a: Attrs) { for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v)); }
  op(e: SVGElement, v: number) { e.setAttribute('opacity', String(clamp(v))); }
  tr(e: SVGElement, x: number, y: number, s = 1, rot = 0) { e.setAttribute('transform', `translate(${x} ${y}) rotate(${rot}) scale(${s})`); }
}

interface Phase { cap: string; dur: number }
interface Def { phases: Phase[]; legend?: [string, string][]; build(k: Kit): (t: number, ph: number, pk: number) => void }

// ======================================================================== esquemas
const DEFS: Record<DiagramId, Def> = {
  // ------------------------------------------------------------------ átomo
  atom: {
    legend: [['Protón', C.proton], ['Neutrón', C.neutron], ['Electrón', C.electron]],
    phases: [
      { cap: 'Un átomo es casi todo vacío: una nube de electrones de carga negativa rodea un núcleo diminuto que concentra casi toda su masa.', dur: 5 },
      { cap: 'Si el átomo tuviera el tamaño de un estadio, el núcleo sería un guisante en el centro. Está formado por protones (carga positiva) y neutrones (sin carga).', dur: 5 },
      { cap: 'Los protones se repelen por su carga eléctrica, pero la fuerza nuclear fuerte, mucho más intensa a distancias cortísimas, mantiene unido el núcleo.', dur: 6 },
    ],
    build(k) {
      const cx = 360, cy = 205;
      const orb = k.g();
      const els: SVGCircleElement[] = [];
      for (let i = 0; i < 3; i++) {
        k.el('ellipse', { cx, cy, rx: 170, ry: 52, fill: 'none', stroke: 'rgba(125,211,252,0.25)', transform: `rotate(${i * 60} ${cx} ${cy})` }, orb);
        els.push(k.circle(0, 0, 5, C.electron, { filter: 'url(#dg-glow)' }, orb));
      }
      const nuc = k.g();
      k.nucleus(0, 0, 16, 26, 0.5, nuc, 3);
      const lbl = k.g();
      k.label(-14, -14, -120, -70, 'protón (+)', C.proton, lbl);
      k.label(12, 10, 120, 60, 'neutrón (sin carga)', C.neutron, lbl);
      const force = k.g();
      k.path('M -30 -40 L -60 -70 M -60 -70 l 10 2 M -60 -70 l 2 10', { stroke: C.proton }, force);
      k.path('M 30 -40 L 60 -70 M 60 -70 l -10 2 M 60 -70 l -2 10', { stroke: C.proton }, force);
      k.text(0, -80, 'repulsión eléctrica', { fill: C.proton, 'text-anchor': 'middle' }, force);
      k.el('circle', { cx: 0, cy: 0, r: 40, fill: 'none', stroke: C.fusion, 'stroke-dasharray': '3 4' }, force);
      k.text(0, 62, 'fuerza nuclear fuerte', { fill: C.fusion, 'text-anchor': 'middle' }, force);
      return (t, ph, pk) => {
        const z = ph === 0 ? 1 : ph === 1 ? lerp(1, 3.2, ease(pk)) : 3.2;
        k.tr(nuc, cx, cy, z);
        k.op(orb, ph === 0 ? 1 : ph === 1 ? 1 - ease(pk * 1.5) : 0);
        els.forEach((e, i) => { const a = t * (1.6 + i * 0.3) + i * 2; const x = Math.cos(a) * 170, y = Math.sin(a) * 52; const r = (i * 60 * Math.PI) / 180; k.set(e, { cx: cx + x * Math.cos(r) - y * Math.sin(r), cy: cy + x * Math.sin(r) + y * Math.cos(r) }); });
        k.tr(lbl, cx, cy, 3.2); k.op(lbl, ph === 1 ? seg(pk, 0.5, 0.8) : 0);
        k.tr(force, cx, cy, 2.6); k.op(force, ph === 2 ? seg(pk, 0.1, 0.4) : 0);
      };
    },
  },

  // ------------------------------------------------------------------ isótopos
  isotopes: {
    legend: [['Protón', C.proton], ['Neutrón', C.neutron]],
    phases: [
      { cap: 'El uranio-235 tiene 92 protones y 143 neutrones. Es el único isótopo natural que se fisiona con facilidad, pero es sólo el 0,7 % del uranio natural.', dur: 5 },
      { cap: 'El uranio-238 tiene los mismos 92 protones (es el mismo elemento químico) pero tres neutrones más. Es el 99,3 % del uranio natural y no sostiene una reacción en cadena por sí solo.', dur: 5 },
      { cap: 'El plutonio-239 (94 protones, 145 neutrones) no existe en la naturaleza en cantidades útiles: se fabrica en reactores cuando el uranio-238 captura un neutrón.', dur: 5 },
    ],
    build(k) {
      const items = [{ x: 140, n: 235, p: 92, name: 'Uranio-235', col: C.uranium }, { x: 360, n: 238, p: 92, name: 'Uranio-238', col: C.uranium }, { x: 580, n: 239, p: 94, name: 'Plutonio-239', col: C.plutonium }];
      const gs = items.map((it, i) => {
        const g = k.g();
        k.nucleus(it.x, 190, 90, 78, it.p / it.n, g, i + 5);
        k.text(it.x, 300, it.name, { fill: it.col, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700 }, g);
        k.text(it.x, 322, `${it.p} protones · ${it.n - it.p} neutrones`, { fill: C.muted, 'text-anchor': 'middle', 'font-family': 'JetBrains Mono, monospace', 'font-size': 12 }, g);
        k.text(it.x, 344, `${it.n} nucleones`, { fill: C.faint, 'text-anchor': 'middle', 'font-size': 11 }, g);
        return g;
      });
      k.text(360, 384, 'Cada esfera representa varios nucleones', { fill: C.faint, 'text-anchor': 'middle', 'font-size': 10.5 });
      return (_t, ph, pk) => gs.forEach((g, i) => k.op(g, i === ph ? 1 : i < ph ? 0.45 : 0.25 + 0.2 * (i === ph + 1 ? seg(pk, 0.7, 1) : 0)));
    },
  },

  // ------------------------------------------------------------------ desintegración
  decay: {
    legend: [['Alfa', C.proton], ['Beta', C.electron], ['Gamma', C.gamma]],
    phases: [
      { cap: 'Desintegración alfa: el núcleo expulsa un núcleo de helio (dos protones y dos neutrones). Es pesada y cargada: una hoja de papel o la piel la detienen.', dur: 4.5 },
      { cap: 'Desintegración beta: un neutrón se transforma en protón y emite un electrón muy rápido. Atraviesa el papel, pero unos milímetros de aluminio la frenan.', dur: 4.5 },
      { cap: 'Radiación gamma: luz de altísima energía sin masa ni carga. Muy penetrante: hacen falta capas gruesas de plomo u hormigón para atenuarla.', dur: 4.5 },
      { cap: 'Semivida: el tiempo en que se desintegra la mitad de los núcleos. Tras una semivida queda el 50 %, tras dos el 25 %, tras tres el 12,5 %…', dur: 6 },
    ],
    build(k) {
      const src = k.g();
      k.nucleus(110, 170, 40, 36, 0.45, src, 9);
      k.text(110, 225, 'núcleo inestable', { 'text-anchor': 'middle', 'font-size': 11 }, src);
      const shields = [{ x: 300, w: 4, c: '#d8d0b8', n: 'papel' }, { x: 420, w: 14, c: '#a8b0b8', n: 'aluminio' }, { x: 560, w: 46, c: '#5d6670', n: 'plomo / hormigón' }];
      const sh = k.g();
      for (const s of shields) { k.rect(s.x, 95, s.w, 150, s.c, { opacity: 0.85 }, sh); k.text(s.x + s.w / 2, 265, s.n, { 'text-anchor': 'middle', 'font-size': 11 }, sh); }
      const alpha = k.g(); k.nucleus(0, 0, 4, 9, 0.5, alpha, 2);
      const beta = k.circle(0, 0, 4, C.electron, { filter: 'url(#dg-glow)' });
      const gam = k.path('', { stroke: C.gamma, 'stroke-width': 2, filter: 'url(#dg-glow)' });
      const chart = k.g();
      k.line(120, 340, 640, 340, C.line, {}, chart); k.line(120, 340, 120, 120, C.line, {}, chart);
      const curve = k.path('', { stroke: C.uranium, 'stroke-width': 2 }, chart);
      const marks = k.g({}, chart);
      for (let i = 1; i <= 4; i++) { const x = 120 + i * 110, y = 340 - 210 * Math.pow(0.5, i); k.line(x, 340, x, y, 'rgba(255,255,255,0.2)', { 'stroke-dasharray': '3 3' }, marks); k.text(x, 356, `${i}T`, { 'text-anchor': 'middle', 'font-family': 'JetBrains Mono, monospace' }, marks); k.text(x + 4, y - 6, `${(100 * Math.pow(0.5, i)).toString().replace('.', ',')} %`, { fill: C.text, 'font-size': 11 }, marks); }
      k.text(126, 132, '100 % de los núcleos', { 'font-size': 11 }, chart);
      return (_t, ph, pk) => {
        const decayView = ph < 3;
        k.op(src, decayView ? 1 : 0); k.op(sh, decayView ? 1 : 0); k.op(chart, decayView ? 0 : 1);
        k.op(alpha, ph === 0 ? 1 : 0); k.op(beta, ph === 1 ? 1 : 0); k.op(gam, ph === 2 ? 1 : 0);
        const p = seg(pk, 0.1, 0.85);
        if (ph === 0) k.tr(alpha, lerp(150, 292, p), 170);
        if (ph === 1) k.set(beta, { cx: lerp(150, 414, p), cy: 170 });
        if (ph === 2) {
          const x1 = lerp(150, 700, p);
          let d = 'M 150 170';
          for (let x = 150; x < x1; x += 4) { const amp = x > 606 ? 4 : x > 560 ? lerp(10, 4, (x - 560) / 46) : 10; d += ` L ${x} ${170 + Math.sin(x * 0.25) * amp}`; }
          k.set(gam, { d, opacity: 1 });
        }
        if (ph === 3) {
          const xe = lerp(120, 640, seg(pk, 0, 0.8));
          let d = '';
          for (let x = 120; x <= xe; x += 4) d += `${d ? 'L' : 'M'} ${x} ${340 - 210 * Math.pow(0.5, (x - 120) / 110)} `;
          k.set(curve, { d });
          k.op(marks, seg(pk, 0.3, 0.9));
        }
      };
    },
  },

  // ------------------------------------------------------------------ fisión
  fission: {
    legend: [['Neutrón', C.neutron], ['Protón', C.proton], ['Energía', C.gamma]],
    phases: [
      { cap: 'Un neutrón lento, sin carga eléctrica, se acerca sin ser repelido a un núcleo de uranio-235.', dur: 3 },
      { cap: 'El núcleo lo absorbe y se vuelve inestable: vibra y se deforma como una gota de agua que se estira (modelo de la gota líquida de Bohr y Wheeler).', dur: 3.5 },
      { cap: 'Se parte en dos fragmentos (por ejemplo, bario y kriptón) que salen despedidos a enorme velocidad, y libera dos o tres neutrones nuevos y radiación gamma.', dur: 4 },
      { cap: 'Cada fisión libera unos 200 MeV: decenas de millones de veces más energía que una reacción química entre dos átomos. La masa de los productos es algo menor que la inicial: esa diferencia es la energía (E = mc²).', dur: 6 },
    ],
    build(k) {
      const cx = 360, cy = 200;
      const n0 = k.circle(0, cy, 7, C.neutron, { filter: 'url(#dg-glow)' });
      const drop = k.el('ellipse', { cx, cy, rx: 60, ry: 60, fill: 'url(#dg-u)', stroke: 'rgba(139,212,80,0.6)' });
      const fA = k.g(), fB = k.g();
      k.nucleus(0, 0, 40, 40, 0.4, fA, 11, C.proton, C.neutron);
      k.nucleus(0, 0, 32, 34, 0.4, fB, 12, C.proton, C.neutron);
      const la = k.text(0, 0, 'bario-141', { fill: C.text, 'text-anchor': 'middle' });
      const lb = k.text(0, 0, 'kriptón-92', { fill: C.text, 'text-anchor': 'middle' });
      const ns = [0, 1, 2].map(() => k.circle(0, 0, 6, C.neutron, { filter: 'url(#dg-glow)' }));
      const burst = k.g();
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; k.line(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30, cx + Math.cos(a) * 120, cy + Math.sin(a) * 120, C.gamma, { 'stroke-width': 2, filter: 'url(#dg-glow)' }, burst); }
      const lu = k.text(cx, cy + 92, 'uranio-235', { fill: C.uranium, 'text-anchor': 'middle', 'font-weight': 700 });
      const big = k.g();
      k.text(360, 360, '≈ 200 MeV por fisión', { fill: C.gamma, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 700, 'font-family': 'JetBrains Mono, monospace' }, big);
      return (t, ph, pk) => {
        k.op(n0, ph === 0 ? 1 : ph === 1 ? 1 - seg(pk, 0, 0.2) : 0);
        k.set(n0, { cx: ph === 0 ? lerp(40, cx - 62, ease(pk)) : cx - 50 });
        const vib = ph === 1 ? Math.sin(t * 30) * 4 * pk : 0;
        const st = ph === 1 ? seg(pk, 0.2, 1) : ph > 1 ? 1 : 0;
        k.set(drop, { rx: 60 + 45 * st + vib, ry: 60 - 22 * st - vib * 0.5 });
        k.op(drop, ph >= 2 ? 1 - seg(pk, 0, 0.15) : 1);
        k.op(lu, ph < 2 ? 1 : 0);
        const sp = ph === 2 ? seg(pk, 0.05, 1) : ph === 3 ? 1 : 0;
        const vis = ph >= 2 ? 1 : 0;
        k.tr(fA, cx - 50 - 190 * sp, cy - 30 * sp); k.op(fA, vis);
        k.tr(fB, cx + 50 + 190 * sp, cy + 30 * sp); k.op(fB, vis);
        k.set(la, { x: cx - 50 - 190 * sp, y: cy - 30 * sp + 60 }); k.op(la, vis * sp);
        k.set(lb, { x: cx + 50 + 190 * sp, y: cy + 30 * sp + 54 }); k.op(lb, vis * sp);
        ns.forEach((n, i) => { const a = -1.3 + i * 1.3; k.set(n, { cx: cx + Math.cos(a) * 260 * sp * 0.9, cy: cy + Math.sin(a - 0.2) * 170 * sp * (i === 1 ? -0.9 : 1) }); k.op(n, vis); });
        k.op(burst, ph === 2 ? 1 - seg(pk, 0.05, 0.6) : 0);
        k.op(big, ph === 3 ? seg(pk, 0, 0.2) : 0);
      };
    },
  },

  // ------------------------------------------------------------------ reacción en cadena
  chain: {
    legend: [['Núcleo que se fisiona', C.uranium], ['Neutrón', C.neutron]],
    phases: [
      { cap: 'Generación 1: un neutrón fisiona un núcleo, que libera tres neutrones.', dur: 3 },
      { cap: 'Generación 2: si cada uno encuentra otro núcleo fisible, ya son tres fisiones…', dur: 3 },
      { cap: 'Generación 3: nueve fisiones. Generación 4: veintisiete. El número crece de forma exponencial.', dur: 3.5 },
      { cap: 'Cada generación dura una fracción minúscula de microsegundo, así que en menos de un microsegundo se suceden decenas de generaciones y la energía se dispara. En un reactor, en cambio, se controla para que cada fisión provoque exactamente otra.', dur: 6 },
    ],
    build(k) {
      const cols = [80, 220, 380, 560];
      const nodes: { x: number; y: number; gen: number; parent: number }[] = [{ x: cols[0], y: 200, gen: 0, parent: -1 }];
      for (let g = 1; g < 4; g++) {
        const prev = nodes.filter((n) => n.gen === g - 1);
        const count = Math.pow(3, g), span = Math.min(360, count * 13.5);
        let idx = 0;
        prev.forEach((p) => { for (let c = 0; c < 3; c++) { nodes.push({ x: cols[g], y: 200 - span / 2 + (idx + 0.5) * (span / count), gen: g, parent: nodes.indexOf(p) }); idx++; } });
      }
      const links = k.g();
      const linkEls = nodes.map((n) => (n.parent >= 0 ? k.line(nodes[n.parent].x, nodes[n.parent].y, n.x, n.y, C.neutron, { 'stroke-width': 1, opacity: 0.6 }, links) : null));
      const dots = nodes.map((n) => k.circle(n.x, n.y, n.gen === 3 ? 4 : 8, C.uranium, { filter: 'url(#dg-glow)' }));
      const counter = k.text(650, 60, '', { fill: C.text, 'text-anchor': 'end', 'font-family': 'JetBrains Mono, monospace', 'font-size': 14 });
      const graph = k.g();
      k.line(420, 360, 690, 360, C.line, {}, graph); k.line(420, 360, 420, 240, C.line, {}, graph);
      const gp = k.path('', { stroke: C.gamma, 'stroke-width': 2 }, graph);
      k.text(424, 236, 'energía liberada', { 'font-size': 11 }, graph);
      k.text(690, 376, 'tiempo →', { 'text-anchor': 'end', 'font-size': 11 }, graph);
      return (_t, ph, pk) => {
        const shown = ph <= 2 ? ph + 1 + (ph === 2 ? seg(pk, 0.4, 0.9) : 0) : 4;
        nodes.forEach((n, i) => { const v = clamp(shown - n.gen); k.op(dots[i], v); if (linkEls[i]) k.op(linkEls[i]!, v * 0.7); });
        const g = Math.min(4, Math.floor(shown + 0.001));
        k.set(counter, {}); counter.textContent = `generación ${g} · ${Math.pow(3, g - 1)} fisiones`;
        k.op(graph, ph === 3 ? 1 : 0);
        if (ph === 3) { const xe = lerp(420, 690, seg(pk, 0, 0.8)); let d = ''; for (let x = 420; x <= xe; x += 3) d += `${d ? 'L' : 'M'} ${x} ${360 - 115 * Math.pow((x - 420) / 270, 6)} `; k.set(gp, { d }); }
      };
    },
  },

  // ------------------------------------------------------------------ criticidad
  critical: {
    legend: [['Núcleo fisible', C.uranium], ['Neutrón', C.neutron], ['Fisión', C.gamma]],
    phases: [
      { cap: 'Subcrítico: en un trozo de material pequeño o poco denso, la mayoría de los neutrones escapa por la superficie antes de chocar con un núcleo. La reacción se apaga.', dur: 5 },
      { cap: 'Supercrítico: si el material es más compacto o más denso, cada neutrón tiene muchas más probabilidades de provocar otra fisión antes de salir, y la reacción crece.', dur: 5 },
      { cap: 'La cantidad necesaria depende de la forma (la esfera es la más favorable), de la densidad y de lo que rodee al material: por eso un arma debe mantener sus piezas subcríticas hasta el último instante.', dur: 6 },
    ],
    build(k) {
      const mk = (cx: number, R: number, nN: number, seed: number) => {
        const g = k.g();
        k.circle(cx, 200, R, 'rgba(139,212,80,0.06)', { stroke: 'rgba(139,212,80,0.5)', 'stroke-dasharray': '4 4' }, g);
        for (let i = 0; i < nN; i++) { const a = rnd(i + seed) * Math.PI * 2, d = Math.sqrt(rnd(i * 3 + seed)) * (R - 6); k.circle(cx + Math.cos(a) * d, 200 + Math.sin(a) * d, 3.2, C.uranium, { opacity: 0.8 }, g); }
        return g;
      };
      const L = mk(190, 120, 34, 1), Rr = mk(530, 78, 60, 7);
      k.text(190, 350, 'subcrítico', { fill: C.text, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700 });
      k.text(530, 350, 'supercrítico', { fill: C.text, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700 });
      const tracksL = k.g(), tracksR = k.g();
      const trk = (g: SVGGElement, cx: number, R: number, esc: boolean, seed: number) => Array.from({ length: 8 }, (_, i) => {
        const a = rnd(i + seed) * Math.PI * 2;
        const len = esc ? R + 40 : R * (0.25 + 0.5 * rnd(i * 5 + seed));
        const ln = k.line(cx, 200, cx, 200, C.neutron, { 'stroke-width': 1.4 }, g);
        const hit = k.circle(cx + Math.cos(a) * len, 200 + Math.sin(a) * len, 7, C.gamma, { opacity: 0, filter: 'url(#dg-glow)' }, g);
        return { ln, hit, a, len, esc, cx };
      });
      const TL = trk(tracksL, 190, 120, true, 3), TR = trk(tracksR, 530, 78, false, 9);
      return (t, ph) => {
        k.op(L, ph === 1 ? 0.35 : 1); k.op(Rr, ph === 0 ? 0.35 : 1);
        const cyc = (t * 0.7) % 1;
        for (const s of [...TL, ...TR]) {
          const active = (s.esc && ph !== 1) || (!s.esc && ph !== 0);
          const p = clamp(cyc * 1.3);
          const L2 = s.len * p;
          k.set(s.ln, { x2: s.cx + Math.cos(s.a) * L2, y2: 200 + Math.sin(s.a) * L2, opacity: active ? 0.9 : 0 });
          k.op(s.hit, active && !s.esc && p >= 1 ? 1 - (cyc * 1.3 - 1) * 3 : 0);
        }
      };
    },
  },

  // ------------------------------------------------------------------ fusión
  fusion: {
    legend: [['Protón', C.proton], ['Neutrón', C.neutron], ['Energía', C.gamma]],
    phases: [
      { cap: 'Un núcleo de deuterio (un protón y un neutrón) y uno de tritio (un protón y dos neutrones). Ambos tienen carga positiva y se repelen.', dur: 4 },
      { cap: 'Sólo a decenas de millones de grados se mueven tan deprisa que vencen esa repulsión y se acercan lo suficiente para que actúe la fuerza fuerte.', dur: 4 },
      { cap: 'Se fusionan en un núcleo de helio-4 y sale un neutrón muy rápido. La reacción libera 17,6 MeV, que se reparten como energía de movimiento.', dur: 4.5 },
      { cap: 'Es la misma familia de reacciones que hace brillar al Sol. En un arma termonuclear, las condiciones necesarias las crea una explosión de fisión previa.', dur: 5 },
    ],
    build(k) {
      const D = k.g(), T = k.g(), He = k.g();
      const dot = (g: SVGGElement, x: number, y: number, c: string) => k.circle(x, y, 11, c, { stroke: 'rgba(0,0,0,0.3)' }, g);
      dot(D, -7, 0, C.proton); dot(D, 7, 0, C.neutron);
      dot(T, 0, -8, C.proton); dot(T, -8, 6, C.neutron); dot(T, 8, 6, C.neutron);
      dot(He, -7, -7, C.proton); dot(He, 7, 7, C.proton); dot(He, 7, -7, C.neutron); dot(He, -7, 7, C.neutron);
      const nOut = k.circle(0, 0, 10, C.neutron, { filter: 'url(#dg-glow)' });
      const ld = k.text(0, 0, 'deuterio', { fill: C.fusion, 'text-anchor': 'middle' }), lt = k.text(0, 0, 'tritio', { fill: C.fusion, 'text-anchor': 'middle' });
      const lhe = k.text(0, 0, 'helio-4', { fill: C.text, 'text-anchor': 'middle' }), ln = k.text(0, 0, 'neutrón (14,1 MeV)', { fill: C.neutron, 'text-anchor': 'middle' });
      const rep = k.g();
      k.path('M 300 150 L 260 150 M 260 150 l 8 -5 M 260 150 l 8 5', { stroke: C.proton }, rep);
      k.path('M 420 150 L 460 150 M 460 150 l -8 -5 M 460 150 l -8 5', { stroke: C.proton }, rep);
      k.text(360, 130, 'repulsión eléctrica', { fill: C.proton, 'text-anchor': 'middle' }, rep);
      const flash = k.circle(360, 200, 30, C.gamma, { opacity: 0, filter: 'url(#dg-glow)' });
      const sun = k.g();
      k.circle(360, 200, 90, 'url(#dg-sun)', {}, sun);
      k.text(360, 335, 'Sol: fusión de hidrógeno a unos 15 millones de grados en su centro', { 'text-anchor': 'middle', fill: C.text }, sun);
      const big = k.text(360, 370, 'D + T → ⁴He + n + 17,6 MeV', { fill: C.gamma, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 700, 'font-family': 'JetBrains Mono, monospace' });
      return (t, ph, pk) => {
        const app = ph === 0 ? 0.2 * ease(pk) : ph === 1 ? 0.2 + 0.8 * ease(pk) : 1;
        const jit = ph === 1 ? Math.sin(t * 40) * 3 : 0;
        const xd = lerp(180, 345, app), xt = lerp(540, 375, app);
        const merged = ph >= 2;
        k.tr(D, xd + jit, 200); k.tr(T, xt - jit, 200);
        k.op(D, merged || ph === 3 ? 0 : 1); k.op(T, merged || ph === 3 ? 0 : 1);
        k.set(ld, { x: xd, y: 240 }); k.set(lt, { x: xt, y: 240 }); k.op(ld, merged ? 0 : 1); k.op(lt, merged ? 0 : 1);
        k.op(rep, ph === 0 || ph === 1 ? 1 - app : 0);
        const sp = ph === 2 ? seg(pk, 0.1, 1) : 0;
        k.tr(He, 360 - 140 * sp, 200 - 20 * sp); k.op(He, ph === 2 ? 1 : 0);
        k.set(nOut, { cx: 360 + 260 * sp, cy: 200 + 40 * sp }); k.op(nOut, ph === 2 ? 1 : 0);
        k.set(lhe, { x: 360 - 140 * sp, y: 245 - 20 * sp }); k.op(lhe, ph === 2 ? sp : 0);
        k.set(ln, { x: 360 + 220 * sp, y: 245 + 40 * sp }); k.op(ln, ph === 2 ? sp : 0);
        k.op(flash, ph === 2 ? 1 - seg(pk, 0, 0.4) : 0); k.set(flash, { r: 30 + 80 * seg(pk, 0, 0.4) });
        k.op(sun, ph === 3 ? seg(pk, 0, 0.3) : 0);
        k.op(big, ph >= 2 ? (ph === 2 ? seg(pk, 0.5, 0.9) : 1) : 0);
      };
    },
  },

  // ------------------------------------------------------------------ cañón
  gun: {
    legend: [['Material fisible', C.uranium], ['Carga propulsora', C.explosive], ['Atacador', C.steel]],
    phases: [
      { cap: 'Dentro de la carcasa hay dos piezas de uranio, cada una subcrítica por sí sola: el proyectil, al fondo de un cañón, y el blanco, en el otro extremo, rodeado por el atacador.', dur: 5 },
      { cap: 'Una carga de pólvora dispara el proyectil por el tubo, como en una pieza de artillería.', dur: 3 },
      { cap: 'Al encajar en el blanco, ambas piezas forman una masa supercrítica. Unos iniciadores aportan neutrones para arrancar la reacción en cadena.', dur: 3.5 },
      { cap: 'La reacción en cadena libera la energía en menos de un microsegundo. Es un diseño simple pero lento: sólo funciona con uranio, no con plutonio.', dur: 3.5 },
    ],
    build(k) {
      const y = 200;
      k.path(`M 60 ${y - 60} L 560 ${y - 60} Q 660 ${y - 60} 670 ${y} Q 660 ${y + 60} 560 ${y + 60} L 60 ${y + 60} Z`, { stroke: 'rgba(255,255,255,0.35)', fill: 'rgba(255,255,255,0.02)' });
      k.rect(110, y - 12, 380, 24, 'none', { stroke: C.steel, 'stroke-width': 1.5 });
      const prop = k.rect(92, y - 20, 22, 40, C.explosive, { opacity: 0.85 });
      const proj = k.rect(116, y - 10, 60, 20, C.uranium);
      k.rect(490, y - 40, 120, 80, C.steel, { opacity: 0.6 });
      const targ = k.rect(500, y - 10, 70, 20, C.uranium);
      const glow = k.circle(540, y, 20, C.gamma, { opacity: 0, filter: 'url(#dg-glow)' });
      k.label(103, y + 20, 90, y + 95, 'carga propulsora');
      k.label(150, y - 10, 150, y - 95, 'proyectil');
      k.label(300, y + 12, 300, y + 95, 'cañón');
      k.label(535, y - 10, 470, y - 95, 'blanco');
      k.label(600, y + 40, 640, y + 95, 'atacador');
      return (t, ph, pk) => {
        const x = ph === 1 ? lerp(116, 432, seg(pk, 0.1, 0.95)) : ph >= 2 ? 432 : 116;
        k.set(proj, { x });
        k.set(prop, { fill: ph === 1 ? (Math.sin(t * 60) > 0 ? C.gamma : C.explosive) : C.explosive, opacity: ph >= 2 ? 0.25 : 0.85 });
        k.op(glow, ph === 2 ? seg(pk, 0.3, 1) * 0.8 : ph === 3 ? 1 - pk * 0.2 : 0);
        k.set(glow, { r: ph === 3 ? 20 + 300 * ease(pk) : 20 + 20 * Math.sin(t * 20) * (ph === 2 ? 1 : 0) });
        k.set(targ, { fill: ph >= 2 ? '#c8ff7a' : C.uranium });
      };
    },
  },

  // ------------------------------------------------------------------ implosión
  implosion: {
    legend: [['Explosivo', C.explosive], ['Atacador', C.steel], ['Núcleo fisible', C.plutonium], ['Onda de choque', C.gamma]],
    phases: [
      { cap: 'Una esfera de material fisible, subcrítica, está rodeada por capas metálicas (atacador) y por una gruesa capa de explosivo convencional con detonadores repartidos por la superficie.', dur: 5 },
      { cap: 'Todos los detonadores se disparan a la vez. La forma del explosivo convierte sus ondas en un único frente esférico que avanza hacia el centro.', dur: 3.5 },
      { cap: 'La onda aplasta las capas por igual en todas direcciones y comprime el núcleo hasta una densidad muy superior a la normal: ahora es supercrítico.', dur: 3.5 },
      { cap: 'En el instante de máxima compresión, una fuente de neutrones inicia la reacción en cadena. El ensamblaje es mucho más rápido que el del cañón y aprovecha mejor el material.', dur: 4 },
    ],
    build(k) {
      const cx = 300, cy = 205;
      const ex = k.circle(cx, cy, 150, C.explosive, { opacity: 0.8 });
      const segs = k.g();
      for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; k.line(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70, cx + Math.cos(a) * 150, cy + Math.sin(a) * 150, 'rgba(0,0,0,0.35)', {}, segs); }
      const tam = k.circle(cx, cy, 70, C.steel);
      const core = k.circle(cx, cy, 34, C.plutonium);
      const dets = k.g();
      for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2 + 0.157; k.circle(cx + Math.cos(a) * 156, cy + Math.sin(a) * 156, 5, '#d8c27a', {}, dets); }
      const wave = k.circle(cx, cy, 150, 'none', { stroke: C.gamma, 'stroke-width': 4, opacity: 0, filter: 'url(#dg-glow)' });
      const glow = k.circle(cx, cy, 10, C.gamma, { opacity: 0, filter: 'url(#dg-glow)' });
      k.label(cx + 130, cy - 70, 560, 90, 'explosivo (lentes)');
      k.label(cx + 50, cy + 45, 560, 250, 'atacador');
      k.label(cx + 20, cy - 10, 560, 170, 'núcleo fisible');
      k.label(cx + 110, cy + 110, 560, 330, 'detonadores');
      return (t, ph, pk) => {
        k.set(dets, { opacity: ph === 1 && pk < 0.2 ? (Math.sin(t * 80) > 0 ? 1 : 0.3) : 1 });
        const w = ph === 1 ? lerp(150, 70, seg(pk, 0.15, 1)) : ph === 2 ? lerp(70, 30, seg(pk, 0, 0.6)) : 0;
        k.set(wave, { r: w, opacity: ph === 1 || (ph === 2 && pk < 0.6) ? 0.9 : 0 });
        const burned = ph === 1 ? seg(pk, 0.15, 1) : ph >= 2 ? 1 : 0;
        k.set(ex, { r: 150, opacity: 0.8 - 0.55 * burned });
        k.op(segs, 1 - burned);
        const comp = ph === 2 ? seg(pk, 0, 0.8) : ph === 3 ? 1 : 0;
        k.set(tam, { r: 70 - 22 * comp });
        k.set(core, { r: 34 - 12 * comp, fill: comp > 0.9 ? '#e3b9ff' : C.plutonium });
        k.op(glow, ph === 3 ? 1 - pk * 0.3 : 0); k.set(glow, { r: ph === 3 ? 10 + 260 * seg(pk, 0.2, 1) : 10 });
      };
    },
  },

  // ------------------------------------------------------------------ dos etapas
  staged: {
    legend: [['Primario (fisión)', C.plutonium], ['Secundario (fusión)', C.fusion], ['Radiación', C.electron]],
    phases: [
      { cap: 'Concepto de un arma de dos etapas tal como se describe en las enciclopedias: dentro de una carcasa están el primario, un arma de fisión, y el secundario, con combustible de fusión.', dur: 5 },
      { cap: 'El primario estalla. La mayor parte de su energía sale en forma de rayos X, que viajan a la velocidad de la luz.', dur: 3 },
      { cap: 'La radiación llena la carcasa casi al instante y la presión que genera comprime el secundario de forma muy simétrica antes de que llegue la onda de la explosión.', dur: 3.5 },
      { cap: 'El combustible comprimido y calentado se fusiona; sus neutrones provocan además fisiones. La energía total puede ser cientos de veces la del primario. Los detalles reales son secretos.', dur: 4.5 },
    ],
    build(k) {
      const cy = 200;
      const casing = k.path(`M 120 ${cy - 80} L 560 ${cy - 80} Q 620 ${cy - 80} 620 ${cy} Q 620 ${cy + 80} 560 ${cy + 80} L 120 ${cy + 80} Q 60 ${cy + 80} 60 ${cy} Q 60 ${cy - 80} 120 ${cy - 80} Z`, { stroke: C.steel, 'stroke-width': 3, fill: 'rgba(255,255,255,0.02)' });
      const fill = k.rect(64, cy - 76, 0, 152, C.electron, { opacity: 0 });
      const prim = k.circle(170, cy, 50, C.plutonium, { opacity: 0.9 });
      const sec = k.rect(320, cy - 45, 240, 90, C.fusion, { opacity: 0.9 });
      const glow = k.circle(170, cy, 50, C.gamma, { opacity: 0, filter: 'url(#dg-glow)' });
      const sglow = k.rect(320, cy - 45, 240, 90, '#fff3d6', { opacity: 0, filter: 'url(#dg-glow)' });
      k.label(170, cy - 50, 170, 70, 'primario (fisión)', C.plutonium);
      k.label(440, cy - 45, 440, 70, 'secundario (fusión)', C.fusion);
      k.label(600, cy + 50, 640, 340, 'carcasa de radiación');
      void casing;
      return (t, ph, pk) => {
        k.op(glow, ph === 1 ? seg(pk, 0, 0.4) : ph === 2 ? 0.8 : 0);
        k.set(glow, { r: 50 + 30 * (ph >= 1 ? 1 : 0) + Math.sin(t * 20) * 4 });
        const f = ph === 2 ? seg(pk, 0, 0.35) : ph === 3 ? 1 : 0;
        k.set(fill, { width: 552 * f, opacity: ph >= 2 ? 0.28 : 0 });
        const comp = ph === 2 ? seg(pk, 0.3, 1) : ph === 3 ? 1 : 0;
        k.set(sec, { y: cy - 45 + 25 * comp, height: 90 - 50 * comp, x: 320 + 20 * comp, width: 240 - 40 * comp });
        k.set(sglow, { y: cy - 45 + 25 * comp, height: 90 - 50 * comp, x: 320 + 20 * comp, width: 240 - 40 * comp, opacity: ph === 3 ? seg(pk, 0, 0.5) : 0 });
        k.op(prim, ph >= 1 ? 0.3 : 0.9);
      };
    },
  },

  // ------------------------------------------------------------------ bola de fuego
  fireball: {
    legend: [['Bola de fuego', C.gamma], ['Potencia térmica', C.explosive]],
    phases: [
      { cap: 'En la primera milésima de segundo se forma una esfera de aire y vapor a decenas de millones de grados, más brillante que el Sol: el primer destello.', dur: 3.5 },
      { cap: 'La onda de choque se separa de la bola de fuego y la vuelve momentáneamente opaca: la luz cae a un mínimo térmico. Por eso se habla de un «doble destello».', dur: 3.5 },
      { cap: 'Cuando el frente de choque se vuelve transparente, la bola de fuego reaparece y emite la mayor parte de su calor (segundo máximo), que dura de una fracción de segundo a varios segundos según la potencia.', dur: 4 },
      { cap: 'Más ligera que el aire que la rodea, la bola de fuego sube como un globo, se enfría y se enrolla en un anillo (toro) que arrastra polvo desde el suelo.', dur: 4.5 },
      { cap: 'En unos minutos se forma la nube en forma de hongo, que se estabiliza a decenas de kilómetros de altura y se extiende con el viento.', dur: 5 },
    ],
    build(k) {
      k.rect(0, 300, W, 105, 'rgba(58,51,43,0.4)');
      k.line(0, 300, W, 300, 'rgba(255,255,255,0.2)');
      const stem = k.path('', { stroke: 'none', fill: 'rgba(150,120,100,0.55)' });
      const ball = k.circle(240, 270, 10, 'url(#dg-fire)', { filter: 'url(#dg-glow)' });
      const shock = k.circle(240, 270, 10, 'none', { stroke: 'rgba(255,255,255,0.5)', 'stroke-width': 1.5, opacity: 0 });
      const cap = k.el('ellipse', { cx: 240, cy: 120, rx: 10, ry: 6, fill: 'rgba(210,190,175,0.85)', opacity: 0 });
      // gráfico de potencia térmica
      const gx = 470, gy = 60, gw = 220, gh = 120;
      k.rect(gx, gy, gw, gh, 'rgba(255,255,255,0.02)', { stroke: 'rgba(255,255,255,0.1)' });
      k.text(gx + 6, gy + 14, 'potencia térmica', { 'font-size': 11 });
      k.text(gx + gw - 4, gy + gh + 14, 'tiempo (escala logarítmica) →', { 'font-size': 10, 'text-anchor': 'end' });
      const P = (u: number) => 0.95 * Math.exp(-Math.pow((u - 0.08) / 0.04, 2)) + Math.max(0, 0.75 * Math.exp(-Math.pow((u - 0.55) / 0.18, 2))) + 0.02;
      const curve = k.path('', { stroke: C.explosive, 'stroke-width': 2 });
      const dot = k.circle(0, 0, 4, C.gamma, { filter: 'url(#dg-glow)' });
      const l1 = k.text(gx + 16, gy + 40, '1.er destello', { fill: C.text, 'font-size': 10.5 });
      const l2 = k.text(gx + 46, gy + 112, 'mínimo', { fill: C.text, 'font-size': 10.5 });
      const l3 = k.text(gx + 120, gy + 52, '2.º máximo', { fill: C.text, 'font-size': 10.5 });
      return (t, ph, pk) => {
        const u = [0.1 * pk, 0.1 + 0.2 * pk, 0.3 + 0.5 * pk, 0.8 + 0.2 * pk, 1][ph];
        let d = '';
        for (let x = 0; x <= Math.min(1, u); x += 0.01) d += `${d ? 'L' : 'M'} ${gx + x * gw} ${gy + gh - P(x) * gh * 0.9} `;
        k.set(curve, { d });
        k.set(dot, { cx: gx + Math.min(1, u) * gw, cy: gy + gh - P(Math.min(1, u)) * gh * 0.9, opacity: ph < 4 ? 1 : 0 });
        k.op(l1, u > 0.1 ? 1 : 0); k.op(l2, u > 0.25 ? 1 : 0); k.op(l3, u > 0.5 ? 1 : 0);
        const r = ph === 0 ? 10 + 50 * ease(pk) : ph <= 2 ? 60 + 20 * (ph === 2 ? ease(pk) : 0) : 80;
        const rise = ph === 3 ? ease(pk) * 120 : ph === 4 ? 120 + ease(pk) * 30 : 0;
        const bright = ph === 1 ? 0.45 : ph >= 3 ? 1 - (ph === 3 ? pk * 0.6 : 0.7) : 1;
        k.set(ball, { r: ph === 4 ? 0 : r, cy: 270 - rise, opacity: bright });
        k.set(shock, { r: ph === 1 ? 60 + 160 * ease(pk) : 0, opacity: ph === 1 ? 1 - pk : 0 });
        const capOn = ph === 3 ? seg(pk, 0.6, 1) : ph === 4 ? 1 : 0;
        k.set(cap, { cx: 240, cy: 270 - rise, rx: 80 + (ph === 4 ? 70 * ease(pk) : 0), ry: 40 + (ph === 4 ? 12 * ease(pk) : 0), opacity: capOn });
        const sw = 18 + (ph === 4 ? 10 * pk : 0);
        const top = 270 - rise + 30;
        k.set(stem, { d: ph >= 3 ? `M ${240 - sw * 2.2} 300 Q ${240 - sw} ${(300 + top) / 2} ${240 - sw} ${top} L ${240 + sw} ${top} Q ${240 + sw} ${(300 + top) / 2} ${240 + sw * 2.2} 300 Z` : '', opacity: ph === 3 ? seg(pk, 0.3, 1) : 1 });
        void t;
      };
    },
  },

  // ------------------------------------------------------------------ onda expansiva
  blast: {
    legend: [['Onda incidente', C.text], ['Onda reflejada', C.electron], ['Onda de Mach', C.gamma]],
    phases: [
      { cap: 'En una explosión aérea, la onda de choque se expande como una esfera de aire comprimido: la sobrepresión, medida en psi (libras por pulgada cuadrada).', dur: 3.5 },
      { cap: 'Al llegar al suelo se refleja. La onda reflejada viaja por el aire ya comprimido y caliente, y por eso es más rápida.', dur: 3.5 },
      { cap: 'La onda reflejada alcanza a la incidente y ambas se funden en un frente vertical, la onda de Mach, con una presión mayor que cada una por separado. Es la razón de que exista una altura óptima de explosión.', dur: 4.5 },
      { cap: 'A su paso, un punto sufre un salto brusco de presión, un viento violento y luego una fase de succión. 20 psi destruyen edificios de hormigón; 5 psi, la mayoría de las viviendas; 1 psi rompe cristales.', dur: 5 },
    ],
    build(k) {
      const gy = 300, bx = 160, by = 120;
      k.rect(0, gy, W, H - gy, 'rgba(58,51,43,0.4)'); k.line(0, gy, W, gy, 'rgba(255,255,255,0.2)');
      const bld = k.g();
      const builds = Array.from({ length: 12 }, (_, i) => { const x = 250 + i * 38, hh = 20 + rnd(i) * 40; return { x, hh, el: k.rect(x, gy - hh, 18, hh, '#59616b', {}, bld) }; });
      k.circle(bx, by, 6, C.gamma, { filter: 'url(#dg-glow)' });
      const inc = k.path('', { stroke: C.text, 'stroke-width': 2 });
      const refl = k.path('', { stroke: C.electron, 'stroke-width': 2, opacity: 0.8 });
      const mach = k.line(0, gy, 0, gy, C.gamma, { 'stroke-width': 4, filter: 'url(#dg-glow)' });
      const graph = k.g();
      const gx = 420, gyy = 40, gw = 270, gh = 110;
      k.rect(gx, gyy, gw, gh, 'rgba(255,255,255,0.02)', { stroke: 'rgba(255,255,255,0.1)' }, graph);
      k.line(gx, gyy + gh * 0.7, gx + gw, gyy + gh * 0.7, 'rgba(255,255,255,0.15)', {}, graph);
      k.text(gx + 6, gyy + 14, 'presión en un punto', { 'font-size': 11 }, graph);
      const pc = k.path('', { stroke: C.gamma, 'stroke-width': 2 }, graph);
      k.text(gx + 60, gyy + 30, 'fase positiva', { fill: C.text, 'font-size': 10 }, graph);
      k.text(gx + 150, gyy + gh - 6, 'fase negativa (succión)', { fill: C.text, 'font-size': 10 }, graph);
      const rings = k.g();
      [[340, '20 psi', '#ff4d4d'], [460, '5 psi', '#ff9f43'], [620, '1 psi', '#ffd166']].forEach(([x, s, c]) => { k.line(x as number, gy + 2, x as number, gy + 30, c as string, { 'stroke-width': 2 }, rings); k.text(x as number, gy + 46, s as string, { fill: c as string, 'text-anchor': 'middle', 'font-weight': 700 }, rings); });
      const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => { let d = ''; for (let a = a0; a <= a1; a += 0.04) { const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (y > gy) continue; d += `${d ? 'L' : 'M'} ${x} ${y} `; } return d; };
      return (_t, ph, pk) => {
        const T = ph === 0 ? pk * 0.8 : ph === 1 ? 0.8 + pk * 0.6 : ph === 2 ? 1.4 + pk * 1.4 : 2.8;
        const R = T * 200;
        k.set(inc, { d: arc(bx, by, R, -Math.PI, Math.PI) });
        const rr = Math.max(0, (T - 0.9) * 230);
        k.set(refl, { d: T > 0.9 ? arc(bx, 2 * gy - by, rr, -Math.PI, 0) : '', opacity: ph <= 2 ? 0.8 : 0.3 });
        const mx = bx + Math.sqrt(Math.max(0, R * R - (gy - by) ** 2));
        const mh = T > 1.3 ? Math.min(90, (T - 1.3) * 80) : 0;
        k.set(mach, { x1: mx, x2: mx, y1: gy, y2: gy - mh, opacity: mh > 0 ? 1 : 0 });
        builds.forEach((b) => { const hit = mx > b.x + 9 && T > 0.85; const tilt = hit ? Math.min(1, (mx - b.x) / 120) * (b.x < 420 ? 1 : b.x < 560 ? 0.6 : 0.2) : 0; k.set(b.el, { height: b.hh * (1 - 0.8 * tilt), y: gy - b.hh * (1 - 0.8 * tilt) }); });
        k.op(graph, ph === 3 ? 1 : 0.25);
        let d = ''; const prog = ph === 3 ? seg(pk, 0, 0.8) : 0;
        for (let i = 0; i <= 100 * prog; i++) { const u = i / 100; const p = u < 0.08 ? 0 : u < 0.1 ? (u - 0.08) / 0.02 : Math.exp(-(u - 0.1) * 9) * (1 - (u - 0.1) * 2.2); d += `${d ? 'L' : 'M'} ${gx + u * gw} ${gyy + gh * 0.7 - Math.max(-0.25, p) * gh * 0.6} `; }
        k.set(pc, { d });
        k.op(rings, ph === 3 ? seg(pk, 0.2, 0.6) : 0);
      };
    },
  },

  // ------------------------------------------------------------------ térmica
  thermal: {
    legend: [['Pulso térmico', C.gamma]],
    phases: [
      { cap: 'Alrededor de un tercio de la energía sale como luz y calor, a la velocidad de la luz: llega antes que la onda expansiva.', dur: 4 },
      { cap: 'La dosis de calor (fluencia, en calorías por centímetro cuadrado) disminuye con la distancia y con la niebla o el humo. Todo lo que hace sombra protege.', dur: 4.5 },
      { cap: 'Quemaduras de tercer grado más cerca, de segundo y de primer grado más lejos; ignición de materiales y grandes incendios. El destello puede cegar a decenas de kilómetros.', dur: 5 },
    ],
    build(k) {
      const gy = 310, fx = 110, fy = 90;
      k.rect(0, gy, W, H - gy, 'rgba(58,51,43,0.4)'); k.line(0, gy, W, gy, 'rgba(255,255,255,0.2)');
      const fb = k.circle(fx, fy, 34, 'url(#dg-fire)', { filter: 'url(#dg-glow)' });
      const rays = k.g();
      for (let i = 0; i < 9; i++) { const x = 180 + i * 62; k.line(fx, fy, x, gy, C.gamma, { 'stroke-width': 1, opacity: 0.6 - i * 0.05 }, rays); }
      const wall = k.rect(420, gy - 60, 14, 60, '#59616b');
      const shadow = k.path(`M 434 ${gy} L 434 ${gy - 60} L 540 ${gy} Z`, { fill: 'rgba(0,0,0,0.45)', stroke: 'none' });
      const zones = k.g();
      const z = [[180, 300, '#ff4d4d', '3.er grado · ignición'], [300, 470, '#ff9f43', '2.º grado'], [470, 690, '#ffd166', '1.er grado']];
      for (const [a, b, c, s] of z) { k.rect(a as number, gy + 8, (b as number) - (a as number), 8, c as string, {}, zones); k.text(((a as number) + (b as number)) / 2, gy + 34, s as string, { fill: c as string, 'text-anchor': 'middle', 'font-weight': 700 }, zones); }
      const fires = k.g();
      for (let i = 0; i < 5; i++) k.path(`M ${200 + i * 20} ${gy} q 4 -14 0 -22 q 8 8 6 22 z`, { fill: C.explosive, stroke: 'none', filter: 'url(#dg-glow)' }, fires);
      const fl = k.text(470, 70, '', { fill: C.text, 'text-anchor': 'middle', 'font-size': 13 });
      return (t, ph, pk) => {
        k.op(rays, ph === 0 ? seg(pk, 0, 0.5) : 1);
        k.set(fb, { r: 34 + Math.sin(t * 8) * 2 });
        k.op(shadow, ph >= 1 ? 1 : 0); k.op(wall, 1);
        k.op(zones, ph === 2 ? seg(pk, 0, 0.4) : ph === 1 ? 0.3 : 0);
        k.op(fires, ph === 2 ? seg(pk, 0.4, 0.8) * (0.7 + 0.3 * Math.sin(t * 20)) : 0);
        fl.textContent = ph === 1 ? 'la sombra del muro protege lo que hay detrás' : ph === 0 ? 'la luz y el calor llegan en el acto' : '';
      };
    },
  },

  // ------------------------------------------------------------------ lluvia radiactiva
  fallout: {
    legend: [['Partículas radiactivas', C.uranium]],
    phases: [
      { cap: 'En una explosión de superficie, la bola de fuego vaporiza y absorbe toneladas de tierra. El vapor se condensa en partículas mezcladas con los productos radiactivos.', dur: 4.5 },
      { cap: 'El viento arrastra la nube. Las partículas más gruesas caen en la primera hora cerca del punto de la explosión; las finas, horas después y a cientos de kilómetros, formando una pluma alargada.', dur: 5 },
      { cap: 'Regla del 7-10: por cada multiplicación del tiempo por 7, la radiación se divide por 10. A las 7 horas queda el 10 %, a las 49 horas el 1 % y a las dos semanas el 0,1 %. Por eso refugiarse los primeros días salva vidas.', dur: 6 },
    ],
    build(k) {
      const gy = 310;
      const scene = k.g();
      k.rect(0, gy, W, H - gy, 'rgba(58,51,43,0.4)', {}, scene); k.line(0, gy, W, gy, 'rgba(255,255,255,0.2)', {}, scene);
      k.path(`M 110 ${gy} Q 125 200 125 150 L 145 150 Q 145 200 160 ${gy} Z`, { fill: 'rgba(150,120,100,0.6)', stroke: 'none' }, scene);
      const cloud = k.el('ellipse', { cx: 135, cy: 120, rx: 90, ry: 38, fill: 'rgba(210,190,175,0.8)' }, scene);
      const plume = k.el('ellipse', { cx: 135, cy: gy + 2, rx: 0, ry: 7, fill: 'url(#dg-plume)' }, scene);
      const parts = Array.from({ length: 70 }, (_, i) => ({ el: k.circle(0, 0, 2.2, C.uranium, { opacity: 0.85 }, scene), s: rnd(i), o: rnd(i + 50) }));
      k.path('M 300 60 L 380 60 M 380 60 l -10 -5 M 380 60 l -10 5', { stroke: C.electron, 'stroke-width': 2 }, scene);
      k.text(300, 50, 'viento', { fill: C.electron }, scene);
      const chart = k.g();
      const bars: [string, number][] = [['H+1', 1], ['H+7', 0.1], ['H+49', 0.01], ['2 semanas', 0.001]];
      bars.forEach(([l, v], i) => { const x = 140 + i * 130, hh = 230 * (Math.log10(v) + 3.3) / 3.3; k.rect(x, 330 - hh, 70, hh, C.uranium, { opacity: 0.85 }, chart); k.text(x + 35, 350, l, { 'text-anchor': 'middle', fill: C.text }, chart); k.text(x + 35, 322 - hh, `${(v * 100).toString().replace('.', ',')} %`, { 'text-anchor': 'middle', fill: C.uranium, 'font-family': 'JetBrains Mono, monospace' }, chart); });
      k.text(140, 380, 'tasa de dosis respecto a la de la primera hora (escala logarítmica)', { 'font-size': 11 }, chart);
      return (t, ph, pk) => {
        k.op(scene, ph < 2 ? 1 : 0); k.op(chart, ph === 2 ? seg(pk, 0, 0.3) : 0);
        const drift = ph === 1 ? ease(pk) * 330 : 0;
        k.set(cloud, { cx: 135 + drift, rx: 90 + drift * 0.25 });
        k.set(plume, { rx: ph === 1 ? 30 + drift * 0.9 : ph === 0 ? 20 * pk : 0, cx: 135 + (ph === 1 ? drift * 0.75 : 0) });
        parts.forEach((p) => {
          const tt = (t * 0.25 + p.o) % 1;
          const x0 = 135 + drift + (p.s - 0.5) * 140;
          const fall = tt * (gy - 120);
          const x = x0 + tt * 60 * (1 - p.s);
          k.set(p.el, { cx: x, cy: 130 + fall, opacity: ph === 0 ? 0.3 * pk : 0.85 * (1 - tt * 0.3) });
        });
      };
    },
  },

  // ------------------------------------------------------------------ EMP
  emp: {
    legend: [['Rayos gamma', C.gamma], ['Electrones', C.electron]],
    phases: [
      { cap: 'Una explosión a cientos de kilómetros de altura, fuera de la atmósfera densa, emite una ráfaga de rayos gamma hacia abajo.', dur: 4 },
      { cap: 'Entre unos 20 y 40 km de altura, los rayos gamma arrancan electrones de las moléculas de aire (efecto Compton). El campo magnético terrestre los hace girar y emiten un pulso de radio muy intenso.', dur: 5 },
      { cap: 'El pulso cubre a la vez una región de miles de kilómetros. Su parte más rápida (E1) daña la electrónica; la intermedia (E2) se parece a un rayo; la lenta (E3) induce corrientes en líneas eléctricas largas, como en Starfish Prime (1962).', dur: 6 },
    ],
    build(k) {
      const cx = 360, R = 1400;
      k.circle(cx, 380 + R, R, '#1b2a20');
      k.el('circle', { cx, cy: 380 + R, r: R + 60, fill: 'none', stroke: 'rgba(125,211,252,0.15)', 'stroke-width': 50 });
      k.text(40, 300, 'capa de 20–40 km', { fill: C.electron, 'font-size': 11 });
      const burst = k.circle(cx, 50, 6, C.gamma, { filter: 'url(#dg-glow)' });
      const cone = k.path(`M ${cx} 50 L 60 330 M ${cx} 50 L 660 330`, { stroke: C.gamma, 'stroke-dasharray': '4 6', opacity: 0 });
      const gam = k.g();
      for (let i = 0; i < 11; i++) k.line(cx, 50, 0, 0, C.gamma, { 'stroke-width': 1.4, opacity: 0.7 }, gam);
      const els = k.g();
      const spirals = Array.from({ length: 18 }, (_, i) => ({ x: 80 + i * 32, el: k.circle(0, 0, 3, C.electron, { filter: 'url(#dg-glow)' }, els) }));
      const ground = k.path('M 40 338 Q 360 300 680 338', { stroke: '#ffd166', 'stroke-width': 4, opacity: 0, filter: 'url(#dg-glow)' });
      const lab = k.g();
      [['E1', 'nanosegundos · electrónica'], ['E2', 'microsegundos · como un rayo'], ['E3', 'segundos a minutos · redes eléctricas']].forEach(([a, b], i) => { k.text(470, 90 + i * 22, a, { fill: C.gamma, 'font-weight': 700, 'font-family': 'JetBrains Mono, monospace' }, lab); k.text(500, 90 + i * 22, b, { fill: C.text }, lab); });
      return (t, ph, pk) => {
        k.set(burst, { r: 6 + (ph === 0 ? 10 * Math.sin(pk * Math.PI) : 0) });
        k.op(cone, ph >= 0 ? (ph === 0 ? seg(pk, 0.3, 1) : 1) * 0.6 : 0);
        Array.from(gam.children).forEach((l, i) => { const x = 60 + i * 60; const p = ph === 0 ? seg(pk, 0.2, 1) : 1; k.set(l as SVGElement, { x2: cx + (x - cx) * p, y2: 50 + (300 - 50) * p }); });
        spirals.forEach((s, i) => { const a = t * 6 + i; k.set(s.el, { cx: s.x + Math.cos(a) * 8, cy: 300 + Math.sin(a) * 6 - Math.abs(s.x - cx) * 0.06, opacity: ph >= 1 ? 1 : 0 }); });
        k.op(ground, ph === 2 ? 0.6 + 0.4 * Math.sin(t * 10) : 0);
        k.op(lab, ph === 2 ? seg(pk, 0.1, 0.4) : 0);
      };
    },
  },

  // ------------------------------------------------------------------ impacto cósmico
  impact: {
    legend: [['Asteroide', '#b8a48a'], ['Calor de compresión', C.gamma]],
    phases: [
      { cap: 'Un asteroide entra en la atmósfera a entre 11 y 70 km/s. El aire que tiene delante se comprime y se calienta a miles de grados: lo vemos como un bólido.', dur: 4 },
      { cap: 'La presión del aire crece a medida que baja. Si supera la resistencia de la roca, el objeto se rompe, se aplana como una tortita y frena de golpe.', dur: 4 },
      { cap: 'Un objeto de decenas de metros suele estallar en el aire y libera su energía como una explosión aérea, como en Tunguska (1908) o Cheliábinsk (2013).', dur: 4 },
      { cap: 'Uno grande llega al suelo casi sin frenar: excava un cráter transitorio y lanza una cortina de eyecta. Las paredes se derrumban y queda el cráter final, que en los mayores tiene un pico central.', dur: 6 },
    ],
    build(k) {
      const gy = 320;
      for (let i = 0; i < 4; i++) k.rect(0, gy - (i + 1) * 70, W, 70, `rgba(70,120,180,${0.12 - i * 0.025})`);
      k.rect(0, gy, W, H - gy, 'rgba(58,51,43,0.55)');
      const ground = k.path('', { stroke: 'rgba(255,255,255,0.35)', 'stroke-width': 1.5, fill: 'none' });
      const trail = k.path('', { stroke: C.gamma, 'stroke-width': 6, opacity: 0.6, filter: 'url(#dg-glow)', 'stroke-linecap': 'round' });
      const rock = k.el('ellipse', { cx: 0, cy: 0, rx: 12, ry: 12, fill: '#b8a48a', filter: 'url(#dg-glow)' });
      const frags = Array.from({ length: 9 }, () => k.circle(0, 0, 3, '#e0c9a6', { opacity: 0 }));
      const air = k.circle(0, 0, 10, C.gamma, { opacity: 0, filter: 'url(#dg-glow)' });
      const ejecta = k.g();
      for (let i = 0; i < 12; i++) k.line(0, 0, 0, 0, '#c79a6b', { 'stroke-width': 2, opacity: 0.8 }, ejecta);
      const lbl = k.text(360, 30, '', { fill: C.text, 'text-anchor': 'middle', 'font-size': 13 });
      return (_t, ph, pk) => {
        const path = (u: number) => ({ x: lerp(40, 420, u), y: lerp(20, gy, u) });
        const u = ph === 0 ? 0.5 * ease(pk) : ph === 1 ? 0.5 + 0.2 * ease(pk) : ph === 2 ? 0.7 : ph === 3 ? Math.min(1, 0.7 + 0.3 * seg(pk, 0, 0.25)) : 0;
        const p = path(u);
        const s = path(Math.max(0, u - 0.25));
        k.set(trail, { d: `M ${s.x} ${s.y} L ${p.x} ${p.y}`, opacity: ph <= 1 || (ph === 3 && pk < 0.25) ? 0.6 : 0 });
        const flat = ph === 1 ? ease(pk) : 0;
        k.set(rock, { cx: p.x, cy: p.y, rx: (ph === 3 ? 18 : 12) * (1 + 1.5 * flat), ry: (ph === 3 ? 18 : 12) * (1 - 0.5 * flat), opacity: ph === 2 || (ph === 3 && pk > 0.25) ? 0 : 1 });
        frags.forEach((f, i) => { const sp = ph === 1 ? seg(pk, 0.6, 1) : 0; k.set(f, { cx: p.x + (rnd(i) - 0.5) * 60 * sp, cy: p.y + (rnd(i + 9) - 0.5) * 30 * sp, opacity: ph === 1 ? sp : 0 }); });
        k.set(air, { cx: path(0.7).x, cy: path(0.7).y, r: ph === 2 ? 10 + 110 * ease(pk) : 0, opacity: ph === 2 ? 1 - pk * 0.8 : 0 });
        const cx = 420;
        const cr = ph === 3 ? seg(pk, 0.25, 0.6) : 0, col = ph === 3 ? seg(pk, 0.65, 1) : 0;
        const depth = 70 * cr * (1 - 0.6 * col), width = 110 * cr * (1 + 0.3 * col), peak = 22 * col;
        let d = `M 0 ${gy} L ${cx - width - 20} ${gy}`;
        if (cr > 0) d += ` Q ${cx - width - 8} ${gy - 10 * cr} ${cx - width} ${gy} Q ${cx - width * 0.6} ${gy + depth} ${cx - 10} ${gy + depth} L ${cx} ${gy + depth - peak} L ${cx + 10} ${gy + depth} Q ${cx + width * 0.6} ${gy + depth} ${cx + width} ${gy} Q ${cx + width + 8} ${gy - 10 * cr} ${cx + width + 20} ${gy}`;
        d += ` L ${W} ${gy}`;
        k.set(ground, { d });
        Array.from(ejecta.children).forEach((l, i) => { const a = -Math.PI / 2 + (i - 5.5) * 0.2; const L = 160 * seg(pk, 0.28, 0.7); k.set(l as SVGElement, { x1: cx + Math.cos(a) * width * 0.8, y1: gy, x2: cx + Math.cos(a) * (width + L), y2: gy + Math.sin(a) * L * 0.8, opacity: ph === 3 ? 0.8 * (1 - col) : 0 }); });
        lbl.textContent = ph === 2 ? 'explosión aérea' : ph === 3 && pk > 0.65 ? 'cráter final' : ph === 3 && pk > 0.25 ? 'cráter transitorio y eyecta' : '';
      };
    },
  },
};

// ======================================================================== montaje
const CSS = `
.dg{margin:18px 0 22px;background:#0b0e14;border:1px solid rgba(255,255,255,.06)}
.dg svg{display:block;width:100%;height:auto}
.dg-bar{display:flex;align-items:center;gap:10px;padding:8px 12px;border-top:1px solid rgba(255,255,255,.06)}
.dg-bar button{border:0;background:transparent;color:#8b93a7;font:600 11px Inter,sans-serif;padding:4px 6px;cursor:pointer}
.dg-bar button:hover{color:#fff}
.dg-bar .dg-ph{display:flex;gap:4px}
.dg-bar .dg-ph button{width:22px;height:22px;padding:0;font:600 10px 'JetBrains Mono',monospace;color:#5b6378;box-shadow:inset 0 -2px 0 rgba(255,255,255,.06)}
.dg-bar .dg-ph button.on{color:#fff;box-shadow:inset 0 -2px 0 #ff5a1f}
.dg-leg{margin-left:auto;display:flex;gap:12px;flex-wrap:wrap;font-size:10.5px;color:#8b93a7}
.dg-leg i{display:inline-block;width:8px;height:8px;margin-right:5px;vertical-align:0}
.dg-cap{padding:10px 14px 14px;font-size:13px;line-height:1.55;color:#c9cfdb;min-height:3.2em}
.dg-cap b{color:#fff}
`;

export function mountDiagram(id: DiagramId, host: HTMLElement): { destroy(): void } {
  const def = DEFS[id];
  if (!def) return { destroy() {} };
  if (!document.getElementById('dg-styles')) { const s = document.createElement('style'); s.id = 'dg-styles'; s.textContent = CSS; document.head.append(s); }
  const wrap = document.createElement('div');
  wrap.className = 'dg';
  const svg = document.createElementNS(NS, 'svg') as SVGSVGElement;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = `<defs>
    <filter id="dg-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="dg-u"><stop offset="0" stop-color="#b6ec7f"/><stop offset="1" stop-color="#4f8a2a"/></radialGradient>
    <radialGradient id="dg-fire"><stop offset="0" stop-color="#fffdf0"/><stop offset=".35" stop-color="#ffd27a"/><stop offset=".75" stop-color="#ff7a2a"/><stop offset="1" stop-color="#9c2208"/></radialGradient>
    <radialGradient id="dg-sun"><stop offset="0" stop-color="#fff7d6"/><stop offset=".6" stop-color="#ffb020"/><stop offset="1" stop-color="#ff5a1f" stop-opacity=".2"/></radialGradient>
    <radialGradient id="dg-plume" cx="0.2" cy="0.5" r="0.8"><stop offset="0" stop-color="#d6ff1f" stop-opacity=".9"/><stop offset=".5" stop-color="#4fb83a" stop-opacity=".6"/><stop offset="1" stop-color="#2d7d46" stop-opacity="0"/></radialGradient>
  </defs>`;
  const kit = new Kit(svg);
  const update = def.build(kit);
  const bar = document.createElement('div'); bar.className = 'dg-bar';
  const play = document.createElement('button'); play.type = 'button';
  const restart = document.createElement('button'); restart.type = 'button'; restart.textContent = '↻';
  restart.title = 'Reiniciar';
  const phs = document.createElement('div'); phs.className = 'dg-ph';
  def.phases.forEach((_, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = String(i + 1); b.onclick = () => { ph = i; pt = 0; playing = true; }; phs.append(b); });
  const leg = document.createElement('div'); leg.className = 'dg-leg';
  for (const [n, c] of def.legend ?? []) { const s = document.createElement('span'); s.innerHTML = `<i style="background:${c}"></i>${n}`; leg.append(s); }
  bar.append(play, restart, phs, leg);
  const cap = document.createElement('div'); cap.className = 'dg-cap';
  wrap.append(svg, bar, cap);
  host.append(wrap);

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let ph = 0, pt = 0, t = 0, playing = !reduce, visible = true, raf = 0, last = performance.now();
  const setPlay = () => { play.textContent = playing ? '❚❚ Pausa' : '▶ Reproducir'; };
  play.onclick = () => { playing = !playing; setPlay(); };
  restart.onclick = () => { ph = 0; pt = 0; playing = true; setPlay(); };
  setPlay();
  const io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); });
  io.observe(wrap);
  let lastPh = -1;
  const loop = () => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (visible) {
      if (playing) { t += dt; pt += dt / def.phases[ph].dur; if (pt >= 1) { pt = 0; ph = (ph + 1) % def.phases.length; } }
      const k = reduce && !playing ? 1 : Math.min(1, pt);
      update(t, ph, k);
      if (ph !== lastPh) {
        lastPh = ph;
        cap.innerHTML = `<b>${ph + 1}/${def.phases.length}.</b> ${def.phases[ph].cap}`;
        phs.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === ph));
      }
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return { destroy() { cancelAnimationFrame(raf); io.disconnect(); wrap.remove(); } };
}
