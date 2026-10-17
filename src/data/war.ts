/**
 * Guerra nuclear a gran escala e invierno nuclear.
 *
 * Escenarios y cifras de Xia, L. et al. (2022), «Global food insecurity and famine from reduced crop,
 * marine fishery and livestock production due to climate disruption from nuclear war soot injection»,
 * Nature Food 3, 586–596 (tabla 1), y de Toon, O. B. et al. (2019), Science Advances 5(10).
 * Clima: Coupe, J. et al. (2019), J. Geophys. Res. 124; Robock, A. et al. (2007), J. Geophys. Res. 112.
 *
 * Los objetivos del mapa son grandes ciudades e instalaciones militares conocidas públicamente: sólo
 * sirven para mostrar la escala del ataque, no reproducen ningún plan de guerra real.
 */
export interface WarPreset {
  id: string;
  name: string;
  sides: [string, string];
  warheads: number;
  yieldKt: number;
  sootTg: number;
  directDeathsM: number;
  famineDeathsM: number;
  /** caída máxima de la temperatura media mundial (°C) */
  coolingC: number;
  /** caída de la precipitación mundial (%) */
  precipPct: number;
  /** caída de las calorías disponibles en el mundo a los 3–5 años (%) */
  caloriesPct: number;
  note: string;
  /** todos los objetivos (los de los dos bandos) */
  targets: [number, number, string][];
  /** objetivos en el territorio de cada bando (los ataca el otro) */
  hit: [[number, number, string][], [number, number, string][]];
  /** zonas de lanzamiento aproximadas de cada bando (bases conocidas públicamente o mares) */
  launch: [[number, number, string][], [number, number, string][]];
  /** bando que lanza primero si no se elige otro */
  first?: 0 | 1;
  /** reparto de las ojivas entre los dos bandos (fracción del primero) */
  shareA?: number;
  /** las cifras de clima y hambre son estimaciones de Bum por comparación con los casos estudiados */
  estimated?: boolean;
}

const IN: [number, number, string][] = [
  [28.61, 77.21, 'Nueva Delhi'], [19.08, 72.88, 'Bombay'], [22.57, 88.36, 'Calcuta'], [13.08, 80.27, 'Chennai'], [12.97, 77.59, 'Bangalore'],
  [17.39, 78.49, 'Hyderabad'], [23.02, 72.57, 'Ahmedabad'], [18.52, 73.86, 'Pune'], [21.17, 72.83, 'Surat'], [26.91, 75.79, 'Jaipur'],
  [26.85, 80.95, 'Lucknow'], [26.45, 80.33, 'Kanpur'], [21.15, 79.09, 'Nagpur'], [30.73, 76.78, 'Chandigarh'], [31.63, 74.87, 'Amritsar'],
  [25.59, 85.14, 'Patna'], [22.72, 75.86, 'Indore'], [23.26, 77.41, 'Bhopal'], [17.69, 83.22, 'Visakhapatnam'], [9.93, 76.27, 'Kochi'],
];
const PK: [number, number, string][] = [
  [24.86, 67.01, 'Karachi'], [31.55, 74.34, 'Lahore'], [31.42, 73.08, 'Faisalabad'], [33.6, 73.05, 'Rawalpindi'], [33.68, 73.05, 'Islamabad'],
  [32.16, 74.19, 'Gujranwala'], [34.01, 71.58, 'Peshawar'], [30.2, 71.47, 'Multán'], [25.4, 68.36, 'Hyderabad (Pakistán)'], [30.18, 66.98, 'Quetta'],
  [32.49, 74.53, 'Sialkot'], [32.08, 72.67, 'Sargodha'], [29.4, 71.68, 'Bahawalpur'], [27.71, 68.85, 'Sukkur'], [34.2, 73.24, 'Abbottabad'],
];
const US: [number, number, string][] = [
  [40.71, -74.01, 'Nueva York'], [34.05, -118.24, 'Los Ángeles'], [41.88, -87.63, 'Chicago'], [29.76, -95.37, 'Houston'], [33.45, -112.07, 'Phoenix'],
  [39.95, -75.17, 'Filadelfia'], [29.42, -98.49, 'San Antonio'], [32.72, -117.16, 'San Diego'], [32.78, -96.8, 'Dallas'], [37.34, -121.89, 'San José'],
  [38.91, -77.04, 'Washington'], [42.36, -71.06, 'Boston'], [47.61, -122.33, 'Seattle'], [39.74, -104.99, 'Denver'], [33.75, -84.39, 'Atlanta'],
  [25.76, -80.19, 'Miami'], [37.77, -122.42, 'San Francisco'], [42.33, -83.05, 'Detroit'], [44.98, -93.27, 'Mineápolis'], [39.29, -76.61, 'Baltimore'],
  [38.63, -90.2, 'San Luis'], [40.44, -79.99, 'Pittsburgh'], [45.52, -122.68, 'Portland'], [36.17, -115.14, 'Las Vegas'], [35.23, -80.84, 'Charlotte'],
  [48.42, -101.36, 'Base aérea de Minot'], [47.51, -111.18, 'Base aérea de Malmstrom'], [41.13, -104.87, 'Base aérea F. E. Warren'], [32.5, -93.66, 'Base aérea de Barksdale'],
  [38.73, -93.55, 'Base aérea de Whiteman'], [47.73, -122.72, 'Base naval de Kitsap-Bangor'], [30.8, -81.52, 'Base naval de Kings Bay'], [41.15, -95.91, 'Mando Estratégico (Offutt)'],
  [38.87, -77.06, 'Pentágono'], [36.95, -76.33, 'Base naval de Norfolk'], [21.35, -157.95, 'Pearl Harbor'],
];
const RU: [number, number, string][] = [
  [55.76, 37.62, 'Moscú'], [59.94, 30.31, 'San Petersburgo'], [55.03, 82.92, 'Novosibirsk'], [56.84, 60.6, 'Ekaterimburgo'], [55.79, 49.12, 'Kazán'],
  [56.33, 44.0, 'Nizhni Nóvgorod'], [55.16, 61.4, 'Cheliábinsk'], [53.2, 50.15, 'Samara'], [54.99, 73.37, 'Omsk'], [47.24, 39.7, 'Rostov del Don'],
  [54.74, 55.97, 'Ufá'], [56.01, 92.89, 'Krasnoyarsk'], [58.01, 56.25, 'Perm'], [51.67, 39.18, 'Vorónezh'], [48.71, 44.51, 'Volgogrado'],
  [45.04, 38.98, 'Krasnodar'], [51.53, 46.03, 'Sarátov'], [57.15, 65.53, 'Tiumén'], [53.51, 49.42, 'Toliatti'], [52.29, 104.3, 'Irkutsk'],
  [43.12, 131.89, 'Vladivostok'], [48.48, 135.08, 'Jabárovsk'], [69.0, 33.09, 'Múrmansk'], [64.54, 40.54, 'Arcángel'], [54.71, 20.51, 'Kaliningrado'],
  [54.03, 35.78, 'Kozelsk'], [51.68, 45.6, 'Tatíshchevo'], [51.1, 59.85, 'Dombarovski'], [55.3, 89.8, 'Uzhur'], [56.95, 40.98, 'Teikovo'],
  [69.25, 33.3, 'Gadzhíievo (submarinos)'], [52.92, 158.49, 'Vilyuchinsk (submarinos)'], [51.47, 46.2, 'Base aérea de Engels'], [62.5, 40.3, 'Plesetsk'],
];

// ojivas y bases públicas de otros países (sólo para mostrar la escala; nada de esto es un plan real)
const KR: [number, number, string][] = [
  [37.57, 126.98, 'Seúl'], [35.18, 129.08, 'Busan'], [37.46, 126.71, 'Incheon'], [35.87, 128.6, 'Daegu'], [36.35, 127.38, 'Daejeon'],
  [35.16, 126.85, 'Gwangju'], [35.54, 129.31, 'Ulsan'], [37.26, 127.03, 'Suwon'], [36.96, 127.03, 'Camp Humphreys'], [37.09, 127.03, 'Base aérea de Osan'],
  [35.9, 126.62, 'Base aérea de Gunsan'], [35.14, 128.67, 'Base naval de Jinhae'],
];
const JP: [number, number, string][] = [
  [35.68, 139.69, 'Tokio'], [34.69, 135.5, 'Osaka'], [35.18, 136.91, 'Nagoya'], [35.44, 139.64, 'Yokohama'], [33.59, 130.4, 'Fukuoka'],
  [43.06, 141.35, 'Sapporo'], [34.69, 135.2, 'Kobe'], [35.29, 139.67, 'Base naval de Yokosuka'], [40.7, 141.37, 'Base aérea de Misawa'], [26.36, 127.77, 'Base aérea de Kadena'],
  [34.15, 132.24, 'Iwakuni'], [33.16, 129.72, 'Sasebo'],
];
const KP: [number, number, string][] = [
  [39.04, 125.76, 'Pionyang'], [39.8, 125.75, 'Yongbyon'], [40.03, 128.18, 'Sinpo'], [39.92, 127.54, 'Hamhung'], [41.8, 129.78, 'Chongjin'],
  [39.66, 124.7, 'Sohae'], [39.15, 127.44, 'Wonsan'], [38.73, 125.4, 'Nampo'],
];
const CN: [number, number, string][] = [
  [39.9, 116.4, 'Pekín'], [31.23, 121.47, 'Shanghái'], [23.13, 113.26, 'Cantón'], [22.54, 114.06, 'Shenzhen'], [29.56, 106.55, 'Chongqing'],
  [39.08, 117.2, 'Tianjin'], [30.59, 114.31, 'Wuhan'], [30.57, 104.07, 'Chengdu'], [34.34, 108.94, 'Xi’an'], [30.27, 120.16, 'Hangzhou'],
  [32.06, 118.8, 'Nankín'], [41.8, 123.43, 'Shenyang'], [45.8, 126.53, 'Harbin'], [36.07, 120.38, 'Qingdao'], [38.91, 121.6, 'Dalian'],
  [34.75, 113.63, 'Zhengzhou'], [25.04, 102.71, 'Kunming'], [22.32, 114.17, 'Hong Kong'], [18.22, 109.55, 'Base naval de Yulin'], [40.1, 96.6, 'Campo de silos de Yumen'],
  [42.4, 92.6, 'Campo de silos de Hami'], [40.2, 107.9, 'Campo de silos de Ordos'],
];
const EU: [number, number, string][] = [
  [51.51, -0.13, 'Londres'], [48.86, 2.35, 'París'], [52.52, 13.4, 'Berlín'], [40.42, -3.7, 'Madrid'], [41.9, 12.5, 'Roma'],
  [52.23, 21.01, 'Varsovia'], [50.85, 4.35, 'Bruselas'], [52.37, 4.9, 'Ámsterdam'], [53.55, 9.99, 'Hamburgo'], [48.14, 11.58, 'Múnich'],
  [45.46, 9.19, 'Milán'], [41.39, 2.17, 'Barcelona'], [50.08, 14.44, 'Praga'], [44.43, 26.1, 'Bucarest'], [59.91, 10.75, 'Oslo'],
  [59.33, 18.07, 'Estocolmo'], [60.17, 24.94, 'Helsinki'], [54.69, 25.28, 'Vilna'], [56.95, 24.1, 'Riga'], [59.44, 24.75, 'Tallin'],
  [41.01, 28.98, 'Estambul'], [39.93, 32.86, 'Ankara'], [49.44, 7.6, 'Base aérea de Ramstein'], [56.07, -4.82, 'Base naval de Faslane'], [48.3, -4.5, 'Île Longue (submarinos)'],
  [46.03, 12.6, 'Base aérea de Aviano'], [37.0, 35.43, 'Base aérea de Incirlik'], [36.62, -6.35, 'Base naval de Rota'], [52.41, 0.56, 'Base aérea de Lakenheath'],
];
const RU_W: [number, number, string][] = RU.filter(([, lon]) => lon < 62);

// zonas de lanzamiento: campos de silos conocidos, lanzadores móviles (centro aproximado) y mares de patrulla
const L_US: [number, number, string][] = [[48.42, -101.36, 'Silos de Minot'], [47.51, -111.18, 'Silos de Malmstrom'], [41.13, -104.87, 'Silos de F. E. Warren'], [38, -150, 'Submarino en el Pacífico'], [38, -45, 'Submarino en el Atlántico']];
const L_RU: [number, number, string][] = [[54.03, 35.78, 'Silos de Kozelsk'], [51.68, 45.6, 'Silos de Tatíshchevo'], [51.1, 59.85, 'Silos de Dombarovski'], [55.3, 89.8, 'Silos de Uzhur'], [73, 40, 'Submarino en el mar de Barents'], [55, 150, 'Submarino en el mar de Ojotsk']];
const L_IN: [number, number, string][] = [[26.0, 74.0, 'Lanzadores móviles (Rajastán)'], [21.5, 79.5, 'Lanzadores móviles (centro de la India)'], [15, 87, 'Submarino en el golfo de Bengala']];
const L_PK: [number, number, string][] = [[30.5, 70.5, 'Lanzadores móviles (Punyab)'], [33.5, 72.5, 'Lanzadores móviles (norte)'], [26.5, 66.5, 'Lanzadores móviles (Baluchistán)']];
const L_KP: [number, number, string][] = [[40.0, 125.8, 'Lanzadores móviles (oeste)'], [40.8, 129.5, 'Lanzadores móviles (noreste)'], [39.6, 127.4, 'Lanzadores móviles (este)']];
const L_USP: [number, number, string][] = [[30, 150, 'Submarino de EE. UU. en el Pacífico'], [13.58, 144.93, 'Bombarderos en Guam']];
const L_CN: [number, number, string][] = [[40.1, 96.6, 'Silos de Yumen'], [42.4, 92.6, 'Silos de Hami'], [40.2, 107.9, 'Silos de Ordos'], [18, 112, 'Submarino en el mar de la China Meridional']];
const L_NATO: [number, number, string][] = [[60, -10, 'Submarino británico en el Atlántico Norte'], [46, -8, 'Submarino francés en el golfo de Vizcaya'], [38, -45, 'Submarino de EE. UU. en el Atlántico'], [48.42, -101.36, 'Silos de Minot']];

export const WAR_PRESETS: WarPreset[] = [
  { id: 'inpk-5', name: 'India–Pakistán: 100 armas de 15 kt', sides: ['India', 'Pakistán'], warheads: 100, yieldKt: 15, sootTg: 5, directDeathsM: 27, famineDeathsM: 255, coolingC: 1.5, precipPct: 6, caloriesPct: 7,
    note: 'Una guerra «regional»: 100 bombas del tamaño de la de Hiroshima sobre ciudades. Inyectaría unos 5 millones de toneladas de hollín en la estratosfera.', targets: [...IN.slice(0, 12), ...PK.slice(0, 10)], hit: [IN.slice(0, 12), PK.slice(0, 10)], launch: [L_IN, L_PK] },
  { id: 'inpk-16', name: 'India–Pakistán: 250 armas de 15 kt', sides: ['India', 'Pakistán'], warheads: 250, yieldKt: 15, sootTg: 16, directDeathsM: 52, famineDeathsM: 926, coolingC: 3, precipPct: 11, caloriesPct: 15,
    note: 'Los arsenales actuales de ambos países, con armas pequeñas.', targets: [...IN, ...PK], hit: [IN, PK], launch: [L_IN, L_PK] },
  { id: 'inpk-37', name: 'India–Pakistán: 250 armas de 100 kt', sides: ['India', 'Pakistán'], warheads: 250, yieldKt: 100, sootTg: 37, directDeathsM: 127, famineDeathsM: 2081, coolingC: 5, precipPct: 18, caloriesPct: 30,
    note: 'Los arsenales previstos hacia 2025 con armas más potentes (Toon et al. 2019).', targets: [...IN, ...PK], hit: [IN, PK], launch: [L_IN, L_PK] },
  { id: 'inpk-47', name: 'India–Pakistán: 500 armas de 100 kt', sides: ['India', 'Pakistán'], warheads: 500, yieldKt: 100, sootTg: 47, directDeathsM: 164, famineDeathsM: 2512, coolingC: 6, precipPct: 21, caloriesPct: 40,
    note: 'El mayor de los casos regionales estudiados.', targets: [...IN, ...PK], hit: [IN, PK], launch: [L_IN, L_PK] },
  { id: 'kpkr', name: 'Corea del Norte–Corea del Sur: 25 armas de 20 kt', sides: ['Corea del Sur (con EE. UU.)', 'Corea del Norte'], warheads: 25, yieldKt: 20, shareA: 0.2, sootTg: 2, directDeathsM: 4, famineDeathsM: 100, coolingC: 0.6, precipPct: 2, caloriesPct: 3, estimated: true, first: 1,
    note: 'Corea del Norte tendría unas 50 ojivas (estimaciones de 2025). Aquí lanza unas 20 sobre Corea del Sur y las bases de EE. UU., y EE. UU. responde con unas pocas armas sobre el Norte. Seúl, con 25 millones de habitantes en su área, está a 50 km de la frontera.', targets: [...KR, ...KP], hit: [KR, KP], launch: [L_USP, L_KP] },
  { id: 'kpjp', name: 'Corea del Norte–Japón: 20 armas de 20 kt', sides: ['Japón (con EE. UU.)', 'Corea del Norte'], warheads: 20, yieldKt: 20, shareA: 0.25, sootTg: 1.5, directDeathsM: 3, famineDeathsM: 75, coolingC: 0.5, precipPct: 2, caloriesPct: 2, estimated: true, first: 1,
    note: 'Misiles de alcance medio sobre las grandes ciudades de Japón y las bases de EE. UU. en el país; respuesta de EE. UU. sobre Corea del Norte. Los misiles tardan unos 10 minutos en cruzar el mar del Japón.', targets: [...JP, ...KP], hit: [JP, KP], launch: [L_USP, L_KP] },
  { id: 'cnus', name: 'China–EE. UU.: 1200 armas de 150 kt', sides: ['Estados Unidos', 'China'], warheads: 1200, yieldKt: 150, shareA: 0.65, sootTg: 75, directDeathsM: 300, famineDeathsM: 3300, coolingC: 7, precipPct: 27, caloriesPct: 55, estimated: true,
    note: 'China tendría unas 600 ojivas en 2025 y sigue ampliando su arsenal. Aquí lanza unas 400 sobre EE. UU. y EE. UU. unas 800 sobre China. Las ciudades chinas, muy densas, arderían con mucha más intensidad.', targets: [...US, ...CN], hit: [US, CN], launch: [L_US, L_CN] },
  { id: 'runato', name: 'Rusia–OTAN en Europa: 1500 armas de 100 kt', sides: ['OTAN', 'Rusia'], warheads: 1500, yieldKt: 100, shareA: 0.35, sootTg: 90, directDeathsM: 230, famineDeathsM: 3700, coolingC: 7.5, precipPct: 29, caloriesPct: 65, estimated: true, first: 1,
    note: 'Una guerra limitada a Europa: Rusia ataca ciudades y bases de la OTAN, y el Reino Unido, Francia y EE. UU. responden sobre la Rusia europea. Aunque EE. UU. no fuera atacado, el invierno nuclear sería global.', targets: [...EU, ...RU_W], hit: [EU, RU_W], launch: [L_NATO, L_RU] },
  { id: 'usru-150', name: 'EE. UU. y aliados–Rusia: 4400 armas de 100 kt', sides: ['Estados Unidos', 'Rusia'], warheads: 4400, yieldKt: 100, sootTg: 150, directDeathsM: 360, famineDeathsM: 5341, coolingC: 9, precipPct: 35, caloriesPct: 90,
    note: 'Una guerra total entre las dos mayores potencias nucleares, con la mitad de los arsenales desplegados contra ciudades e instalaciones. El invierno nuclear duraría más de una década.', targets: [...US, ...RU], hit: [US, RU], launch: [L_US, L_RU] },
];

/**
 * Misiles del intercambio, uno por objetivo representativo, por oleadas: el bando que empieza lanza
 * contra la mitad de los objetivos; el otro detecta el lanzamiento y responde antes de que lleguen
 * las ojivas; después, segundas oleadas desde submarinos y lo que queda. Tiempo en segundos desde
 * el primer lanzamiento; vuelo balístico de unos 0,3·√km minutos más el despegue.
 */
export interface WarMissile { side: 0 | 1; from: [number, number]; to: [number, number]; name: string; site: string; tLaunch: number; tImpact: number; wave: number }
export function warSchedule(p: WarPreset, first: 0 | 1 = 0): WarMissile[] {
  const out: WarMissile[] = [];
  const RE = 6371;
  const km = (a: [number, number], b: [number, number]) => {
    const r = Math.PI / 180, x = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2;
    return 2 * RE * Math.asin(Math.min(1, Math.sqrt(x)));
  };
  // cada objetivo lo ataca la base del bando contrario más cercana (o la que toque por turno, si hay varias parecidas)
  const add = (side: 0 | 1, targets: [number, number, string][], t0: number, spread: number, wave: number) => {
    const sites = p.launch[side];
    targets.forEach((tg, i) => {
      const to: [number, number] = [tg[0], tg[1]];
      const byDist = sites.map((s) => ({ s, d: km([s[0], s[1]], to) })).sort((a, b) => a.d - b.d);
      const pick = byDist[Math.min(byDist.length - 1, i % Math.min(2, byDist.length))];
      const from: [number, number] = [pick.s[0], pick.s[1]];
      const tL = t0 + (targets.length > 1 ? (i / (targets.length - 1)) * spread : 0);
      const flight = Math.max(240, (0.3 * Math.sqrt(Math.max(50, pick.d)) + 1.2) * 60);
      out.push({ side, from, to, name: tg[2], site: pick.s[2], tLaunch: tL, tImpact: tL + flight, wave });
    });
  };
  const A = first, B = (1 - first) as 0 | 1;
  // objetivos de cada bando: el atacante empieza por bases y capitales (los primeros de la lista)
  const tgtOfB = p.hit[B], tgtOfA = p.hit[A];
  const half = (l: unknown[]) => Math.ceil(l.length * 0.55);
  add(A, tgtOfB.slice(0, half(tgtOfB)), 0, 150, 1);
  add(B, tgtOfA.slice(0, half(tgtOfA)), 420, 180, 2);
  add(A, tgtOfB.slice(half(tgtOfB)), 1200, 240, 3);
  add(B, tgtOfA.slice(half(tgtOfA)), 1500, 300, 4);
  return out.sort((a, b) => a.tLaunch - b.tLaunch);
}

/** evolución de la anomalía de temperatura (°C) y precipitación (%) a lo largo de los años */
export function climateSeries(p: WarPreset, years = 15): { t: number; dT: number; dP: number }[] {
  // subida en meses, máximo en el segundo o tercer año y vuelta lenta (escala de unos 5–8 años)
  const tau = p.sootTg >= 100 ? 7.5 : p.sootTg >= 30 ? 5.5 : 4;
  const out: { t: number; dT: number; dP: number }[] = [];
  for (let i = 0; i <= years * 12; i++) {
    const t = i / 12;
    const rise = 1 - Math.exp(-t / 0.35);
    const k = rise * Math.exp(-Math.max(0, t - 1.6) / tau);
    out.push({ t, dT: -p.coolingC * k, dP: -p.precipPct * k });
  }
  return out;
}
