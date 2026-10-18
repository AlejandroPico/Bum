/**
 * Modo clase / presentación: una lista de escenarios que se pasan como diapositivas. Cada una guarda
 * el escenario completo (arma o asteroide, objetivo, tiempo, ataque múltiple, trayectoria…), un
 * título y unas notas para quien presenta. Al pasar a una diapositiva se lanza la simulación y, si se
 * puede, el recorrido cinematográfico; al acabar, se pasa a la siguiente (a mano o sola).
 *
 * La lista se guarda en el navegador y se puede compartir con un enlace (#pres=…).
 */
import { h, toast } from './dom';
import { tr } from '../i18n';

export interface Snapshot { [k: string]: unknown }
export interface Slide { title: string; note: string; snap: Snapshot; hist?: string }
export interface PresentCtx {
  snapshot(): Snapshot;
  apply(s: Snapshot): void;
  /** lanza la simulación de la diapositiva (con su reconstrucción histórica, si la tiene) */
  run(slide: Slide): Promise<void>;
  /** empieza el recorrido cinematográfico; false si esta simulación no tiene */
  tour(): boolean;
  stopTour(): void;
  templates(): { name: string; desc: string; slides: () => Slide[] }[];
}

const KEY = 'bum:slides';
const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

export class Presenter {
  slides: Slide[] = [];
  active = false;
  private ctx: PresentCtx;
  private i = 0;
  private before: Snapshot | null = null;
  private bar: HTMLElement;
  private ui!: { n: HTMLElement; title: HTMLElement; note: HTMLElement; next: HTMLButtonElement; auto: HTMLInputElement; count: HTMLElement };
  private auto = false;
  private timer = 0;
  private busy = false;
  /** se llama al cambiar la lista (para repintar el panel) */
  onChange: (() => void) | null = null;

  constructor(ctx: PresentCtx, parent: HTMLElement) {
    this.ctx = ctx;
    try { this.slides = JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { this.slides = []; }
    this.bar = h('div', { id: 'present-bar', class: 'hidden' });
    parent.append(this.bar);
    window.addEventListener('keydown', (e) => {
      if (!this.active || (e.target as HTMLElement)?.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); void this.go(this.i + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); void this.go(this.i - 1); }
      else if (e.key === 'Escape') { e.preventDefault(); this.stop(); }
    });
  }

  save() { try { localStorage.setItem(KEY, JSON.stringify(this.slides)); } catch { /* sin almacenamiento */ } this.onChange?.(); }
  add(title: string) { this.slides.push({ title, note: '', snap: this.ctx.snapshot() }); this.save(); }
  remove(i: number) { this.slides.splice(i, 1); this.save(); }
  move(i: number, d: number) { const j = i + d; if (j < 0 || j >= this.slides.length) return; [this.slides[i], this.slides[j]] = [this.slides[j], this.slides[i]]; this.save(); }
  load(list: Slide[], append = false) { this.slides = append ? [...this.slides, ...list] : list; this.save(); }

  /** enlace con la presentación entera */
  link(): string {
    const u = new URL(location.href);
    u.hash = 'pres=' + b64(JSON.stringify(this.slides.map(({ title, note, snap, hist }) => ({ title, note, snap, hist }))));
    return u.toString();
  }
  /** lee una presentación de la dirección (#pres=…); devuelve true si la había */
  fromHash(): boolean {
    const m = location.hash.match(/pres=([A-Za-z0-9_-]+)/);
    if (!m) return false;
    try { const list = JSON.parse(unb64(m[1])); if (Array.isArray(list) && list.length) { this.load(list); return true; } } catch { /* enlace roto */ }
    return false;
  }

  // ------------------------------------------------------------------ presentar
  async start(from = 0) {
    if (!this.slides.length) { toast('Añade primero alguna diapositiva'); return; }
    this.before = this.ctx.snapshot();
    this.active = true;
    document.body.classList.add('presenting');
    this.build();
    this.bar.classList.remove('hidden');
    await this.go(from);
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    clearTimeout(this.timer);
    this.ctx.stopTour();
    document.body.classList.remove('presenting');
    this.bar.classList.add('hidden');
    if (this.before) this.ctx.apply(this.before);
    this.before = null;
  }

  private build() {
    this.bar.innerHTML = '';
    const n = h('span', { class: 'pb-n' }), count = h('span', { class: 'pb-count' });
    const title = h('div', { class: 'pb-title' }), note = h('div', { class: 'pb-note' });
    const next = h('button', { type: 'button', class: 'pb-b pb-next', title: 'Siguiente (→)', onclick: () => void this.go(this.i + 1) }, 'Siguiente ▶') as HTMLButtonElement;
    const auto = h('input', { type: 'checkbox' }) as HTMLInputElement;
    auto.checked = this.auto;
    auto.addEventListener('change', () => { this.auto = auto.checked; });
    this.bar.append(
      h('div', { class: 'pb-text' }, h('div', { class: 'pb-k' }, n, count), title, note),
      h('div', { class: 'pb-ctrl' },
        h('button', { type: 'button', class: 'pb-b', title: 'Anterior (←)', onclick: () => void this.go(this.i - 1) }, '◀'),
        h('button', { type: 'button', class: 'pb-b', title: 'Repetir esta diapositiva', onclick: () => void this.go(this.i) }, '↺'),
        next,
        h('label', { class: 'pb-auto' }, auto, h('span', {}, 'Pasar sola')),
        h('button', { type: 'button', class: 'pb-b', title: 'Terminar la presentación (Esc)', onclick: () => this.stop() }, '✕')),
    );
    this.ui = { n, title, note, next, auto, count };
  }

  private async go(i: number) {
    if (!this.active || this.busy) return;
    if (i >= this.slides.length) { this.ui.count.textContent = tr('Fin de la presentación'); this.ui.next.disabled = true; return; }
    if (i < 0) return;
    clearTimeout(this.timer);
    this.busy = true;
    this.i = i;
    const s = this.slides[i];
    this.ui.n.textContent = `${i + 1} / ${this.slides.length}`;
    this.ui.count.textContent = '';
    this.ui.title.textContent = s.title;
    this.ui.note.textContent = s.note;
    this.ui.note.style.display = s.note ? '' : 'none';
    this.ui.next.disabled = false;
    this.ui.next.classList.remove('pulse');
    this.ctx.stopTour();
    try {
      this.ctx.apply(s.snap);
      await this.ctx.run(s);
    } finally { this.busy = false; }
    if (!this.active || this.i !== i) return;
    // con recorrido, la diapositiva acaba cuando acaba el recorrido; sin él, a los 25 s
    if (!this.ctx.tour()) this.ended(25000);
  }

  /** el recorrido de la diapositiva actual ha terminado */
  tourEnded() { if (this.active && !this.busy) this.ended(0); }

  private ended(delay: number) {
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      if (!this.active) return;
      this.ui.next.classList.add('pulse');
      if (this.auto && this.i < this.slides.length - 1) {
        let left = 5;
        const tick = () => {
          if (!this.active || !this.auto) { this.ui.count.textContent = ''; return; }
          if (left <= 0) { void this.go(this.i + 1); return; }
          this.ui.count.textContent = tr(`Siguiente en ${left} s`);
          left--;
          this.timer = window.setTimeout(tick, 1000);
        };
        tick();
      }
    }, delay);
  }
}

/** panel para preparar la presentación */
export function buildPresentPanel(el: HTMLElement, P: Presenter, ctx: PresentCtx, close: () => void) {
  el.innerHTML = '';
  el.append(h('div', { class: 'sp-h' }, 'Presentación'));
  el.append(h('p', { class: 'sp-note' }, 'Guarda escenarios como diapositivas y pásalos uno tras otro, con el recorrido cinematográfico de cada uno. Teclas: ← y → para cambiar, Esc para salir.'));
  const tIn = h('input', { type: 'text', placeholder: tr('Título de la diapositiva'), class: 'pp-in' }) as HTMLInputElement;
  el.append(h('div', { class: 'pp-add' }, tIn, h('button', { type: 'button', class: 'btn-line', onclick: (e: MouseEvent) => { e.stopPropagation(); P.add(tIn.value.trim() || tr('Diapositiva') + ` ${P.slides.length + 1}`); buildPresentPanel(el, P, ctx, close); } }, '+ Añadir la simulación actual')));
  const list = h('div', { class: 'pp-list' });
  P.slides.forEach((s, i) => {
    const title = h('input', { type: 'text', value: s.title, class: 'pp-t' }) as HTMLInputElement;
    title.addEventListener('change', () => { s.title = title.value; P.save(); });
    const note = h('textarea', { rows: 2, placeholder: tr('Notas para quien presenta (opcional)'), class: 'pp-note' }) as HTMLTextAreaElement;
    note.value = s.note;
    note.addEventListener('change', () => { s.note = note.value; P.save(); });
    const btn = (t: string, title: string, f: () => void) => h('button', { type: 'button', class: 'pp-b', title, onclick: (e: MouseEvent) => { e.stopPropagation(); f(); buildPresentPanel(el, P, ctx, close); } }, t);
    list.append(h('div', { class: 'pp-it' },
      h('div', { class: 'pp-row' }, h('span', { class: 'pp-i' }, String(i + 1)), title,
        btn('▶', 'Presentar desde aquí', () => { close(); void P.start(i); }), btn('↑', 'Subir', () => P.move(i, -1)), btn('↓', 'Bajar', () => P.move(i, 1)), btn('✕', 'Quitar', () => P.remove(i))),
      note));
  });
  if (!P.slides.length) list.append(h('p', { class: 'sp-note' }, 'Todavía no hay diapositivas. Prepara una simulación en el panel de la izquierda y añádela, o empieza con una de las lecciones.'));
  el.append(list);
  el.append(h('div', { class: 'sp-btns' },
    h('button', { type: 'button', class: 'btn-line pp-go', disabled: !P.slides.length, onclick: (e: MouseEvent) => { e.stopPropagation(); close(); void P.start(0); } }, 'Empezar la presentación'),
    h('button', { type: 'button', class: 'btn-ghost', disabled: !P.slides.length, onclick: async (e: MouseEvent) => { e.stopPropagation(); try { await navigator.clipboard.writeText(P.link()); toast('Enlace de la presentación copiado'); } catch { prompt(tr('Enlace de la presentación'), P.link()); } } }, 'Copiar enlace'),
    h('button', { type: 'button', class: 'btn-ghost', disabled: !P.slides.length, onclick: (e: MouseEvent) => { e.stopPropagation(); P.load([]); buildPresentPanel(el, P, ctx, close); } }, 'Vaciar')));
  el.append(h('div', { class: 'sp-h2' }, 'Lecciones preparadas'));
  for (const t of ctx.templates()) el.append(h('div', { class: 'pp-tpl' },
    h('div', {}, h('b', {}, t.name), h('span', {}, t.desc)),
    h('button', { type: 'button', class: 'btn-ghost', onclick: (e: MouseEvent) => { e.stopPropagation(); P.load(t.slides()); buildPresentPanel(el, P, ctx, close); toast('Lección cargada: pulsa «Empezar la presentación»'); } }, 'Usar')));
}
