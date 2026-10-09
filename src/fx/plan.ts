import type { Effects, Environment } from '../physics/types';
import { interpTable } from '../physics/blast';
import { windAt } from '../physics/wind';

/**
 * Parámetros de animación derivados de los efectos calculados. Todas las funciones
 * son deterministas en el tiempo de simulación `t` (s), lo que permite avanzar o
 * retroceder libremente con la línea de tiempo.
 */
export class FxPlan {
  fx: Effects;
  env: Environment;
  h: number;
  fireballR: number;
  tMax: number;
  capTop: number;
  capBottom: number;
  capR: number;
  stemR: number;
  tau: number;
  contact: number;
  isAsteroid: boolean;
  isImpact: boolean;
  /** viento en m/s (este, norte) — hacia donde sopla */
  wind: [number, number];
  ignitionR: number;
  burnR: number;
  psi5R: number;
  psi1R: number;
  dustR: number;
  craterR: number;
  entryAngle = 45;
  entryAzimuth = 250;
  entrySpeed = 20000;
  entryDuration = 0;
  highAltitude: boolean;
  falloutExtKm = 0;
  /** inicio y fin de la disipación de la nube (s) */
  fade0 = 0;
  fade1 = 1;
  tEnd: number;

  constructor(fx: Effects, env: Environment) {
    this.fx = fx;
    this.env = env;
    this.h = fx.burstHeightM;
    this.fireballR = fx.fireball.radiusM;
    this.tMax = Math.max(fx.fireball.tMaxS, 0.004);
    this.capTop = fx.cloud.topM;
    this.capBottom = fx.cloud.capBottomM;
    this.capR = fx.cloud.capRadiusM;
    this.stemR = fx.cloud.stemRadiusM;
    this.tau = fx.cloud.riseTimeS;
    this.contact = fx.groundContact;
    this.isAsteroid = fx.scenario.kind === 'asteroid';
    this.isImpact = this.isAsteroid && fx.burstHeightM === 0;
    this.highAltitude = this.h > 20000;
    // viento efectivo (media en la altura de la nube) calculado con los efectos
    const to = ((fx.windFromDeg + 180) * Math.PI) / 180;
    const ms = fx.windKmh / 3.6;
    this.wind = [Math.sin(to) * ms, Math.cos(to) * ms];
    const g = (id: string) => fx.rings.find((r) => r.id === id)?.radiusM ?? 0;
    this.ignitionR = g('ignite');
    this.burnR = g('burn3');
    this.psi5R = g('psi5');
    this.psi1R = g('psi1');
    this.dustR = Math.max(Math.min(this.psi5R * 0.9, fx.cloud.topM * 1.5), this.fireballR * 2);
    this.craterR = g('crater');
    if (fx.scenario.kind === 'asteroid') {
      this.entryAngle = fx.scenario.angleDeg;
      this.entrySpeed = fx.scenario.velocityKms * 1000;
      const startAlt = 110000;
      const path = (startAlt - this.h) / Math.sin((this.entryAngle * Math.PI) / 180);
      this.entryDuration = Math.min(path / this.entrySpeed, 25);
    }
    const shockEnd = this.shockTime(Math.max(this.psi1R * 1.6, this.fireballR * 4));
    const ext = fx.fallout.length ? Math.max(...fx.fallout.map((f) => f.maxDownwindKm)) : 0;
    this.falloutExtKm = ext;
    const falloutEnd = fx.fallout.length ? Math.min(48 * 3600, Math.max(6 * 3600, (ext / Math.max(fx.windKmh, 4) + 1) * 3600)) : 0;
    // la nube se disipa por completo antes de terminar la línea de tiempo
    const y = Math.max(fx.energyKt, 0.001);
    this.fade0 = this.tau * 6;
    this.fade1 = this.fade0 + 2400 * Math.pow(y / 1000, 0.18) + 1800;
    // el tsunami viaja a √(g·h): en mar profundo tarda horas en cruzar el océano
    const tsuR = Math.max(0, ...fx.rings.filter((r) => r.group === 'tsunami').map((r) => r.radiusM));
    const tsuEnd = fx.tsunami && tsuR ? (tsuR / Math.sqrt(9.81 * Math.max(10, fx.tsunami.depthM))) * 1.05 : 0;
    this.tEnd = Math.min(72 * 3600, Math.max(20 * 60, shockEnd * 1.2, falloutEnd, this.fade1 * 1.05, tsuEnd));
  }

  /** radio del frente de choque (m, desde el punto de explosión) */
  shockR(t: number): number {
    if (t <= 0) return 0;
    return interpTable(this.fx.shock.t, this.fx.shock.r, t);
  }
  shockTime(r: number): number {
    return interpTable(this.fx.shock.r, this.fx.shock.t, r);
  }
  /** radio del frente en el suelo */
  shockGroundR(t: number): number {
    const R = this.shockR(t);
    return R > this.h ? Math.sqrt(R * R - this.h * this.h) : 0;
  }

  /** fin de la fase luminosa de la bola de fuego (brillo < 0,25): hasta entonces no se dibujan cúpulas ni anillos */
  get fbDone(): number {
    const tm = this.tMax;
    return tm + Math.log(1.05 / 0.25) * (tm * 6 + 1.5);
  }

  /** brillo/temperatura de la bola de fuego 0..1.2 */
  heat(t: number): number {
    if (t <= 0) return 0;
    const tm = this.tMax;
    if (t < tm * 0.1) return 1.25; // primer pulso
    if (t < tm) return 1.05 + 0.15 * (1 - t / tm);
    return 1.05 * Math.exp(-(t - tm) / (tm * 6 + 1.5));
  }
  fireballRadius(t: number): number {
    if (t <= 0) return 0;
    const g = Math.min(1, Math.pow(t / this.tMax, 0.4));
    const late = t > this.tMax ? 1 + 0.25 * (1 - Math.exp(-(t - this.tMax) / (this.tau * 0.15))) : 1;
    return this.fireballR * Math.max(0.03, g) * late;
  }

  /** altura del centro del sombrero del hongo */
  capZ(t: number): number {
    const z0 = this.h + (this.contact > 0 ? this.fireballR * 0.4 : 0);
    if (this.highAltitude) return this.h;
    const zc = (this.capTop + this.capBottom) / 2;
    const k = 1 - Math.exp(-Math.max(0, t) / this.tau);
    return z0 + (Math.max(zc, z0) - z0) * k;
  }
  capRadius(t: number): number {
    const k = 1 - Math.exp(-Math.max(0, t) / (this.tau * 1.4));
    // tras estabilizarse, el sombrero se sigue extendiendo lateralmente mientras se diluye
    const spread = 1 + 0.9 * this.dissipation(t);
    return Math.max(this.fireballR * 1.1, this.capR * (0.12 + 0.88 * k) * spread);
  }
  /** desplazamiento por el viento de la nube a altura z */
  drift(t: number, zFrac: number): [number, number] {
    const t0 = this.tau * 1.2;
    if (t < t0) return [0, 0];
    const dt = t - t0;
    if (this.env.windProfile?.length) {
      // perfil real: cada altura deriva con su propio viento
      const W = windAt(this.env, Math.max(10, zFrac * this.capTop));
      const a = ((W.fromDeg + 180) * Math.PI) / 180, ms = W.kmh / 3.6;
      return [Math.sin(a) * ms * dt, Math.cos(a) * ms * dt];
    }
    const shear = 0.5 + 1.2 * zFrac; // el viento es más fuerte en altura
    return [this.wind[0] * dt * shear, this.wind[1] * dt * shear];
  }
  /** opacidad global de la nube (se disipa con las horas) */
  cloudFade(t: number): number {
    const k = Math.max(0, Math.min(1, (t - this.fade0) / (this.fade1 - this.fade0)));
    return 1 - k * k * (3 - 2 * k);
  }
  /** 0..1: lo avanzada que está la disipación (más erosión, más dispersión) */
  dissipation(t: number): number {
    return Math.max(0, Math.min(1, (t - this.tau * 3) / (this.fade1 - this.tau * 3)));
  }
  /** el tronco se deshace antes que el sombrero */
  stemFade(t: number): number {
    const a = this.tau * 4, b = this.tau * 4 + (this.fade0 + this.fade1) * 0.3;
    const k = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return 1 - k * k * (3 - 2 * k);
  }
  /** distancia (m) que ha recorrido el frente de lluvia radiactiva */
  falloutFront(t: number): number {
    return Math.max(4, this.fx.windKmh) * (t / 3600) * 1000 + this.capR;
  }
}
