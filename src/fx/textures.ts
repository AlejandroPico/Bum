import * as THREE from 'three';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Atlas 4×4 de "bocanadas" de humo procedurales (tipo coliflor): cada celda es una
 * nube de círculos suaves superpuestos con detalle fractal.
 */
export function createPuffAtlas(size = 1024): THREE.Texture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  const cell = size / 4;
  const rand = rng(1337);
  for (let cy = 0; cy < 4; cy++) {
    for (let cx = 0; cx < 4; cx++) {
      const ox = cx * cell, oy = cy * cell;
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, oy, cell, cell);
      ctx.clip();
      const blobs = 26 + Math.floor(rand() * 18);
      for (let i = 0; i < blobs; i++) {
        const a = rand() * Math.PI * 2;
        const d = Math.pow(rand(), 0.7) * cell * 0.28;
        const x = ox + cell / 2 + Math.cos(a) * d;
        const y = oy + cell / 2 + Math.sin(a) * d * 0.9;
        const r = cell * (0.06 + rand() * 0.16) * (1 - d / (cell * 0.45));
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const al = 0.18 + rand() * 0.22;
        g.addColorStop(0, `rgba(255,255,255,${al})`);
        g.addColorStop(0.55, `rgba(255,255,255,${al * 0.6})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // detalle fino
      for (let i = 0; i < 140; i++) {
        const a = rand() * Math.PI * 2;
        const d = Math.pow(rand(), 0.5) * cell * 0.36;
        const x = ox + cell / 2 + Math.cos(a) * d;
        const y = oy + cell / 2 + Math.sin(a) * d;
        const r = cell * (0.01 + rand() * 0.035);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,255,255,${0.08 + rand() * 0.1})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  // máscara radial global para evitar bordes de celda
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lx = ((x % cell) / cell) * 2 - 1;
      const ly = ((y % cell) / cell) * 2 - 1;
      const r = Math.sqrt(lx * lx + ly * ly);
      const m = Math.max(0, Math.min(1, (1 - r) / 0.25));
      const k = (y * size + x) * 4;
      d[k + 3] = Math.min(255, d[k + 3] * 1.25) * m;
      d[k] = d[k + 1] = d[k + 2] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Crea la textura 3D de ruido de nubes (generada en un Web Worker para no bloquear la interfaz). */
export function createCloudNoise3D(N = 64): Promise<THREE.Data3DTexture> {
  const make = (data: Uint8Array) => {
    const tex = new THREE.Data3DTexture(data, N, N, N);
    tex.format = THREE.RGBAFormat;
    tex.type = THREE.UnsignedByteType;
    tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
    tex.minFilter = tex.magFilter = THREE.LinearFilter;
    tex.unpackAlignment = 1;
    tex.needsUpdate = true;
    return tex;
  };
  return new Promise((resolve) => {
    try {
      const w = new Worker(new URL('./noise.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e) => { resolve(make(e.data as Uint8Array)); w.terminate(); };
      w.onerror = async () => { const m = await import('./noise3d'); resolve(make(m.cloudNoiseData(N))); };
      w.postMessage(N);
    } catch {
      import('./noise3d').then((m) => resolve(make(m.cloudNoiseData(N))));
    }
  });
}
