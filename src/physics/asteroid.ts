/**
 * Entrada atmosférica e impacto de asteroides / cometas.
 * Collins, Melosh & Marcus (2005), "Earth Impact Effects Program: A Web-based
 * computer program for calculating the regional environmental consequences of a
 * meteoroid impact on Earth", Meteoritics & Planetary Science 40, 817–840.
 */
import type { AsteroidInput, AsteroidInfo, TargetType } from './types';

const H = 8000; // m, altura de escala
const RHO0 = 1.0; // kg/m3 (Collins usa ρ0 = 1 kg/m³ en superficie)
const CD = 2;
const FP = 7; // factor "pancake"
const G = 9.81;
export const KT_J = 4.184e12;

export const TARGET_DENSITY: Record<TargetType, number> = { sediment: 2500, rock: 2750, water: 1000 };

export interface EntryResult extends AsteroidInfo {
  /** diámetro del cuerpo (o nube de fragmentos) al llegar al suelo */
  groundDiameterM: number;
}

export function atmosphericEntry(a: AsteroidInput): EntryResult {
  const L0 = a.diameterM;
  const rhoI = a.densityKgM3;
  const v0 = a.velocityKms * 1000;
  const th = (Math.max(5, Math.min(90, a.angleDeg)) * Math.PI) / 180;
  const sinT = Math.sin(th);
  const mass = (Math.PI / 6) * rhoI * L0 ** 3;
  const energyJ = 0.5 * mass * v0 * v0;

  // resistencia del material (Pa)
  const Yi = Math.pow(10, 2.107 + 0.0624 * Math.sqrt(rhoI));
  const If = (4.07 * CD * H * Yi) / (rhoI * L0 * v0 * v0 * sinT);
  const rho = (z: number) => RHO0 * Math.exp(-z / H);

  let fate: AsteroidInfo['fate'] = 'intact';
  let breakupAltM: number | null = null;
  let airburstAltM: number | null = null;
  let vImpact: number;
  let groundD = L0;

  if (If >= 1) {
    // llega intacto
    vImpact = v0 * Math.exp((-3 * RHO0 * CD * H) / (4 * rhoI * L0 * sinT));
  } else {
    const zs = -H * (Math.log(Yi / (RHO0 * v0 * v0)) + 1.308 - 0.314 * If - 1.303 * Math.sqrt(1 - If));
    breakupAltM = zs;
    const vz = v0 * Math.exp((-3 * rho(zs) * CD * H) / (4 * rhoI * L0 * sinT));
    const l = L0 * sinT * Math.sqrt(rhoI / (CD * rho(zs)));
    const zb = zs - 2 * H * Math.log(1 + (l / (2 * H)) * Math.sqrt(FP * FP - 1));
    const Lz = (z: number) => L0 * Math.sqrt(1 + Math.pow((2 * H) / l, 2) * Math.pow(Math.exp((zs - z) / (2 * H)) - 1, 2));
    // integración de la deceleración de la nube de fragmentos
    const integ = (zEnd: number) => {
      const n = 400;
      let s = 0;
      const dz = (zs - zEnd) / n;
      for (let i = 0; i < n; i++) {
        const z = zs - (i + 0.5) * dz;
        s += Math.exp((zs - z) / H) * Lz(z) ** 2 * dz;
      }
      return s;
    };
    const coef = (3 / 4) * ((CD * rho(zs)) / (rhoI * L0 ** 3 * sinT));
    if (zb > 0) {
      fate = 'airburst';
      airburstAltM = zb;
      vImpact = vz * Math.exp(-coef * integ(zb));
      groundD = FP * L0;
    } else {
      fate = 'fragmented-impact';
      vImpact = vz * Math.exp(-coef * integ(0));
      groundD = Lz(0);
    }
  }

  const impactEnergyJ = fate === 'airburst' ? energyJ : 0.5 * mass * vImpact * vImpact;
  const eMt = energyJ / (KT_J * 1000);
  return {
    massKg: mass,
    energyJ,
    breakupAltM,
    airburstAltM,
    impactVelocityKms: vImpact / 1000,
    impactEnergyKt: impactEnergyJ / KT_J,
    recurrenceYears: 109 * Math.pow(eMt, 0.78),
    fate,
    groundDiameterM: groundD,
  };
}

export interface CraterResult {
  transientM: number;
  diameterM: number;
  depthM: number;
  type: 'simple' | 'complex' | 'water';
  waterTransientM?: number;
}

/** Cráter final (Collins et al. 2005, ec. 21–28). */
export function impactCrater(a: AsteroidInput, vImpactKms: number): CraterResult {
  const L = a.diameterM;
  const rhoI = a.densityKgM3;
  const th = (Math.max(5, Math.min(90, a.angleDeg)) * Math.PI) / 180;
  let v = vImpactKms * 1000;
  let waterTransient: number | undefined;
  let rhoT = TARGET_DENSITY[a.target];
  if (a.target === 'water') {
    waterTransient = 1.365 * Math.cbrt(rhoI / 1000) * L ** 0.78 * v ** 0.44 * G ** -0.22 * Math.cbrt(Math.sin(th));
    // velocidad al llegar al fondo marino
    v = v * Math.exp((-3 * 1000 * CD * a.waterDepthM) / (2 * rhoI * L * Math.sin(th)));
    rhoT = 2500;
  }
  const Dtc = 1.161 * Math.cbrt(rhoI / rhoT) * L ** 0.78 * v ** 0.44 * G ** -0.22 * Math.cbrt(Math.sin(th));
  let Dfr: number, depth: number, type: CraterResult['type'];
  if (Dtc * 1.25 < 3200) {
    Dfr = 1.25 * Dtc;
    depth = Dtc / (2 * Math.SQRT2) * 0.85; // brecha incluida
    type = 'simple';
  } else {
    Dfr = (1.17 * Dtc ** 1.13) / 3200 ** 0.13;
    depth = 1000 * 0.294 * Math.pow(Dfr / 1000, 0.301);
    type = 'complex';
  }
  if (a.target === 'water' && Dtc < 50) type = 'water';
  return { transientM: Dtc, diameterM: Dfr, depthM: depth, type, waterTransientM: waterTransient };
}
