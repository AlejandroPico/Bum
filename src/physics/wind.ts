import type { Environment, WindLevel } from './types';

/** viento (este, norte) en km/h HACIA donde sopla */
const vec = (fromDeg: number, kmh: number): [number, number] => {
  const a = (fromDeg * Math.PI) / 180;
  return [-kmh * Math.sin(a), -kmh * Math.cos(a)];
};
const unvec = (u: number, v: number) => ({ kmh: Math.hypot(u, v), fromDeg: ((Math.atan2(-u, -v) * 180) / Math.PI + 360) % 360 });

/**
 * Viento interpolado a la altura z (m) y, si hay previsión horaria, a las tH horas de la explosión
 * (interpolación lineal entre la hora anterior y la siguiente; más allá de la previsión se usa la última).
 */
export function windAt(env: Environment, z: number, tH = 0): { kmh: number; fromDeg: number } {
  const Hh = env.windHourly;
  if (Hh && Hh.length > 1 && tH > 0) {
    const f = Math.min(tH, Hh.length - 1);
    const i = Math.floor(f), k = f - i;
    const a = profileAt(Hh[i], z, env), b = profileAt(Hh[Math.min(i + 1, Hh.length - 1)], z, env);
    if (k < 1e-6) return a;
    const [ua, va] = vec(a.fromDeg, a.kmh), [ub, vb] = vec(b.fromDeg, b.kmh);
    return unvec(ua + (ub - ua) * k, va + (vb - va) * k);
  }
  return profileAt(env.windProfile, z, env);
}

function profileAt(P: WindLevel[] | null | undefined, z: number, env: Environment): { kmh: number; fromDeg: number } {
  if (!P || P.length === 0) return { kmh: env.windKmh, fromDeg: env.windFromDeg };
  const L = P.length > 1 && P[0].zM > P[1].zM ? [...P].sort((a, b) => a.zM - b.zM) : P;
  if (z <= L[0].zM) return { kmh: L[0].kmh, fromDeg: L[0].fromDeg };
  if (z >= L[L.length - 1].zM) { const t = L[L.length - 1]; return { kmh: t.kmh, fromDeg: t.fromDeg }; }
  let i = 1;
  while (L[i].zM < z) i++;
  const a = L[i - 1], b = L[i];
  const k = (z - a.zM) / (b.zM - a.zM);
  const [ua, va] = vec(a.fromDeg, a.kmh), [ub, vb] = vec(b.fromDeg, b.kmh);
  return unvec(ua + (ub - ua) * k, va + (vb - va) * k);
}

/**
 * Viento efectivo para la lluvia radiactiva: media vectorial del viento entre el suelo y la cima
 * de la nube, con más peso en la capa del sombrero (de donde cae la mayor parte de la actividad).
 */
export function effectiveWind(env: Environment, cloudTopM: number, capBottomM: number): { kmh: number; fromDeg: number } {
  if (!env.windProfile || env.windProfile.length === 0) return { kmh: env.windKmh, fromDeg: env.windFromDeg };
  const top = Math.max(200, cloudTopM);
  const n = 40;
  let u = 0, v = 0, wsum = 0;
  for (let i = 0; i < n; i++) {
    const z = ((i + 0.5) / n) * top;
    const w = z >= capBottomM ? 2 : 1;
    const W = windAt(env, z);
    const [a, b] = vec(W.fromDeg, W.kmh);
    u += a * w; v += b * w; wsum += w;
  }
  return unvec(u / wsum, v / wsum);
}

export type { WindLevel };
