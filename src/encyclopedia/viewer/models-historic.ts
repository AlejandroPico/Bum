import * as THREE from 'three';
import { MAT, lathe, cyl, tube, sphere, box, rod, cableAlong, boxTail, part, fxSphere, spherePoints, seg, type BuiltModel, type Part } from './kit';

/*
 * Modelos históricos con piezas: Little Boy, Fat Man, el Gadget de Trinity y Sausage (Ivy Mike).
 * Medidas EXTERIORES según los datos públicos; el interior es un esquema de museo: muestra
 * qué pieza hacía qué y en qué orden, con proporciones aproximadas, no un plano.
 */

// ============================================================== LITTLE BOY
export function littleBoy(): BuiltModel {
  const L = 3.0, R = 0.355; // 3,0 m × 0,71 m
  const parts: Part[] = [];
  const olive = MAT.paint(0x5a6040, 0.7, 0.25);

  const casePts: [number, number][] = [[0, 0.62], [0.24, 0.62], [0.3, 0.7], [R, 0.82], [R, 2.72]];
  for (let i = 1; i <= 14; i++) { const k = i / 14; casePts.push([R * Math.cos((k * Math.PI) / 2) * (1 - 0.15 * k) + 0.03 * (1 - k), 2.72 + 0.28 * Math.sin((k * Math.PI) / 2)]); }
  casePts.push([0, L]);
  const casing = lathe(casePts, olive, 72);
  (casing.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  parts.push(part('carcasa', 'Carcasa', 'Envoltura de acero de 3 m de largo y 71 cm de diámetro que protegía el mecanismo y daba forma aerodinámica a la bomba. Por fuera llevaba orejetas para colgarla en la bodega del B-29.', casing, [0, 0, 0], { shell: true }));

  const tailMat = MAT.paint(0x4f5538, 0.7, 0.25);
  const tail = new THREE.Group();
  tail.add(boxTail(0, 0.62, 0.36, 0.012, tailMat));
  for (let i = 0; i < 4; i++) { const f = box(0.012, 0.6, 0.42, tailMat, 0, 0.3, 0); f.rotation.y = Math.PI / 4 + (i * Math.PI) / 2; f.position.set(Math.sin(f.rotation.y) * 0.16, 0.3, Math.cos(f.rotation.y) * 0.16); tail.add(f); }
  parts.push(part('cola', 'Cola en caja', 'Estabilizadores unidos por un marco rectangular. Mantenían la bomba recta durante los 44 segundos de caída desde 9 500 m.', tail, [0, -0.7, 0]));

  const barrel = new THREE.Group();
  barrel.add(tube(0.085, 0.065, 0.78, 2.42, MAT.darkSteel()));
  barrel.add(cyl(0.13, 0.66, 0.8, MAT.darkSteel()));
  parts.push(part('canon', 'Cañón', 'Tubo de artillería naval modificado, el corazón del principio de cañón: guiaba el proyectil hasta el blanco. Era la pieza más larga del interior.', barrel, [0, 0, 0.55], { inner: true }));

  const charges = new THREE.Group();
  for (let i = 0; i < 4; i++) charges.add(cyl(0.055, 0.69 + i * 0.026, 0.71 + i * 0.026, MAT.fabric(), 24));
  parts.push(part('cargas', 'Carga propulsora', 'Saquetes de pólvora de cordita, como los de un cañón de barco. Su combustión lanzaba el proyectil por el tubo. La tripulación los cargó en vuelo para reducir el riesgo de accidente al despegar.', charges, [0, -0.45, 0.55], { inner: true }));

  const proj = new THREE.Group();
  for (let i = 0; i < 5; i++) proj.add(tube(0.062, 0.02, 0.8 + i * 0.036, 0.83 + i * 0.036, MAT.uranium(), 32));
  proj.add(cyl(0.064, 0.98, 1.0, MAT.tamper(), 32));
  parts.push(part('proyectil', 'Proyectil de uranio', 'Pieza de uranio enriquecido, por sí sola subcrítica, situada al fondo del cañón. Al disparar, recorría el tubo y se encajaba en el blanco.', proj, [0, 0, 1.0], { inner: true }));

  const targ = new THREE.Group();
  targ.add(cyl(0.2, 2.42, 2.86, MAT.tamper(), 48));
  const tm = targ.children[0] as THREE.Mesh; (tm.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  parts.push(part('atacador', 'Atacador y reflector', 'Bloque pesado que rodeaba el blanco. Retrasaba unas milmillonésimas de segundo la expansión del material y devolvía neutrones hacia dentro, para que la reacción en cadena llegara más lejos.', targ, [0, 0.5, -0.5], { inner: true }));

  const target = new THREE.Group();
  target.add(cyl(0.05, 2.5, 2.7, MAT.uranium(), 32));
  parts.push(part('blanco', 'Blanco de uranio', 'Segunda pieza de uranio enriquecido, también subcrítica, alojada al final del cañón dentro del atacador. Unida al proyectil formaba una masa supercrítica.', target, [0, 0.9, 1.0], { inner: true }));

  const inits = new THREE.Group();
  for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; inits.add(sphere(0.012, MAT.brass(), 0, 12)); inits.children[i].position.set(Math.sin(a) * 0.075, 2.48, Math.cos(a) * 0.075); }
  parts.push(part('iniciadores', 'Iniciadores de neutrones', 'Pequeñas fuentes que aportaban neutrones en el instante del encaje para arrancar la reacción en cadena sin depender de los neutrones naturales.', inits, [0, 0.9, 1.35], { inner: true }));

  const elec = new THREE.Group();
  elec.add(box(0.22, 0.3, 0.12, MAT.electronics(), 0.12, 1.55, 0));
  elec.add(box(0.12, 0.18, 0.1, MAT.electronics(), -0.14, 1.75, 0.05));
  elec.add(cableAlong([new THREE.Vector3(0.12, 1.4, 0), new THREE.Vector3(0.1, 1.0, 0.05), new THREE.Vector3(0.06, 0.72, 0.06)], 0.008, MAT.cable()));
  parts.push(part('espoletas', 'Espoletas y unidad de disparo', 'Relojes, barómetros y la unidad que, cuando el radar marcaba la altura elegida, encendía la carga propulsora. Varias señales debían coincidir para evitar una detonación prematura.', elec, [0, 0, -0.6], { inner: true }));

  const ant = new THREE.Group();
  for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + Math.PI / 4; ant.add(rod(new THREE.Vector3(Math.sin(a) * R, 0.95, Math.cos(a) * R), new THREE.Vector3(Math.sin(a) * (R + 0.22), 1.25, Math.cos(a) * (R + 0.22)), 0.006, MAT.steel())); }
  parts.push(part('radar', 'Antenas del radar Archie', 'Cuatro antenas de un radar altimétrico derivado de los aviones de caza. Medían la distancia al suelo y daban la orden de disparo a unos 580 m de altura.', ant, [0, 0, 0]));

  const fx = { flash: fxSphere(0.35, 0xfff3d6, 2.6), chain: fxSphere(0.09, 0xffb020, 2.6) };
  const root = new THREE.Group();
  for (const p of parts) root.add(p.obj);
  root.add(fx.flash, fx.chain);

  return {
    title: 'Little Boy', sub: 'Bomba de uranio de tipo cañón · Hiroshima, 6 de agosto de 1945',
    root, parts, fx, horizontal: true,
    dims: '3,0 m × 0,71 m · 4 400 kg · 15 kt',
    note: 'Esquema museístico: medidas exteriores reales; el interior muestra la disposición general de las piezas con proporciones aproximadas.',
    steps: [
      { title: 'Lanzamiento', dur: 3, focus: ['carcasa', 'cola'], cap: 'El Enola Gay suelta la bomba a unos 9 500 m. La cola la estabiliza durante los 44 segundos de caída mientras los relojes de seguridad la van armando.' },
      { title: 'Altura de disparo', dur: 3, focus: ['radar', 'espoletas'], cap: 'Los barómetros confirman que ha bajado lo suficiente y el radar mide la distancia al suelo. A unos 580 m, la unidad de disparo da la orden.' },
      { title: 'Disparo', dur: 3.5, focus: ['cargas', 'canon', 'proyectil'], cut: true, cap: 'Se enciende la carga de cordita y el proyectil de uranio sale disparado por el cañón a varios cientos de metros por segundo.',
        anim: (k, c) => { c.offset('proyectil', 0, 1.47 * seg(k, 0.15, 0.95), 0); c.glow('cargas', 1 - k); } },
      { title: 'Masa supercrítica', dur: 3, focus: ['proyectil', 'blanco', 'atacador'], cut: true, cap: 'El proyectil se encaja en el blanco dentro del atacador. Por separado ninguna pieza puede sostener una reacción en cadena; juntas, sí: el conjunto es supercrítico.',
        anim: (k, c) => { c.offset('proyectil', 0, 1.47, 0); c.glow('blanco', 0.5 * k); c.glow('proyectil', 0.5 * k); } },
      { title: 'Reacción en cadena', dur: 3, focus: ['iniciadores', 'blanco'], cut: true, cap: 'Los iniciadores liberan neutrones y la reacción en cadena se multiplica en menos de un microsegundo. Sólo una pequeña parte del uranio llegó a fisionarse.',
        anim: (k, c) => { c.offset('proyectil', 0, 1.47, 0); c.glow('iniciadores', 1); c.glow('blanco', 1); const ch = c.fx('chain'); if (ch) { ch.visible = true; ch.scale.setScalar(0.4 + 3 * k); (ch.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k * 0.6); } } },
      { title: 'Explosión', dur: 2.5, cap: 'La energía liberada equivale a unas 15 000 toneladas de TNT: la bola de fuego alcanza cientos de metros y la onda expansiva arrasa la ciudad.',
        anim: (k, c) => { c.offset('proyectil', 0, 1.47, 0); const f = c.fx('flash'); if (f) { f.visible = true; f.scale.setScalar(1 + 14 * k); (f.material as THREE.MeshBasicMaterial).opacity = 1 - k; } c.flash(1 - k); } },
    ],
  };
}

// ============================================================== FAT MAN / GADGET (núcleo de implosión)
function implosionCore(parts: Part[], cy: number, opts: { explosiveR: number; detonators: boolean; explodeScale?: number }) {
  const E = opts.explodeScale ?? 1;
  const Rx = opts.explosiveR;
  // capa de explosivo: esfera facetada
  const exp = new THREE.Mesh(new THREE.IcosahedronGeometry(Rx, 2), MAT.explosive());
  (exp.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  exp.position.y = cy;
  parts.push(part('explosivo', 'Esfera de explosivo (lentes)', 'Capa gruesa de explosivo convencional formada por bloques encajados como un balón. Al detonar a la vez desde muchos puntos, su forma conseguía que la onda de choque llegara al centro de manera simétrica y lo comprimiera.', exp, [0, 0, 0.0], { inner: true }));

  const tamp = sphere(Rx * 0.42, MAT.tamper(), cy, 40);
  (tamp.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  parts.push(part('atacador', 'Empujador y atacador', 'Capas metálicas entre el explosivo y el núcleo. Transmitían la compresión de forma uniforme, retrasaban la expansión del núcleo y devolvían neutrones hacia el centro.', tamp, [0, 0, 0.9 * Rx * E], { inner: true }));

  const pit = sphere(Rx * 0.14, MAT.plutonium(), cy, 32);
  parts.push(part('nucleo', 'Núcleo de plutonio', 'Esfera de plutonio subcrítica en su estado normal. Comprimida por la implosión hasta una densidad mucho mayor, se volvía supercrítica.', pit, [0, 0, 1.6 * Rx * E], { inner: true }));

  const init = sphere(Rx * 0.035, MAT.brass(), cy, 16);
  parts.push(part('iniciador', 'Iniciador de neutrones', 'Diminuta fuente de neutrones en el centro del núcleo que, aplastada por la compresión, liberaba los neutrones que arrancaban la reacción en el momento justo.', init, [0, 0, 2.1 * Rx * E], { inner: true }));

  if (opts.detonators) {
    const det = new THREE.Group();
    for (const v of spherePoints()) {
      const a = v.clone().multiplyScalar(Rx * 1.0).add(new THREE.Vector3(0, cy, 0));
      const b = v.clone().multiplyScalar(Rx * 1.12).add(new THREE.Vector3(0, cy, 0));
      det.add(rod(a, b, Rx * 0.025, MAT.brass(), 10));
    }
    parts.push(part('detonadores', 'Detonadores', 'Detonadores eléctricos repartidos por toda la superficie de la esfera. Tenían que dispararse prácticamente a la vez: una de las mayores dificultades técnicas del proyecto.', det, [0, 0, -0.5 * Rx * E]));
  }
}

export function fatMan(): BuiltModel {
  const parts: Part[] = [];
  const L = 3.25, R = 0.76, cy = 2.05;
  const yellow = MAT.paint(0xb99a3e, 0.6, 0.25);
  // carcasa elipsoidal
  const pts: [number, number][] = [];
  const a = 1.2;
  pts.push([0, cy - a]);
  for (let i = 1; i < 40; i++) { const t = -Math.PI / 2 + (i / 40) * Math.PI; pts.push([R * Math.cos(t), cy + a * Math.sin(t)]); }
  pts.push([0, L]);
  const casing = lathe(pts, yellow, 72);
  (casing.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  parts.push(part('carcasa', 'Carcasa elipsoidal', 'Envoltura de acero de 1,52 m de diámetro. Su forma de huevo se debía a la gran esfera de explosivo del interior. Las juntas se sellaban con brea, cuyo rastro se ve en las fotografías de la época.', casing, [0, 0, 0], { shell: true }));

  const armor = sphere(0.68, MAT.darkSteel(), cy, 48);
  armor.scale.set(1, 1.05, 1);
  (armor.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  parts.push(part('blindaje', 'Blindaje interior', 'Esfera de duraluminio y acero que envolvía el conjunto de implosión y lo protegía de golpes y disparos.', armor, [0, 0, -1.6], { inner: true, shell: true }));

  implosionCore(parts, cy, { explosiveR: 0.6, detonators: true });

  const tailMat = MAT.paint(0xa8893a, 0.6, 0.25);
  const tail = new THREE.Group();
  tail.add(boxTail(0, 0.95, 0.7, 0.014, tailMat));
  for (let i = 0; i < 4; i++) { const f = box(0.012, 0.9, 0.7, tailMat); const r = (i * Math.PI) / 2 + Math.PI / 4; f.rotation.y = r; f.position.set(Math.sin(r) * 0.35, 0.47, Math.cos(r) * 0.35); tail.add(f); }
  tail.add(cyl(0.18, 0.85, 1.0, tailMat, 32));
  parts.push(part('cola', 'Cola en caja ("paracaídas californiano")', 'Marco de aletas cuadrado con placas interiores. Su forma corregía el bamboleo que tenían los primeros prototipos de forma ovalada durante la caída.', tail, [0, -0.9, 0]));

  const elec = new THREE.Group();
  elec.add(box(0.36, 0.14, 0.24, MAT.electronics(), 0, 1.0, 0));
  elec.add(box(0.2, 0.1, 0.18, MAT.electronics(), 0.18, 1.12, 0.1));
  for (let i = 0; i < 8; i++) { const v = spherePoints()[i * 3]; elec.add(cableAlong([new THREE.Vector3(0, 1.05, 0), v.clone().multiplyScalar(0.4).add(new THREE.Vector3(0, cy - 0.5, 0)), v.clone().multiplyScalar(0.66).add(new THREE.Vector3(0, cy, 0))], 0.006, MAT.cable())); }
  parts.push(part('unidad', 'Unidad de disparo', 'Banco de condensadores de alta tensión (la "unidad X") y su cableado. Descargaba a la vez en todos los detonadores.', elec, [0, -0.6, 0.9], { inner: true }));

  const ant = new THREE.Group();
  for (let i = 0; i < 4; i++) { const r = (i * Math.PI) / 2 + Math.PI / 4; ant.add(rod(new THREE.Vector3(Math.sin(r) * 0.45, 1.05, Math.cos(r) * 0.45), new THREE.Vector3(Math.sin(r) * 0.75, 0.75, Math.cos(r) * 0.75), 0.007, MAT.steel())); }
  parts.push(part('radar', 'Antenas del radar Archie', 'Radares altimétricos que medían la distancia al suelo. Ordenaron la detonación a unos 500 m sobre Nagasaki.', ant, [0, -0.3, 0]));

  const fx = { shock: fxSphere(0.6, 0xff7a2a, cy), core: fxSphere(0.1, 0xc084fc, cy), flash: fxSphere(0.6, 0xfff3d6, cy) };
  const root = new THREE.Group();
  for (const p of parts) root.add(p.obj);
  root.add(fx.shock, fx.core, fx.flash);
  return {
    title: 'Fat Man', sub: 'Bomba de plutonio de implosión · Nagasaki, 9 de agosto de 1945',
    root, parts, fx, horizontal: true, dims: '3,25 m × 1,52 m · 4 670 kg · 21 kt',
    note: 'Esquema museístico: medidas exteriores reales; capas interiores con proporciones aproximadas.',
    steps: implosionSteps('Bockscar suelta la bomba sobre Nagasaki desde unos 9 000 m; la cola mantiene estable la gran carcasa durante la caída.', 'A unos 500 m de altura, el radar ordena la detonación y la unidad de disparo descarga a la vez en todos los detonadores.'),
  };
}

function implosionSteps(drop: string, fire: string): BuiltModel['steps'] {
  return [
    { title: 'Caída', dur: 3, focus: ['carcasa', 'cola', 'radar'], cap: drop },
    { title: 'Disparo', dur: 3, focus: ['unidad', 'detonadores'], cut: true, cap: fire, anim: (k, c) => { c.glow('detonadores', k > 0.6 ? 1 : 0); c.glow('unidad', 1 - k * 0.5); } },
    { title: 'Implosión', dur: 3.5, focus: ['explosivo', 'atacador'], cut: true, cap: 'La onda de detonación de todos los bloques se une en un frente esférico que avanza hacia el centro y aplasta las capas interiores por igual en todas direcciones.',
      anim: (k, c) => { const s = c.fx('shock'); if (s) { s.visible = true; s.scale.setScalar(1 - 0.62 * seg(k, 0, 1)); (s.material as THREE.MeshBasicMaterial).opacity = 0.55; } c.glow('explosivo', 0.4 * (1 - k)); } },
    { title: 'Compresión', dur: 3, focus: ['nucleo', 'atacador'], cut: true, cap: 'El núcleo de plutonio se comprime hasta una densidad muy superior a la normal. Con el mismo material, ahora es supercrítico.',
      anim: (k, c) => { c.scale('nucleo', 1 - 0.35 * seg(k, 0, 0.8)); c.scale('atacador', 1 - 0.18 * seg(k, 0, 0.8)); c.glow('nucleo', 0.6 * k); } },
    { title: 'Reacción en cadena', dur: 3, focus: ['iniciador', 'nucleo'], cut: true, cap: 'El iniciador libera neutrones en el instante de máxima compresión y la reacción en cadena se dispara antes de que el núcleo vuelva a expandirse.',
      anim: (k, c) => { c.scale('nucleo', 0.65); c.scale('atacador', 0.82); c.glow('iniciador', 1); c.glow('nucleo', 1); const g = c.fx('core'); if (g) { g.visible = true; g.scale.setScalar(0.5 + 4 * k); (g.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - 0.5 * k); } } },
    { title: 'Explosión', dur: 2.5, cap: 'La energía liberada equivale a unas 21 000 toneladas de TNT. Una fracción mucho mayor del material se fisionó que en Little Boy.',
      anim: (k, c) => { const f = c.fx('flash'); if (f) { f.visible = true; f.scale.setScalar(1 + 10 * k); (f.material as THREE.MeshBasicMaterial).opacity = 1 - k; } c.flash(1 - k); } },
  ];
}

export function gadget(): BuiltModel {
  const parts: Part[] = [];
  const H = 30; // torre de 30 m
  const cy = H + 1.6;
  // torre de celosía
  const tower = new THREE.Group();
  const steel = MAT.paint(0x8f9297, 0.6, 0.6);
  const w0 = 3.2, w1 = 1.6;
  const legs: THREE.Vector3[][] = [];
  for (let i = 0; i < 4; i++) {
    const sx = i % 2 ? 1 : -1, sz = i < 2 ? 1 : -1;
    const a = new THREE.Vector3(sx * w0, 0, sz * w0), b = new THREE.Vector3(sx * w1, H, sz * w1);
    tower.add(rod(a, b, 0.12, steel));
    legs.push([a, b]);
  }
  for (let lv = 0; lv < 8; lv++) {
    const k0 = lv / 8, k1 = (lv + 1) / 8;
    for (let i = 0; i < 4; i++) {
      const j = [1, 3, 0, 2][i];
      const p0 = legs[i][0].clone().lerp(legs[i][1], k0), q1 = legs[j][0].clone().lerp(legs[j][1], k1);
      const q0 = legs[j][0].clone().lerp(legs[j][1], k0);
      tower.add(rod(p0, q1, 0.04, steel));
      tower.add(rod(p0, q0, 0.05, steel));
    }
  }
  parts.push(part('torre', 'Torre de acero', 'Torre de 30 m levantada en la Jornada del Muerto (Nuevo México). Elevar el artefacto reducía la cantidad de tierra que absorbía la bola de fuego. Quedó vaporizada; sólo sobrevivieron los muñones de las patas.', tower, [0, 0, 0], { minor: true }));

  const shack = new THREE.Group();
  const tin = MAT.paint(0xa7a49b, 0.8, 0.3);
  shack.add(box(4, 0.25, 4, MAT.wood(), 0, H + 0.12, 0));
  shack.add(box(4, 3, 0.06, tin, 0, H + 1.6, -2));
  shack.add(box(0.06, 3, 4, tin, -2, H + 1.6, 0));
  shack.add(box(0.06, 3, 4, tin, 2, H + 1.6, 0));
  shack.add(box(4.1, 0.08, 4.1, tin, 0, H + 3.12, 0));
  parts.push(part('caseta', 'Caseta de chapa', 'Pequeña caseta abierta por un lado en lo alto de la torre, donde se montó el Gadget el 15 de julio y se conectaron los últimos cables.', shack, [0, 2.5, -2.5], { minor: true }));

  implosionCore(parts, cy, { explosiveR: 0.7, detonators: true, explodeScale: 1.2 });
  // carcasa de duraluminio y cables colgantes
  const sh = sphere(0.78, MAT.paint(0x7c8086, 0.5, 0.7), cy, 48);
  (sh.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  parts.push(part('carcasa', 'Envoltura esférica', 'Esfera de duraluminio atornillada que encerraba el conjunto de implosión. El Gadget no tenía carcasa de bomba ni cola: era un dispositivo de prueba.', sh, [0, 0, -1.2], { shell: true }));
  const cables = new THREE.Group();
  const pts = spherePoints();
  for (let i = 0; i < pts.length; i++) {
    const v = pts[i];
    if (v.y > 0.6) continue;
    const a = v.clone().multiplyScalar(0.8).add(new THREE.Vector3(0, cy, 0));
    const mid = a.clone().add(new THREE.Vector3(v.x * 0.5, -0.4, v.z * 0.5));
    cables.add(cableAlong([a, mid, new THREE.Vector3(0.6 + (i % 5) * 0.12, H + 0.3, -1.2 + (i % 4) * 0.2)], 0.012, MAT.cable()));
  }
  cables.add(box(0.6, 0.5, 0.4, MAT.electronics(), 1.0, H + 0.5, -1.1));
  parts.push(part('cables', 'Cables y unidad de disparo', 'Decenas de cables, todos de la misma longitud para que las señales llegaran a la vez, unían los detonadores con la unidad de disparo y con el búnker de control a 9 km.', cables, [1.4, -0.4, 0.6]));

  const fx = { shock: fxSphere(0.7, 0xff7a2a, cy), core: fxSphere(0.1, 0xc084fc, cy), flash: fxSphere(0.7, 0xfff3d6, cy) };
  const root = new THREE.Group();
  for (const p of parts) root.add(p.obj);
  root.add(fx.shock, fx.core, fx.flash);
  return {
    title: 'The Gadget', sub: 'Primer artefacto nuclear · prueba Trinity, 16 de julio de 1945',
    root, parts, fx, horizontal: false,
    focus: { center: new THREE.Vector3(0, cy, 0), radius: 3.2 },
    dims: 'esfera de ≈ 1,5 m · torre de 30 m · 24,8 kt',
    note: 'Esquema museístico: dimensiones exteriores aproximadas; capas interiores con proporciones aproximadas. Usa la rueda para alejarte y ver la torre completa.',
    steps: implosionSteps('En la madrugada del 16 de julio, tras una tormenta, la cuenta atrás llega a cero desde el búnker S-10 000, a 9 km de la torre.', 'La unidad de disparo envía la señal por cables de igual longitud a todos los detonadores, que estallan casi a la vez.'),
  };
}

// ============================================================== IVY MIKE · SAUSAGE
export function sausage(): BuiltModel {
  const parts: Part[] = [];
  const H = 6.2, R = 1.0;
  const shell = MAT.paint(0xb9bcc0, 0.45, 0.8);
  const body = lathe([[0, 0], [R, 0], [R, H - 0.4], [R * 0.85, H - 0.15], [R * 0.5, H], [0, H]], shell, 72);
  (body.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  body.position.y = 0.8;
  parts.push(part('carcasa', 'Carcasa de acero', 'Cilindro de unos 6 m de alto y 2 m de diámetro con paredes de acero muy gruesas. El conjunto pesaba unas 54 toneladas; con el equipo de frío, unas 80.', body, [0, 0, 0], { shell: true }));

  const prim = new THREE.Group();
  prim.add(sphere(0.45, MAT.explosive(), 0.8 + H - 0.95, 32));
  prim.add(sphere(0.16, MAT.plutonium(), 0.8 + H - 0.95, 24));
  parts.push(part('primario', 'Primario de fisión', 'Una bomba de fisión de implosión en la parte alta del dispositivo. Su explosión era sólo el "detonador" del resto. Representación conceptual.', prim, [0, 1.8, 0], { inner: true }));

  const dew = new THREE.Group();
  const dm = cyl(0.55, 0.8 + 0.6, 0.8 + H - 1.7, MAT.fusion(), 48);
  dew.add(dm);
  parts.push(part('secundario', 'Secundario: depósito de deuterio líquido', 'Un gran termo (vaso Dewar) lleno de deuterio líquido a unos 250 grados bajo cero: el combustible de fusión. Comprimido por la radiación del primario, se encendió la primera reacción termonuclear a gran escala. Representación conceptual.', dew, [0, 0, 2.2], { inner: true }));

  const pipes = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    pipes.add(cableAlong([new THREE.Vector3(Math.cos(a) * 1.04, 1.0, Math.sin(a) * 1.04), new THREE.Vector3(Math.cos(a) * 1.08, 3.5, Math.sin(a) * 1.08), new THREE.Vector3(Math.cos(a) * 1.04, 6.4, Math.sin(a) * 1.04)], 0.03, MAT.steel()));
  }
  pipes.add(cyl(0.12, 6.9, 8.4, MAT.steel(), 24));
  pipes.add(cableAlong([new THREE.Vector3(0, 8.4, 0), new THREE.Vector3(2, 8.6, 0), new THREE.Vector3(4, 7, 0)], 0.1, MAT.steel()));
  parts.push(part('criogenia', 'Tuberías criogénicas', 'Conducciones del sistema de refrigeración, conectadas a una planta de hidrógeno líquido en el islote, que mantenían el deuterio en estado líquido hasta el momento de la prueba.', pipes, [1.6, 0, 0]));

  const stand = new THREE.Group();
  stand.add(box(3.2, 0.3, 3.2, MAT.darkSteel(), 0, 0.15, 0));
  for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + Math.PI / 4; stand.add(rod(new THREE.Vector3(Math.cos(a) * 1.5, 0.3, Math.sin(a) * 1.5), new THREE.Vector3(Math.cos(a) * 1.0, 1.4, Math.sin(a) * 1.0), 0.08, MAT.darkSteel())); }
  parts.push(part('soporte', 'Soporte', 'Bancada de acero sobre la que se levantó el dispositivo, dentro de un gran edificio de chapa en el islote de Elugelab.', stand, [0, -0.8, 0], { minor: true }));

  const fx = { xr: fxSphere(1.0, 0x7dd3fc, 3.8), flash: fxSphere(1.2, 0xfff3d6, 3.8), prim: fxSphere(0.5, 0xffb020, 0.8 + H - 0.95) };
  fx.xr.scale.set(0.9, 2.8, 0.9);
  const root = new THREE.Group();
  for (const p of parts) root.add(p.obj);
  root.add(fx.xr, fx.flash, fx.prim);
  return {
    title: 'Sausage (Ivy Mike)', sub: 'Primer dispositivo termonuclear · Enewetak, 1 de noviembre de 1952',
    root, parts, fx, horizontal: false, dims: '≈ 6,2 m × 2 m · ≈ 54 t (80 t con la refrigeración) · 10,4 Mt',
    note: 'El interior es una representación conceptual del principio de dos etapas; el diseño real sigue siendo secreto.',
    steps: [
      { title: 'El dispositivo', dur: 3, focus: ['carcasa', 'criogenia'], cap: 'No era un arma sino un experimento del tamaño de una casa, conectado a una planta criogénica para mantener el deuterio líquido.' },
      { title: 'El primario', dur: 3, focus: ['primario'], cut: true, cap: 'La explosión empieza en el primario: una bomba de fisión de implosión.', anim: (k, c) => { c.glow('primario', k); const p = c.fx('prim'); if (p) { p.visible = true; p.scale.setScalar(0.6 + k); (p.material as THREE.MeshBasicMaterial).opacity = 0.8 * k; } } },
      { title: 'Radiación', dur: 3, focus: ['secundario'], cut: true, cap: 'Su radiación (sobre todo rayos X) llena el interior de la carcasa mucho antes que los restos de la explosión y comprime el depósito de combustible.',
        anim: (k, c) => { const x = c.fx('xr'); if (x) { x.visible = true; (x.material as THREE.MeshBasicMaterial).opacity = 0.35 * k; } c.scale('secundario', [1 - 0.3 * k, 1, 1 - 0.3 * k]); } },
      { title: 'Fusión', dur: 3, focus: ['secundario'], cut: true, cap: 'Comprimido y calentado a decenas de millones de grados, el deuterio se fusiona. La fusión y las fisiones que provoca liberan cientos de veces la energía del primario.',
        anim: (k, c) => { c.scale('secundario', [0.7, 1, 0.7]); c.glow('secundario', k); } },
      { title: '10,4 megatones', dur: 2.5, cap: 'El islote de Elugelab desapareció y quedó un cráter de casi 2 km de diámetro y 50 m de profundidad.',
        anim: (k, c) => { const f = c.fx('flash'); if (f) { f.visible = true; f.scale.setScalar(1 + 12 * k); (f.material as THREE.MeshBasicMaterial).opacity = 1 - k; } c.flash(1 - k); } },
    ],
  };
}
