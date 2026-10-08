function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Textura 3D periódica (64³) de ruido para nubes volumétricas.
 *  R: Perlin-Worley (forma base)   G: Worley fbm (erosión de detalle)   B: value-noise fbm   A: Worley alta frecuencia
 */
export function cloudNoiseData(N = 64): Uint8Array {
  const rand = rng(4242);
  // --- value noise periódico ---
  const lattice = (f: number) => {
    const a = new Float32Array(f * f * f);
    for (let i = 0; i < a.length; i++) a[i] = rand();
    return a;
  };
  const valueNoise = (lat: Float32Array, f: number, x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const fx = x - xi, fy = y - yi, fz = z - zi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
    const idx = (i: number, j: number, k: number) => lat[(((i % f) + f) % f) + ((((j % f) + f) % f) + (((k % f) + f) % f) * f) * f];
    const c000 = idx(xi, yi, zi), c100 = idx(xi + 1, yi, zi), c010 = idx(xi, yi + 1, zi), c110 = idx(xi + 1, yi + 1, zi);
    const c001 = idx(xi, yi, zi + 1), c101 = idx(xi + 1, yi, zi + 1), c011 = idx(xi, yi + 1, zi + 1), c111 = idx(xi + 1, yi + 1, zi + 1);
    const x00 = c000 + (c100 - c000) * sx, x10 = c010 + (c110 - c010) * sx, x01 = c001 + (c101 - c001) * sx, x11 = c011 + (c111 - c011) * sx;
    const y0 = x00 + (x10 - x00) * sy, y1 = x01 + (x11 - x01) * sy;
    return y0 + (y1 - y0) * sz;
  };
  // --- Worley periódico (F1) ---
  const cells = (f: number) => {
    const a = new Float32Array(f * f * f * 3);
    for (let i = 0; i < a.length; i++) a[i] = rand();
    return a;
  };
  const worley = (pts: Float32Array, f: number, x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let best = 9;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx, cy = yi + dy, cz = zi + dz;
      const k = ((((cx % f) + f) % f) + ((((cy % f) + f) % f) + (((cz % f) + f) % f) * f) * f) * 3;
      const px = cx + pts[k] - x, py = cy + pts[k + 1] - y, pz = cz + pts[k + 2] - z;
      const d = px * px + py * py + pz * pz;
      if (d < best) best = d;
    }
    return Math.min(1, Math.sqrt(best));
  };
  const vF = [4, 8, 16, 32];
  const vL = vF.map(lattice);
  const wF = [4, 8, 16, 24];
  const wP = wF.map(cells);
  const data = new Uint8Array(N * N * N * 4);
  let o = 0;
  for (let z = 0; z < N; z++) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const u = x / N, v = y / N, w = z / N;
        let vn = 0, amp = 0.5, tot = 0;
        for (let i = 0; i < vF.length; i++) { vn += amp * valueNoise(vL[i], vF[i], u * vF[i], v * vF[i], w * vF[i]); tot += amp; amp *= 0.5; }
        vn /= tot;
        const w0 = 1 - worley(wP[0], wF[0], u * wF[0], v * wF[0], w * wF[0]);
        const w1 = 1 - worley(wP[1], wF[1], u * wF[1], v * wF[1], w * wF[1]);
        const w2 = 1 - worley(wP[2], wF[2], u * wF[2], v * wF[2], w * wF[2]);
        const w3 = 1 - worley(wP[3], wF[3], u * wF[3], v * wF[3], w * wF[3]);
        const wfbm = w0 * 0.625 + w1 * 0.25 + w2 * 0.125;
        // remap de Perlin-Worley (Schneider, "The real-time volumetric cloudscapes of Horizon Zero Dawn")
        const pw = Math.max(0, Math.min(1, (vn - (wfbm - 1)) / (1 - (wfbm - 1)) - 0.25) / 0.75);
        data[o++] = Math.round(Math.max(0, Math.min(1, pw)) * 255);
        data[o++] = Math.round((w1 * 0.625 + w2 * 0.25 + w3 * 0.125) * 255);
        data[o++] = Math.round(vn * 255);
        data[o++] = Math.round(w3 * 255);
      }
    }
  }
  return data;
}
