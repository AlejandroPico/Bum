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
import { LOCALE } from './i18n/locale';
import { tr, lang } from './i18n';
import { Narrator } from './narrator';
import { peakWind, PSI } from './physics/blast';
import * as L from './tour-lines';

export interface TourRun { fx: Effects; plan: FxPlan; lat: number; lon: number; t: number; tStart: number; playing: boolean; speed: number; userCam: boolean; orbit: unknown; lastReal: number; extras: unknown[] }
export interface TourCtx {
  map: maplibregl.Map;
  run(): TourRun | null;
  place(): string;
  /** el lugar dicho en voz alta (sin coordenadas: la ciudad más cercana o una descripción corta) */
  placeSpoken(): string;
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
  /** descarga previa del mapa y el relieve de cada plano (panel de preparación) */
  prepare(cams: { center: [number, number]; zoom: number; pitch: number; bearing: number }[]): Promise<void>;
  repaint(): void;
  /** narración por voz activada */
  narration(): boolean;
  /** vuelo del arma de la simulación (si se lanzó desde una base) y su encuadre */
  flight(): { flightS: number } | null;
  flightView(): { center: [number, number]; zoom: number; pitch: number; bearing: number } | null;
  /** planos de persecución del misil (modo cinemático) para descargarlos antes */
  flightCams(): { center: [number, number]; zoom: number; pitch: number; bearing: number }[];
}

class Cancelled extends Error {}

const n0 = (x: number) => Math.round(x).toLocaleString(LOCALE);
const people = (x: number) => (x >= 1e6 ? `${(x / 1e6).toLocaleString(LOCALE, { maximumFractionDigits: 1 })} millones` : x >= 1000 ? `${n0(Math.round(x / 100) * 100)}` : n0(x));
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
  narrator = new Narrator();
  private voiceBtn!: HTMLButtonElement;
  /** activa o desactiva la narración (lo guarda la aplicación) */
  onVoice: (() => void) | null = null;
  private syncVoice() { this.voiceBtn.classList.toggle('on', this.ctx.narration()); this.voiceBtn.style.display = this.narrator.supported ? '' : 'none'; }

  constructor(ctx: TourCtx, parent: HTMLElement) {
    this.ctx = ctx;
    this.clock = h('span', { class: 'tc-clock' });
    this.title = h('b', {});
    this.line = h('p', {});
    this.cap = h('div', { id: 'tour-cap' }, h('div', { class: 'tc-k' }, this.clock), this.title, this.line);
    this.bars = h('div', { id: 'tour-bars' }, h('div', { class: 'tb-top' }), h('div', { class: 'tb-bot' }),
      h('div', { class: 'tour-btns' },
        this.voiceBtn = h('button', { type: 'button', class: 'tour-voice', title: 'Narración por voz', onclick: () => { this.onVoice?.(); this.syncVoice(); if (!this.ctx.narration()) this.narrator.cancel(); } }, 'Voz') as HTMLButtonElement,
        h('button', { type: 'button', class: 'tour-exit', title: 'Salir del recorrido (Esc)', onclick: () => this.stop() }, 'Salir del recorrido ✕')));
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
    this.syncVoice();
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
    this.narrator.cancel();
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
  /** «1,2 millones muertos» → «1,2 millones de muertos» (y lo mismo en los demás idiomas latinos) */
  private fixMillions(t: string) {
    const R: Record<string, [RegExp, (w: string) => string]> = {
      es: [/(\bmillones) (?!de\b)(?=\p{L})/gu, () => 'de '], pt: [/(\bmilhões) (?!de\b)(?=\p{L})/gu, () => 'de '], it: [/(\bmilioni) (?!di\b)(?=\p{L})/gu, () => 'di '],
      ca: [/(\bmilions) (?!d[e'’])(?=\p{L})/gu, (w) => (/^[aeiouàèéíòóúh]/i.test(w) ? 'd’' : 'de ')], fr: [/(\bmillions) (?!d[e'’])(?=\p{L})/gu, (w) => (/^[aeiouàâéèêîôûh]/i.test(w) ? 'd’' : 'de ')],
    };
    const r = R[lang]; if (!r) return t;
    return t.replace(r[0], (m, a, off: number, all: string) => `${a} ${r[1](all.slice(off + m.length))}`);
  }
  private say(title: string, line: string) {
    this.cap.classList.remove('on');
    void this.cap.offsetWidth;
    this.title.textContent = title;
    this.line.textContent = this.fixMillions(line);
    this.cap.classList.add('on');
  }
  private ease(o: maplibregl.EaseToOptions) { this.ctx.map.easeTo({ essential: true, easing: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2), ...o }); }

  // ---------------------------------------------------------------- narración
  /** con narración por voz (si está activada y el navegador la permite) */
  private get narrated() { return this.ctx.narration() && this.narrator.supported; }
  /**
   * Un momento del recorrido: rótulo (breve sin voz; completo con voz) y espera. Con narración, la
   * imagen se congela (`freeze`) mientras la voz explica lo que pasa y se sigue después.
   */
  private async beat(tok: number, title: string, short: string, longIn: string | string[], ms: number, freeze = false, noTitle = false) {
    const n = this.narrated;
    // varias frases se traducen por separado (cada una es una plantilla del catálogo)
    const long = (Array.isArray(longIn) ? longIn : [longIn]).filter(Boolean).map((x) => tr(x)).join(' ');
    this.say(title, n ? long : short);
    const R = this.ctx.run();
    const was = !!R?.playing;
    if (n && freeze && R) R.playing = false;
    const read = n ? Math.max(ms, long.split(/\s+/).length * 330) : ms;
    // el título se lee antes del texto sólo si el texto no lo dice ya (evita «Barcelona. Estamos en Barcelona…»)
    const T = tr(title), norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const spoken = this.fixMillions(!T || norm(long).includes(norm(T)) || noTitle ? long : T + '. ' + long);
    await Promise.all([this.sleep(tok, n ? 900 : ms), n ? this.narrator.speak(spoken).then(() => this.sleep(tok, 500)) : Promise.resolve(), n && !this.narrator.hasVoice ? this.sleep(tok, read) : Promise.resolve()]);
    this.guard(tok);
    if (n && freeze && R && was) { R.playing = true; R.lastReal = performance.now(); }
  }

  // ---------------------------------------------------------------- guion
  private async script(tok: number) {
    const C = this.ctx, map = C.map;
    const R0 = C.run()!;
    const fx = R0.fx, P = R0.plan, lat = R0.lat, lon = R0.lon;
    const ring = (id: string) => fx.rings.find((r) => r.id === id)?.radiusM ?? 0;
    const psi5 = P.psi5R || ring('psi5'), psi1 = P.psi1R || ring('psi1'), psi20 = ring('psi20');
    const burn3 = ring('burn3'), rad500 = ring('rad500');
    const name = fx.scenario.name || 'La explosión';
    const kt = fx.energyKt;
    const energy = kt >= 1000 ? `${(kt / 1000).toLocaleString(LOCALE, { maximumFractionDigits: 1 })} megatones` : `${kt.toLocaleString(LOCALE, { maximumFractionDigits: 1 })} kilotones`;
    const hiro = kt / 15;
    let bearing = map.getBearing();
    if (this.narrated) await this.narrator.prepare();
    if (this.narrated && !this.narrator.hasVoice) this.say('Sin voz en este idioma', 'Este equipo no tiene una voz para leer en este idioma: el recorrido se muestra con subtítulos.');

    // planos del recorrido: se descargan antes de empezar para que no haya saltos ni relieve a medias
    {
      const b0 = bearing;
      const cams: { center: [number, number]; zoom: number; pitch: number; bearing: number }[] = [];
      const fv = C.flightView();
      if (fv) cams.push(fv, ...C.flightCams());
      cams.push({ center: [lon, lat], zoom: C.zoomForRadius(Math.max(psi1 * 1.25, P.fireballR * 10, 2500), lat), pitch: 55, bearing: b0 - 20 });
      try {
        const dW0 = Math.max(psi1 * 0.95, P.fireballR * 6, 1500);
        const from = C.destination(lat, lon, dW0, b0 + 4 + 180);
        const el = map.queryTerrainElevation({ lng: from[0], lat: from[1] }) ?? 0;
        const cam = map.calculateCameraOptionsFromCameraLngLatAltRotation(new maplibregl.LngLat(from[0], from[1]), el + 1.7, b0 + 4, 88.5);
        const ll = maplibregl.LngLat.convert(cam.center!);
        cams.push({ center: [ll.lng, ll.lat], zoom: cam.zoom!, pitch: cam.pitch!, bearing: cam.bearing! });
      } catch { /* sin cámara libre */ }
      if (psi1 > 0) cams.push({ center: [lon, lat], zoom: C.zoomForRadius(psi1 * 1.15, lat), pitch: 58, bearing: b0 + 34 });
      const cc = !P.highAltitude && P.capTop > 600 ? C.cloudCamera(b0 + 34, true) : null;
      if (cc) cams.push(cc);
      if (burn3 > 0) cams.push({ center: [lon, lat], zoom: C.zoomForRadius(burn3 * 1.5, lat), pitch: 40, bearing: b0 + 78 });
      if (fx.fallout.length && P.falloutExtKm > 1) {
        const tTo = Math.min(P.tEnd, 24 * 3600);
        const r = Math.max(Math.min(P.falloutExtKm * 1000, P.falloutFront(tTo)) * 0.62, psi1 * 2, P.capR * 3);
        cams.push({ center: C.destination(lat, lon, r * 0.45, fx.windFromDeg + 180), zoom: C.zoomForRadius(r * 0.9, lat), pitch: 42, bearing: 0 });
      }
      cams.push({ center: [lon, lat], zoom: C.zoomForRadius(Math.max(psi1 * 1.35, burn3 * 1.6, P.fireballR * 8, 2000), lat), pitch: 0, bearing: 0 });
      document.body.classList.remove('touring');
      await C.prepare(cams);
      this.guard(tok);
      document.body.classList.add('touring');
      C.layout();
      map.jumpTo(cams[0]);
    }

    // la simulación vuelve a empezar, en pausa, sin la cámara automática
    C.restart();
    const R = C.run()!;
    R.playing = false;
    R.userCam = true;
    R.orbit = null;
    R.speed = 1;
    C.setWideFov(false);

    // 0 · el vuelo del arma, si se lanzó desde una base
    const F = C.flight();
    if (F && R.t < 0) {
      const M = fx.missile!;
      const fAt = (f: number) => R.tStart + F.flightS * f;
      const dur = M.flightMin >= 90 ? `${Math.floor(M.flightMin / 60)} h ${Math.round(M.flightMin % 60)} min` : `${Math.round(M.flightMin)} minutos`;
      const vec = (M.profileName ?? 'Misil balístico').toLowerCase();
      await this.beat(tok, 'Lanzamiento', `${M.profileName ?? 'Misil balístico'} desde ${M.site}`, L.pick('launch', L.launchLines(M.site, M.country, vec, C.placeSpoken(), n0(M.rangeKm), dur)), 3500, true);
      R.playing = true; R.lastReal = performance.now();
      const boostF = Math.min(0.4, M.boostMin / Math.max(1, M.flightMin));
      await this.untilT(tok, fAt(Math.max(0.12, boostF)), 8000);
      const P2 = M.profile ?? 'ballistic';
      const mid = L.pick('mid-' + P2, P2 === 'hgv' ? L.hgvLines(n0(M.cruiseKm ?? 55)) : P2 === 'cruise' ? L.cruiseLines() : P2 === 'aircraft' ? L.aircraftLines() : L.ballisticLines(n0(M.boostMin), n0(M.apogeeKm)));
      await this.beat(tok, P2 === 'ballistic' ? 'Curso medio' : 'En vuelo', `${n0(M.rangeKm)} km · ${dur}`, mid, 3500, true);
      if (M.mirv) {
        await this.untilT(tok, fAt(0.56), 8000);
        await this.beat(tok, 'Separación de las ojivas', `${M.mirv} ojivas`, L.pick('mirv', L.mirvLines(M.mirv)), 3000, true);
      }
      await this.untilT(tok, fAt(0.86), 9000);
      const end = P2 === 'ballistic'
        ? L.pick('reentry', L.reentryLines(M.reentryKms.toLocaleString(LOCALE, { maximumFractionDigits: 1 }), n0(M.warningMin)))
        : L.pick('arrival', L.arrivalLines(n0(M.warningMin)));
      await this.beat(tok, P2 === 'ballistic' ? 'Reentrada' : 'Llegada', `${n0(M.warningMin)} min de aviso`, end, 3000, false);
      await this.untilT(tok, -0.5, 12000);
      R.playing = false;
    }

    // 1 · plano de situación
    const rEst = Math.max(psi1 * 1.25, P.fireballR * 10, 2500);
    this.ease({ center: [lon, lat], zoom: C.zoomForRadius(rEst, lat), pitch: 55, bearing: bearing - 20, duration: 3200 });
    const pop = fx.casualties.exposed;
    const hiroP = hiro >= 1.5 ? `unas ${n0(hiro)} veces la bomba de Hiroshima` : hiro >= 0.7 ? 'más o menos como la bomba de Hiroshima' : 'menos que la bomba de Hiroshima';
    const intro = L.pick(P.isAsteroid ? 'intro-a' : 'intro-n', L.introLines(P.isAsteroid, C.placeSpoken(), name, energy, hiroP, P.h > 50 ? `a ${fmtDist(P.h)} de altura` : 'en la superficie'));
    await this.beat(tok, C.place(), `${name} · ${energy}${P.isAsteroid ? '' : P.h > 50 ? ` · explosión a ${fmtDist(P.h)} de altura` : ' · en la superficie'}`, [intro, pop > 1000 ? L.pick('pop', L.popLines(people(pop))) : ''], 3400, false, true);
    this.ease({ bearing: bearing + 4, duration: 2600, easing: (x) => x });
    await this.sleep(tok, this.narrated ? 600 : 2600);
    bearing += 4;

    // 1 b · el bólido entra en la atmósfera
    if (P.isAsteroid && R.t < 0) {
      const path = P.entrySpeed * P.entryDuration;
      const az = P.entryAzimuth;
      this.ease({ center: [lon, lat], zoom: C.zoomForRadius(Math.max(path * 0.6, 30000), lat), pitch: 60, bearing: az + 90, duration: 2000 });
      await this.sleep(tok, 2000);
      bearing = az + 90;
      R.playing = true; R.lastReal = performance.now();
      const sp = (P.entrySpeed / 1000).toLocaleString(LOCALE, { maximumFractionDigits: 0 });
      await this.beat(tok, 'Entrada en la atmósfera', `El objeto llega a ${sp} km/s; el aire lo frena y lo calienta hasta hacerlo brillar más que el Sol.`, L.pick('entry', L.entryLines(sp)), 2500);
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
    if (this.narrated) await this.untilT(tok, Math.max(P.tMax * 2, 0.05), 4000);
    await this.beat(tok, P.isAsteroid ? 'Impacto' : 'Destello', `A ${fmtDist(dW)} de la zona cero: la bola de fuego alcanza ${fmtDist(fx.fireball.radiusM)} de radio y durante unos segundos brilla más que el Sol.`,
      L.pick(P.isAsteroid ? 'flash-a' : 'flash-n', L.flashLines(P.isAsteroid, fmtDist(dW), fmtDist(fx.fireball.radiusM), burn3 > 0 ? fmtDist(burn3) : null)),
      this.narrated ? 0 : 3500, true);
    await this.untilT(tok, Math.max(P.shockTime(Math.hypot(dW, P.h)) + 0.6, P.tMax * 4), 9000, this.narrated ? 0 : 1);
    const psiW = fx.pressurePsiAt(dW);
    const sW = Math.max(1, Math.round(P.shockTime(Math.hypot(dW, P.h))));
    const effW = psiW >= 5 ? 'se derrumban los edificios' : psiW >= 2 ? 'se hunden tejados y tabiques' : psiW >= 0.8 ? 'revientan los cristales' : 'se oye un estruendo lejano';
    const windW = Math.round(peakWind(psiW * PSI) * 3.6);
    await this.beat(tok, 'Llega la onda', `El estruendo y el viento llegan ${sW} s después del destello: aquí, a ${fmtDist(dW)}, ${effW}.`,
      L.pick('shock', L.shockLines(String(sW), effW, n0(windW))), 2600, true);

    // 3 · vista aérea de la onda expansiva
    C.setWideFov(false);
    this.atLeast(P.shockTime(Math.hypot(dW, P.h)) + 0.5);
    if (psi1 > 0) {
      this.ease({ center: [lon, lat], zoom: C.zoomForRadius(psi1 * 1.15, lat), pitch: 58, bearing: bearing + 30, duration: 4200 });
      bearing += 30;
      const sh = this.beat(tok, 'Onda expansiva', `${psi5 ? `Derriba la mayoría de los edificios hasta ${fmtDist(psi5)} (5 psi)` : 'Una sobrepresión enorme'} y rompe ventanas hasta ${fmtDist(psi1)} (1 psi).`,
        L.pick('aerial', L.aerialLines(psi20 ? fmtDist(psi20) : null, psi5 ? fmtDist(psi5) : null, fmtDist(psi1))), 4400);
      await Promise.all([sh, this.untilT(tok, P.shockTime(Math.hypot(psi1, P.h)) + 1, 9000, 4400)]);
    }

    // 3 b · radiación inicial
    if (this.narrated && rad500 > 0 && !P.isAsteroid && !fx.chemical) {
      await this.beat(tok, 'Radiación inicial', '', L.pick('rad', L.radiationLines(fmtDist(rad500))), 3000);
    }

    // 4 · el hongo
    if (!P.highAltitude && P.capTop > 600) {
      this.atLeast(Math.min(P.tau * 0.3, P.shockTime(Math.hypot(psi1, P.h)) + 1));
      const cam = C.cloudCamera(bearing, true);
      if (cam) this.ease({ ...cam, duration: 4000 });
      await this.sleep(tok, 4000);
      R.speed = 1.6;
      const mins = Math.max(1, Math.round(fx.cloud.riseTimeS / 60));
      const dk = P.isAsteroid ? 'asteroid' : fx.groundContact > 0 ? 'ground' : 'air';
      const dirt = L.pick('dirt-' + dk, L.dirtLines(dk));
      const cl = this.beat(tok, 'La nube en forma de hongo', `Sube hasta ${fmtDist(P.capTop)} de altura en unos ${mins} min; el sombrero mide ${fmtDist(P.capR * 2)} de ancho.`,
        L.pick('cloud', L.cloudLines(String(mins), fmtDist(P.capTop), fmtDist(P.capR * 2), dirt)), 9000);
      await Promise.all([cl, this.orbit(tok, 9000, bearing, 3.2)]);
      bearing += 29;
      R.speed = 1;
    }

    // 5 · calor e incendios
    if (burn3 > 0) {
      this.atLeast(P.tau * 1.1);
      this.ease({ center: [lon, lat], zoom: C.zoomForRadius(burn3 * 1.5, lat), pitch: 40, bearing: bearing + 15, duration: 3500 });
      bearing += 15;
      const fire = fx.fires?.kind === 'firestorm' ? ' Los incendios se funden en una tormenta de fuego.' : fx.fires?.kind === 'conflagration' ? ' Los incendios avanzan empujados por el viento.' : '';
      const fk = fx.fires?.kind === 'firestorm' ? 'firestorm' : fx.fires?.kind === 'conflagration' ? 'conflagration' : 'none';
      const fireL = L.pick('fire-' + fk, L.fireLines(fk));
      await this.beat(tok, 'El calor', `Quemaduras de tercer grado a quien esté al aire libre hasta ${fmtDist(burn3)}.${fire}`,
        L.pick('heat', L.heatLines(fmtDist(burn3), fireL)), 5200);
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
      const fo = this.beat(tok, 'Lluvia radiactiva', `El viento arrastra el polvo hacia ${dirName(fx.windFromDeg + 180)}; durante horas cae sobre ${big ? `${n0(big.areaKm2)} km²` : 'una franja alargada'}, hasta ${n0(big?.maxDownwindKm ?? P.falloutExtKm)} km a sotavento.`,
        L.pick('fallout', L.falloutLines(dirName(fx.windFromDeg + 180), big ? n0(big.areaKm2) : n0(P.falloutExtKm * 10), n0(big?.maxDownwindKm ?? P.falloutExtKm))), 6000);
      await Promise.all([fo, this.untilT(tok, tTo, 16000, 6000)]);
      R.speed = 1;
    }

    // 7 · balance, desde arriba, con el mapa de calor de víctimas
    this.atLeast(Math.min(P.tEnd, Math.max(P.tau * 3, 3600)));
    const rEnd = Math.max(psi1 * 1.35, burn3 * 1.6, P.fireballR * 8, 2000);
    this.ease({ center: [lon, lat], zoom: C.zoomForRadius(rEnd, lat), pitch: 0, bearing: 0, duration: 4000 });
    if (this.prevHeat === null) this.prevHeat = C.heat('deaths');
    const c = fx.casualties;
    const fall = fx.longTerm?.falloutDeathsShelter ? `; la lluvia radiactiva podría causar ${people(fx.longTerm.falloutDeathsShelter)} muertes más, con refugio` : '';
    await this.beat(tok, 'Balance', c.deaths > 0 ? `≈ ${people(c.deaths)} muertos y ${people(c.injuries)} heridos en las primeras horas${fall}.` : 'Por suerte, la zona afectada está casi deshabitada.',
      c.deaths > 0 ? L.pick('balance', L.balanceLines(people(c.deaths), people(c.injuries), fall)) : L.pick('empty', L.emptyLines()), 8000);
    this.cap.classList.remove('on');
    await this.sleep(tok, 600);
    // al terminar se queda el mapa de calor de víctimas
    this.prevHeat = null;
    C.repaint();
  }
}
