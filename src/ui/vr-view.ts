/**
 * Realidad virtual: la explosión a escala real alrededor de ti, con gafas de RV (WebXR) o con el
 * móvil metido en un visor tipo Cardboard (pantalla partida en dos y sensores de orientación).
 *
 * La escena es la misma que la de «Desde mi ventana» (bola de fuego, tronco, polvo y sombrero del
 * hongo con los tiempos del simulador), pero en 3D: el hongo se levanta a su distancia real, el
 * suelo tapa lo que esconde la curvatura de la Tierra y en el suelo se ven los anillos de daño.
 */
import * as THREE from 'three';
import { StereoEffect } from 'three/examples/jsm/effects/StereoEffect.js';
import { h } from './dom';
import { tr } from '../i18n';
import { DEC } from '../i18n/locale';
import { localOffset } from '../physics/safety';
import type { WinOpts, WinSource } from './window-view';

const RAD = Math.PI / 180;
const R_EFF = 6371000 / (1 - 0.13);
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** ¿hay gafas de realidad virtual (WebXR)? */
export async function xrSupported(): Promise<boolean> {
  const xr = (navigator as any).xr;
  if (!xr?.isSessionSupported) return false;
  try { return await xr.isSessionSupported('immersive-vr'); } catch { return false; }
}

function puffTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  // bola algodonosa: varias manchas suaves dentro de un círculo
  for (let i = 0; i < 22; i++) {
    const a = rnd(i) * Math.PI * 2, r = rnd(i + 7) * 34, x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r, s = 22 + rnd(i + 13) * 26;
    const gr = g.createRadialGradient(x, y, 0, x, y, s);
    gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function groundTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  // cerca, campo; lejos, la bruma del horizonte
  gr.addColorStop(0, '#4b5a3c'); gr.addColorStop(0.02, '#56633f'); gr.addColorStop(0.25, '#6b7458'); gr.addColorStop(1, '#a5b2bd');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

interface Blast {
  s: WinSource; d: number; psi: number; tArr: number; boomed: boolean;
  root: THREE.Group; fire: THREE.Sprite; cap: THREE.Sprite[]; stem: THREE.Sprite[]; dust: THREE.Sprite[];
}

export class VrView {
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(70, 1, 0.3, 3e6);
  private rig = new THREE.Group();
  private world = new THREE.Group();
  private stereo: StereoEffect | null = null;
  private el: HTMLElement | null = null;
  private B: Blast[] = [];
  private o!: WinOpts;
  private t = -5;
  private speed = 1;
  private last = 0;
  private shake = 0;
  private flashMat!: THREE.MeshBasicMaterial;
  private sky!: THREE.ShaderMaterial;
  private hud!: { tex: THREE.CanvasTexture; ctx: CanvasRenderingContext2D; mesh: THREE.Mesh; txt: string };
  private session: any = null;
  private onExit: (() => void) | null = null;
  private eyeH = 1.6;
  private lite = false;
  private mode: 'xr' | 'cardboard' = 'cardboard';
  private orient: { a: number; b: number; g: number } | null = null;
  private relYaw: number | null = null;
  private tex = { puff: puffTexture(), glow: glowTexture() };

  /** empieza la vista; `onExit` se llama al salir */
  async start(o: WinOpts & { t0?: number; eyeH?: number; lite?: boolean }, mode: 'xr' | 'cardboard', onExit: () => void) {
    this.o = o; this.mode = mode; this.onExit = onExit;
    this.eyeH = o.eyeH ?? 1.6; this.lite = !!o.lite;
    this.t = o.t0 !== undefined && o.t0 > -5 && o.t0 < 3000 ? o.t0 : -5;
    this.speed = 1;
    const el = h('div', { id: 'vrview' });
    this.renderer = new THREE.WebGLRenderer({ antialias: !this.lite, logarithmicDepthBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lite ? 1 : 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.append(this.renderer.domElement);
    const speedBtn = h('button', { type: 'button', class: 'vr-b' }, '×1');
    const cycle = () => { this.speed = this.speed === 1 ? 10 : this.speed === 10 ? 60 : 1; speedBtn.textContent = `×${this.speed}`; };
    speedBtn.addEventListener('click', cycle);
    el.append(h('div', { class: 'vr-bar' },
      h('button', { type: 'button', class: 'vr-b', title: 'Salir', onclick: () => this.stop() }, '✕'),
      h('button', { type: 'button', class: 'vr-b', title: 'Volver a empezar', onclick: () => this.restart() }, '↺'),
      speedBtn));
    document.body.append(el);
    this.el = el;
    this.build();
    window.addEventListener('resize', this.onResize);
    this.onResize();
    if (mode === 'xr') {
      this.renderer.xr.enabled = true;
      this.renderer.xr.setReferenceSpaceType('local-floor');
      try {
        const s = await (navigator as any).xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
        this.session = s;
        s.addEventListener('end', () => { this.session = null; this.stop(); });
        await this.renderer.xr.setSession(s);
        // gatillo: velocidad; botón lateral: volver a empezar
        for (let i = 0; i < 2; i++) {
          const c = this.renderer.xr.getController(i);
          c.addEventListener('select', cycle);
          c.addEventListener('squeeze', () => this.restart());
          this.scene.add(c);
        }
      } catch (e) {
        console.warn('XR', e);
        this.stop();
        return false;
      }
      // en las gafas, el norte no se sabe: la zona cero se pone delante
      this.world.rotation.y = this.main().az * RAD;
      this.rig.position.y = Math.max(0, this.eyeH - 1.6);
    } else {
      this.stereo = new StereoEffect(this.renderer);
      this.stereo.setEyeSeparation(0.064);
      this.rig.position.y = this.eyeH;
      if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', this.onOri as EventListener);
      window.addEventListener('deviceorientation', this.onOri as EventListener);
      try { await (screen.orientation as any)?.lock?.('landscape'); } catch { /* no siempre se puede */ }
      try { await el.requestFullscreen?.(); } catch { /* tampoco */ }
    }
    this.last = performance.now();
    this.renderer.setAnimationLoop(this.frame);
    return true;
  }

  stop() {
    if (!this.el) return;
    this.renderer.setAnimationLoop(null);
    this.session?.end?.().catch(() => undefined);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('deviceorientationabsolute', this.onOri as EventListener);
    window.removeEventListener('deviceorientation', this.onOri as EventListener);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    try { (screen.orientation as any)?.unlock?.(); } catch { /* nada */ }
    this.scene.traverse((o: any) => { o.geometry?.dispose?.(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.Material) => m.dispose()); });
    this.tex.puff.dispose(); this.tex.glow.dispose();
    this.renderer.dispose();
    this.el.remove(); this.el = null;
    const cb = this.onExit; this.onExit = null; cb?.();
  }

  private restart() { this.t = -5; for (const b of this.B) b.boomed = false; }
  private main() { return this.B.reduce((a, b) => (b.d < a.d ? b : a)) as Blast & { az: number }; }

  private onResize = () => {
    const w = window.innerWidth, hh = window.innerHeight;
    this.camera.aspect = w / hh; this.camera.updateProjectionMatrix();
    if (this.stereo) this.stereo.setSize(w, hh); else this.renderer.setSize(w, hh);
  };

  private onOri = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
    if (e.alpha == null || e.beta == null || e.gamma == null) return;
    let a = e.alpha;
    const abs = e.type === 'deviceorientationabsolute' || typeof e.webkitCompassHeading === 'number' || e.absolute;
    if (typeof e.webkitCompassHeading === 'number') a = 360 - e.webkitCompassHeading;
    if (e.type === 'deviceorientation' && (this as any)._absSeen) return;
    if (e.type === 'deviceorientationabsolute') (this as any)._absSeen = true;
    this.orient = { a, b: e.beta, g: e.gamma };
    // sin brújula: la zona cero se coloca donde miras al empezar
    if (!abs && this.relYaw === null) { this.relYaw = a * RAD; this.world.rotation.y = this.main().az * RAD + this.relYaw; }
  };

  // ------------------------------------------------------------------ escena
  private build() {
    const S = this.scene;
    S.add(this.rig); this.rig.add(this.camera); S.add(this.world);
    // cielo (con el destello) y suelo
    this.sky = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, depthTest: false, uniforms: { flash: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float flash; varying vec3 vP; void main(){ float e = normalize(vP).y; vec3 c = mix(vec3(0.70,0.79,0.86), vec3(0.20,0.38,0.60), smoothstep(0.0, 0.55, e)); gl_FragColor = vec4(mix(c, vec3(1.0, 0.98, 0.93), flash), 1.0); }',
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), this.sky);
    sky.renderOrder = -10; sky.frustumCulled = false;
    // pequeña y sin profundidad: se dibuja primero y todo lo demás encima, como si estuviera en el infinito
    this.rig.add(sky);
    this.renderer.setClearColor(0xa9c3d8);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(8e5, 96), new THREE.MeshBasicMaterial({ map: groundTexture() }));
    ground.rotation.x = -Math.PI / 2;
    S.add(ground);
    // velo blanco del destello delante de los ojos
    this.flashMat = new THREE.MeshBasicMaterial({ color: 0xfffcf0, transparent: true, opacity: 0, depthTest: false, depthWrite: false, side: THREE.BackSide });
    const veil = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 8), this.flashMat);
    veil.renderOrder = 999; this.camera.add(veil);
    // rótulo con el reloj y los avisos, a un metro delante y algo abajo
    const hc = document.createElement('canvas'); hc.width = 1024; hc.height = 192;
    const tex = new THREE.CanvasTexture(hc); tex.colorSpace = THREE.SRGBColorSpace;
    const hudMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.17), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
    hudMesh.position.set(0, -0.42, -1.1); hudMesh.rotation.x = -0.35; hudMesh.renderOrder = 1000;
    this.camera.add(hudMesh);
    this.hud = { tex, ctx: hc.getContext('2d')!, mesh: hudMesh, txt: '' };
    // explosiones
    const o = this.o;
    for (const s of o.sources) {
      const off = localOffset(s.lat, s.lon, o.obs.lat, o.obs.lon);
      const E = -off.e, N = -off.n, d = off.d;
      const root = new THREE.Group();
      root.position.set(E, -(d * d) / (2 * R_EFF), -N);
      this.world.add(root);
      const sprite = (tex: THREE.Texture, add = false) => {
        const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });
        const sp = new THREE.Sprite(m); sp.visible = false; root.add(sp); return sp;
      };
      const nCap = this.lite ? 18 : 40, nStem = this.lite ? 8 : 18, nDust = this.lite ? 6 : 12;
      const cap = Array.from({ length: nCap }, () => sprite(this.tex.puff));
      const stem = Array.from({ length: nStem }, () => sprite(this.tex.puff));
      const dust = Array.from({ length: s.plan.contact > 0 ? nDust : 0 }, () => sprite(this.tex.puff));
      const fire = sprite(this.tex.glow, true);
      fire.renderOrder = 5;
      // anillos de daño en el suelo (5 y 1 psi)
      for (const [id, col] of [['psi5', 0xff6a3d], ['psi1', 0xffc04a]] as const) {
        const r = s.fx.rings.find((x) => x.id === id)?.radiusM;
        if (!r || r < 50) continue;
        const pts = Array.from({ length: 129 }, (_, i) => new THREE.Vector3(Math.cos((i / 128) * Math.PI * 2) * r, 2, Math.sin((i / 128) * Math.PI * 2) * r));
        root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.8 })));
      }
      const psi = s.fx.pressurePsiAt(d);
      const R = s.fx.shock.r, T = s.fx.shock.t, rr = Math.hypot(d, s.plan.h), rm = R[R.length - 1];
      const tArr = s.delay + (rr > rm ? T[T.length - 1] + (rr - rm) / 343 : s.plan.shockTime(rr));
      this.B.push(Object.assign({ s, d, psi, tArr, boomed: false, root, fire, cap, stem, dust }, { az: (off.bearing + 180) % 360 }));
    }
  }

  // ------------------------------------------------------------------ animación
  private frame = () => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.t += dt * this.speed;
    // orientación del móvil (como DeviceOrientationControls, con el norte real si hay brújula)
    if (this.mode === 'cardboard' && this.orient) {
      const { a, b, g } = this.orient;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(b * RAD, a * RAD, -g * RAD, 'YXZ'));
      q.multiply(new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2));
      const ang = ((screen.orientation?.angle ?? (window as any).orientation ?? 0) as number) * RAD;
      q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -ang));
      this.camera.quaternion.slerp(q, 0.35);
    }
    let white = 0;
    for (const b of this.B) {
      white = Math.max(white, this.updBlast(b));
      if (!b.boomed && this.t >= b.tArr) {
        b.boomed = true;
        this.shake = Math.max(this.shake, Math.min(1, 0.25 + b.psi / 4));
        this.o.sound?.boom(Math.max(0.15, Math.min(1, b.psi / 5)));
        if (this.mode === 'cardboard' && navigator.vibrate) navigator.vibrate([100 + 250 * Math.min(1, b.psi / 5), 40, 100]);
      }
    }
    this.cullSide();
    this.flashMat.opacity = white;
    this.sky.uniforms.flash.value = Math.min(1, white * 1.2);
    // sacudida de la onda expansiva
    const base = this.mode === 'xr' ? Math.max(0, this.eyeH - 1.6) : this.eyeH;
    if (this.shake > 0) {
      const a = this.shake * 0.08;
      this.rig.position.set((Math.random() - 0.5) * a, base + (Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
      this.shake = Math.max(0, this.shake - dt * 0.7);
    } else this.rig.position.set(0, base, 0);
    this.updHud();
    if (this.stereo) this.stereo.render(this.scene, this.camera);
    else this.renderer.render(this.scene, this.camera);
  };

  /**
   * Un sprite enorme cuyo centro queda al lado o detrás de quien mira se proyecta mal (se estira
   * hasta el infinito y sale negro): se oculta.
   */
  private cullSide() {
    const cam = this.renderer.xr.isPresenting ? this.renderer.xr.getCamera() : this.camera;
    cam.updateMatrixWorld();
    const inv = cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    const v = new THREE.Vector3();
    for (const b of this.B) for (const sp of [b.fire, ...b.cap, ...b.stem, ...b.dust]) {
      if (!sp.visible) continue;
      sp.getWorldPosition(v).applyMatrix4(inv);
      if (v.z > -Math.max(sp.scale.x, sp.scale.y) * 0.75) sp.visible = false;
    }
  }

  /** coloca los sprites de una explosión en el instante actual; devuelve el blanco del destello */
  private updBlast(b: Blast): number {
    const pl = b.s.plan, ts = this.t - b.s.delay;
    const all = [b.fire, ...b.cap, ...b.stem, ...b.dust];
    if (ts <= 0) { for (const s of all) s.visible = false; return 0; }
    const heat = pl.heat(ts), fade = pl.cloudFade(ts);
    // bola de fuego
    b.fire.visible = heat > 0.02;
    if (b.fire.visible) {
      const r = pl.fireballRadius(ts) * 2.4, k = Math.min(1, heat);
      b.fire.position.set(0, Math.max(pl.h, pl.capZ(ts)), 0);
      b.fire.scale.set(r * 2, r * 2, 1);
      (b.fire.material as THREE.SpriteMaterial).color.setRGB(1, 0.55 + 0.45 * k, 0.25 + 0.7 * k);
      (b.fire.material as THREE.SpriteMaterial).opacity = Math.min(1, heat);
    }
    // sombrero
    const cz = pl.capZ(ts), rx = pl.capRadius(ts), grow = 1 - Math.exp(-ts / pl.tau);
    const ry = Math.max(rx * 0.3, ((pl.capTop - pl.capBottom) / 2) * grow);
    const dr = pl.drift(ts, 1);
    const glow = Math.max(0, Math.min(1, heat * 1.4));
    b.cap.forEach((sp, i) => {
      sp.visible = fade > 0.02 && ts > pl.tMax * 0.5;
      if (!sp.visible) return;
      const a = rnd(i * 3 + 1) * Math.PI * 2, rr = Math.sqrt(rnd(i * 3 + 2)), v = rnd(i * 3 + 3) * 2 - 1;
      sp.position.set(dr[0] + Math.cos(a) * rr * rx * 0.8, cz + v * ry * 0.7, -dr[1] + Math.sin(a) * rr * rx * 0.8);
      const sz = rx * (0.55 + 0.35 * rnd(i + 40));
      sp.scale.set(sz, sz * Math.min(1, (ry / rx) * 2.2), 1);
      const lit = 0.55 + 0.45 * (v * 0.5 + 0.5);
      (sp.material as THREE.SpriteMaterial).color.setRGB(Math.min(1, 0.6 * lit + 0.35 + glow * 0.3), Math.min(1, 0.56 * lit + 0.32 - glow * 0.1), Math.min(1, 0.52 * lit + 0.3 - glow * 0.3));
      (sp.material as THREE.SpriteMaterial).opacity = 0.9 * fade;
    });
    // tronco y polvo
    const sf = pl.stemFade(ts) * fade;
    const showStem = !pl.highAltitude && ts > pl.tMax && sf > 0.02;
    const top = Math.max(10, cz - ry * 0.5);
    b.stem.forEach((sp, i) => {
      sp.visible = showStem;
      if (!showStem) return;
      const u = i / Math.max(1, b.stem.length - 1), z = top * u;
      const dm = pl.drift(ts, Math.min(1, z / Math.max(1, pl.capTop)));
      const r = pl.stemR * (1.3 + (0.75 - 1.3) * u) * (0.8 + 0.4 * rnd(i + 90));
      sp.position.set(dm[0] + (rnd(i + 50) - 0.5) * r * 0.4, z, -dm[1]);
      sp.scale.set(r * 2.2, r * 2.2, 1);
      const c = 0.42 + 0.25 * u;
      (sp.material as THREE.SpriteMaterial).color.setRGB(c + 0.08, c + 0.03, c);
      (sp.material as THREE.SpriteMaterial).opacity = 0.75 * sf;
    });
    const kd = 1 - Math.exp(-ts / (pl.tau * 0.8));
    b.dust.forEach((sp, i) => {
      sp.visible = showStem;
      if (!showStem) return;
      const a = (i / b.dust.length) * Math.PI * 2, r = pl.dustR * 0.45 * kd;
      sp.position.set(Math.cos(a) * r, r * 0.12, Math.sin(a) * r);
      sp.scale.set(r * 0.9, r * 0.35, 1);
      (sp.material as THREE.SpriteMaterial).color.setRGB(0.6, 0.52, 0.44);
      (sp.material as THREE.SpriteMaterial).opacity = 0.7 * sf;
    });
    // destello: más intenso cuanto más cerca
    if (heat <= 0) return 0;
    const near = Math.min(1, 60000 / Math.max(2000, b.d));
    return Math.min(0.97, heat * 0.85 * near * Math.exp(-ts / (pl.tMax * 4 + 0.6)));
  }

  private updHud() {
    const t = this.t;
    const nxt = this.B.filter((b) => !b.boomed).sort((a, b) => a.tArr - b.tArr)[0];
    const clock = `T${t < 0 ? '−' : '+'}${String(Math.floor(Math.abs(t) / 60)).padStart(2, '0')}:${String(Math.floor(Math.abs(t)) % 60).padStart(2, '0')} · ×${this.speed}`;
    let msg = '';
    if (t < 0) msg = tr(`Detonación en ${Math.ceil(-t)} s`);
    else if (nxt) {
      const left = Math.ceil(nxt.tArr - t);
      msg = nxt.psi >= 0.5 ? `${tr('¡Aléjate de la ventana y túmbate!')} ${tr(`El estruendo llega en ${left} s`)}` : tr(`El estruendo llega en ${left} s`);
    } else {
      const mx = Math.max(...this.B.map((b) => b.psi));
      if (mx >= 0.5) msg = tr(`Ha llegado la onda expansiva: ${(mx < 10 ? mx.toFixed(1) : String(Math.round(mx))).replace('.', DEC)} psi`);
    }
    const txt = clock + '|' + msg;
    if (txt === this.hud.txt) return;
    this.hud.txt = txt;
    const g = this.hud.ctx;
    g.clearRect(0, 0, 1024, 192);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, 1024, 192);
    g.fillStyle = '#fff'; g.textAlign = 'center';
    g.font = '600 54px "IBM Plex Mono", monospace'; g.fillText(clock, 512, 72);
    g.fillStyle = nxt && nxt.psi >= 0.5 && t > 0 ? '#ff8a5c' : '#ffd28a';
    g.font = '500 40px "IBM Plex Sans", system-ui, sans-serif'; g.fillText(msg, 512, 150, 990);
    this.hud.tex.needsUpdate = true;
  }
}
