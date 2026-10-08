import * as THREE from 'three';
import { HEAT } from './glsl';
import type { FrameCtx } from './types';

/**
 * Sistema de partículas tipo "billboard" instanciado, con iluminación volumétrica
 * aproximada (normal esférica por partícula + normal de gran escala de la nube),
 * emisión por calor y ordenación por profundidad.
 */
export interface ParticleBuffers {
  count: number;
  pos: Float32Array; // 3
  size: Float32Array;
  rot: Float32Array;
  alpha: Float32Array;
  color: Float32Array; // 3
  emit: Float32Array;
  normal: Float32Array; // 3
  variant: Float32Array;
}

const VERT = /* glsl */ `
attribute vec3 iPos; attribute float iSize; attribute float iRot; attribute float iAlpha;
attribute vec3 iColor; attribute float iEmit; attribute vec3 iNormal; attribute float iVar;
uniform vec3 uRight; uniform vec3 uUp; uniform vec3 uCam;
varying vec2 vUv; varying vec2 vQ; varying float vAlpha; varying vec3 vColor; varying float vEmit;
varying vec3 vN; varying vec3 vToCam; varying float vDist;
void main(){
  float c = cos(iRot), s = sin(iRot);
  vec2 q = vec2(c*position.x - s*position.y, s*position.x + c*position.y);
  vec3 wp = iPos + (uRight*q.x + uUp*q.y) * iSize;
  gl_Position = projectionMatrix * vec4(wp, 1.0);
  float cell = floor(iVar + 0.5);
  vec2 cuv = vec2(mod(cell, 4.0), floor(cell / 4.0));
  vUv = (cuv + position.xy + 0.5) / 4.0;
  vQ = position.xy * 2.0;
  vAlpha = iAlpha; vColor = iColor; vEmit = iEmit;
  vN = iNormal;
  vToCam = normalize(uCam - iPos);
  vDist = length(uCam - iPos);
}`;

const FRAG = /* glsl */ `
uniform sampler2D uTex; uniform vec3 uSun; uniform vec3 uSunColor; uniform vec3 uAmbient;
uniform vec3 uRight; uniform vec3 uUp; uniform float uAdditive; uniform vec3 uGlowPos; uniform float uGlow;
uniform vec3 uFogColor; uniform float uFogDist;
varying vec2 vUv; varying vec2 vQ; varying float vAlpha; varying vec3 vColor; varying float vEmit;
varying vec3 vN; varying vec3 vToCam; varying float vDist;
${HEAT}
void main(){
  vec4 tx = texture2D(uTex, vUv);
  float a = tx.a * vAlpha;
  if (a < 0.003) discard;
  // normal esférica local (efecto de volumen)
  float r2 = clamp(dot(vQ, vQ), 0.0, 1.0);
  vec3 nLocal = normalize(uRight * vQ.x + uUp * vQ.y + vToCam * sqrt(1.0 - r2));
  vec3 nBig = length(vN) > 0.01 ? normalize(vN) : nLocal;
  vec3 n = normalize(mix(nLocal, nBig, 0.45));
  float ndl = dot(n, uSun);
  float diff = smoothstep(-0.35, 1.0, ndl);
  // dispersión hacia delante (borde iluminado a contraluz)
  float back = pow(max(0.0, dot(-vToCam, uSun)), 6.0) * (1.0 - tx.a) * 1.5;
  float ao = 0.55 + 0.45 * clamp(nBig.y * 0.5 + 0.6, 0.0, 1.0);
  vec3 lit = vColor * (uAmbient * ao + uSunColor * (diff * 0.9 + back));
  // iluminación por la bola de fuego (luz interna)
  lit += vColor * uGlow * vec3(1.0, 0.45, 0.15) * (0.5 + 0.5 * clamp(-dot(n, normalize(vN + vec3(0.0001))), 0.0, 1.0));
  vec3 em = heatColor(vEmit) * vEmit * (1.6 - 0.6 * tx.a);
  vec3 col = lit + em;
  float fog = 1.0 - exp(-vDist / uFogDist);
  col = mix(col, uFogColor, fog * 0.6);
  if (uAdditive > 0.5) {
    gl_FragColor = vec4(col * a, a);
  } else {
    gl_FragColor = vec4(col, a);
  }
}`;

export class ParticleSystem {
  mesh: THREE.Mesh;
  buf: ParticleBuffers;
  private geo: THREE.InstancedBufferGeometry;
  private attrs: Record<string, THREE.InstancedBufferAttribute> = {};
  private order: Uint32Array;
  private depth: Float32Array;
  private sorted: Record<string, Float32Array> = {};
  material: THREE.ShaderMaterial;
  sort: boolean;
  live = 0;

  constructor(capacity: number, tex: THREE.Texture, opts: { additive?: boolean; sort?: boolean } = {}) {
    this.sort = opts.sort ?? !opts.additive;
    const plane = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = plane.index;
    geo.setAttribute('position', plane.getAttribute('position'));
    geo.instanceCount = 0;
    this.geo = geo;
    this.buf = {
      count: capacity,
      pos: new Float32Array(capacity * 3),
      size: new Float32Array(capacity),
      rot: new Float32Array(capacity),
      alpha: new Float32Array(capacity),
      color: new Float32Array(capacity * 3),
      emit: new Float32Array(capacity),
      normal: new Float32Array(capacity * 3),
      variant: new Float32Array(capacity),
    };
    const defs: [string, keyof ParticleBuffers, number][] = [
      ['iPos', 'pos', 3], ['iSize', 'size', 1], ['iRot', 'rot', 1], ['iAlpha', 'alpha', 1],
      ['iColor', 'color', 3], ['iEmit', 'emit', 1], ['iNormal', 'normal', 3], ['iVar', 'variant', 1],
    ];
    for (const [name, key, n] of defs) {
      const arr = new Float32Array(capacity * n);
      this.sorted[name] = arr;
      const at = new THREE.InstancedBufferAttribute(arr, n);
      at.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(name, at);
      this.attrs[name] = at;
      (this.attrs[name] as any)._key = key;
    }
    this.order = new Uint32Array(capacity);
    this.depth = new Float32Array(capacity);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTex: { value: tex },
        uRight: { value: new THREE.Vector3(1, 0, 0) },
        uUp: { value: new THREE.Vector3(0, 1, 0) },
        uCam: { value: new THREE.Vector3() },
        uSun: { value: new THREE.Vector3(0.3, 0.8, 0.2).normalize() },
        uSunColor: { value: new THREE.Color(1, 0.96, 0.9) },
        uAmbient: { value: new THREE.Color(0.35, 0.38, 0.45) },
        uAdditive: { value: opts.additive ? 1 : 0 },
        uGlowPos: { value: new THREE.Vector3() },
        uGlow: { value: 0 },
        uFogColor: { value: new THREE.Color(0.7, 0.75, 0.8) },
        uFogDist: { value: 400000 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: opts.additive ? THREE.CustomBlending : THREE.NormalBlending,
      ...(opts.additive ? { blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation } : {}),
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
  }

  /** Sube los buffers (ordenados de lejos a cerca) a la GPU. `n` partículas vivas. */
  commit(n: number, ctx: FrameCtx) {
    const b = this.buf;
    const u = this.material.uniforms;
    u.uRight.value.copy(ctx.right);
    u.uUp.value.copy(ctx.up);
    u.uCam.value.copy(ctx.camPos);
    n = Math.min(n, b.count);
    this.live = n;
    const m = ctx.mvp.elements;
    for (let i = 0; i < n; i++) {
      this.order[i] = i;
      const x = b.pos[i * 3], y = b.pos[i * 3 + 1], z = b.pos[i * 3 + 2];
      this.depth[i] = m[3] * x + m[7] * y + m[11] * z + m[15];
    }
    const ord = this.order.subarray(0, n);
    if (this.sort) {
      const dep = this.depth;
      ord.sort((a, c) => dep[c] - dep[a]);
    }
    const S = this.sorted;
    for (let k = 0; k < n; k++) {
      const i = ord[k];
      S.iPos[k * 3] = b.pos[i * 3]; S.iPos[k * 3 + 1] = b.pos[i * 3 + 1]; S.iPos[k * 3 + 2] = b.pos[i * 3 + 2];
      S.iColor[k * 3] = b.color[i * 3]; S.iColor[k * 3 + 1] = b.color[i * 3 + 1]; S.iColor[k * 3 + 2] = b.color[i * 3 + 2];
      S.iNormal[k * 3] = b.normal[i * 3]; S.iNormal[k * 3 + 1] = b.normal[i * 3 + 1]; S.iNormal[k * 3 + 2] = b.normal[i * 3 + 2];
      S.iSize[k] = b.size[i]; S.iRot[k] = b.rot[i]; S.iAlpha[k] = b.alpha[i]; S.iEmit[k] = b.emit[i]; S.iVar[k] = b.variant[i];
    }
    for (const name in this.attrs) {
      const at = this.attrs[name];
      at.clearUpdateRanges();
      at.addUpdateRange(0, n * at.itemSize);
      at.needsUpdate = true;
    }
    this.geo.instanceCount = n;
  }

  dispose() {
    this.geo.dispose();
    this.material.dispose();
  }
}
