import * as THREE from 'three';
import maplibregl, { type CustomLayerInterface, type Map as MLMap, type CustomRenderMethodInput } from 'maplibre-gl';
import type { FrameCtx, FxModule } from './types';

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
    fogColor: new THREE.Color(0.75, 0.8, 0.86), night: 0, mpp: 10,
  };
  /** llamado en cada fotograma antes de dibujar (avanza el reloj) */
  onFrame: ((ctx: FrameCtx) => void) | null = null;
  animating = false;

  onAdd(map: MLMap, gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.map = map;
    this.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl as WebGL2RenderingContext, antialias: true });
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.camera.matrixAutoUpdate = false;
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
    // posición real de la cámara
    const tr = (this.map as any).transform;
    try {
      const cl = tr.getCameraLngLat();
      const calt = tr.getCameraAltitude();
      const cos = Math.cos((this.origin.lat * Math.PI) / 180);
      const e = (cl.lng - this.origin.lng) * 111320 * cos;
      const n = (cl.lat - this.origin.lat) * 110540;
      c.camPos.set(e, calt - this.origin.alt, -n);
    } catch {
      this.unproject(0, 0, -1, c.camPos);
    }
    c.mvp = this.mvp;

    this.onFrame?.(c);
    for (const m of this.modules) m.update(c);

    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
    if (this.animating) this.map.triggerRepaint();
  }

  onRemove() {
    this.clear();
  }
}
