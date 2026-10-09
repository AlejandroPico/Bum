import * as THREE from 'three';
import type { ModelParams } from '../types';
import { MAT, lathe, cyl, sphere, box, rod, crossFins, gridFins, bombProfile, part, fxSphere, seg, type BuiltModel, type Part, type Step } from './kit';

/*
 * Modelos genéricos y paramétricos. El exterior usa las medidas públicas que llegan en los
 * parámetros; el interior es SIEMPRE una representación conceptual (el diseño real de las armas
 * modernas es secreto).
 */

const fmt = (m: number) => (m >= 10 ? m.toFixed(1) : m.toFixed(2)).replace('.', ',');
const dimsOf = (p: ModelParams, extra = '') => (p.L && p.D ? `${fmt(p.L)} m × ${fmt(p.D)} m${extra}` : extra.replace(/^ · /, ''));
const GENERIC = 'Representación genérica: exterior según medidas públicas; el interior es conceptual y no reproduce el diseño real, que es secreto.';

/** paquete físico conceptual (primario + secundario o núcleo de fisión) centrado en y, con radio r */
function physicsPackage(parts: Part[], kind: 'staged' | 'fission', y: number, r: number, len: number, explodeX: number) {
  if (kind === 'staged') {
    const g = new THREE.Group();
    const casePts: [number, number][] = [[0, 0], [r * 0.8, 0], [r, len * 0.12], [r, len * 0.88], [r * 0.8, len], [0, len]];
    const c = lathe(casePts, MAT.paint(0x7b8590, 0.4, 0.8), 48);
    (c.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    c.position.y = y - len / 2;
    g.add(c);
    parts.push(part('carcasa-rad', 'Carcasa de radiación', 'Envoltura que encierra las dos etapas. Atrapa durante un instante la radiación del primario para que comprima el secundario. Representación conceptual.', g, [explodeX * 0.4, 0, 0], { inner: true, shell: true }));
    const prim = new THREE.Group();
    prim.add(sphere(r * 0.62, MAT.explosive(), y - len * 0.28, 32));
    prim.add(sphere(r * 0.22, MAT.plutonium(), y - len * 0.28, 24));
    parts.push(part('primario', 'Primario', 'Etapa de fisión (de implosión y potenciada) que actúa como detonador del resto. Representación conceptual.', prim, [explodeX, -len * 0.4, 0], { inner: true }));
    const sec = new THREE.Group();
    sec.add(cyl(r * 0.5, y - len * 0.02, y + len * 0.42, MAT.fusion(), 32));
    parts.push(part('secundario', 'Secundario', 'Etapa de fusión con combustible sólido (deuteruro de litio) y material fisionable. Comprimida por la radiación del primario, aporta la mayor parte de la energía. Representación conceptual.', sec, [explodeX, len * 0.4, 0], { inner: true }));
  } else {
    const g = new THREE.Group();
    g.add(sphere(r * 0.8, MAT.explosive(), y, 32));
    g.add(sphere(r * 0.3, MAT.plutonium(), y, 24));
    parts.push(part('nucleo', 'Conjunto de fisión', 'Arma de fisión de implosión: capa de explosivo y núcleo fisible. Representación conceptual.', g, [explodeX, 0, 0], { inner: true }));
  }
}

function stagedSteps(firstCap: string): Step[] {
  return [
    { title: 'El arma', dur: 3, focus: ['carcasa'], cap: firstCap },
    { title: 'El primario', dur: 3, focus: ['primario'], cut: true, cap: 'Todo empieza con una pequeña explosión de fisión en el primario, que actúa como detonador.', anim: (k, c) => { c.glow('primario', k); const p = c.fx('prim'); if (p) { p.visible = true; p.scale.setScalar(0.5 + 0.8 * k); (p.material as THREE.MeshBasicMaterial).opacity = 0.8 * k; } } },
    { title: 'Radiación', dur: 3, focus: ['carcasa-rad', 'secundario'], cut: true, cap: 'Su radiación llena la carcasa y comprime el secundario de manera muy simétrica antes de que llegue la onda de choque.', anim: (k, c) => { const x = c.fx('xr'); if (x) { x.visible = true; (x.material as THREE.MeshBasicMaterial).opacity = 0.35 * k; } c.scale('secundario', [1 - 0.3 * k, 1, 1 - 0.3 * k]); } },
    { title: 'Fusión', dur: 3, focus: ['secundario'], cut: true, cap: 'El combustible comprimido se calienta a decenas de millones de grados y se fusiona; sus neutrones provocan además muchas fisiones.', anim: (k, c) => { c.scale('secundario', [0.7, 1, 0.7]); c.glow('secundario', k); } },
    { title: 'Explosión', dur: 2.5, cap: 'La energía total puede ser cientos o miles de veces la del primario.', anim: (k, c) => { const f = c.fx('flash'); if (f) { f.visible = true; f.scale.setScalar(1 + 10 * k); (f.material as THREE.MeshBasicMaterial).opacity = 1 - k; } c.flash(1 - k); } },
  ];
}

// ============================================================== DOS ETAPAS (conceptual)
export function staged(): BuiltModel {
  const parts: Part[] = [];
  const L = 1.4, R = 0.24;
  const outer = lathe(bombProfile(L, R, 0.2, 0.2, 0.75), MAT.paint(0x9aa0a8, 0.45, 0.7), 64);
  (outer.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  parts.push(part('carcasa', 'Carcasa exterior', 'Envoltura del arma, que protege el conjunto y lo adapta a su vector (bomba, ojiva de misil…).', outer, [0, 0, 0], { shell: true }));
  physicsPackage(parts, 'staged', L * 0.5, R * 0.78, L * 0.72, 0.35);
  const fx = { prim: fxSphere(R * 0.55, 0xffb020, L * 0.5 - L * 0.72 * 0.28), xr: fxSphere(R * 0.75, 0x7dd3fc, L * 0.5), flash: fxSphere(R, 0xfff3d6, L * 0.5) };
  fx.xr.scale.set(1, 2.6, 1);
  const root = new THREE.Group();
  for (const p of parts) root.add(p.obj);
  root.add(fx.prim, fx.xr, fx.flash);
  return {
    title: 'Arma de dos etapas', sub: 'Esquema conceptual del principio Teller-Ulam', root, parts, fx, horizontal: true,
    note: 'Esquema conceptual como el de las enciclopedias: no representa ningún arma real ni sus proporciones.',
    steps: stagedSteps('Un arma termonuclear contiene dos etapas separadas dentro de una carcasa: el primario y el secundario.'),
  };
}

// ============================================================== BOMBA DE CAÍDA LIBRE
export function bomb(p: ModelParams = {}): BuiltModel {
  const L = p.L ?? 3.6, D = p.D ?? 0.46, R = D / 2;
  const parts: Part[] = [];
  const paint = MAT.paint(p.color ? parseInt(p.color.replace('#', ''), 16) : 0x9da3a6, 0.5, 0.55);
  const casing = lathe(bombProfile(L, R, 0.17, 0.25, 0.5), paint, 72);
  (casing.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  parts.push(part('carcasa', 'Carcasa', 'Envoltura aerodinámica de acero o aluminio. En las bombas modernas también protege el interior del calor, de los golpes y de un posible incendio.', casing, [0, 0, 0], { shell: true }));
  const finMat = MAT.paint(0x7e858a, 0.5, 0.5);
  const fins = new THREE.Group();
  if (p.fins === 'ring') {
    fins.add(crossFins(0, L * 0.16, R * 0.45, R * 1.25, Math.max(0.008, D * 0.025), finMat));
    const ring = lathe([[R * 1.2, 0], [R * 1.3, 0], [R * 1.3, L * 0.1], [R * 1.2, L * 0.1], [R * 1.2, 0]], finMat, 48);
    ring.position.y = L * 0.02; fins.add(ring);
  } else if (p.fins !== 'none') {
    fins.add(crossFins(0, L * 0.18, R * 0.45, R * 1.5, Math.max(0.008, D * 0.025), finMat, Math.PI / 4, 4, L * 0.04));
  }
  parts.push(part('cola', 'Cola y estabilizadores', 'Aletas que estabilizan la caída. En muchas bombas termonucleares la cola aloja también un paracaídas que frena la bomba para que el avión pueda alejarse o para explotar en el suelo sin romperse.', fins, [0, -L * 0.22, 0]));
  const chute = cyl(R * 0.55, L * 0.05, L * 0.2, MAT.fabric(), 32);
  parts.push(part('paracaidas', 'Paracaídas', 'Paracaídas plegados (en algunas bombas, varios de nylon y kevlar) que se despliegan para retardar la caída.', chute, [0, -L * 0.5, R * 2.2], { inner: true }));
  const inner = p.inner === 'fission' ? 'fission' : 'staged';
  physicsPackage(parts, inner, L * 0.48, R * 0.75, L * 0.38, R * 4);
  const fuze = new THREE.Group();
  fuze.add(cyl(R * 0.5, L * 0.72, L * 0.86, MAT.electronics(), 32));
  fuze.add(cyl(R * 0.3, L * 0.86, L * 0.93, MAT.darkSteel(), 24));
  parts.push(part('espoletas', 'Espoletas, seguridad y armado', 'Electrónica que decide cuándo y a qué altura explotar (radar, barómetro, temporizador o impacto) y dispositivos de seguridad que impiden una detonación accidental o no autorizada.', fuze, [0, L * 0.25, -R * 2.2], { inner: true }));
  const lugs = new THREE.Group();
  lugs.add(box(D * 0.12, D * 0.08, D * 0.1, MAT.darkSteel(), 0, L * 0.42, R + D * 0.03));
  lugs.add(box(D * 0.12, D * 0.08, D * 0.1, MAT.darkSteel(), 0, L * 0.58, R + D * 0.03));
  parts.push(part('orejetas', 'Orejetas de suspensión', 'Anclajes para colgar la bomba en la bodega o bajo el ala del avión.', lugs, [0, 0, R * 1.2], { minor: true }));
  const fx = { prim: fxSphere(R * 0.5, 0xffb020, L * 0.48 - L * 0.38 * 0.28), xr: fxSphere(R * 0.7, 0x7dd3fc, L * 0.48), flash: fxSphere(R, 0xfff3d6, L * 0.48) };
  fx.xr.scale.set(1, 2.2, 1);
  const root = new THREE.Group();
  for (const q of parts) root.add(q.obj);
  root.add(fx.prim, fx.xr, fx.flash);
  return {
    title: p.label ?? 'Bomba de caída libre', sub: inner === 'staged' ? 'Bomba termonuclear de caída libre' : 'Bomba de fisión de caída libre',
    root, parts, fx, horizontal: true, dims: dimsOf(p), note: GENERIC,
    steps: inner === 'staged' ? stagedSteps('Un avión lleva la bomba hasta el objetivo. Las espoletas eligen la detonación aérea o en el suelo y la cola puede abrir un paracaídas.') : [
      { title: 'El arma', dur: 3, focus: ['carcasa', 'cola'], cap: 'Bomba de fisión lanzada desde un avión.' },
      { title: 'Espoletas', dur: 3, focus: ['espoletas'], cut: true, cap: 'Las espoletas ordenan la detonación a la altura elegida.' },
      { title: 'Implosión', dur: 3, focus: ['nucleo'], cut: true, cap: 'El explosivo comprime el núcleo fisible, que se vuelve supercrítico.', anim: (k, c) => { c.scale('nucleo', 1 - 0.2 * k); c.glow('nucleo', k); } },
      { title: 'Explosión', dur: 2.5, cap: 'La reacción en cadena libera la energía en menos de un microsegundo.', anim: (k, c) => { const f = c.fx('flash'); if (f) { f.visible = true; f.scale.setScalar(1 + 10 * k); (f.material as THREE.MeshBasicMaterial).opacity = 1 - k; } c.flash(1 - k); } },
    ],
  };
}

// ============================================================== VEHÍCULO DE REENTRADA
export function rv(p: ModelParams = {}): BuiltModel {
  const L = p.L ?? 1.75, D = p.D ?? 0.55, R = D / 2;
  const parts: Part[] = [];
  const shell = lathe(([[0, 0], [R, 0], [R * 0.98, L * 0.04]] as [number, number][]).concat(Array.from({ length: 20 }, (_, i) => { const k = (i + 1) / 20; return [R * (1 - k) * 0.98 + R * 0.06 * k, L * 0.04 + (L * 0.96 - R * 0.06) * k] as [number, number]; })).concat([[R * 0.04, L - R * 0.02], [0, L]]), MAT.paint(0x2b2724, 0.8, 0.2), 64);
  (shell.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  parts.push(part('carcasa', 'Escudo térmico', 'Cono de material ablativo (compuestos de carbono) que se va quemando de forma controlada para proteger el interior de los miles de grados de la reentrada a más de 20 veces la velocidad del sonido.', shell, [0, 0, 0], { shell: true }));
  const tip = sphere(R * 0.06, MAT.ceramic(), L - R * 0.04, 16);
  parts.push(part('punta', 'Punta', 'Nariz roma de material muy resistente al calor: la parte que soporta la mayor temperatura.', tip, [0, L * 0.25, 0], { minor: true }));
  physicsPackage(parts, p.inner === 'fission' ? 'fission' : 'staged', L * 0.33, R * 0.55, L * 0.36, R * 3);
  const fuze = cyl(R * 0.22, L * 0.55, L * 0.78, MAT.electronics(), 24);
  parts.push(part('espoletas', 'Espoleta y armado', 'Sistema que arma la ojiva al detectar la secuencia de vuelo correcta (aceleración, reentrada) y decide la altura de la explosión.', fuze, [0, L * 0.3, -R * 2], { inner: true }));
  const base = cyl(R * 0.98, 0, L * 0.03, MAT.darkSteel(), 48);
  parts.push(part('base', 'Base y anclaje al bus', 'Placa trasera con la que la ojiva se fija a la plataforma de liberación del misil.', base, [0, -L * 0.25, 0], { minor: true }));
  const fx = { prim: fxSphere(R * 0.4, 0xffb020, L * 0.2), xr: fxSphere(R * 0.5, 0x7dd3fc, L * 0.33), flash: fxSphere(R, 0xfff3d6, L * 0.33) };
  fx.xr.scale.set(1, 1.6, 1);
  const root = new THREE.Group();
  for (const q of parts) root.add(q.obj);
  root.add(fx.prim, fx.xr, fx.flash);
  return {
    title: p.label ?? 'Vehículo de reentrada', sub: 'Ojiva de misil balístico', root, parts, fx, horizontal: true, dims: dimsOf(p), note: GENERIC,
    steps: [
      { title: 'Separación', dur: 3, focus: ['base'], cap: 'En el espacio, la plataforma del misil suelta cada ojiva hacia su propio objetivo.' },
      { title: 'Reentrada', dur: 3, focus: ['carcasa', 'punta'], cap: 'Cae a unos 7 km/s. El aire comprimido delante del cono alcanza miles de grados y el escudo ablativo se consume poco a poco.', anim: (k, c) => c.glow('punta', k) },
      ...stagedSteps('').slice(1),
    ],
  };
}

// ============================================================== MISIL BALÍSTICO
export function missile(p: ModelParams = {}): BuiltModel {
  const L = p.L ?? 18, D = p.D ?? 1.7, R = D / 2;
  const n = Math.max(1, Math.min(4, p.stages ?? 3));
  const W = Math.max(1, Math.min(12, p.warheads ?? 1));
  const parts: Part[] = [];
  const fairLen = Math.min(L * 0.18, D * 2.6);
  const stageLen = (L - fairLen) / n;
  const colors = [0xd9dcd8, 0xc9ccc8, 0xbfc2be, 0xb5b8b4];
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group();
    const r = R * (1 - i * 0.06);
    const y0 = i * stageLen;
    g.add(cyl(r, y0 + stageLen * 0.06, y0 + stageLen, MAT.paint(colors[i], 0.55, 0.3), 48));
    g.add(cyl(r * 0.45, y0, y0 + stageLen * 0.08, MAT.darkSteel(), 32, r * 0.25));
    if (i > 0) g.add(cyl(r * 1.0, y0 - stageLen * 0.03, y0 + stageLen * 0.06, MAT.darkSteel(), 48, R * (1 - (i - 1) * 0.06)));
    const nm = ['Primera', 'Segunda', 'Tercera', 'Cuarta'][i];
    parts.push(part(`etapa${i + 1}`, `${nm} etapa`, i === 0 ? 'La etapa más grande: en un par de minutos eleva el misil por encima de la atmósfera densa. Cuando se agota, se separa y cae.' : 'Motor cohete que sigue acelerando el misil fuera de la atmósfera hasta la velocidad necesaria (unos 7 km/s en un misil intercontinental) y luego se separa.', g, [0, -L * 0.12 * (n - i), 0]));
  }
  const top = n * stageLen;
  const bus = new THREE.Group();
  bus.add(cyl(R * 0.8, top, top + fairLen * 0.18, MAT.electronics(), 40));
  const rvL = Math.min(fairLen * 0.6, D * 1.1), rvR = Math.min(R * 0.36, (R * 0.9 * Math.PI) / Math.max(W, 3));
  for (let i = 0; i < W; i++) {
    const a = (i / W) * Math.PI * 2;
    const rr = W === 1 ? 0 : R * 0.48;
    const c = lathe([[0, 0], [rvR, 0], [rvR * 0.06, rvL], [0, rvL]], MAT.paint(0x2b2724, 0.8, 0.2), 24);
    c.position.set(Math.cos(a) * rr, top + fairLen * 0.18, Math.sin(a) * rr);
    bus.add(c);
  }
  parts.push(part('bus', W > 1 ? `Plataforma con ${W} ojivas (MIRV)` : 'Ojiva', W > 1 ? 'El "bus" es una pequeña nave con motores propios que, en el espacio, se orienta y suelta cada vehículo de reentrada hacia un objetivo distinto.' : 'Vehículo de reentrada con la cabeza nuclear.', bus, [0, L * 0.06, 0], { inner: true }));
  const fair = lathe(([[R, 0], [R, fairLen * 0.35]] as [number, number][]).concat(Array.from({ length: 16 }, (_, i) => { const k = (i + 1) / 16; return [R * Math.cos((k * Math.PI) / 2), fairLen * 0.35 + fairLen * 0.65 * Math.sin((k * Math.PI) / 2)] as [number, number]; })), MAT.paint(0xe6e8e4, 0.5, 0.3), 48);
  (fair.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  fair.position.y = top;
  parts.push(part('cofia', 'Cofia', 'Carenado aerodinámico que protege las ojivas durante el ascenso y se desprende al salir de la atmósfera.', fair, [0, L * 0.14, 0], { shell: true }));
  const fx = { flame: fxSphere(R * 1.4, 0xffa040, -R * 1.5) };
  fx.flame.scale.set(0.6, 2.6, 0.6);
  const root = new THREE.Group();
  for (const q of parts) root.add(q.obj);
  root.add(fx.flame);
  const steps: Step[] = [
    { title: 'Lanzamiento', dur: 3, focus: ['etapa1'], cap: 'El misil sale del silo, del submarino o del lanzador móvil y la primera etapa lo empuja hacia arriba.', anim: (k, c) => { const f = c.fx('flame'); if (f) { f.visible = true; (f.material as THREE.MeshBasicMaterial).opacity = 0.8; f.scale.set(0.6, 2 + Math.sin(k * 40) * 0.2, 0.6); } } },
  ];
  for (let i = 1; i < n; i++) steps.push({ title: `Separación ${i}`, dur: 2.5, focus: [`etapa${i + 1}`], cap: `La ${['primera', 'segunda', 'tercera'][i - 1]} etapa agotada se separa y cae; se enciende la siguiente.`, anim: (k, c) => { for (let j = 0; j < i; j++) c.offset(`etapa${j + 1}`, 0, -L * 0.15 * (i - j) * seg(k, 0, 1), 0); if (i === n - 1) c.offset('cofia', 0, L * 0.12 * k, 0); } });
  steps.push({ title: W > 1 ? 'Liberación de ojivas' : 'Fase balística', dur: 3, focus: ['bus'], cut: true, cap: W > 1 ? 'Fuera de la atmósfera se desprende la cofia y el bus suelta las ojivas una a una hacia objetivos distintos, a cientos de kilómetros entre sí.' : 'La ojiva sigue una trayectoria balística por el espacio, a más de 1000 km de altura en un misil intercontinental.', anim: (k, c) => { for (let j = 0; j < n; j++) c.offset(`etapa${j + 1}`, 0, -L * 0.6, 0); c.offset('cofia', 0, L * 0.25, 0); c.fade('cofia', 1 - k); } });
  steps.push({ title: 'Reentrada', dur: 3, focus: ['bus'], cap: 'Unos 30 minutos después del lanzamiento (un misil intercontinental), las ojivas vuelven a la atmósfera a unos 7 km/s y caen sobre sus objetivos.' });
  return { title: p.label ?? 'Misil balístico', sub: `${n} etapa${n > 1 ? 's' : ''}${W > 1 ? ` · ${W} ojivas` : ''}`, root, parts, fx, horizontal: false, dims: dimsOf(p), note: GENERIC, steps };
}

// ============================================================== MISIL DE CRUCERO
export function cruise(p: ModelParams = {}): BuiltModel {
  const L = p.L ?? 6.3, D = p.D ?? 0.62, R = D / 2;
  const parts: Part[] = [];
  const body = lathe(bombProfile(L, R, 0.12, 0.1, 0.6, 0.1), MAT.paint(0xb9bcbf, 0.5, 0.45), 48);
  (body.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  parts.push(part('carcasa', 'Fuselaje', 'Cuerpo de un pequeño avión no tripulado. Vuela bajo y a velocidad subsónica (o supersónica, en algunos modelos) siguiendo el relieve para eludir los radares.', body, [0, 0, 0], { shell: true }));
  const wings = new THREE.Group();
  const wm = MAT.paint(0x9fa3a6, 0.5, 0.45);
  wings.add(box(D * 0.05, L * 0.07, L * 0.6, wm, 0, L * 0.5, 0));
  wings.add(crossFins(0, L * 0.08, R * 0.6, R * 2.0, D * 0.03, wm, 0, 3));
  parts.push(part('alas', 'Alas y timones', 'Las alas se despliegan tras el lanzamiento; los timones de cola corrigen el rumbo que marca el sistema de guiado.', wings, [0, 0, R * 3]));
  const eng = new THREE.Group();
  eng.add(cyl(R * 0.6, L * 0.04, L * 0.22, MAT.darkSteel(), 32));
  eng.add(box(D * 0.5, L * 0.12, D * 0.35, MAT.darkSteel(), 0, L * 0.25, -R * 0.95));
  parts.push(part('motor', 'Motor turborreactor', 'Pequeño motor a reacción con toma de aire bajo el fuselaje, que le da un alcance de miles de kilómetros.', eng, [0, -L * 0.25, 0], { inner: true }));
  const guide = cyl(R * 0.6, L * 0.78, L * 0.9, MAT.electronics(), 32);
  parts.push(part('guiado', 'Guiado', 'Navegación inercial y por satélite combinada con radares que comparan el relieve con mapas almacenados.', guide, [0, L * 0.2, 0], { inner: true }));
  physicsPackage(parts, p.inner === 'fission' ? 'fission' : 'staged', L * 0.64, R * 0.6, L * 0.16, R * 3);
  const fx = { prim: fxSphere(R * 0.4, 0xffb020, L * 0.6), xr: fxSphere(R * 0.5, 0x7dd3fc, L * 0.64), flash: fxSphere(R, 0xfff3d6, L * 0.64) };
  const root = new THREE.Group();
  for (const q of parts) root.add(q.obj);
  root.add(fx.prim, fx.xr, fx.flash);
  return { title: p.label ?? 'Misil de crucero', sub: 'Misil de crucero con cabeza nuclear', root, parts, fx, horizontal: true, dims: dimsOf(p), note: GENERIC,
    steps: [
      { title: 'Lanzamiento', dur: 3, focus: ['carcasa', 'alas'], cap: 'Se lanza desde un avión, un barco o un submarino; despliega las alas y enciende el motor.' },
      { title: 'Vuelo a baja cota', dur: 3, focus: ['motor', 'guiado'], cut: true, cap: 'Vuela durante horas a pocas decenas de metros del suelo, guiado por satélite y por el relieve.' },
      ...stagedSteps('').slice(1),
    ] };
}

// ============================================================== TORPEDO / DRON SUBMARINO
export function torpedo(p: ModelParams = {}): BuiltModel {
  const L = p.L ?? 20, D = p.D ?? 1.8, R = D / 2;
  const parts: Part[] = [];
  const pts: [number, number][] = [[0, 0], [R * 0.25, 0], [R * 0.7, L * 0.08], [R, L * 0.18], [R, L * 0.9]];
  for (let i = 1; i <= 12; i++) { const k = i / 12; pts.push([R * Math.cos((k * Math.PI) / 2), L * 0.9 + L * 0.1 * Math.sin((k * Math.PI) / 2)]); }
  const body = lathe(pts, MAT.paint(0x2f3438, 0.6, 0.5), 64);
  (body.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  parts.push(part('carcasa', 'Casco', 'Cuerpo hidrodinámico capaz de soportar la presión a gran profundidad.', body, [0, 0, 0], { shell: true }));
  const prop = new THREE.Group();
  prop.add(crossFins(L * 0.01, L * 0.07, R * 0.3, R * 0.95, D * 0.03, MAT.darkSteel(), 0, 4));
  const shroud = lathe([[R * 0.85, 0], [R * 0.92, 0], [R * 0.92, L * 0.05], [R * 0.85, L * 0.05], [R * 0.85, 0]], MAT.darkSteel(), 48);
  shroud.position.y = L * 0.01; prop.add(shroud);
  parts.push(part('propulsor', 'Propulsor', 'Hélice carenada (bomba de chorro) y timones de cola.', prop, [0, -L * 0.1, 0]));
  const reactor = cyl(R * 0.7, L * 0.2, L * 0.48, MAT.paint(0x6f7a86, 0.5, 0.7), 40);
  parts.push(part('reactor', 'Reactor nuclear', 'Según las fuentes rusas, un pequeño reactor nuclear le da una autonomía prácticamente ilimitada. Representación conceptual.', reactor, [0, 0, R * 3], { inner: true }));
  const ctrl = cyl(R * 0.6, L * 0.5, L * 0.62, MAT.electronics(), 32);
  parts.push(part('control', 'Navegación y control', 'Sistemas de guiado autónomo para la travesía submarina.', ctrl, [0, 0, -R * 3], { inner: true }));
  physicsPackage(parts, 'staged', L * 0.78, R * 0.7, L * 0.2, R * 3);
  const fx = { prim: fxSphere(R * 0.4, 0xffb020, L * 0.73), xr: fxSphere(R * 0.6, 0x7dd3fc, L * 0.78), flash: fxSphere(R, 0xfff3d6, L * 0.78) };
  const root = new THREE.Group();
  for (const q of parts) root.add(q.obj);
  root.add(fx.prim, fx.xr, fx.flash);
  return { title: p.label ?? 'Torpedo nuclear', sub: 'Dron submarino de propulsión nuclear', root, parts, fx, horizontal: true, dims: dimsOf(p), note: GENERIC + ' Las medidas son estimaciones públicas.',
    steps: [
      { title: 'Lanzamiento', dur: 3, focus: ['carcasa'], cap: 'Se lanza desde un submarino especial y navega de forma autónoma.' },
      { title: 'Travesía', dur: 3, focus: ['reactor', 'propulsor'], cut: true, cap: 'El reactor mueve el propulsor durante días a gran profundidad, donde es difícil de detectar.' },
      ...stagedSteps('').slice(1),
    ] };
}

// ============================================================== PROYECTIL DE ARTILLERÍA
export function shell(p: ModelParams = {}): BuiltModel {
  const L = p.L ?? 0.85, D = p.D ?? 0.155, R = D / 2;
  const crockett = /crockett|m388/i.test(p.label ?? '');
  const parts: Part[] = [];
  let body: THREE.Mesh;
  if (crockett) {
    const pts: [number, number][] = [[0, L * 0.18], [R * 0.25, L * 0.18], [R * 0.6, L * 0.35], [R, L * 0.55], [R, L * 0.7]];
    for (let i = 1; i <= 12; i++) { const k = i / 12; pts.push([R * Math.cos((k * Math.PI) / 2), L * 0.7 + L * 0.3 * Math.sin((k * Math.PI) / 2)]); }
    body = lathe(pts, MAT.paint(0x5a6040, 0.6, 0.3), 48);
  } else {
    const pts: [number, number][] = [[0, 0], [R, 0], [R, L * 0.6]];
    for (let i = 1; i <= 14; i++) { const k = i / 14; pts.push([R * (1 - k) ** 0.8 * 0.98 + R * 0.12 * k, L * 0.6 + L * 0.34 * k]); }
    pts.push([0, L * 0.94]);
    body = lathe(pts, MAT.paint(0x5a6040, 0.6, 0.3), 48);
  }
  (body.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  parts.push(part('carcasa', 'Cuerpo del proyectil', crockett ? 'Proyectil M388 del Davy Crockett, con forma de sandía alargada y estabilizado por aletas. Se disparaba con un cañón sin retroceso a 2–4 km.' : 'Proyectil de artillería del mismo calibre que los obuses convencionales, para que pudiera dispararse con piezas corrientes.', body, [0, 0, 0], { shell: true }));
  if (crockett) {
    const t = new THREE.Group();
    t.add(cyl(R * 0.18, 0, L * 0.25, MAT.darkSteel(), 16));
    t.add(crossFins(0, L * 0.12, R * 0.18, R * 0.8, D * 0.04, MAT.darkSteel(), 0, 4));
    parts.push(part('cola', 'Vástago y aletas', 'El proyectil se montaba sobre un pistón que entraba en el tubo del lanzador; las aletas lo estabilizaban en vuelo.', t, [0, -L * 0.3, 0]));
  } else {
    const band = cyl(R * 1.02, L * 0.08, L * 0.12, MAT.brass(), 32);
    parts.push(part('banda', 'Banda de forzamiento', 'Anillo de cobre que se agarra a las estrías del cañón y hace girar el proyectil para estabilizarlo.', band, [0, 0, R * 3], { minor: true }));
    const fz = cyl(R * 0.2, L * 0.92, L, MAT.darkSteel(), 16, R * 0.05);
    parts.push(part('espoleta', 'Espoleta', 'Espoleta de tiempo o de proximidad que hacía estallar el proyectil en el aire sobre el objetivo.', fz, [0, L * 0.2, 0]));
  }
  physicsPackage(parts, 'fission', L * (crockett ? 0.62 : 0.45), R * 0.75, L * 0.3, R * 4);
  const fx = { flash: fxSphere(R, 0xfff3d6, L * 0.5) };
  const root = new THREE.Group();
  for (const q of parts) root.add(q.obj);
  root.add(fx.flash);
  return { title: p.label ?? 'Proyectil nuclear', sub: 'Arma nuclear táctica de artillería', root, parts, fx, horizontal: true, dims: dimsOf(p), note: GENERIC,
    steps: [
      { title: 'Disparo', dur: 3, focus: ['carcasa'], cap: crockett ? 'Un equipo de tres soldados disparaba el proyectil desde un trípode o un jeep.' : 'Se disparaba con un obús corriente a unos 14–18 km.' },
      { title: 'Implosión', dur: 3, focus: ['nucleo'], cut: true, cap: 'Un pequeño conjunto de implosión comprime el núcleo fisible.', anim: (k, c) => { c.scale('nucleo', 1 - 0.2 * k); c.glow('nucleo', k); } },
      { title: 'Explosión', dur: 2.5, cap: 'Potencias de decenas de toneladas a unos kilotones: suficiente para destruir una formación de carros… y para exponer a los propios soldados.', anim: (k, c) => { const f = c.fx('flash'); if (f) { f.visible = true; f.scale.setScalar(1 + 10 * k); (f.material as THREE.MeshBasicMaterial).opacity = 1 - k; } c.flash(1 - k); } },
    ] };
}

// ============================================================== BOMBA CONVENCIONAL
export function conventional(p: ModelParams = {}): BuiltModel {
  const L = p.L ?? 9.2, D = p.D ?? 1.03, R = D / 2;
  const parts: Part[] = [];
  const casing = lathe(bombProfile(L, R, 0.14, 0.18, 0.55, 0.3), MAT.paint(p.color ? parseInt(p.color.replace('#', ''), 16) : 0x6e7660, 0.6, 0.35), 64);
  (casing.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  parts.push(part('carcasa', 'Carcasa', 'Cuerpo de acero o aluminio que contiene el explosivo. En las bombas de penetración es de acero muy grueso para atravesar hormigón y roca antes de estallar.', casing, [0, 0, 0], { shell: true }));
  const fins = new THREE.Group();
  if (p.fins === 'grid') fins.add(gridFins(L * 0.06, R * 0.55, D * 0.75, MAT.darkSteel()));
  else if (p.fins !== 'none') fins.add(crossFins(0, L * 0.16, R * 0.45, R * 1.6, Math.max(0.01, D * 0.03), MAT.darkSteel(), Math.PI / 4, 4, L * 0.03));
  parts.push(part('cola', p.fins === 'grid' ? 'Aletas en rejilla' : 'Aletas', p.fins === 'grid' ? 'Aletas en celosía, como las de los cohetes espaciales: muy eficaces para controlar el vuelo de una bomba tan grande.' : 'Estabilizadores de cola.', fins, [0, -L * 0.15, 0]));
  const fill = lathe(bombProfile(L * 0.7, R * 0.88, 0.16, 0.2, 0.6, 0.3), MAT.explosive(), 48);
  fill.position.y = L * 0.18;
  parts.push(part('explosivo', 'Carga explosiva', 'La mayor parte del peso es explosivo convencional. En las termobáricas se dispersa primero una nube de combustible que luego se enciende, lo que prolonga la onda de presión.', fill, [0, 0, R * 3], { inner: true }));
  const fuze = cyl(R * 0.2, L * 0.86, L * 0.96, MAT.electronics(), 24);
  parts.push(part('espoleta', 'Espoleta', 'Decide el momento de la explosión: en el aire, al impacto o con retardo tras penetrar.', fuze, [0, L * 0.12, 0], { inner: true }));
  const fx = { flash: fxSphere(R * 1.2, 0xffc06a, L * 0.5) };
  const root = new THREE.Group();
  for (const q of parts) root.add(q.obj);
  root.add(fx.flash);
  return { title: p.label ?? 'Bomba convencional', sub: 'Bomba de explosivo químico', root, parts, fx, horizontal: true, dims: dimsOf(p), note: 'Representación aproximada a partir de las medidas exteriores públicas.',
    steps: [
      { title: 'Lanzamiento', dur: 3, focus: ['carcasa', 'cola'], cap: 'Se lanza desde un avión de carga o un bombardero; las aletas la guían hacia el objetivo.' },
      { title: 'Detonación', dur: 3, focus: ['espoleta', 'explosivo'], cut: true, cap: 'La espoleta inicia la carga y la detonación recorre el explosivo a varios kilómetros por segundo.', anim: (k, c) => c.glow('explosivo', k) },
      { title: 'Explosión', dur: 2.5, cap: 'Una gran bomba convencional libera la energía de unas toneladas de TNT: miles de veces menos que la bomba de Hiroshima.', anim: (k, c) => { const f = c.fx('flash'); if (f) { f.visible = true; f.scale.setScalar(1 + 6 * k); (f.material as THREE.MeshBasicMaterial).opacity = 1 - k; } c.flash((1 - k) * 0.6); } },
    ] };
}
