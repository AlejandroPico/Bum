import * as THREE from 'three';
import { ParticleSystem } from './particles';
import type { FxPlan } from './plan';
import type { FrameCtx, FxModule } from './types';

interface Fire { x: number; y: number; z: number; start: number; size: number; seed: number }

/** Incendios provocados por el pulso térmico + columnas de humo. */
export class Fires implements FxModule {
  object = new THREE.Group();
  private flames: ParticleSystem;
  private smoke: ParticleSystem;
  private fires: Fire[] = [];
  private plan: FxPlan;
  private readonly SMOKE_PER = 5;

  constructor(plan: FxPlan, tex: THREE.Texture, elevAt: (e: number, n: number) => number, quality = 1) {
    this.plan = plan;
    const R = plan.ignitionR || plan.burnR * 0.8;
    const inner = Math.max(plan.fireballR * 1.1, plan.craterR * 1.2);
    const N = R > inner * 1.2 ? Math.round(320 * quality) : 0;
    const tStart = plan.tMax * 2;
    for (let i = 0; i < N; i++) {
      const rr = Math.sqrt(inner * inner + Math.random() * (R * R - inner * inner));
      const a = Math.random() * Math.PI * 2;
      const e = Math.cos(a) * rr, n = Math.sin(a) * rr;
      // los incendios crecen tras el pulso; los más alejados tardan más en propagarse
      this.fires.push({ x: e, y: elevAt(e, n), z: -n, start: tStart + Math.random() * 20 + (rr / R) * 40, size: Math.min(Math.max(R * 0.022, 25), 900) * (0.5 + Math.random()), seed: Math.random() });
    }
    this.flames = new ParticleSystem(Math.max(1, N * 2), tex, { additive: true });
    this.smoke = new ParticleSystem(Math.max(1, N * this.SMOKE_PER), tex, { sort: true });
    this.flames.mesh.renderOrder = 4;
    this.object.add(this.smoke.mesh, this.flames.mesh);
  }

  update(ctx: FrameCtx) {
    const t = ctx.t;
    const f = this.flames.buf, s = this.smoke.buf;
    const su = this.smoke.material.uniforms;
    su.uSun.value.copy(ctx.sunDir); su.uSunColor.value.copy(ctx.sunColor); su.uAmbient.value.copy(ctx.ambient); su.uFogColor.value.copy(ctx.fogColor);
    const fu = this.flames.material.uniforms;
    fu.uSunColor.value.setRGB(0, 0, 0); fu.uAmbient.value.setRGB(0, 0, 0);
    let nf = 0, ns = 0;
    const [wx, wn] = this.plan.wind;
    for (const fire of this.fires) {
      const age = t - fire.start;
      if (age <= 0) continue;
      const grow = Math.min(1, age / 30);
      const die = Math.max(0, 1 - (age - 3600) / 7200);
      if (die <= 0) continue;
      const flick = 0.75 + 0.25 * Math.sin(ctx.real * (7 + fire.seed * 6) + fire.seed * 40) * Math.sin(ctx.real * 3.1 + fire.seed * 9);
      for (let k = 0; k < 2; k++) {
        const j = nf * 3;
        f.pos[j] = fire.x + (k - 0.5) * fire.size * 0.4; f.pos[j + 1] = fire.y + fire.size * (0.35 + k * 0.3); f.pos[j + 2] = fire.z;
        f.size[nf] = fire.size * (k ? 0.9 : 1.3) * grow * flick;
        f.alpha[nf] = 0.55 * die * (k ? 0.8 : 1);
        f.emit[nf] = 0.75 + 0.2 * flick - k * 0.15;
        f.color[j] = f.color[j + 1] = f.color[j + 2] = 0;
        f.normal[j] = 0; f.normal[j + 1] = 1; f.normal[j + 2] = 0;
        f.rot[nf] = fire.seed * 6 + ctx.real * (k ? 0.6 : -0.4);
        f.variant[nf] = (fire.seed * 16 + k) % 16;
        nf++;
      }
      for (let k = 0; k < this.SMOKE_PER; k++) {
        const ph = ((ctx.real * 0.04 + k / this.SMOKE_PER + fire.seed) % 1);
        const h = ph * fire.size * 10 * grow;
        const j = ns * 3;
        s.pos[j] = fire.x + wx * ph * 60; s.pos[j + 1] = fire.y + fire.size + h; s.pos[j + 2] = fire.z - wn * ph * 60;
        s.size[ns] = fire.size * (1.5 + ph * 5);
        s.alpha[ns] = 0.38 * Math.sin(Math.PI * ph) * die * grow;
        s.emit[ns] = Math.max(0, 0.35 - ph) * 0.8;
        s.color[j] = 0.32; s.color[j + 1] = 0.29; s.color[j + 2] = 0.27;
        s.normal[j] = 0; s.normal[j + 1] = 1; s.normal[j + 2] = 0;
        s.rot[ns] = fire.seed * 10 + k;
        s.variant[ns] = (k * 3 + fire.seed * 16) % 16;
        ns++;
      }
    }
    this.flames.commit(nf, ctx);
    this.smoke.commit(ns, ctx);
  }

  dispose() {
    this.flames.dispose();
    this.smoke.dispose();
  }
}
