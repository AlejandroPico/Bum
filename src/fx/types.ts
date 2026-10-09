import type * as THREE from 'three';

export interface FrameCtx {
  /** tiempo de simulación (s) desde la detonación (negativo durante la entrada del asteroide) */
  t: number;
  /** tiempo real (s), para animaciones decorativas */
  real: number;
  camPos: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
  mvp: THREE.Matrix4;
  sunDir: THREE.Vector3;
  sunColor: THREE.Color;
  ambient: THREE.Color;
  fogColor: THREE.Color;
  night: number;
  /** metros por píxel aproximados en el centro de la vista */
  mpp: number;
  /**
   * cámara lejana: el relieve se dibuja con poco detalle y su profundidad no es fiable,
   * así que los efectos grandes se dibujan sin prueba de profundidad contra el mapa
   */
  farView: boolean;
  /** 0..1: intensidad del deslumbramiento (decae en tiempo real tras el destello) */
  glare: number;
  /** proyección de globo activa (las cúpulas siguen la curvatura) */
  globe: boolean;
}

export interface FxModule {
  object: THREE.Object3D;
  update(ctx: FrameCtx): void;
  dispose(): void;
}

/** coordenadas locales (este, norte, altura) → espacio three (x este, y arriba, z sur) */
export const L = (e: number, n: number, u: number): [number, number, number] => [e, u, -n];
