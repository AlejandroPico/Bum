/**
 * Asteroides reales de la NASA/JPL: la lista de riesgo Sentry (todos los objetos con alguna
 * probabilidad de chocar con la Tierra), los acercamientos de los próximos diez años y unos cuantos
 * asteroides famosos, con su tamaño, su velocidad y su probabilidad de impacto. Cualquiera se puede
 * simular con un clic.
 *
 * Los datos se descargan al publicar la aplicación (`scripts/neo-catalog.mjs`): las API de JPL no se
 * pueden consultar desde el navegador.
 */
import { h, toast } from './dom';
import { tr } from '../i18n';
import { LOCALE } from '../i18n/locale';

type SentryRow = [string, number, number | null, number | null, number, string, number | null, number | null, number | null, number | null, string, string?];
type Approach = [string, string, string, number, number | null, number | null, number | null, number | null];
interface Famous { des: string; name: string; full: string; dM: number | null; albedo: number | null; rho: number; H: number | null; cls: string; pha: boolean; moidAu: number | null; a: number | null; e: number | null; i: number | null; vInf: number | null; closest: [string, number] | null; sentry: boolean }
interface Catalog { fetched: string; sentry: SentryRow[]; vi: Record<string, [string, number | null, number | null, number | null, number | null][]>; approaches: Approach[]; famous: Famous[] }

export interface NeoPick { name: string; diameterM: number; densityKgM3: number; velocityKms: number; angleDeg: number; note: string }

/** notas propias de los famosos (lo que no está en las bases de datos) */
const FAMOUS_NOTES: Record<string, string> = {
  Apophis: 'En 2004 llegó a tener un 2,7 % de probabilidad de chocar en 2029; hoy está descartado. El 13 de abril de 2029 pasará a unos 32 000 km, más cerca que los satélites geoestacionarios, y se verá a simple vista.',
  Bennu: 'Asteroide de escombros del que la sonda OSIRIS-REx trajo muestras en 2023. Tiene una probabilidad de 1 entre 1750 de chocar entre 2178 y 2290.',
  '2024 YR4': 'A principios de 2025 llegó al 3,1 % de probabilidad de chocar en diciembre de 2032, el mayor riesgo jamás calculado para un objeto de su tamaño. Con más observaciones se descartó.',
  Didymos: 'El sistema doble que visitó la misión DART en 2022: el choque contra su luna, Dimorphos, acortó 33 minutos la órbita de la luna.',
  Eros: 'El segundo mayor asteroide cercano a la Tierra; la sonda NEAR Shoemaker se posó en él en 2001.',
  Itokawa: 'Asteroide de escombros con forma de cacahuete; la sonda japonesa Hayabusa trajo los primeros granos de un asteroide.',
  Ryugu: 'Asteroide carbonáceo del que Hayabusa2 trajo muestras en 2020, con aminoácidos.',
  '1950 DA': 'El mayor riesgo conocido a largo plazo: 1 entre 2750 de chocar en marzo de 2880.',
  Toutatis: 'Gira de forma caótica, dando tumbos; pasó a 4 distancias lunares en 2004.',
  Phaethon: 'El asteroide del que salen las Gemínidas, la lluvia de estrellas de diciembre.',
  Ganymed: 'El mayor asteroide cercano a la Tierra conocido, de unos 38 km: el tamaño de un impacto de extinción.',
  '2023 DW': 'Tuvo durante unas semanas una probabilidad de 1 entre 600 de chocar el día de San Valentín de 2046; se descartó.',
};

const n0 = (x: number) => Math.round(x).toLocaleString(LOCALE);
const odds = (p: number | null) => (p == null || p <= 0 ? '—' : p >= 0.01 ? `${(p * 100).toLocaleString(LOCALE, { maximumFractionDigits: 1 })} %` : tr(`1 entre ${n0(1 / p)}`));
const dTxt = (m: number) => (m >= 1000 ? `${(m / 1000).toLocaleString(LOCALE, { maximumFractionDigits: 1 })} km` : `${n0(m)} m`);
/** diámetro (m) por el brillo, con un albedo típico de 0,14 */
const dFromH = (H: number, alb = 0.14) => (1329 / Math.sqrt(alb)) * 10 ** (-H / 5) * 1000;
/** velocidad de entrada en la atmósfera: la de encuentro más la que da la gravedad terrestre */
const vImpact = (vInf: number | null) => Math.sqrt((vInf ?? 15) ** 2 + 11.19 ** 2);
const MONTHS: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const cdDate = (cd: string) => { const m = cd.match(/(\d{4})-(\w{3})-(\d{2})/); return m ? new Date(Date.UTC(+m[1], MONTHS[m[2]] ?? 0, +m[3])).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }) : cd; };

type Tab = 'risk' | 'close' | 'famous';

export class NeoPanel {
  private el: HTMLElement;
  private cat: Catalog | null = null;
  private tab: Tab = 'risk';
  private q = '';
  private sort: 'ps' | 'ip' | 'd' | 'year' = 'ps';
  private limit = 60;
  onPick: (p: NeoPick) => void = () => {};

  constructor(parent: HTMLElement) {
    this.el = h('div', { id: 'neo-pop', class: 'glass hidden' });
    parent.append(this.el);
    this.el.addEventListener('click', (e) => e.stopPropagation());
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.open) this.close(); });
  }
  get open() { return !this.el.classList.contains('hidden'); }
  close() { this.el.classList.add('hidden'); }

  async show(tab: Tab = 'risk') {
    this.tab = tab;
    this.el.classList.remove('hidden');
    if (!this.cat) {
      this.el.innerHTML = '';
      this.el.append(h('p', { class: 'sp-note' }, 'Cargando el catálogo de la NASA…'));
      this.cat = (await import('../data/neo-catalog.json')).default as unknown as Catalog;
    }
    this.render();
  }

  private pick(p: NeoPick) { this.onPick(p); this.close(); toast(tr(`${p.name}: listo para simular. Pulsa «Detonar» para lanzarlo.`), 4000); }

  private render() {
    const C = this.cat!;
    this.el.innerHTML = '';
    const tabs = h('div', { class: 'seg neo-tabs' });
    for (const [t, l] of [['risk', 'Lista de riesgo'], ['close', 'Acercamientos'], ['famous', 'Famosos']] as const) tabs.append(h('button', { type: 'button', class: t === this.tab ? 'on' : '', onclick: () => { this.tab = t; this.limit = 60; this.render(); } }, l));
    this.el.append(
      h('div', { class: 'neo-head' }, h('b', {}, 'Asteroides reales'), h('button', { type: 'button', class: 'icon-btn', title: 'Cerrar', onclick: () => this.close() }, '✕')),
      tabs,
    );
    const body = h('div', { class: 'neo-body' });
    this.el.append(body);
    if (this.tab === 'risk') this.risk(body, C);
    else if (this.tab === 'close') this.close10(body, C);
    else this.famous(body, C);
    this.el.append(h('div', { class: 'neo-src' }, tr(`Datos: NASA/JPL (Sentry, SBDB y Close Approach Data), consultados el ${new Date(C.fetched).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })}. La probabilidad es la acumulada de todos los impactos posibles; la escala de Palermo compara el riesgo con el de fondo (por encima de 0, más que el de fondo) y la de Turín va de 0 (sin riesgo) a 10.`)));
  }

  private risk(body: HTMLElement, C: Catalog) {
    const search = h('input', { type: 'search', placeholder: tr('Buscar por nombre (p. ej. 2008 JL3)'), value: this.q, class: 'neo-q' }) as HTMLInputElement;
    search.addEventListener('input', () => { this.q = search.value; this.limit = 60; draw(); });
    const sort = h('select', { class: 'neo-sort' }) as HTMLSelectElement;
    for (const [v, l] of [['ps', 'Más peligrosos (Palermo)'], ['ip', 'Más probables'], ['d', 'Más grandes'], ['year', 'Más próximos en el tiempo']] as const) sort.append(h('option', { value: v }, l));
    sort.value = this.sort;
    sort.addEventListener('change', () => { this.sort = sort.value as never; this.limit = 60; draw(); });
    const list = h('div', { class: 'neo-list' });
    body.append(h('p', { class: 'sp-note' }, tr(`${n0(C.sentry.length)} objetos con alguna posibilidad de chocar con la Tierra en los próximos cien años o más. Casi todos son pequeños y su probabilidad, minúscula; se van descartando al observarlos más.`)), h('div', { class: 'neo-tools' }, search, sort), list);
    const draw = () => {
      const q = this.q.trim().toLowerCase();
      let rows = C.sentry.filter((r) => !q || r[0].toLowerCase().includes(q) || (r[11] ?? '').toLowerCase().includes(q));
      const yr = (r: SentryRow) => +r[5].slice(0, 4);
      if (this.sort === 'ip') rows = [...rows].sort((a, b) => (b[3] ?? 0) - (a[3] ?? 0));
      else if (this.sort === 'd') rows = [...rows].sort((a, b) => b[1] - a[1]);
      else if (this.sort === 'year') rows = [...rows].sort((a, b) => yr(a) - yr(b));
      list.innerHTML = '';
      list.append(h('div', { class: 'neo-row neo-hd' }, h('span', {}, 'Objeto'), h('span', {}, 'Tamaño'), h('span', {}, 'Probabilidad'), h('span', {}, 'Años'), h('span', {}, 'Palermo')));
      for (const r of rows.slice(0, this.limit)) {
        const [des, dM, vInf, ip, nImp, range, ps, , ts, H, last, full] = r;
        const nm = full && full !== des ? full : des;
        const [y0, y1] = range.split('-');
        const d = dM || (H != null ? dFromH(H) : 50);
        const det = h('div', { class: 'neo-det hidden' });
        const row = h('div', { class: 'neo-row', onclick: () => {
          det.classList.toggle('hidden');
          if (det.childElementCount) return;
          const vis = C.vi[des];
          const vTxt = (vInf ?? 0).toLocaleString(LOCALE, { maximumFractionDigits: 1 }), lastTxt = last.replace(/\..*$/, '').slice(0, 10);
          det.append(h('p', {}, y0 === y1
            ? tr(`Un impacto posible, en ${y0} · velocidad de encuentro ${vTxt} km/s · Turín ${ts ?? 0} · última observación ${lastTxt}`)
            : tr(`${nImp} impactos posibles entre ${y0} y ${y1} · velocidad de encuentro ${vTxt} km/s · Turín ${ts ?? 0} · última observación ${lastTxt}`)));
          if (vis?.length) {
            const t = h('div', { class: 'neo-vi' });
            t.append(h('span', { class: 'hd' }, 'Fecha'), h('span', { class: 'hd' }, 'Probabilidad'), h('span', { class: 'hd' }, 'Energía'));
            for (const [date, p, , , E] of vis) t.append(h('span', {}, date.slice(0, 10)), h('span', {}, odds(p)), h('span', {}, E == null ? '—' : E >= 1 ? `${E.toLocaleString(LOCALE, { maximumFractionDigits: 1 })} Mt` : `${n0(E * 1000)} kt`));
            det.append(t);
          }
          det.append(h('button', { type: 'button', class: 'btn-line', onclick: (e: MouseEvent) => { e.stopPropagation(); this.pick({ name: `${nm} (Sentry)`, diameterM: Math.round(d), densityKgM3: 2600, velocityKms: Math.round(vImpact(vInf) * 10) / 10, angleDeg: 45, note: tr(`Lista de riesgo Sentry (NASA/JPL): probabilidad acumulada ${odds(ip)}, ${nImp} ${nImp === 1 ? 'impacto posible' : 'impactos posibles'} (${range}), escala de Palermo ${(ps ?? 0).toLocaleString(LOCALE)}. Ángulo de entrada: el más probable, 45°.`) }); } }, 'Simular este impacto'));
        } },
          h('span', { class: 'neo-n' }, nm), h('span', {}, dTxt(d)), h('span', {}, odds(ip)), h('span', {}, range), h('span', { class: (ps ?? -9) > -3 ? 'neo-hot' : '' }, (ps ?? 0).toLocaleString(LOCALE)));
        list.append(row, det);
      }
      if (rows.length > this.limit) list.append(h('button', { type: 'button', class: 'btn-ghost neo-more', onclick: () => { this.limit += 100; draw(); } }, tr(`Mostrar más (${n0(rows.length - this.limit)} restantes)`)));
      if (!rows.length) list.append(h('p', { class: 'sp-note' }, 'Ningún objeto de la lista coincide con la búsqueda.'));
    };
    draw();
  }

  private close10(body: HTMLElement, C: Catalog) {
    const list = h('div', { class: 'neo-list' });
    body.append(h('p', { class: 'sp-note' }, tr(`Asteroides de más de unos 30 m que pasarán a menos de 19 distancias lunares (unos 7,5 millones de km) en los próximos diez años: ${n0(C.approaches.length)}. Ninguno de ellos chocará: así sería si lo hiciera.`)), list);
    list.append(h('div', { class: 'neo-row neo-hd neo-c' }, h('span', {}, 'Fecha'), h('span', {}, 'Objeto'), h('span', {}, 'Distancia'), h('span', {}, 'Tamaño'), h('span', {}, '')));
    for (const [des, full, cd, ld, , vInf, H, dM] of C.approaches.slice(0, this.limit)) {
      const d = dM ?? (H != null ? dFromH(H) : 50);
      const range = H != null && !dM ? `${dTxt(dFromH(H, 0.25))}–${dTxt(dFromH(H, 0.05))}` : dTxt(d);
      list.append(h('div', { class: 'neo-row neo-c' }, h('span', {}, cdDate(cd)), h('span', { class: 'neo-n' }, full.replace(/[()]/g, '')),
        h('span', { class: ld < 1 ? 'neo-hot' : '' }, tr(`${ld.toLocaleString(LOCALE, { maximumFractionDigits: 2 })} d. lunares`)), h('span', {}, range),
        h('button', { type: 'button', class: 'neo-go', title: 'Simular si chocara', onclick: () => this.pick({ name: `${full.replace(/[()]/g, '').trim()} (si chocara)`, diameterM: Math.round(d), densityKgM3: 2600, velocityKms: Math.round(vImpact(vInf) * 10) / 10, angleDeg: 45, note: tr(`Pasará el ${cdDate(cd)} a ${ld.toLocaleString(LOCALE, { maximumFractionDigits: 2 })} distancias lunares de la Tierra, sin chocar (NASA/JPL). Aquí, como si chocara.`) }) }, '▶')));
    }
    if (C.approaches.length > this.limit) list.append(h('button', { type: 'button', class: 'btn-ghost neo-more', onclick: () => { this.limit += 100; this.render(); } }, tr(`Mostrar más (${n0(C.approaches.length - this.limit)} restantes)`)));
  }

  private famous(body: HTMLElement, C: Catalog) {
    const list = h('div', { class: 'neo-fam' });
    body.append(list);
    for (const f of C.famous) {
      const d = f.dM ?? (f.H != null ? dFromH(f.H) : 1000);
      const facts = [
        dTxt(d), tr(f.cls), f.pha ? tr('potencialmente peligroso') : '',
        f.moidAu != null ? tr(`distancia mínima entre su órbita y la de la Tierra: ${(f.moidAu * 149597870.7 / 384400).toLocaleString(LOCALE, { maximumFractionDigits: f.moidAu * 389 < 1 ? 2 : 1 })} d. lunares`) : '',
        f.closest ? tr(`máximo acercamiento: ${cdDate(f.closest[0])}, a ${f.closest[1].toLocaleString(LOCALE, { maximumFractionDigits: 2 })} d. lunares`) : '',
        f.sentry ? tr('en la lista de riesgo') : '',
      ].filter(Boolean);
      list.append(h('div', { class: 'neo-f' },
        h('div', { class: 'neo-ft' }, h('b', {}, f.name), h('span', {}, facts.join(' · '))),
        h('p', {}, tr(FAMOUS_NOTES[f.name] ?? '')),
        h('button', { type: 'button', class: 'btn-ghost', onclick: () => this.pick({ name: `${f.name} (${f.sentry ? 'Sentry' : tr('si chocara')})`, diameterM: Math.round(d), densityKgM3: f.rho, velocityKms: Math.round(vImpact(f.vInf) * 10) / 10, angleDeg: 45, note: tr(FAMOUS_NOTES[f.name] ?? f.full) }) }, 'Simular su impacto')));
    }
  }
}
