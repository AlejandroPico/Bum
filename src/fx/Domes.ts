import * as THREE from 'three';
import type { FxPlan } from './plan';
import type { FrameCtx, FxModule } from './types';
import type { Ring } from '../physics/types';

const VERT = /* glsl */ `
uniform float uCurv;
varying vec3 vW; varying vec3 vN; varying float vH;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0);
  // sobre el globo, la base de la cúpula sigue la curvatura terrestre
  w.y -= uCurv * (w.x * w.x + w.z * w.z) / (2.0 * 6371000.0);
  vW = w.xyz; vN = normalize(position); vH = position.y; gl_Position = projectionMatrix * w; }`;

const FRAG = /* glsl */ `
uniform vec3 uCam; uniform vec3 uColor; uniform float uAlpha; uniform float uTime; uniform float uHl; uniform float uPulse;
varying vec3 vW; varying vec3 vN; varying float vH;
void main(){
  vec3 V = normalize(uCam - vW);
  float f = 1.0 - abs(dot(normalize(vN), V));
  float rim = pow(f, 4.5);
  float lat = vH; // 0 en el suelo, 1 en la cima
  float lines = smoothstep(0.96, 1.0, abs(sin(lat * 3.14159 * 7.0)));
  float scan = smoothstep(0.02, 0.0, abs(fract(uTime * 0.1) - lat)) * 0.6;
  float base = smoothstep(0.035, 0.0, lat) * 1.2;
  // pulso brillante cuando la onda expansiva atraviesa el radio
  float pulse = uPulse * (0.35 + 1.4 * rim);
  float a = (0.025 + rim * 0.6 + lines * 0.05 + scan + base) * uAlpha * (1.0 + uHl) + pulse;
  gl_FragColor = vec4(uColor * a, a);
}`;

export class Domes implements FxModule {
  object = new THREE.Group();
  private items: { ring: Ring; mesh: THREE.Mesh; mat: THREE.ShaderMaterial; revealT: number; revealReal: number; pulse: boolean }[] = [];
  private plan: FxPlan;
  hidden = new Set<string>();
  enabled = true;
  /** opacidad global elegida por el usuario */
  opacity = 1;
  highlight: string | null = null;

  constructor(plan: FxPlan) {
    this.plan = plan;
    const geo = new THREE.SphereGeometry(1, 128, 48, 0, Math.PI * 2, 0, Math.PI / 2);
    for (const ring of plan.fx.rings) {
      if (!ring.dome || ring.radiusM < 5) continue;
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG,
        uniforms: { uCam: { value: new THREE.Vector3() }, uColor: { value: new THREE.Color(ring.color) }, uAlpha: { value: 0 }, uTime: { value: 0 }, uHl: { value: 0 }, uPulse: { value: 0 }, uCurv: { value: 0 } },
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.setScalar(ring.radiusM);
      mesh.frustumCulled = false;
      mesh.renderOrder = 5;
      mesh.updateMatrixWorld();
      this.object.add(mesh);
      let revealT: number;
      if (ring.group === 'blast') revealT = plan.shockTime(Math.hypot(ring.radiusM, plan.h));
      else if (ring.group === 'fireball') revealT = plan.tMax * 25 + 6;
      else revealT = plan.tMax * 3;
      // nada tapa la bola de fuego: las cúpulas aparecen cuando termina su fase luminosa;
      // las que ya habría cruzado la onda aparecen sin pulso
      // las cúpulas no tapan la explosión: aparecen cuando la onda ya ha pasado
      // el radio de 1 psi (lo esencial de la animación ha terminado)
      const gate = Math.max(plan.fbDone, plan.shockTime(Math.hypot(plan.psi1R, plan.h)) * 1.1 + 2);
      const pulse = false;
      revealT = Math.max(revealT, gate);
      this.items.push({ ring, mesh, mat, revealT, revealReal: -1, pulse });
    }
  }

  update(ctx: FrameCtx) {
    for (const it of this.items) {
      const show = this.enabled && !this.hidden.has(it.ring.id);
      const k = Math.max(0, Math.min(1, (ctx.t - it.revealT) / Math.max(2, it.revealT * 0.5)));
      // durante la formación del hongo las cúpulas se atenúan para no tapar el espectáculo
      const P = this.plan;
      const calm = P.highAltitude ? 1 : 0.35 + 0.65 * Math.max(0, Math.min(1, (ctx.t - P.tau * 2.5) / (P.tau * 1.5)));
      const a = show ? this.opacity * k * calm * (it.ring.group === 'blast' ? 0.3 : it.ring.group === 'fireball' ? 0.4 : 0.18) : 0;
      if (k <= 0) it.revealReal = -1;
      else if (it.revealReal < 0) it.revealReal = ctx.t - it.revealT < it.revealT * 0.5 + 2 ? ctx.real : ctx.real - 100;
      const pulse = show && it.pulse && it.revealReal >= 0 ? Math.exp(-(ctx.real - it.revealReal) / 1.4) * (it.ring.group === 'blast' ? 0.5 : 0.25) : 0;
      it.mesh.visible = a > 0.002 || pulse > 0.01;
      it.mat.depthTest = !ctx.farView;
      const u = it.mat.uniforms;
      u.uPulse.value = pulse;
      u.uCurv.value = ctx.globe ? 1 : 0;
      u.uAlpha.value = a;
      u.uCam.value.copy(ctx.camPos);
      u.uTime.value = ctx.real + it.ring.radiusM * 0.0001;
      u.uHl.value = this.highlight === it.ring.id ? 1.4 : 0;
    }
  }

  dispose() {
    this.items.forEach((i) => i.mat.dispose());
    (this.items[0]?.mesh.geometry as THREE.BufferGeometry | undefined)?.dispose();
  }
}
