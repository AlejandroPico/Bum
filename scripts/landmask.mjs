// Genera src/data/landmask.ts: máscara de tierra y mar a 1° (Natural Earth 1:50m, vía world-atlas).
// Uso: npm i --no-save world-atlas@2 topojson-client@3 && node scripts/landmask.mjs
// Relleno por filas (par-impar) en lon/lat: rápido y suficiente a 1°.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve('world-atlas/land-50m.json'), 'utf8'));
const land = feature(topo, topo.objects.land);
const W = 360, H = 180, bits = new Uint8Array((W * H) / 8);
const rings = [];
for (const f of land.features) {
  const g = f.geometry;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const p of polys) for (const r0 of p) {
    // anillo «desenrollado» (sin saltos de 360° en el antimeridiano)
    const r = [[r0[0][0], r0[0][1]]];
    for (let k = 1; k < r0.length; k++) {
      let x = r0[k][0];
      const px = r[k - 1][0];
      while (x - px > 180) x -= 360;
      while (x - px < -180) x += 360;
      r.push([x, r0[k][1]]);
    }
    // el que da la vuelta al mundo (la Antártida) se cierra por el polo sur
    const dx = r[r.length - 1][0] - r[0][0];
    if (Math.abs(dx) > 300) { r.push([r[r.length - 1][0], -90], [r[0][0], -90], r[0]); }
    rings.push(r);
  }
}
for (let j = 0; j < H; j++) {
  const lat = 90 - j - 0.5;
  const xs = null;
  // cada anillo por separado (sus cruces van por pares); las casillas se pliegan a [−180, 180)
  void xs;
  for (const r of rings) {
    const c = [];
    for (let k = 0; k < r.length - 1; k++) {
      const [x1, y1] = r[k], [x2, y2] = r[k + 1];
      if ((y1 > lat) !== (y2 > lat)) c.push(x1 + ((lat - y1) * (x2 - x1)) / (y2 - y1));
    }
    c.sort((a, b) => a - b);
    for (let k = 0; k + 1 < c.length; k += 2) {
      for (let x = Math.ceil(c[k] - 0.5) + 0.5; x <= c[k + 1]; x++) {
        const i = ((Math.floor(x + 180) % 360) + 360) % 360, q = j * W + i;
        bits[q >> 3] ^= 1 << (q & 7); // par-impar: los lagos (anillos interiores) vuelven a ser agua
      }
    }
  }
}

const b64 = Buffer.from(bits).toString('base64');
writeFileSync(new URL('../src/data/landmask.ts', import.meta.url), `/** Máscara de tierra (1) y mar (0) a 1° de resolución, de norte a sur y de oeste a este (Natural Earth 1:50m). Generada con scripts/landmask.mjs. */
const B64 = '${b64}';
let bits: Uint8Array | null = null;
/** ¿es tierra el punto (grados)? */
export function isLand(lat: number, lon: number): boolean {
  if (!bits) { const s = atob(B64); bits = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) bits[i] = s.charCodeAt(i); }
  const i = Math.min(359, Math.max(0, Math.floor(((((lon + 180) % 360) + 360) % 360))));
  const j = Math.min(179, Math.max(0, Math.floor(90 - lat)));
  const k = j * 360 + i;
  return (bits[k >> 3] >> (k & 7) & 1) === 1;
}
`);
console.log('ok', b64.length);
