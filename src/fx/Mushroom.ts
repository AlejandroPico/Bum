import * as THREE from 'three';
import { ParticleSystem } from './particles';
import type { FxPlan } from './plan';
import type { FrameCtx, FxModule } from './types';

const enum T { Torus, Dome, Stem, Dust, Ejecta, Collar }

interface P {
  type: T;
  a: number; b: number; r: number; u: number; s: number; v: number; seed: number;
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * Nube en forma de hongo, columna, oleada de base (polvo) y eyecta.
 * Posiciones calculadas analíticamente en función de t (rebobinable).
 */
export class Mushroom implements FxModule {
  object = new THREE.Group();
  private ps: ParticleSystem;
  private parts: P[] = [];
  private plan: FxPlan;

  constructor(plan: FxPlan, tex: THREE.Texture, quality = 1, volumetric = true) {
    this.plan = plan;
    const q = quality;
    const add = (type: T, n: number) => {
      for (let i = 0; i < Math.round(n * q); i++) {
        this.parts.push({ type, a: Math.random() * Math.PI * 2, b: Math.random() * Math.PI * 2, r: Math.random(), u: Math.random(), s: 0.6 + Math.random() * 0.8, v: Math.floor(Math.random() * 16), seed: Math.random() });
      }
    };
    const big = plan.fx.energyKt > 0.05;
    if (!plan.highAltitude) {
      // con nube volumétrica, las partículas sólo aportan la oleada de polvo de la base
      if (!volumetric) {
        add(T.Torus, 1700);
        add(T.Dome, 900);
        add(T.Collar, big ? 260 : 0);
        add(T.Stem, 1500);
      }
      add(T.Dust, 1400);
    } else {
      add(T.Dome, 1200);
    }
    if (plan.isImpact && plan.craterR > 0) add(T.Ejecta, 1600);
    this.ps = new ParticleSystem(this.parts.length, tex, { sort: true });
    this.object.add(this.ps.mesh);
  }

  update(ctx: FrameCtx) {
    const P = this.plan;
    const t = ctx.t;
    const b = this.ps.buf;
    const u = this.ps.material.uniforms;
    u.uSun.value.copy(ctx.sunDir);
    u.uSunColor.value.copy(ctx.sunColor);
    u.uAmbient.value.copy(ctx.ambient);
    u.uFogColor.value.copy(ctx.fogColor);
    const heat = P.heat(t);
    u.uGlow.value = Math.min(2.5, heat * heat * 1.6 + (ctx.night * 0.3) * Math.max(0, 1 - t / 200));
    if (t <= 0) { this.ps.commit(0, ctx); return; }

    const zc = P.capZ(t);
    const Rc = P.capRadius(t);
    const Tc = Rc * 0.55;
    const fade = P.cloudFade(t);
    const appear = smooth(P.tMax * 1.5, P.tMax * 10 + 2, t);
    // brillo interno del sombrero al principio (el clásico tono anaranjado/rosado)
    const capEmit = Math.pow(Math.max(0, 1 - t / (P.tMax * 20 + 45)), 1.5) * 0.9 + heat * 0.3;
    const surfaceDirty = P.contact > 0 ? 1 : 0;
    const stemTop = zc - Tc * 0.5;
    const stemStart = P.contact > 0 ? 0 : P.shockTime(P.h) + 1.5;
    const stemGrow = smooth(stemStart, stemStart + P.tau * 1.6, t);
    const stemH = Math.max(0, stemTop) * Math.pow(stemGrow, 0.8);
    const gR = P.shockGroundR(t);
    const g = 9.81;

    let n = 0;
    for (const p of this.parts) {
      let x = 0, y = 0, z = 0, size = 0, alpha = 0, emit = 0;
      let cr = 0.74, cg = 0.7, cb = 0.66;
      let nx = 0, ny = 1, nz = 0;
      switch (p.type) {
        case T.Torus: {
          if (P.highAltitude) break;
          const rot = p.b + 1.2 * Math.log(1 + t / (P.tau * 0.25 + 1)) * (0.7 + p.seed * 0.6);
          const maj = Rc * 0.6, min = Rc * (0.3 + 0.12 * p.r);
          const rad = maj + min * Math.cos(rot);
          const th = p.a + 0.015 * Math.sin(t * 0.01 + p.seed * 6);
          x = Math.cos(th) * rad; z = Math.sin(th) * rad;
          y = zc + min * 0.8 * Math.sin(rot);
          nx = Math.cos(th) * Math.cos(rot); nz = Math.sin(th) * Math.cos(rot); ny = Math.sin(rot) * 0.9 + 0.2;
          size = Rc * 0.36 * p.s;
          alpha = 0.62 * appear;
          emit = capEmit * (0.5 + 0.5 * Math.max(0, -Math.sin(rot))) * (0.6 + 0.4 * p.seed);
          const zf = 1;
          const [dx, dn] = P.drift(t, zf);
          x += dx; z -= dn;
          break;
        }
        case T.Dome: {
          if (P.highAltitude) {
            // remanente esférico a gran altitud
            const R = P.fireballRadius(t) * (1 + t / 30);
            const th = p.a, ph = Math.acos(2 * p.u - 1);
            x = R * Math.sin(ph) * Math.cos(th); z = R * Math.sin(ph) * Math.sin(th); y = P.h + R * Math.cos(ph);
            nx = Math.sin(ph) * Math.cos(th); nz = Math.sin(ph) * Math.sin(th); ny = Math.cos(ph);
            size = R * 0.45 * p.s;
            alpha = 0.28 * appear * Math.max(0, 1 - t / 600);
            emit = Math.max(0, 1 - t / 120) * 0.9;
            cr = 0.75; cg = 0.35; cb = 0.55;
            break;
          }
          const rr = Math.sqrt(p.r) * 0.82;
          const th = p.a + 0.1 * Math.log(1 + t / 60);
          x = Math.cos(th) * rr * Rc; z = Math.sin(th) * rr * Rc;
          const top = Math.sqrt(Math.max(0, 1 - rr * rr));
          y = zc + Tc * (0.05 + 0.85 * p.u) * top;
          nx = Math.cos(th) * rr; nz = Math.sin(th) * rr; ny = 0.6 + 0.4 * p.u;
          size = Rc * 0.32 * p.s;
          alpha = 0.55 * appear;
          emit = capEmit * (1 - p.u) * 0.8;
          const [dx, dn] = P.drift(t, 1);
          x += dx; z -= dn;
          break;
        }
        case T.Collar: {
          // anillo de condensación alrededor de la columna, bajo el sombrero
          const vis = smooth(P.tau * 0.4, P.tau * 1.0, t) * (1 - smooth(P.tau * 2.5, P.tau * 4, t));
          if (vis <= 0) break;
          const rad = Rc * (0.45 + 0.15 * p.r);
          x = Math.cos(p.a) * rad; z = Math.sin(p.a) * rad;
          y = zc - Tc * (1.3 + 0.2 * p.u);
          nx = Math.cos(p.a); nz = Math.sin(p.a); ny = 0.2;
          size = Rc * 0.18 * p.s;
          alpha = 0.45 * vis;
          cr = 0.92; cg = 0.92; cb = 0.94;
          const [dx, dn] = P.drift(t, 0.7);
          x += dx; z -= dn;
          break;
        }
        case T.Stem: {
          if (stemH <= 1) break;
          const uu = p.u;
          const yy = uu * stemH;
          const flare = 1 + 2.4 * smooth(0.8, 1, uu) + 1.6 * Math.pow(1 - uu, 8);
          const rad = P.stemR * Math.sqrt(p.r) * 0.8 * flare * (0.6 + 0.4 * stemGrow);
          const th = p.a + t * 0.004 * (1 - uu) * (p.seed - 0.5);
          x = Math.cos(th) * rad; z = Math.sin(th) * rad; y = yy;
          nx = Math.cos(th); nz = Math.sin(th); ny = 0.1;
          size = P.stemR * 1.15 * p.s * (0.75 + 0.6 * uu);
          alpha = 0.72 * smooth(0, 0.05, stemGrow);
          cr = 0.62 - 0.25 * surfaceDirty * (1 - uu); cg = 0.53 - 0.22 * surfaceDirty * (1 - uu); cb = 0.45 - 0.18 * surfaceDirty * (1 - uu);
          emit = P.contact > 0 ? Math.max(0, 1 - t / (P.tMax * 10 + 20)) * 0.6 * uu : 0;
          const [dx, dn] = P.drift(t, uu * (stemH / Math.max(P.capTop, 1)));
          x += dx; z -= dn;
          break;
        }
        case T.Dust: {
          if (P.dustR <= 0) break;
          const target = P.dustR * (0.25 + 0.75 * Math.sqrt(p.r));
          const reach = Math.min(gR, target);
          if (gR < P.fireballR * 0.5) break;
          const born = smooth(0, target * 0.05, reach - target * 0.2);
          const age = Math.max(0, t - P.shockTime(Math.hypot(target, P.h)));
          const Hd = Math.min(P.dustR * 0.06, 2500) * (0.3 + 0.7 * p.u) * (1 + Math.min(age / 60, 2));
          const th = p.a;
          // las corrientes de retorno arrastran el polvo hacia la columna
          const inflow = 1 - 0.35 * smooth(20, 400, age);
          x = Math.cos(th) * reach * inflow; z = Math.sin(th) * reach * inflow;
          y = Hd * (0.3 + p.seed * 0.7);
          nx = Math.cos(th); nz = Math.sin(th); ny = 0.4;
          size = Math.max(P.dustR * 0.045, 40) * p.s * (1 + age / 120);
          alpha = 0.5 * born * (1 - smooth(500, 2400, age));
          cr = 0.6; cg = 0.52; cb = 0.43;
          const [dx, dn] = P.drift(t, 0.05);
          x += dx * 0.5; z -= dn * 0.5;
          break;
        }
        case T.Ejecta: {
          // eyecta balística de un impacto
          const range = P.craterR * (1.2 + 9 * Math.pow(p.r, 2));
          const ang = (35 + 25 * p.u) * (Math.PI / 180);
          const v0 = Math.sqrt((range * g) / Math.sin(2 * ang));
          const tf = (2 * v0 * Math.sin(ang)) / g;
          const tt = Math.max(0, t - p.seed * 0.3);
          if (tt <= 0) break;
          const tc = Math.min(tt, tf);
          const rr = P.craterR * 0.5 + v0 * Math.cos(ang) * tc;
          y = Math.max(0, v0 * Math.sin(ang) * tc - 0.5 * g * tc * tc);
          x = Math.cos(p.a) * rr; z = Math.sin(p.a) * rr;
          nx = Math.cos(p.a); nz = Math.sin(p.a); ny = 0.5;
          size = P.craterR * (0.12 + 0.1 * p.s) * (1 + 0.5 * Math.min(1, tt / tf));
          alpha = 0.7 * (tt < tf ? 1 : Math.max(0, 1 - (tt - tf) / (tf * 2 + 30)));
          emit = Math.max(0, 1 - tt / 8) * 0.9;
          cr = 0.42; cg = 0.33; cb = 0.25;
          break;
        }
      }
      alpha *= fade;
      if (alpha <= 0.004 || size <= 0) continue;
      if (p.type === T.Torus || p.type === T.Dome || p.type === T.Collar) {
        // auto-sombreado: la parte baja e interior del sombrero recibe menos luz
        const hf = Math.max(0, Math.min(1, (y - (zc - Tc)) / (2 * Tc)));
        const occ = 0.42 + 0.58 * Math.pow(hf, 0.8);
        cr *= occ; cg *= occ * 0.98; cb *= occ * 0.95;
      } else if (p.type === T.Stem) {
        const occ = 0.55 + 0.25 * p.r;
        cr *= occ; cg *= occ; cb *= occ;
      }
      const k = n * 3;
      b.pos[k] = x; b.pos[k + 1] = y; b.pos[k + 2] = z;
      b.normal[k] = nx; b.normal[k + 1] = ny; b.normal[k + 2] = nz;
      b.color[k] = cr; b.color[k + 1] = cg; b.color[k + 2] = cb;
      b.size[n] = size;
      b.rot[n] = p.seed * 6.283 + t * 0.002 * (p.seed - 0.5);
      b.alpha[n] = Math.min(1, alpha);
      b.emit[n] = emit;
      b.variant[n] = p.v;
      n++;
    }
    this.ps.commit(n, ctx);
  }

  dispose() {
    this.ps.dispose();
  }
}
