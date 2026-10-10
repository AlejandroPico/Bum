import { h, ICONS, fmtTime, setRangeFill } from './dom';

export interface TimelineEvents {
  onPlayPause(): void;
  onRestart(): void;
  onSeek(t: number): void;
  onSpeed(s: number): void;
  onCloud(): void;
  onGround(): void;
}

/** Línea de tiempo con escala logarítmica (los primeros segundos ocupan más espacio). */
export class Timeline {
  el: HTMLElement;
  private range: HTMLInputElement;
  private time: HTMLElement;
  private play: HTMLButtonElement;
  private events: HTMLElement;
  private tStart = 0;
  private tEnd = 600;
  private seeking = false;

  constructor(el: HTMLElement, ev: TimelineEvents) {
    this.el = el;
    el.classList.add('glass');
    this.play = h('button', { class: 'tl-btn', title: 'Reproducir / pausa (espacio)', html: ICONS.pause, onclick: () => ev.onPlayPause() }) as HTMLButtonElement;
    const restart = h('button', { class: 'tl-btn', title: 'Repetir', html: ICONS.restart, onclick: () => ev.onRestart() });
    this.time = h('div', { class: 'tl-time' });
    this.range = h('input', { type: 'range', min: 0, max: 1000, step: 1, value: 0 }) as HTMLInputElement;
    this.events = h('div', { class: 'tl-events' });
    this.range.addEventListener('pointerdown', () => (this.seeking = true));
    this.range.addEventListener('pointerup', () => (this.seeking = false));
    this.range.addEventListener('input', () => { setRangeFill(this.range); ev.onSeek(this.toT(+this.range.value / 1000)); });
    const speed = h('div', { class: 'tl-speed' });
    for (const s of [0.25, 1, 4, 16]) {
      speed.append(h('button', { class: s === 1 ? 'on' : '', onclick: (e: Event) => { speed.querySelectorAll('button').forEach((b) => b.classList.remove('on')); (e.currentTarget as HTMLElement).classList.add('on'); ev.onSpeed(s); } }, `×${s}`));
    }
    const cloud = h('button', { class: 'tl-btn', title: 'Encuadrar la nube completa', html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5"/><path d="M8 11.2c0-2.2 1.8-3.7 4-3.7s4 1.5 4 3.7c0 1.3-1.8 2-4 2s-4-.7-4-2z"/><path d="M11 13.2h2V18h-2z"/></svg>', onclick: () => ev.onCloud() });
    const ground = h('button', { class: 'tl-btn', title: 'Vista desde el suelo: un testigo a distancia (pulsa otra vez para alejarlo o acercarlo)', html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 20h20"/><path d="M3.5 13c2.3-3.2 5.2-4.8 8.5-4.8s6.2 1.6 8.5 4.8c-2.3 3.2-5.2 4.8-8.5 4.8S5.8 16.2 3.5 13z"/><circle cx="12" cy="13" r="2.4"/></svg>', onclick: () => ev.onGround() });
    el.append(restart, this.play, this.time, h('div', { class: 'tl-track' }, this.events, this.range), speed, ground, cloud);
  }

  configure(tStart: number, tEnd: number, events: { t: number; label: string }[]) {
    this.tStart = tStart;
    this.tEnd = tEnd;
    this.evList = [...events].sort((a, b) => a.t - b.t);
    this.el.classList.remove('hidden');
    this.layoutEvents();
  }

  private evList: { t: number; label: string }[] = [];
  private ro: ResizeObserver | null = null;
  /** coloca las marcas de eventos sin que los rótulos se pisen (según el ancho real de la barra) */
  private layoutEvents() {
    if (!this.ro) { this.ro = new ResizeObserver(() => this.layoutEvents()); this.ro.observe(this.events); }
    const W = this.events.clientWidth || 600;
    this.events.innerHTML = '';
    let lastRight = -Infinity;
    for (const e of this.evList) {
      const p = this.toS(e.t);
      if (p < 0 || p > 1) continue;
      const w = e.label.length * 5.4 + 14;
      const x = p * W;
      if (x - w / 2 < lastRight || x - w / 2 < -8 || x + w / 2 > W + 8) continue;
      lastRight = x + w / 2;
      this.events.append(h('span', { style: { left: `${p * 100}%` } }, e.label));
    }
  }

  private get entry() { return this.tStart < 0 ? 0.12 : 0; }
  toT(s: number): number {
    const E = this.entry;
    if (E && s < E) return this.tStart * (1 - s / E);
    const u = E ? (s - E) / (1 - E) : s;
    const t0 = 0.02, k = Math.log(this.tEnd / t0 + 1);
    return t0 * (Math.exp(k * u) - 1);
  }
  toS(t: number): number {
    const E = this.entry;
    if (t < 0) return E ? E * (1 - t / this.tStart) : 0;
    const t0 = 0.02, k = Math.log(this.tEnd / t0 + 1);
    const u = Math.log(t / t0 + 1) / k;
    return E + u * (1 - E);
  }

  update(t: number, playing: boolean, rate: number) {
    if (!this.seeking) {
      this.range.value = String(Math.round(Math.min(1, Math.max(0, this.toS(t))) * 1000));
      setRangeFill(this.range);
    }
    const rt = rate >= 1 ? `×${Math.round(rate)}` : `×${rate.toFixed(2).replace('.', ',')}`;
    this.time.innerHTML = `T${t < 0 ? '' : '+'}${fmtTime(t)}<small>tiempo real ${rt}</small>`;
    this.play.innerHTML = playing ? ICONS.pause : ICONS.play;
  }
}
