import type { DiagramId } from './types';
import { tr } from '../i18n';

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
  text(x: number, y: number, s: string, a: Attrs = {}, p?: SVGElement) { const t = this.el('text', { x, y, fill: C.muted, 'font-size': 12, 'font-family': 'Inter, sans-serif', ...a }, p); t.textContent = tr(s); return t; }
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

// ======================================================================== utilidades de los esquemas largos
/** reloj continuo del esquema: segundos desde el comienzo de la primera fase */
const clock = (phases: Phase[]) => {
  const st: number[] = [];
  let a = 0;
  for (const p of phases) { st.push(a); a += p.dur; }
  return (ph: number, pk: number) => st[ph] + clamp(pk) * phases[ph].dur;
};
/** Tierra curva de perfil con su atmósfera; devuelve la altura del suelo en cada x */
function earth(k: Kit, cx: number, top: number, R: number, atm = 26, p?: SVGElement) {
  const cy = top + R;
  k.circle(cx, cy, R + atm, 'rgba(125,211,252,0.06)', {}, p);
  k.circle(cx, cy, R + atm * 0.5, 'rgba(125,211,252,0.06)', {}, p);
  k.el('circle', { cx, cy, r: R + atm, fill: 'none', stroke: 'rgba(125,211,252,0.22)', 'stroke-width': 0.8 }, p);
  k.circle(cx, cy, R, '#1b2a20', { stroke: 'rgba(255,255,255,0.25)', 'stroke-width': 1.2 }, p);
  return (x: number, h = 0) => cy - Math.sqrt(Math.max(0, (R + h) ** 2 - (x - cx) ** 2));
}
/** figura humana sencilla de pie sobre (x, y) */
function person(k: Kit, x: number, y: number, color: string = C.text, p?: SVGElement, s = 1) {
  const g = k.g({}, p);
  k.circle(x, y - 21 * s, 3.4 * s, color, {}, g);
  k.path(`M ${x} ${y - 17 * s} L ${x} ${y - 8 * s} M ${x - 5 * s} ${y - 14 * s} L ${x + 5 * s} ${y - 14 * s} M ${x} ${y - 8 * s} L ${x - 4 * s} ${y} M ${x} ${y - 8 * s} L ${x + 4 * s} ${y}`, { stroke: color, 'stroke-width': 1.7, 'stroke-linecap': 'round' }, g);
  return g;
}
/** flecha recta con punta */
function arrow(k: Kit, x1: number, y1: number, x2: number, y2: number, color: string, a: Attrs = {}, p?: SVGElement) {
  const an = Math.atan2(y2 - y1, x2 - x1), s = 7;
  const hx = (d: number) => x2 - Math.cos(an + d) * s, hy = (d: number) => y2 - Math.sin(an + d) * s;
  return k.path(`M ${x1} ${y1} L ${x2} ${y2} M ${hx(0.45)} ${hy(0.45)} L ${x2} ${y2} L ${hx(-0.45)} ${hy(-0.45)}`, { stroke: color, 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...a }, p);
}
let uid = 0;
const MONO = 'JetBrains Mono, monospace';
const RV = '#dfe6ee';
/** silueta genérica de un vehículo de reentrada (cono) apuntando hacia +x */
function cone(k: Kit, decoy: boolean, p?: SVGElement, s = 1) {
  return k.path(`M ${8 * s} 0 L ${-7 * s} ${-4 * s} L ${-7 * s} ${4 * s} Z`, decoy
    ? { fill: 'rgba(139,147,167,0.18)', stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 1.5' }
    : { fill: RV, stroke: 'rgba(0,0,0,0.45)', 'stroke-width': 0.6 }, p);
}
const deg = (r: number) => (r * 180) / Math.PI;

// ------------------------------------------------------------------ fases de los esquemas largos
const MIRV_PH: Phase[] = [
  { cap: 'Al apagarse la última etapa, el misil ya está en el espacio, muy por encima de la atmósfera. De él se separa el «bus» (vehículo posterior a la propulsión), que lleva varias ojivas y señuelos y tiene sus propios motores pequeños.', dur: 4 },
  { cap: 'El bus se orienta, corrige su velocidad y suelta la primera ojiva. Desde ese momento la ojiva ya no tiene motor: cae por inercia hacia el blanco que le ha dado esa maniobra.', dur: 4.5 },
  { cap: 'Repite la maniobra para cada ojiva: cada pequeño cambio de velocidad se traduce en un punto de impacto distinto, a decenas o cientos de kilómetros. Entre ellas suelta señuelos ligeros que en el vacío se mueven exactamente igual.', dur: 5.5 },
  { cap: 'Las ojivas caen en arcos separados hacia blancos distintos. Al entrar en la atmósfera, el rozamiento frena y quema los señuelos, mucho más ligeros, y sólo siguen las ojivas.', dur: 6 },
];
const TRAJ_PH: Phase[] = [
  { cap: 'Fase de propulsión (de 3 a 5 minutos): los motores de varias etapas, que se sueltan al agotarse, aceleran el misil hasta unos 7 km/s y lo sacan de la atmósfera.', dur: 5.5 },
  { cap: 'Fase intermedia (de 20 a 25 minutos): ya sin motores, la carga vuela por inercia en el vacío siguiendo un arco de elipse, como una piedra lanzada. En un vuelo intercontinental el punto más alto, el apogeo, ronda los 1 200 km.', dur: 7 },
  { cap: 'Reentrada (alrededor de un minuto): la ojiva vuelve a la atmósfera a más de 20 veces la velocidad del sonido. El aire comprimido ante ella se calienta a miles de grados y brilla; un escudo térmico la protege hasta el impacto.', dur: 5.5 },
  { cap: 'En total, unos 30 minutos para unos 10 000 km. Cada fase ofrece a la defensa antimisiles una oportunidad distinta, y ninguna es fácil. (La escala vertical está exagerada.)', dur: 6 },
];
const ABM_PH: Phase[] = [
  { cap: 'Detección: los satélites de alerta temprana ven en infrarrojo el calor de los motores en el mismo instante del lanzamiento; después, grandes radares en tierra siguen cada objeto en vuelo.', dur: 4.5 },
  { cap: 'Primera capa, en la propulsión: el misil es grande, brillante y aún lleva todas sus ojivas, pero el interceptor tiene que estar muy cerca del lugar de lanzamiento y actuar en pocos minutos. Aquí uno es destruido.', dur: 4.5 },
  { cap: 'Segunda capa, en el espacio: un vehículo de choque destruye una ojiva por impacto directo, como una bala que acierta a otra bala. Pero en el vacío un señuelo ligero se mueve igual que una ojiva, y otro interceptor se gasta en él.', dur: 7 },
  { cap: 'Tercera capa, en la reentrada: interceptores de corto alcance actúan en los últimos segundos. La atmósfera ya ha frenado los señuelos, pero queda muy poco tiempo. Uno acierta; otro falla.', dur: 5 },
  { cap: 'Una ojiva llega a su blanco. Cada capa sólo tiene cierta probabilidad de éxito, y el atacante puede saturar la defensa con más ojivas y señuelos que interceptores: ningún escudo es hermético.', dur: 6 },
];
const SHELTER_PH: Phase[] = [
  { cap: 'La lluvia radiactiva cae como un polvo fino y se posa sobre tejados, calles y jardines. El mayor peligro no es tocarla, sino la radiación gamma que emite desde donde se ha depositado.', dur: 5.5 },
  { cap: 'El factor de protección (FP) dice cuántas veces menos dosis se recibe que al aire libre. Fuera, sin nada en medio, es 1. En la planta baja de una casa de madera, las paredes ligeras apenas la reducen a la mitad o a un tercio.', dur: 6.5 },
  { cap: 'Lo que protege es la masa y la distancia. En un sótano, la tierra que lo rodea absorbe casi toda la radiación (FP 10–20). En el centro de las plantas intermedias de un gran edificio, lejos del tejado y del suelo contaminados, el FP llega a 50–100 o más.', dur: 7.5 },
  { cap: 'Un refugio enterrado bajo un metro o más de tierra alcanza un FP de 1000: dentro se recibe una milésima parte. Como la radiactividad cae muy deprisa (regla del 7-10), quedarse dentro las primeras 24–48 horas evita la mayor parte de la dosis.', dur: 7 },
];
const DISP_PH: Phase[] = [
  { cap: 'La nube sube y arrastra miles de toneladas de polvo y restos del suelo, que se mezclan con los productos radiactivos. En pocos minutos alcanza su altura final, a menudo por encima de los 10 km.', dur: 4.5 },
  { cap: 'El viento casi nunca es igual a todas las alturas: suele ser más fuerte arriba y cambia de dirección. Cada partícula se mueve con el viento de la capa por la que va pasando mientras cae.', dur: 5.5 },
  { cap: 'Las partículas gruesas, como granos de arena, caen en la primera hora cerca del punto cero. Las finas tardan horas o días y viajan cientos de kilómetros. La lluvia arrastra al suelo las que atraviesa y crea un «punto caliente» lejos de la explosión.', dur: 6.5 },
  { cap: 'Resultado: una mancha alargada en la dirección del viento, más intensa cerca del origen y con puntos calientes donde llovió. Su forma depende del viento de cada capa, y por eso se pronostica con datos meteorológicos.', dur: 6 },
];
const WINTER_PH: Phase[] = [
  { cap: 'En una guerra nuclear a gran escala arderían a la vez cientos de ciudades: incendios gigantescos que crean su propio viento y queman edificios, combustibles y plásticos.', dur: 4.5 },
  { cap: 'El calor levanta nubes de tormenta de fuego (pirocúmulos) que suben el humo negro, rico en hollín, por encima de las nubes, hasta la estratosfera. Allí no llueve, y el humo puede permanecer años.', dur: 5.5 },
  { cap: 'En unas semanas, los vientos de la estratosfera extienden el humo alrededor de todo el planeta. El hollín absorbe la luz del Sol, se calienta y sube aún más.', dur: 5.5 },
  { cap: 'Llega mucha menos luz al suelo: según los modelos climáticos, la temperatura media caería varios grados en pocos meses, con heladas en pleno verano. La estación de cultivo se acortaría y fallarían cosechas en todo el mundo; el hambre sería la mayor amenaza.', dur: 7.5 },
];
const FLASH_PH: Phase[] = [
  { cap: 'El destello llega en el acto: la luz recorre 10 km en unas tres cienmilésimas de segundo. Los tres observadores lo ven a la vez, aunque estén a distancias muy distintas.', dur: 3.5 },
  { cap: 'El calor también viaja a la velocidad de la luz, pero el pulso dura unos segundos (más cuanto mayor es la explosión) y es mucho más intenso cerca.', dur: 4 },
  { cap: 'La onda de choque y el estruendo van mucho más despacio: unos 343 m/s a ras de suelo (algo más deprisa muy cerca de la explosión). A 3 km llegan a los 9 segundos y revientan los cristales.', dur: 5.5 },
  { cap: 'A 10 km tardan unos 29 segundos: tiempo de sobra para apartarse de las ventanas y echarse al suelo, porque muchas heridas se deben a cristales rotos.', dur: 6 },
  { cap: 'A 20 km, casi un minuto. Como con un rayo: los segundos entre el destello y el estruendo, multiplicados por 0,343, dan la distancia en kilómetros.', dur: 6 },
];

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
        k.set(counter, {}); counter.textContent = tr(`generación ${g} · ${Math.pow(3, g - 1)} fisiones`);
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
        fl.textContent = tr(ph === 1 ? 'la sombra del muro protege lo que hay detrás' : ph === 0 ? 'la luz y el calor llegan en el acto' : '');
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
        lbl.textContent = tr(ph === 2 ? 'explosión aérea' : ph === 3 && pk > 0.65 ? 'cráter final' : ph === 3 && pk > 0.25 ? 'cráter transitorio y eyecta' : '');
      };
    },
  },

  // ------------------------------------------------------------------ MIRV
  mirv: {
    legend: [['Ojiva', RV], ['Señuelo', C.muted], ['Trayectoria', C.electron], ['Calor de reentrada', C.gamma]],
    phases: MIRV_PH,
    build(k) {
      const T = clock(MIRV_PH);
      const gy = earth(k, 360, 330, 1500);
      k.text(18, 30, 'espacio', { fill: C.faint, 'font-size': 11 });
      k.text(18, gy(18) - 8, 'atmósfera', { fill: C.electron, 'font-size': 11, opacity: 0.75 });
      const busX = (t: number) => 60 + 27 * Math.max(0, t - 0.2);
      const busY = (x: number) => 100 + 0.00035 * (x - 260) ** 2;
      const SC = 1.3;
      const arcs = k.g(), marks = k.g();
      // última etapa y bus
      const stage = k.g();
      k.rect(-60, -13, 40, 26, '#48515b', { stroke: 'rgba(255,255,255,0.3)', rx: 2 }, stage);
      k.path('M -60 -8 L -68 -11 L -68 11 L -60 8 Z', { fill: '#3a4048', stroke: 'rgba(255,255,255,0.25)' }, stage);
      const plume = k.path('M -68 -6 L -98 0 L -68 6 Z', { fill: C.explosive, stroke: 'none', filter: 'url(#dg-glow)' }, stage);
      const bus = k.g();
      k.rect(-18, -26, 20, 52, '#5b6673', { stroke: 'rgba(255,255,255,0.35)', rx: 3 }, bus);
      k.rect(-22, -5, 4, 10, '#3a4048', {}, bus);
      k.line(-8, -26, -8, -33, 'rgba(255,255,255,0.4)', {}, bus);
      // ojivas (rv) y señuelos: [ojiva, posición en el bus, suelta, blanco, llegada]
      const spec: [boolean, number, number, number, number][] = [[true, -18, 6.6, 430, 15.4], [false, -9, 8.1, 478, 16.4], [true, 0, 9.6, 515, 16.8], [false, 9, 11.0, 572, 17.8], [true, 18, 12.4, 612, 18.4]];
      const items = spec.map(([rv, slot, tRel, tx, tl]) => {
        const bx = busX(tRel);
        const x0 = bx + 8 * SC, y0 = busY(bx) + slot * SC, y2 = gy(tx);
        const pos = (p: number) => ({ x: lerp(x0, tx, p), y: y0 + (y2 - y0) * p * p });
        let pAtm = 1;
        for (let p = 0; p <= 1; p += 0.002) { const q = pos(p); if (q.y >= gy(q.x) - 26) { pAtm = p; break; } }
        let d = '';
        for (let i = 0; i <= 40; i++) { const q = pos((i / 40) * (rv ? 1 : pAtm)); d += `${i ? 'L' : 'M'} ${q.x.toFixed(1)} ${q.y.toFixed(1)} `; }
        const arc = k.path(d, { stroke: rv ? C.electron : C.muted, 'stroke-dasharray': '3 5', opacity: 0 }, arcs);
        let mark: SVGGElement | null = null, flash: SVGCircleElement | null = null;
        if (rv) {
          mark = k.g({}, marks);
          k.el('circle', { cx: tx, cy: y2, r: 6, fill: 'none', stroke: C.proton, 'stroke-width': 1.4 }, mark);
          k.line(tx - 10, y2, tx + 10, y2, C.proton, {}, mark); k.line(tx, y2 - 10, tx, y2 + 10, C.proton, {}, mark);
          flash = k.circle(tx, y2, 4, C.gamma, { opacity: 0, filter: 'url(#dg-glow)' });
        }
        const puff = k.circle(0, 0, 3, 'rgba(220,230,240,0.8)', { opacity: 0 });
        return { rv, slot, tRel, tx, tl, x0, y0, y2, pos, pAtm, arc, mark, flash, puff, g: null as unknown as SVGGElement, glow: null as unknown as SVGCircleElement };
      });
      for (const it of items) { it.g = k.g(); it.glow = k.circle(-3, 0, 8, C.gamma, { opacity: 0, filter: 'url(#dg-glow)' }, it.g); cone(k, !it.rv, it.g, SC); }
      // rótulos
      const lBus = k.g(); k.label(-10, -43, 26, -66, 'bus con ojivas y señuelos', C.text, lBus);
      const lStage = k.text(0, 0, 'última etapa, ya agotada', { 'text-anchor': 'middle', 'font-size': 11 });
      const lRv = k.text(0, 0, 'ojiva', { fill: RV, 'font-size': 11 });
      const lDc = k.text(0, 0, 'señuelo', { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle' });
      const q1 = items[1].pos(items[1].pAtm);
      const lBurn = k.text(q1.x - 14, q1.y - 16, 'los señuelos frenan y se queman', { fill: C.gamma, 'font-size': 11, 'text-anchor': 'end' });
      const lTg = k.text(520, gy(520) + 28, 'tres blancos distintos', { fill: C.proton, 'font-size': 11, 'text-anchor': 'middle' });
      return (_t, ph, pk) => {
        const t = T(ph, pk);
        const bx = busX(t), by = busY(bx);
        k.tr(bus, bx, by, SC); k.op(bus, 1 - seg(t, 14.5, 16));
        k.tr(lBus, bx, by, 1); k.op(lBus, seg(t, 0.4, 1) * (1 - seg(t, 7.5, 8.3)));
        const ts = Math.max(0, t - 1.2);
        const sx = bx - ts * 15, sy = busY(bx) + ts * ts * 1.4;
        k.tr(stage, sx, sy, SC, ts * 9); k.op(stage, 1 - seg(t, 3.2, 5.5));
        k.op(plume, (1 - seg(t, 0, 0.9)) * (0.75 + 0.25 * Math.sin(t * 40)));
        k.set(lStage, { x: Math.max(80, sx - 50), y: sy + 44 }); k.op(lStage, seg(t, 1.6, 2.2) * (1 - seg(t, 3.6, 4.4)));
        items.forEach((it, i) => {
          let x: number, y: number, ang = 0, o = 1, glow = 0;
          if (t < it.tRel) { x = bx + 8 * SC; y = by + it.slot * SC; o = 1 - seg(t, 14.5, 16); }
          else {
            let p = clamp((t - it.tRel) / (it.tl - it.tRel));
            if (!it.rv && p > it.pAtm) { const ex = p - it.pAtm; p = it.pAtm + ex * 0.15; o = 1 - clamp(ex / 0.12); glow = o * 0.9; }
            const q = it.pos(p); x = q.x; y = q.y;
            ang = deg(Math.atan2(2 * (it.y2 - it.y0) * p, it.tx - it.x0));
            if (it.rv) { if (y >= gy(x) - 26) glow = 0.9; if (p >= 1) o = 0; }
          }
          k.tr(it.g, x, y, 1, ang); k.op(it.g, o); k.op(it.glow, glow * (0.8 + 0.2 * Math.sin(t * 30 + i)));
          k.op(it.arc, t >= it.tRel ? 0.6 * seg(t, it.tRel, it.tRel + 0.6) : 0);
          if (it.mark) k.op(it.mark, seg(t, it.tRel - 0.9, it.tRel - 0.3));
          if (it.flash) { const u = clamp((t - it.tl) / 1.3); k.set(it.flash, { r: 4 + 22 * u, opacity: t >= it.tl ? 1 - u : 0 }); }
          const pu = clamp((t - (it.tRel - 0.9)) / 0.8);
          k.set(it.puff, { cx: bx - 30 - 12 * pu, cy: by + (i % 2 ? 10 : -10) - 4 * pu, r: 2 + 6 * pu, opacity: t > it.tRel - 0.9 && t < it.tRel - 0.1 ? 0.8 * (1 - pu) : 0 });
          if (i === 0) { k.set(lRv, { x: x + 12, y: y - 10 }); k.op(lRv, seg(t, it.tRel + 0.4, it.tRel + 1) * (1 - seg(t, 11.5, 12.2))); }
          if (i === 1) { k.set(lDc, { x, y: y + 20 }); k.op(lDc, seg(t, it.tRel + 0.4, it.tRel + 1) * (1 - seg(t, 12.6, 13.3))); }
        });
        k.op(lBurn, seg(t, 14.6, 15.2) * (1 - seg(t, 19.3, 20)));
        k.op(lTg, seg(t, 12.2, 13));
      };
    },
  },

  // ------------------------------------------------------------------ trayectoria balística
  trajectory: {
    legend: [['Propulsión', C.explosive], ['Fase intermedia', C.electron], ['Reentrada', C.gamma]],
    phases: TRAJ_PH,
    build(k) {
      const gy = earth(k, 360, 330, 1400, 24);
      k.text(18, 30, 'espacio', { fill: C.faint, 'font-size': 11 });
      k.text(250, gy(250) - 8, 'atmósfera (≈ 100 km)', { fill: C.electron, 'font-size': 11, 'text-anchor': 'middle', opacity: 0.8 });
      const w = (u: number) => u - 0.85 * u * Math.exp(-u / 0.03);
      const P = (u: number) => { const x = 50 + 620 * w(u); return { x, y: gy(x) - 262 * (1 - (2 * u - 1) ** 2) }; };
      const pathD = (a: number, b: number) => { let d = ''; const n = Math.max(2, Math.ceil((b - a) * 220)); for (let i = 0; i <= n; i++) { const q = P(lerp(a, b, i / n)); d += `${i ? 'L' : 'M'} ${q.x.toFixed(1)} ${q.y.toFixed(1)} `; } return d; };
      const U1 = 0.065, U2 = 0.9765;
      k.path(pathD(0, 1), { stroke: 'rgba(255,255,255,0.16)', 'stroke-dasharray': '3 5' });
      const trB = k.path('', { stroke: C.explosive, 'stroke-width': 2.4 });
      const trM = k.path('', { stroke: C.electron, 'stroke-width': 1.8 });
      const trR = k.path('', { stroke: C.gamma, 'stroke-width': 2.6, filter: 'url(#dg-glow)' });
      // lugares
      const L0 = P(0), L1 = P(1);
      k.path(`M ${L0.x - 6} ${L0.y + 1} L ${L0.x} ${L0.y - 8} L ${L0.x + 6} ${L0.y + 1} Z`, { fill: C.steel, stroke: 'none' });
      k.text(L0.x, L0.y + 20, 'lanzamiento', { 'text-anchor': 'middle', 'font-size': 11 });
      k.el('circle', { cx: L1.x, cy: L1.y, r: 5, fill: 'none', stroke: C.proton, 'stroke-width': 1.4 });
      k.text(L1.x, L1.y + 20, 'blanco', { 'text-anchor': 'middle', 'font-size': 11, fill: C.proton });
      k.text(360, 392, 'alcance ≈ 10 000 km', { fill: C.faint, 'text-anchor': 'middle', 'font-size': 11 });
      // apogeo y rótulos de cada fase
      const A = P(0.5);
      const apo = k.g();
      k.line(A.x, A.y + 8, A.x, gy(A.x) - 2, 'rgba(255,255,255,0.3)', { 'stroke-dasharray': '2 4' }, apo);
      k.text(A.x + 8, 196, 'apogeo ≈ 1 200 km', { fill: C.text }, apo);
      const lB = k.text(98, 344, 'propulsión · 3–5 min', { fill: C.explosive, 'font-size': 11 });
      const lM = k.text(A.x, A.y - 14, 'fase intermedia · 20–25 min', { fill: C.electron, 'font-size': 11, 'text-anchor': 'middle' });
      const lR = k.text(626, 322, 'reentrada · ≈ 1 min', { fill: C.gamma, 'font-size': 11, 'text-anchor': 'end' });
      const dots = [U1, U2].map((u) => { const q = P(u); return k.circle(q.x, q.y, 3, C.text, { opacity: 0 }); });
      const total = k.text(706, 82, '≈ 30 min para ≈ 10 000 km', { fill: C.gamma, 'font-size': 15, 'font-weight': 700, 'text-anchor': 'end', 'font-family': MONO });
      const clk = k.text(706, 36, '', { fill: C.text, 'font-size': 20, 'font-weight': 700, 'text-anchor': 'end', 'font-family': MONO });
      k.text(706, 54, 'tiempo de vuelo', { fill: C.faint, 'font-size': 11, 'text-anchor': 'end' });
      // misil (apunta hacia +x)
      const mis = k.g();
      const s1 = k.g({}, mis); k.rect(-30, -4.5, 18, 9, '#9aa4b0', { rx: 1 }, s1);
      const pl1 = k.path('', { fill: C.explosive, stroke: 'none', filter: 'url(#dg-glow)' }, s1);
      const s2 = k.g({}, mis); k.rect(-12, -3.8, 12, 7.6, '#b6bec8', { rx: 1 }, s2);
      const pl2 = k.path('', { fill: C.explosive, stroke: 'none', filter: 'url(#dg-glow)' }, s2);
      const busR = k.rect(0, -3.2, 6, 6.4, '#5b6673', {}, mis);
      const heat = k.circle(9, 0, 8, C.gamma, { opacity: 0, filter: 'url(#dg-glow)' }, mis);
      k.path('M 6 -3.2 L 16 0 L 6 3.2 Z', { fill: RV, stroke: 'rgba(0,0,0,0.4)', 'stroke-width': 0.6 }, mis);
      // etapas sueltas
      const mkDrop = (x: number, w0: number, h0: number, c: string) => { const g = k.g(); k.rect(x, -h0 / 2, w0, h0, c, { rx: 1 }, g); return g; };
      const d1 = mkDrop(-30, 18, 9, '#9aa4b0'), d2 = mkDrop(-12, 12, 7.6, '#b6bec8');
      const flash = k.circle(L1.x, L1.y, 4, C.gamma, { opacity: 0, filter: 'url(#dg-glow)' });
      const uAt = (ph: number, pk: number) => ph === 0 ? U1 * Math.pow(pk, 1.7) : ph === 1 ? lerp(U1, 0.93, pk) : ph === 2 ? (pk < 0.35 ? lerp(0.93, U2, pk / 0.35) : pk < 0.85 ? lerp(U2, 1, (pk - 0.35) / 0.5) : 1) : 1;
      const minAt = (ph: number, pk: number) => ph === 0 ? 4 * pk : ph === 1 ? lerp(4, 27.5, pk) : ph === 2 ? (pk < 0.35 ? lerp(27.5, 29, pk / 0.35) : pk < 0.85 ? lerp(29, 30, (pk - 0.35) / 0.5) : 30) : 30;
      const angAt = (u: number) => { const a = P(Math.min(u, 0.999)), b = P(Math.min(u, 0.999) + 0.001); return deg(Math.atan2(b.y - a.y, b.x - a.x)); };
      const drop = (g: SVGGElement, ts: number, t: number) => {
        if (t < ts) { k.op(g, 0); return; }
        const u = U1 * Math.pow(ts / 5.5, 1.7), q = P(u), a = angAt(u), dt = t - ts, r = (a * Math.PI) / 180;
        k.tr(g, q.x - Math.cos(r) * 8 * dt, q.y - Math.sin(r) * 8 * dt + 5 * dt * dt, 1, a + 30 * dt); k.op(g, 1 - clamp(dt / 1.6));
      };
      return (t, ph, pk) => {
        const u = uAt(ph, pk), q = P(u), a = angAt(u);
        const ta = ph === 0 ? pk * 5.5 : 99;
        const on = ph < 2 || (ph === 2 && pk < 0.85);
        k.tr(mis, q.x, q.y, 1, a); k.op(mis, on ? 1 : 0);
        k.op(s1, ta < 2.6 ? 1 : 0); k.op(s2, ta < 4.9 ? 1 : 0); k.op(busR, ph >= 2 ? 0 : 1);
        const fl = (x0: number) => `M ${x0} -3 L ${x0 - 16 - 8 * rnd(Math.floor(t * 30))} 0 L ${x0} 3 Z`;
        k.set(pl1, { d: fl(-30) }); k.set(pl2, { d: ta >= 2.6 && ta < 4.9 ? fl(-12) : '' });
        drop(d1, 2.6, ta === 99 ? 9 : ta); drop(d2, 4.9, ta === 99 ? 9 : ta);
        k.op(heat, ph === 2 && u > U2 ? 0.75 + 0.25 * Math.sin(t * 35) : 0);
        k.set(trB, { d: pathD(0, Math.min(u, U1)) });
        k.set(trM, { d: u > U1 ? pathD(U1, Math.min(u, U2)) : '' });
        k.set(trR, { d: u > U2 ? pathD(U2, u) : '' });
        k.op(apo, ph === 1 ? seg(pk, 0.45, 0.6) : ph > 1 ? 1 : 0);
        k.op(lB, ph === 0 ? seg(pk, 0.25, 0.45) : 1);
        k.op(lM, ph === 1 ? seg(pk, 0.2, 0.35) : ph > 1 ? 1 : 0);
        k.op(lR, ph === 2 ? seg(pk, 0.4, 0.55) : ph > 2 ? 1 : 0);
        k.op(dots[0], u >= U1 ? 1 : 0); k.op(dots[1], u >= U2 ? 1 : 0);
        k.op(total, ph === 3 ? seg(pk, 0.05, 0.25) : 0);
        const uf = ph === 2 ? clamp((pk - 0.85) / 0.15) : ph === 3 ? 1 + pk : 0;
        k.set(flash, { r: 4 + 24 * Math.min(1, uf), opacity: uf > 0 ? Math.max(0, 1 - Math.max(0, uf - 0.6) / 1.2) : 0 });
        const m = minAt(ph, pk), mm = Math.floor(m), ss = Math.floor((m - mm) * 60);
        clk.textContent = `T + ${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
      };
    },
  },

  // ------------------------------------------------------------------ defensa antimisiles
  abm: {
    legend: [['Ojiva', RV], ['Señuelo', C.muted], ['Interceptor', C.fusion], ['Destrucción', C.gamma]],
    phases: ABM_PH,
    build(k) {
      const T = clock(ABM_PH);
      const ATM = 34;
      const gy = earth(k, 360, 335, 1500, ATM);
      k.text(250, gy(250) - 12, 'atmósfera', { fill: C.electron, 'font-size': 11, opacity: 0.75, 'text-anchor': 'middle' });
      const w = (u: number) => u - 0.8 * u * Math.exp(-u / 0.03);
      const uOf = (tp: number) => tp <= 0 ? 0 : tp < 6 ? 0.1 * Math.pow(tp / 6, 1.5) : tp < 15.5 ? 0.1 + (0.75 * (tp - 6)) / 9.5 : Math.min(1, 0.85 + (0.15 * (tp - 15.5)) / 4.5);
      const fly = (lx: number, tx: number) => (u: number) => { const x = lerp(lx, tx, w(u)); return { x, y: gy(x) - 920 * u * (1 - u) }; };
      // tierra: radar, silos, ciudad, batería terminal
      const ground = k.g();
      const rx = 495;
      k.path(`M ${rx - 11} ${gy(rx)} A 11 11 0 0 1 ${rx + 11} ${gy(rx)} Z`, { fill: '#7a8794', stroke: 'rgba(255,255,255,0.4)', 'stroke-width': 0.8 }, ground);
      for (const sx of [540, 552]) k.rect(sx - 3, gy(sx) - 2, 6, 6, '#2b3a30', { stroke: C.fusion, 'stroke-width': 0.8 }, ground);
      for (let i = 0; i < 9; i++) { const x = 588 + i * 9, hh = 8 + rnd(i + 40) * 16; k.rect(x, gy(x) - hh, 7, hh + 3, '#59616b', {}, ground); }
      k.path(`M 686 ${gy(686)} l 4 -9 l 4 0 l 4 9 Z`, { fill: '#7a8794', stroke: C.fusion, 'stroke-width': 0.8 }, ground);
      k.text(rx - 4, gy(rx) + 18, 'radar', { 'text-anchor': 'middle', 'font-size': 10.5 }, ground);
      k.text(550, gy(550) + 18, 'interceptores', { 'text-anchor': 'middle', 'font-size': 10.5 }, ground);
      k.text(624, gy(624) + 18, 'ciudad', { 'text-anchor': 'middle', 'font-size': 10.5 }, ground);
      k.text(712, 398, 'defensa terminal', { 'text-anchor': 'end', 'font-size': 10.5 }, ground);
      // satélite y su cono infrarrojo
      const satX = 300, satY = 36;
      const cone0 = k.path(`M ${satX} ${satY + 6} L 20 ${gy(20) - 4} L 150 ${gy(150) - 4} Z`, { fill: 'rgba(255,107,94,0.07)', stroke: C.proton, 'stroke-dasharray': '3 4', 'stroke-width': 0.8, opacity: 0 });
      const sat = k.g();
      k.rect(satX - 26, satY - 3, 18, 6, '#2d4f7c', { stroke: '#5b8fd0', 'stroke-width': 0.8 }, sat);
      k.rect(satX + 8, satY - 3, 18, 6, '#2d4f7c', { stroke: '#5b8fd0', 'stroke-width': 0.8 }, sat);
      k.rect(satX - 6, satY - 5, 12, 10, '#9aa4b0', {}, sat);
      k.text(satX + 34, satY + 4, 'satélite de alerta (infrarrojo)', { 'font-size': 11 }, sat);
      const beams = k.g();
      const header = k.text(18, 28, '', { fill: C.text, 'font-size': 13, 'font-weight': 700 });
      // objetos: misiles (cuerpo con llama) y lo que sueltan
      type Ob = { kind: 'm' | 'w' | 'd'; lt: number; path: (u: number) => { x: number; y: number }; kill: number; burn: boolean; g: SVGGElement; glow?: SVGCircleElement; plume?: SVGPathElement; ring?: SVGCircleElement };
      const mk = (kind: 'm' | 'w' | 'd', lx: number, lt: number, tx: number, kill = 99, burn = false): Ob => {
        const g = k.g();
        const o: Ob = { kind, lt, path: fly(lx, tx), kill, burn, g };
        if (kind === 'm') {
          o.plume = k.path('', { fill: C.explosive, stroke: 'none', filter: 'url(#dg-glow)' }, g);
          k.rect(-12, -3, 18, 6, '#9aa4b0', { rx: 1 }, g); k.path('M 6 -3 L 12 0 L 6 3 Z', { fill: RV }, g);
          o.ring = k.circle(0, 0, 12, 'none', { stroke: C.proton, 'stroke-width': 1.2, opacity: 0 }, g);
        } else { o.glow = k.circle(-3, 0, 6, C.gamma, { opacity: 0, filter: 'url(#dg-glow)' }, g); cone(k, kind === 'd', g, 1.05); }
        return o;
      };
      const mA = mk('m', 40, 0.8, 600, 6.6), mB = mk('m', 75, 1.2, 610), mC = mk('m', 110, 1.6, 648);
      const W1 = mk('w', 75, 1.2, 590, 11.6), W2 = mk('w', 75, 1.2, 628, 20.45), D1 = mk('d', 75, 1.2, 609, 13.3);
      const W3 = mk('w', 110, 1.6, 655), D2 = mk('d', 110, 1.6, 640, 99, true);
      const obs = [mA, mB, mC, W1, W2, D1, W3, D2];
      const at = (o: Ob, t: number) => o.path(uOf(t - o.lt));
      // interceptores
      type In = { sx: number; lt: number; th: number; tgt: Ob; miss: boolean; S: { x: number; y: number }; I: { x: number; y: number }; Cc: { x: number; y: number }; dot: SVGCircleElement; trail: SVGPathElement };
      const ints: In[] = ([[215, 4.9, 6.6, mA, false], [540, 8.6, 11.6, W1, false], [552, 10.4, 13.3, D1, false], [690, 19.2, 20.45, W2, false], [694, 19.5, 20.75, W3, true]] as [number, number, number, Ob, boolean][]).map(([sx, lt, th, tgt, miss]) => {
        const S = { x: sx, y: gy(sx) }, p = at(tgt, th), I = miss ? { x: p.x + 10, y: p.y - 14 } : p;
        const Cc = { x: lerp(sx, I.x, 0.1), y: lerp(S.y, I.y, 0.8) };
        return { sx, lt, th, tgt, miss, S, I, Cc, trail: k.path('', { stroke: C.fusion, 'stroke-width': 1.2, opacity: 0 }), dot: k.circle(0, 0, 3, C.fusion, { filter: 'url(#dg-glow)', opacity: 0 }) };
      });
      const bez = (n: In, s: number) => ({ x: (1 - s) ** 2 * n.S.x + 2 * (1 - s) * s * n.Cc.x + s * s * n.I.x, y: (1 - s) ** 2 * n.S.y + 2 * (1 - s) * s * n.Cc.y + s * s * n.I.y });
      // explosiones de los impactos y restos
      const hits = ints.filter((n) => !n.miss).map((n) => ({ t: n.th, x: n.I.x, y: n.I.y, fl: k.circle(n.I.x, n.I.y, 3, C.gamma, { opacity: 0, filter: 'url(#dg-glow)' }), deb: Array.from({ length: 6 }, () => k.circle(0, 0, 1.4, '#c9d1dc', { opacity: 0 })) }));
      const W3end = W3.path(1);
      const boom = k.circle(W3end.x, W3end.y, 4, 'url(#dg-fire)', { opacity: 0, filter: 'url(#dg-glow)' });
      // rótulos de los sucesos
      const ev = ([[ints[0].I, 'destruido en la propulsión', 6.6, 1], [ints[1].I, 'impacto directo', 11.6, 1], [ints[2].I, 'era un señuelo', 13.3, -1], [ints[3].I, 'interceptada', 20.45, -1], [ints[4].I, 'fallo', 20.75, 1]] as [{ x: number; y: number }, string, number, number][]).map(([p, s, t0, side]) => ({ t0, el: k.text(p.x + side * 10, p.y - 12, s, { fill: C.text, 'font-size': 11, 'text-anchor': side > 0 ? 'start' : 'end' }) }));
      const pD2 = D2.path(0.955);
      const evBurn = k.text(pD2.x - 12, pD2.y - 18, 'el señuelo frena y se quema', { fill: C.gamma, 'font-size': 11, 'text-anchor': 'end' });
      const score = k.g();
      k.text(706, 28, '5 interceptores · 4 ojivas', { fill: C.text, 'font-size': 12, 'text-anchor': 'end', 'font-family': MONO }, score);
      k.text(706, 46, '3 destruidas · 1 llega', { fill: C.gamma, 'font-size': 12, 'text-anchor': 'end', 'font-family': MONO, 'font-weight': 700 }, score);
      const HEAD = ['Detección', 'Capa 1 · fase de propulsión', 'Capa 2 · fase intermedia, en el espacio', 'Capa 3 · fase terminal, en la atmósfera', 'Resultado'];
      return (t, ph, pk) => {
        const tt = T(ph, pk);
        header.textContent = tr(HEAD[ph]); k.op(header, seg(pk, 0, 0.15));
        k.op(cone0, ph <= 1 ? (0.6 + 0.4 * Math.sin(t * 5)) * (ph === 0 ? seg(pk, 0.15, 0.35) : 1 - seg(pk, 0.6, 1)) : 0);
        while (beams.firstChild) beams.firstChild.remove();
        for (const o of obs) {
          const tp = tt - o.lt, u = uOf(tp), p = o.path(u);
          let vis = tp > 0 && tt < o.kill;
          if (o.kind === 'm') vis = vis && (o === mA || u < 0.1);
          else vis = vis && u >= 0.1 && u < 1;
          let x = p.x, y = p.y, op = vis ? 1 : 0;
          if (o.burn && u > 0.955) { const b = o.path(0.955 + (u - 0.955) * 0.25); x = b.x; y = b.y; op *= 1 - clamp((u - 0.955) / 0.03); }
          const q = o.path(Math.min(0.999, u + 0.002));
          k.tr(o.g, x, y, 1, deg(Math.atan2(q.y - p.y, q.x - p.x))); k.op(o.g, op);
          if (o.plume) k.set(o.plume, { d: `M -12 -2.5 L ${-24 - 7 * rnd(Math.floor(t * 30) + o.lt * 10)} 0 L -12 2.5 Z` });
          if (o.ring) k.op(o.ring, ph === 0 ? seg(pk, 0.35, 0.5) * (0.5 + 0.5 * Math.sin(t * 8)) : 0);
          if (o.glow) k.op(o.glow, y > gy(x) - ATM ? 0.9 : 0);
          if (op > 0.3 && ph >= 1 && ph <= 3 && o.kind !== 'm') k.line(rx, gy(rx) - 11, x, y, C.fusion, { 'stroke-dasharray': '2 5', opacity: 0.22, 'stroke-width': 0.8 }, beams);
        }
        for (const n of ints) {
          const s = clamp((tt - n.lt) / (n.th - n.lt));
          const se = Math.pow(s, 1.25);
          let p = bez(n, se);
          let d = '';
          for (let i = 0; i <= 24; i++) { const b = bez(n, (se * i) / 24); d += `${i ? 'L' : 'M'} ${b.x.toFixed(1)} ${b.y.toFixed(1)} `; }
          if (n.miss && tt > n.th) { const ex = (tt - n.th) * 1.0, b = bez(n, 0.98); p = { x: n.I.x + (n.I.x - b.x) * 50 * ex, y: n.I.y + (n.I.y - b.y) * 50 * ex }; d += `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`; }
          const live = tt >= n.lt && (tt < n.th || (n.miss && tt < n.th + 1.2));
          k.set(n.dot, { cx: p.x, cy: p.y, opacity: live ? 1 : 0 });
          k.set(n.trail, { d, opacity: tt < n.lt ? 0 : 0.65 * (1 - seg(tt, n.th + 0.5, n.th + 2.5)) });
        }
        for (const h of hits) {
          const u = (tt - h.t) / 0.9;
          k.set(h.fl, { r: 3 + 16 * clamp(u), opacity: u >= 0 && u <= 1 ? 1 - u : 0 });
          h.deb.forEach((c, i) => { const a = (i / 6) * Math.PI * 2 + 0.4, e = clamp((tt - h.t) / 1.8); k.set(c, { cx: h.x + Math.cos(a) * 18 * e, cy: h.y + Math.sin(a) * 12 * e + 14 * e * e, opacity: tt >= h.t ? 1 - e : 0 }); });
        }
        const ub = clamp((tt - 21.6) / 1.4);
        k.set(boom, { r: 4 + 30 * ub, opacity: tt >= 21.6 ? 1 - Math.max(0, (tt - 22.4) / 3.6) : 0 });
        for (const e of ev) k.op(e.el, seg(tt, e.t0, e.t0 + 0.3) * (1 - seg(tt, e.t0 + 3, e.t0 + 3.6)));
        k.op(evBurn, seg(tt, 19.6, 20) * (1 - seg(tt, 23, 23.6)));
        k.op(score, ph === 4 ? seg(pk, 0.2, 0.35) : 0);
        k.op(sat, 1); k.op(ground, 1);
      };
    },
  },

  // ------------------------------------------------------------------ refugio y factor de protección
  shelter: {
    legend: [['Polvo radiactivo', C.uranium], ['Rayos gamma', C.gamma], ['Factor de protección (FP)', C.fusion]],
    phases: SHELTER_PH,
    build(k) {
      const T = clock(SHELTER_PH);
      const gy = 285;
      k.rect(0, gy, W, H - gy, 'rgba(58,51,43,0.55)');
      k.line(0, gy, W, gy, 'rgba(255,255,255,0.25)');
      // casa de madera con sótano
      const hx0 = 140, hx1 = 270, hTop = 228, apex = 186;
      k.rect(hx0, hTop, hx1 - hx0, gy - hTop, 'rgba(160,128,90,0.08)', { stroke: '#a0805a', 'stroke-width': 3 });
      k.path(`M ${hx0 - 8} ${hTop} L ${(hx0 + hx1) / 2} ${apex} L ${hx1 + 8} ${hTop}`, { stroke: '#a0805a', 'stroke-width': 3, 'stroke-linejoin': 'round' });
      k.rect(150, 291, 110, 54, 'rgba(255,255,255,0.03)', { stroke: C.steel, 'stroke-width': 5 });
      k.rect(236, 248, 16, 14, 'rgba(125,211,252,0.25)', { stroke: '#a0805a', 'stroke-width': 1 });
      // gran edificio de hormigón
      const bx0 = 360, bx1 = 560, bTop = 50, fh = (gy - bTop) / 8;
      k.rect(bx0, bTop, bx1 - bx0, gy - bTop, 'rgba(255,255,255,0.03)', { stroke: '#8a939e', 'stroke-width': 6 });
      for (let i = 1; i < 8; i++) k.line(bx0 + 3, bTop + i * fh, bx1 - 3, bTop + i * fh, '#8a939e', { 'stroke-width': 3 });
      for (let f = 0; f < 8; f++) for (const wx of [bx0 + 14, bx1 - 26]) k.rect(wx, bTop + f * fh + 9, 12, 10, 'rgba(125,211,252,0.18)');
      // refugio enterrado
      const sx0 = 604, sx1 = 700, sTop = 330, sBot = 388;
      k.rect(sx0, sTop, sx1 - sx0, sBot - sTop, 'rgba(255,255,255,0.03)', { stroke: '#8a939e', 'stroke-width': 6 });
      k.path(`M 580 ${gy} L 580 ${sTop + 24} L ${sx0} ${sTop + 24}`, { stroke: '#8a939e', 'stroke-width': 1.2, 'stroke-dasharray': '3 3', opacity: 0.8 });
      // densidad (atenuación por píxel) para los rayos
      const inR = (x: number, y: number, a: number, b: number, c: number, d: number) => x >= a && x <= b && y >= c && y <= d;
      const roofY = (x: number) => apex + (Math.abs(x - (hx0 + hx1) / 2) / ((hx1 - hx0) / 2 + 8)) * (hTop - apex);
      const dens = (x: number, y: number) => {
        let d = 0;
        if (y > gy) {
          const inBase = inR(x, y, 153, 257, 294, 342), inSh = inR(x, y, sx0 + 3, sx1 - 3, sTop + 3, sBot - 3);
          if (!inBase && !inSh) d += 0.075;
          if (inR(x, y, 147, 263, 288, 348) && !inBase) d += 0.25;
          if (inR(x, y, sx0 - 3, sx1 + 3, sTop - 3, sBot + 3) && !inSh) d += 0.3;
        }
        if (inR(x, y, hx0 - 1.5, hx0 + 1.5, hTop, gy) || inR(x, y, hx1 - 1.5, hx1 + 1.5, hTop, gy)) d += 0.12;
        if (x > hx0 - 8 && x < hx1 + 8 && Math.abs(y - roofY(x)) < 2) d += 0.1;
        if (inR(x, y, bx0 - 3, bx0 + 3, bTop, gy) || inR(x, y, bx1 - 3, bx1 + 3, bTop, gy)) d += 0.17;
        if (x > bx0 && x < bx1) for (let i = 0; i < 8; i++) if (Math.abs(y - (bTop + i * fh)) < 2) d += 0.2;
        return d;
      };
      const defs = k.svg.querySelector('defs')!;
      const ray = (S: [number, number], P: [number, number], g: SVGGElement) => {
        const id = `dg-ray${++uid}`;
        const L = Math.hypot(P[0] - S[0], P[1] - S[1]);
        const gr = k.el('linearGradient', { id, gradientUnits: 'userSpaceOnUse', x1: S[0], y1: S[1], x2: P[0], y2: P[1] }, defs);
        let tau = 0, last = -1;
        const n = Math.ceil(L / 0.5);
        for (let i = 0; i <= n; i++) {
          const f = i / n, x = lerp(S[0], P[0], f), y = lerp(S[1], P[1], f);
          tau += dens(x, y) * (L / n);
          const o = Math.max(0.07, 0.95 * Math.exp(-0.6 * tau));
          if (i === 0 || i === n || Math.abs(o - last) > 0.04) { k.el('stop', { offset: f, 'stop-color': C.gamma, 'stop-opacity': o.toFixed(3) }, gr); last = o; }
        }
        return k.line(S[0], S[1], P[0], P[1], `url(#${id})`, { 'stroke-width': 1.8, 'stroke-dasharray': '6 5' }, g);
      };
      // lugares: persona, rayos y rótulo
      const spots: { p: [number, number]; src: [number, number][]; fp: string; col: string; name: string; nx: number; ny: number; lx: number; ly: number; ph: number }[] = [
        { p: [60, gy], src: [[12, gy], [108, gy], [40, gy]], fp: '1', col: '#ff4d4d', name: 'al aire libre', nx: 60, ny: 226, lx: 60, ly: 244, ph: 1 },
        { p: [172, gy], src: [[176, roofY(176)], [235, roofY(235)], [96, gy], [318, gy]], fp: '2–3', col: '#ff9f43', name: 'casa de madera', nx: 205, ny: 176, lx: 226, ly: 278, ph: 1 },
        { p: [166, 345], src: [[96, gy], [318, gy], [205, apex + 2]], fp: '10–20', col: '#ffd166', name: 'sótano', nx: 218, ny: 312, lx: 218, ly: 332, ph: 2 },
        { p: [428, bTop + 5 * fh], src: [[405, bTop], [520, bTop], [318, gy], [592, gy]], fp: '50–100+', col: '#8bd450', name: 'centro de un gran edificio', nx: 460, ny: 36, lx: 496, ly: bTop + 5 * fh - 8, ph: 2 },
        { p: [620, sBot - 3], src: [[612, gy], [690, gy], [650, gy]], fp: '1000', col: C.fusion, name: 'refugio enterrado', nx: 652, ny: 318, lx: 666, ly: sBot - 14, ph: 3 },
      ];
      const sp = spots.map((s) => {
        const rays = k.g({ opacity: 0 });
        const tgt: [number, number] = [s.p[0], s.p[1] - 13];
        for (const src of s.src) ray(src, tgt, rays);
        person(k, s.p[0], s.p[1], C.text);
        const lab = k.g({ opacity: 0 });
        k.text(s.lx, s.ly, `FP ${s.fp}`, { fill: s.col, 'font-size': 14, 'font-weight': 700, 'font-family': MONO, 'text-anchor': 'middle' }, lab);
        const nm = k.text(s.nx, s.ny, s.name, { fill: C.muted, 'font-size': 10.5, 'text-anchor': 'middle' });
        return { s, rays, lab, nm };
      });
      // polvo que cae y se posa
      const surf = (x: number) => (x > hx0 - 8 && x < hx1 + 8 ? roofY(x) : x > bx0 - 3 && x < bx1 + 3 ? bTop - 3 : gy);
      const parts = Array.from({ length: 120 }, (_, i) => { const x = 4 + rnd(i * 3 + 1) * 712; return { x, y1: surf(x) - 2, t0: rnd(i * 5 + 2) * 4.2, el: k.circle(x, 0, 1.8, C.uranium, { opacity: 0 }) }; });
      const layer = k.path(`M 0 ${gy - 1} L ${hx0 - 8} ${gy - 1} M ${hx1 + 8} ${gy - 1} L ${bx0 - 3} ${gy - 1} M ${bx1 + 3} ${gy - 1} L ${W} ${gy - 1} M ${hx0 - 8} ${hTop - 2} L ${(hx0 + hx1) / 2} ${apex - 2} L ${hx1 + 8} ${hTop - 2} M ${bx0 - 3} ${bTop - 3} L ${bx1 + 3} ${bTop - 3}`, { stroke: C.uranium, 'stroke-width': 2.5, opacity: 0, filter: 'url(#dg-glow)' });
      const note = k.text(16, 24, 'FP: cuántas veces menos dosis que al aire libre', { fill: C.muted, 'font-size': 11 });
      return (t, ph, pk) => {
        const tt = T(ph, pk);
        for (const p of parts) {
          const f = clamp((tt - p.t0) / ((p.y1 + 10) / 130));
          k.set(p.el, { cy: lerp(-10, p.y1, f), opacity: tt < p.t0 ? 0 : 0.9 });
        }
        k.op(layer, 0.55 * seg(tt, 1.5, 6));
        for (const o of sp) {
          const act = ph === o.s.ph;
          k.op(o.rays, act ? seg(pk, 0.05, 0.25) : 0);
          o.rays.setAttribute('stroke-dashoffset', String(-t * 26));
          for (const l of Array.from(o.rays.children)) l.setAttribute('stroke-dashoffset', String(-t * 26));
          k.op(o.lab, ph > o.s.ph ? 0.85 : act ? seg(pk, 0.25, 0.4) : 0);
          k.op(o.nm, ph >= o.s.ph ? 1 : 0.5);
        }
        k.op(note, ph >= 1 ? seg(ph === 1 ? pk : 1, 0, 0.15) : 0);
      };
    },
  },

  // ------------------------------------------------------------------ dispersión de la lluvia radiactiva
  dispersion: {
    legend: [['Partícula gruesa', '#d4a373'], ['Partícula fina', '#e9f5c4'], ['Viento', C.electron], ['Lluvia', '#8fb6e0']],
    phases: DISP_PH,
    build(k) {
      const T = clock(DISP_PH);
      const gy = 240, gz = 110, py0 = 318, pz = 0.35;
      k.rect(0, gy, W, 22, 'rgba(58,51,43,0.45)');
      k.line(0, gy, W, gy, 'rgba(255,255,255,0.2)');
      // eje de alturas
      for (const [km, y] of [[15, 60], [10, 120], [5, 180]] as [number, number][]) { k.line(44, y, 52, y, 'rgba(255,255,255,0.3)'); k.text(40, y + 4, `${km} km`, { 'font-size': 10, 'text-anchor': 'end', fill: C.faint, 'font-family': MONO }); }
      k.line(48, 50, 48, gy, 'rgba(255,255,255,0.15)');
      // vista en planta
      k.rect(0, 266, W, 108, 'rgba(58,51,43,0.28)');
      k.text(16, 282, 'vista desde arriba', { fill: C.muted, 'font-size': 11 });
      arrow(k, 30, 348, 30, 328, C.faint, { 'stroke-width': 1.2 }); k.text(30, 362, 'N', { fill: C.faint, 'font-size': 10, 'text-anchor': 'middle' });
      const cl = (x: number) => py0 - 0.00011 * (x - gz) ** 2;
      const plume = (L: number, hw: number) => {
        const back = hw * 0.9, top: string[] = [], bot: string[] = [];
        for (let i = 0; i <= 60; i++) {
          const s = i / 60, x = gz - back + s * (L + back);
          const h = (hw * Math.sqrt(s) * Math.pow(1 - s, 0.8)) / 0.42;
          top.push(`${x.toFixed(1)} ${(cl(x) - h).toFixed(1)}`); bot.unshift(`${x.toFixed(1)} ${(cl(x) + h * 0.85).toFixed(1)}`);
        }
        return `M ${top.join(' L ')} L ${bot.join(' L ')} Z`;
      };
      const cid = `dg-reveal${++uid}`;
      const clip = k.el('clipPath', { id: cid }, k.svg.querySelector('defs')!);
      const reveal = k.rect(0, 262, 0, 120, '#fff', {}, clip);
      const dep = k.g({ 'clip-path': `url(#${cid})` });
      const LEV: [number, number, string][] = [[590, 30, '#8bd450'], [420, 21, '#ffd166'], [250, 14, '#ff8a3d'], [120, 8, '#ff3b30']];
      for (const [L, hw, c] of LEV) k.path(plume(L, hw), { fill: c, 'fill-opacity': 0.5, stroke: 'none' }, dep);
      const hsx = 448;
      k.el('ellipse', { cx: hsx, cy: cl(hsx), rx: 24, ry: 11, fill: '#ff8a3d', 'fill-opacity': 0.75 }, dep);
      k.el('ellipse', { cx: hsx, cy: cl(hsx), rx: 11, ry: 5, fill: '#ff3b30', 'fill-opacity': 0.85 }, dep);
      const dots = k.g();
      k.line(gz - 6, py0, gz + 6, py0, C.text, {}); k.line(gz, py0 - 6, gz, py0 + 6, C.text, {});
      k.text(gz, py0 + 22, 'punto cero', { fill: C.text, 'font-size': 10.5, 'text-anchor': 'middle' });
      const lHot = k.label(hsx + 6, cl(hsx) + 6, hsx + 30, 352, 'punto caliente por la lluvia', C.text);
      // escala de colores
      const gid = `dg-scale${++uid}`;
      const lg = k.el('linearGradient', { id: gid }, k.svg.querySelector('defs')!);
      ['#ff3b30', '#ff8a3d', '#ffd166', '#8bd450'].forEach((c, i) => k.el('stop', { offset: i / 3, 'stop-color': c }, lg));
      k.text(300, 394, 'depósito', { fill: C.faint, 'font-size': 10.5, 'text-anchor': 'end' });
      k.text(310, 394, 'alto', { fill: C.muted, 'font-size': 10.5 });
      k.rect(338, 388, 120, 6, `url(#${gid})`, { opacity: 0.8 });
      k.text(464, 394, 'bajo', { fill: C.muted, 'font-size': 10.5 });
      // nube de lluvia
      const rain = k.g({ opacity: 0 });
      const rainL = 432, rainR = 500, rainTop = 150;
      const streaks = Array.from({ length: 9 }, (_, i) => k.line(rainL + 4 + i * 8, rainTop, rainL - 6 + i * 8, gy, '#8fb6e0', { 'stroke-width': 1, 'stroke-dasharray': '5 7', opacity: 0.6 }, rain));
      for (const [x, y, r] of [[448, 140, 16], [470, 132, 20], [492, 142, 14], [462, 146, 15], [482, 148, 13]] as [number, number, number][]) k.circle(x, y, r, '#5d6676', { opacity: 0.95 }, rain);
      k.text(512, 128, 'chubasco', { fill: '#8fb6e0', 'font-size': 11 }, rain);
      // viento por capas
      const wind = k.g({ opacity: 0 });
      const WL: [number, number, string][] = [[80, 66, 'viento fuerte'], [140, 44, 'moderado'], [205, 24, 'flojo']];
      for (const [y, L, s] of WL) { arrow(k, 610, y, 610 + L, y, C.electron, { 'stroke-width': 2 }, wind); k.text(610, y - 8, s, { fill: C.electron, 'font-size': 10.5 }, wind); }
      k.text(706, 40, 'más fuerte y con otro rumbo en altura', { fill: C.electron, 'font-size': 11, 'text-anchor': 'end' }, wind);
      // hongo
      const stem = k.path('', { stroke: 'none', fill: 'rgba(150,120,100,0.55)' });
      const cap = k.el('ellipse', { cx: gz, cy: 220, rx: 20, ry: 12, fill: 'rgba(210,190,175,0.85)' });
      // partículas: trayectorias calculadas de antemano
      const speed = (y: number) => 8 + 52 * clamp((gy - y) / 180);
      const turn = (y: number) => -0.18 * clamp((gy - y) / 180);
      const CLS = [{ v: 34, r: 3, c: '#d4a373' }, { v: 15, r: 2.1, c: '#a3c96b' }, { v: 7.5, r: 1.3, c: '#e9f5c4' }];
      const parts = Array.from({ length: 96 }, (_, i) => {
        const cls = i % 3, fromCap = rnd(i * 7 + 3) < 0.62;
        let x = fromCap ? 62 + rnd(i * 11 + 1) * 100 : gz - 8 + rnd(i * 13 + 2) * 16;
        let y = fromCap ? 66 + rnd(i * 17 + 5) * 34 : 108 + rnd(i * 19 + 4) * 118, z = 0;
        const t0 = 4 + rnd(i * 23 + 6) * 3.5;
        const xs: number[] = [], ys: number[] = [], zs: number[] = [];
        let tl = 99;
        for (let s = 0; s < 400; s++) {
          xs.push(x); ys.push(y); zs.push(z);
          if (y >= gy) { if (tl === 99) tl = t0 + s * 0.05; continue; }
          const inRain = x > rainL && x < rainR && y > rainTop;
          const vf = inRain ? 95 : CLS[cls].v, u = speed(y), th = turn(y);
          x += u * Math.cos(th) * 0.05; z += u * Math.sin(th) * 0.05; y = Math.min(gy, y + vf * 0.05);
        }
        return { cls, t0, xs, ys, zs, tl, el: k.circle(0, 0, CLS[cls].r, CLS[cls].c, { opacity: 0 }), pd: k.circle(0, 0, Math.max(1, CLS[cls].r * 0.6), CLS[cls].c, { opacity: 0 }, dots) };
      });
      const landed = parts.filter((p) => p.tl < 99).map((p) => ({ t: p.tl, x: p.xs[p.xs.length - 1] })).sort((a, b) => a.t - b.t);
      return (t, ph, pk) => {
        const tt = T(ph, pk);
        const r = seg(tt, 0, 4.2);
        const cy = lerp(225, 84, r), crx = lerp(18, 72, r) + 10 * seg(tt, 5, 20), cry = lerp(11, 24, r);
        const cdx = 14 * seg(tt, 5, 22);
        k.set(cap, { cx: gz + cdx, cy, rx: crx, ry: cry, opacity: 0.9 - 0.35 * seg(tt, 8, 20) });
        const sw = lerp(5, 11, r), top = cy + cry * 0.6;
        k.set(stem, { d: `M ${gz - sw * 2.2} ${gy} Q ${gz - sw} ${(gy + top) / 2} ${gz - sw + cdx * 0.5} ${top} L ${gz + sw + cdx * 0.5} ${top} Q ${gz + sw} ${(gy + top) / 2} ${gz + sw * 2.2} ${gy} Z`, opacity: 1 - 0.5 * seg(tt, 8, 20) });
        k.op(wind, ph >= 1 ? (ph === 1 ? seg(pk, 0, 0.2) : 1) : 0);
        k.op(rain, ph >= 2 ? (ph === 2 ? seg(pk, 0, 0.15) : 1) : 0);
        streaks.forEach((s) => s.setAttribute('stroke-dashoffset', String(-t * 60)));
        for (const p of parts) {
          const s = Math.floor((tt - p.t0) / 0.05);
          if (s < 0) { k.op(p.el, 0); k.op(p.pd, 0); continue; }
          const j = Math.min(s, p.xs.length - 1), x = p.xs[j], y = p.ys[j];
          const down = tt >= p.tl;
          k.set(p.el, { cx: x, cy: down ? gy - 1.5 : y, opacity: down ? 0.7 : 0.95 });
          k.set(p.pd, { cx: x, cy: py0 + p.zs[j] * pz, opacity: down ? 0.9 : 0 });
        }
        let front = 0;
        for (const l of landed) { if (l.t > tt) break; front = Math.max(front, l.x); }
        if (ph === 3) front = Math.max(front, lerp(front, W, seg(pk, 0.1, 0.7)));
        k.set(reveal, { width: Math.max(0, front + 14) });
        k.op(dots, ph === 3 ? 1 - 0.6 * seg(pk, 0.3, 0.8) : 1);
        k.op(lHot, ph === 3 ? seg(pk, 0.3, 0.5) : 0);
      };
    },
  },

  // ------------------------------------------------------------------ invierno nuclear
  winter: {
    legend: [['Incendios', C.explosive], ['Humo y hollín', '#55525c'], ['Luz del Sol', C.gamma], ['Temperatura', C.electron]],
    phases: WINTER_PH,
    build(k) {
      const T = clock(WINTER_PH);
      const defs = k.svg.querySelector('defs')!;
      const cid = `dg-wclip${++uid}`;
      k.rect(0, 0, 452, H, 'none', {}, k.el('clipPath', { id: cid }, defs));
      const scene = k.g({ 'clip-path': `url(#${cid})` });
      const cx = 226, top = 330, R = 900, cy = top + R;
      const gy = earth(k, cx, top, R, 0, scene);
      const band = (h: number) => { let d = ''; for (let x = -10; x <= 462; x += 6) d += `${d ? 'L' : 'M'} ${x} ${gy(x, h).toFixed(1)} `; return d; };
      k.path(band(105), { stroke: 'rgba(255,255,255,0.28)', 'stroke-dasharray': '4 5' }, scene);
      k.text(14, gy(14, 105) + 16, 'tropopausa (≈ 10–15 km)', { fill: C.faint, 'font-size': 10.5 }, scene);
      k.text(14, gy(14, 40) + 4, 'troposfera', { fill: C.faint, 'font-size': 10.5 }, scene);
      k.text(14, gy(14, 240), 'estratosfera', { fill: C.faint, 'font-size': 10.5 }, scene);
      const frost = k.path(band(0.5), { stroke: '#cfe8ff', 'stroke-width': 3, opacity: 0, filter: 'url(#dg-glow)' }, scene);
      // Sol y rayos
      const sunX = 420, sunY = 34;
      k.circle(sunX, sunY, 18, 'url(#dg-sun)', {}, scene);
      const SMOKE_H = 190;
      const rays = [70, 140, 210, 280, 350].map((gx) => {
        const G = { x: gx, y: gy(gx) - 2 };
        const dx = G.x - sunX, dy = G.y - sunY, L = Math.hypot(dx, dy);
        const S = { x: sunX + (dx / L) * 24, y: sunY + (dy / L) * 24 };
        let f = 0.5;
        for (let s = 0; s <= 1; s += 0.002) { const x = lerp(S.x, G.x, s), y = lerp(S.y, G.y, s); if (y >= gy(x, SMOKE_H)) { f = s; break; } }
        const M = { x: lerp(S.x, G.x, f), y: lerp(S.y, G.y, f) };
        return { up: k.line(S.x, S.y, M.x, M.y, C.gamma, { 'stroke-width': 1.6, opacity: 0.85 }, scene), low: arrow(k, M.x, M.y, G.x, G.y, C.gamma, { 'stroke-width': 1.6 }, scene) };
      });
      // ciudades, fuego y columnas de humo
      const cities = [90, 226, 352].map((x, i) => {
        const g0 = gy(x);
        const col = k.path('', { fill: '#3d3b43', stroke: 'none', opacity: 0.92 }, scene);
        const head = k.g({}, scene);
        for (let j = 0; j < 6; j++) k.circle(-22 + j * 9, (j % 2) * -5, 12 + rnd(j + i * 7) * 5, '#46434c', {}, head);
        const blds = k.g({}, scene);
        for (let j = 0; j < 5; j++) { const hh = 6 + rnd(j + i * 9) * 12; k.rect(x - 16 + j * 7, g0 - hh, 5, hh + 2, '#59616b', {}, blds); }
        const fire = k.g({}, scene);
        for (let j = 0; j < 4; j++) k.path(`M ${x - 13 + j * 8} ${g0} q 3 -11 0 -18 q 7 7 5 18 z`, { fill: C.explosive, stroke: 'none', filter: 'url(#dg-glow)' }, fire);
        return { x, g0, col, head, fire, seed: i };
      });
      // capa de humo en la estratosfera
      const smoke = cities.map((c) => k.path('', { stroke: '#2e2c33', 'stroke-width': 26, 'stroke-linecap': 'round', opacity: 0 }, scene));
      const smokeArc = (x0: number, half: number) => { let d = ''; for (let x = x0 - half; x <= x0 + half; x += 5) d += `${d ? 'L' : 'M'} ${x.toFixed(1)} ${gy(x, SMOKE_H).toFixed(1)} `; return d; };
      // panel derecho: globo
      const G = { x: 520, y: 72, r: 34 };
      const gcid = `dg-gclip${++uid}`;
      k.circle(G.x, G.y, G.r, '#fff', {}, k.el('clipPath', { id: gcid }, defs));
      const globe = k.g({ 'clip-path': `url(#${gcid})` });
      k.circle(G.x, G.y, G.r, '#173048', {}, globe);
      k.path(`M ${G.x - 20} ${G.y - 20} q 14 -6 22 4 q 6 12 -4 20 q -10 4 -14 -6 z M ${G.x + 6} ${G.y + 8} q 14 -4 20 6 q -2 14 -14 16 q -8 -10 -6 -22 z`, { fill: '#2c5a3a', stroke: 'none' }, globe);
      const belt = k.el('ellipse', { cx: G.x, cy: G.y - 8, rx: G.r + 4, ry: 10, fill: 'none', stroke: '#2e2c33', 'stroke-width': 0, opacity: 0.92 }, globe);
      k.el('circle', { cx: G.x, cy: G.y, r: G.r, fill: 'none', stroke: 'rgba(255,255,255,0.25)' });
      const gl = k.g({ opacity: 0 });
      k.text(G.x + G.r + 12, G.y - 2, 'el humo rodea', { fill: C.text, 'font-size': 11 }, gl);
      k.text(G.x + G.r + 12, G.y + 13, 'todo el planeta', { fill: C.text, 'font-size': 11 }, gl);
      // termómetro
      const th = { x: 488, y0: 150, y1: 290 };
      k.rect(th.x - 6, th.y0, 12, th.y1 - th.y0, 'rgba(255,255,255,0.04)', { stroke: 'rgba(255,255,255,0.35)', rx: 6 });
      const merc = k.rect(th.x - 3, th.y0 + 20, 6, th.y1 - th.y0 - 20, '#ff6b5e', { rx: 3 });
      const bulb = k.circle(th.x, th.y1 + 8, 10, '#ff6b5e', { stroke: 'rgba(255,255,255,0.35)' });
      // gráfico de temperatura frente a meses
      const cx0 = 532, cx1 = 704, cy0 = 162, cy1 = 288;
      const X = (m: number) => cx0 + (m / 48) * (cx1 - cx0), Y = (dT: number) => cy0 + (-dT / 8) * (cy1 - cy0);
      k.text(472, 140, 'cambio de la temperatura media (°C)', { fill: C.muted, 'font-size': 11 });
      k.line(cx0, Y(0), cx1, Y(0), 'rgba(255,255,255,0.3)');
      for (const v of [-4, -8]) k.line(cx0, Y(v), cx1, Y(v), 'rgba(255,255,255,0.08)');
      k.text(cx0 - 6, Y(0) + 4, '0', { 'font-size': 10, 'text-anchor': 'end', 'font-family': MONO });
      k.text(cx0 - 6, Y(-4) + 4, '−4', { 'font-size': 10, 'text-anchor': 'end', 'font-family': MONO });
      k.text(cx0 - 6, Y(-8) + 4, '−8', { 'font-size': 10, 'text-anchor': 'end', 'font-family': MONO });
      for (const m of [0, 12, 24, 36, 48]) k.text(X(m), cy1 + 14, String(m), { 'font-size': 10, 'text-anchor': 'middle', 'font-family': MONO });
      k.text(cx1, cy1 + 28, 'meses después de la guerra', { 'font-size': 10.5, 'text-anchor': 'end', fill: C.faint });
      const big = (m: number) => -8 * (1 - Math.exp(-m / 2.5)) * Math.exp(-m / 140);
      const small = (m: number) => -1.3 * (1 - Math.exp(-m / 2.5)) * Math.exp(-m / 60);
      const cBig = k.path('', { stroke: C.electron, 'stroke-width': 2.2 });
      const cSmall = k.path('', { stroke: C.electron, 'stroke-width': 1.4, 'stroke-dasharray': '4 3', opacity: 0.7 });
      const lBig = k.text(X(28), Y(big(28)) - 8, 'guerra a gran escala', { fill: C.electron, 'font-size': 10.5, 'text-anchor': 'middle' });
      const lSmall = k.text(X(30), Y(small(30)) + 14, 'guerra regional', { fill: C.electron, 'font-size': 10.5, 'text-anchor': 'middle', opacity: 0.8 });
      const cur = k.circle(0, 0, 3.5, '#fff', { opacity: 0 });
      const month = k.text(cx1, cy1 - 8, '', { fill: C.text, 'font-size': 12, 'text-anchor': 'end', 'font-family': MONO });
      // cultivo y estación de cultivo
      const crop = k.g();
      const cropPath = k.path('M 0 0 L 0 -30 M 0 -14 Q -7 -18 -9 -26 M 0 -20 Q 7 -24 9 -32', { stroke: C.uranium, 'stroke-width': 2, 'stroke-linecap': 'round' }, crop);
      const grains = [[0, -34], [-5, -29], [5, -36], [-9, -28], [9, -34]].map(([x, y]) => k.el('ellipse', { cx: x, cy: y, rx: 2.4, ry: 4, fill: '#e3c76b' }, crop));
      k.text(cx0, 340, 'estación de cultivo', { fill: C.muted, 'font-size': 11 });
      k.rect(cx0, 350, cx1 - cx0, 8, 'rgba(255,255,255,0.06)');
      const season = k.rect(cx0, 350, cx1 - cx0, 8, C.uranium, { opacity: 0.85 });
      const sLab = k.text(cx1, 376, '', { fill: C.muted, 'font-size': 10.5, 'text-anchor': 'end' });
      const curveD = (f: (m: number) => number, m1: number) => { let d = ''; for (let m = 0; m <= m1 + 1e-6; m += 0.5) d += `${d ? 'L' : 'M'} ${X(m).toFixed(1)} ${Y(f(m)).toFixed(1)} `; return d; };
      return (t, ph, pk) => {
        const tt = T(ph, pk);
        const m = ph < 2 ? 0 : ph === 2 ? 1.5 * pk : 1.5 + 46.5 * seg(pk, 0, 0.85);
        // fuego y columnas
        const rise = ph === 0 ? 0.25 * seg(pk, 0.2, 1) : ph === 1 ? 0.25 + 0.75 * ease(pk) : 1;
        cities.forEach((c, i) => {
          k.op(c.fire, ph < 3 ? (0.7 + 0.3 * Math.sin(t * 18 + i * 2)) * (ph === 2 ? 1 - pk * 0.6 : 1) : 0.15);
          const hTop = lerp(20, SMOKE_H + 8, rise), yTop = c.g0 - hTop, wTop = lerp(10, 28, rise), wB = 8;
          const fade = ph === 2 ? 1 - seg(pk, 0.3, 1) : ph === 3 ? 0 : 1;
          k.set(c.col, { d: `M ${c.x - wB} ${c.g0} C ${c.x - wB} ${c.g0 - hTop * 0.4} ${c.x - wTop} ${yTop + hTop * 0.3} ${c.x - wTop} ${yTop} L ${c.x + wTop} ${yTop} C ${c.x + wTop} ${yTop + hTop * 0.3} ${c.x + wB} ${c.g0 - hTop * 0.4} ${c.x + wB} ${c.g0} Z`, opacity: 0.9 * fade * seg(tt, 0.3, 1.5) });
          k.tr(c.head, c.x, yTop, lerp(0.5, 1.15, rise)); k.op(c.head, fade * seg(tt, 0.3, 1.5));
        });
        // capa de humo
        const spread = ph < 2 ? (ph === 1 ? 6 * seg(pk, 0.7, 1) : 0) : ph === 2 ? lerp(6, 140, ease(pk)) : 140;
        smoke.forEach((s, i) => { k.set(s, { d: spread > 0 ? smokeArc(cities[i].x, spread) : '', opacity: spread > 0 ? (ph === 3 ? 0.95 : 0.85) : 0, 'stroke-width': ph === 3 ? 26 + 6 * seg(pk, 0, 0.4) : 26 }); });
        // luz
        const dim = ph < 2 ? 1 : ph === 2 ? 1 - 0.55 * seg(pk, 0.3, 1) : 0.45 - 0.37 * seg(pk, 0, 0.4);
        for (const r of rays) { k.op(r.low, 0.9 * dim); k.op(r.up, 0.85); }
        k.op(frost, ph === 3 ? 0.7 * seg(pk, 0.3, 0.7) : 0);
        // globo
        k.set(belt, { 'stroke-width': ph < 2 ? 0 : ph === 2 ? 4 + 30 * ease(pk) : 34 });
        k.op(gl, ph >= 2 ? (ph === 2 ? seg(pk, 0.4, 0.7) : 1) : 0);
        // temperatura
        const dT = big(m), lvl = clamp(1 + dT / 9);
        const mh = (th.y1 - th.y0 - 20) * (0.25 + 0.75 * lvl);
        const col = dT < -3 ? C.electron : C.proton;
        k.set(merc, { y: th.y1 - mh, height: mh, fill: col }); k.set(bulb, { fill: col });
        k.set(cBig, { d: m > 0 ? curveD(big, m) : '' }); k.set(cSmall, { d: m > 0 ? curveD(small, m) : '' });
        k.op(lBig, m > 30 ? 1 : 0); k.op(lSmall, m > 30 ? 0.8 : 0);
        k.set(cur, { cx: X(m), cy: Y(dT), opacity: ph >= 2 ? 1 : 0 });
        month.textContent = ph < 2 ? tr('primeros días') : m < 2 ? tr(`semana ${Math.max(1, Math.round(m * 4.3))}`) : tr(`mes ${Math.floor(m)}`);
        // cosecha
        const harm = clamp(-dT / 7);
        k.tr(crop, 490, 385, 1 - 0.25 * harm, 0);
        k.set(cropPath, { stroke: harm > 0.5 ? '#a08a5a' : C.uranium });
        grains.forEach((g2) => k.op(g2, 1 - harm * 0.9));
        k.set(season, { width: (cx1 - cx0) * (1 - 0.55 * harm), fill: harm > 0.5 ? '#c9a24a' : C.uranium });
        sLab.textContent = tr(harm > 0.3 ? 'más corta por las heladas' : 'normal');
      };
    },
  },

  // ------------------------------------------------------------------ destello y estruendo
  flashbang: {
    legend: [['Luz', '#fff3c4'], ['Calor', C.explosive], ['Onda de choque y sonido', C.text]],
    phases: FLASH_PH,
    build(k) {
      const T = clock(FLASH_PH);
      const gy = 230, ex = 46, PX = 31; // px por km
      k.rect(0, gy, W, H - gy, 'rgba(58,51,43,0.4)');
      k.line(0, gy, W, gy, 'rgba(255,255,255,0.2)');
      const realAt = (tt: number) => tt < 3.5 ? (0.5 * tt) / 3.5 : tt < 7.5 ? 0.5 + (4.5 * (tt - 3.5)) / 4 : 5 + ((tt - 7.5) * 57) / 17.5;
      // explosión
      const fire = k.circle(ex, gy - 26, 22, 'url(#dg-fire)', { filter: 'url(#dg-glow)' });
      const front = k.path('', { stroke: 'rgba(255,255,255,0.85)', 'stroke-width': 2.2, fill: 'rgba(255,255,255,0.03)', filter: 'url(#dg-glow)' });
      const light = k.g();
      // observadores
      const OBS = [3, 10, 20].map((d, i) => {
        const x = ex + d * PX, arr = d / 0.343;
        const g0 = k.g();
        const g = k.g({ transform: `translate(${x} ${gy}) scale(1.35) translate(${-x} ${-gy})` }, g0);
        const hx = x - 30;
        k.rect(hx, gy - 24, 24, 24, '#4a525c', {}, g);
        k.path(`M ${hx - 3} ${gy - 24} L ${hx + 12} ${gy - 36} L ${hx + 27} ${gy - 24} Z`, { fill: '#5d6670', stroke: 'none' }, g);
        const win = k.rect(hx + 5, gy - 18, 11, 9, 'rgba(125,211,252,0.6)', {}, g);
        const crack = k.path(`M ${hx + 5} ${gy - 18} L ${hx + 11} ${gy - 13} L ${hx + 8} ${gy - 9} M ${hx + 11} ${gy - 13} L ${hx + 16} ${gy - 16}`, { stroke: '#cfe8ff', 'stroke-width': 0.9, opacity: 0 }, g);
        const shards = Array.from({ length: 7 - i * 2 }, (_, j) => k.path('M 0 -2 L 2 2 L -2 1.5 Z', { fill: '#cfe8ff', stroke: 'none', opacity: 0 }, g));
        const heat = k.circle(x + 2, gy - 16, 16, C.explosive, { opacity: 0, filter: 'url(#dg-glow)' }, g);
        person(k, x + 2, gy, C.text, g);
        k.text(x - 8, gy - 64, `${d} km`, { fill: C.text, 'font-size': 13, 'text-anchor': 'middle', 'font-family': MONO }, g0);
        const lArr = k.text(x - 8, gy - 82, `llega a los ${Math.round(arr)} s`, { fill: C.gamma, 'font-size': 11, 'text-anchor': 'middle' }, g0);
        const bum = k.text(x - 8, gy - 100, '¡bum!', { fill: '#fff', 'font-size': 16, 'font-weight': 700, 'text-anchor': 'middle', opacity: 0 }, g0);
        k.line(ex, gy - 26, x + 2, gy - 16, '#fff3c4', { 'stroke-width': 1.2, filter: 'url(#dg-glow)' }, light);
        return { d, x, arr, win, crack, shards, heat, lArr, bum, hx, i };
      });
      const flash = k.rect(0, 0, W, H, '#fff7dc', { opacity: 0 });
      const topLab = k.text(360, 30, '', { fill: C.text, 'font-size': 12, 'text-anchor': 'middle' });
      const clk = k.text(706, 32, '', { fill: C.text, 'font-size': 20, 'font-weight': 700, 'text-anchor': 'end', 'font-family': MONO });
      // cronología
      const tx0 = 86, tx1 = 700, tX = (s: number) => tx0 + (s / 62) * (tx1 - tx0);
      k.text(16, 262, 'cronología de cada observador', { fill: C.muted, 'font-size': 11 });
      const ax = 372;
      k.line(tx0, ax, tx1, ax, 'rgba(255,255,255,0.25)');
      for (let s = 0; s <= 60; s += 10) { k.line(tX(s), ax, tX(s), ax + 4, 'rgba(255,255,255,0.3)'); k.text(tX(s), ax + 17, `${s} s`, { 'font-size': 10, 'text-anchor': 'middle', 'font-family': MONO }); }
      const rows = OBS.map((o, i) => {
        const y = 288 + i * 27;
        k.text(16, y + 4, `${o.d} km`, { fill: C.text, 'font-size': 11, 'font-family': MONO });
        k.line(tx0, y, tx1, y, 'rgba(255,255,255,0.07)');
        const prog = k.line(tx0, y, tx0, y, 'rgba(255,255,255,0.3)', { 'stroke-width': 1.5 });
        const fl = k.path(`M ${tx0} ${y - 5} L ${tx0 + 4} ${y} L ${tx0} ${y + 5} L ${tx0 - 4} ${y} Z`, { fill: '#fff3c4', stroke: 'none', opacity: 0 });
        const ht = k.rect(tx0, y - 3, 0, 6, C.explosive, { opacity: 0.8 });
        const bm = k.circle(tX(o.arr), y, 4.5, C.text, { opacity: 0 });
        const bl = k.text(tX(o.arr) + 9, y + 4, `${Math.round(o.arr)} s`, { fill: C.gamma, 'font-size': 11, 'font-family': MONO, opacity: 0 });
        return { y, prog, fl, ht, bm, bl, hd: [2.6, 2.2, 1.8][i] };
      });
      const cursor = k.line(tx0, 276, tx0, ax, C.gamma, { 'stroke-dasharray': '2 3', opacity: 0.6 });
      return (_t, ph, pk) => {
        const tt = T(ph, pk), s = realAt(tt);
        k.op(flash, ph === 0 ? 0.85 * (1 - seg(pk, 0.05, 0.5)) : 0);
        k.op(light, ph === 0 ? 1 - seg(pk, 0.6, 1) * 0.6 : ph === 1 ? 0.4 * (1 - pk) : 0);
        k.set(fire, { r: 22 + 6 * seg(s, 0, 3), cy: gy - 26 - 40 * seg(s, 3, 62), opacity: 1 - 0.5 * seg(s, 4, 40) });
        const r = s * 0.343 * PX;
        k.set(front, { d: ph >= 2 && r > 2 ? `M ${ex - r} ${gy} A ${r} ${r} 0 0 1 ${ex + r} ${gy}` : '', opacity: 1 });
        topLab.textContent = tr(ph === 0 ? 'luz: 300 000 km/s' : ph === 1 ? 'calor: también a la velocidad de la luz, durante unos segundos' : 'onda de choque y sonido: unos 343 m/s');
        clk.textContent = `t = ${Math.floor(s)} s`;
        for (const o of OBS) {
          const hit = s >= o.arr, e = clamp((s - o.arr) / 1.2);
          k.op(o.heat, [0.85, 0.45, 0.22][o.i] * seg(s, 0.05, 0.35) * (1 - seg(s, 0.6, [3, 2.6, 2.2][o.i])));
          k.set(o.win, { fill: hit ? 'rgba(20,24,30,0.9)' : 'rgba(125,211,252,0.6)' }); k.op(o.crack, hit ? 1 : 0);
          o.shards.forEach((sh, j) => { const a = -0.9 + j * 0.35; k.tr(sh, o.hx + 11 + Math.cos(a) * 26 * e, gy - 14 + Math.sin(a) * 14 * e + 18 * e * e, 1, j * 60 + e * 200); k.op(sh, hit ? 1 - e : 0); });
          k.op(o.lArr, hit ? 1 : 0);
          k.op(o.bum, hit ? 1 - seg(s, o.arr + 1.5, o.arr + 3.5) : 0);
        }
        k.set(cursor, { x1: tX(s), x2: tX(s) });
        rows.forEach((rw, i) => {
          k.set(rw.prog, { x2: tX(s) });
          k.op(rw.fl, 1);
          k.set(rw.ht, { width: tX(Math.min(s, rw.hd)) - tx0 });
          const hit = s >= OBS[i].arr;
          k.op(rw.bm, hit ? 1 : 0); k.op(rw.bl, hit ? 1 : 0);
        });
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
  restart.title = tr('Reiniciar');
  play.title = tr('Reproducir o pausar');
  const phs = document.createElement('div'); phs.className = 'dg-ph';
  def.phases.forEach((_, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = String(i + 1); b.onclick = () => { ph = i; pt = 0; playing = true; }; phs.append(b); });
  const leg = document.createElement('div'); leg.className = 'dg-leg';
  for (const [n, c] of def.legend ?? []) { const s = document.createElement('span'); s.innerHTML = `<i style="background:${c}"></i>`; s.append(tr(n)); leg.append(s); }
  bar.append(play, restart, phs, leg);
  const cap = document.createElement('div'); cap.className = 'dg-cap';
  wrap.append(svg, bar, cap);
  host.append(wrap);

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let ph = 0, pt = 0, t = 0, playing = !reduce, visible = true, raf = 0, last = performance.now();
  const setPlay = () => { play.textContent = playing ? `❚❚ ${tr('Pausa')}` : `▶ ${tr('Reproducir')}`; };
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
        cap.innerHTML = `<b>${ph + 1}/${def.phases.length}.</b> `; cap.append(tr(def.phases[ph].cap));
        phs.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === ph));
      }
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return { destroy() { cancelAnimationFrame(raf); io.disconnect(); wrap.remove(); } };
}
