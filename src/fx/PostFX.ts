import * as THREE from 'three';

/**
 * Post-procesado sobre la imagen final del mapa: copia el búfer de color a una textura con
 * mipmaps y lo vuelve a dibujar con
 *  - resplandor (bloom) a partir de los niveles de mipmap (luz que «desborda» los objetos muy brillantes),
 *  - destello de lente (reflejos fantasma y una raya anamórfica) mientras la bola de fuego brilla,
 *  - distorsión por calor sobre la bola de fuego y el aire caliente que asciende,
 *  - refracción en el frente de la onda de choque (el aire comprimido desvía la luz).
 * Sólo trabaja cuando alguno de los efectos está activo, para no gastar en reposo.
 */
const VERT = /* glsl */ `
out vec2 vUv;
void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D uFb;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uFbPos;   // xy: posición en pantalla (0..1), z: 1 si está delante de la cámara
uniform float uFbR;    // radio aparente de la bola de fuego (fracción de la altura de pantalla)
uniform float uBloom, uTh, uFlare, uHaze;
uniform vec4 uShock;   // xy centro, z semieje x, w semieje y (fracción de la altura)
uniform float uShockK;
out vec4 fragColor;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

void main(){
  float asp = uRes.x / uRes.y;
  vec2 uv = vUv;
  vec2 off = vec2(0.0);
  // distorsión por calor: más intensa sobre la bola de fuego y en la columna de aire que sube
  if (uHaze > 0.001 && uFbPos.z > 0.5) {
    vec2 d = (uv - uFbPos.xy) * vec2(asp, 1.0);
    d.y = d.y > 0.0 ? d.y * 0.55 : d.y * 1.4; // se alarga hacia arriba
    float r = length(d) / max(uFbR, 0.002);
    float k = uHaze * (1.0 - smoothstep(0.9, 2.8, r));
    if (k > 0.0) {
      vec2 q = uv * vec2(48.0, 36.0) + vec2(0.0, -uTime * 2.2);
      off += (vec2(vnoise(q), vnoise(q + 17.3)) - 0.5) * k * 0.010;
    }
  }
  // refracción en el frente de choque (anillo elíptico en pantalla)
  if (uShockK > 0.001) {
    vec2 d = (uv - uShock.xy) * vec2(asp, 1.0);
    vec2 e = d / max(uShock.zw, vec2(1e-4));
    float r = length(e);
    float band = exp(-pow((r - 1.0) / 0.035, 2.0));
    off += normalize(d + 1e-6) * band * uShockK * 0.006 / vec2(asp, 1.0);
  }
  vec3 col = textureLod(uFb, uv + off, 0.0).rgb;

  // resplandor a partir de los mipmaps
  if (uBloom > 0.001) {
    vec3 b = max(textureLod(uFb, uv, 2.0).rgb - uTh, 0.0) * 0.55
           + max(textureLod(uFb, uv, 3.5).rgb - uTh, 0.0) * 0.8
           + max(textureLod(uFb, uv, 5.0).rgb - uTh * 0.9, 0.0) * 1.1
           + max(textureLod(uFb, uv, 6.5).rgb - uTh * 0.85, 0.0) * 1.3;
    col += b * uBloom;
  }

  // destello de lente
  if (uFlare > 0.001 && uFbPos.z > 0.5) {
    vec2 p = uFbPos.xy;
    vec2 d = (uv - p) * vec2(asp, 1.0);
    float rr = length(d);
    // halo y estrella de difracción
    float ang = atan(d.y, d.x);
    float star = pow(abs(cos(ang * 3.0)), 40.0) * exp(-rr * 7.0);
    col += vec3(1.0, 0.82, 0.62) * uFlare * (0.10 / (1.0 + rr * rr * 260.0) + star * 0.25);
    // raya anamórfica horizontal
    col += vec3(1.0, 0.62, 0.38) * uFlare * exp(-abs(uv.y - p.y) * 260.0) * exp(-abs(uv.x - p.x) * asp * 2.2) * 0.45;
    // reflejos fantasma a lo largo de la línea que pasa por el centro de la pantalla
    vec2 axis = vec2(0.5) - p;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      vec2 g = p + axis * (0.7 + fi * 0.42);
      float s = 0.035 + fi * 0.018;
      float gl = smoothstep(s, s * 0.55, length((uv - g) * vec2(asp, 1.0)));
      vec3 tint = i == 0 ? vec3(1.0, 0.55, 0.25) : i == 1 ? vec3(0.4, 0.8, 1.0) : i == 2 ? vec3(0.8, 0.5, 1.0) : vec3(1.0, 0.9, 0.5);
      col += tint * gl * uFlare * 0.07;
    }
  }
  fragColor = vec4(col, 1.0);
}`;

export interface PostParams {
  /** centro de la bola de fuego en coordenadas del modelo (m) */
  fb: THREE.Vector3;
  fbR: number;
  bloom: number;
  flare: number;
  haze: number;
  /** radio de la onda de choque en el suelo (m) y su fuerza 0..1 */
  shockR: number;
  shockK: number;
  /** umbral de brillo para el resplandor */
  threshold: number;
}

export class PostFX {
  private tex: THREE.FramebufferTexture | null = null;
  private mat: THREE.ShaderMaterial;
  private scene = new THREE.Scene();
  private cam = new THREE.Camera();
  private w = 0;
  private h = 0;
  enabled = true;
  params: PostParams = { fb: new THREE.Vector3(), fbR: 0, bloom: 0, flare: 0, haze: 0, shockR: 0, shockK: 0, threshold: 0.78 };
  /** falla una vez (contexto sin soporte): se desactiva solo */
  private broken = false;

  constructor() {
    this.mat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uFb: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 },
        uFbPos: { value: new THREE.Vector3() }, uFbR: { value: 0 },
        uBloom: { value: 0 }, uTh: { value: 0.78 }, uFlare: { value: 0 }, uHaze: { value: 0 },
        uShock: { value: new THREE.Vector4() }, uShockK: { value: 0 },
      },
      depthTest: false, depthWrite: false, transparent: false, blending: THREE.NoBlending,
    });
    const quad = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)), this.mat);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }

  /** ¿hay algo que hacer este fotograma? */
  active() {
    const p = this.params;
    return this.enabled && !this.broken && (p.bloom > 0.01 || p.flare > 0.01 || p.haze > 0.01 || p.shockK > 0.01);
  }

  render(renderer: THREE.WebGLRenderer, gl: WebGL2RenderingContext, mvp: THREE.Matrix4, timeS: number) {
    if (!this.active()) return;
    try {
      const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
      if (!this.tex || W !== this.w || H !== this.h) {
        this.tex?.dispose();
        this.tex = new THREE.FramebufferTexture(W, H);
        this.tex.generateMipmaps = true;
        this.tex.minFilter = THREE.LinearMipmapLinearFilter;
        this.tex.magFilter = THREE.LinearFilter;
        this.w = W; this.h = H;
      }
      renderer.copyFramebufferToTexture(this.tex);
      // mipmaps para el resplandor
      const handle = (renderer.properties.get(this.tex) as { __webglTexture?: WebGLTexture }).__webglTexture;
      if (handle) { gl.bindTexture(gl.TEXTURE_2D, handle); gl.generateMipmap(gl.TEXTURE_2D); gl.bindTexture(gl.TEXTURE_2D, null); }

      const p = this.params;
      const u = this.mat.uniforms;
      const proj = (v: THREE.Vector3) => {
        const c = new THREE.Vector4(v.x, v.y, v.z, 1).applyMatrix4(mvp);
        if (c.w <= 0) return null;
        return new THREE.Vector2(c.x / c.w * 0.5 + 0.5, c.y / c.w * 0.5 + 0.5);
      };
      const c0 = proj(p.fb);
      const vis = !!c0 && c0.x > -0.3 && c0.x < 1.3 && c0.y > -0.3 && c0.y < 1.3;
      u.uFbPos.value.set(c0?.x ?? 0, c0?.y ?? 0, vis ? 1 : 0);
      // radio aparente: proyecta un punto desplazado en horizontal y otro en vertical
      if (c0) {
        const a = proj(p.fb.clone().add(new THREE.Vector3(0, p.fbR, 0)));
        u.uFbR.value = a ? Math.abs(a.y - c0.y) + 0.004 : 0.02;
      }
      // elipse de la onda de choque en el suelo
      const g0 = proj(new THREE.Vector3(0, 0, 0));
      let shockK = p.shockK;
      if (g0 && p.shockR > 0 && shockK > 0) {
        const ex = proj(new THREE.Vector3(p.shockR, 0, 0)), ez = proj(new THREE.Vector3(0, 0, -p.shockR));
        const ex2 = proj(new THREE.Vector3(0, 0, p.shockR)), ez2 = proj(new THREE.Vector3(-p.shockR, 0, 0));
        if (ex && ez && ex2 && ez2) {
          const asp = W / H;
          const dx = Math.max(Math.abs(ex.x - g0.x), Math.abs(ez.x - g0.x), Math.abs(ex2.x - g0.x), Math.abs(ez2.x - g0.x)) * asp;
          const dy = Math.max(Math.abs(ex.y - g0.y), Math.abs(ez.y - g0.y), Math.abs(ex2.y - g0.y), Math.abs(ez2.y - g0.y));
          u.uShock.value.set(g0.x, g0.y, Math.max(dx, 1e-3), Math.max(dy, 1e-3));
          if (dx > 3 || dy > 3) shockK = 0; // anillo ya fuera de la pantalla
        } else shockK = 0;
      } else shockK = 0;
      u.uFb.value = this.tex;
      u.uRes.value.set(W, H);
      u.uTime.value = timeS;
      u.uBloom.value = p.bloom;
      u.uTh.value = p.threshold;
      u.uFlare.value = vis ? p.flare : 0;
      u.uHaze.value = vis ? p.haze : 0;
      u.uShockK.value = shockK;
      renderer.resetState();
      renderer.render(this.scene, this.cam);
    } catch (e) {
      console.warn('post-procesado desactivado', e);
      this.broken = true;
    }
  }

  dispose() { this.tex?.dispose(); this.mat.dispose(); }
}
