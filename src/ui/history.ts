/**
 * Historia de las pruebas nucleares (1945–2017): el mapa del mundo con un calendario visual. El
 * tiempo avanza mes a mes y cada explosión es un destello en su lugar, con el color de su país;
 * quedan marcadas en el mapa, los contadores de cada país suben y, en los momentos clave (Trinity,
 * Hiroshima, la Tsar Bomba, los tratados…), aparece una frase. Abajo, un histograma de los años
 * sirve de calendario: se puede pulsar o arrastrar para ir a cualquier fecha.
 *
 * Datos: SIPRI / FOA, Bergkvist y Ferm (2000), «Nuclear Explosions 1945–1998» (2051 explosiones),
 * más las 6 pruebas de Corea del Norte (2006–2017) con rendimientos estimados.
 */
import maplibregl, { type Map as MLMap, type GeoJSONSource } from 'maplibre-gl';
import { h, fmtNum } from './dom';
import { tr } from '../i18n';
import { LOCALE } from '../i18n/locale';

export const HIST_COUNTRIES: { name: string; color: string }[] = [
  { name: 'Estados Unidos', color: '#4f8ff7' },
  { name: 'URSS', color: '#ef4444' },
  { name: 'Reino Unido', color: '#c084fc' },
  { name: 'Francia', color: '#2dd4bf' },
  { name: 'China', color: '#facc15' },
  { name: 'India', color: '#fb923c' },
  { name: 'Pakistán', color: '#4ade80' },
  { name: 'Corea del Norte', color: '#f472b6' },
];
const KINDS = ['Atmosférica', 'Subterránea', 'Submarina', 'A gran altura', 'En combate'];
const PURPOSES = ['Desarrollo de armas', 'Explosión «pacífica» (obras, minería)', 'Uso en guerra'];
/** pitidos de cada país (como en el vídeo de Isao Hashimoto) */
const TONES = [880, 523, 698, 784, 1047, 659, 587, 932];

/** día 0 = 1 de enero de 1945 */
const DAY0 = Date.UTC(1945, 0, 1);
const dayOf = (y: number, m: number, d: number) => Math.round((Date.UTC(y, m - 1, d) - DAY0) / 86400000);
const dateOf = (day: number) => new Date(DAY0 + day * 86400000);
const T0 = dayOf(1945, 7, 1), T1 = dayOf(2018, 1, 1);
const Y0 = 1945, Y1 = 2017;

/** momentos clave que se escriben bajo la fecha */
const MILESTONES: [number, string][] = [
  [dayOf(1945, 7, 16), 'Trinity: la primera explosión nuclear, en el desierto de Nuevo México'],
  [dayOf(1945, 8, 6), 'Hiroshima: primera bomba atómica usada en una guerra'],
  [dayOf(1945, 8, 9), 'Nagasaki: la segunda y, hasta hoy, la última usada en una guerra'],
  [dayOf(1946, 7, 1), 'Operación Crossroads en Bikini: bombas contra una flota de barcos vacíos'],
  [dayOf(1949, 8, 29), 'La URSS prueba su primera bomba: empieza la carrera nuclear'],
  [dayOf(1952, 10, 3), 'El Reino Unido prueba su primera bomba, en un barco en Australia'],
  [dayOf(1952, 11, 1), 'Ivy Mike: la primera bomba de hidrógeno, 700 veces Hiroshima'],
  [dayOf(1954, 3, 1), 'Castle Bravo: 15 Mt; la lluvia radiactiva alcanza a pescadores japoneses'],
  [dayOf(1958, 11, 1), 'Moratoria: EE. UU., la URSS y el Reino Unido dejan de probar casi tres años'],
  [dayOf(1960, 2, 13), 'Francia prueba su primera bomba, en el Sáhara argelino'],
  [dayOf(1961, 9, 1), 'La URSS rompe la moratoria: el año más intenso de la historia está por llegar'],
  [dayOf(1961, 10, 30), 'Tsar Bomba: 50 Mt, la mayor explosión jamás provocada'],
  [dayOf(1962, 10, 16), 'Crisis de los misiles de Cuba: el mundo, al borde de la guerra nuclear'],
  [dayOf(1963, 8, 5), 'Tratado de prohibición parcial: se acaban las pruebas en el aire, el espacio y el mar'],
  [dayOf(1964, 10, 16), 'China prueba su primera bomba'],
  [dayOf(1967, 6, 17), 'China prueba su primera bomba de hidrógeno'],
  [dayOf(1968, 7, 1), 'Tratado de No Proliferación: sólo cinco países podrán tener armas nucleares'],
  [dayOf(1974, 5, 18), 'La India prueba su primera bomba, presentada como «explosión pacífica»'],
  [dayOf(1974, 9, 15), 'Francia pasa a las pruebas subterráneas'],
  [dayOf(1980, 10, 16), 'Última prueba en la atmósfera de la historia (China)'],
  [dayOf(1990, 10, 24), 'Última prueba soviética'],
  [dayOf(1991, 11, 26), 'Última prueba británica'],
  [dayOf(1992, 9, 23), 'Última prueba de Estados Unidos'],
  [dayOf(1996, 1, 27), 'Última prueba francesa'],
  [dayOf(1996, 7, 29), 'Última prueba china'],
  [dayOf(1996, 9, 24), 'Se firma el Tratado de prohibición completa (TPCE): aún no ha entrado en vigor'],
  [dayOf(1998, 5, 11), 'La India vuelve a probar, y dos semanas después Pakistán responde'],
  [dayOf(2006, 10, 9), 'Corea del Norte hace su primera prueba'],
  [dayOf(2017, 9, 3), 'Sexta y mayor prueba norcoreana: la última prueba nuclear hasta hoy'],
];

type Test = [number, number, number, number, number, number, number, string, number];
interface Data { regions: string[]; tests: Test[] }

const SPEEDS: [string, number][] = [['1 mes/s', 30.44], ['3 meses/s', 91.3], ['1 año/s', 365.25]];

export class History {
  active = false;
  /** se llama al abrir (para preparar el mapa) y al cerrar */
  onOpen: () => void = () => {};
  onClose: () => void = () => {};
  onBook: () => void = () => {};
  /** momento clave (para leerlo en voz alta); si devuelve una promesa, el tiempo espera a que acabe */
  onMilestone: (text: string) => Promise<void> | void = () => {};
  private map: MLMap;
  private data: Data | null = null;
  private el: HTMLElement;
  private dateEl!: HTMLElement;
  private capEl!: HTMLElement;
  private tallyEl!: HTMLElement;
  private totEl!: HTMLElement;
  private cv!: HTMLCanvasElement;
  private playBtn!: HTMLButtonElement;
  private soundBtn!: HTMLButtonElement;
  private day = T0;
  private playing = false;
  private speed = 91.3;
  private sound = true;
  private raf = 0;
  private lastReal = 0;
  /** índice de la siguiente prueba por llegar */
  private next = 0;
  /** destellos vivos: índice de la prueba y momento (real) en que estalló */
  private flashes: { i: number; t0: number }[] = [];
  private lastDots = -1;
  private capUntil = 0;
  private holdUntil = 0;
  private nextMs = 0;
  private audio: AudioContext | null = null;
  private beeps = 0;
  private beepWin = 0;
  private popup: maplibregl.Popup | null = null;
  private yearStacks: number[][] = [];
  private dragging = false;

  constructor(map: MLMap, parent: HTMLElement) {
    this.map = map;
    this.el = h('div', { id: 'history', class: 'hidden' });
    parent.append(this.el);
  }

  // ---------------------------------------------------------------- abrir y cerrar
  async open() {
    if (this.active) return;
    this.active = true;
    if (!this.data) this.data = (await import('../data/tests-history.json')).default as unknown as Data;
    this.build();
    this.onOpen();
    this.installLayers();
    this.seek(T0);
    this.el.classList.remove('hidden');
    document.body.classList.add('hist-on');
    try { this.audio ??= new AudioContext(); void this.audio.resume(); } catch { this.audio = null; }
    this.play(false);
    // empieza cuando la cámara ya enseña el mundo entero
    setTimeout(() => { if (this.active && !this.playing && this.day <= T0 + 1) this.play(true); }, 1800);
    window.addEventListener('keydown', this.onKey);
  }

  close() {
    if (!this.active) return;
    this.active = false;
    this.play(false);
    this.popup?.remove();
    this.el.classList.add('hidden');
    document.body.classList.remove('hist-on');
    for (const id of ['hist-flash-glow', 'hist-flash', 'hist-dots', 'hist-dim']) if (this.map.getLayer(id)) this.map.removeLayer(id);
    for (const id of ['hist-flash', 'hist-dots', 'hist-dim']) if (this.map.getSource(id)) this.map.removeSource(id);
    window.removeEventListener('keydown', this.onKey);
    this.onClose();
  }

  private onKey = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.closest('input, select, textarea')) return;
    if (e.key === 'Escape') { this.close(); e.preventDefault(); }
    else if (e.key === ' ') { this.play(!this.playing); e.preventDefault(); e.stopPropagation(); }
    else if (e.key === 'ArrowRight') { this.seek(this.day + 365.25); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { this.seek(this.day - 365.25); e.preventDefault(); }
  };

  // ---------------------------------------------------------------- interfaz
  private build() {
    if (this.el.childElementCount) return;
    const D = this.data!;
    // histograma por años y países
    this.yearStacks = Array.from({ length: Y1 - Y0 + 1 }, () => HIST_COUNTRIES.map(() => 0));
    for (const t of D.tests) this.yearStacks[dateOf(t[0]).getUTCFullYear() - Y0][t[1]]++;

    this.dateEl = h('div', { class: 'hs-date' });
    this.capEl = h('div', { class: 'hs-cap' });
    this.totEl = h('div', { class: 'hs-tot' });
    this.tallyEl = h('div', { class: 'hs-tally' });
    this.playBtn = h('button', { type: 'button', class: 'hs-play', title: 'Reproducir o pausar (espacio)', onclick: () => this.play(!this.playing) }) as HTMLButtonElement;
    const speedSeg = h('div', { class: 'seg hs-speed' });
    for (const [l, v] of SPEEDS) {
      const b = h('button', { type: 'button', class: v === this.speed ? 'on' : '', onclick: () => { this.speed = v; speedSeg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); } }, l);
      speedSeg.append(b);
    }
    this.soundBtn = h('button', { type: 'button', class: 'hs-btn on', title: 'Un pitido por cada explosión', onclick: () => { this.sound = !this.sound; this.soundBtn.classList.toggle('on', this.sound); } }, 'Sonido') as HTMLButtonElement;
    const book = h('button', { type: 'button', class: 'hs-btn', onclick: () => this.onBook() }, 'Enciclopedia');
    const close = h('button', { type: 'button', class: 'hs-x', title: 'Salir de la historia (Esc)', 'aria-label': 'Salir de la historia', onclick: () => this.close() }, '✕');
    this.cv = h('canvas', { class: 'hs-cal' }) as HTMLCanvasElement;
    const seekAt = (ev: PointerEvent) => {
      const r = this.cv.getBoundingClientRect();
      const u = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      this.seek(dayOf(Y0, 1, 1) + u * (dayOf(Y1 + 1, 1, 1) - dayOf(Y0, 1, 1)));
    };
    this.cv.addEventListener('pointerdown', (ev) => { this.dragging = true; this.cv.setPointerCapture(ev.pointerId); seekAt(ev); });
    this.cv.addEventListener('pointermove', (ev) => { if (this.dragging) seekAt(ev); });
    this.cv.addEventListener('pointerup', () => { this.dragging = false; });
    new ResizeObserver(() => this.drawCalendar()).observe(this.cv);

    this.el.append(
      h('div', { class: 'hs-head' }, h('div', { class: 'hs-title' }, 'Pruebas nucleares en el tiempo'), this.dateEl, this.capEl),
      h('div', { class: 'hs-side' }, this.totEl, this.tallyEl),
      close,
      h('div', { class: 'hs-foot' },
        h('div', { class: 'hs-ctrl' }, this.playBtn, speedSeg, this.soundBtn, book),
        this.cv,
        h('div', { class: 'hs-src' }, 'Datos: SIPRI / FOA (1945–1998) y estimaciones públicas de las pruebas de Corea del Norte (2006–2017). Pulsa un punto para ver la prueba.')),
    );
  }

  private installLayers() {
    const m = this.map, D = this.data!;
    const feats: GeoJSON.Feature[] = D.tests.map((t, i) => ({ type: 'Feature', properties: { i, d: t[0], c: HIST_COUNTRIES[t[1]].color, k: t[5] }, geometry: { type: 'Point', coordinates: [t[3], t[2]] } }));
    // el mapa se oscurece un poco para que destaquen los destellos
    if (!m.getSource('hist-dim')) m.addSource('hist-dim', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]] } } });
    if (!m.getLayer('hist-dim')) m.addLayer({ id: 'hist-dim', type: 'fill', source: 'hist-dim', paint: { 'fill-color': '#04060c', 'fill-opacity': 0.42 } });
    if (!m.getSource('hist-dots')) m.addSource('hist-dots', { type: 'geojson', data: { type: 'FeatureCollection', features: feats } });
    if (!m.getLayer('hist-dots')) m.addLayer({ id: 'hist-dots', type: 'circle', source: 'hist-dots', filter: ['<=', ['get', 'd'], -1], paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, ['match', ['get', 'k'], 1, 2.4, 3.4], 6, ['match', ['get', 'k'], 1, 4, 6]],
      'circle-color': ['get', 'c'], 'circle-opacity': 0.8, 'circle-stroke-color': 'rgba(0,0,0,0.6)', 'circle-stroke-width': 0.6,
    } });
    if (!m.getSource('hist-flash')) m.addSource('hist-flash', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    if (!m.getLayer('hist-flash-glow')) m.addLayer({ id: 'hist-flash-glow', type: 'circle', source: 'hist-flash', paint: { 'circle-radius': ['*', 2.6, ['get', 'r']], 'circle-color': ['get', 'c'], 'circle-opacity': ['*', 0.45, ['get', 'o']], 'circle-blur': 1 } });
    if (!m.getLayer('hist-flash')) m.addLayer({ id: 'hist-flash', type: 'circle', source: 'hist-flash', paint: { 'circle-radius': ['get', 'r'], 'circle-color': ['get', 'w'], 'circle-opacity': ['get', 'o'], 'circle-blur': 0.35 } });
  }

  // ---------------------------------------------------------------- tiempo
  play(on: boolean) {
    this.playing = on;
    if (on && this.day >= T1 - 1) this.seek(T0);
    this.playBtn.innerHTML = on
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>';
    cancelAnimationFrame(this.raf);
    this.lastReal = performance.now();
    if (on) this.raf = requestAnimationFrame(this.tick);
  }

  /** va a una fecha sin destellos (las pruebas anteriores quedan marcadas) */
  seek(day: number) {
    const D = this.data!;
    this.day = Math.max(T0, Math.min(T1, day));
    let i = 0;
    while (i < D.tests.length && D.tests[i][0] <= this.day) i++;
    this.next = i;
    this.flashes = [];
    this.capUntil = 0;
    this.holdUntil = 0;
    // el último momento clave ya pasado se queda escrito un rato
    const ms = MILESTONES.filter(([d]) => d <= this.day).pop();
    this.nextMs = MILESTONES.findIndex(([d]) => d > this.day);
    if (this.nextMs < 0) this.nextMs = MILESTONES.length;
    this.capEl.textContent = ms && this.day - ms[0] < 400 ? ms[1] : '';
    this.render(performance.now(), true);
  }

  private tick = (now: number) => {
    if (!this.active || !this.playing) return;
    const dt = Math.min(0.1, (now - this.lastReal) / 1000);
    this.lastReal = now;
    const D = this.data!;
    // los años sin pruebas (1999–2005, por ejemplo) pasan deprisa
    const nextDay = this.next < D.tests.length ? D.tests[this.next][0] : T1;
    const quiet = nextDay - this.day > 400 && (this.nextMs >= MILESTONES.length || MILESTONES[this.nextMs][0] - this.day > 400);
    // cerca de un momento clave, más despacio para que dé tiempo a verlo y leerlo
    const near = MILESTONES.some(([d]) => Math.abs(d - this.day) < 20);
    // y, tras cada momento clave, casi se detiene un par de segundos para poder leerlo
    const hold = now < this.holdUntil ? 0.12 : 1;
    this.day += dt * this.speed * hold * (quiet ? 6 : near ? Math.min(1, 12 / this.speed) : 1);
    if (this.day >= T1) { this.day = T1; this.render(now, true); this.play(false); return; }
    // pruebas que estallan en este fotograma
    while (this.next < D.tests.length && D.tests[this.next][0] <= this.day) {
      this.flashes.push({ i: this.next, t0: now });
      this.beep(D.tests[this.next][1], now);
      this.next++;
    }
    while (this.nextMs < MILESTONES.length && MILESTONES[this.nextMs][0] <= this.day) {
      this.capEl.textContent = MILESTONES[this.nextMs][1];
      this.capEl.classList.remove('hs-new'); void this.capEl.offsetWidth; this.capEl.classList.add('hs-new');
      this.capUntil = now + 6000;
      this.holdUntil = now + 2200;
      const p = this.onMilestone(MILESTONES[this.nextMs][1]);
      if (p) { this.holdUntil = Infinity; void p.then(() => { this.holdUntil = performance.now() + 400; }); }
      this.nextMs++;
    }
    if (this.capUntil && now > this.capUntil + 4000 / Math.max(1, this.speed / 91)) { this.capEl.textContent = ''; this.capUntil = 0; }
    this.render(now, false);
    this.raf = requestAnimationFrame(this.tick);
  };

  private beep(country: number, now: number) {
    if (!this.sound || !this.audio) return;
    // no más de unos 14 pitidos por segundo: en 1962 hubo días con varias pruebas
    if (now - this.beepWin > 1000) { this.beepWin = now; this.beeps = 0; }
    if (++this.beeps > 14) return;
    const a = this.audio, t = a.currentTime;
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine';
    o.frequency.value = TONES[country];
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.12);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + 0.14);
  }

  // ---------------------------------------------------------------- dibujo
  private render(now: number, force: boolean) {
    const m = this.map, D = this.data!;
    // destellos: crecen y se apagan en menos de un segundo; los atmosféricos, más grandes
    const FL = 900;
    this.flashes = this.flashes.filter((f) => now - f.t0 < FL);
    const feats: GeoJSON.Feature[] = this.flashes.map((f) => {
      const t = D.tests[f.i], u = (now - f.t0) / FL;
      const size = (t[5] === 1 ? 5 : 9) + Math.min(12, 2.2 * Math.log10(1 + Math.max(0.01, t[4]) * 10));
      return { type: 'Feature', properties: { r: size * (0.35 + 0.65 * Math.sqrt(u)), o: Math.max(0, 1 - u * u), c: HIST_COUNTRIES[t[1]].color, w: u < 0.25 ? '#ffffff' : HIST_COUNTRIES[t[1]].color }, geometry: { type: 'Point', coordinates: [t[3], t[2]] } };
    });
    (m.getSource('hist-flash') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: feats });
    // puntos que quedan (el filtro sólo se cambia cuando hay pruebas nuevas)
    if (force || this.next !== this.lastDots) {
      this.lastDots = this.next;
      const lim = this.next > 0 ? D.tests[this.next - 1][0] : -1;
      if (m.getLayer('hist-dots')) m.setFilter('hist-dots', ['<=', ['get', 'd'], lim]);
      this.renderTally();
    }
    const dt = dateOf(this.day);
    const s = dt.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const txt = s.charAt(0).toUpperCase() + s.slice(1);
    if (this.dateEl.textContent !== txt) this.dateEl.textContent = txt;
    this.drawCalendar();
  }

  private renderTally() {
    const D = this.data!;
    const n = HIST_COUNTRIES.map(() => 0), mt = { atm: 0, ug: 0, kt: 0 };
    for (let i = 0; i < this.next; i++) { const t = D.tests[i]; n[t[1]]++; mt.kt += t[4]; if (t[5] === 1) mt.ug++; else mt.atm++; }
    const total = this.next;
    this.totEl.innerHTML = '';
    this.totEl.append(
      h('b', {}, fmtNum(total)), h('span', {}, ` ${total === 1 ? 'explosión' : 'explosiones'}`),
      h('div', { class: 'hs-sub' }, `${fmtNum(mt.atm)} en el aire, el mar o el espacio · ${fmtNum(mt.ug)} bajo tierra`),
      h('div', { class: 'hs-sub' }, `≈ ${mt.kt >= 1000 ? `${fmtNum(Math.round(mt.kt / 1000))} Mt` : `${fmtNum(Math.round(mt.kt))} kt`} en total`),
    );
    this.tallyEl.innerHTML = '';
    HIST_COUNTRIES.forEach((c, i) => {
      if (!n[i] && !D.tests.some((t) => t[1] === i && t[0] <= this.day + 3650)) return;
      this.tallyEl.append(h('div', { class: 'hs-row' + (n[i] ? '' : ' dim') }, h('i', { style: { background: c.color } }), h('span', {}, c.name), h('b', {}, fmtNum(n[i]))));
    });
  }

  private drawCalendar() {
    const cv = this.cv;
    if (!cv || !this.data) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
    if (!W || !H) return;
    if (cv.width !== W) cv.width = W;
    if (cv.height !== H) cv.height = H;
    const g = cv.getContext('2d')!;
    g.clearRect(0, 0, W, H);
    const nY = Y1 - Y0 + 1, bw = W / nY;
    const axis = 14 * dpr, top = 4 * dpr, hh = H - axis - top;
    const max = Math.max(...this.yearStacks.map((s) => s.reduce((a, b) => a + b, 0)));
    const cur = dateOf(this.day).getUTCFullYear() - Y0;
    const fu = (this.day - dayOf(Y0, 1, 1)) / (dayOf(Y1 + 1, 1, 1) - dayOf(Y0, 1, 1));
    this.yearStacks.forEach((st, y) => {
      let yb = top + hh;
      st.forEach((n, c) => {
        if (!n) return;
        const bh = (n / max) * hh;
        g.globalAlpha = y < cur ? 0.95 : y === cur ? 0.95 : 0.28;
        g.fillStyle = HIST_COUNTRIES[c].color;
        g.fillRect(y * bw + 0.6 * dpr, yb - bh, Math.max(1, bw - 1.2 * dpr), bh);
        yb -= bh;
      });
    });
    g.globalAlpha = 1;
    // años
    const css = getComputedStyle(this.el);
    g.fillStyle = css.getPropertyValue('--hs-muted') || '#9aa3b2';
    g.font = `${10 * dpr}px ui-monospace, monospace`;
    g.textAlign = 'center';
    for (let y = 1950; y <= Y1; y += 10) g.fillText(String(y), (y - Y0 + 0.5) * bw, H - 3 * dpr);
    // cursor
    g.fillStyle = '#ffffff';
    g.fillRect(fu * W - dpr, 0, 2 * dpr, H - axis + 2 * dpr);
  }

  /** ficha de una prueba al pulsar su punto */
  handleClick(e: maplibregl.MapMouseEvent): boolean {
    if (!this.active) return false;
    const f = this.map.queryRenderedFeatures(e.point, { layers: ['hist-dots'] })[0];
    this.popup?.remove();
    if (!f) return true;
    const D = this.data!, t = D.tests[f.properties!.i as number];
    const ds = dateOf(t[0]).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    const yieldTxt = t[4] >= 1000 ? `${(t[4] / 1000).toLocaleString(LOCALE, { maximumFractionDigits: 1 })} Mt` : t[4] > 0 ? `${t[4].toLocaleString(LOCALE, { maximumFractionDigits: t[4] < 1 ? 2 : 0 })} kt` : tr('desconocida');
    const el = h('div', { class: 'tp' },
      h('b', {}, t[7] || tr('Prueba sin nombre conocido')),
      h('div', { class: 'tp-meta' }, `${ds} · ${tr(HIST_COUNTRIES[t[1]].name)}`),
      h('div', {}, `${tr(D.regions[t[8]])}`),
      h('div', {}, `${tr(KINDS[t[5]])} · ${tr('Potencia')}: ${yieldTxt}`),
      h('div', { class: 'tp-meta' }, tr(PURPOSES[t[6]])));
    this.popup = new maplibregl.Popup({ closeButton: true, maxWidth: '260px', className: 'bum-popup' }).setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number]).setDOMContent(el).addTo(this.map);
    return true;
  }
}
