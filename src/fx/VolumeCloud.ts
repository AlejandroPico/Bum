import * as THREE from 'three';
import { HEAT } from './glsl';
import type { FxPlan } from './plan';
import type { FrameCtx, FxModule } from './types';

/**
 * Nube en forma de hongo VOLUMÉTRICA (ray-marching).
 *
 * La densidad se define analíticamente (toro + cúpula del sombrero, columna inclinada,
 * collar de condensación y faldón de polvo) y se erosiona con ruido Perlin-Worley 3D
 * periódico, como en las nubes de los juegos AAA. Cada muestra se ilumina con una
 * pequeña marcha hacia el sol (auto-sombreado), función de fase con "silver lining",
 * luz ambiente del cielo y emisión térmica del interior incandescente.
 */

const VERT = /* glsl */ `
varying vec3 vW;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * w;
  // evita el recorte por el plano lejano en vistas muy inclinadas
  gl_Position.z = min(gl_Position.z, gl_Position.w * 0.99999);
}`;

const FRAG = /* glsl */ `
precision highp float;
precision highp sampler3D;
uniform sampler3D uNoise;
uniform vec3 uCam; uniform float uTime; uniform float uT;
uniform vec3 uCapC; uniform float uRc; uniform float uTc; uniform float uRoll;
uniform float uStemTop; uniform float uStemR; uniform vec2 uStemBase;
uniform float uWakeBot; uniform float uDustTop; uniform float uStemVis;
uniform vec2 uCollar; uniform vec3 uSkirt; // radio, altura, densidad
uniform float uHeat; uniform float uDens; uniform float uSigma; uniform float uDirty;
uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uAmb; uniform vec3 uFogCol; uniform float uFogDist;
uniform vec3 uBoxMin; uniform vec3 uBoxMax;
uniform float uGlow; uniform float uErode; uniform vec3 uFire; uniform vec3 uOff; uniform float uSmoke;
varying vec3 vW;
${HEAT}

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float HG(float c, float g){ float g2 = g*g; return (1.0 - g2) / (4.0*3.14159*pow(1.0 + g2 - 2.0*g*c, 1.5)); }

// distancias aproximadas (m, <0 dentro) a las piezas de la nube
void pieces(vec3 p, out float dCap, out float dTor, out float dStem, out float hy, out float vis){
  vec3 q = p - uCapC;
  float rxz = length(q.xz);
  float R0 = uRc * 0.56, r0 = uRc * 0.40;
  dTor = length(vec2(rxz - R0, q.y * 1.2)) - r0;
  vec3 e = vec3(q.x / (uRc * 0.78), (q.y - uTc * 0.05) / (uTc * 0.9), q.z / (uRc * 0.78));
  float dD = (length(e) - 1.0) * uRc * 0.7;
  dD = max(dD, -(q.y + uTc * 0.1));
  dCap = min(dTor, dD);
  hy = clamp(p.y / max(uStemTop, 1.0), 0.0, 1.0);
  vec2 ax = mix(uStemBase, uCapC.xz, hy * hy);
  float flare = 1.0 + 1.8 * smoothstep(0.75, 1.0, hy) + 1.3 * pow(1.0 - hy, 8.0);
  dStem = length(p.xz - ax) - uStemR * flare;
  float visDust = 1.0 - smoothstep(uDustTop - 300.0, uDustTop + 50.0, p.y);
  float visWake = smoothstep(uWakeBot, uWakeBot + 500.0, p.y);
  vis = max(visDust, visWake) * uStemVis * (1.0 - smoothstep(uStemTop, uStemTop + uTc * 0.8, p.y));
}

// densidad completa (con ruido) — devuelve (densidad, polvo, núcleo caliente)
vec3 density(vec3 p){
  float dCap, dTor, dStem, hy, vis;
  pieces(p, dCap, dTor, dStem, hy, vis);
  vec3 q = p - uCapC;
  float rxz = length(q.xz);
  float R0 = uRc * 0.56;
  // coordenadas "enrolladas": el ruido gira con el toro (sube por dentro, baja por fuera)
  vec2 tc = vec2(rxz - R0, q.y);
  float ca = cos(uRoll), sa = sin(uRoll);
  vec2 rt = vec2(ca * tc.x - sa * tc.y, sa * tc.x + ca * tc.y);
  vec2 dir = rxz > 1.0 ? q.xz / rxz : vec2(1.0, 0.0);
  vec3 rolled = vec3(dir.x * (R0 + rt.x), rt.y, dir.y * (R0 + rt.x));
  vec3 np = mix(q, rolled, smoothstep(0.15 * R0, 0.6 * R0, rxz));

  float edgeC = uRc * 0.32;
  float nC = texture(uNoise, np / (uRc * 1.7) + vec3(0.0, uTime * 0.004, 0.0)).r;
  float nC2 = texture(uNoise, np / (uRc * 0.75) + vec3(uTime * 0.003, 0.0, 0.0)).b;
  float dc = clamp(-(dCap + (0.6 - nC) * edgeC * 2.2 + (0.5 - nC2) * edgeC * 0.9) / edgeC, 0.0, 1.0);

  float ds = 0.0;
  if (vis > 0.001) {
    float edgeS = uStemR * 0.55;
    vec3 sp = p / (uStemR * 3.2) - vec3(0.0, uT * 0.01 + uTime * 0.01, 0.0);
    float nS = texture(uNoise, sp).r;
    ds = clamp(-(dStem + (0.6 - nS) * edgeS * 2.0) / edgeS, 0.0, 1.0) * vis * 0.85;
  }
  // collar de condensación bajo el sombrero
  float dk = 0.0;
  if (uCollar.x > 0.001) {
    float dCo = length(vec2(length(p.xz - mix(uStemBase, uCapC.xz, 0.9)) - uRc * 0.42, (p.y - uCollar.y) * 2.2)) - uRc * 0.08;
    dk = clamp(-dCo / (uRc * 0.06), 0.0, 1.0) * uCollar.x;
  }
  // faldón de polvo al pie de la columna
  float dsk = 0.0;
  if (uSkirt.z > 0.001) {
    float dSk = length(vec2(length(p.xz - uStemBase) / uSkirt.x, p.y / uSkirt.y)) - 1.0;
    float nK = texture(uNoise, p / (uSkirt.x * 0.9) + vec3(uTime * 0.003, 0.0, 0.0)).r;
    dsk = clamp(-(dSk + (0.6 - nK) * 0.8) / 0.35, 0.0, 1.0) * uSkirt.z;
  }
  float d = max(max(dc, ds), max(dk, dsk));
  if (d <= 0.0) return vec3(0.0);
  // erosión de detalle (bordes de coliflor)
  float det = texture(uNoise, np / (uRc * 0.42) + vec3(uTime * 0.006, uTime * 0.01, 0.0)).g;
  float er = (1.0 - det) * (0.32 + 0.5 * uErode);
  d = clamp((d - er) / (1.0 - er), 0.0, 1.0);
  float dust = max(ds > dc ? (1.0 - hy * 0.85) * uDirty : 0.0, dsk > dc ? 0.9 : 0.0);
  float core = smoothstep(0.35, -0.6, dTor / (uRc * 0.4)) * step(ds, dc);
  return vec3(d, dust, core);
}

// densidad barata (sin ruido) para la marcha de sombras
float densityCheap(vec3 p){
  float dCap, dTor, dStem, hy, vis;
  pieces(p, dCap, dTor, dStem, hy, vis);
  float dc = clamp(-dCap / (uRc * 0.45), 0.0, 1.0);
  float ds = clamp(-dStem / (uStemR * 0.8), 0.0, 1.0) * vis;
  return max(dc, ds);
}

void main(){
  vec3 ro = uCam - uOff;
  vec3 rd = normalize(vW - uCam);
  vec3 inv = 1.0 / rd;
  vec3 t0s = (uBoxMin - ro) * inv, t1s = (uBoxMax - ro) * inv;
  vec3 tsm = min(t0s, t1s), tbg = max(t0s, t1s);
  float tmin = max(max(tsm.x, tsm.y), tsm.z);
  float tmax = min(min(tbg.x, tbg.y), tbg.z);
  tmin = max(tmin, 0.0);
  if (ro.y > 0.0 && rd.y < 0.0) tmax = min(tmax, -ro.y / rd.y);
  if (tmax <= tmin) discard;

  const int STEPS = ${'${STEPS}'};
  float len = tmax - tmin;
  float stepL = len / float(STEPS);
  float t = tmin + stepL * hash12(gl_FragCoord.xy + fract(uTime * 7.13) * 91.0);
  float T = 1.0;
  vec3 col = vec3(0.0);
  float cosT = dot(rd, uSun);
  float phase = mix(HG(cosT, 0.55), HG(cosT, -0.2), 0.45) * 4.0 * 3.14159 * 0.6 + 0.4;
  float sig = uSigma * uDens;
  float lightL[5] = float[5](0.05, 0.13, 0.26, 0.48, 0.85);
  float firstHit = -1.0;
  for (int i = 0; i < STEPS; i++) {
    vec3 p = ro + rd * t;
    vec3 D = density(p);
    if (D.x > 0.002) {
      if (firstHit < 0.0) firstHit = t;
      // marcha hacia el sol: profundidad óptica
      float od = 0.0;
      float prev = 0.0;
      for (int k = 0; k < ${'${LSTEPS}'}; k++) {
        float L = lightL[k] * uRc;
        od += densityCheap(p + uSun * L) * (L - prev);
        prev = L;
      }
      float hAmb = clamp((p.y - (uCapC.y - uTc)) / (2.0 * uTc), 0.0, 1.0);
      float Tl = exp(-od * uSigma * 0.8);
      // la columna recibe luz lateral y del cielo aunque el sombrero le haga sombra
      Tl = mix(Tl, 1.0, 0.25 * (1.0 - hAmb));
      float powder = 1.0 - exp(-D.x * 4.0);
      vec3 albedo = mix(vec3(0.88, 0.85, 0.82), vec3(0.62, 0.53, 0.44), D.y);
      albedo = mix(albedo, vec3(0.2, 0.19, 0.18), uSmoke);
      vec3 amb = uAmb * mix(0.5, 1.05, hAmb) * (D.y > 0.5 ? 0.85 : 1.0);
      vec3 lum = uSunCol * 1.45 * Tl * phase * mix(1.0, powder * 1.6, 0.35) + amb * 0.85;
      // luz de la bola de fuego y brasas del interior
      lum += uGlow * vec3(1.0, 0.42, 0.12) * (1.0 - hAmb) * 0.6;
      // resplandor de los incendios de la ciudad sobre la cara inferior (visible sobre todo de noche)
      lum += uFire * (1.0 - hAmb * 0.75) * (0.6 + 0.4 * D.y);
      float e = uHeat * (0.25 + 0.75 * D.z);
      vec3 em = heatColor(e * 0.85) * e * 1.4;
      float a = 1.0 - exp(-sig * D.x * stepL);
      col += T * a * (albedo * lum + em);
      T *= 1.0 - a;
      if (T < 0.015) break;
    }
    t += stepL;
  }
  float alpha = 1.0 - T;
  if (alpha < 0.003) discard;
  float dist = firstHit > 0.0 ? firstHit : tmin;
  float fog = 1.0 - exp(-dist / uFogDist);
  col = mix(col, uFogCol * alpha, fog * 0.55);
  gl_FragColor = vec4(col, alpha);
}`;

export class VolumeCloud implements FxModule {
  object = new THREE.Group();
  private mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  private plan: FxPlan;

  constructor(plan: FxPlan, noise: THREE.Data3DTexture, quality = 1) {
    this.plan = plan;
    const steps = quality <= 0.6 ? 40 : quality >= 1.5 ? 96 : 64;
    const lsteps = quality <= 0.6 ? 3 : 5;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG.replace('${STEPS}', String(steps)).replace('${LSTEPS}', String(lsteps)),
      uniforms: {
        uNoise: { value: noise },
        uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uT: { value: 0 },
        uCapC: { value: new THREE.Vector3() }, uRc: { value: 1 }, uTc: { value: 1 }, uRoll: { value: 0 },
        uStemTop: { value: 1 }, uStemR: { value: 1 }, uStemBase: { value: new THREE.Vector2() },
        uWakeBot: { value: 0 }, uDustTop: { value: 0 }, uStemVis: { value: 0 },
        uCollar: { value: new THREE.Vector2() }, uSkirt: { value: new THREE.Vector3(1, 1, 0) },
        uHeat: { value: 0 }, uDens: { value: 1 }, uSigma: { value: 0.001 }, uDirty: { value: 0.5 },
        uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uAmb: { value: new THREE.Color() },
        uFogCol: { value: new THREE.Color() }, uFogDist: { value: 300000 },
        uBoxMin: { value: new THREE.Vector3() }, uBoxMax: { value: new THREE.Vector3() },
        uGlow: { value: 0 }, uErode: { value: 0 }, uFire: { value: new THREE.Color(0, 0, 0) }, uOff: { value: new THREE.Vector3() }, uSmoke: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.FrontSide,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.object.add(this.mesh);
  }

  update(ctx: FrameCtx) {
    const P = this.plan;
    const t = ctx.t;
    const appear = smooth(P.tMax * 1.2, P.tMax * 8 + 1.5, t);
    if (t <= 0 || P.highAltitude || appear <= 0 || P.cloudFade(t) <= 0 || P.buried?.contained) { this.mesh.visible = false; return; }
    this.mesh.visible = true;
    this.mat.depthTest = !ctx.farView;
    const u = this.mat.uniforms;

    const zc = P.capZ(t);
    const Rc = P.capRadius(t);
    const diss = P.dissipation(t);
    const Tc = Rc * 0.55 * (1 - 0.35 * diss);
    const [dx, dn] = P.drift(t, 1);
    const [bx, bn] = P.drift(t, 0.05);
    const capC = new THREE.Vector3(dx, zc, -dn);
    const base = new THREE.Vector2(bx, -bn);

    // columna: estela de la bola de fuego (arriba) + polvo que asciende desde el suelo
    const kStem = smooth(0, P.tau * 1.4, t);
    const stemR = P.stemR * (0.4 + 0.6 * kStem);
    const stemTop = Math.max(0, zc - Tc * 0.35);
    let wakeBot: number, dustTop: number, stemVis: number;
    if (P.contact > 0) {
      wakeBot = 0;
      dustTop = stemTop;
      stemVis = smooth(P.tMax * 2, P.tMax * 10 + 3, t);
    } else {
      wakeBot = P.h * 0.8;
      const tDust = P.shockTime(P.h) + 1;
      const vd = Math.max(40, (0.35 * P.capTop) / P.tau);
      dustTop = Math.min(stemTop, Math.max(0, (t - tDust) * vd));
      stemVis = smooth(P.tMax * 3, P.tMax * 12 + 4, t);
    }
    const hum = Math.max(0, (P.env.humidity - 30) / 70);
    const collar = smooth(P.tau * 0.35, P.tau * 0.9, t) * (1 - smooth(P.tau * 2.2, P.tau * 3.6, t)) * hum * 0.8;
    const skirtR = stemR * (P.contact > 0 ? 3.2 : 2.4) * (0.6 + 0.4 * kStem);
    const skirtH = stemR * 1.1;
    const skirtD = (P.contact > 0 ? 0.75 : 0.5) * smooth(0, 20, dustTop) * P.stemFade(t);

    // caja envolvente
    const R = Math.max(Rc * 1.15, skirtR * 1.05);
    const minX = Math.min(capC.x - Rc * 1.1, base.x - R), maxX = Math.max(capC.x + Rc * 1.1, base.x + R);
    const minZ = Math.min(capC.z - Rc * 1.1, base.y - R), maxZ = Math.max(capC.z + Rc * 1.1, base.y + R);
    const maxY = zc + Tc * 1.45;
    u.uBoxMin.value.set(minX, 0, minZ);
    u.uBoxMax.value.set(maxX, maxY, maxZ);
    this.mesh.position.set((minX + maxX) / 2, maxY / 2, (minZ + maxZ) / 2);
    this.mesh.scale.set(maxX - minX, maxY, maxZ - minZ);
    this.mesh.updateMatrixWorld();
    // si la cámara está dentro, dibuja las caras traseras
    const c = ctx.camPos.clone().sub(this.object.position);
    u.uOff.value.copy(this.object.position);
    const inside = c.x > minX && c.x < maxX && c.z > minZ && c.z < maxZ && c.y < maxY && c.y > 0;
    this.mat.side = inside ? THREE.BackSide : THREE.FrontSide;

    u.uCam.value.copy(ctx.camPos);
    u.uTime.value = ctx.real % 10000;
    u.uT.value = t;
    u.uCapC.value.copy(capC);
    u.uRc.value = Rc;
    u.uTc.value = Tc;
    u.uRoll.value = 1.6 * Math.log(1 + t / (P.tau * 0.25 + 1));
    u.uStemTop.value = stemTop;
    u.uStemR.value = stemR;
    u.uStemBase.value.copy(base);
    u.uWakeBot.value = wakeBot;
    u.uDustTop.value = dustTop;
    u.uStemVis.value = stemVis * P.stemFade(t);
    u.uErode.value = diss;
    u.uCollar.value.set(collar, zc - Tc * 1.25);
    u.uSkirt.value.set(skirtR, skirtH, skirtD);
    const heat = P.heat(t);
    u.uHeat.value = (Math.pow(Math.max(0, 1 - t / (P.tMax * 20 + 45)), 1.5) * 0.9 + heat * 0.4) * P.flashK;
    u.uGlow.value = Math.min(2, heat * heat * 1.5);
    u.uDens.value = appear * P.cloudFade(t) * (1 - 0.3 * diss);
    u.uSigma.value = 11 / Rc;
    u.uSmoke.value = P.smoke;
    u.uDirty.value = P.buried?.mode === 'underwater' ? 0 : P.contact > 0 ? 1 : 0.7;
    u.uSun.value.copy(ctx.sunDir);
    u.uSunCol.value.copy(ctx.sunColor);
    u.uAmb.value.copy(ctx.ambient);
    // de noche la nube sigue siendo visible: luz de luna mínima y fuego de la ciudad desde abajo
    const n = ctx.night ?? 0;
    u.uSunCol.value.r = Math.max(u.uSunCol.value.r, 0.3 * n); u.uSunCol.value.g = Math.max(u.uSunCol.value.g, 0.34 * n); u.uSunCol.value.b = Math.max(u.uSunCol.value.b, 0.46 * n);
    u.uAmb.value.r = Math.max(u.uAmb.value.r, 0.2 * n); u.uAmb.value.g = Math.max(u.uAmb.value.g, 0.2 * n); u.uAmb.value.b = Math.max(u.uAmb.value.b, 0.25 * n);
    const fires = P.ignitionR > 0 ? smooth(P.tMax * 4, P.tMax * 4 + 40, t) : 0;
    const fk = fires * (0.1 + 0.42 * n) * Math.max(0.3, 1 - diss);
    u.uFire.value.setRGB(1.0 * fk, 0.45 * fk, 0.16 * fk);
    u.uFogCol.value.copy(ctx.fogColor);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}

function smooth(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
