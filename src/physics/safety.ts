/**
 * «¿Estoy a salvo?»: qué efectos alcanzan un punto concreto, cuándo llegan y qué conviene hacer.
 * Las recomendaciones siguen las guías públicas de protección civil (FEMA 2022, «Get inside,
 * stay inside, stay tuned»; Kearny 1987) y los umbrales de Glasstone y Dolan.
 */
import type { Effects } from './types';
import { casualtyProbs } from './effects';
import { interpTable } from './blast';

export type Level = 'extremo' | 'grave' | 'riesgo' | 'bajo' | 'fuera';

export interface SafetyItem { label: string; value: string; level: Level; detail: string }
export interface SafetyReport {
  distanceKm: number;
  bearingDeg: number;
  level: Level;
  headline: string;
  pDeath: number;
  pInjury: number;
  items: SafetyItem[];
  advice: string[];
  /** segundos hasta que llega la onda expansiva (null si no llega con fuerza) */
  shockS: number | null;
  /** horas hasta que empieza a caer la lluvia radiactiva (null si no cae) */
  falloutH: number | null;
}

const R_EARTH = 6371e3;
const rad = Math.PI / 180;
/** desplazamiento local (m al este y al norte) de un punto respecto a la zona cero */
export function localOffset(gzLat: number, gzLon: number, lat: number, lon: number): { e: number; n: number; d: number; bearing: number } {
  const p1 = gzLat * rad, p2 = lat * rad, dl = (lon - gzLon) * rad;
  const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const d = 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(a)));
  const y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  const bearing = (Math.atan2(y, x) / rad + 360) % 360;
  return { e: d * Math.sin(bearing * rad), n: d * Math.cos(bearing * rad), d, bearing };
}

const fmtS = (s: number) => (s < 90 ? `${Math.max(1, Math.round(s))} s` : s < 5400 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1).replace('.', ',')} h`);
const fmtH = (h: number) => (h < 1.5 ? `${Math.max(5, Math.round(h * 60))} min` : h < 48 ? `${h.toFixed(h < 10 ? 1 : 0).replace('.', ',')} h` : `${(h / 24).toFixed(1).replace('.', ',')} días`);
const n1 = (x: number, d = 1) => x.toLocaleString('es-ES', { maximumFractionDigits: d });
const ORDER: Level[] = ['fuera', 'bajo', 'riesgo', 'grave', 'extremo'];
const worst = (a: Level, b: Level) => (ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b);

export function assessPoint(fx: Effects, gzLat: number, gzLon: number, lat: number, lon: number): SafetyReport {
  const o = localOffset(gzLat, gzLon, lat, lon);
  const d = o.d;
  const items: SafetyItem[] = [];
  const advice: string[] = [];
  let level: Level = 'fuera';
  let shockS: number | null = null, falloutH: number | null = null;
  const sc = fx.scenario;

  // cráter y bola de fuego
  if (fx.crater && d < fx.crater.diameterM / 2) {
    items.push({ label: 'Cráter', value: 'dentro', level: 'extremo', detail: 'El terreno desaparece: el punto queda dentro del cráter.' });
    level = 'extremo';
  } else if (fx.fireball.visible && fx.groundContact > 0 && d < fx.fireball.radiusM) {
    items.push({ label: 'Bola de fuego', value: 'dentro', level: 'extremo', detail: 'Todo se vaporiza dentro de la bola de fuego.' });
    level = 'extremo';
  }

  // onda expansiva
  const psi = fx.pressurePsiAt(d);
  if (psi >= 0.2) {
    const lv: Level = psi >= 20 ? 'extremo' : psi >= 5 ? 'grave' : psi >= 1 ? 'riesgo' : 'bajo';
    const what = psi >= 20 ? 'Destrucción de casi todos los edificios, incluso de hormigón.' : psi >= 5 ? 'Se derrumban la mayoría de las casas; heridas graves por escombros.' : psi >= 1 ? 'Cristales y ventanas rotos, puertas arrancadas; muchas heridas por fragmentos de vidrio.' : 'Rotura de algunos cristales.';
    shockS = fx.shock.r.length > 1 ? interpTable(fx.shock.r, fx.shock.t, d) : null;
    items.push({ label: 'Onda expansiva', value: `${n1(psi, psi < 1 ? 2 : 1)} psi${shockS ? ` · llega a los ${fmtS(shockS)}` : ''}`, level: lv, detail: what });
    level = worst(level, lv);
  }

  // calor
  const q = fx.thermalFluenceAt(d);
  if (q >= 1.5 && !fx.noFlash) {
    const lv: Level = q >= 10 ? 'extremo' : q >= 5 ? 'grave' : q >= 3 ? 'riesgo' : 'bajo';
    const what = q >= 10 ? 'Quemaduras de tercer grado en la piel expuesta; se incendian ropa, papel y madera.' : q >= 5 ? 'Quemaduras de segundo grado en la piel expuesta.' : q >= 3 ? 'Quemaduras de primer o segundo grado en la piel expuesta.' : 'Quemaduras leves, como de sol.';
    items.push({ label: 'Calor del destello', value: `${n1(q)} cal/cm²`, level: lv, detail: `${what} Cualquier sombra (un muro, un coche) protege.` });
    level = worst(level, lv);
  }

  // radiación inicial
  const rem = fx.doseRemAt(d);
  if (rem >= 5) {
    const lv: Level = rem >= 600 ? 'extremo' : rem >= 200 ? 'grave' : rem >= 50 ? 'riesgo' : 'bajo';
    const what = rem >= 600 ? 'Dosis probablemente mortal sin tratamiento médico intensivo.' : rem >= 200 ? 'Síndrome de radiación: náuseas, caída del pelo y defensas bajas; muchas personas necesitan atención médica.' : rem >= 50 ? 'Cambios en la sangre; aumenta algo el riesgo de cáncer a largo plazo.' : 'Dosis baja, sin efectos inmediatos.';
    items.push({ label: 'Radiación inicial', value: `${n1(rem, 0)} rem`, level: lv, detail: `${what} Un edificio de hormigón la reduce varias veces.` });
    level = worst(level, lv);
  }

  // lluvia radiactiva (armas) o depósito (liberaciones)
  if (fx.release) {
    const kBq = fx.release.depositAt(o.e, o.n);
    if (kBq >= 10) {
      const z = fx.fallout.filter((f) => kBq >= f.level).pop();
      const lv: Level = z ? (fx.fallout.indexOf(z) >= fx.fallout.length - 1 ? 'grave' : 'riesgo') : 'bajo';
      items.push({ label: 'Contaminación del suelo', value: `${n1(kBq, 0)} kBq/m²`, level: lv, detail: z ? `${z.label}. Evita alimentos y agua locales sin control; sigue las órdenes de evacuación.` : 'Contaminación medible pero por debajo de los umbrales de protección.' });
      level = worst(level, lv);
    }
  } else {
    const r1 = fx.falloutRateAt(o.e, o.n);
    if (r1 >= 0.5) {
      const tA = fx.falloutArrivalH?.(o.e, o.n) ?? 1;
      falloutH = tA;
      const d48 = fx.falloutDoseAt?.(o.e, o.n, 0, 48, 1) ?? 0;
      const d48b = fx.falloutDoseAt?.(o.e, o.n, 0, 48, 10) ?? 0;
      const d48s = fx.falloutDoseAt?.(o.e, o.n, 0, 48, 40) ?? 0;
      const lv: Level = d48 >= 600 ? 'extremo' : d48 >= 150 ? 'grave' : d48 >= 25 ? 'riesgo' : 'bajo';
      items.push({ label: 'Lluvia radiactiva', value: `empieza en ${fmtH(tA)} · ${n1(r1, r1 < 10 ? 1 : 0)} R/h a H+1`, level: lv,
        detail: `Dosis en 48 h: ${n1(d48, 0)} rem al aire libre, ${n1(d48b, 0)} rem en un sótano (factor 10) y ${n1(d48s, 0)} rem en el centro de un edificio grande o un refugio (factor 40).` });
      level = worst(level, lv);
    }
  }

  // pulso electromagnético de gran altitud
  if (fx.emp) {
    const kv = fx.emp.fieldAt(d, o.bearing);
    if (kv >= 1) items.push({ label: 'Pulso electromagnético', value: `${n1(kv, 0)} kV/m`, level: kv >= 25 ? 'riesgo' : 'bajo', detail: 'Puede dañar la red eléctrica, transformadores y aparatos conectados a cables largos; las personas no lo notan.' });
  }

  // supervolcán
  if (fx.volcano) {
    const cm = fx.volcano.ashAt(o.e, o.n) * 100; // m → cm
    if (d < fx.volcano.pdcR) { items.push({ label: 'Corrientes piroclásticas', value: 'dentro', level: 'extremo', detail: 'Nubes ardientes de gas y ceniza a cientos de km/h: sólo sirve haberse ido antes.' }); level = 'extremo'; }
    if (cm >= 0.1) {
      const lv: Level = cm >= 30 ? 'grave' : cm >= 5 ? 'riesgo' : 'bajo';
      items.push({ label: 'Ceniza', value: `${n1(cm, cm < 1 ? 1 : 0)} cm`, level: lv, detail: cm >= 30 ? 'Los tejados pueden hundirse por el peso; la ceniza mojada pesa como el hormigón.' : cm >= 5 ? 'Carreteras impracticables, cosechas perdidas, problemas respiratorios.' : 'Capa fina: usa mascarilla y protege los ojos.' });
      level = worst(level, lv);
    }
  }

  // rotura de presa
  if (fx.dam) {
    const dep = fx.dam.depthAt(o.e, o.n), tA = fx.dam.arrivalAt(o.e, o.n);
    if (dep > 0.1) {
      const lv: Level = dep > 5 ? 'extremo' : dep > 2 ? 'grave' : dep > 0.5 ? 'riesgo' : 'bajo';
      items.push({ label: 'Inundación', value: `${n1(dep, dep < 10 ? 1 : 0)} m de agua${tA != null ? ` · llega en ${fmtH(tA)}` : ''}`, level: lv, detail: dep > 5 ? 'La corriente arrastra coches y derriba casas de una planta.' : dep > 2 ? 'El agua cubre la planta baja; la corriente es muy peligrosa.' : 'Agua en las calles y bajos; no intentes cruzarla.' });
      level = worst(level, lv);
      advice.push(`Sube a terreno alto o, si no hay tiempo, a los pisos altos de un edificio sólido${tA != null ? `: la ola tardaría unos ${fmtH(tA)} en llegar` : ''}. Nunca cruces una corriente de agua a pie ni en coche.`);
    }
  }
  // tormenta solar y guerra: efectos planetarios
  if (fx.solar) {
    const m = Math.abs(fx.solar.mlatAt(lat, lon));
    const lv: Level = m >= fx.solar.auroraMlat ? 'riesgo' : m >= fx.solar.auroraMlat - 8 ? 'bajo' : 'fuera';
    items.push({ label: 'Latitud geomagnética', value: `${n1(m, 0)}°`, level: lv, detail: m >= fx.solar.auroraMlat ? 'Bajo el óvalo auroral: verías auroras y la red eléctrica correría un riesgo alto de apagón.' : 'Fuera del óvalo auroral: riesgo menor de apagones, aunque fallarían el GPS y algunas comunicaciones.' });
    level = worst(level, lv);
    advice.push('Ten agua, comida, linterna, pilas y una radio para varios días sin electricidad; las personas no corren peligro directo.');
  }
  if (fx.war) {
    const near = fx.war.targets.reduce((b, t) => Math.min(b, localOffset(t[0], t[1], lat, lon).d), Infinity);
    const lv: Level = near < 10000 ? 'extremo' : near < 50000 ? 'grave' : 'riesgo';
    items.push({ label: 'Objetivo más cercano', value: `a ${n1(near / 1000, 0)} km`, level: lv, detail: 'Además de las explosiones, el invierno nuclear y la hambruna afectarían a todo el planeta durante años.' });
    level = worst(level, lv);
    advice.push('En un intercambio así, lejos de los objetivos lo decisivo sería sobrevivir a la lluvia radiactiva de los primeros días y, después, a la escasez de alimentos.');
  }

  const { pd, pinj } = fx.release || fx.volcano || fx.dam || fx.solar || fx.war ? { pd: 0, pinj: 0 } : casualtyProbs(fx, d);

  // recomendaciones
  if (level === 'extremo') advice.push('En este punto las probabilidades de sobrevivir son muy bajas. La única protección real es no estar allí: alejarse con tiempo si hay aviso.');
  if (!fx.noFlash && (q >= 1.5 || psi >= 0.5)) {
    advice.push('Si ves un destello muy brillante: no mires hacia él, túmbate boca abajo detrás de algo sólido y cúbrete la cabeza y la piel.');
    if (shockS && shockS > 2) advice.push(`La onda expansiva tardaría unos ${fmtS(shockS)} en llegar: es tiempo para apartarte de las ventanas y echarte al suelo junto a una pared interior.`);
  }
  if (falloutH != null) {
    advice.push(`Antes de que empiece la lluvia radiactiva (en unos ${fmtH(falloutH)}) entra en el edificio más sólido que tengas cerca y ve al sótano o al centro, lejos de paredes exteriores y del tejado.`);
    advice.push('Quédate dentro al menos 24 horas: la radiactividad cae unas diez veces cada siete horas (regla del 7-10). Sigue las instrucciones oficiales por radio, móvil o televisión.');
    advice.push('Si estuviste fuera cuando caía, quítate la ropa exterior, guárdala en una bolsa y lávate con agua y jabón (sin acondicionador).');
  }
  if (fx.release) advice.push('Sigue las órdenes de confinamiento o evacuación y las indicaciones sobre comprimidos de yodo; no los tomes por tu cuenta.');
  if (sc.kind === 'asteroid' && fx.tsunami) advice.push('Si estás en la costa, aléjate hacia terreno alto en cuanto haya aviso de tsunami.');
  if (level === 'fuera' || level === 'bajo') advice.push('Aquí no llegan efectos graves. Aun así, mantente informado: el viento puede cambiar y desplazar la lluvia radiactiva.');

  const headline = {
    extremo: 'Peligro extremo',
    grave: 'Peligro grave',
    riesgo: 'Riesgo moderado',
    bajo: 'Efectos leves',
    fuera: 'Fuera del alcance de los efectos',
  }[level];
  return { distanceKm: d / 1000, bearingDeg: o.bearing, level, headline, pDeath: pd, pInjury: pinj, items, advice, shockS, falloutH };
}
