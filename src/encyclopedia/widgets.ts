import type { ChartId, WidgetId } from './types';
import { computeEffects, fmtDist, fmtEnergy } from '../physics/effects';
import type { Environment, NuclearInput } from '../physics/types';

/**
 * Gráficos interactivos y pequeñas calculadoras de la enciclopedia. Se dibujan con el color del
 * tema (variables CSS) y no necesitan ninguna librería.
 */
interface Mounted { destroy(): void }
const NS = 'http://www.w3.org/2000/svg';
const h = (tag: string, cls = '', html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
const sv = (tag: string, a: Record<string, string | number> = {}, parent?: Element) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v)); parent?.append(e); return e; };
const nf = (x: number, d = 0) => x.toLocaleString('es-ES', { maximumFractionDigits: d });

// ======================================================================== datos
/**
 * Arsenal total estimado por país (cabezas), años seleccionados. Fuentes: Kristensen y Norris,
 * «Global nuclear weapons inventories, 1945–2013» (Bulletin of the Atomic Scientists, 2013) y
 * estimaciones anuales de la FAS y del SIPRI. Las cifras de Israel, India, Pakistán y Corea del
 * Norte son estimaciones con gran incertidumbre.
 */
const ARSENALS: { name: string; color: string; pts: [number, number][] }[] = [
  { name: 'EE. UU.', color: '#4f8fe8', pts: [[1945, 2], [1950, 299], [1955, 2422], [1960, 18638], [1965, 31139], [1967, 31255], [1970, 26008], [1975, 27519], [1980, 23764], [1985, 23135], [1990, 21392], [1995, 14000], [2000, 10577], [2005, 10295], [2010, 9400], [2015, 7100], [2020, 5800], [2025, 5177]] },
  { name: 'URSS / Rusia', color: '#e85a4f', pts: [[1945, 0], [1949, 1], [1955, 200], [1960, 1605], [1965, 6129], [1970, 11643], [1975, 19443], [1980, 30062], [1986, 40159], [1990, 37000], [1995, 27000], [2000, 21500], [2005, 17000], [2010, 12000], [2015, 7500], [2020, 6375], [2025, 5459]] },
  { name: 'Reino Unido', color: '#a78bfa', pts: [[1952, 0], [1953, 1], [1955, 10], [1960, 30], [1965, 310], [1970, 375], [1975, 500], [1980, 350], [1985, 350], [1990, 400], [1995, 300], [2000, 280], [2005, 280], [2010, 225], [2015, 215], [2020, 195], [2025, 225]] },
  { name: 'Francia', color: '#38bdf8', pts: [[1963, 0], [1964, 4], [1965, 32], [1970, 36], [1975, 188], [1980, 250], [1985, 360], [1990, 505], [1995, 500], [2000, 470], [2005, 350], [2010, 300], [2015, 300], [2020, 290], [2025, 290]] },
  { name: 'China', color: '#facc15', pts: [[1963, 0], [1964, 1], [1965, 5], [1970, 75], [1975, 185], [1980, 280], [1985, 243], [1990, 232], [1995, 234], [2000, 232], [2005, 235], [2010, 240], [2015, 260], [2020, 320], [2025, 600]] },
  { name: 'Israel', color: '#5eead4', pts: [[1966, 0], [1970, 10], [1980, 30], [1990, 50], [2000, 80], [2010, 80], [2020, 90], [2025, 90]] },
  { name: 'India', color: '#fb923c', pts: [[1997, 0], [2000, 30], [2005, 50], [2010, 80], [2015, 110], [2020, 150], [2025, 180]] },
  { name: 'Pakistán', color: '#4ade80', pts: [[1997, 0], [2000, 30], [2005, 50], [2010, 90], [2015, 120], [2020, 160], [2025, 170]] },
  { name: 'Corea del Norte', color: '#f472b6', pts: [[2005, 0], [2006, 1], [2010, 5], [2015, 10], [2020, 40], [2025, 50]] },
];

/** número de pruebas nucleares por año en el mundo (OTPCE / Yang y otros, 2003) */
const TESTS_YEAR: [number, number][] = [
  [1945, 1], [1946, 2], [1947, 0], [1948, 3], [1949, 1], [1950, 0], [1951, 18], [1952, 11], [1953, 18], [1954, 16], [1955, 24], [1956, 33], [1957, 55],
  [1958, 116], [1959, 0], [1960, 3], [1961, 71], [1962, 178], [1963, 50], [1964, 60], [1965, 58], [1966, 76], [1967, 64], [1968, 79], [1969, 67], [1970, 64],
  [1971, 53], [1972, 57], [1973, 48], [1974, 57], [1975, 51], [1976, 44], [1977, 54], [1978, 66], [1979, 58], [1980, 54], [1981, 50], [1982, 49], [1983, 55],
  [1984, 57], [1985, 35], [1986, 23], [1987, 47], [1988, 40], [1989, 28], [1990, 18], [1991, 14], [1992, 8], [1993, 1], [1994, 2], [1995, 5], [1996, 4],
  [1997, 0], [1998, 4], [1999, 0], [2000, 0], [2001, 0], [2002, 0], [2003, 0], [2004, 0], [2005, 0], [2006, 1], [2007, 0], [2008, 0], [2009, 1], [2010, 0],
  [2011, 0], [2012, 0], [2013, 1], [2014, 0], [2015, 0], [2016, 2], [2017, 1],
];
const TESTS_COUNTRY: [string, number, string, string][] = [
  ['EE. UU.', 1030, '#4f8fe8', '1945–1992 · incluye 2 usos en guerra no contados aquí y 24 pruebas conjuntas con el Reino Unido'],
  ['URSS', 715, '#e85a4f', '1949–1990'],
  ['Francia', 210, '#38bdf8', '1960–1996'],
  ['Reino Unido', 45, '#a78bfa', '1952–1991'],
  ['China', 45, '#facc15', '1964–1996'],
  ['Corea del Norte', 6, '#f472b6', '2006–2017'],
  ['India', 3, '#fb923c', '1974 y 1998 (6 artefactos)'],
  ['Pakistán', 2, '#4ade80', '1998 (6 artefactos)'],
];
const YIELDS: [string, number][] = [
  ['Davy Crockett (W54)', 0.02], ['Little Boy (Hiroshima)', 15], ['Fat Man (Nagasaki)', 21], ['Corea del Norte 2017', 250], ['W88 (Trident II)', 475],
  ['B83', 1200], ['Ivy Mike', 10400], ['Castle Bravo', 15000], ['Tsar Bomba', 50000],
];
const DOOMSDAY: [number, number][] = [
  [1947, 420], [1949, 180], [1953, 120], [1960, 420], [1963, 720], [1968, 420], [1969, 600], [1972, 720], [1974, 540], [1980, 420], [1981, 240], [1984, 180],
  [1988, 360], [1990, 600], [1991, 1020], [1995, 840], [1998, 540], [2002, 420], [2007, 300], [2010, 360], [2012, 300], [2015, 180], [2017, 150], [2018, 120],
  [2020, 100], [2023, 90], [2025, 89], [2026, 85],
];

// ======================================================================== gráficos
export function mountChart(id: ChartId, slot: HTMLElement): Mounted {
  slot.innerHTML = '';
  const wrap = h('div', 'ch-wrap');
  const tip = h('div', 'ch-tip');
  wrap.append(tip);
  slot.append(wrap);
  const show = (e: MouseEvent, html: string) => {
    const r = wrap.getBoundingClientRect();
    tip.innerHTML = html; tip.style.display = 'block';
    const x = e.clientX - r.left, y = e.clientY - r.top;
    tip.style.left = `${Math.min(r.width - tip.offsetWidth - 4, x + 14)}px`; tip.style.top = `${Math.max(0, y - 40)}px`;
  };
  const hide = () => { tip.style.display = 'none'; };
  if (id === 'arsenals') lineChart(wrap, show, hide);
  else if (id === 'tests-per-year') barChart(wrap, TESTS_YEAR, 'pruebas', show, hide, '#ff8a3d');
  else if (id === 'tests-by-country') hBars(wrap, TESTS_COUNTRY.map(([n, v, c, d]) => ({ n, v, c, d })), 'pruebas', show, hide, false);
  else if (id === 'yields') hBars(wrap, YIELDS.map(([n, v]) => ({ n, v, c: '#ff8a3d', d: fmtEnergy(v) })), 'kt', show, hide, true);
  else if (id === 'doomsday') doomsday(wrap, show, hide);
  return { destroy() { slot.innerHTML = ''; } };
}

type Show = (e: MouseEvent, html: string) => void;

function lineChart(wrap: HTMLElement, show: Show, hide: () => void) {
  const on = new Set(ARSENALS.map((a) => a.name));
  let log = false;
  const leg = h('div', 'ch-leg');
  const W = 900, H = 380, L = 56, R = 14, T = 12, B = 30;
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ch-svg' });
  const ctl = h('div', 'ch-leg');
  const logBtn = h('span', '', '<i style="background:transparent;box-shadow:inset 0 0 0 1px currentColor"></i>Escala logarítmica');
  logBtn.classList.add('off');
  logBtn.onclick = () => { log = !log; logBtn.classList.toggle('off', !log); draw(); };
  ctl.append(logBtn);
  for (const a of ARSENALS) {
    const s = h('span', '', `<i style="background:${a.color}"></i>${a.name}`);
    s.onclick = () => { if (on.has(a.name)) on.delete(a.name); else on.add(a.name); s.classList.toggle('off', !on.has(a.name)); draw(); };
    leg.append(s);
  }
  wrap.append(leg, svg, ctl);
  const x = (y: number) => L + ((y - 1945) / (2026 - 1945)) * (W - L - R);
  const draw = () => {
    svg.innerHTML = '';
    const vis = ARSENALS.filter((a) => on.has(a.name));
    const max = Math.max(10, ...vis.flatMap((a) => a.pts.map((p) => p[1])));
    const y = (v: number) => log ? T + (1 - Math.log10(Math.max(1, v)) / Math.log10(max * 1.1)) * (H - T - B) : T + (1 - v / (max * 1.05)) * (H - T - B);
    const ticks = log ? [1, 10, 100, 1000, 10000, 40000].filter((v) => v <= max * 1.1) : niceTicks(max * 1.05, 5);
    for (const v of ticks) { sv('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'ch-grid' }, svg); sv('text', { x: L - 8, y: y(v) + 4, 'text-anchor': 'end' }, svg).textContent = nf(v); }
    for (let yr = 1950; yr <= 2025; yr += 10) sv('text', { x: x(yr), y: H - 8, 'text-anchor': 'middle' }, svg).textContent = String(yr);
    sv('line', { x1: L, x2: W - R, y1: H - B, y2: H - B, class: 'ch-axis' }, svg);
    for (const a of vis) {
      const d = a.pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join('');
      sv('path', { d, fill: 'none', stroke: a.color, 'stroke-width': 2.2 }, svg);
    }
    // franja interactiva
    const hit = sv('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent' }, svg);
    const cursor = sv('line', { y1: T, y2: H - B, stroke: 'currentColor', 'stroke-opacity': 0.3, visibility: 'hidden' }, svg);
    hit.addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect();
      const px = ((e as MouseEvent).clientX - r.left) / r.width * W;
      const yr = Math.round(1945 + ((px - L) / (W - L - R)) * (2026 - 1945));
      cursor.setAttribute('x1', String(x(yr))); cursor.setAttribute('x2', String(x(yr))); cursor.setAttribute('visibility', 'visible');
      const rows = vis.map((a) => [a, interp(a.pts, yr)] as const).filter(([, v]) => v > 0).sort((p, q) => q[1] - p[1]);
      show(e as MouseEvent, `<b>${yr}</b><br>${rows.map(([a, v]) => `<span style="color:${a.color}">■</span> ${a.name}: <b>${nf(v)}</b>`).join('<br>') || 'Sin armas'}<br>Total: <b>${nf(rows.reduce((s, r) => s + r[1], 0))}</b>`);
    });
    hit.addEventListener('mouseleave', () => { hide(); cursor.setAttribute('visibility', 'hidden'); });
  };
  draw();
}

function interp(pts: [number, number][], yr: number) {
  if (yr < pts[0][0]) return 0;
  for (let i = 1; i < pts.length; i++) if (yr <= pts[i][0]) { const [a, va] = pts[i - 1], [b, vb] = pts[i]; return Math.round(va + ((yr - a) / (b - a)) * (vb - va)); }
  return pts[pts.length - 1][1];
}
function niceTicks(max: number, n: number) {
  const step = Math.pow(10, Math.floor(Math.log10(max / n)));
  const m = [1, 2, 5, 10].find((k) => max / (k * step) <= n) ?? 10;
  const out: number[] = [];
  for (let v = 0; v <= max; v += m * step) out.push(v);
  return out;
}

function barChart(wrap: HTMLElement, data: [number, number][], unit: string, show: Show, hide: () => void, color: string) {
  const W = 900, H = 300, L = 40, R = 10, T = 10, B = 28;
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ch-svg' });
  wrap.append(svg);
  const max = Math.max(...data.map((d) => d[1]));
  const bw = (W - L - R) / data.length;
  for (const v of niceTicks(max * 1.05, 4)) { const y = T + (1 - v / (max * 1.05)) * (H - T - B); sv('line', { x1: L, x2: W - R, y1: y, y2: y, class: 'ch-grid' }, svg); sv('text', { x: L - 6, y: y + 4, 'text-anchor': 'end' }, svg).textContent = nf(v); }
  data.forEach(([yr, v], i) => {
    const bh = (v / (max * 1.05)) * (H - T - B);
    const r = sv('rect', { x: L + i * bw + 0.5, y: H - B - bh, width: Math.max(1, bw - 1.5), height: Math.max(0, bh), fill: color, 'fill-opacity': 0.85 }, svg);
    const hitR = sv('rect', { x: L + i * bw, y: T, width: bw, height: H - T - B, fill: 'transparent' }, svg);
    hitR.addEventListener('mousemove', (e) => { r.setAttribute('fill-opacity', '1'); show(e as MouseEvent, `<b>${yr}</b>: ${nf(v)} ${unit}`); });
    hitR.addEventListener('mouseleave', () => { r.setAttribute('fill-opacity', '0.85'); hide(); });
    if (yr % 10 === 0) sv('text', { x: L + i * bw + bw / 2, y: H - 8, 'text-anchor': 'middle' }, svg).textContent = String(yr);
  });
  sv('line', { x1: L, x2: W - R, y1: H - B, y2: H - B, class: 'ch-axis' }, svg);
  // tratados
  for (const [yr, txt] of [[1963, 'Tratado de prohibición parcial (1963)'], [1996, 'Tratado de prohibición completa (1996)']] as [number, string][]) {
    const i = data.findIndex((d) => d[0] === yr);
    if (i < 0) continue;
    const xx = L + i * bw + bw / 2;
    sv('line', { x1: xx, x2: xx, y1: T, y2: H - B, stroke: 'currentColor', 'stroke-opacity': 0.35, 'stroke-dasharray': '3 3' }, svg);
    sv('text', { x: xx + 4, y: T + 12 }, svg).textContent = txt;
  }
}

function hBars(wrap: HTMLElement, rows: { n: string; v: number; c: string; d: string }[], unit: string, show: Show, hide: () => void, log: boolean) {
  const W = 900, rowH = 30, L = 190, R = 90;
  const H = rows.length * rowH + 8;
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ch-svg' });
  wrap.append(svg);
  const max = Math.max(...rows.map((r) => r.v));
  const f = (v: number) => log ? Math.log10(v / 0.01 + 1) / Math.log10(max / 0.01 + 1) : v / max;
  rows.forEach((r, i) => {
    const y = 4 + i * rowH;
    sv('text', { x: L - 10, y: y + rowH / 2 + 4, 'text-anchor': 'end' }, svg).textContent = r.n;
    const w = Math.max(2, f(r.v) * (W - L - R));
    const b = sv('rect', { x: L, y: y + 5, width: w, height: rowH - 10, fill: r.c, 'fill-opacity': 0.85 }, svg);
    sv('text', { x: L + w + 8, y: y + rowH / 2 + 4 }, svg).textContent = unit === 'kt' ? r.d : nf(r.v);
    const hit = sv('rect', { x: 0, y, width: W, height: rowH, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', (e) => { b.setAttribute('fill-opacity', '1'); show(e as MouseEvent, `<b>${r.n}</b><br>${unit === 'kt' ? r.d : `${nf(r.v)} ${unit}`}${unit !== 'kt' ? `<br>${r.d}` : ''}`); });
    hit.addEventListener('mouseleave', () => { b.setAttribute('fill-opacity', '0.85'); hide(); });
  });
  if (log) { const n = h('div', 'w-note', 'Escala logarítmica: cada salto equivale a multiplicar la potencia muchas veces.'); wrap.append(n); }
}

function doomsday(wrap: HTMLElement, show: Show, hide: () => void) {
  const W = 900, H = 260, L = 56, R = 14, T = 12, B = 28;
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ch-svg' });
  wrap.append(svg);
  const x = (y: number) => L + ((y - 1945) / (2027 - 1945)) * (W - L - R);
  const y = (s: number) => T + (s / 1080) * (H - T - B);
  for (const m of [0, 3, 6, 9, 12, 15, 18]) { sv('line', { x1: L, x2: W - R, y1: y(m * 60), y2: y(m * 60), class: 'ch-grid' }, svg); sv('text', { x: L - 8, y: y(m * 60) + 4, 'text-anchor': 'end' }, svg).textContent = `${m} min`; }
  for (let yr = 1950; yr <= 2025; yr += 10) sv('text', { x: x(yr), y: H - 8, 'text-anchor': 'middle' }, svg).textContent = String(yr);
  let d = '';
  DOOMSDAY.forEach(([yr, s], i) => { const nx = i + 1 < DOOMSDAY.length ? DOOMSDAY[i + 1][0] : 2027; d += `${i ? 'L' : 'M'}${x(yr)},${y(s)}H${x(nx)}`; });
  sv('path', { d, fill: 'none', stroke: '#ff5a1f', 'stroke-width': 2.4 }, svg);
  sv('text', { x: L + 6, y: T + 12 }, svg).textContent = 'Medianoche ↑';
  DOOMSDAY.forEach(([yr, s]) => {
    const c = sv('circle', { cx: x(yr), cy: y(s), r: 4, fill: '#ff5a1f' }, svg);
    c.addEventListener('mousemove', (e) => show(e as MouseEvent, `<b>${yr}</b>: ${s >= 120 ? `${nf(s / 60, 1)} minutos` : `${s} segundos`} para la medianoche`));
    c.addEventListener('mouseleave', hide);
  });
}

// ======================================================================== calculadoras
const ENV: Environment = { windFromDeg: 270, windKmh: 20, humidity: 60, visibilityKm: 20, hour: 12, outdoorPct: 25, rainMmH: 0, windProfile: null } as unknown as Environment;
const nuke = (Y: number): NuclearInput => ({ kind: 'nuclear', name: 'Cálculo', yieldKt: Y, fission: 0.5, burst: 'optimal', heightM: 0 } as NuclearInput);

function slider(label: string, min: number, max: number, step: number, value: number, fmt: (v: number) => string) {
  const lab = h('label');
  const val = h('b');
  const inp = document.createElement('input');
  inp.type = 'range'; inp.min = String(min); inp.max = String(max); inp.step = String(step); inp.value = String(value);
  lab.append(document.createTextNode(label), val, inp);
  const fill = () => { inp.style.setProperty('--p', `${((+inp.value - min) / (max - min)) * 100}%`); val.textContent = fmt(+inp.value); };
  inp.addEventListener('input', fill); fill();
  return { el: lab, inp };
}
const out = (pairs: [string, string][]) => pairs.map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join('');

export function mountWidget(id: WidgetId, slot: HTMLElement): Mounted {
  slot.innerHTML = '';
  const box = h('div', 'w-box');
  slot.append(box);
  const row = h('div', 'w-row'), res = h('div', 'w-out'), note = h('div', 'w-note');
  box.append(row, res, note);
  const kt = (v: number) => Math.pow(10, v);
  if (id === 'scaling' || id === 'distance') {
    const y = slider('Potencia', -2, 4.7, 0.01, Math.log10(id === 'scaling' ? 100 : 15), (v) => fmtEnergy(kt(v)));
    const d = id === 'distance' ? slider('Distancia', 2.5, 5, 0.01, Math.log10(3000), (v) => fmtDist(Math.pow(10, v))) : null;
    row.append(y.el); if (d) row.append(d.el);
    const svg = sv('svg', { viewBox: '0 0 300 160', class: 'ch-svg', style: 'max-width:420px;margin-top:10px' });
    if (id === 'scaling') box.append(svg);
    const upd = () => {
      const Y = kt(+y.inp.value);
      const fx = computeEffects(nuke(Y), ENV, 0, 0);
      const r = (rid: string) => fx.rings.find((x) => x.id === rid)?.radiusM ?? 0;
      if (id === 'scaling') {
        const rows: [string, number, string][] = [['Bola de fuego', fx.fireball.radiusM, '#ffcf4a'], ['Destrucción total (20 psi)', r('psi20'), '#ff3b30'], ['Daño grave (5 psi)', r('psi5'), '#ff8a3d'], ['Quemaduras de 3.er grado', r('burn3'), '#ffb020'], ['Rotura de cristales (1 psi)', r('psi1'), '#9ca3af']];
        res.innerHTML = out(rows.map(([k, v]) => [k, fmtDist(v)]));
        const max = Math.max(...rows.map((x) => x[1]));
        svg.innerHTML = '';
        for (const [, v, c] of [...rows].sort((a, b) => b[1] - a[1])) sv('circle', { cx: 150, cy: 80, r: Math.max(0.6, (v / max) * 76), fill: c, 'fill-opacity': 0.12, stroke: c, 'stroke-width': 1.4 }, svg);
        note.textContent = `Ley de la raíz cúbica: multiplicar la potencia por 1000 sólo multiplica por 10 los radios de la onda expansiva. Con ${fmtEnergy(Y)}, la zona de daño grave mide ${nf(Math.PI * (r('psi5') / 1000) ** 2, 1)} km².`;
      } else {
        const D = Math.pow(10, +d!.inp.value);
        const psi = fx.pressurePsiAt(D), q = fx.thermalFluenceAt(D), dose = fx.doseRemAt(D);
        const sev = psi >= 20 ? 'destrucción total' : psi >= 5 ? 'la mayoría de los edificios se derrumban' : psi >= 1 ? 'cristales rotos, heridos por los fragmentos' : 'apenas daños';
        res.innerHTML = out([['Sobrepresión', `${nf(psi, psi < 1 ? 2 : 1)} psi`], ['Calor recibido', `${nf(q / 4.184e4, 1)} cal/cm²`], ['Radiación inicial', `${nf(dose, dose < 10 ? 1 : 0)} rem`], ['Llegada de la onda', `${nf(fx.shock ? interpT(fx.shock, D) : D / 340, 1)} s`]]);
        note.textContent = `A ${fmtDist(D)}: ${sev}. ${q / 4.184e4 >= 8 ? 'Quemaduras de tercer grado en la piel expuesta.' : q / 4.184e4 >= 3 ? 'Quemaduras de primer o segundo grado.' : ''} ${dose >= 500 ? 'Dosis de radiación probablemente mortal.' : ''}`;
      }
    };
    y.inp.addEventListener('input', upd); d?.inp.addEventListener('input', upd); upd();
  } else if (id === 'decay') {
    const r1 = slider('Tasa de dosis a H+1', 0, 3, 0.01, 2, (v) => `${nf(Math.pow(10, v), 0)} R/h`);
    const t = slider('Horas desde la explosión', 0, 3, 0.01, Math.log10(24), (v) => { const hh = Math.pow(10, v); return hh < 48 ? `${nf(hh, 1)} h` : `${nf(hh / 24, 1)} días`; });
    row.append(r1.el, t.el);
    const upd = () => {
      const R1 = Math.pow(10, +r1.inp.value), T = Math.pow(10, +t.inp.value);
      const rate = R1 * Math.pow(T, -1.2);
      const dose = (a: number, b: number) => 5 * R1 * (Math.pow(a, -0.2) - Math.pow(b, -0.2));
      res.innerHTML = out([['Tasa de dosis ahora', `${nf(rate, rate < 1 ? 2 : 1)} R/h`], ['Dosis acumulada a la intemperie', `${nf(dose(1, Math.max(1.0001, T)), 0)} R`], ['Restante (10 % del inicial a las 7 h)', `${nf((rate / R1) * 100, 2)} %`]]);
      note.textContent = 'Regla del 7-10: cada vez que el tiempo se multiplica por 7, la radiactividad se divide por 10. Quedarse a cubierto las primeras 24–48 horas evita la mayor parte de la dosis.';
    };
    r1.inp.addEventListener('input', upd); t.inp.addEventListener('input', upd); upd();
  } else if (id === 'energy') {
    const e = slider('Energía', -6, 5.5, 0.01, Math.log10(15), (v) => fmtEnergy(kt(v)));
    row.append(e.el);
    const upd = () => {
      const K = kt(+e.inp.value), J = K * 4.184e12;
      const mag = (2 / 3) * (Math.log10(J) - 4.8);
      res.innerHTML = out([['Julios', J.toExponential(2).replace('.', ',').replace('e+', ' · 10^')], ['Bombas de Hiroshima', nf(K / 15, K < 15 ? 3 : 0)], ['Kilovatios hora', nf(J / 3.6e6, 0)], ['Rayos', nf(J / 1e9, 0)], ['Terremoto equivalente', `magnitud ${nf(mag, 1)}`], ['Masa convertida (E = mc²)', `${nf((J / 9e16) * 1000, 3)} g`]]);
      note.textContent = 'La magnitud equivale a un terremoto que liberase toda esa energía en ondas sísmicas; una explosión real sólo convierte en ondas una pequeña parte.';
    };
    e.inp.addEventListener('input', upd); upd();
  } else if (id === 'asteroid') {
    const D = slider('Diámetro', 0, 4, 0.01, Math.log10(50), (v) => fmtDist(Math.pow(10, v)));
    const v = slider('Velocidad', 11, 72, 0.5, 20, (x) => `${nf(x, 1)} km/s`);
    const rho = slider('Densidad', 600, 7800, 100, 3000, (x) => `${nf(x)} kg/m³`);
    row.append(D.el, v.el, rho.el);
    const upd = () => {
      const d = Math.pow(10, +D.inp.value), V = +v.inp.value * 1000, R = +rho.inp.value;
      const m = R * Math.PI * d ** 3 / 6;
      const E = 0.5 * m * V * V / 4.184e12; // kt
      const perYear = 3.7 * Math.pow(E, -0.9);
      const every = 1 / perYear;
      res.innerHTML = out([['Masa', m > 1e9 ? `${nf(m / 1e9, 1)} millones de t` : `${nf(m / 1000, 0)} t`], ['Energía', fmtEnergy(E)], ['Bombas de Hiroshima', nf(E / 15, 0)], ['Frecuencia', every < 1 ? `${nf(perYear, 1)} al año` : every < 1e6 ? `una vez cada ${nf(every, 0)} años` : `una vez cada ${nf(every / 1e6, 1)} millones de años`]]);
      note.textContent = d < 25 ? 'Los objetos de este tamaño suelen estallar en la alta atmósfera: el peligro es la onda expansiva (como en Cheliábinsk), no el cráter.' : d < 1000 ? 'Un objeto así arrasaría una región entera; si cae al mar, provocaría un tsunami.' : 'A partir de un kilómetro, las consecuencias son globales: el polvo y el hollín enfriarían el planeta.';
    };
    for (const s of [D, v, rho]) s.inp.addEventListener('input', upd);
    upd();
  }
  return { destroy() { slot.innerHTML = ''; } };
}

function interpT(shock: { r: number[]; t: number[] }, r: number) {
  const { r: rs, t } = shock;
  if (r <= rs[0]) return t[0];
  for (let i = 1; i < rs.length; i++) if (r <= rs[i]) return t[i - 1] + ((r - rs[i - 1]) / (rs[i] - rs[i - 1])) * (t[i] - t[i - 1]);
  return t[t.length - 1];
}
