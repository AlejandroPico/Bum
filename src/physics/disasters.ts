/**
 * Otras catástrofes: rotura de una gran presa y tormenta geomagnética extrema (tipo Carrington).
 * Devuelven la misma estructura de efectos que el resto para que el mapa y los resultados
 * funcionen igual.
 */
import { contours } from 'd3-contour';
import { densityField, nearestCity, CITIES } from '../data/cities';
import type { DamInput, Effects, Environment, FalloutContour, Ring, SolarInput, WarInput } from './types';
import { WAR_PRESETS, climateSeries } from '../data/war';

function base(env: Environment): Pick<Effects, 'thermalFluenceAt' | 'pressurePsiAt' | 'doseRemAt' | 'falloutRateAt' | 'chemical' | 'env' | 'outdoorPct' | 'seismic' | 'shock' | 'groundContact' | 'burstHeightM' | 'fireball' | 'cloud' | 'energyKt' | 'energyJ' | 'windKmh' | 'windFromDeg' | 'noFlash'> {
  return {
    thermalFluenceAt: () => 0, pressurePsiAt: () => 0, doseRemAt: () => 0, falloutRateAt: () => 0, chemical: false, env: { ...env },
    outdoorPct: env.outdoorPct ?? 25, seismic: null, shock: { r: [0, 1e3, 1e7], t: [0, 3, 3e4] }, groundContact: 0, burstHeightM: 0,
    fireball: { radiusM: 0, tMaxS: 0.5, durationS: 1, visible: false },
    cloud: { topM: 50, capBottomM: 30, capRadiusM: 50, stemRadiusM: 10, riseTimeS: 60 },
    energyKt: 0, energyJ: 0, windKmh: env.windKmh, windFromDeg: env.windFromDeg, noFlash: true,
  };
}
const emptyProfile = () => ({ r: [0, 1], pop: [0, 0], deaths: [0, 0], inj: [0, 0], burns: [0, 0] });

// ======================================================================== rotura de presa
/**
 * Caudal punta de la brecha (Froehlich, 2016): Qp = 0,0175·k·(g·V·H²/W)^0,5… se usa la forma
 * empírica clásica Qp ≈ 0,607·V^0,295·H^1,24 (m³/s, V en m³, H en m).
 * La inundación se propaga por el relieve: desde la presa el agua ocupa las celdas más bajas que el
 * nivel de la ola, que disminuye con la distancia recorrida, hasta agotar el volumen del embalse.
 */
export function computeDam(sc: DamInput, env: Environment, lat: number, lon: number): Effects {
  const V = Math.max(0.01, sc.volumeHm3) * 1e6; // m³
  const H = Math.max(5, sc.heightM);
  const Qp = 0.607 * Math.pow(V, 0.295) * Math.pow(H, 1.24);
  const Ld = 12000 * Math.pow(V / 1e9, 0.35) + 3000; // m, escala de atenuación de la ola
  const R = Math.min(250e3, Math.max(15e3, Ld * 6));
  const N = 260, cell = (2 * R) / N;
  const cosL = Math.cos((lat * Math.PI) / 180);
  const dem = sc.dem ?? null;
  const notes: string[] = [];
  const depth = new Float32Array(N * N);
  const arrival = new Float32Array(N * N).fill(-1);
  let floodKm2 = 0, reach = 0, demOk = false;
  if (dem) {
    const elev = new Float32Array(N * N);
    let valid = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const e = -R + (i + 0.5) * cell, n = -R + (j + 0.5) * cell;
      const z = dem(lat + n / 110570, lon + e / (111320 * cosL));
      elev[j * N + i] = z ?? NaN;
      if (z != null) valid++;
    }
    demOk = valid > N * N * 0.5;
    if (demOk) {
      // pie de la presa: punto más bajo en 1,5 km a la redonda
      const c0 = Math.floor(N / 2), rr = Math.max(2, Math.ceil(1500 / cell));
      let zb = Infinity, bi = c0, bj = c0;
      for (let j = c0 - rr; j <= c0 + rr; j++) for (let i = c0 - rr; i <= c0 + rr; i++) { const z = elev[j * N + i]; if (z < zb) { zb = z; bi = i; bj = j; } }
      const hw = H * 0.75; // altura útil de la ola junto a la presa
      /** altura de la ola sobre el fondo del valle a la distancia d recorrida */
      const wave = (d: number) => hw * Math.exp(-d / Ld) + 1;
      // propagación por orden de distancia (Dijkstra sobre la rejilla); el nivel del agua se mide
      // sobre el punto más bajo encontrado en el camino, así la ola sigue el valle cuesta abajo
      const dist = new Float64Array(N * N).fill(Infinity);
      const floor = new Float32Array(N * N).fill(Infinity);
      const heap: [number, number][] = [];
      const push = (d: number, k: number) => { heap.push([d, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
      const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
      const k0 = bj * N + bi;
      dist[k0] = 0; floor[k0] = zb; push(0, k0);
      let vol = 0;
      const cellA = cell * cell;
      const maxD = Ld * 8;
      while (heap.length && vol < V) {
        const [d, k] = pop();
        if (d > dist[k] || d > maxD) continue;
        const z = elev[k];
        const L = floor[k] + wave(d);
        if (!(z < L)) continue;
        const dep = L - z;
        depth[k] = dep;
        vol += dep * cellA * 0.06; // la ola pasa: sólo una pequeña parte del agua queda almacenada en cada celda
        // velocidad del frente: de unos 8 m/s junto a la presa a 1,5 m/s lejos (Teton, Banqiao)
        arrival[k] = d / (1.5 + 6.5 * Math.exp(-d / (Ld * 1.5))) / 3600;
        const i = k % N, j = (k - i) / N;
        for (const [di, dj, w] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [-1, 1, 1.414], [1, -1, 1.414], [-1, -1, 1.414]]) {
          const ni = i + di, nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
          const nk = nj * N + ni, nd = d + w * cell;
          const ez = elev[nk];
          if (!(ez === ez)) continue;
          const fl = Math.min(floor[k], ez);
          // el agua no remonta: sólo pasa a celdas por debajo del nivel actual
          if (nd < dist[nk] && ez < fl + wave(nd) && ez < L) { dist[nk] = nd; floor[nk] = fl; push(nd, nk); }
        }
      }
      for (let k = 0; k < N * N; k++) if (depth[k] > 0.1) { floodKm2 += cellA / 1e6; const i = k % N, j = (k - i) / N; reach = Math.max(reach, Math.hypot(-R + (i + 0.5) * cell, -R + (j + 0.5) * cell)); }
      notes.push(`La ola de la rotura recorrería unos ${Math.round(reach / 1000)} km por el valle e inundaría ${Math.round(floodKm2).toLocaleString('es-ES')} km² siguiendo el relieve real (modelo digital del terreno de AWS).`);
    }
  }
  if (!demOk) notes.push('No se pudo cargar el relieve: la zona inundada no se dibuja con precisión. Comprueba la conexión.');

  // contornos por profundidad del agua
  const levels: [number, string, string][] = [[5, 'Agua > 5 m (arrastra edificios)', '#1d4ed8'], [1, 'Agua 1–5 m', '#3b82f6'], [0.1, 'Agua < 1 m', '#93c5fd']];
  const fallout: FalloutContour[] = [];
  if (floodKm2 > 0) {
    const cs = contours().size([N, N]).thresholds(levels.map((l) => l[0]))(Array.from(depth));
    for (const c of cs) {
      const meta = levels.find((l) => l[0] === c.value)!;
      if (!c.coordinates.length) continue;
      let cells = 0, maxD = 0;
      for (let k = 0; k < depth.length; k++) if (depth[k] >= c.value) { cells++; const i = k % N, j = (k - i) / N; maxD = Math.max(maxD, Math.hypot(-R + (i + 0.5) * cell, -R + (j + 0.5) * cell)); }
      const polys = c.coordinates.map((poly) => poly.map((ring) => ring.map(([gi, gj]) => [-R + gi * cell, -R + gj * cell] as [number, number])));
      fallout.push({ level: c.value, label: meta[1], color: meta[2], polygons: polys, areaKm2: (cells * cell * cell) / 1e6, maxDownwindKm: maxD / 1000 });
    }
    fallout.sort((a, b) => a.level - b.level);
  }
  const sample = (arr: Float32Array, eM: number, nM: number) => {
    const i = Math.floor((eM + R) / cell), j = Math.floor((nM + R) / cell);
    return i < 0 || j < 0 || i >= N || j >= N ? 0 : arr[j * N + i];
  };
  // población y víctimas: mortalidad según profundidad y tiempo de aviso (Jonkman, 2007)
  const field = densityField(lat, lon, R / 1000 + 50);
  let popF = 0, deaths = 0, inj = 0;
  for (let j = 0; j < N; j += 2) for (let i = 0; i < N; i += 2) {
    const d = depth[j * N + i];
    if (d <= 0.1) continue;
    const pop = field.at((-R + (i + 1) * cell) / 1000, (-R + (j + 1) * cell) / 1000) * (4 * cell * cell) / 1e6;
    const tH = arrival[j * N + i];
    const warn = tH < 0.5 ? 1 : tH < 2 ? 0.4 : 0.1; // sin tiempo para huir cerca de la presa
    const fr = d > 5 ? 0.12 : d > 2 ? 0.03 : 0.004;
    popF += pop; deaths += pop * fr * warn; inj += pop * fr * warn * 2;
  }
  // dirección media de la inundación y velocidad media del frente (para dibujarla avanzando)
  let ce = 0, cn = 0, cw = 0, maxT = 0;
  for (let k = 0; k < N * N; k++) if (depth[k] > 0.1) { const i = k % N, j = (k - i) / N; ce += (-R + (i + 0.5) * cell) * depth[k]; cn += (-R + (j + 0.5) * cell) * depth[k]; cw += depth[k]; maxT = Math.max(maxT, arrival[k]); }
  const flowFrom = cw > 0 ? ((Math.atan2(-ce, -cn) * 180) / Math.PI + 360) % 360 : 0;
  const flowKmh = maxT > 0 ? Math.max(3, reach / 1000 / maxT) : 10;
  const rings: Ring[] = [{ id: 'dam', group: 'crater', label: 'Presa', radiusM: Math.max(150, H * 2), color: '#60a5fa', desc: 'Lugar de la rotura.' }];
  notes.unshift(`Rotura de una presa de ${Math.round(H)} m con ${Math.round(sc.volumeHm3).toLocaleString('es-ES')} hm³ embalsados: caudal punta de unos ${Math.round(Qp).toLocaleString('es-ES')} m³/s (${Math.round(Qp / 430).toLocaleString('es-ES')} veces el caudal medio del Ebro en su desembocadura).`);
  notes.push('Modelo simplificado: la ola se atenúa con la distancia y llena las zonas más bajas que su nivel. Las presas reales tienen planes de emergencia con avisos y evacuación aguas abajo.');
  return {
    ...base(env),
    scenario: sc, rings, fallout, windKmh: flowKmh, windFromDeg: flowFrom,
    casualties: { deaths, injuries: inj, exposed: popF, profile: emptyProfile(), cityName: nearestCity(lat, lon).city.name },
    notes,
    dam: { volumeHm3: sc.volumeHm3, heightM: H, peakM3s: Qp, floodKm2, reachKm: reach / 1000, popFlooded: popF, arrivalAt: (e, n) => { const a = sample(arrival, e, n); return a > 0 ? a : null; }, depthAt: (e, n) => sample(depth, e, n), demOk },
  } as Effects;
}

// ======================================================================== tormenta solar
/** polo geomagnético norte (IGRF-14, 2025) */
const POLE = { lat: 80.8, lon: -72.6 };
/** latitud geomagnética (dipolo centrado) */
export function geomagLat(lat: number, lon: number): number {
  const r = Math.PI / 180;
  const s = Math.sin(lat * r) * Math.sin(POLE.lat * r) + Math.cos(lat * r) * Math.cos(POLE.lat * r) * Math.cos((lon - POLE.lon) * r);
  return Math.asin(Math.max(-1, Math.min(1, s))) / r;
}
/** borde ecuatorial del óvalo auroral según el índice Dst (Yokoyama et al. 1998; casos de 1859, 1921, 1989, 2003 y 2024) */
export function auroraBoundary(dstNt: number): number {
  const D = [50, 100, 200, 400, 589, 900, 1200, 1760, 2500];
  const M = [62, 58, 53, 46, 41, 33, 28, 21, 15];
  const x = Math.abs(dstNt);
  if (x <= D[0]) return M[0];
  for (let i = 1; i < D.length; i++) if (x <= D[i]) return M[i - 1] + ((M[i] - M[i - 1]) * (x - D[i - 1])) / (D[i] - D[i - 1]);
  return M[M.length - 1];
}

export function computeSolar(sc: SolarInput, env: Environment, lat: number, lon: number): Effects {
  const dst = -Math.abs(sc.dstNt);
  const A = auroraBoundary(dst);
  const bands = [
    { mlat: Math.min(75, A + 12), label: 'Bajo el óvalo auroral', color: '#ef4444', risk: 'Riesgo muy alto para transformadores y redes largas' },
    { mlat: A, label: 'Borde de las auroras', color: '#f97316', risk: 'Riesgo alto: corrientes inducidas en líneas de alta tensión' },
    { mlat: Math.max(0, A - 12), label: 'Latitudes medias', color: '#facc15', risk: 'Riesgo moderado: fallos puntuales' },
  ];
  // población en la zona de riesgo alto o muy alto (ciudades de la base de datos y fondo rural)
  let popHigh = 0;
  for (const c of CITIES) if (Math.abs(geomagLat(c.lat, c.lon)) >= A - 3) popHigh += c.popM * 1e6;
  const scale = Math.abs(dst) / 850;
  // coste: Lloyd's (2013) para EE. UU. con una tormenta como la de 1859: 0,6–2,6 billones de dólares
  const cost: [number, number] = [Math.round(0.6 * scale * 2.5 * 10) / 10, Math.round(2.6 * scale * 2.5 * 10) / 10];
  const here = geomagLat(lat, lon);
  const notes = [
    `Tormenta geomagnética con Dst ≈ ${Math.round(dst)} nT: las auroras se verían hasta unos ${Math.round(A)}° de latitud geomagnética${Math.abs(here) >= A ? ' (también en el lugar elegido)' : ''}.`,
    'Las corrientes inducidas en el suelo recorren las líneas de alta tensión y pueden quemar grandes transformadores, que tardan meses en sustituirse. En marzo de 1989, una tormenta mucho menor dejó sin luz Quebec durante 9 horas.',
    'Se perderían o dañarían satélites, el GPS daría errores de decenas de metros y las radiocomunicaciones de onda corta caerían durante horas o días. En 1859 los telégrafos echaron chispas y algunos funcionaron sin baterías.',
    'No hay riesgo directo para las personas en tierra: la atmósfera y el campo magnético protegen de la radiación. El peligro son los apagones largos y sus consecuencias (agua, hospitales, comunicaciones).',
  ];
  return {
    ...base(env),
    scenario: sc, rings: [], fallout: [],
    casualties: { deaths: 0, injuries: 0, exposed: popHigh, profile: emptyProfile(), cityName: nearestCity(lat, lon).city.name },
    notes,
    solar: { dstNt: dst, auroraMlat: A, bands, popHighRisk: popHigh, costUSDtn: cost, mlatAt: geomagLat },
  } as Effects;
}

// ======================================================================== guerra e invierno nuclear
export function computeWar(sc: WarInput, env: Environment, lat: number, lon: number): Effects {
  const p = WAR_PRESETS.find((x) => x.id === sc.preset) ?? WAR_PRESETS[0];
  const n0 = (x: number) => Math.round(x).toLocaleString('es-ES');
  const notes = [
    `${p.note} Explosiones: ${n0(p.warheads)} ojivas de ${n0(p.yieldKt)} kt (${n0((p.warheads * p.yieldKt) / 1000)} Mt en total). En el mapa se marcan ${p.targets.length} objetivos representativos.`,
    `Los incendios de las ciudades elevarían unos ${n0(p.sootTg)} millones de toneladas de hollín a la estratosfera, donde el sol lo calienta y lo mantiene años. La temperatura media del planeta bajaría unos ${p.coolingC.toLocaleString('es-ES')} °C y las lluvias un ${p.precipPct} %.`,
    `Con menos luz, frío y menos lluvia caerían las cosechas, la pesca y la ganadería: las calorías disponibles en el mundo bajarían alrededor de un ${p.caloriesPct} % a los 3–5 años. Unos ${n0(p.famineDeathsM)} millones de personas podrían morir de hambre, muchas más que por las explosiones (${n0(p.directDeathsM)} millones).`,
    'Los países que no participan en la guerra sufrirían igualmente la hambruna: el invierno nuclear es planetario. Cifras de Xia et al. (2022) y Toon et al. (2019); los casos intermedios de calorías se han interpolado.',
  ];
  return {
    ...base(env),
    scenario: sc, rings: [], fallout: [],
    energyKt: p.warheads * p.yieldKt, energyJ: p.warheads * p.yieldKt * 4.184e12,
    casualties: { deaths: p.directDeathsM * 1e6, injuries: p.famineDeathsM * 1e6, exposed: 0, profile: emptyProfile(), cityName: nearestCity(lat, lon).city.name },
    notes,
    war: { preset: p.id, sides: p.sides, warheads: p.warheads, yieldKt: p.yieldKt, sootTg: p.sootTg, directDeathsM: p.directDeathsM, famineDeathsM: p.famineDeathsM, coolingC: p.coolingC, precipPct: p.precipPct, caloriesPct: p.caloriesPct, targets: p.targets, series: climateSeries(p) },
  } as Effects;
}
