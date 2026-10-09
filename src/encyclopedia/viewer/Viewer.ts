import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { ModelId, ModelParams } from '../types';
import type { AnimCtx, BuiltModel, Part } from './kit';
import { littleBoy, fatMan, gadget, sausage } from './models-historic';
import { staged, bomb, rv, missile, cruise, torpedo, shell, conventional } from './models-generic';

export function buildModel(id: ModelId, p?: ModelParams): BuiltModel {
  switch (id) {
    case 'littleboy': return littleBoy();
    case 'fatman': return fatMan();
    case 'gadget': return gadget();
    case 'sausage': return sausage();
    case 'staged': return staged();
    case 'bomb': return bomb(p);
    case 'rv': return rv(p);
    case 'missile': return missile(p);
    case 'cruise': return cruise(p);
    case 'torpedo': return torpedo(p);
    case 'shell': return shell(p);
    case 'conventional': return conventional(p);
  }
}

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };

interface PartState { base: THREE.Vector3; mats: THREE.MeshStandardMaterial[]; baseOpacity: number[]; }

/**
 * Visor 3D interactivo de la enciclopedia: órbita, desmontaje, corte, rayos X, selección de
 * piezas con su explicación y una animación paso a paso de cómo funciona el arma.
 */
export class ModelViewer {
  el: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private model: BuiltModel;
  private holder = new THREE.Group();
  private state = new Map<Part, PartState>();
  private explode = 0;
  private explodeTarget = 0;
  private cut = false;
  private xray = false;
  private selected: Part | null = null;
  private hover: Part | null = null;
  private stepIdx = -1;
  private stepT = 0;
  private playing = false;
  private clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  private ray = new THREE.Raycaster();
  private ptr = new THREE.Vector2();
  private flashV = 0;
  private last = performance.now();
  private ro: ResizeObserver;
  private info!: HTMLElement;
  private capEl!: HTMLElement;
  private stepsEl!: HTMLElement;
  private listEl!: HTMLElement;
  private tip!: HTMLElement;
  private flashEl!: HTMLElement;
  private canvasWrap!: HTMLElement;
  private disposed = false;
  private fitR = 1;

  constructor(host: HTMLElement, id: ModelId, params?: ModelParams) {
    this.model = buildModel(id, params);
    const M = this.model;
    this.el = h('div', 'mv');
    host.append(this.el);
    this.buildUI();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.localClippingEnabled = true;
    this.canvasWrap.prepend(this.renderer.domElement);
    this.scene.background = new THREE.Color(0x0b0e14);
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 5, 4);
    this.scene.add(key, new THREE.HemisphereLight(0x9fb4cc, 0x1a1410, 0.6));

    // orientación y centrado
    if (M.horizontal) M.root.rotation.z = -Math.PI / 2;
    this.holder.add(M.root);
    this.scene.add(this.holder);
    M.root.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(M.root);
    const c = bb.getCenter(new THREE.Vector3());
    const focus = M.focus ? M.focus.center.clone().applyMatrix4(M.root.matrixWorld) : c;
    this.holder.position.sub(focus);
    const size = bb.getSize(new THREE.Vector3());
    this.fitR = M.focus?.radius ?? Math.max(size.x, size.y, size.z) * 0.62;

    // suelo con rejilla discreta
    const floorY = bb.min.y - focus.y - this.fitR * 0.02;
    const grid = new THREE.GridHelper(this.fitR * 12, 24, 0x2a313d, 0x161b24);
    grid.position.y = floorY;
    this.scene.add(grid);

    this.camera = new THREE.PerspectiveCamera(35, 1, this.fitR * 0.02, this.fitR * 400);
    this.camera.position.set(this.fitR * 1.6, this.fitR * 0.9, this.fitR * 2.6);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = this.fitR * 0.4;
    this.controls.maxDistance = this.fitR * 40;
    this.controls.target.set(0, 0, 0);

    // materiales propios por pieza (para resaltar y atenuar sin afectar a otras)
    for (const p of M.parts) {
      const mats: THREE.MeshStandardMaterial[] = [];
      p.obj.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const mm = (m.material as THREE.MeshStandardMaterial).clone();
        mm.clippingPlanes = [];
        m.material = mm;
        mats.push(mm);
        m.userData.part = p;
      });
      this.state.set(p, { base: p.obj.position.clone(), mats, baseOpacity: mats.map((x) => x.opacity) });
    }

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.canvasWrap);
    this.resize();
    const cv = this.renderer.domElement;
    cv.addEventListener('pointermove', (e) => this.onMove(e));
    cv.addEventListener('pointerleave', () => { this.hover = null; this.tip.style.display = 'none'; });
    let down = { x: 0, y: 0 };
    cv.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    cv.addEventListener('pointerup', (e) => { if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) this.pick(e); });
    this.renderer.setAnimationLoop(() => this.frame());
    this.applyModes();
  }

  // ---------------------------------------------------------------- interfaz
  private buildUI() {
    const M = this.model;
    const head = h('div', 'mv-head');
    head.append(h('div', 'mv-title', `${M.title}<small>${M.sub}${M.dims ? ' · ' + M.dims : ''}</small>`));
    const tools = h('div', 'mv-tools');
    const mk = (label: string, title: string, on: (b: HTMLButtonElement) => void) => { const b = h('button', '', label) as HTMLButtonElement; b.type = 'button'; b.title = title; b.onclick = () => on(b); tools.append(b); return b; };
    mk('Desmontar', 'Separar las piezas', (b) => { this.explodeTarget = this.explodeTarget > 0.5 ? 0 : 1; b.classList.toggle('on', this.explodeTarget > 0.5); });
    mk('Corte', 'Cortar por la mitad para ver el interior', (b) => { this.cut = !this.cut; b.classList.toggle('on', this.cut); this.applyModes(); });
    mk('Rayos X', 'Carcasa transparente', (b) => { this.xray = !this.xray; b.classList.toggle('on', this.xray); this.applyModes(); });
    mk('Encuadrar', 'Volver a la vista inicial', () => this.resetView());
    head.append(tools);

    this.canvasWrap = h('div', 'mv-stage');
    this.tip = h('div', 'mv-tip');
    this.flashEl = h('div', 'mv-flash');
    this.info = h('div', 'mv-info');
    this.canvasWrap.append(this.flashEl, this.tip, this.info);

    // pasos de la animación
    const anim = h('div', 'mv-anim');
    const play = h('button', 'mv-play', '▶ Cómo funciona') as HTMLButtonElement;
    play.type = 'button';
    play.onclick = () => { if (this.playing) { this.playing = false; play.textContent = '▶ Continuar'; } else { if (this.stepIdx < 0 || this.stepIdx >= M.steps.length - 1 && this.stepT >= 1) this.goStep(0); this.playing = true; play.textContent = '❚❚ Pausa'; } };
    this.stepsEl = h('div', 'mv-steps');
    M.steps.forEach((s, i) => {
      const b = h('button', '', `<b>${i + 1}</b>${s.title}`) as HTMLButtonElement;
      b.type = 'button';
      b.onclick = () => { this.goStep(i); this.playing = true; play.textContent = '❚❚ Pausa'; };
      this.stepsEl.append(b);
    });
    this.capEl = h('div', 'mv-cap', 'Arrastra para girar, rueda para acercarte y pulsa una pieza para ver qué es. «Cómo funciona» reproduce la secuencia paso a paso.');
    anim.append(play, this.stepsEl);
    (this as unknown as { playBtn: HTMLButtonElement }).playBtn = play;

    this.listEl = h('div', 'mv-parts');
    for (const p of M.parts) {
      if (p.minor) continue;
      const b = h('button', '', p.name) as HTMLButtonElement;
      b.type = 'button';
      b.onclick = () => this.select(this.selected === p ? null : p);
      b.onmouseenter = () => { this.hover = p; };
      b.onmouseleave = () => { this.hover = null; };
      b.dataset.id = p.id;
      this.listEl.append(b);
    }
    const foot = h('div', 'mv-note', M.note ?? '');
    this.el.append(head, this.canvasWrap, anim, this.capEl, this.listEl, foot);
  }

  private goStep(i: number) {
    this.stepIdx = i;
    this.stepT = 0;
    const s = this.model.steps[i];
    this.capEl.innerHTML = `<b>${i + 1}. ${s.title}.</b> ${s.cap}`;
    this.stepsEl.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === i));
    if (s.cut !== undefined && s.cut !== this.cut) { this.cut = s.cut; this.syncToolButtons(); this.applyModes(); }
  }

  private syncToolButtons() {
    const bs = this.el.querySelectorAll('.mv-tools button');
    bs[1]?.classList.toggle('on', this.cut);
    bs[2]?.classList.toggle('on', this.xray);
  }

  private select(p: Part | null) {
    this.selected = p;
    this.listEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', !!p && (b as HTMLElement).dataset.id === p.id));
    if (!p) { this.info.style.display = 'none'; return; }
    this.info.innerHTML = `<b>${p.name}</b><p>${p.desc}</p>`;
    this.info.style.display = 'block';
  }

  private resetView() {
    this.camera.position.set(this.fitR * 1.6, this.fitR * 0.9, this.fitR * 2.6);
    this.controls.target.set(0, 0, 0);
  }

  private applyModes() {
    for (const p of this.model.parts) {
      const st = this.state.get(p)!;
      st.mats.forEach((m, i) => {
        m.clippingPlanes = this.cut && !p.minor ? [this.clip] : [];
        m.clipShadows = true;
        const ghost = this.xray && p.shell;
        m.transparent = ghost || st.baseOpacity[i] < 1;
        m.opacity = ghost ? 0.14 : st.baseOpacity[i];
        m.depthWrite = !ghost;
        m.needsUpdate = true;
      });
      // las piezas interiores sólo se ven si hay corte, rayos X o desmontaje
      p.obj.userData.innerHidden = !!p.inner;
    }
  }

  // ---------------------------------------------------------------- interacción
  private hit(e: PointerEvent): Part | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ptr, this.camera);
    const hits = this.ray.intersectObject(this.model.root, true);
    for (const x of hits) {
      const p = x.object.userData.part as Part | undefined;
      if (!p || !x.object.visible) continue;
      if (this.cut && !p.minor && x.point.z > 0.0001) continue; // parte recortada
      if (this.xray && p.shell) continue;
      return p;
    }
    return null;
  }
  private onMove(e: PointerEvent) {
    const p = this.hit(e);
    this.hover = p;
    if (p) {
      const r = this.canvasWrap.getBoundingClientRect();
      this.tip.textContent = p.name;
      this.tip.style.display = 'block';
      this.tip.style.left = `${e.clientX - r.left + 12}px`;
      this.tip.style.top = `${e.clientY - r.top + 12}px`;
      this.renderer.domElement.style.cursor = 'pointer';
    } else { this.tip.style.display = 'none'; this.renderer.domElement.style.cursor = 'grab'; }
  }
  private pick(e: PointerEvent) { this.select(this.hit(e)); }

  // ---------------------------------------------------------------- render
  private resize() {
    const w = this.canvasWrap.clientWidth, hh = this.canvasWrap.clientHeight;
    if (!w || !hh) return;
    this.renderer.setSize(w, hh, false);
    this.camera.aspect = w / hh;
    this.camera.updateProjectionMatrix();
  }

  private frame() {
    if (this.disposed) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.explode += (this.explodeTarget - this.explode) * Math.min(1, dt * 4);
    const M = this.model;

    // estado base
    const glows = new Map<Part, { v: number; c?: number }>();
    for (const p of M.parts) {
      const st = this.state.get(p)!;
      p.obj.position.copy(st.base).addScaledVector(p.explode, this.explode);
      p.obj.scale.setScalar(1);
      const hideInner = !!p.inner && !this.cut && !this.xray && this.explode < 0.05;
      p.obj.visible = !hideInner;
      st.mats.forEach((m, i) => { if (!(this.xray && p.shell)) m.opacity = st.baseOpacity[i]; });
    }
    for (const f of Object.values(M.fx)) f.visible = false;
    this.flashV = 0;

    // animación del paso
    if (this.stepIdx >= 0) {
      const s = M.steps[this.stepIdx];
      if (this.playing) {
        this.stepT += dt / s.dur;
        if (this.stepT >= 1) {
          if (this.stepIdx < M.steps.length - 1) { this.goStep(this.stepIdx + 1); }
          else { this.stepT = 1; this.playing = false; const pb = (this as unknown as { playBtn: HTMLButtonElement }).playBtn; pb.textContent = '↻ Repetir'; }
        }
      }
      const cur = M.steps[this.stepIdx];
      const byId = (id: string) => M.parts.find((q) => q.id === id);
      const ctx: AnimCtx = {
        offset: (id, x, y, z) => { const p = byId(id); if (p) p.obj.position.add(new THREE.Vector3(x, y, z)); },
        scale: (id, sc) => { const p = byId(id); if (!p) return; if (Array.isArray(sc)) p.obj.scale.set(sc[0], sc[1], sc[2]); else p.obj.scale.setScalar(sc); },
        glow: (id, v, c) => { const p = byId(id); if (p) glows.set(p, { v, c }); },
        hide: (id) => { const p = byId(id); if (p) p.obj.visible = false; },
        fade: (id, a) => { const p = byId(id); if (!p) return; const st = this.state.get(p)!; st.mats.forEach((m) => { m.transparent = true; m.opacity = a; }); },
        fx: (n) => M.fx[n],
        flash: (v) => { this.flashV = Math.max(this.flashV, v); },
      };
      cur.anim?.(Math.min(1, this.stepT), ctx);
      // escala correcta de los efectos respecto a su centro
    }

    // resaltado
    const focusIds = this.stepIdx >= 0 ? M.steps[this.stepIdx].focus ?? [] : [];
    for (const p of M.parts) {
      const st = this.state.get(p)!;
      const g = glows.get(p);
      const isSel = this.selected === p, isHov = this.hover === p, isFocus = focusIds.includes(p.id);
      const e = Math.max(g?.v ?? 0, isSel ? 0.35 : 0, isHov ? 0.2 : 0, isFocus ? 0.12 : 0);
      const col = g ? new THREE.Color(g.c ?? 0xffb020) : new THREE.Color(isSel || isHov ? 0xff7a2a : 0xffb020);
      for (const m of st.mats) { m.emissive.copy(col).multiplyScalar(e); }
    }
    this.flashEl.style.opacity = String(this.flashV * 0.85);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.ro.disconnect();
    this.controls.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.geometry?.dispose(); const mm = m.material as THREE.Material | THREE.Material[]; (Array.isArray(mm) ? mm : [mm]).forEach((x) => x.dispose()); }
    });
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.el.remove();
  }
}
