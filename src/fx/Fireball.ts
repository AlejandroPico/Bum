import * as THREE from 'three';
import { NOISE, HEAT } from './glsl';
import type { FxPlan } from './plan';
import type { FrameCtx, FxModule } from './types';

const FB_VERT = /* glsl */ `
uniform float uTime; uniform float uHeat; uniform float uRough;
varying vec3 vP; varying vec3 vN; varying vec3 vW; varying float vD;
${NOISE}
void main(){
  vec3 n = normalize(position);
  float d = fbm(n * 2.2 + vec3(0.0, -uTime * 0.35, uTime * 0.12));
  float disp = d * uRough;
  vec3 p = position * (1.0 + disp);
  vP = n; vN = normalize(normalMatrix * n); vD = d;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * w;
}`;

const FB_FRAG = /* glsl */ `
uniform float uTime; uniform float uHeat; uniform float uAlpha; uniform vec3 uCam; uniform vec3 uCenter;
varying vec3 vP; varying vec3 vN; varying vec3 vW; varying float vD;
${NOISE}
${HEAT}
void main(){
  if (vW.y < -2.0) discard; // la parte bajo el suelo no se dibuja
  vec3 V = normalize(uCam - vW);
  vec3 N = normalize(vW - uCenter);
  float mu = clamp(dot(N, V), 0.0, 1.0);
  float n1 = fbm(vP * 3.5 + vec3(uTime * 0.25, -uTime * 0.6, 0.0));
  float n2 = ridged(vP * 7.0 - vec3(0.0, uTime * 0.9, uTime * 0.2));
  // turbulencia convectiva: zonas más frías (oscuras) y filamentos calientes
  float t = uHeat * (0.82 + 0.35 * n1 + 0.2 * (n2 - 0.5));
  // oscurecimiento de borde cuando se enfría; brillo de borde cuando está muy caliente
  float limb = mix(pow(mu, 0.6), 1.0, smoothstep(0.9, 1.15, uHeat));
  t *= mix(0.55, 1.0, limb);
  // la parte inferior se enfría antes (humo)
  t -= (1.0 - smoothstep(-0.6, 0.4, vP.y)) * 0.25 * (1.0 - uHeat);
  vec3 c = heatColor(t) * (1.0 + 2.2 * smoothstep(0.7, 1.2, t));
  float smoke = 1.0 - smoothstep(0.08, 0.3, t);
  c = mix(c, vec3(0.09, 0.075, 0.07) * (0.6 + 0.4 * mu), smoke);
  gl_FragColor = vec4(c, uAlpha);
}`;

const GLOW_VERT = /* glsl */ `
uniform vec3 uRight; uniform vec3 uUp; uniform vec3 uCenter; uniform float uSize;
varying vec2 vUv;
void main(){
  vUv = position.xy * 2.0;
  vec3 w = uCenter + (uRight * position.x + uUp * position.y) * uSize;
  gl_Position = projectionMatrix * vec4(w, 1.0);
}`;
const GLOW_FRAG = /* glsl */ `
uniform float uHeat; uniform float uIntensity;
varying vec2 vUv;
${HEAT}
void main(){
  float r = length(vUv);
  if (r > 1.0) discard;
  float core = exp(-r * r * 9.0);
  float halo = exp(-r * 4.5) * (1.0 - r);
  vec3 c = heatColor(uHeat * (0.8 + 0.4 * core));
  vec3 col = c * (core * 1.6 + halo * 0.9) * uIntensity;
  gl_FragColor = vec4(col, 1.0);
}`;

const GROUND_FRAG = /* glsl */ `
uniform float uHeat; uniform float uIntensity; uniform float uR;
varying vec2 vUv;
${HEAT}
void main(){
  float r = length(vUv);
  if (r > 1.0) discard;
  float d = r * 12.0; // en unidades de radio de bola de fuego
  float I = 1.0 / (1.0 + d * d * 0.35) * (1.0 - r);
  vec3 c = heatColor(min(1.0, uHeat)) * I * uIntensity;
  gl_FragColor = vec4(c, 1.0);
}`;
const GROUND_VERT = /* glsl */ `
uniform float uR;
varying vec2 vUv;
void main(){ vUv = position.xy * 2.0; gl_Position = projectionMatrix * modelMatrix * vec4(position.x * uR, 0.0, -position.y * uR, 1.0); }`;

const add = { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation } as const;

export class Fireball implements FxModule {
  object = new THREE.Group();
  private sphere: THREE.Mesh;
  private sMat: THREE.ShaderMaterial;
  private glow: THREE.Mesh;
  private gMat: THREE.ShaderMaterial;
  private ground: THREE.Mesh;
  private grMat: THREE.ShaderMaterial;
  private plan: FxPlan;

  constructor(plan: FxPlan) {
    this.plan = plan;
    this.sMat = new THREE.ShaderMaterial({
      vertexShader: FB_VERT, fragmentShader: FB_FRAG,
      uniforms: { uTime: { value: 0 }, uHeat: { value: 1 }, uAlpha: { value: 1 }, uRough: { value: 0.06 }, uCam: { value: new THREE.Vector3() }, uCenter: { value: new THREE.Vector3() } },
      transparent: true,
    });
    this.sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 6), this.sMat);
    this.sphere.frustumCulled = false;
    this.gMat = new THREE.ShaderMaterial({
      vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG,
      uniforms: { uRight: { value: new THREE.Vector3() }, uUp: { value: new THREE.Vector3() }, uCenter: { value: new THREE.Vector3() }, uSize: { value: 1 }, uHeat: { value: 1 }, uIntensity: { value: 1 } },
      transparent: true, depthWrite: false, depthTest: true, ...add,
    });
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.gMat);
    this.glow.frustumCulled = false;
    this.glow.renderOrder = 10;
    this.grMat = new THREE.ShaderMaterial({
      vertexShader: GROUND_VERT, fragmentShader: GROUND_FRAG,
      uniforms: { uHeat: { value: 1 }, uIntensity: { value: 1 }, uR: { value: 1 } },
      transparent: true, depthWrite: false, depthTest: false, ...add,
    });
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.grMat);
    this.ground.frustumCulled = false;
    this.ground.renderOrder = 1;
    this.object.add(this.ground, this.sphere, this.glow);
  }

  update(ctx: FrameCtx) {
    const P = this.plan;
    const t = ctx.t;
    const heat = P.heat(t);
    const R = P.fireballRadius(t);
    const visible = t > 0 && heat > 0.02;
    this.sphere.visible = visible;
    this.glow.visible = visible;
    this.ground.visible = visible && !P.highAltitude;
    if (!visible) return;
    this.sMat.depthTest = this.gMat.depthTest = !ctx.farView;
    // la bola de fuego asciende y se convierte en el sombrero del hongo
    const zc = P.highAltitude ? P.h : Math.max(P.capZ(t), P.h + (P.contact > 0 ? R * (1 - P.contact) * 0.3 : 0));
    const cy = P.contact > 0 && t < P.tMax * 3 ? Math.max(P.h, R * 0.2) : zc;
    this.sphere.position.set(0, cy, 0);
    // se achata y ensancha al subir (inicio del toroide)
    const flat = Math.min(1, t / (P.tau * 0.5 + 1));
    this.sphere.scale.set(R * (1 + 0.15 * flat), R * (1 - 0.3 * flat), R * (1 + 0.15 * flat));
    this.sphere.updateMatrixWorld();
    const u = this.sMat.uniforms;
    u.uTime.value = ctx.real * 0.6 + t * 0.05;
    u.uHeat.value = heat;
    u.uRough.value = 0.05 + 0.12 * Math.min(1, t / (P.tMax * 6));
    // se funde con la nube volumétrica, que hereda su brillo
    const swallow = Math.max(0, Math.min(1, (t - P.tMax * 3) / (P.tMax * 7 + 2)));
    u.uAlpha.value = Math.min(1, heat / 0.12) * (1 - swallow * swallow * (3 - 2 * swallow));
    this.sMat.depthWrite = u.uAlpha.value > 0.98;
    u.uCam.value.copy(ctx.camPos);
    u.uCenter.value.set(0, cy, 0);

    const g = this.gMat.uniforms;
    g.uRight.value.copy(ctx.right);
    g.uUp.value.copy(ctx.up);
    g.uCenter.value.set(0, cy, 0);
    // el halo no debe cubrir media pantalla en explosiones gigantes
    g.uSize.value = R * (P.isImpact || P.fireballR > 20000 ? 1.8 : 3.2 + 4 * Math.max(0, heat - 1));
    g.uHeat.value = heat;
    g.uIntensity.value = Math.min(1.6, heat * heat) * (0.7 + ctx.night * 0.5) * (0.35 + 0.65 * ctx.glare);

    this.ground.position.set(0, 2, 0);
    this.ground.updateMatrixWorld();
    const gr = this.grMat.uniforms;
    gr.uR.value = Math.min(P.fireballR * 24, Math.max(P.psi5R * 1.5, P.fireballR * 5));
    gr.uHeat.value = heat;
    gr.uIntensity.value = Math.min(1.4, heat * heat) * (0.25 + ctx.night * 0.75) * (0.3 + 0.7 * ctx.glare);
  }

  dispose() {
    this.sphere.geometry.dispose(); this.sMat.dispose();
    this.glow.geometry.dispose(); this.gMat.dispose();
    this.ground.geometry.dispose(); this.grMat.dispose();
  }
}
