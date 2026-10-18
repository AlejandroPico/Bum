/**
 * Las otras dos pestañas de la historia: los arsenales del mundo año a año (1945–2026) y las
 * reconstrucciones de explosiones reales (Hiroshima, Castle Bravo, Tunguska…) para comparar el
 * modelo con lo que pasó.
 */
import type { Map as MLMap, GeoJSONSource } from 'maplibre-gl';
import { h } from './dom';
import { tr } from '../i18n';
import { LOCALE } from '../i18n/locale';
import { ARSENALS, ARS_EVENTS, ARS_Y0, ARS_Y1 } from '../data/arsenals';
import { HISTORIC } from '../data/historic';

export type HistTab = 'tests' | 'arsenal' | 'recon';
const TABS: [HistTab, string][] = [['tests', 'Pruebas'], ['arsenal', 'Arsenales'], ['recon', 'Reconstrucciones']];

/** pestañas comunes a las tres vistas */
export function histTabs(active: HistTab, go: (t: HistTab) => void) {
  const el = h('div', { class: 'hs-tabs' });
  for (const [t, l] of TABS) el.append(h('button', { type: 'button', class: t === active ? 'on' : '', onclick: () => { if (t !== active) go(t); } }, l));
  return el;
}
const fmt = (n: number) => Math.round(n).toLocaleString(LOCALE);
const SPEEDS: [string, number][] = [['Lento', 1], ['Normal', 2.5], ['Rápido', 6]];

/** cabezas de un país en un año con decimales (interpolando entre años) */
function at(n: number[], y: number) {
  const x = Math.max(0, Math.min(n.length - 1, y - ARS_Y0));
  const i = Math.min(n.length - 2, Math.floor(x)), k = x - i;
  return n[i] + (n[i + 1] - n[i]) * k;
}

export class ArsenalView {
  active = false;
  onOpen: () => void = () => {};
  onClose: () => void = () => {};
  onTab: (t: HistTab) => void = () => {};
  onMilestone: (text: string) => Promise<void> | void = () => {};
  private map: MLMap;
  private el: HTMLElement;
  private year = ARS_Y0;
  private playing = false;
  private speed = 2.5;
  private raf = 0;
  private last = 0;
  private nextEv = 0;
  private holdUntil = 0;
  private ui!: { date: HTMLElement; cap: HTMLElement; tot: HTMLElement; tally: HTMLElement; cv: HTMLCanvasElement; play: HTMLButtonElement };
  private dragging = false;

  constructor(map: MLMap, parent: HTMLElement) {
    this.map = map;
    this.el = h('div', { id: 'arsenal', class: 'hs-view hidden' });
    parent.append(this.el);
  }

  open() {
    if (this.active) return;
    this.active = true;
    this.build();
    this.onOpen();
    this.layers();
    this.seek(ARS_Y0);
    this.el.classList.remove('hidden');
    document.body.classList.add('hist-on');
    window.addEventListener('keydown', this.onKey);
    setTimeout(() => { if (this.active && !this.playing && this.year <= ARS_Y0 + 0.01) this.play(true); }, 1600);
  }

  close() {
    if (!this.active) return;
    this.active = false;
    this.play(false);
    this.el.classList.add('hidden');
    document.body.classList.remove('hist-on');
    for (const id of ['ars-lbl', 'ars-pts', 'ars-glow']) if (this.map.getLayer(id)) this.map.removeLayer(id);
    if (this.map.getSource('ars-pts')) this.map.removeSource('ars-pts');
    window.removeEventListener('keydown', this.onKey);
    this.onClose();
  }

  private onKey = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.closest('input, select, textarea')) return;
    if (e.key === 'Escape') { this.close(); e.preventDefault(); }
    else if (e.key === ' ') { this.play(!this.playing); e.preventDefault(); e.stopPropagation(); }
    else if (e.key === 'ArrowRight') { this.seek(this.year + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { this.seek(this.year - 1); e.preventDefault(); }
  };

  private build() {
    if (this.el.childElementCount) return;
    const date = h('div', { class: 'hs-date' }), cap = h('div', { class: 'hs-cap' });
    const tot = h('div', { class: 'hs-tot' }), tally = h('div', { class: 'hs-tally' });
    const play = h('button', { type: 'button', class: 'hs-play', title: 'Reproducir o pausar (espacio)', onclick: () => this.play(!this.playing) }) as HTMLButtonElement;
    const sp = h('div', { class: 'seg hs-speed' });
    for (const [l, v] of SPEEDS) {
      const b = h('button', { type: 'button', class: v === this.speed ? 'on' : '', onclick: () => { this.speed = v; sp.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); } }, l);
      sp.append(b);
    }
    const cv = h('canvas', { class: 'hs-cal ars-cal' }) as HTMLCanvasElement;
    const seekAt = (ev: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      this.seek(ARS_Y0 + Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * (ARS_Y1 - ARS_Y0));
    };
    cv.addEventListener('pointerdown', (ev) => { this.dragging = true; cv.setPointerCapture(ev.pointerId); seekAt(ev); });
    cv.addEventListener('pointermove', (ev) => { if (this.dragging) seekAt(ev); });
    cv.addEventListener('pointerup', () => { this.dragging = false; });
    new ResizeObserver(() => this.drawChart()).observe(cv);
    this.el.append(
      h('div', { class: 'hs-head' }, histTabs('arsenal', (t) => this.onTab(t)), h('div', { class: 'hs-title' }, 'Arsenales nucleares del mundo'), date, cap),
      h('div', { class: 'hs-side' }, tot, tally),
      h('button', { type: 'button', class: 'hs-x', title: 'Salir de la historia (Esc)', 'aria-label': 'Salir de la historia', onclick: () => this.close() }, '✕'),
      h('div', { class: 'hs-foot' },
        h('div', { class: 'hs-ctrl' }, play, sp),
        cv,
        h('div', { class: 'hs-src' }, 'Datos: Federation of American Scientists (Kristensen, Korda y Johns) vía Our World in Data. Cabezas en los arsenales militares, sin las retiradas pendientes de desmontar. Las líneas verticales son tratados e hitos.')),
    );
    this.ui = { date, cap, tot, tally, cv, play };
  }

  private layers() {
    const m = this.map;
    if (!m.getSource('ars-pts')) m.addSource('ars-pts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    const r: any = ['get', 'r'];
    if (!m.getLayer('ars-glow')) m.addLayer({ id: 'ars-glow', type: 'circle', source: 'ars-pts', paint: <any>{ 'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, ['*', 1.25, r], 5, ['*', 2.4, r]], 'circle-color': ['get', 'c'], 'circle-opacity': 0.18, 'circle-blur': 0.8 } });
    if (!m.getLayer('ars-pts')) m.addLayer({ id: 'ars-pts', type: 'circle', source: 'ars-pts', paint: <any>{ 'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, r, 5, ['*', 2, r]], 'circle-color': ['get', 'c'], 'circle-opacity': 0.55, 'circle-stroke-color': ['get', 'c'], 'circle-stroke-width': 1.5 } });
    if (!m.getLayer('ars-lbl')) m.addLayer({ id: 'ars-lbl', type: 'symbol', source: 'ars-pts', layout: { 'text-field': ['get', 'lbl'], 'text-size': 12, 'text-font': ['Noto Sans Regular'], 'text-allow-overlap': true }, paint: { 'text-color': '#fff', 'text-halo-color': '#000', 'text-halo-width': 1.4 } });
  }

  play(on: boolean) {
    this.playing = on;
    if (on && this.year >= ARS_Y1 - 0.01) this.seek(ARS_Y0);
    this.ui.play.innerHTML = on
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>';
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    if (on) this.raf = requestAnimationFrame(this.tick);
  }

  seek(y: number) {
    this.year = Math.max(ARS_Y0, Math.min(ARS_Y1, y));
    this.nextEv = ARS_EVENTS.findIndex((e) => e[0] > this.year);
    if (this.nextEv < 0) this.nextEv = ARS_EVENTS.length;
    const prev = ARS_EVENTS[this.nextEv - 1];
    this.ui.cap.textContent = prev && this.year - prev[0] < 3 ? tr(prev[1]) : '';
    this.holdUntil = 0;
    this.render();
  }

  private tick = (now: number) => {
    if (!this.active || !this.playing) return;
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (now < this.holdUntil) return;
    this.year = Math.min(ARS_Y1, this.year + dt * this.speed);
    // tratados e hitos: se detiene un momento en cada uno (y se leen en voz alta si la narración está activa)
    if (this.nextEv < ARS_EVENTS.length && this.year >= ARS_EVENTS[this.nextEv][0]) {
      const ev = ARS_EVENTS[this.nextEv++];
      this.year = ev[0];
      this.ui.cap.textContent = tr(ev[1]);
      this.ui.cap.classList.remove('hs-new'); void this.ui.cap.offsetWidth; this.ui.cap.classList.add('hs-new');
      this.holdUntil = now + 1800 / Math.sqrt(this.speed / 2.5);
      const p = this.onMilestone(tr(ev[1]));
      if (p) { this.holdUntil = Infinity; void p.then(() => { this.holdUntil = performance.now() + 300; }); }
    }
    this.render();
    if (this.year >= ARS_Y1) this.play(false);
  };

  private render() {
    const y = this.year;
    const vals = ARSENALS.map((c) => ({ c, v: at(c.n, y) }));
    const total = vals.reduce((s, x) => s + x.v, 0);
    this.ui.date.textContent = String(Math.floor(y));
    this.ui.tot.innerHTML = `<b>${fmt(total)}</b> <span>${tr('cabezas nucleares')}</span>`;
    this.ui.tally.innerHTML = '';
    for (const { c, v } of [...vals].sort((a, b) => b.v - a.v)) {
      if (v < 0.5 && c.id !== 'ZAF') continue;
      if (c.id === 'ZAF' && v < 0.5 && y < 1982) continue;
      this.ui.tally.append(h('div', { class: 'hs-row' + (v < 0.5 ? ' dim' : '') }, h('i', { style: { background: c.color } }), h('span', {}, tr(c.name)), h('b', {}, fmt(v))));
    }
    const src = this.map.getSource('ars-pts') as GeoJSONSource | undefined;
    src?.setData({ type: 'FeatureCollection', features: vals.filter((x) => x.v >= 0.5).map(({ c, v }) => ({
      type: 'Feature', properties: { r: 3 + Math.sqrt(v) * 0.42, c: c.color, lbl: fmt(v) }, geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
    })) });
    this.drawChart();
  }

  /** gráfica apilada de los arsenales, con los tratados y el año actual */
  private drawChart() {
    const cv = this.ui?.cv;
    if (!cv || !cv.clientWidth) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = (cv.width = Math.round(cv.clientWidth * dpr)), H = (cv.height = Math.round(cv.clientHeight * dpr));
    const g = cv.getContext('2d')!;
    g.clearRect(0, 0, W, H);
    const n = ARS_Y1 - ARS_Y0, top = 64452 * 1.05;
    const X = (yy: number) => ((yy - ARS_Y0) / n) * W, Y = (v: number) => H - (v / top) * (H - 4 * dpr);
    const base = new Float64Array(n + 1);
    for (const c of ARSENALS) {
      g.beginPath();
      for (let i = 0; i <= n; i++) g.lineTo(X(ARS_Y0 + i), Y(base[i] + c.n[i]));
      for (let i = n; i >= 0; i--) g.lineTo(X(ARS_Y0 + i), Y(base[i]));
      g.closePath();
      g.globalAlpha = 0.8; g.fillStyle = c.color; g.fill();
      for (let i = 0; i <= n; i++) base[i] += c.n[i];
    }
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1 * dpr;
    for (const [ey] of ARS_EVENTS) { g.beginPath(); g.moveTo(X(ey), 0); g.lineTo(X(ey), H); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = `${10 * dpr}px "IBM Plex Mono", monospace`;
    for (let yy = 1950; yy <= 2020; yy += 10) g.fillText(String(yy), X(yy) + 2 * dpr, 11 * dpr);
    g.fillStyle = '#fff'; g.fillRect(X(this.year) - 1 * dpr, 0, 2 * dpr, H);
  }
}

export class ReconView {
  active = false;
  onTab: (t: HistTab) => void = () => {};
  onRun: (id: string) => void = () => {};
  onClose: () => void = () => {};
  private el: HTMLElement;
  constructor(parent: HTMLElement) {
    this.el = h('div', { id: 'hist-rec', class: 'hs-view hidden' });
    parent.append(this.el);
  }
  open() {
    if (this.active) return;
    this.active = true;
    if (!this.el.childElementCount) {
      const list = h('div', { class: 'rc-list' });
      for (const c of HISTORIC) list.append(h('div', { class: 'rc-it' },
        h('div', { class: 'rc-t' }, h('b', {}, c.title), h('span', {}, `${c.dateText} · ${c.place}`)),
        h('p', {}, c.summary),
        h('button', { type: 'button', class: 'hs-btn rc-go', onclick: () => this.onRun(c.id) }, 'Reconstruir y comparar')));
      this.el.append(
        h('div', { class: 'hs-head' }, histTabs('recon', (t) => this.onTab(t)), h('div', { class: 'hs-title' }, 'Reconstrucciones de explosiones reales'),
          h('div', { class: 'hs-cap' }, 'Cada una se simula con su potencia, su altura, su hora y el tiempo de aquel día, y se compara con lo que se midió o se documentó.')),
        h('button', { type: 'button', class: 'hs-x', title: 'Salir de la historia (Esc)', onclick: () => this.close() }, '✕'),
        list);
    }
    this.el.classList.remove('hidden');
    document.body.classList.add('hist-on');
    window.addEventListener('keydown', this.onKey);
  }
  close() {
    if (!this.active) return;
    this.active = false;
    this.el.classList.add('hidden');
    document.body.classList.remove('hist-on');
    window.removeEventListener('keydown', this.onKey);
    this.onClose();
  }
  private onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { this.close(); e.preventDefault(); } };
}
