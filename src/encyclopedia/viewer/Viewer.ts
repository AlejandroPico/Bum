import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { ModelId, ModelParams } from '../types';
import { perf } from '../../perf';
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

interface PartState { base: THREE.Vector3; mats: THREE.MeshStandardMaterial[]; baseOpacity: number[]; hidden: boolean; alpha: number; center: THREE.Vector3; label?: HTMLElement; row?: HTMLElement }

/** capas del atlas, de fuera hacia dentro */
const LAYERS = [
  { id: 'shell', name: 'Envoltura' },
  { id: 'body', name: 'Estructura y componentes' },
  { id: 'inner', name: 'Interior' },
  { id: 'minor', name: 'Detalles' },
] as const;
type LayerId = typeof LAYERS[number]['id'];
const layerOf = (p: Part): LayerId => (p.shell ? 'shell' : p.inner ? 'inner' : p.minor ? 'minor' : 'body');

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
  private labels = false;
  private labelsEl!: HTMLElement;
  private layersEl!: HTMLElement;
  private explodeIn!: HTMLInputElement;
  private explodeBtn!: HTMLButtonElement;
  private tmpV = new THREE.Vector3();

  constructor(host: HTMLElement, id: ModelId, params?: ModelParams) {
    this.model = buildModel(id, params);
    const M = this.model;
    this.el = h('div', 'mv');
    host.append(this.el);
    this.buildUI();

    this.renderer = new THREE.WebGLRenderer({ antialias: !perf.lite, alpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(perf.lite ? 1 : 2, window.devicePixelRatio));
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
      const wb = new THREE.Box3().setFromObject(p.obj);
      const center = wb.isEmpty() ? new THREE.Vector3() : p.obj.worldToLocal(wb.getCenter(new THREE.Vector3()));
      this.state.set(p, { base: p.obj.position.clone(), mats, baseOpacity: mats.map((x) => x.opacity), hidden: false, alpha: 1, center });
    }
    this.buildAtlas();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.canvasWrap);
    this.resize();
    const cv = this.renderer.domElement;
    cv.addEventListener('pointermove', (e) => this.onMove(e));
    cv.addEventListener('pointerleave', () => { this.hover = null; this.tip.style.display = 'none'; });
    let down = { x: 0, y: 0 };
    cv.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    cv.addEventListener('pointerup', (e) => { if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) this.pick(e); });
    // sólo se anima mientras el visor está a la vista (y a 30 fotogramas por segundo en el modo ligero)
    this.io = new IntersectionObserver((es) => {
      const vis = es.some((e) => e.isIntersecting);
      this.renderer.setAnimationLoop(vis && !this.disposed ? () => this.frame() : null);
      this.last = performance.now();
    });
    this.io.observe(this.canvasWrap);
    this.renderer.setAnimationLoop(() => this.frame());
    this.applyModes();
  }
  private io: IntersectionObserver;

  // ---------------------------------------------------------------- interfaz
  private buildUI() {
    const M = this.model;
    const head = h('div', 'mv-head');
    head.append(h('div', 'mv-title', `${M.title}<small>${M.sub}${M.dims ? ' · ' + M.dims : ''}</small>`));
    const tools = h('div', 'mv-tools');
    const mk = (label: string, title: string, on: (b: HTMLButtonElement) => void) => { const b = h('button', '', label) as HTMLButtonElement; b.type = 'button'; b.title = title; b.onclick = () => on(b); tools.append(b); return b; };
    this.explodeBtn = mk('Desmontar', 'Separar las piezas', () => this.setExplode(this.explodeTarget > 0.5 ? 0 : 1));
    mk('Corte', 'Cortar por la mitad para ver el interior', (b) => { this.cut = !this.cut; b.classList.toggle('on', this.cut); this.applyModes(); });
    mk('Rayos X', 'Carcasa transparente', (b) => { this.xray = !this.xray; b.classList.toggle('on', this.xray); this.applyModes(); });
    mk('Capas', 'Atlas por capas: mostrar, ocultar y atenuar cada pieza', (b) => { const on = !this.layersEl.classList.contains('on'); this.layersEl.classList.toggle('on', on); b.classList.toggle('on', on); });
    mk('Etiquetas', 'Rotular las piezas', (b) => { this.labels = !this.labels; b.classList.toggle('on', this.labels); this.labelsEl.style.display = this.labels ? '' : 'none'; });
    mk('Encuadrar', 'Volver a la vista inicial', () => this.resetView());
    head.append(tools);

    this.canvasWrap = h('div', 'mv-stage');
    this.tip = h('div', 'mv-tip');
    this.flashEl = h('div', 'mv-flash');
    this.info = h('div', 'mv-info');
    this.labelsEl = h('div', 'mv-labels');
    this.labelsEl.style.display = 'none';
    this.layersEl = h('div', 'mv-layers');
    this.canvasWrap.append(this.flashEl, this.labelsEl, this.tip, this.info, this.layersEl);

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

  private setExplode(v: number) {
    this.explodeTarget = v;
    this.explodeBtn.classList.toggle('on', v > 0.05);
    if (this.explodeIn) this.explodeIn.value = String(v);
  }

  /** panel del atlas: capas con casillas, opacidad por pieza, pelar capa a capa y despiece gradual */
  private buildAtlas() {
    const L = this.layersEl;
    L.innerHTML = '';
    const top = h('div', 'mvl-top');
    const peel = h('button', '', 'Quitar capa') as HTMLButtonElement;
    const add = h('button', '', 'Poner capa') as HTMLButtonElement;
    const all = h('button', '', 'Todo') as HTMLButtonElement;
    peel.type = add.type = all.type = 'button';
    peel.title = 'Ocultar la capa visible más exterior';
    add.title = 'Volver a mostrar la última capa ocultada';
    peel.onclick = () => { const ly = LAYERS.find((l) => this.partsIn(l.id).some((p) => !this.state.get(p)!.hidden)); if (ly && ly.id !== 'inner') this.setLayer(ly.id, false); };
    add.onclick = () => { const ly = [...LAYERS].reverse().find((l) => this.partsIn(l.id).length && this.partsIn(l.id).every((p) => this.state.get(p)!.hidden)); if (ly) this.setLayer(ly.id, true); };
    all.onclick = () => { for (const p of this.model.parts) { const st = this.state.get(p)!; st.hidden = false; st.alpha = 1; } this.syncAtlas(); };
    top.append(peel, add, all);
    const ex = h('label', 'mvl-ex', '<span>Despiece</span>');
    this.explodeIn = h('input') as HTMLInputElement;
    Object.assign(this.explodeIn, { type: 'range', min: '0', max: '1.6', step: '0.01', value: '0' });
    this.explodeIn.oninput = () => this.setExplode(+this.explodeIn.value);
    ex.append(this.explodeIn);
    L.append(top, ex);
    for (const ly of LAYERS) {
      const parts = this.partsIn(ly.id);
      if (!parts.length) continue;
      const g = h('div', 'mvl-g');
      const gh = h('label', 'mvl-gh');
      const gc = h('input') as HTMLInputElement; gc.type = 'checkbox'; gc.checked = true; gc.dataset.layer = ly.id;
      gc.onchange = () => this.setLayer(ly.id, gc.checked);
      gh.append(gc, h('span', '', `${ly.name} <i>${parts.length}</i>`));
      g.append(gh);
      for (const p of parts) {
        const st = this.state.get(p)!;
        const row = h('div', 'mvl-r');
        const c = h('input') as HTMLInputElement; c.type = 'checkbox'; c.checked = true;
        c.onchange = () => { st.hidden = !c.checked; this.syncAtlas(); };
        const nm = h('button', '', p.name) as HTMLButtonElement; nm.type = 'button';
        nm.onclick = () => this.select(this.selected === p ? null : p);
        nm.onmouseenter = () => { this.hover = p; }; nm.onmouseleave = () => { this.hover = null; };
        nm.ondblclick = () => { for (const q of this.model.parts) this.state.get(q)!.hidden = q !== p; this.syncAtlas(); };
        const op = h('input') as HTMLInputElement;
        Object.assign(op, { type: 'range', min: '0.1', max: '1', step: '0.05', value: '1', title: 'Opacidad' });
        op.oninput = () => { st.alpha = +op.value; };
        row.append(c, nm, op);
        st.row = row;
        g.append(row);
      }
      L.append(g);
    }
    L.append(h('div', 'mvl-hint', 'Doble clic en un nombre para aislar la pieza. Al quitar la envoltura aparece el interior, como en un atlas de anatomía.'));
    // etiquetas
    for (const p of this.model.parts) {
      if (p.minor) continue;
      const lb = h('div', 'mv-lb', `<i></i><span>${p.name}</span>`);
      this.labelsEl.append(lb);
      this.state.get(p)!.label = lb;
    }
  }
  private partsIn(id: LayerId) { return this.model.parts.filter((p) => layerOf(p) === id); }
  private setLayer(id: LayerId, on: boolean) { for (const p of this.partsIn(id)) this.state.get(p)!.hidden = !on; this.syncAtlas(); }
  private syncAtlas() {
    for (const p of this.model.parts) {
      const st = this.state.get(p)!;
      const c = st.row?.querySelector('input[type=checkbox]') as HTMLInputElement | null;
      if (c) c.checked = !st.hidden;
      st.row?.classList.toggle('off', st.hidden);
    }
    this.layersEl.querySelectorAll<HTMLInputElement>('input[data-layer]').forEach((gc) => {
      const ps = this.partsIn(gc.dataset.layer as LayerId);
      const vis = ps.filter((p) => !this.state.get(p)!.hidden).length;
      gc.checked = vis > 0; gc.indeterminate = vis > 0 && vis < ps.length;
    });
  }
  /** la envoltura se ha retirado o atenuado: el interior debe verse */
  private shellOpen() { return this.model.parts.some((p) => p.shell && (this.state.get(p)!.hidden || this.state.get(p)!.alpha < 0.95)); }

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
    if (perf.lite && now - this.last < 30) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.explode += (this.explodeTarget - this.explode) * Math.min(1, dt * 4);
    const M = this.model;

    // estado base
    const shellOpen = this.shellOpen();
    const glows = new Map<Part, { v: number; c?: number }>();
    for (const p of M.parts) {
      const st = this.state.get(p)!;
      p.obj.position.copy(st.base).addScaledVector(p.explode, this.explode);
      p.obj.scale.setScalar(1);
      const hideInner = !!p.inner && !this.cut && !this.xray && this.explode < 0.05 && !shellOpen;
      p.obj.visible = !hideInner && !st.hidden;
      st.mats.forEach((m, i) => {
        if (this.xray && p.shell) return;
        const a = st.baseOpacity[i] * st.alpha;
        m.opacity = a;
        const tr = a < 0.999;
        if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
        m.depthWrite = !tr || st.alpha >= 0.999;
      });
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
    this.flashEl.style.opacity = String(this.flashV * (document.body.classList.contains('reduce-flash') ? 0.12 : 0.85));
    if (this.labels) this.placeLabels();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /** rótulos proyectados sobre la pantalla con una línea guía hacia el borde más cercano */
  private placeLabels() {
    const w = this.canvasWrap.clientWidth, hh = this.canvasWrap.clientHeight;
    this.scene.updateMatrixWorld();
    const used: number[][] = [[], []];
    const items: { lb: HTMLElement; x: number; y: number }[] = [];
    for (const p of this.model.parts) {
      const st = this.state.get(p)!;
      if (!st.label) continue;
      if (!p.obj.visible) { st.label.style.display = 'none'; continue; }
      const v = p.obj.localToWorld(this.tmpV.copy(st.center)).project(this.camera);
      if (v.z > 1) { st.label.style.display = 'none'; continue; }
      items.push({ lb: st.label, x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * hh });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      const side = this.layersEl.classList.contains('on') || it.x < w / 2 ? 0 : 1;
      let y = it.y;
      for (const u of used[side]) if (Math.abs(u - y) < 20) y = u + 20;
      used[side].push(y);
      const lb = it.lb;
      lb.style.display = '';
      lb.classList.toggle('r', side === 1);
      lb.style.top = `${y}px`;
      lb.style.left = side === 0 ? '14px' : '';
      lb.style.right = side === 1 ? '14px' : '';
      const bw = lb.offsetWidth;
      const ax = side === 0 ? 14 + bw : w - 14 - bw;
      const line = lb.firstElementChild as HTMLElement;
      const dx = side === 0 ? it.x - ax : ax - it.x;
      const len = Math.hypot(dx, it.y - y), ang = Math.atan2(it.y - y, dx) * 180 / Math.PI;
      line.style.width = `${dx > 4 ? len : 0}px`;
      line.style.transform = `rotate(${side === 0 ? ang : -ang}deg)`;
    }
  }

  destroy() {
    this.disposed = true;
    this.io?.disconnect();
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
