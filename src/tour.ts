/**
 * Recorrido cinematográfico automático: repite la simulación desde el principio con una secuencia
 * de planos (establecimiento, testigo a pie de calle, onda expansiva, hongo, calor, lluvia
 * radiactiva y balance), franjas de cine y rótulos con las cifras de cada momento.
 * Cualquier gesto sobre el mapa, Esc o el botón de salir lo detienen.
 */
import maplibregl from 'maplibre-gl';
import type { FxPlan } from './fx/plan';
import type { Effects } from './physics/types';
import { fmtDist } from './physics/effects';
import { h, fmtTime } from './ui/dom';

export interface TourRun { fx: Effects; plan: FxPlan; lat: number; lon: number; t: number; playing: boolean; speed: number; userCam: boolean; orbit: unknown; lastReal: number; extras: unknown[] }
export interface TourCtx {
  map: maplibregl.Map;
  run(): TourRun | null;
  place(): string;
  restart(): void;
  /** salta el reloj de la simulación a `t` (s) */
  seek(t: number): void;
  zoomForRadius(r: number, lat: number): number;
  cloudCamera(bearing: number, final: boolean): { center: [number, number]; zoom: number; pitch: number; bearing: number } | null;
  destination(lat: number, lon: number, distM: number, bearingDeg: number): [number, number];
  setWideFov(on: boolean): void;
  /** activa un mapa de calor; devuelve el que había */
  heat(k: 'off' | 'deaths' | 'fallout' | 'pop'): 'off' | 'deaths' | 'fallout' | 'pop';
  /** márgenes del mapa (sin paneles durante el recorrido) */
  layout(): void;
  repaint(): void;
}

class Cancelled extends Error {}

const n0 = (x: number) => Math.round(x).toLocaleString('es-ES');
const people = (x: number) => (x >= 1e6 ? `${(x / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 })} millones` : x >= 1000 ? `${n0(Math.round(x / 100) * 100)}` : n0(x));
const dirName = (deg: number) => ['el norte', 'el nordeste', 'el este', 'el sudeste', 'el sur', 'el suroeste', 'el oeste', 'el noroeste'][Math.round((((deg % 360) + 360) % 360) / 45) % 8];

export class Tour {
  private ctx: TourCtx;
  private token = 0;
  active = false;
  private bars: HTMLElement;
  private cap: HTMLElement;
  private clock: HTMLElement;
  private title: HTMLElement;
  private line: HTMLElement;
  private prevHeat: 'off' | 'deaths' | 'fallout' | 'pop' | null = null;
  private raf = 0;
  onChange: ((on: boolean) => void) | null = null;

  constructor(ctx: TourCtx, parent: HTMLElement) {
    this.ctx = ctx;
    this.clock = h('span', { class: 'tc-clock' });
    this.title = h('b', {});
    this.line = h('p', {});
    this.cap = h('div', { id: 'tour-cap' }, h('div', { class: 'tc-k' }, this.clock), this.title, this.line);
    this.bars = h('div', { id: 'tour-bars' }, h('div', { class: 'tb-top' }), h('div', { class: 'tb-bot' }),
      h('button', { type: 'button', class: 'tour-exit', title: 'Salir del recorrido (Esc)', onclick: () => this.stop() }, 'Salir del recorrido ✕'));
    parent.append(this.bars, this.cap);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.active) this.stop(); });
  }

  /** se puede hacer el recorrido de la simulación actual */
  static available(fx: Effects | undefined | null) {
    return !!fx && !fx.release && !fx.volcano && !fx.dam && !fx.solar && !fx.war && !fx.buried?.contained;
  }

  start() {
    const R = this.ctx.run();
    if (!R || !Tour.available(R.fx)) return;
    this.stop(true);
    const tok = ++this.token;
    this.active = true;
    document.body.classList.add('touring');
    this.onChange?.(true);
    this.ctx.layout();
    const tick = () => {
      const r = this.ctx.run();
      if (r) this.clock.textContent = `T${r.t < 0 ? '' : '+'}${fmtTime(r.t)}`;
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    this.script(tok).catch((e) => { if (!(e instanceof Cancelled)) console.warn('recorrido', e); }).finally(() => { if (tok === this.token) this.stop(); });
  }

  /** detiene el recorrido y devuelve la interfaz */
  stop(silent = false) {
    if (!this.active) return;
    this.token++;
    this.active = false;
    cancelAnimationFrame(this.raf);
    document.body.classList.remove('touring');
    this.cap.classList.remove('on');
    this.ctx.setWideFov(false);
    const R = this.ctx.run();
    if (R) { R.speed = 1; R.userCam = true; R.orbit = null; }
    if (this.prevHeat !== null) { this.ctx.heat(this.prevHeat); this.prevHeat = null; }
    this.ctx.layout();
    if (!silent) this.onChange?.(false);
  }

  // ---------------------------------------------------------------- utilidades
  private guard(tok: number) { if (tok !== this.token || !this.ctx.run()) throw new Cancelled(); }
  private sleep(tok: number, ms: number) {
    return new Promise<void>((res, rej) => setTimeout(() => (tok === this.token ? res() : rej(new Cancelled())), ms));
  }
  /** espera a que el reloj de la simulación llegue a `t` (o a que pasen `maxMs` reales) */
  private untilT(tok: number, t: number, maxMs = 15000, minMs = 0) {
    const t0 = performance.now();
    return new Promise<void>((res, rej) => {
      const step = () => {
        if (tok !== this.token) { rej(new Cancelled()); return; }
        const R = this.ctx.run();
        if (!R) { rej(new Cancelled()); return; }
        const el = performance.now() - t0;
        if (((R.t >= t || !R.playing) && el >= minMs) || el > maxMs) res(); else requestAnimationFrame(step);
      };
      step();
    });
  }
  /** órbita lenta alrededor del hongo mientras dura `ms` */
  private orbit(tok: number, ms: number, b0: number, degPerS: number) {
    const t0 = performance.now();
    return new Promise<void>((res, rej) => {
      const step = () => {
        if (tok !== this.token) { rej(new Cancelled()); return; }
        const el = performance.now() - t0;
        const cam = this.ctx.cloudCamera(b0 + (el / 1000) * degPerS, true);
        if (cam && !this.ctx.map.isEasing?.()) this.ctx.map.jumpTo(cam);
        if (el >= ms) res(); else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  /** en un corte de plano, adelanta el reloj si va por detrás (equipos lentos) */
  private atLeast(t: number) {
    const R = this.ctx.run();
    if (R && R.t < t) { this.ctx.seek(t); R.playing = true; R.lastReal = performance.now(); }
  }
  private say(title: string, line: string) {
    this.cap.classList.remove('on');
    void this.cap.offsetWidth;
    this.title.textContent = title;
    this.line.textContent = line;
    this.cap.classList.add('on');
  }
  private ease(o: maplibregl.EaseToOptions) { this.ctx.map.easeTo({ essential: true, easing: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2), ...o }); }

  // ---------------------------------------------------------------- guion
  private async script(tok: number) {
    const C = this.ctx, map = C.map;
    const R0 = C.run()!;
    const fx = R0.fx, P = R0.plan, lat = R0.lat, lon = R0.lon;
    const ring = (id: string) => fx.rings.find((r) => r.id === id)?.radiusM ?? 0;
    const psi5 = P.psi5R || ring('psi5'), psi1 = P.psi1R || ring('psi1');
    const burn3 = ring('burn3');
    const name = fx.scenario.name || 'La explosión';
    const kt = fx.energyKt;
    const energy = kt >= 1000 ? `${(kt / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} megatones` : `${kt.toLocaleString('es-ES', { maximumFractionDigits: 1 })} kilotones`;
    let bearing = map.getBearing();

    // la simulación vuelve a empezar, en pausa, sin la cámara automática
    C.restart();
    const R = C.run()!;
    R.playing = false;
    R.userCam = true;
    R.orbit = null;
    R.speed = 1;
    C.setWideFov(false);

    // 1 · plano de situación
    const rEst = Math.max(psi1 * 1.25, P.fireballR * 10, 2500);
    this.ease({ center: [lon, lat], zoom: C.zoomForRadius(rEst, lat), pitch: 55, bearing: bearing - 20, duration: 3200 });
    this.say(C.place(), `${name} · ${energy}${P.isAsteroid ? '' : P.h > 50 ? ` · explosión a ${fmtDist(P.h)} de altura` : ' · en la superficie'}`);
    await this.sleep(tok, 3400);
    this.ease({ bearing: bearing + 4, duration: 2600, easing: (x) => x });
    await this.sleep(tok, 2600);
    bearing += 4;

    // 1 b · el bólido entra en la atmósfera
    if (P.isAsteroid && R.t < 0) {
      const path = P.entrySpeed * P.entryDuration;
      const az = P.entryAzimuth;
      this.ease({ center: [lon, lat], zoom: C.zoomForRadius(Math.max(path * 0.6, 30000), lat), pitch: 60, bearing: az + 90, duration: 2000 });
      await this.sleep(tok, 2000);
      bearing = az + 90;
      R.playing = true; R.lastReal = performance.now();
      this.say('Entrada en la atmósfera', `El objeto llega a ${(P.entrySpeed / 1000).toLocaleString('es-ES', { maximumFractionDigits: 0 })} km/s; el aire lo frena y lo calienta hasta hacerlo brillar más que el Sol.`);
      await this.untilT(tok, 0, 20000);
    }

    // 2 · testigo a pie de calle: el destello y la llegada de la onda
    this.guard(tok);
    const dW = Math.max(psi1 * 0.95, P.fireballR * 6, 1500);
    try {
      const from = C.destination(lat, lon, dW, bearing + 180);
      const el = map.queryTerrainElevation({ lng: from[0], lat: from[1] }) ?? 0;
      C.setWideFov(true);
      const cam = map.calculateCameraOptionsFromCameraLngLatAltRotation(new maplibregl.LngLat(from[0], from[1]), el + 1.7, bearing, 88.5);
      map.jumpTo({ center: cam.center, zoom: cam.zoom, pitch: cam.pitch, bearing: cam.bearing });
    } catch { /* proyección sin cámara libre: se queda en el plano aéreo */ }
    await this.sleep(tok, 700);
    if (!R.playing) { R.playing = true; R.lastReal = performance.now(); }
    this.say(P.isAsteroid ? 'Impacto' : 'Destello', `A ${fmtDist(dW)} de la zona cero: la bola de fuego alcanza ${fmtDist(fx.fireball.radiusM)} de radio y durante unos segundos brilla más que el Sol.`);
    await this.untilT(tok, Math.max(P.shockTime(Math.hypot(dW, P.h)) + 0.6, P.tMax * 4), 9000, 3500);
    const psiW = fx.pressurePsiAt(dW);
    this.say('Llega la onda', `El estruendo y el viento llegan ${Math.max(1, Math.round(P.shockTime(Math.hypot(dW, P.h))))} s después del destello: aquí, a ${fmtDist(dW)}, ${psiW >= 5 ? 'se derrumban los edificios' : psiW >= 2 ? 'se hunden tejados y tabiques' : psiW >= 0.8 ? 'revientan los cristales' : 'se oye un estruendo lejano'}.`);
    await this.sleep(tok, 2600);

    // 3 · vista aérea de la onda expansiva
    C.setWideFov(false);
    this.atLeast(P.shockTime(Math.hypot(dW, P.h)) + 0.5);
    if (psi1 > 0) {
      this.ease({ center: [lon, lat], zoom: C.zoomForRadius(psi1 * 1.15, lat), pitch: 58, bearing: bearing + 30, duration: 4200 });
      bearing += 30;
      this.say('Onda expansiva', `${psi5 ? `Derriba la mayoría de los edificios hasta ${fmtDist(psi5)} (5 psi)` : 'Una sobrepresión enorme'} y rompe ventanas hasta ${fmtDist(psi1)} (1 psi).`);
      await this.untilT(tok, P.shockTime(Math.hypot(psi1, P.h)) + 1, 9000, 4400);
    }

    // 4 · el hongo
    if (!P.highAltitude && P.capTop > 600) {
      this.atLeast(Math.min(P.tau * 0.3, P.shockTime(Math.hypot(psi1, P.h)) + 1));
      const cam = C.cloudCamera(bearing, true);
      if (cam) this.ease({ ...cam, duration: 4000 });
      await this.sleep(tok, 4000);
      R.speed = 1.6;
      this.say('La nube en forma de hongo', `Sube hasta ${fmtDist(P.capTop)} de altura en unos ${Math.max(1, Math.round(fx.cloud.riseTimeS / 60))} min; el sombrero mide ${fmtDist(P.capR * 2)} de ancho.`);
      await this.orbit(tok, 9000, bearing, 3.2);
      bearing += 29;
      R.speed = 1;
    }

    // 5 · calor e incendios
    if (burn3 > 0) {
      this.atLeast(P.tau * 1.1);
      this.ease({ center: [lon, lat], zoom: C.zoomForRadius(burn3 * 1.5, lat), pitch: 40, bearing: bearing + 15, duration: 3500 });
      bearing += 15;
      const fire = fx.fires?.kind === 'firestorm' ? ' Los incendios se funden en una tormenta de fuego.' : fx.fires?.kind === 'conflagration' ? ' Los incendios avanzan empujados por el viento.' : '';
      this.say('El calor', `Quemaduras de tercer grado a quien esté al aire libre hasta ${fmtDist(burn3)}.${fire}`);
      await this.sleep(tok, 5200);
    }

    // 6 · lluvia radiactiva
    if (fx.fallout.length && P.falloutExtKm > 1) {
      const tTo = Math.min(P.tEnd, 24 * 3600);
      this.atLeast(Math.min(tTo * 0.5, 1800));
      const r = Math.max(Math.min(P.falloutExtKm * 1000, P.falloutFront(tTo)) * 0.62, psi1 * 2, P.capR * 3);
      const ahead = C.destination(lat, lon, r * 0.45, fx.windFromDeg + 180);
      this.ease({ center: ahead, zoom: C.zoomForRadius(r * 0.9, lat), pitch: 42, bearing: 0, duration: 4000 });
      bearing = 0;
      R.speed = 3;
      const big = fx.fallout[0];
      this.say('Lluvia radiactiva', `El viento arrastra el polvo hacia ${dirName(fx.windFromDeg + 180)}; durante horas cae sobre ${big ? `${n0(big.areaKm2)} km²` : 'una franja alargada'}, hasta ${n0(big?.maxDownwindKm ?? P.falloutExtKm)} km a sotavento.`);
      await this.untilT(tok, tTo, 16000, 6000);
      R.speed = 1;
    }

    // 7 · balance, desde arriba, con el mapa de calor de víctimas
    this.atLeast(Math.min(P.tEnd, Math.max(P.tau * 3, 3600)));
    const rEnd = Math.max(psi1 * 1.35, burn3 * 1.6, P.fireballR * 8, 2000);
    this.ease({ center: [lon, lat], zoom: C.zoomForRadius(rEnd, lat), pitch: 0, bearing: 0, duration: 4000 });
    if (this.prevHeat === null) this.prevHeat = C.heat('deaths');
    const c = fx.casualties;
    this.say('Balance', c.deaths > 0 ? `≈ ${people(c.deaths)} muertos y ${people(c.injuries)} heridos en las primeras horas${fx.longTerm?.falloutDeathsShelter ? `; la lluvia radiactiva podría causar ${people(fx.longTerm.falloutDeathsShelter)} muertes más, con refugio` : ''}.` : 'Por suerte, la zona afectada está casi deshabitada.');
    await this.sleep(tok, 8000);
    this.cap.classList.remove('on');
    await this.sleep(tok, 600);
    // al terminar se queda el mapa de calor de víctimas
    this.prevHeat = null;
    C.repaint();
  }
}
