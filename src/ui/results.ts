import { h, ICONS, fmtNum, fmtTime } from './dom';
import { fmtDist, fmtArea, fmtEnergy } from '../physics/effects';
import type { Effects } from '../physics/types';

export interface ResultsEvents {
  onToggle(id: string, visible: boolean): void;
  onHover(id: string | null): void;
  onShare(): void;
  onFocus(id: string): void;
}

const GROUP_NAMES: Record<string, string> = {
  fireball: 'Bola de fuego', crater: 'Cráter', radiation: 'Radiación inicial', blast: 'Onda expansiva', thermal: 'Radiación térmica',
  seismic: 'Sismicidad', emp: 'Pulso electromagnético', ejecta: 'Eyecta', tsunami: 'Tsunami',
};

export class ResultsPanel {
  el: HTMLElement;
  private ev: ResultsEvents;
  hidden = new Set<string>();

  constructor(el: HTMLElement, ev: ResultsEvents) {
    this.el = el;
    this.ev = ev;
    el.classList.add('glass');
    this.makeDraggable();
  }

  hide() { this.el.classList.add('hidden'); }

  render(fx: Effects, place: string) {
    const el = this.el;
    el.innerHTML = '';
    el.classList.remove('hidden');
    const sc = fx.scenario;
    const hiro = fx.energyKt / 15;
    const kicker = sc.kind === 'nuclear' ? 'Detonación nuclear' : fx.asteroid?.fate === 'airburst' ? 'Explosión aérea de asteroide' : 'Impacto de asteroide';
    const burst = fx.burstHeightM > 0 ? `a ${fmtDist(fx.burstHeightM)} de altura` : sc.kind === 'asteroid' && sc.target === 'water' ? `en el océano (${fmtDist(sc.waterDepthM)} de profundidad)` : 'en superficie';
    const minBtn = h('button', { class: 'icon-btn', title: 'Minimizar', html: ICONS.min, onclick: () => { el.classList.toggle('min'); minBtn.innerHTML = el.classList.contains('min') ? ICONS.max : ICONS.min; } });
    const head = h('div', { class: 'res-head' },
      h('div', { class: 'ttl' },
        h('div', { class: 'kicker' }, kicker),
        h('h2', {}, sc.name || fmtEnergy(fx.energyKt)),
        h('div', { class: 'sub' }, `${fmtEnergy(fx.energyKt)} ${burst} · ${place}`),
      ),
      h('button', { class: 'icon-btn', title: 'Compartir enlace', html: ICONS.share, onclick: () => this.ev.onShare() }),
      minBtn,
    );

    const body = h('div', { class: 'res-body' });
    const c = fx.casualties;
    body.append(h('div', { class: 'stats' },
      h('div', { class: 'stat red' }, h('div', { class: 'v' }, fmtNum(c.deaths)), h('div', { class: 'l' }, 'Fallecidos (est.)')),
      h('div', { class: 'stat amber' }, h('div', { class: 'v' }, fmtNum(c.injuries)), h('div', { class: 'l' }, 'Heridos (est.)')),
      h('div', { class: 'stat' }, h('div', { class: 'v' }, hiro >= 1 ? `×${fmtNum(hiro)}` : `${(hiro * 100).toFixed(hiro < 0.01 ? 2 : 1).replace('.', ',')} %`), h('div', { class: 'l' }, 'Hiroshima')),
    ));

    // efectos agrupados (orden de gran a pequeño dentro de cada grupo)
    body.append(h('div', { class: 'res-h3' }, 'Efectos'));
    const sorted = [...fx.rings].sort((a, b) => b.radiusM - a.radiusM);
    for (const r of sorted) {
      const row = h('div', { class: 'eff' + (this.hidden.has(r.id) ? ' off' : ''), title: 'Clic: mostrar/ocultar · Doble clic: centrar' },
        h('span', { class: 'dot', style: { color: r.color } }),
        h('span', { class: 'name' }, r.label),
        h('span', { class: 'r' }, r.global ? 'Global' : fmtDist(r.radiusM)),
        h('div', { class: 'meta' }, `${r.desc} `, h('i', {}, `${GROUP_NAMES[r.group] ?? ''} · ${r.value ?? ''} · ${r.global ? 'todo el planeta' : fmtArea(r.radiusM)}`)),
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
      body.append(h('div', { class: 'res-h3' }, 'Lluvia radiactiva (tasa de dosis a H+1)'));
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

    // datos físicos
    const kv: [string, string][] = [];
    kv.push(['Energía liberada', fmtEnergy(fx.energyKt)]);
    kv.push(['Energía (julios)', `${fx.energyJ.toExponential(2).replace('.', ',')} J`]);
    kv.push(['Radio máx. bola de fuego', fmtDist(fx.fireball.radiusM)]);
    kv.push(['Altura de la nube', fmtDist(fx.cloud.topM)]);
    kv.push(['Ancho del sombrero', fmtDist(fx.cloud.capRadiusM * 2)]);
    if (fx.crater) kv.push(['Cráter', `${fmtDist(fx.crater.diameterM)} × ${fmtDist(fx.crater.depthM)}`]);
    if (fx.seismic) kv.push(['Magnitud sísmica', fx.seismic.magnitude.toFixed(1).replace('.', ',')]);
    if (fx.tsunami) {
      kv.push(['Profundidad del agua', fmtDist(fx.tsunami.depthM)]);
      kv.push(['Ola inicial (borde de la cavidad)', fmtDist(fx.tsunami.rimWaveM)]);
      kv.push(['Ola a 1000 km (mar abierto)', fmtDist(fx.tsunami.at1000kmM)]);
    }
    const a = fx.asteroid;
    if (a) {
      kv.push(['Masa', `${a.massKg.toExponential(2).replace('.', ',')} kg`]);
      if (a.breakupAltM) kv.push(['Fragmentación', `a ${fmtDist(a.breakupAltM)}`]);
      if (a.airburstAltM) kv.push(['Explosión aérea', `a ${fmtDist(a.airburstAltM)}`]);
      if (a.fate !== 'airburst') kv.push(['Velocidad de impacto', `${a.impactVelocityKms.toFixed(1).replace('.', ',')} km/s`]);
      kv.push(['Frecuencia media', a.recurrenceYears < 1 ? 'varias al año' : `1 cada ${fmtNum(a.recurrenceYears)} años`]);
    }
    body.append(h('div', { class: 'res-h3' }, 'Datos físicos'), h('div', { class: 'kv' }, ...kv.flatMap(([k, v]) => [h('span', {}, k), h('span', {}, v)])));

    // tiempos de llegada
    const arr: [string, string][] = [];
    for (const d of [1000, 5000, 10000, 25000, 50000, 100000, 500000]) {
      if (d > (fx.rings.find((r) => r.id === 'psi0.2')?.radiusM ?? 0) * 1.1) break;
      const t = interp(fx.shock.r, fx.shock.t, Math.hypot(d, fx.burstHeightM));
      arr.push([`A ${fmtDist(d)}`, `${fmtTime(t)} · ${fx.pressurePsiAt(d).toFixed(fx.pressurePsiAt(d) < 1 ? 2 : 1).replace('.', ',')} psi`]);
    }
    if (arr.length) body.append(h('div', { class: 'res-h3' }, 'Llegada de la onda expansiva'), h('div', { class: 'kv' }, ...arr.flatMap(([k, v]) => [h('span', {}, k), h('span', {}, v)])));

    if (fx.notes.length) body.append(h('ul', { class: 'notes' }, ...fx.notes.map((n) => h('li', {}, n))));
    body.append(h('div', { class: 'disclaimer' },
      'Estimaciones orientativas con fines educativos. Modelos: Glasstone & Dolan, ',
      h('i', {}, 'The Effects of Nuclear Weapons'), ' (1977); Collins, Melosh & Marcus (2005) para impactos; lluvia radiactiva con un modelo analítico simplificado; víctimas inmediatas con un modelo de densidad urbana aproximado (no censal) y probabilidades tipo OTA (1979); no incluyen tsunami, incendios posteriores ni efectos climáticos. Tsunami: Wünnemann et al. (2010).',
    ));
    el.append(head, body);
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

function interp(xs: number[], ys: number[], x: number) {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) if (xs[i] >= x) return ys[i - 1] + ((x - xs[i - 1]) / (xs[i] - xs[i - 1])) * (ys[i] - ys[i - 1]);
  return ys[ys.length - 1];
}
