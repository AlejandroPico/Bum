/**
 * Hospitales y sanidad tras la explosión: cuántos hospitales quedan en pie, cuántas camas libres
 * habría y cuántos heridos se quedarían sin atender. Criterios orientativos:
 *  - un hospital con más de 5 psi queda destruido; entre 1 y 5 psi, dañado (funciona en parte, ~40 %);
 *  - sin dato de camas en OpenStreetMap se suponen 150 (hospital general mediano en Europa);
 *  - los hospitales están ocupados al 80 %: dando altas y abriendo camas de emergencia, se podría
 *    disponer de un 35 % de las camas en funcionamiento;
 *  - necesitarían ingreso alrededor de la mitad de los heridos (los graves: fracturas, quemaduras,
 *    heridas por cristales, síndrome de radiación).
 * En Hiroshima murieron o resultaron heridos 270 de los 300 médicos de la ciudad y 1.654 de sus
 * 1.780 enfermeras (Comité de Hiroshima y Nagasaki, 1981).
 */
import type { Effects } from './types';
import type { Hospital } from '../data/osm';

export type HospState = 'destroyed' | 'damaged' | 'ok';
export interface HealthReport {
  hospitals: (Hospital & { state: HospState; psi: number; bedsEst: number })[];
  destroyed: number; damaged: number; ok: number;
  bedsTotal: number; bedsUsable: number; bedsGuessed: number;
  injured: number; needBeds: number; unattended: number; burns: number;
  radiusM: number;
}
export const DEFAULT_BEDS = 150;

export function assessHealth(strikes: { fx: Effects; lat: number; lon: number }[], list: Hospital[], radiusM: number): HealthReport {
  const hospitals = list.map((ho) => {
    let psi = 0;
    for (const s of strikes) {
      const cos = Math.cos((s.lat * Math.PI) / 180);
      const d = Math.hypot((ho.lat - s.lat) * 110570, (ho.lon - s.lon) * 111320 * cos);
      psi = Math.max(psi, s.fx.pressurePsiAt(d));
    }
    const state: HospState = psi >= 5 ? 'destroyed' : psi >= 1 ? 'damaged' : 'ok';
    return { ...ho, psi, state, bedsEst: ho.beds ?? DEFAULT_BEDS };
  });
  const cnt = (s: HospState) => hospitals.filter((x) => x.state === s).length;
  const bedsTotal = hospitals.reduce((a, x) => a + x.bedsEst, 0);
  const working = hospitals.reduce((a, x) => a + x.bedsEst * (x.state === 'ok' ? 1 : x.state === 'damaged' ? 0.4 : 0), 0);
  const bedsUsable = Math.round(working * 0.35);
  const injured = strikes.reduce((a, s) => a + s.fx.casualties.injuries, 0);
  // el perfil es acumulado desde la zona cero: el último valor es el total
  const burns = strikes.reduce((a, s) => { const b = s.fx.casualties.profile?.burns ?? []; return a + (b[b.length - 1] ?? 0); }, 0);
  const needBeds = Math.round(injured * 0.5);
  return {
    hospitals, destroyed: cnt('destroyed'), damaged: cnt('damaged'), ok: cnt('ok'),
    bedsTotal, bedsUsable, bedsGuessed: hospitals.filter((x) => x.beds == null).length,
    injured, needBeds, unattended: Math.max(0, needBeds - bedsUsable), burns: Math.round(burns), radiusM,
  };
}
