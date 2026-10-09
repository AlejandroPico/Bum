import * as THREE from 'three';

/**
 * Utilidades para construir los modelos de la enciclopedia.
 * Convención: cada modelo se construye en un marco "axial" con el eje de la pieza en +Y
 * (de la cola a la punta). El visor gira el conjunto para mostrarlo en horizontal si hace falta.
 */

export interface Part {
  id: string;
  name: string;
  desc: string;
  obj: THREE.Object3D;
  /** desplazamiento al desmontar (en el marco axial, metros) */
  explode: THREE.Vector3;
  /** pieza interior (se ve en corte, rayos X o desmontado) */
  inner?: boolean;
  /** envoltura exterior: se vuelve translúcida en modo rayos X */
  shell?: boolean;
  /** se puede ocultar en la lista (piezas auxiliares) */
  minor?: boolean;
}

export interface AnimCtx {
  /** desplazamiento adicional (marco axial) */
  offset(id: string, x: number, y: number, z: number): void;
  scale(id: string, s: number | [number, number, number]): void;
  glow(id: string, v: number, color?: number): void;
  hide(id: string): void;
  /** opacidad (0..1) de una pieza */
  fade(id: string, a: number): void;
  /** efectos: esferas de luz y onda */
  fx(name: string): THREE.Mesh | undefined;
  /** destello general del visor 0..1 */
  flash(v: number): void;
}

export interface Step {
  title: string;
  cap: string;
  /** duración en segundos de la animación del paso */
  dur: number;
  /** piezas que se resaltan */
  focus?: string[];
  /** muestra el interior durante el paso */
  cut?: boolean;
  anim?: (k: number, c: AnimCtx) => void;
}

export interface BuiltModel {
  title: string;
  /** frase bajo el título del visor */
  sub: string;
  root: THREE.Group;
  parts: Part[];
  steps: Step[];
  fx: Record<string, THREE.Mesh>;
  /** orientación horizontal (gira +Y → +X) */
  horizontal: boolean;
  /** radio de encuadre y centro (marco del mundo) — se calculan en el visor si faltan */
  focus?: { center: THREE.Vector3; radius: number };
  dims?: string;
  note?: string;
}

// ---------------------------------------------------------------- materiales
export const MAT = {
  paint: (color: number, rough = 0.55, metal = 0.35) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }),
  steel: () => new THREE.MeshStandardMaterial({ color: 0x9aa1aa, roughness: 0.35, metalness: 0.85 }),
  darkSteel: () => new THREE.MeshStandardMaterial({ color: 0x4b5058, roughness: 0.45, metalness: 0.8 }),
  brass: () => new THREE.MeshStandardMaterial({ color: 0xb08d4a, roughness: 0.35, metalness: 0.9 }),
  explosive: () => new THREE.MeshStandardMaterial({ color: 0xc8743a, roughness: 0.85, metalness: 0.0, flatShading: true }),
  uranium: () => new THREE.MeshStandardMaterial({ color: 0x8bd450, roughness: 0.4, metalness: 0.6, emissive: 0x0d1a05 }),
  plutonium: () => new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.35, metalness: 0.65, emissive: 0x120820 }),
  fusion: () => new THREE.MeshStandardMaterial({ color: 0x5eead4, roughness: 0.45, metalness: 0.3, emissive: 0x041a17 }),
  tamper: () => new THREE.MeshStandardMaterial({ color: 0x6f7a86, roughness: 0.5, metalness: 0.7 }),
  electronics: () => new THREE.MeshStandardMaterial({ color: 0x2f5d3a, roughness: 0.6, metalness: 0.3 }),
  cable: () => new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.7, metalness: 0.1 }),
  rubber: () => new THREE.MeshStandardMaterial({ color: 0x1e2126, roughness: 0.9, metalness: 0.0 }),
  fabric: () => new THREE.MeshStandardMaterial({ color: 0xd8d0b8, roughness: 0.95, metalness: 0.0 }),
  concrete: () => new THREE.MeshStandardMaterial({ color: 0x8c8a84, roughness: 0.95, metalness: 0.0 }),
  wood: () => new THREE.MeshStandardMaterial({ color: 0x8a6a46, roughness: 0.9, metalness: 0.0 }),
  ceramic: () => new THREE.MeshStandardMaterial({ color: 0x3b2f2a, roughness: 0.8, metalness: 0.1 }),
  glow: (color = 0xffb020) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
};

// ---------------------------------------------------------------- geometrías
/** sólido de revolución alrededor de Y; puntos [radio, altura] */
export function lathe(pts: [number, number][], mat: THREE.Material, seg = 64): THREE.Mesh {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), seg);
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

/** cilindro a lo largo de Y entre y0 e y1 */
export function cyl(r: number, y0: number, y1: number, mat: THREE.Material, seg = 48, r1 = r, open = false): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r, Math.abs(y1 - y0), seg, 1, open), mat);
  m.position.y = (y0 + y1) / 2;
  return m;
}

/** tubo hueco (anillo) a lo largo de Y */
export function tube(rOut: number, rIn: number, y0: number, y1: number, mat: THREE.Material, seg = 48): THREE.Mesh {
  const h = y1 - y0;
  const pts: [number, number][] = [[rIn, 0], [rOut, 0], [rOut, h], [rIn, h], [rIn, 0]];
  const m = lathe(pts, mat, seg);
  m.position.y = y0;
  return m;
}

export function sphere(r: number, mat: THREE.Material, y = 0, detail = 48): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, detail, Math.round(detail * 0.66)), mat);
  m.position.y = y;
  return m;
}

export function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

/** varilla entre dos puntos */
export function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material, seg = 8): THREE.Mesh {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), seg), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

/** tubo curvo que pasa por varios puntos (cables) */
export function cableAlong(pts: THREE.Vector3[], r: number, mat: THREE.Material): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, pts.length * 8), r, 6, false), mat);
}

/** cuatro aletas planas alrededor del eje Y */
export function crossFins(y0: number, y1: number, rIn: number, rOut: number, t: number, mat: THREE.Material, rot = Math.PI / 4, n = 4, sweep = 0): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const shape = new THREE.Shape();
    shape.moveTo(rIn, y0);
    shape.lineTo(rOut, y0 + sweep);
    shape.lineTo(rOut, y1);
    shape.lineTo(rIn, y1 + (y1 - y0) * 0.35);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
    geo.translate(0, 0, -t / 2);
    const m = new THREE.Mesh(geo, mat);
    m.rotation.y = rot + (i * Math.PI * 2) / n;
    g.add(m);
  }
  return g;
}

/** marco de cola en caja (Little Boy / Fat Man): 4 placas formando un cuadrado */
export function boxTail(y0: number, y1: number, half: number, t: number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const h = y1 - y0;
  for (let i = 0; i < 4; i++) {
    const p = box(half * 2, h, t, mat);
    const a = (i * Math.PI) / 2;
    p.position.set(Math.sin(a) * half, y0 + h / 2, Math.cos(a) * half);
    p.rotation.y = a;
    g.add(p);
  }
  return g;
}

/** aletas en rejilla (MOAB, GBU-57): celosías cuyo plano es perpendicular al eje */
export function gridFins(y: number, rBody: number, size: number, mat: THREE.Material, n = 4): THREE.Group {
  const g = new THREE.Group();
  const cells = 4, s = size / cells, t = size * 0.025, chord = size * 0.3;
  for (let i = 0; i < n; i++) {
    const fin = new THREE.Group();
    for (let k = 0; k <= cells; k++) {
      const o = -size / 2 + k * s;
      fin.add(box(size, chord, t, mat, 0, 0, o)); // barras radiales
      fin.add(box(t, chord, size, mat, o, 0, 0)); // barras tangenciales
    }
    const a = (i * Math.PI * 2) / n + Math.PI / 4;
    fin.position.set(Math.cos(a) * (rBody + size / 2), y, -Math.sin(a) * (rBody + size / 2));
    fin.rotation.y = a;
    g.add(fin);
  }
  return g;
}

/** perfil de bomba aerodinámica [radio, y] (y de 0 en la cola a L en la punta) */
export function bombProfile(L: number, R: number, noseFrac = 0.18, tailFrac = 0.28, tailR = 0.45, blunt = 0.25): [number, number][] {
  const pts: [number, number][] = [];
  const yT = L * tailFrac, yN = L * (1 - noseFrac);
  pts.push([0, 0]);
  pts.push([R * tailR, 0]);
  for (let i = 1; i <= 10; i++) { const k = i / 10; pts.push([R * (tailR + (1 - tailR) * Math.sin((k * Math.PI) / 2)), yT * k]); }
  pts.push([R, yN]);
  for (let i = 1; i <= 16; i++) {
    const k = i / 16;
    const r = R * Math.sqrt(Math.max(0, 1 - k * k)) * (1 - blunt * k) + R * blunt * (1 - k) * 0;
    pts.push([r, yN + L * noseFrac * k]);
  }
  pts.push([0, L]);
  return pts;
}

export function part(id: string, name: string, desc: string, obj: THREE.Object3D, explode: [number, number, number] = [0, 0, 0], extra: Partial<Part> = {}): Part {
  obj.name = id;
  return { id, name, desc, obj, explode: new THREE.Vector3(...explode), ...extra };
}

/** esfera de efecto (destello, frente de compresión, radiación) */
export function fxSphere(r: number, color: number, y = 0): THREE.Mesh {
  const m = sphere(r, MAT.glow(color), y, 40);
  m.renderOrder = 10;
  m.visible = false;
  return m;
}

/** direcciones repartidas sobre una esfera (vértices de icosaedro + dodecaedro) */
export function spherePoints(): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const ico = new THREE.IcosahedronGeometry(1, 0).getAttribute('position');
  const dod = new THREE.DodecahedronGeometry(1, 0).getAttribute('position');
  const add = (attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
    for (let i = 0; i < attr.count; i++) {
      const v = new THREE.Vector3(attr.getX(i), attr.getY(i), attr.getZ(i)).normalize();
      if (!out.some((o) => o.distanceTo(v) < 1e-3)) out.push(v);
    }
  };
  add(ico); add(dod);
  return out;
}

export const ease = (k: number) => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
export const seg = (k: number, a: number, b: number) => ease((k - a) / (b - a));
