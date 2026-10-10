import * as THREE from 'three';
import { NOISE } from './glsl';
import type { FxPlan } from './plan';
import type { FrameCtx, FxModule } from './types';

/**
 * Polvo y humo del derrumbe: cuando la onda de choque arrasa los edificios levanta una capa baja
 * de polvo de escombros que cubre la zona destruida, sube unos cientos de metros, deriva con el
 * viento y tarda decenas de minutos en asentarse. Se dibuja como varias capas horizontales con
 * ruido (un pseudo-volumen barato).
 */
const VERT = /* glsl */ `
varying vec3 vW;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * w; }`;

const FRAG = /* glsl */ `
uniform float uR; uniform float uFront; uniform float uAlpha; uniform float uTime; uniform float uLayer;
uniform vec2 uDrift; uniform vec3 uSun; uniform vec3 uAmb; uniform vec3 uSunCol; uniform vec3 uOrigin;
varying vec3 vW;
${NOISE}
void main(){
  vec2 p = vW.xz - uOrigin.xz;
  float rFront = length(p);
  if (rFront > uFront) discard;              // aún no ha pasado la onda
  vec2 q = p - uDrift;
  float r = length(q) / uR;
  float n = fbm(vec3(q / (uR * 0.16), uLayer * 2.7 + uTime * 0.015)) * 0.5 + 0.5;
  float n2 = fbm(vec3(q / (uR * 0.05), uLayer * 5.1 - uTime * 0.03)) * 0.5 + 0.5;
  float dens = smoothstep(0.32, 0.78, n * 0.75 + n2 * 0.35) * (1.0 - smoothstep(0.7, 1.05, r));
  // más denso cerca de la zona cero, donde todo se ha derrumbado
  dens *= mix(1.0, 0.45, smoothstep(0.2, 1.0, r));
  // borde suave detrás del frente
  dens *= smoothstep(0.0, uR * 0.05, uFront - rFront);
  float a = dens * uAlpha;
  if (a < 0.004) discard;
  vec3 base = mix(vec3(0.42, 0.37, 0.31), vec3(0.62, 0.56, 0.48), n2);
  vec3 col = base * (uAmb * 1.1 + uSunCol * max(0.15, uSun.y) * 0.7);
  gl_FragColor = vec4(col * a, a);
}`;

export class Rubble implements FxModule {
  object = new THREE.Group();
  private plan: FxPlan;
  private mats: THREE.ShaderMaterial[] = [];
  private meshes: THREE.Mesh[] = [];
  private Rd: number;
  private Hmax: number;
  private tDone: number;

  constructor(plan: FxPlan, quality = 1) {
    this.plan = plan;
    this.Rd = Math.min(25000, plan.psi5R * 1.1);
    this.Hmax = Math.min(600, Math.max(60, this.Rd * 0.06));
    this.tDone = plan.shockTime(Math.hypot(this.Rd, plan.h));
    const N = quality <= 0.6 ? 4 : 7;
    const geo = new THREE.CircleGeometry(1, 96).rotateX(-Math.PI / 2);
    for (let i = 0; i < N; i++) {
      const m = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG,
        uniforms: {
          uR: { value: this.Rd }, uFront: { value: 0 }, uAlpha: { value: 0 }, uTime: { value: 0 }, uLayer: { value: i },
          uDrift: { value: new THREE.Vector2() }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uAmb: { value: new THREE.Color() }, uSunCol: { value: new THREE.Color() },
          uOrigin: { value: new THREE.Vector3() },
        },
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      });
      const mesh = new THREE.Mesh(geo, m);
      mesh.frustumCulled = false;
      mesh.renderOrder = 1;
      this.mats.push(m); this.meshes.push(mesh);
      this.object.add(mesh);
    }
    this.object.visible = false;
  }

  /** ¿merece la pena? (explosiones con zona de 5 psi apreciable sobre el suelo) */
  static wanted(plan: FxPlan) {
    return plan.psi5R > 300 && !plan.highAltitude && !plan.buried?.contained && plan.fx.scenario.kind !== 'release' && plan.fx.scenario.kind !== 'volcano';
  }

  update(ctx: FrameCtx) {
    const P = this.plan;
    const t = ctx.t;
    const front = Math.min(this.Rd * 1.05, P.shockGroundR(t));
    if (t <= 0 || front < P.fireballR * 0.5) { this.object.visible = false; return; }
    const age = Math.max(0, t - this.tDone);
    const fade = Math.exp(-age / 1500);
    if (fade < 0.02) { this.object.visible = false; return; }
    this.object.visible = true;
    const grow = 1 - Math.exp(-t / 45);
    const H = this.Hmax * (0.25 + 0.75 * grow);
    // el polvo deriva con el viento de las capas bajas
    const drift = new THREE.Vector2(P.wind[0], -P.wind[1]).multiplyScalar(Math.max(0, t - this.tDone * 0.5) * 0.6);
    const N = this.meshes.length;
    this.object.updateMatrixWorld();
    const origin = new THREE.Vector3().setFromMatrixPosition(this.object.matrixWorld);
    for (let i = 0; i < N; i++) {
      const mesh = this.meshes[i];
      const k = (i + 0.5) / N;
      mesh.position.set(0, H * k, 0);
      // las capas altas se extienden algo menos
      const s = this.Rd * (1.05 - 0.25 * k);
      mesh.scale.set(s, 1, s);
      mesh.updateMatrixWorld();
      const u = this.mats[i].uniforms;
      this.mats[i].depthTest = !ctx.farView;
      u.uR.value = s;
      u.uFront.value = front;
      u.uAlpha.value = 0.34 * fade * (1 - k * 0.55) * Math.min(1, t / 6);
      u.uTime.value = ctx.real;
      u.uDrift.value.copy(drift).multiplyScalar(0.6 + k * 0.6);
      u.uSun.value.copy(ctx.sunDir);
      u.uSunCol.value.copy(ctx.sunColor);
      u.uAmb.value.copy(ctx.ambient);
      u.uOrigin.value.copy(origin);
    }
  }

  dispose() {
    this.meshes[0]?.geometry.dispose();
    for (const m of this.mats) m.dispose();
  }
}
