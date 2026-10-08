import * as THREE from 'three';
import { ParticleSystem } from './particles';
import type { FxPlan } from './plan';
import type { FrameCtx, FxModule } from './types';

/** Entrada atmosférica del asteroide: bólido incandescente + estela de plasma y humo. */
export class Bolide implements FxModule {
  object = new THREE.Group();
  private glow: ParticleSystem;
  private smoke: ParticleSystem;
  private plan: FxPlan;
  private dir: THREE.Vector3;
  private readonly NG = 220;
  private readonly NS = 420;
  private diameter: number;

  constructor(plan: FxPlan, tex: THREE.Texture) {
    this.plan = plan;
    const az = (plan.entryAzimuth * Math.PI) / 180;
    const el = (plan.entryAngle * Math.PI) / 180;
    // vector desde el punto de explosión hacia el origen de la trayectoria
    this.dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    this.diameter = plan.fx.scenario.kind === 'asteroid' ? plan.fx.scenario.diameterM : 50;
    this.glow = new ParticleSystem(this.NG, tex, { additive: true });
    this.smoke = new ParticleSystem(this.NS, tex, { sort: true });
    this.glow.mesh.renderOrder = 9;
    this.object.add(this.smoke.mesh, this.glow.mesh);
  }

  update(ctx: FrameCtx) {
    const P = this.plan;
    const t = ctx.t;
    const T = P.entryDuration;
    const g = this.glow.buf, s = this.smoke.buf;
    const gu = this.glow.material.uniforms;
    gu.uSunColor.value.setRGB(0, 0, 0); gu.uAmbient.value.setRGB(0, 0, 0);
    const su = this.smoke.material.uniforms;
    su.uSun.value.copy(ctx.sunDir); su.uSunColor.value.copy(ctx.sunColor); su.uAmbient.value.copy(ctx.ambient); su.uFogColor.value.copy(ctx.fogColor);
    const L0 = P.entrySpeed * T; // longitud del recorrido
    const headDist = t < 0 ? P.entrySpeed * -t : 0;
    const base = new THREE.Vector3(0, P.h, 0);
    const d = this.dir;
    const alt = (dist: number) => P.h + d.y * dist;
    let ng = 0;
    if (t < 0 && t > -T) {
      const a = alt(headDist);
      const dens = Math.exp(-a / 9000);
      const head = Math.max(this.diameter * 25, 450) * (1 + 3 * dens);
      const trail = Math.min(L0 - headDist, 25000 + head * 40);
      for (let i = 0; i < this.NG; i++) {
        const f = i / this.NG;
        const dist = headDist + f * trail;
        const k = ng * 3;
        g.pos[k] = base.x + d.x * dist; g.pos[k + 1] = base.y + d.y * dist; g.pos[k + 2] = base.z + d.z * dist;
        const fall = Math.pow(1 - f, 2.2);
        g.size[ng] = head * (i === 0 ? 2.6 : 0.5 + 0.9 * fall);
        g.alpha[ng] = (i === 0 ? 1 : 0.35 * fall) * (0.3 + 0.7 * Math.min(1, dens * 6));
        g.emit[ng] = i === 0 ? 1.25 : 0.6 + 0.5 * fall;
        g.color[k] = g.color[k + 1] = g.color[k + 2] = 0;
        g.normal[k] = 0; g.normal[k + 1] = 1; g.normal[k + 2] = 0;
        g.rot[ng] = i * 1.7 + ctx.real;
        g.variant[ng] = i % 16;
        ng++;
      }
    }
    this.glow.commit(ng, ctx);
    // humo de la estela (persiste tras el impacto)
    let ns = 0;
    const tEntry = t + T; // tiempo desde el inicio de la entrada
    if (tEntry > 0) {
      for (let i = 0; i < this.NS; i++) {
        const f = i / this.NS;
        const dist = L0 * (1 - f);
        if (dist < headDist) continue;
        const born = (L0 - dist) / P.entrySpeed; // instante (desde inicio) en que pasó el bólido
        const age = tEntry - born;
        if (age < 0) continue;
        const a = alt(dist);
        if (a > 75000) continue;
        const k = ns * 3;
        const spread = 1 + age / 20;
        const [wx, wn] = P.wind;
        s.pos[k] = base.x + d.x * dist + wx * age * (1 + a / 20000); s.pos[k + 1] = base.y + d.y * dist; s.pos[k + 2] = base.z + d.z * dist - wn * age * (1 + a / 20000);
        s.size[ns] = Math.max(this.diameter * 8, 220) * spread * (0.6 + 0.4 * Math.exp(-a / 20000));
        s.alpha[ns] = 0.32 * Math.exp(-age / 900) * Math.min(1, age * 2) * (0.4 + 0.6 * Math.exp(-a / 25000));
        s.emit[ns] = Math.max(0, 0.6 - age * 0.15);
        s.color[k] = 0.72; s.color[k + 1] = 0.68; s.color[k + 2] = 0.64;
        s.normal[k] = 0; s.normal[k + 1] = 1; s.normal[k + 2] = 0;
        s.rot[ns] = i * 2.3;
        s.variant[ns] = (i * 7) % 16;
        ns++;
      }
    }
    this.smoke.commit(ns, ctx);
  }

  dispose() {
    this.glow.dispose();
    this.smoke.dispose();
  }
}
