/**
 * «Desde mi ventana»: la explosión vista desde donde estás, a su tamaño real sobre tu horizonte.
 * En el móvil, la cámara trasera hace de ventana y la brújula y los sensores de inclinación
 * orientan la escena: si apuntas hacia la zona cero, ves la bola de fuego y el hongo donde
 * aparecerían, con su tamaño angular verdadero (y la parte que tapa la curvatura de la Tierra).
 * Sin sensores (en el ordenador), se mira alrededor arrastrando.
 *
 * El reloj va en tiempo real por defecto: entre el destello y la llegada de la onda expansiva pasan
 * los segundos que tendrías para alejarte de la ventana.
 */
import { h, toast } from './dom';
import { tr, lang } from '../i18n';
import { DEC, LOCALE } from '../i18n/locale';
import type { FxPlan } from '../fx/plan';
import type { Effects } from '../physics/types';
import { localOffset, assessPoint } from '../physics/safety';

export interface WinSource { fx: Effects; plan: FxPlan; lat: number; lon: number; delay: number }
export interface WinOpts {
  sources: WinSource[];
  obs: { lat: number; lon: number; label: string };
  sound?: { flash(i: number): void; boom(i: number): void };
}

const RAD = Math.PI / 180;
/** radio de la Tierra efectivo con la refracción normal (k = 0,13) */
const R_EFF = 6371000 / (1 - 0.13);
type V3 = [number, number, number];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const mix = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const DIRS = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
const COMPASS: Record<string, string[]> = {
  es: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'],
  en: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
  de: ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'],
  pt: ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'],
};
/** alturas de la mirada: calle y varias plantas */
const FLOORS: [number, string][] = [[1.6, 'Calle'], [10, '3.ª planta'], [31, '10.ª planta'], [91, '30.ª planta']];

/** pseudoaleatorio fijo (para que las «coliflores» del hongo no tiemblen) */
function rnd(i: number) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

interface Src extends WinSource { E: number; N: number; d: number; az: number; psi: number; tArr: number; boomed: boolean }

export class WindowView {
  private el: HTMLElement | null = null;
  private video!: HTMLVideoElement;
  private cv!: HTMLCanvasElement;
  private g!: CanvasRenderingContext2D;
  private hud!: { info: HTMLElement; warn: HTMLElement; time: HTMLElement; slider: HTMLInputElement; play: HTMLButtonElement; hint: HTMLElement };
  private stream: MediaStream | null = null;
  private raf = 0;
  private S: Src[] = [];
  private main!: Src;
  private o!: WinOpts;
  private t = -3;
  private tEnd = 600;
  private playing = true;
  private speed = 1;
  private last = 0;
  private eyeH = 1.6;
  private zoom = 1;
  /** orientación: con sensores (vectores de la cámara en el sistema este-norte-arriba) o a mano */
  private sensor = false;
  private cam: { r: V3; u: V3; f: V3 } | null = null;
  private yaw = 0; private pitch = 8;
  /** corrección de la brújula (grados), arrastrando */
  private yawOff = 0;
  private drag: { x: number; y: number; yaw: number; pitch: number; off: number } | null = null;
  private shake = 0;
  private cracks: [number, number, number, number][] = [];
  private flashed = false;
  private headline = '';

  get open() { return !!this.el; }

  /** permiso de la brújula en iOS: hay que pedirlo dentro del clic, antes de cualquier espera */
  private static perm: Promise<string> | null = null;
  static prime() {
    const DOE = (window as any).DeviceOrientationEvent;
    WindowView.perm = DOE && typeof DOE.requestPermission === 'function' ? DOE.requestPermission().catch(() => 'denied') : null;
  }

  /** abre la vista; hay que llamarlo desde un clic (los permisos de cámara y brújula lo exigen) */
  show(o: WinOpts) {
    this.close();
    this.o = o;
    this.S = o.sources.map((s) => {
      const off = localOffset(s.lat, s.lon, o.obs.lat, o.obs.lon);
      const psi = s.fx.pressurePsiAt(off.d);
      return { ...s, E: -off.e, N: -off.n, d: off.d, az: (off.bearing + 180) % 360, psi, tArr: s.delay + arrival(s, Math.hypot(off.d, s.plan.h)), boomed: false };
    });
    this.main = this.S.reduce((a, b) => (b.d < a.d ? b : a));
    const rep = assessPoint(this.main.fx, this.main.lat, this.main.lon, o.obs.lat, o.obs.lon);
    this.headline = rep.headline;
    this.tEnd = Math.min(7200, Math.max(600, ...this.S.map((s) => s.tArr + 40), ...this.S.map((s) => s.delay + s.plan.tau * 4)));
    this.t = -3; this.playing = true; this.speed = 1; this.flashed = false; this.cracks = []; this.shake = 0;
    this.sensor = false; this.cam = null; this.yawOff = 0;
    // mirada inicial: hacia la zona cero, a media altura del hongo
    this.yaw = this.main.az;
    this.pitch = Math.max(3, Math.min(35, this.elevDeg(this.main, (this.main.plan.capTop + this.main.plan.capBottom) / 2) * 0.7));
    this.build();
    this.startSensors();
    void this.startCamera();
    this.last = performance.now();
    this.loop();
  }

  close() {
    if (!this.el) return;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('deviceorientationabsolute', this.onOri as EventListener);
    window.removeEventListener('deviceorientation', this.onOri as EventListener);
    window.removeEventListener('resize', this.onResize);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.el.remove();
    this.el = null;
    document.body.classList.remove('winview-open');
  }

  // ------------------------------------------------------------------ interfaz
  private build() {
    const el = h('div', { id: 'winview' });
    this.video = h('video', { autoplay: true, muted: true, playsinline: true }) as HTMLVideoElement;
    this.video.muted = true; this.video.setAttribute('playsinline', '');
    this.cv = h('canvas') as HTMLCanvasElement;
    this.g = this.cv.getContext('2d')!;
    const info = h('div', { class: 'wv-info' });
    const warn = h('div', { class: 'wv-warn' });
    const hint = h('div', { class: 'wv-hint' });
    const time = h('span', { class: 'wv-time' });
    const slider = h('input', { type: 'range', min: 0, max: 1000, step: 1, value: 0 }) as HTMLInputElement;
    slider.addEventListener('input', () => { this.seek(-3 + (+slider.value / 1000) * (this.tEnd + 3)); });
    const play = h('button', { type: 'button', class: 'wv-b', title: 'Reproducir o pausar', onclick: () => { this.playing = !this.playing; this.last = performance.now(); this.syncPlay(); } }) as HTMLButtonElement;
    const restart = h('button', { type: 'button', class: 'wv-b', title: 'Volver a empezar', html: '↺', onclick: () => { this.seek(-3); this.playing = true; this.syncPlay(); } });
    const speeds = h('div', { class: 'wv-seg' });
    for (const s of [1, 10, 60]) speeds.append(h('button', { type: 'button', class: s === 1 ? 'on' : '', onclick: (e: MouseEvent) => { this.speed = s; speeds.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); } }, `×${s}`));
    const floor = h('select', { class: 'wv-sel', title: 'Altura desde la que miras' }) as HTMLSelectElement;
    FLOORS.forEach(([m, l], i) => floor.append(h('option', { value: String(i) }, l)));
    floor.addEventListener('change', () => { this.eyeH = FLOORS[+floor.value][0]; });
    const zm = (k: number) => () => { this.zoom = Math.max(0.5, Math.min(4, this.zoom * k)); };
    const close = h('button', { type: 'button', class: 'wv-close', title: 'Cerrar', html: '✕', onclick: () => this.close() });
    el.append(this.video, this.cv, info, hint, close,
      h('div', { class: 'wv-bar' },
        warn,
        h('div', { class: 'wv-row' }, play, restart, time, slider),
        h('div', { class: 'wv-row' }, speeds, floor, h('button', { type: 'button', class: 'wv-b', title: 'Alejar', html: '−', onclick: zm(1 / 1.25) }), h('button', { type: 'button', class: 'wv-b', title: 'Acercar', html: '+', onclick: zm(1.25) })),
      ));
    this.hud = { info, warn, time, slider, play, hint };
    this.syncPlay();
    // arrastrar: sin sensores se mira alrededor; con sensores se corrige la brújula
    this.cv.addEventListener('pointerdown', (e) => { this.drag = { x: e.clientX, y: e.clientY, yaw: this.yaw, pitch: this.pitch, off: this.yawOff }; this.cv.setPointerCapture(e.pointerId); });
    this.cv.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      const k = this.fovV() / this.cv.clientHeight;
      const dx = (e.clientX - this.drag.x) * k, dy = (e.clientY - this.drag.y) * k;
      if (this.sensor) this.yawOff = this.drag.off - dx;
      else { this.yaw = (this.drag.yaw - dx + 360) % 360; this.pitch = Math.max(-30, Math.min(85, this.drag.pitch + dy)); }
    });
    const up = () => { this.drag = null; };
    this.cv.addEventListener('pointerup', up); this.cv.addEventListener('pointercancel', up);
    this.cv.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom = Math.max(0.5, Math.min(4, this.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1))); }, { passive: false });
    document.body.append(el);
    document.body.classList.add('winview-open');
    this.el = el;
    window.addEventListener('resize', this.onResize);
    this.onResize();
    hint.textContent = tr('Apunta el móvil hacia la zona cero');
  }

  private syncPlay() { this.hud.play.innerHTML = this.playing ? '❚❚' : '▶'; }
  private seek(t: number) {
    this.t = t;
    for (const s of this.S) s.boomed = t >= s.tArr;
    this.flashed = t > 0;
    if (t < Math.min(...this.S.map((s) => s.tArr))) this.cracks = [];
  }
  private onResize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(this.cv.clientWidth * dpr);
    this.cv.height = Math.round(this.cv.clientHeight * dpr);
  };

  // ------------------------------------------------------------------ cámara y sensores
  private async startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) { this.el?.classList.add('no-cam'); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (!this.el) { s.getTracks().forEach((t) => t.stop()); return; }
      this.stream = s;
      this.video.srcObject = s;
      await this.video.play().catch(() => undefined);
    } catch {
      this.el?.classList.add('no-cam');
    }
  }

  private startSensors() {
    const DOE = (window as any).DeviceOrientationEvent;
    const pre = WindowView.perm; WindowView.perm = null;
    const listen = () => {
      if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', this.onOri as EventListener);
      window.addEventListener('deviceorientation', this.onOri as EventListener);
    };
    // iOS: hace falta pedir permiso desde el mismo clic que abre la vista
    if (DOE && typeof DOE.requestPermission === 'function') {
      (pre ?? DOE.requestPermission()).then((r: string) => { if (r === 'granted') listen(); else toast('Sin permiso para la brújula: arrastra para mirar alrededor', 3500); }, () => undefined);
    } else listen();
    setTimeout(() => {
      if (!this.el || this.sensor) return;
      this.hud.hint.textContent = tr('Sin brújula: arrastra para mirar alrededor');
      setTimeout(() => { if (this.el && !this.sensor) this.hud.hint.textContent = ''; }, 5000);
    }, 2000);
  }

  private absSeen = false;
  private onOri = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
    if (e.alpha == null || e.beta == null || e.gamma == null) return;
    if (e.type === 'deviceorientationabsolute') this.absSeen = true;
    else if (this.absSeen) return; // en Android se usa el evento absoluto (referido al norte)
    let a = e.alpha;
    if (typeof e.webkitCompassHeading === 'number') a = 360 - e.webkitCompassHeading;
    const ca = Math.cos(a * RAD), sa = Math.sin(a * RAD), cb = Math.cos(e.beta * RAD), sb = Math.sin(e.beta * RAD), cg = Math.cos(e.gamma * RAD), sg = Math.sin(e.gamma * RAD);
    // R = Rz(α)·Rx(β)·Ry(γ): columnas = ejes del móvil en el sistema este-norte-arriba
    const ex: V3 = [ca * cg - sa * sb * sg, sa * cg + ca * sb * sg, -cb * sg];
    const ey: V3 = [-sa * cb, ca * cb, sb];
    const ez: V3 = [ca * sg + sa * sb * cg, sa * sg - ca * sb * cg, cb * cg];
    const th = ((screen.orientation?.angle ?? (window as any).orientation ?? 0) as number) * RAD;
    const r: V3 = [Math.cos(th) * ex[0] - Math.sin(th) * ey[0], Math.cos(th) * ex[1] - Math.sin(th) * ey[1], Math.cos(th) * ex[2] - Math.sin(th) * ey[2]];
    const f: V3 = [-ez[0], -ez[1], -ez[2]];
    if (!this.sensor) {
      this.sensor = true;
      this.hud.hint.textContent = tr('Si la dirección no cuadra, arrastra para corregir la brújula');
      setTimeout(() => { if (this.el) this.hud.hint.textContent = ''; }, 6000);
    }
    // filtro suave para que la imagen no tiemble
    const c = this.cam;
    const k = 0.3;
    const F = norm(c ? mix(c.f, f, k) : f);
    let R = c ? mix(c.r, r, k) : r;
    R = norm([R[0] - F[0] * dot(R, F), R[1] - F[1] * dot(R, F), R[2] - F[2] * dot(R, F)]);
    this.cam = { f: F, r: R, u: cross(R, F) };
  };

  // ------------------------------------------------------------------ geometría
  /** campo de visión vertical (grados) de lo que se ve en pantalla */
  private fovV() {
    const W = this.cv.clientWidth || 1, H = this.cv.clientHeight || 1;
    const vw = this.video.videoWidth, vh = this.video.videoHeight;
    let f: number; // focal en px CSS
    if (vw && vh && this.stream) {
      // cámara principal de un móvil: unos 67° en el lado largo del sensor; «cover» recorta lo que sobra
      const long = Math.max(vw, vh);
      const fv = (long / 2) / Math.tan(33.5 * RAD);
      f = fv * Math.max(W / vw, H / vh);
    } else f = (H / 2) / Math.tan(30 * RAD);
    return (2 * Math.atan(H / 2 / (f * this.zoom))) / RAD;
  }
  /** vectores de la cámara */
  private basis(): { r: V3; u: V3; f: V3 } {
    let b = this.cam;
    if (!b) {
      const H = this.yaw * RAD, P = this.pitch * RAD;
      const f: V3 = [Math.cos(P) * Math.sin(H), Math.cos(P) * Math.cos(H), Math.sin(P)];
      const r: V3 = [Math.cos(H), -Math.sin(H), 0];
      b = { r, f, u: cross(r, f) };
    }
    if (!this.yawOff || !this.cam) return b;
    // corrección de la brújula: giro alrededor de la vertical
    const c = Math.cos(this.yawOff * RAD), s = Math.sin(this.yawOff * RAD);
    const rot = (v: V3): V3 => [v[0] * c + v[1] * s, -v[0] * s + v[1] * c, v[2]];
    return { r: rot(b.r), u: rot(b.u), f: rot(b.f) };
  }
  /** elevación aparente (grados) de un punto a altura z sobre la zona cero de `s` */
  private elevDeg(s: Src, z: number) {
    return Math.atan2(z - (s.d * s.d) / (2 * R_EFF) - this.eyeH, s.d) / RAD;
  }

  // ------------------------------------------------------------------ dibujo
  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    if (this.playing) {
      this.t = Math.min(this.tEnd, this.t + dt * this.speed);
      if (this.t >= this.tEnd) { this.playing = false; this.syncPlay(); }
    }
    this.events();
    this.draw(dt);
    this.updHud();
  };

  private events() {
    const t = this.t;
    if (!this.flashed && t > 0) {
      this.flashed = true;
      this.o.sound?.flash(Math.min(1, 30000 / Math.max(1000, this.main.d)));
      if (navigator.vibrate) navigator.vibrate(60);
    }
    for (const s of this.S) {
      if (s.boomed || t < s.tArr) continue;
      s.boomed = true;
      const I = Math.min(1, s.psi / 5);
      this.shake = Math.max(this.shake, Math.min(1, 0.25 + s.psi / 4));
      this.o.sound?.boom(Math.max(0.15, I));
      if (navigator.vibrate) navigator.vibrate([80 + 300 * I, 40, 120 * I]);
      // la onda rompe los cristales a partir de ~0,5 psi
      if (s.psi >= 0.5 && !this.cracks.length) {
        const W = this.cv.width, H = this.cv.height;
        const n = Math.round(10 + Math.min(40, s.psi * 8));
        for (let k = 0; k < 3; k++) {
          const cx = W * (0.2 + 0.6 * Math.random()), cy = H * (0.15 + 0.6 * Math.random());
          for (let i = 0; i < n / 3; i++) {
            const a = Math.random() * Math.PI * 2, L = (0.15 + Math.random() * 0.6) * Math.max(W, H);
            this.cracks.push([cx, cy, cx + Math.cos(a) * L, cy + Math.sin(a) * L]);
          }
        }
      }
    }
  }

  private draw(dt: number) {
    const g = this.g, cv = this.cv;
    const W = cv.width, H = cv.height, dpr = W / Math.max(1, cv.clientWidth);
    const fpx = (H / 2) / Math.tan((this.fovV() / 2) * RAD);
    const B = this.basis();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    if (this.shake > 0) {
      const a = this.shake * 18 * dpr;
      g.translate((Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
      this.shake = Math.max(0, this.shake - dt * 0.7);
    }
    const proj = (v: V3): [number, number, number] | null => {
      const z = dot(v, B.f);
      if (z <= 1e-6) return null;
      return [W / 2 + (fpx * dot(v, B.r)) / z, H / 2 - (fpx * dot(v, B.u)) / z, z];
    };
    /** punto (este, norte, altura sobre el suelo) relativo al observador, con la curvatura */
    const P = (e: number, n: number, z: number): V3 => [e, n, z - (e * e + n * n) / (2 * R_EFF) - this.eyeH];
    const dip = -Math.sqrt((2 * this.eyeH) / R_EFF);
    const dirV = (az: number, el: number): V3 => [Math.cos(el) * Math.sin(az * RAD), Math.cos(el) * Math.cos(az * RAD), Math.sin(el)];
    // horizonte (y el suelo, si no hay cámara)
    const hz: [number, number][] = [];
    for (let a = 0; a <= 360; a += 3) { const p = proj(dirV(a, dip)); if (p && p[0] > -W && p[0] < 2 * W) hz.push([p[0], p[1]]); }
    hz.sort((a, b) => a[0] - b[0]);
    const noCam = !this.stream;
    if (noCam) {
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#2c5a8f'); sky.addColorStop(1, '#a9c6de');
      g.fillStyle = sky; g.fillRect(-W, -H, 3 * W, 3 * H);
      if (hz.length > 1) {
        g.beginPath(); g.moveTo(hz[0][0], hz[0][1]);
        for (const p of hz) g.lineTo(p[0], p[1]);
        g.lineTo(hz[hz.length - 1][0], 3 * H); g.lineTo(hz[0][0], 3 * H); g.closePath();
        const gr = g.createLinearGradient(0, hz[0][1], 0, H);
        gr.addColorStop(0, '#5d6658'); gr.addColorStop(1, '#2b3027');
        g.fillStyle = gr; g.fill();
      }
    }
    if (hz.length > 1) {
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1 * dpr;
      g.beginPath(); hz.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
    }
    // rumbos sobre el horizonte
    g.font = `${11 * dpr}px "IBM Plex Mono", monospace`; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,0.75)';
    for (let a = 0; a < 360; a += 15) {
      const p = proj(dirV(a, dip));
      if (!p || p[0] < -20 || p[0] > W + 20) continue;
      const big = a % 45 === 0;
      g.fillRect(p[0] - 0.5 * dpr, p[1] - (big ? 8 : 4) * dpr, 1 * dpr, (big ? 8 : 4) * dpr);
      if (big) g.fillText((COMPASS[lang] ?? COMPASS.es)[a / 45], p[0], p[1] - 12 * dpr);
    }
    // explosiones (de la más lejana a la más cercana)
    for (const s of [...this.S].sort((a, b) => b.d - a.d)) this.drawBlast(s, proj, P, dip, dpr, fpx, W, H);
    // zona cero sobre el horizonte, o una flecha si queda fuera
    const m = this.main;
    const zp = proj(P(m.E, m.N, 0));
    const onScreen = zp && zp[0] > 0 && zp[0] < W && zp[1] > -H && zp[1] < 2 * H;
    g.fillStyle = '#ffb020'; g.font = `600 ${12 * dpr}px "IBM Plex Sans", system-ui, sans-serif`;
    if (onScreen) {
      const y = Math.min(zp![1], (proj(dirV(m.az, dip)) ?? zp!)[1]);
      g.beginPath(); g.moveTo(zp![0], y + 2 * dpr); g.lineTo(zp![0] - 6 * dpr, y + 12 * dpr); g.lineTo(zp![0] + 6 * dpr, y + 12 * dpr); g.closePath(); g.fill();
      g.fillText(tr('Zona cero'), zp![0], y + 26 * dpr);
    } else {
      // hacia dónde girar
      const fAz = (Math.atan2(B.f[0], B.f[1]) / RAD + 360) % 360;
      const d = ((m.az - fAz + 540) % 360) - 180;
      const x = d > 0 ? W - 34 * dpr : 34 * dpr;
      g.textAlign = d > 0 ? 'right' : 'left';
      g.font = `600 ${22 * dpr}px system-ui, sans-serif`;
      g.fillText(d > 0 ? '→' : '←', x + (d > 0 ? 18 : -18) * dpr, H / 2);
      g.font = `600 ${12 * dpr}px "IBM Plex Sans", system-ui, sans-serif`;
      g.fillText(`${tr('Zona cero')} ${Math.abs(Math.round(d))}°`, x, H / 2 + 20 * dpr);
    }
    // destello: la luz llega antes que nada (más intensa cuanto más cerca)
    let white = 0;
    for (const s of this.S) {
      const ts = this.t - s.delay;
      if (ts <= 0) continue;
      const k = s.plan.heat(ts);
      if (k <= 0) continue;
      const near = Math.min(1, 60000 / Math.max(2000, s.d));
      const vis = this.elevDeg(s, s.plan.h + s.plan.fireballR) > dip / RAD || s.d < 4000 ? 1 : 0.35;
      white = Math.max(white, Math.min(0.97, k * 0.85 * near * vis * Math.exp(-ts / (s.plan.tMax * 4 + 0.6))));
    }
    if (white > 0.01) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(255,252,240,${white})`; g.fillRect(0, 0, W, H); }
    // cristales rotos
    if (this.cracks.length) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.strokeStyle = 'rgba(235,245,255,0.55)'; g.lineWidth = 1.1 * dpr;
      g.beginPath();
      for (const [a, b, c, d] of this.cracks) {
        // grieta quebrada en tres tramos
        const m1x = a + (c - a) * 0.35 + (rnd(a) - 0.5) * 30 * dpr, m1y = b + (d - b) * 0.35 + (rnd(b) - 0.5) * 30 * dpr;
        g.moveTo(a, b); g.lineTo(m1x, m1y); g.lineTo(c, d);
      }
      g.stroke();
    }
  }

  private drawBlast(s: Src, proj: (v: V3) => [number, number, number] | null, P: (e: number, n: number, z: number) => V3, dip: number, dpr: number, fpx: number, W: number, H: number) {
    const g = this.g, pl = s.plan;
    const ts = this.t - s.delay;
    if (ts <= 0) return;
    // lo que queda por debajo del horizonte lo tapa la curvatura de la Tierra
    const dh = Math.sqrt(2 * R_EFF * this.eyeH);
    g.save();
    if (s.d > dh) {
      const hz: [number, number][] = [];
      for (let a = s.az - 40; a <= s.az + 40; a += 4) {
        const v: V3 = [Math.cos(dip) * Math.sin(a * RAD), Math.cos(dip) * Math.cos(a * RAD), Math.sin(dip)];
        const p = proj(v); if (p) hz.push([p[0], p[1]]);
      }
      if (hz.length > 1) {
        hz.sort((a, b) => a[0] - b[0]);
        g.beginPath(); g.moveTo(hz[0][0], -3 * H);
        for (const p of hz) g.lineTo(p[0], p[1]);
        g.lineTo(hz[hz.length - 1][0], -3 * H); g.closePath(); g.clip();
      }
    }
    const pxR = (r: number, z: number) => (fpx * r) / Math.max(1, z);
    const fade = pl.cloudFade(ts);
    const heat = pl.heat(ts);
    const dr = pl.drift(ts, 1);
    // tronco y polvo levantado del suelo
    if (!pl.highAltitude && ts > pl.tMax && fade > 0.02) {
      const sf = pl.stemFade(ts) * fade;
      const top = pl.capZ(ts) - (pl.capTop - pl.capBottom) * 0.25;
      const dm = pl.drift(ts, 0.4);
      const a = proj(P(s.E, s.N, 0)), b = proj(P(s.E + dm[0], s.N + dm[1], Math.max(10, top)));
      if (a && b && sf > 0.02) {
        // columna de bocanadas que se estrecha hacia arriba (polvo y humo que sube)
        const ra = pxR(pl.stemR * 1.3, a[2]), rb = pxR(pl.stemR * 0.75, b[2]);
        const n = Math.max(2, Math.min(28, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / Math.max(2, (ra + rb) * 0.35))));
        for (let i = 0; i <= n; i++) {
          const u = i / n, j = (rnd(i + 50) - 0.5) * 0.35;
          const x = a[0] + (b[0] - a[0]) * u + j * (ra + rb) * 0.5, y = a[1] + (b[1] - a[1]) * u;
          const r = Math.max(1, ra + (rb - ra) * u) * (0.8 + 0.4 * rnd(i + 90));
          const c0 = Math.round(105 + 60 * u);
          const gr = g.createRadialGradient(x - r * 0.25, y - r * 0.2, 0, x, y, r);
          gr.addColorStop(0, `rgba(${c0 + 25},${c0 + 10},${c0},${0.5 * sf})`); gr.addColorStop(1, `rgba(${c0},${c0 - 12},${c0 - 22},0)`);
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        }
      }
      if (pl.contact > 0 && a) {
        // nube de polvo de la base
        const k = 1 - Math.exp(-ts / (pl.tau * 0.8));
        const rr = pxR(pl.dustR * 0.6 * k, a[2]);
        const gr = g.createRadialGradient(a[0], a[1], 0, a[0], a[1], Math.max(1, rr));
        gr.addColorStop(0, `rgba(150,128,108,${0.7 * sf})`); gr.addColorStop(1, 'rgba(150,128,108,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(a[0], a[1], Math.max(1, rr), Math.max(1, rr * 0.35), 0, 0, Math.PI * 2); g.fill();
      }
    }
    // sombrero del hongo: muchas «bolas» con luz por arriba y sombra por abajo
    const cz = pl.capZ(ts), rx = pl.capRadius(ts);
    const grow = 1 - Math.exp(-ts / pl.tau);
    const ry = Math.max(rx * 0.3, ((pl.capTop - pl.capBottom) / 2) * grow);
    const c = proj(P(s.E + dr[0], s.N + dr[1], cz));
    if (c && fade > 0.02 && ts > pl.tMax * 0.5) {
      const R = pxR(rx, c[2]), Ry = pxR(ry, c[2]);
      if (R > 0.4) {
        const glow = Math.max(0, Math.min(1, heat * 1.4)); // incandescente al principio
        const N = R < 6 ? 1 : 26;
        for (let i = 0; i < N; i++) {
          const a = rnd(i * 3 + 1) * Math.PI * 2, rr = Math.sqrt(rnd(i * 3 + 2));
          const x = c[0] + Math.cos(a) * rr * R * 0.8, y = c[1] - Math.sin(a) * rr * Ry * 0.75;
          const pr = (N === 1 ? 1 : 0.32 + 0.25 * rnd(i * 3 + 3)) * Math.max(R, 1);
          const pRy = N === 1 ? Math.max(Ry, 0.6) : pr * (Ry / Math.max(R, 1)) * 1.6;
          const lit = 0.5 + 0.5 * Math.sin(a); // las de arriba, más claras
          const col = [Math.round(140 + 90 * lit + glow * 40), Math.round(128 + 88 * lit - glow * 50), Math.round(120 + 82 * lit - glow * 90)];
          const gr = g.createRadialGradient(x, y - pRy * 0.35, 0, x, y, pr);
          gr.addColorStop(0, `rgba(${col[0] + 20},${col[1] + 15},${col[2] + 10},${0.95 * fade})`);
          gr.addColorStop(0.7, `rgba(${col[0]},${col[1]},${col[2]},${0.85 * fade})`);
          gr.addColorStop(1, `rgba(${col[0] - 40},${col[1] - 40},${col[2] - 40},0)`);
          g.fillStyle = gr;
          g.beginPath(); g.ellipse(x, y, pr, Math.min(pr, pRy), 0, 0, Math.PI * 2); g.fill();
        }
        if (glow > 0.05) {
          const gr = g.createRadialGradient(c[0], c[1] + Ry * 0.3, 0, c[0], c[1], R * 1.1);
          gr.addColorStop(0, `rgba(255,150,60,${0.7 * glow})`); gr.addColorStop(1, 'rgba(255,90,20,0)');
          g.fillStyle = gr; g.beginPath(); g.ellipse(c[0], c[1], R * 1.1, Ry * 1.3, 0, 0, Math.PI * 2); g.fill();
        }
      }
    }
    // bola de fuego
    if (heat > 0.02) {
      const fz = Math.max(pl.h, pl.capZ(ts));
      const fp = proj(P(s.E, s.N, fz));
      if (fp) {
        const r = Math.max(1.5 * dpr, pxR(pl.fireballRadius(ts), fp[2]));
        const k = Math.min(1, heat);
        const gr = g.createRadialGradient(fp[0], fp[1], 0, fp[0], fp[1], r * 2.2);
        gr.addColorStop(0, `rgba(255,255,${Math.round(200 + 55 * k)},${k})`);
        gr.addColorStop(0.42, `rgba(255,${Math.round(120 + 120 * k)},${Math.round(40 + 120 * k)},${0.9 * k})`);
        gr.addColorStop(1, 'rgba(255,80,0,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(fp[0], fp[1], r * 2.2, 0, Math.PI * 2); g.fill();
      }
    }
    g.restore();
    void W;
  }

  // ------------------------------------------------------------------ textos
  private lastHud = '';
  private updHud() {
    const m = this.main, t = this.t;
    const km = m.d / 1000;
    const kmTxt = km < 10 ? km.toFixed(1).replace('.', DEC) : Math.round(km).toLocaleString(LOCALE);
    const dir = DIRS[Math.round(m.az / 45) % 8];
    const topKm = m.plan.capTop / 1000;
    const el = Math.max(0, this.elevDeg(m, m.plan.capTop));
    const hidden = Math.max(0, (m.d - Math.sqrt(2 * R_EFF * this.eyeH)) ** 2 / (2 * R_EFF));
    const lines = [
      tr(`${this.o.obs.label} · zona cero a ${kmTxt} km al ${dir}`),
      tr(`El hongo subirá a ${n1(topKm)} km: se verá a ${Math.round(el)}° sobre el horizonte (≈ ${n1(el / 10)} puños con el brazo extendido)`),
    ];
    if (hidden > 50) lines.push(tr(`La curvatura de la Tierra tapa los primeros ${hidden >= 1000 ? `${n1(hidden / 1000)} km` : `${Math.round(hidden)} m`} de altura`));
    lines.push(tr(this.headline));
    const html = lines.map((l, i) => `<div class="${i === lines.length - 1 ? 'wv-head' : ''}">${l}</div>`).join('');
    if (html !== this.lastHud) { this.lastHud = html; this.hud.info.innerHTML = html; }
    // aviso: tiempo hasta que llega la onda
    let w = '';
    const nxt = this.S.filter((s) => !s.boomed).sort((a, b) => a.tArr - b.tArr)[0];
    if (t < 0) w = tr(`Detonación en ${Math.ceil(-t)} s`);
    else if (nxt && t > 0) {
      const left = Math.ceil(nxt.tArr - t);
      const sev = nxt.psi >= 5 ? 'derribaría tu casa' : nxt.psi >= 2 ? 'puede herirte con cristales y escombros' : nxt.psi >= 0.5 ? 'rompería los cristales' : 'se oiría como un trueno lejano';
      w = nxt.psi >= 0.5
        ? `<b>${tr('¡Aléjate de la ventana y túmbate!')}</b>${tr(`La onda expansiva llega en ${fmtS(left)}: ${n1(nxt.psi)} psi, ${tr(sev)}`)}`
        : tr(`El estruendo llega en ${fmtS(left)}`);
    } else if (t > 0) {
      const mx = Math.max(...this.S.map((s) => s.psi));
      w = mx >= 0.5 ? tr(`Ha llegado la onda expansiva: ${n1(mx)} psi`) : '';
    }
    if (this.hud.warn.dataset.h !== w) { this.hud.warn.dataset.h = w; this.hud.warn.innerHTML = w; this.hud.warn.classList.toggle('alert', w.includes('<b>')); }
    this.hud.time.textContent = t < 0 ? `T${fmtClock(t)}` : `T+${fmtClock(t)}`;
    if (document.activeElement !== this.hud.slider) this.hud.slider.value = String(Math.round(((t + 3) / (this.tEnd + 3)) * 1000));
  }
}

/** llegada de la onda; más allá de la tabla del cálculo, viaja a la velocidad del sonido */
function arrival(s: WinSource, r: number) {
  const R = s.fx.shock.r, T = s.fx.shock.t;
  const rm = R[R.length - 1];
  return r > rm ? T[T.length - 1] + (r - rm) / 343 : s.plan.shockTime(r);
}
function n1(x: number) { return (x < 10 ? x.toFixed(1) : Math.round(x).toString()).replace('.', DEC); }
function fmtS(s: number) { return s >= 90 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`; }
function fmtClock(t: number) { const a = Math.abs(Math.round(t)); const m = Math.floor(a / 60), s = a % 60; return `${t < 0 ? '−' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }
