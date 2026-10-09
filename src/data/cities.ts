/**
 * Ciudades con población metropolitana aproximada (millones) para el modelo de densidad
 * exponencial de Clark: ρ(d) = ρ0·e^(−d/r0), con ∫ρ dA = población metropolitana.
 * Cifras redondeadas y orientativas.
 */
export interface City {
  name: string;
  lat: number;
  lon: number;
  popM: number;
  country: string;
}

export const CITIES: City[] = [
  // España
  { name: 'Madrid', lat: 40.4168, lon: -3.7038, popM: 6.8, country: 'España' },
  { name: 'Barcelona', lat: 41.3874, lon: 2.1686, popM: 5.6, country: 'España' },
  { name: 'Valencia', lat: 39.4699, lon: -0.3763, popM: 1.6, country: 'España' },
  { name: 'Sevilla', lat: 37.3891, lon: -5.9845, popM: 1.5, country: 'España' },
  { name: 'Bilbao', lat: 43.263, lon: -2.935, popM: 1.0, country: 'España' },
  { name: 'Zaragoza', lat: 41.6488, lon: -0.8891, popM: 0.78, country: 'España' },
  { name: 'Málaga', lat: 36.7213, lon: -4.4214, popM: 1.0, country: 'España' },
  { name: 'Murcia', lat: 37.9922, lon: -1.1307, popM: 0.67, country: 'España' },
  { name: 'Palma', lat: 39.5696, lon: 2.6502, popM: 0.56, country: 'España' },
  { name: 'Las Palmas', lat: 28.1235, lon: -15.4363, popM: 0.6, country: 'España' },
  { name: 'Alicante', lat: 38.3452, lon: -0.481, popM: 0.76, country: 'España' },
  { name: 'Valladolid', lat: 41.6523, lon: -4.7245, popM: 0.42, country: 'España' },
  { name: 'Vigo', lat: 42.2406, lon: -8.7207, popM: 0.48, country: 'España' },
  { name: 'A Coruña', lat: 43.3623, lon: -8.4115, popM: 0.42, country: 'España' },
  { name: 'Oviedo-Gijón', lat: 43.42, lon: -5.8, popM: 0.8, country: 'España' },
  { name: 'Granada', lat: 37.1773, lon: -3.5986, popM: 0.55, country: 'España' },
  { name: 'Córdoba', lat: 37.8882, lon: -4.7794, popM: 0.33, country: 'España' },
  { name: 'San Sebastián', lat: 43.3183, lon: -1.9812, popM: 0.44, country: 'España' },
  { name: 'Santander', lat: 43.4623, lon: -3.81, popM: 0.3, country: 'España' },
  { name: 'Pamplona', lat: 42.8125, lon: -1.6458, popM: 0.35, country: 'España' },
  { name: 'Bahía de Cádiz', lat: 36.53, lon: -6.29, popM: 0.65, country: 'España' },
  { name: 'Salamanca', lat: 40.9701, lon: -5.6635, popM: 0.2, country: 'España' },
  { name: 'Santa Cruz de Tenerife', lat: 28.4636, lon: -16.2518, popM: 0.42, country: 'España' },
  // Europa
  { name: 'París', lat: 48.8566, lon: 2.3522, popM: 12.3, country: 'Francia' },
  { name: 'Londres', lat: 51.5072, lon: -0.1276, popM: 14.5, country: 'Reino Unido' },
  { name: 'Berlín', lat: 52.52, lon: 13.405, popM: 6.1, country: 'Alemania' },
  { name: 'Múnich', lat: 48.1351, lon: 11.582, popM: 2.9, country: 'Alemania' },
  { name: 'Roma', lat: 41.9028, lon: 12.4964, popM: 4.3, country: 'Italia' },
  { name: 'Milán', lat: 45.4642, lon: 9.19, popM: 7.4, country: 'Italia' },
  { name: 'Lisboa', lat: 38.7223, lon: -9.1393, popM: 2.9, country: 'Portugal' },
  { name: 'Oporto', lat: 41.1579, lon: -8.6291, popM: 1.7, country: 'Portugal' },
  { name: 'Moscú', lat: 55.7558, lon: 37.6173, popM: 21.0, country: 'Rusia' },
  { name: 'San Petersburgo', lat: 59.9311, lon: 30.3609, popM: 6.0, country: 'Rusia' },
  { name: 'Kiev', lat: 50.4501, lon: 30.5234, popM: 3.5, country: 'Ucrania' },
  { name: 'Varsovia', lat: 52.2297, lon: 21.0122, popM: 3.1, country: 'Polonia' },
  { name: 'Viena', lat: 48.2082, lon: 16.3738, popM: 2.9, country: 'Austria' },
  { name: 'Bruselas', lat: 50.8503, lon: 4.3517, popM: 2.6, country: 'Bélgica' },
  { name: 'Ámsterdam', lat: 52.3676, lon: 4.9041, popM: 2.5, country: 'Países Bajos' },
  { name: 'Estambul', lat: 41.0082, lon: 28.9784, popM: 15.8, country: 'Turquía' },
  { name: 'Atenas', lat: 37.9838, lon: 23.7275, popM: 3.6, country: 'Grecia' },
  { name: 'Estocolmo', lat: 59.3293, lon: 18.0686, popM: 2.4, country: 'Suecia' },
  { name: 'Praga', lat: 50.0755, lon: 14.4378, popM: 2.2, country: 'Chequia' },
  { name: 'Budapest', lat: 47.4979, lon: 19.0402, popM: 3.0, country: 'Hungría' },
  // América
  { name: 'Nueva York', lat: 40.7128, lon: -74.006, popM: 19.8, country: 'EE. UU.' },
  { name: 'Los Ángeles', lat: 34.0522, lon: -118.2437, popM: 13.2, country: 'EE. UU.' },
  { name: 'Chicago', lat: 41.8781, lon: -87.6298, popM: 9.4, country: 'EE. UU.' },
  { name: 'Washington D. C.', lat: 38.9072, lon: -77.0369, popM: 6.3, country: 'EE. UU.' },
  { name: 'Houston', lat: 29.7604, lon: -95.3698, popM: 7.3, country: 'EE. UU.' },
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194, popM: 6.7, country: 'EE. UU.' },
  { name: 'Miami', lat: 25.7617, lon: -80.1918, popM: 6.1, country: 'EE. UU.' },
  { name: 'Seattle', lat: 47.6062, lon: -122.3321, popM: 4.0, country: 'EE. UU.' },
  { name: 'Toronto', lat: 43.6532, lon: -79.3832, popM: 6.4, country: 'Canadá' },
  { name: 'Montreal', lat: 45.5019, lon: -73.5674, popM: 4.3, country: 'Canadá' },
  { name: 'Ciudad de México', lat: 19.4326, lon: -99.1332, popM: 21.8, country: 'México' },
  { name: 'La Habana', lat: 23.1136, lon: -82.3666, popM: 2.1, country: 'Cuba' },
  { name: 'Bogotá', lat: 4.711, lon: -74.0721, popM: 11, country: 'Colombia' },
  { name: 'Caracas', lat: 10.4806, lon: -66.9036, popM: 3, country: 'Venezuela' },
  { name: 'Lima', lat: -12.0464, lon: -77.0428, popM: 11, country: 'Perú' },
  { name: 'Santiago de Chile', lat: -33.4489, lon: -70.6693, popM: 7, country: 'Chile' },
  { name: 'Buenos Aires', lat: -34.6037, lon: -58.3816, popM: 15.6, country: 'Argentina' },
  { name: 'São Paulo', lat: -23.5505, lon: -46.6333, popM: 22.4, country: 'Brasil' },
  { name: 'Río de Janeiro', lat: -22.9068, lon: -43.1729, popM: 13.6, country: 'Brasil' },
  // Asia
  { name: 'Tokio', lat: 35.6762, lon: 139.6503, popM: 37.2, country: 'Japón' },
  { name: 'Osaka', lat: 34.6937, lon: 135.5023, popM: 19, country: 'Japón' },
  { name: 'Hiroshima', lat: 34.3853, lon: 132.4553, popM: 1.4, country: 'Japón' },
  { name: 'Nagasaki', lat: 32.7503, lon: 129.8779, popM: 0.4, country: 'Japón' },
  { name: 'Seúl', lat: 37.5665, lon: 126.978, popM: 25.5, country: 'Corea del Sur' },
  { name: 'Pionyang', lat: 39.0392, lon: 125.7625, popM: 3.1, country: 'Corea del Norte' },
  { name: 'Pekín', lat: 39.9042, lon: 116.4074, popM: 21.9, country: 'China' },
  { name: 'Shanghái', lat: 31.2304, lon: 121.4737, popM: 29, country: 'China' },
  { name: 'Hong Kong', lat: 22.3193, lon: 114.1694, popM: 7.5, country: 'China' },
  { name: 'Taipéi', lat: 25.033, lon: 121.5654, popM: 7, country: 'Taiwán' },
  { name: 'Manila', lat: 14.5995, lon: 120.9842, popM: 14.4, country: 'Filipinas' },
  { name: 'Yakarta', lat: -6.2088, lon: 106.8456, popM: 34, country: 'Indonesia' },
  { name: 'Singapur', lat: 1.3521, lon: 103.8198, popM: 6, country: 'Singapur' },
  { name: 'Bangkok', lat: 13.7563, lon: 100.5018, popM: 11, country: 'Tailandia' },
  { name: 'Delhi', lat: 28.7041, lon: 77.1025, popM: 32, country: 'India' },
  { name: 'Bombay', lat: 19.076, lon: 72.8777, popM: 21, country: 'India' },
  { name: 'Daca', lat: 23.8103, lon: 90.4125, popM: 23, country: 'Bangladés' },
  { name: 'Karachi', lat: 24.8607, lon: 67.0011, popM: 17, country: 'Pakistán' },
  { name: 'Islamabad', lat: 33.6844, lon: 73.0479, popM: 2.3, country: 'Pakistán' },
  { name: 'Teherán', lat: 35.6892, lon: 51.389, popM: 9.5, country: 'Irán' },
  { name: 'Bagdad', lat: 33.3152, lon: 44.3661, popM: 7.5, country: 'Irak' },
  { name: 'Riad', lat: 24.7136, lon: 46.6753, popM: 7.5, country: 'Arabia Saudí' },
  { name: 'Dubái', lat: 25.2048, lon: 55.2708, popM: 3.6, country: 'EAU' },
  { name: 'Tel Aviv', lat: 32.0853, lon: 34.7818, popM: 4.2, country: 'Israel' },
  // África
  { name: 'El Cairo', lat: 30.0444, lon: 31.2357, popM: 22, country: 'Egipto' },
  { name: 'Lagos', lat: 6.5244, lon: 3.3792, popM: 15, country: 'Nigeria' },
  { name: 'Kinsasa', lat: -4.4419, lon: 15.2663, popM: 16, country: 'RD Congo' },
  { name: 'Johannesburgo', lat: -26.2041, lon: 28.0473, popM: 10, country: 'Sudáfrica' },
  { name: 'Nairobi', lat: -1.2921, lon: 36.8219, popM: 5, country: 'Kenia' },
  { name: 'Casablanca', lat: 33.5731, lon: -7.5898, popM: 4.3, country: 'Marruecos' },
  { name: 'Argel', lat: 36.7538, lon: 3.0588, popM: 3, country: 'Argelia' },
  // Oceanía
  { name: 'Sídney', lat: -33.8688, lon: 151.2093, popM: 5.4, country: 'Australia' },
  { name: 'Melbourne', lat: -37.8136, lon: 144.9631, popM: 5.2, country: 'Australia' },
];

// hab/km² fuera de áreas metropolitanas (promedio tierra+mar: integra ≈ 6000 millones en todo el planeta)
const BACKGROUND = 12;

interface Kernel { lat: number; lon: number; rho0: number; r0: number; name: string }

/** Prepara los núcleos de densidad cercanos a un punto. */
export function densityField(lat: number, lon: number, radiusKm: number) {
  const kernels: Kernel[] = [];
  for (const c of CITIES) {
    const d = haversineKm(lat, lon, c.lat, c.lon);
    if (d > radiusKm + 200) continue;
    const r0 = 3 + 2.2 * Math.sqrt(c.popM);
    const rho0 = (c.popM * 1e6) / (2 * Math.PI * r0 * r0);
    kernels.push({ lat: c.lat, lon: c.lon, rho0, r0, name: c.name });
  }
  const cosLat = Math.cos((lat * Math.PI) / 180);
  return {
    kernels,
    /** densidad (hab/km²) en un desplazamiento (km este, km norte) desde el punto */
    at(eKm: number, nKm: number) {
      return this.atLatLon(lat + nKm / 111.32, lon + eKm / (111.32 * cosLat));
    },
    atLatLon(plat: number, plon: number) {
      let rho = BACKGROUND;
      for (const k of kernels) {
        const dn = (plat - k.lat) * 111.32;
        let dl = plon - k.lon;
        if (dl > 180) dl -= 360; else if (dl < -180) dl += 360;
        const de = dl * 111.32 * Math.cos((k.lat * Math.PI) / 180);
        const d = Math.sqrt(dn * dn + de * de);
        rho += k.rho0 * Math.exp(-d / k.r0);
      }
      return rho;
    },
  };
}

export function nearestCity(lat: number, lon: number): { city: City; km: number } {
  let best = CITIES[0], bd = Infinity;
  for (const c of CITIES) {
    const d = haversineKm(lat, lon, c.lat, c.lon);
    if (d < bd) { bd = d; best = c; }
  }
  return { city: best, km: bd };
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
