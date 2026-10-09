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
