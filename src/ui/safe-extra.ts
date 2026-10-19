/**
 * «¿Estoy a salvo?» (segunda parte): todo lo que tiene que ver con la seguridad de una persona en un
 * punto concreto, además del veredicto de los efectos.
 *  - Qué hacer: el plan minuto a minuto (destello, onda, lluvia radiactiva, primer día, semanas).
 *  - Refugio: cuánto protege cada sitio de un edificio (factor de protección), la dosis que se
 *    recibiría en cada uno y cuándo se podría salir; los refugios más cercanos.
 *  - Sanidad: los hospitales más cercanos que seguirían funcionando y primeros auxilios básicos.
 *  - Mochila: lista de emergencia (se guarda en el navegador) y plan familiar.
 * Las cifras siguen las guías públicas (FEMA 2022 «Planning Guidance for Response to a Nuclear
 * Detonation», Glasstone y Dolan 1977, Kearny 1987) y los modelos del simulador.
 */
import { h } from './dom';
import { tr } from '../i18n';
import { DEC, LOCALE } from '../i18n/locale';
import type { Effects } from '../physics/types';
import type { SafetyReport } from '../physics/safety';
import type { HealthReport } from '../physics/health';
import { fmtDist } from '../physics/effects';

const n1 = (x: number, d = 1) => x.toLocaleString(LOCALE, { maximumFractionDigits: d });
export const fmtS = (s: number) => (s < 90 ? `${Math.max(1, Math.round(s))} s` : s < 5400 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1).replace('.', DEC)} h`);
export const fmtH = (hh: number) => (hh < 1.5 ? `${Math.max(5, Math.round(hh * 60))} min` : hh < 48 ? `${hh.toFixed(hh < 10 ? 1 : 0).replace('.', DEC)} h` : hh < 24 * 60 ? `${Math.round(hh / 24)} días` : `${Math.round(hh / 24 / 30)} meses`);
const DIRS = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
const dirName = (deg: number) => DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

/** sitios donde refugiarse y su factor de protección frente a la lluvia radiactiva (FEMA 2022, Glasstone) */
export const PLACES: { id: string; name: string; pf: number; note: string }[] = [
  { id: 'out', name: 'Al aire libre', pf: 1, note: 'Sin ninguna protección.' },
  { id: 'car', name: 'Dentro de un coche', pf: 1.5, note: 'Casi no protege: la chapa y los cristales son finos.' },
  { id: 'house', name: 'Planta baja de una casa', pf: 3, note: 'Paredes y tejado ligeros.' },
  { id: 'top', name: 'Piso alto, bajo el tejado', pf: 10, note: 'El polvo que cae en la cubierta queda muy cerca.' },
  { id: 'cellar', name: 'Sótano de una casa', pf: 15, note: 'La tierra alrededor frena casi toda la radiación.' },
  { id: 'mid', name: 'Centro de un edificio grande', pf: 50, note: 'Pisos intermedios, lejos de fachadas y tejado.' },
  { id: 'deep', name: 'Sótano de un edificio grande o aparcamiento subterráneo', pf: 200, note: 'Varias plantas de hormigón y tierra por encima.' },
  { id: 'metro', name: 'Metro o refugio enterrado', pf: 1000, note: 'Lo más seguro a tu alcance.' },
];

/** tasa de la lluvia radiactiva t horas después (ley de Way-Wigner, t^−1,2) */
const rateAt = (r1: number, t: number) => r1 * Math.pow(Math.max(t, 0.25), -1.2);
/** horas hasta que la tasa al aire libre baja de un valor */
const hoursUntil = (r1: number, r: number) => Math.pow(r1 / r, 1 / 1.2);

/** el plan minuto a minuto */
export function planBlock(R: SafetyReport, fx: Effects, pointBearing: number, r1: number): HTMLElement[] {
  const steps: [string, string, string][] = [];
  const flash = !fx.noFlash && R.items.some((i) => i.label === 'Calor del destello' || i.label === 'Onda expansiva');
  if (flash) steps.push(['0 s', 'El destello', 'No mires hacia la luz. Échate al suelo boca abajo detrás de algo sólido, tápate la cara, las manos y la nuca. El calor dura unos segundos: cualquier sombra protege.']);
  if (R.shockS != null) steps.push([fmtS(R.shockS), 'Llega la onda expansiva', `Sigue en el suelo, lejos de las ventanas: los cristales salen despedidos. Después de la onda viene un viento de vuelta hacia la explosión; no te levantes hasta que pase (unos segundos más).`]);
  if (R.shockS != null || flash) steps.push(['Después', 'Ponte a cubierto', R.falloutH != null ? `Comprueba si hay heridos y fuegos cerca y entra cuanto antes en el sitio más protegido que tengas: tienes unos ${fmtH(R.falloutH)} antes de que empiece a caer la lluvia radiactiva.` : 'Comprueba si hay heridos y fuegos cerca. Aquí no caería lluvia radiactiva, pero aléjate de los incendios y de los edificios dañados.']);
  if (R.falloutH != null) {
    steps.push([fmtH(R.falloutH), 'Empieza la lluvia radiactiva', 'Polvo o ceniza que cae del cielo. Quédate dentro, en el centro del edificio o en el sótano. Cierra puertas y ventanas y apaga la ventilación. Si te ha caído encima, quítate la ropa exterior y lávate.']);
    const f24 = r1 > 0 ? rateAt(r1, 1) / rateAt(r1, 24) : 45;
    steps.push(['24 h', 'Primer día', `La radiación es ya unas ${n1(f24, 0)} veces menor que una hora después de la explosión. Sigue dentro: es cuando más vidas salva el refugio. Escucha la radio o el móvil.`]);
    steps.push(['2–14 días', 'Las semanas siguientes', 'Las autoridades dirán cuándo y por dónde salir o evacuar. Salir unos minutos por agua o medicinas es razonable cuando la radiación ha bajado mucho (mira la pestaña Refugio). No comas alimentos que hayan estado al aire libre sin lavarlos ni pelarlos.']);
  } else if (R.level !== 'fuera') steps.push(['Horas', 'Mantente informado', 'Aquí no se espera lluvia radiactiva, pero el viento puede cambiar: ten la radio o el móvil a mano y sigue las instrucciones oficiales.']);
  const out: HTMLElement[] = [];
  if (steps.length) out.push(h('ol', { class: 'sp-plan' }, ...steps.map(([t, k, d]) => h('li', {}, h('b', {}, t), h('div', {}, h('span', {}, tr(k)), h('p', {}, tr(d)))))));
  // si hay que irse antes de que caiga: perpendicular al viento
  if (R.falloutH != null && fx.windFromDeg != null) {
    const down = fx.windFromDeg + 180;
    const side = Math.sin(((pointBearing - down) * Math.PI) / 180) >= 0 ? 90 : -90;
    out.push(h('div', { class: 'sp-h2' }, tr('Si tienes que irte')), h('p', { class: 'sp-txt' }, tr(`El viento lleva la nube hacia el ${dirName(down)}. Si sales antes de que empiece a caer, no vayas en esa dirección: muévete de lado, hacia el ${dirName(down + side)}, para salir de la franja de la lluvia radiactiva. Si ya está cayendo, es mejor quedarse dentro.`)));
  }
  return out;
}

/** cuánto protege cada sitio y cuándo se podría salir */
export function refugeBlock(fx: Effects, e: number, n: number, R: SafetyReport, place: string, onPlace: (id: string) => void): HTMLElement[] {
  const out: HTMLElement[] = [];
  const r1 = fx.falloutRateAt(e, n);
  if (R.falloutH == null || !fx.falloutDoseAt) {
    out.push(h('p', { class: 'sp-txt' }, tr('Aquí no caería lluvia radiactiva. Contra el destello y la onda expansiva protege lo mismo que en un terremoto: apartarse de las ventanas y ponerse junto a una pared interior o bajo una mesa sólida.')));
    return out;
  }
  const P = PLACES.find((p) => p.id === place) ?? PLACES[2];
  const sel = h('select', { class: 'sp-sel', onclick: (ev: Event) => ev.stopPropagation(), onchange: (ev: Event) => onPlace((ev.target as HTMLSelectElement).value) },
    ...PLACES.map((p) => h('option', { value: p.id, selected: p.id === P.id }, `${tr(p.name)} · ×${n1(p.pf)}`)));
  out.push(h('label', { class: 'sp-lbl' }, h('span', {}, tr('Dónde estarías')), sel), h('p', { class: 'sp-note' }, tr(P.note)));
  const d48 = fx.falloutDoseAt(e, n, 0, 48, P.pf), d2w = fx.falloutDoseAt(e, n, 0, 24 * 14, P.pf), dOut = fx.falloutDoseAt(e, n, 0, 48, 1);
  const lvOf = (d: number) => (d >= 600 ? 'extremo' : d >= 150 ? 'grave' : d >= 25 ? 'riesgo' : d >= 5 ? 'bajo' : 'fuera');
  const what = (d: number) => (d >= 600 ? 'Dosis probablemente mortal sin atención médica.' : d >= 150 ? 'Síndrome de radiación: náuseas, cansancio, defensas bajas.' : d >= 25 ? 'Sin síntomas inmediatos; algo más de riesgo de cáncer con los años.' : 'Dosis baja.');
  out.push(h('div', { class: 'sp-items' },
    h('div', { class: `sp-it lv-${lvOf(d48)}` }, h('div', {}, h('b', {}, tr('Dosis en las primeras 48 h')), h('span', {}, `${n1(d48, d48 < 10 ? 1 : 0)} rem`)), h('p', {}, `${tr(what(d48))} ${tr(`Al aire libre serían ${n1(dOut, 0)} rem.`)}`)),
    h('div', { class: `sp-it lv-${lvOf(d2w)}` }, h('div', {}, h('b', {}, tr('Dosis en dos semanas')), h('span', {}, `${n1(d2w, d2w < 10 ? 1 : 0)} rem`)), h('p', {}, tr('Quedándote todo el tiempo en este sitio.')))));
  // la mejor opción de la lista que baja de 25 rem en 48 h
  const best = PLACES.find((p) => fx.falloutDoseAt!(e, n, 0, 48, p.pf) < 25);
  if (best && best.pf > P.pf) out.push(h('p', { class: 'sp-txt' }, tr(`Para quedarte por debajo de 25 rem en 48 h haría falta, como poco: ${tr(best.name).toLowerCase()} (×${n1(best.pf)}). Si lo tienes a pocos minutos, compensa ir cuanto antes, mejor antes de que empiece a caer.`)));
  else if (!best) out.push(h('p', { class: 'sp-txt' }, tr('Aquí la lluvia radiactiva es tan intensa que sólo un refugio enterrado protege de verdad. Si hay aviso con tiempo, lo mejor es alejarse de la franja de la nube.')));
  // cuándo salir
  if (r1 > 0) {
    const tBrief = hoursUntil(r1, 1), tNormal = hoursUntil(r1, 0.01);
    const rows: [string, string][] = [];
    rows.push(['Radiación al aire libre a las 24 h', `${n1(rateAt(r1, 24), rateAt(r1, 24) < 1 ? 2 : 0)} R/h`]);
    if (tBrief > R.falloutH) rows.push(['Salir unos minutos (agua, medicinas)', `a partir de ${fmtH(tBrief)}`]);
    else rows.push(['Salir unos minutos (agua, medicinas)', 'cuando acabe de caer']);
    rows.push(['Vida casi normal al aire libre', `a partir de ${fmtH(Math.max(tNormal, R.falloutH))}`]);
    out.push(h('div', { class: 'sp-h2' }, tr('Cuándo salir')), h('dl', { class: 'sp-dl' }, ...rows.flatMap(([k, v]) => [h('dt', {}, tr(k)), h('dd', {}, tr(v))])),
      h('p', { class: 'sp-note' }, tr('Con la regla del 7-10: cada vez que el tiempo se multiplica por siete, la radiación se divide por diez. «Salir unos minutos» es cuando estar fuera un cuarto de hora daría menos de un cuarto de rem; «vida casi normal», menos de 0,01 R/h. Las autoridades medirán la radiación real: haz caso de sus avisos.')));
  }
  return out;
}

const R_EARTH = 6371e3;
const distM = (a: number, b: number, c: number, d: number) => {
  const r = Math.PI / 180, x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(x)));
};

/** hospitales más cercanos que seguirían funcionando y primeros auxilios */
export function healthBlock(HR: HealthReport | 'loading' | 'error' | null, lat: number, lon: number, fallout: boolean, onGo: (lat: number, lon: number) => void): HTMLElement[] {
  const out: HTMLElement[] = [];
  if (HR === 'loading') out.push(h('p', { class: 'sp-note' }, tr('Buscando los hospitales de la zona en OpenStreetMap…')));
  else if (HR === 'error') out.push(h('p', { class: 'sp-note' }, tr('No se pudo consultar OpenStreetMap (servidor ocupado o sin conexión).')));
  else if (HR && HR.hospitals.length) {
    const near = HR.hospitals.map((x) => ({ x, d: distM(lat, lon, x.lat, x.lon) })).sort((a, b) => a.d - b.d);
    const working = near.filter((o) => o.x.state !== 'destroyed').slice(0, 4);
    const lost = near.filter((o) => o.x.state === 'destroyed').length;
    const ST = { ok: ['fuera', 'En servicio'], damaged: ['riesgo', 'Dañado: funcionaría en parte'], destroyed: ['extremo', 'Destruido'] } as const;
    out.push(h('div', { class: 'sp-h2' }, tr('Hospitales más cercanos que seguirían abiertos')));
    if (!working.length) out.push(h('p', { class: 'sp-txt' }, tr('Ninguno de los hospitales de la zona seguiría en pie. La ayuda llegaría en hospitales de campaña al cabo de uno a tres días.')));
    const box = h('div', { class: 'sp-items' });
    for (const { x, d } of working) {
      const [lv, label] = ST[x.state];
      box.append(h('div', { class: `sp-it lv-${lv} sh-it`, title: tr('Ver en el mapa'), onclick: (ev: MouseEvent) => { ev.stopPropagation(); onGo(x.lat, x.lon); } },
        h('div', {}, h('b', {}, x.name || tr('Hospital sin nombre')), h('span', {}, fmtDist(d))), h('p', {}, `${tr(label)} · ${tr(`≈ ${n1(x.bedsEst, 0)} camas`)}`)));
    }
    out.push(box);
    if (lost) out.push(h('p', { class: 'sp-note' }, tr(`Otros ${lost} hospitales de la zona quedarían destruidos.`)));
    out.push(h('p', { class: 'sp-note' }, tr(`Los que siguieran abiertos estarían desbordados: unos ${n1(HR.injured, 0)} heridos para ${n1(HR.bedsUsable, 0)} camas libres. Si tus heridas no son graves, cúralas donde estés y deja sitio a quien lo necesite.`)));
  } else if (HR) out.push(h('p', { class: 'sp-note' }, tr('No hay hospitales registrados en OpenStreetMap en la zona de la explosión.')));
  out.push(h('div', { class: 'sp-h2' }, tr('Primeros auxilios')), h('ul', { class: 'sp-adv' },
    ...['Quemaduras: enfría con agua del grifo (no helada) unos 20 minutos y cubre con film transparente o un paño limpio. Nada de hielo, aceite ni pasta de dientes.',
      'Heridas por cristales: aprieta con un paño limpio hasta que deje de sangrar; no saques los trozos grandes clavados.',
      'Ojos deslumbrados por el destello: la ceguera suele pasar en minutos u horas; quédate quieto y no te frotes los ojos.',
      ...(fallout ? ['Contaminación: quitarse la ropa exterior elimina la mayor parte del polvo radiactivo; lávate con agua y jabón (sin acondicionador) y suénate la nariz.',
        'Yoduro potásico: sólo protege el tiroides del yodo radiactivo, no del resto de la radiación. Tómalo únicamente si lo indican las autoridades sanitarias.'] : []),
      'Si alguien vomita poco después de la explosión sin estar herido, puede ser por la radiación: necesita atención médica en cuanto sea posible.'].map((t) => h('li', {}, tr(t)))));
  return out;
}

const KIT_KEY = 'bum:kit';
const KIT: string[] = [
  'Agua: unos 4 litros por persona y día, para al menos 3 días',
  'Comida que no se estropee (latas, frutos secos, galletas) para 3 días y un abrelatas',
  'Radio de pilas o de manivela',
  'Linterna, pilas de recambio y batería externa para el móvil',
  'Botiquín y las medicinas que tomes habitualmente',
  'Mascarillas FFP2',
  'Cinta adhesiva ancha y plástico para tapar ventanas rotas',
  'Bolsas de basura grandes (para la ropa contaminada)',
  'Ropa de abrigo, mantas o saco de dormir',
  'Documentos importantes y algo de dinero en efectivo',
  'Silbato para pedir ayuda',
  'Lista de teléfonos en papel',
];
/** lista de la mochila de emergencia (se marca y se guarda en el navegador) y plan familiar */
export function kitBlock(): HTMLElement[] {
  let done: string[] = [];
  try { done = JSON.parse(localStorage.getItem(KIT_KEY) ?? '[]'); } catch { done = []; }
  const count = h('span', { class: 'sp-count' });
  const upd = () => { count.textContent = tr(`${done.filter((d) => KIT.includes(d)).length} de ${KIT.length}`); };
  const list = h('div', { class: 'sp-kit' }, ...KIT.map((k) => {
    const cb = h('input', { type: 'checkbox', checked: done.includes(k), onclick: (ev: Event) => ev.stopPropagation(), onchange: () => {
      done = cb.checked ? [...new Set([...done, k])] : done.filter((x) => x !== k);
      try { localStorage.setItem(KIT_KEY, JSON.stringify(done)); } catch { /* sin almacenamiento */ }
      upd();
    } }) as HTMLInputElement;
    return h('label', { onclick: (ev: Event) => ev.stopPropagation() }, cb, h('span', {}, tr(k)));
  }));
  upd();
  return [
    h('div', { class: 'sp-h2' }, tr('Mochila de emergencia'), ' ', count),
    h('p', { class: 'sp-note' }, tr('La Unión Europea recomienda que cada casa pueda valerse por sí misma al menos 72 horas. Marca lo que ya tienes: se guarda en este navegador.')),
    list,
    h('div', { class: 'sp-h2' }, tr('Plan familiar')),
    h('ul', { class: 'sp-adv' }, ...[
      'Acordad un punto de encuentro cerca de casa y otro fuera del barrio.',
      'Elegid un contacto que viva en otra región: tras una emergencia es más fácil llamar lejos que cerca.',
      'Sabed cuál es el sótano, el aparcamiento subterráneo o la estación de metro más cercanos a casa, al trabajo y al colegio (pestaña Refugio).',
      'Activad las alertas de emergencia del móvil (ES-Alert en España); el teléfono de emergencias europeo es el 112.',
      'Si hay niños en el colegio, no vayáis a buscarlos durante la lluvia radiactiva: los centros tienen planes para protegerlos.',
    ].map((t) => h('li', {}, tr(t)))),
  ];
}
