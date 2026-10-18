/**
 * Rendimiento: nivel de calidad común a toda la app y detección de equipos poco potentes.
 *
 * Niveles (el mismo número que «Calidad» en el panel):
 *  - 0,25 Mínima: mapa a ¾ de resolución, sin suavizado de bordes, sin nube volumétrica ni
 *    post-procesado, pocas partículas, 30 fotogramas por segundo como máximo;
 *  - 0,5 Baja: igual pero con el mapa a resolución normal (1 píxel por píxel CSS);
 *  - 1 Alta: nube volumétrica, post-procesado y pantalla de alta densidad (hasta ×2);
 *  - 1,6 Ultra: más pasos en la nube y más partículas.
 * Con «Auto» se empieza según el equipo y se baja sola si la simulación va a saltos.
 */
export const perf = {
  q: 1,
  /** modo ligero: Baja o Mínima */
  get lite() { return this.q <= 0.5; },
  /** se detectó un equipo poco potente (gráfica integrada, pocos núcleos o poca memoria) */
  lowPower: false,
  /** equipo muy modesto (móvil de gama baja, poca memoria o ahorro de datos): se empieza en Mínima */
  weak: false,
  gpu: '',
};

/** píxeles del mapa por píxel CSS para cada nivel */
export function pixelRatioFor(q: number): number {
  const d = window.devicePixelRatio || 1;
  if (q <= 0.25) return Math.min(d, 0.75);
  if (q <= 0.5) return Math.min(d, 1);
  if (q <= 1) return Math.min(d, 2);
  return d;
}

/** fotogramas por segundo máximos de la animación (0 = sin límite) */
export const maxFpsFor = (q: number) => (q <= 0.25 ? 24 : q <= 0.5 ? 30 : 0);

/**
 * Detección (sin coste apreciable): nombre de la tarjeta gráfica, núcleos, memoria y tipo de
 * pantalla. Las gráficas integradas (Intel, móviles) y los renderizadores por software cuentan
 * como poco potentes; las gráficas dedicadas y los Mac con chip propio, no.
 */
export function detectLowPower(): boolean {
  let gpu = '';
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch { /* sin WebGL */ }
  perf.gpu = gpu;
  const g = gpu.toLowerCase();
  const dedicated = /nvidia|geforce|quadro|rtx|gtx|radeon rx|radeon pro|apple m\d|arc a\d/.test(g);
  const weakGpu = /intel|uhd|iris|hd graphics|mali|adreno|powervr|swiftshader|llvmpipe|software|microsoft basic|apple gpu|videocore/.test(g);
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency || 4;
  const mem = nav.deviceMemory ?? 8;
  const touch = matchMedia('(pointer: coarse)').matches;
  // pantallas de mucha densidad con gráfica integrada: muchos píxeles que mover
  const px = screen.width * screen.height * (window.devicePixelRatio || 1) ** 2;
  const low = (!dedicated && (weakGpu || cores <= 4 || mem <= 4 || touch)) || (weakGpu && px > 4e6);
  perf.lowPower = low;
  // gama baja: gráficas móviles antiguas, 2–3 GB de memoria o el modo de ahorro de datos
  const oldGpu = /mali-[2-4]\d\d|mali-t\d|mali-g(31|51|52|57)|adreno \(tm\) [3-5]\d\d|adreno [3-5]\d\d|powervr|videocore|swiftshader|llvmpipe/.test(g);
  const saveData = !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  perf.weak = touch && (oldGpu || mem <= 3 || cores <= 4) || saveData;
  return low;
}
