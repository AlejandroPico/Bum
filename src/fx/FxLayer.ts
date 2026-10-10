import * as THREE from 'three';
import maplibregl, { type CustomLayerInterface, type Map as MLMap, type CustomRenderMethodInput } from 'maplibre-gl';
import type { FrameCtx, FxModule } from './types';
import { PostFX } from './PostFX';

/**
 * Capa personalizada de MapLibre que dibuja la escena three.js compartiendo el
 * contexto WebGL (y el búfer de profundidad) con el mapa, de modo que los efectos
 * quedan correctamente ocultos tras el relieve y los edificios 3D.
 */
export class FxLayer implements CustomLayerInterface {
  id = 'fx3d';
  type = 'custom' as const;
  renderingMode = '3d' as const;
  map!: MLMap;
  renderer!: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.Camera();
  modules: FxModule[] = [];
  origin = { lng: 0, lat: 0, alt: 0 };
  private model = new THREE.Matrix4();
  private mvp = new THREE.Matrix4();
  private inv = new THREE.Matrix4();
  ctx: FrameCtx = {
    t: 0, real: 0,
    camPos: new THREE.Vector3(), right: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0), mvp: this.mvp,
    sunDir: new THREE.Vector3(0.3, 0.8, 0.2).normalize(), sunColor: new THREE.Color(1, 0.96, 0.9), ambient: new THREE.Color(0.35, 0.38, 0.45),
    fogColor: new THREE.Color(0.75, 0.8, 0.86), night: 0, mpp: 10, farView: false, glare: 1, globe: false,
  };
  /** llamado en cada fotograma antes de dibujar (avanza el reloj) */
  onFrame: ((ctx: FrameCtx) => void) | null = null;
  animating = false;
  /** tamaño (m) de los efectos en escena, para ampliar el plano lejano si hace falta */
  extentM = 0;
  globe = false;
  /** post-procesado (resplandor, destello, calor, refracción de la onda) */
  post = new PostFX();
  /** duración del último fotograma de la capa (ms), para la calidad automática */
  frameMs = 16;
  private lastT = 0;

  onAdd(map: MLMap, gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.map = map;
    this.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl as WebGL2RenderingContext, antialias: true });
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.camera.matrixAutoUpdate = false;
    this.patchFarPlane();
  }

  /**
   * MapLibre calcula el plano lejano para que llegue justo al suelo del borde superior de la
   * vista; una nube de decenas de km (o un impacto continental) puede quedar más allá y verse
   * cortada. Ampliamos el plano lejano lo justo para abarcar los efectos.
   */
  patchFarPlane() {
    const root = (this.map as any).transform;
    const tr = root?._calculateNearFarZIfNeeded ? root : root?._mercatorTransform;
    const orig = tr?._calculateNearFarZIfNeeded;
    if (typeof orig !== 'function' || orig.__bum) return;
    const self = this;
    tr._calculateNearFarZIfNeeded = function (this: any, camToSea: number, pitchRad: number, offset: unknown) {
      orig.call(this, camToSea, pitchRad, offset);
      const helper = this._helper;
      if (!self.modules.length || !self.extentM || !helper?.autoCalculateNearFarZ) return;
      const ppm = helper._pixelPerMeter;
      const c = this.center;
      const cos = Math.cos((self.origin.lat * Math.PI) / 180);
      const dE = (c.lng - self.origin.lng) * 111320 * cos, dN = (c.lat - self.origin.lat) * 110540;
      const need = (camToSea + (Math.hypot(dE, dN) + self.extentM) * ppm) * 1.05;
      if (need > helper._farZ) helper._farZ = need;
    };
    tr._calculateNearFarZIfNeeded.__bum = true;
  }

  setOrigin(lng: number, lat: number, alt: number) {
    this.origin = { lng, lat, alt };
    const mc = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], alt);
    const s = mc.meterInMercatorCoordinateUnits();
    this.model
      .makeTranslation(mc.x, mc.y, mc.z ?? 0)
      .scale(new THREE.Vector3(s, -s, s))
      .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
  }

  add(m: FxModule) {
    this.modules.push(m);
    this.scene.add(m.object);
  }

  clear() {
    for (const m of this.modules) {
      this.scene.remove(m.object);
      m.dispose();
    }
    this.modules = [];
  }

  private unproject(x: number, y: number, z: number, out: THREE.Vector3) {
    return out.set(x, y, z).applyMatrix4(this.inv);
  }

  render(_gl: WebGLRenderingContext | WebGL2RenderingContext, args: CustomRenderMethodInput) {
    if (!this.modules.length) return;
    const main = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix as unknown as number[]);
    // matriz del modelo de MapLibre: válida tanto en plano (mercator) como en globo
    const tr = (this.map as any).transform;
    if (typeof tr?.getMatrixForModel === 'function') {
      this.model.fromArray(tr.getMatrixForModel([this.origin.lng, this.origin.lat], this.origin.alt) as number[]);
    }
    this.mvp.copy(main).multiply(this.model);
    this.inv.copy(this.mvp).invert();
    this.camera.projectionMatrix.copy(this.mvp);
    this.camera.projectionMatrixInverse.copy(this.inv);

    const c = this.ctx;
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    this.unproject(-1, 0, 0.5, a); this.unproject(1, 0, 0.5, b);
    c.right.copy(b).sub(a).normalize();
    this.unproject(0, -1, 0.5, a); this.unproject(0, 1, 0.5, b);
    c.up.copy(b).sub(a).normalize();
    // posición de la cámara en el espacio del modelo: el punto que la proyección lleva a w = 0
    const eye = new THREE.Vector4(0, 0, 1, 0).applyMatrix4(this.inv);
    if (Math.abs(eye.w) > 1e-12) c.camPos.set(eye.x / eye.w, eye.y / eye.w, eye.z / eye.w);
    else this.unproject(0, 0, -1, c.camPos);
    c.mvp = this.mvp;
    this.globe = (this.map.getProjection?.()?.type ?? 'mercator') === 'globe';
    // en el globo se mantiene la prueba de profundidad para que el planeta oculte lo que queda detrás
    c.farView = !this.globe && (c.camPos.length() > 45000 || this.map.getZoom() < 10.5);
    c.globe = this.globe;

    this.onFrame?.(c);
    for (const m of this.modules) m.update(c);

    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
    this.post.render(this.renderer, _gl as WebGL2RenderingContext, this.mvp, c.real);
    const now = performance.now();
    const gap = now - this.lastT;
    if (this.lastT && gap < 400) this.frameMs = this.frameMs * 0.92 + gap * 0.08;
    this.lastT = now;
    if (this.animating) this.map.triggerRepaint();
  }

  onRemove() {
    this.clear();
    this.post.dispose();
  }
}
