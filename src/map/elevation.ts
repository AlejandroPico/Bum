/**
 * Elevación (y batimetría) de un punto leyendo directamente las teselas Terrarium de AWS.
 * El océano tiene valores negativos (profundidad), así que sirve para detectar si un impacto
 * cae en el mar y a qué profundidad.
 */
const URL_T = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';
const cache = new Map<string, Promise<ImageData | null>>();

function loadTile(z: number, x: number, y: number): Promise<ImageData | null> {
  const key = `${z}/${x}/${y}`;
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      try {
        const r = await fetch(`${URL_T}/${key}.png`);
        if (!r.ok) return null;
        const bmp = await createImageBitmap(await r.blob());
        const cv = document.createElement('canvas');
        cv.width = bmp.width; cv.height = bmp.height;
        const ctx = cv.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(bmp, 0, 0);
        return ctx.getImageData(0, 0, cv.width, cv.height);
      } catch {
        return null;
      }
    })();
    cache.set(key, p);
  }
  return p;
}

/** Elevación en metros sobre el nivel del mar (negativa en el océano), o null si no hay datos. */
export async function sampleElevation(lat: number, lon: number, z = 9): Promise<number | null> {
  const n = 2 ** z;
  const la = Math.max(-85, Math.min(85, lat));
  const x = ((((lon + 180) % 360) + 360) % 360) / 360 * n;
  const r = (la * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  const tx = Math.floor(x), ty = Math.floor(y);
  const img = await loadTile(z, tx, ty);
  if (!img) return null;
  const px = Math.min(img.width - 1, Math.floor((x - tx) * img.width));
  const py = Math.min(img.height - 1, Math.floor((y - ty) * img.height));
  const i = (py * img.width + px) * 4;
  const d = img.data;
  return d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768;
}

/**
 * Muestreador síncrono de elevación para una zona: descarga primero todas las teselas que la cubren
 * (al nivel de zoom adecuado al radio) y devuelve una función que lee la altura sin esperas.
 */
export async function elevationSampler(lat: number, lon: number, radiusM: number): Promise<((la: number, lo: number) => number | null) | null> {
  // ~ 30 m por píxel para 10 km, ~ 120 m para 60 km; se baja de nivel si harían falta demasiadas teselas
  let z = radiusM < 6000 ? 13 : radiusM < 15000 ? 12 : radiusM < 35000 ? 11 : 10;
  const span = (zz: number) => { const tw = (40075016 * Math.cos((lat * Math.PI) / 180)) / 2 ** zz; return Math.ceil((2 * radiusM) / tw + 1) ** 2; };
  while (z > 6 && span(z) > 49) z--;
  const n = 2 ** z;
  const tile = (la: number, lo: number) => {
    const L = Math.max(-85, Math.min(85, la)), r = (L * Math.PI) / 180;
    return [(((lo + 180) % 360 + 360) % 360) / 360 * n, ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n];
  };
  const dLat = radiusM / 110570, dLon = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  const [x0, y0] = tile(lat + dLat, lon - dLon), [x1, y1] = tile(lat - dLat, lon + dLon);
  const tiles: [number, number][] = [];
  for (let ty = Math.floor(y0); ty <= Math.floor(y1); ty++) for (let tx = Math.floor(x0); tx <= Math.floor(x1); tx++) tiles.push([tx, ty]);
  if (tiles.length > 64) return null;
  const imgs = new Map<string, ImageData | null>();
  await Promise.all(tiles.map(async ([tx, ty]) => imgs.set(`${tx}/${ty}`, await loadTile(z, ((tx % n) + n) % n, ty))));
  if ([...imgs.values()].every((v) => !v)) return null;
  return (la: number, lo: number) => {
    const [x, y] = tile(la, lo);
    const tx = Math.floor(x), ty = Math.floor(y);
    const img = imgs.get(`${tx}/${ty}`);
    if (!img) return null;
    const px = Math.min(img.width - 1, Math.floor((x - tx) * img.width)), py = Math.min(img.height - 1, Math.floor((y - ty) * img.height));
    const i = (py * img.width + px) * 4, d = img.data;
    return d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768;
  };
}
