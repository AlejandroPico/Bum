/**
 * Panel «Preparando la simulación»: tapa el mapa mientras se calculan los efectos y se descargan el
 * relieve, el mapa base y los edificios de cada plano de cámara, para que después todo se vea
 * fluido. Muestra los pasos con su estado y una barra de progreso; al terminar, la simulación
 * empieza sola.
 */
import { h } from './dom';

type StepState = 'wait' | 'run' | 'ok' | 'skip';

export class PrepPanel {
  el: HTMLElement;
  private list: HTMLElement;
  private bar: HTMLElement;
  private title: HTMLElement;
  private steps: { el: HTMLElement; detail: HTMLElement }[] = [];
  /** se deja de esperar (p. ej. al limpiar la simulación) */
  skipped = false;
  active = false;

  constructor(parent: HTMLElement) {
    this.title = h('b', {}, 'Preparando la simulación');
    this.list = h('ol', { class: 'pp-list' });
    this.bar = h('div', { class: 'pp-bar' }, h('span', {}));
    this.el = h('div', { id: 'prep', class: 'hidden', role: 'status', 'aria-live': 'polite' },
      h('div', { class: 'pp-card' }, this.title, this.list, this.bar));
    parent.append(this.el);
  }

  show(title: string, steps: string[]) {
    this.skipped = false;
    this.active = true;
    this.title.textContent = title;
    this.list.innerHTML = '';
    this.steps = steps.map((s) => {
      const detail = h('small', {});
      const el = h('li', { class: 'pp-wait' }, h('span', {}, s), detail);
      this.list.append(el);
      return { el, detail };
    });
    this.progress(0);
    this.el.classList.remove('hidden');
  }

  /** cambia el estado de un paso (por su índice) */
  step(i: number, st: StepState, detail = '') {
    const s = this.steps[i];
    if (!s) return;
    s.el.className = `pp-${st}`;
    s.detail.textContent = detail;
    const done = this.steps.filter((x) => x.el.className === 'pp-ok' || x.el.className === 'pp-skip').length;
    this.progress(done / this.steps.length);
  }

  /** progreso global (0..1); `sub` añade el avance dentro del paso en curso */
  progress(f: number) { (this.bar.firstChild as HTMLElement).style.width = `${Math.round(Math.max(0, Math.min(1, f)) * 100)}%`; }
  sub(i: number, f: number, detail?: string) {
    const n = this.steps.length || 1;
    this.progress((i + Math.max(0, Math.min(1, f))) / n);
    if (detail !== undefined && this.steps[i]) this.steps[i].detail.textContent = detail;
  }

  hide() {
    this.active = false;
    this.el.classList.add('hidden');
  }
}
