import * as THREE from 'three';
import { NOISE } from './glsl';
import type { FxPlan } from './plan';
import type { FrameCtx, FxModule } from './types';

const SHELL_VERT = /* glsl */ `
varying vec3 vW; varying vec3 vN;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(position); gl_Position = projectionMatrix * w; }`;

const SHOCK_FRAG = /* glsl */ `
uniform vec3 uCam; uniform float uStrength; uniform float uTime; uniform vec3 uColor;
varying vec3 vW; varying vec3 vN;
${NOISE}
void main(){
  if (vW.y < -20.0) discard;
  vec3 V = normalize(uCam - vW);
  float f = 1.0 - abs(dot(normalize(vN), V));
  float rim = pow(f, 4.0);
  float rip = 0.5 + 0.5 * snoise(vN * 18.0 + uTime * 0.5);
  // el frente es casi invisible: sólo un borde tenue que refracta la luz
  float a = (rim * 0.32 + 0.025 * rip) * uStrength;
  gl_FragColor = vec4(uColor * a, a);
}`;

const WILSON_FRAG = /* glsl */ `
uniform vec3 uCam; uniform float uAlpha; uniform vec3 uSun; uniform vec3 uAmb;
varying vec3 vW; varying vec3 vN;
${NOISE}
void main(){
  if (vW.y < -20.0) discard;
  vec3 V = normalize(uCam - vW);
  vec3 N = normalize(vN);
  float f = 1.0 - abs(dot(N, V));
  float n = fbm(N * 6.0) * 0.5 + 0.5;
  float band = smoothstep(0.2, 0.75, n) * (0.35 + 0.65 * pow(f, 1.5));
  float a = band * uAlpha;
  vec3 c = vec3(0.95) * (uAmb + vec3(max(0.0, dot(N, uSun))) * 0.8);
  gl_FragColor = vec4(c, a);
}`;

const DUST_VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vW;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * w; }`;
const DUST_FRAG = /* glsl */ `
uniform float uAlpha; uniform float uTime; uniform vec3 uColor;
varying vec2 vUv; varying vec3 vW;
${NOISE}
void main(){
  float n = fbm(vec3(vUv.x * 60.0, vUv.y * 3.0 - uTime * 0.3, uTime * 0.05));
  float h = 1.0 - vUv.y;
  float a = smoothstep(-0.2, 0.6, n) * pow(h, 1.4) * smoothstep(0.0, 0.08, vUv.y + 0.02) * uAlpha;
  gl_FragColor = vec4(uColor * (0.6 + 0.4 * n), a);
}`;

export class Shock implements FxModule {
  object = new THREE.Group();
  private shell: THREE.Mesh;
  private shellMat: THREE.ShaderMaterial;
  private wilson: THREE.Mesh;
  private wMat: THREE.ShaderMaterial;
  private dust: THREE.Mesh;
  private dMat: THREE.ShaderMaterial;
  private plan: FxPlan;
  private tW0: number;
  private tW1: number;

  constructor(plan: FxPlan) {
    this.plan = plan;
    const sphere = new THREE.SphereGeometry(1, 96, 48);
    this.shellMat = new THREE.ShaderMaterial({
      vertexShader: SHELL_VERT, fragmentShader: SHOCK_FRAG,
      uniforms: { uCam: { value: new THREE.Vector3() }, uStrength: { value: 1 }, uTime: { value: 0 }, uColor: { value: new THREE.Color(0.85, 0.92, 1.0) } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    });
    this.shell = new THREE.Mesh(sphere, this.shellMat);
    this.shell.frustumCulled = false;
    this.wMat = new THREE.ShaderMaterial({
      vertexShader: SHELL_VERT, fragmentShader: WILSON_FRAG,
      uniforms: { uCam: { value: new THREE.Vector3() }, uAlpha: { value: 0 }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uAmb: { value: new THREE.Color(0.4, 0.4, 0.45) } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this.wilson = new THREE.Mesh(sphere, this.wMat);
    this.wilson.frustumCulled = false;
    this.dMat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT, fragmentShader: DUST_FRAG,
      uniforms: { uAlpha: { value: 0 }, uTime: { value: 0 }, uColor: { value: new THREE.Color(0.62, 0.53, 0.43) } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this.dust = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.04, 1, 160, 1, true), this.dMat);
    this.dust.frustumCulled = false;
    this.object.add(this.dust, this.wilson, this.shell);
    const fx = plan.fx;
    const r20 = fx.rings.find((r) => r.id === 'psi20')?.radiusM ?? plan.fireballR * 2;
    const r2 = (fx.rings.find((r) => r.id === 'psi5')?.radiusM ?? r20 * 2) * 1.4;
    this.tW0 = plan.shockTime(Math.hypot(r20, plan.h));
    this.tW1 = plan.shockTime(Math.hypot(r2, plan.h));
  }

  update(ctx: FrameCtx) {
    const P = this.plan;
    const t = ctx.t;
    const R = P.shockR(t);
    const on = t > 0 && R > P.fireballR * 0.8 && R < Math.max(P.psi1R * 2.2, P.fireballR * 6) && !P.highAltitude && !P.buried?.contained;
    this.shell.visible = on && P.flashK > 0.05;
    this.dust.visible = false;
    this.wilson.visible = false;
    // oleada de base (explosiones submarinas o enterradas poco profundas)
    const surge = P.fx.rings.find((r) => r.id === 'surge');
    if (surge && t > 0) {
      const sr = Math.min(surge.radiusM, 60 * t + P.fireballR * 0.5);
      const fade = Math.max(0, 1 - Math.max(0, t - surge.radiusM / 60) / 420);
      if (fade > 0.01) {
        const Hs = Math.min(700, Math.max(60, surge.radiusM * 0.12)) * (0.5 + 0.5 * Math.min(1, t / 20));
        this.dust.visible = true;
        this.dMat.depthTest = !ctx.farView;
        this.dust.position.set(0, Hs / 2, 0);
        this.dust.scale.set(sr, Hs, sr);
        this.dust.updateMatrixWorld();
        const d = this.dMat.uniforms;
        d.uAlpha.value = 0.75 * fade;
        d.uTime.value = ctx.real;
        (d.uColor.value as THREE.Color).set(P.buried?.mode === 'underwater' ? 0xe8f2f8 : 0x9c8a74);
      }
      return;
    }
    if (!on) return;
    this.shellMat.depthTest = this.wMat.depthTest = this.dMat.depthTest = !ctx.farView;
    const psi = P.fx.pressurePsiAt(Math.sqrt(Math.max(0, R * R - P.h * P.h)));
    const strength = Math.min(0.8, 0.1 + psi / 10) * Math.pow(Math.max(0, 1 - R / (P.psi1R * 2.2 + 1)), 1.5);
    this.shell.position.set(0, P.h, 0);
    this.shell.scale.setScalar(R);
    this.shell.updateMatrixWorld();
    const u = this.shellMat.uniforms;
    u.uCam.value.copy(ctx.camPos);
    u.uStrength.value = strength;
    u.uTime.value = ctx.real;

    // nube de Wilson (condensación tras el frente en aire húmedo)
    const hum = Math.max(0, (P.env.humidity - 35) / 65);
    if (hum > 0 && t > this.tW0 && t < this.tW1 * 1.6) {
      const k = (t - this.tW0) / Math.max(0.01, this.tW1 * 1.6 - this.tW0);
      const a = Math.sin(Math.PI * Math.min(1, k)) * 0.75 * hum;
      this.wilson.visible = a > 0.01;
      this.wilson.position.set(0, P.h, 0);
      this.wilson.scale.setScalar(R * 0.93);
      this.wilson.updateMatrixWorld();
      const w = this.wMat.uniforms;
      w.uAlpha.value = a;
      w.uCam.value.copy(ctx.camPos);
      w.uSun.value.copy(ctx.sunDir);
      w.uAmb.value.copy(ctx.ambient);
    }

    // muro de polvo en el suelo
    const g = P.shockGroundR(t);
    if (g > P.fireballR * 0.3) {
      const gpsi = P.fx.pressurePsiAt(g);
      const Hd = Math.min(Math.max(g * 0.05, 20), 3000) * Math.min(1, 0.3 + gpsi / 6);
      this.dust.visible = gpsi > 0.6;
      this.dust.position.set(0, Hd / 2, 0);
      this.dust.scale.set(g, Hd, g);
      this.dust.updateMatrixWorld();
      const d = this.dMat.uniforms;
      d.uAlpha.value = Math.min(0.9, gpsi / 4) * 0.85;
      d.uTime.value = ctx.real;
    }
  }

  dispose() {
    this.shell.geometry.dispose();
    this.shellMat.dispose(); this.wMat.dispose();
    this.dust.geometry.dispose(); this.dMat.dispose();
  }
}
