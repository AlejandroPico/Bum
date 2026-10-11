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
  targets: [number, number, string][];
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

export const WAR_PRESETS: WarPreset[] = [
  { id: 'inpk-5', name: 'India–Pakistán: 100 armas de 15 kt', sides: ['India', 'Pakistán'], warheads: 100, yieldKt: 15, sootTg: 5, directDeathsM: 27, famineDeathsM: 255, coolingC: 1.5, precipPct: 6, caloriesPct: 7,
    note: 'Una guerra «regional»: 100 bombas del tamaño de la de Hiroshima sobre ciudades. Inyectaría unos 5 millones de toneladas de hollín en la estratosfera.', targets: [...IN.slice(0, 12), ...PK.slice(0, 10)] },
  { id: 'inpk-16', name: 'India–Pakistán: 250 armas de 15 kt', sides: ['India', 'Pakistán'], warheads: 250, yieldKt: 15, sootTg: 16, directDeathsM: 52, famineDeathsM: 926, coolingC: 3, precipPct: 11, caloriesPct: 15,
    note: 'Los arsenales actuales de ambos países, con armas pequeñas.', targets: [...IN, ...PK] },
  { id: 'inpk-37', name: 'India–Pakistán: 250 armas de 100 kt', sides: ['India', 'Pakistán'], warheads: 250, yieldKt: 100, sootTg: 37, directDeathsM: 127, famineDeathsM: 2081, coolingC: 5, precipPct: 18, caloriesPct: 30,
    note: 'Los arsenales previstos hacia 2025 con armas más potentes (Toon et al. 2019).', targets: [...IN, ...PK] },
  { id: 'inpk-47', name: 'India–Pakistán: 500 armas de 100 kt', sides: ['India', 'Pakistán'], warheads: 500, yieldKt: 100, sootTg: 47, directDeathsM: 164, famineDeathsM: 2512, coolingC: 6, precipPct: 21, caloriesPct: 40,
    note: 'El mayor de los casos regionales estudiados.', targets: [...IN, ...PK] },
  { id: 'usru-150', name: 'EE. UU. y aliados–Rusia: 4400 armas de 100 kt', sides: ['Estados Unidos', 'Rusia'], warheads: 4400, yieldKt: 100, sootTg: 150, directDeathsM: 360, famineDeathsM: 5341, coolingC: 9, precipPct: 35, caloriesPct: 90,
    note: 'Una guerra total entre las dos mayores potencias nucleares, con la mitad de los arsenales desplegados contra ciudades e instalaciones. El invierno nuclear duraría más de una década.', targets: [...US, ...RU] },
];

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
