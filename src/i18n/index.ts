/**
 * Idiomas de Bum: castellano (el original), catalán, inglés, francés, alemán, portugués e italiano.
 *
 * El idioma se toma del sistema (o del que se elija en el menú de visualización). Los textos se
 * escriben en castellano en el código y se traducen al mostrarse: un observador recorre el
 * documento y cambia cada texto y cada atributo visible (title, aria-label, placeholder, alt) por
 * su traducción del catálogo (`<idioma>.json`). Los textos con cifras o nombres intercalados
 * están en el catálogo como plantillas («Distancia {0} km»), y lo intercalado se traduce a su vez.
 * Las partes marcadas con `data-i18n-skip` (los artículos de la enciclopedia) no se tocan.
 */
import { setLocale } from './locale';

export type Lang = 'es' | 'ca' | 'en' | 'fr' | 'de' | 'pt' | 'it';
export const LANGS: { id: Lang; name: string; locale: string; speech: string[] }[] = [
  { id: 'es', name: 'Castellano', locale: 'es-ES', speech: ['es-ES', 'es'] },
  { id: 'ca', name: 'Català', locale: 'ca-ES', speech: ['ca-ES', 'ca'] },
  { id: 'en', name: 'English', locale: 'en-GB', speech: ['en-GB', 'en-US', 'en'] },
  { id: 'fr', name: 'Français', locale: 'fr-FR', speech: ['fr-FR', 'fr'] },
  { id: 'de', name: 'Deutsch', locale: 'de-DE', speech: ['de-DE', 'de'] },
  { id: 'pt', name: 'Português', locale: 'pt-PT', speech: ['pt-PT', 'pt-BR', 'pt'] },
  { id: 'it', name: 'Italiano', locale: 'it-IT', speech: ['it-IT', 'it'] },
];
const PREF = 'bum:lang';

export let lang: Lang = 'es';

/** idioma del sistema (el primero de la lista del navegador que tengamos); si no, inglés */
export function systemLang(): Lang {
  const list = (navigator.languages?.length ? navigator.languages : [navigator.language || 'es']).map((l) => l.toLowerCase());
  for (const l of list) {
    const p = l.split('-')[0];
    if (LANGS.some((x) => x.id === p)) return p as Lang;
    // gallego, euskera y valenciano: castellano o catalán
    if (p === 'gl' || p === 'eu') return 'es';
    if (p === 'va') return 'ca';
  }
  return 'en';
}
/** preferencia guardada: «auto» (la del sistema) o un idioma */
export function langPref(): 'auto' | Lang {
  try { const v = localStorage.getItem(PREF); if (v && LANGS.some((x) => x.id === v)) return v as Lang; } catch { /* sin almacenamiento */ }
  return 'auto';
}
/** cambia el idioma (se aplica recargando la página) */
export function setLangPref(v: 'auto' | Lang) {
  try { if (v === 'auto') localStorage.removeItem(PREF); else localStorage.setItem(PREF, v); } catch { /* sin almacenamiento */ }
  location.reload();
}
export const langInfo = () => LANGS.find((x) => x.id === lang)!;

// ---------------------------------------------------------------- catálogo
const exact = new Map<string, string>();
/** plantilla: expresión regular y, por cada grupo, los índices de marcador que recoge (dos si van pegados) */
interface Pat { re: RegExp; out: string; lit: number; groups: number[][] }
/** plantillas indexadas por sus palabras para no probarlas todas; las que no tienen palabras, aparte */
const byWord = new Map<string, Pat[]>();
const generic: Pat[] = [];
const cache = new Map<string, string | null>();

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function addPattern(es: string, out: string) {
  const parts = es.split(/\{(\d+)\}/);
  let src = '^';
  const groups: number[][] = [];
  let lit = 0;
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) { src += escRe(parts[i]); lit += parts[i].replace(/[\s\d.,·:;()–—-]/g, '').length; continue; }
    // dos marcadores seguidos ({1}{2}) se recogen juntos y se reparten después
    if (i >= 2 && parts[i - 1] === '' && groups.length) { groups[groups.length - 1].push(+parts[i]); continue; }
    src += '([\\s\\S]*?)';
    groups.push([+parts[i]]);
  }
  if (lit < 2) return; // demasiado genérica: emparejaría con cualquier cosa
  const p: Pat = { re: new RegExp(src + '$'), out, lit, groups };
  const words = new Set((es.replace(/\{\d+\}/g, ' ').toLowerCase().match(/[a-záéíóúüñç]{4,}/g) ?? []));
  if (!words.size) generic.push(p);
  for (const w of words) { if (!byWord.has(w)) byWord.set(w, []); byWord.get(w)!.push(p); }
}

/** traduce un texto (con espacios alrededor conservados); si no está en el catálogo, lo deja igual */
export function tr(s: string, depth = 0): string {
  if (lang === 'es' || !s) return s;
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
  const key = m[2];
  if (!key || !/[A-Za-zÀ-ÿ]/.test(key)) return s;
  let r = cache.get(key);
  if (r === undefined) {
    r = exact.get(key) ?? null;
    // un fragmento en minúscula dentro de una frase («un bombardero»): se busca con mayúscula
    if (r === null && /^[a-záéíóúñ]/.test(key)) {
      const up = exact.get(key[0].toUpperCase() + key.slice(1));
      if (up) r = lang === 'de' ? up : up[0].toLowerCase() + up.slice(1);
    }
    if (r === null && depth < 4 && /[A-Za-zÀ-ÿ]{2,}/.test(key)) r = matchPattern(key, depth);
    if (cache.size > 20000) cache.clear();
    cache.set(key, r);
  }
  return r === null ? s : m[1] + r + m[3];
}

/** ¿se ha traducido (o no hacía falta: vacío o sin letras)? */
const okPart = (src: string, out: string) => (!/[A-Za-zÀ-ÿ]/.test(src) ? 1 : out !== src ? 2 : 0);

function matchPattern(key: string, depth: number): string | null {
  const words = key.toLowerCase().match(/[a-záéíóúüñç]{4,}/g) ?? [];
  const cand = new Set<Pat>();
  for (const w of new Set(words)) for (const p of byWord.get(w) ?? []) cand.add(p);
  const list = [...cand].sort((a, b) => b.lit - a.lit).concat(generic);
  for (const p of list) {
    const g = p.re.exec(key);
    if (!g) continue;
    const vals: string[] = [];
    p.groups.forEach((idx, i) => {
      const c = g[i + 1];
      if (idx.length === 1) { vals[idx[0]] = tr(c, depth + 1); return; }
      // marcadores pegados: el corte que deja más trozos traducidos
      let best = { s: -1, a: c, b: '' };
      for (let k = c.length; k >= 0; k--) {
        const A = c.slice(0, k), B = c.slice(k), ta = tr(A, depth + 1), tb = tr(B, depth + 1);
        const sc = okPart(A, ta) + okPart(B, tb);
        if (sc > best.s) best = { s: sc, a: ta, b: tb };
        if (sc === 4) break;
      }
      vals[idx[0]] = best.a; vals[idx[1]] = best.b;
      for (const j of idx.slice(2)) vals[j] = '';
    });
    return p.out.replace(/\{(\d+)\}/g, (_, d) => vals[+d] ?? '');
  }
  return null;
}

// ---------------------------------------------------------------- documento
const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
const doneText = new WeakMap<Text, string>();
const doneAttr = new WeakMap<Element, Record<string, string>>();
const skip = (el: Element | null) => !!el?.closest('[data-i18n-skip], script, style, code, pre, textarea');

function doText(n: Text) {
  const v = n.data;
  if (doneText.get(n) === v) return;
  if (skip(n.parentElement)) { doneText.set(n, v); return; }
  const t = tr(v);
  doneText.set(n, t);
  if (t !== v) n.data = t;
}
function doAttrs(el: Element) {
  let rec = doneAttr.get(el);
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v || rec?.[a] === v) continue;
    if (!rec) { rec = {}; doneAttr.set(el, rec); }
    if (skip(el)) { rec[a] = v; continue; }
    const t = tr(v);
    rec[a] = t;
    if (t !== v) el.setAttribute(a, t);
  }
}
function walk(root: Node) {
  if (root.nodeType === 3) { doText(root as Text); return; }
  if (root.nodeType !== 1 && root.nodeType !== 11) return;
  if (root.nodeType === 1) { if (skip(root as Element)) return; doAttrs(root as Element); }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => (n.nodeType === 1 && skip(n as Element) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = w.nextNode(); n; n = w.nextNode()) { if (n.nodeType === 3) doText(n as Text); else doAttrs(n as Element); }
}

/** fija el idioma y, si no es el castellano, carga su catálogo y empieza a traducir la página */
export async function initI18n() {
  const pref = langPref();
  lang = pref === 'auto' ? systemLang() : pref;
  setLocale(langInfo().locale);
  document.documentElement.lang = lang;
  if (lang === 'es') return;
  try {
    const cat = (await import(`./${lang}.json`)).default as Record<string, string>;
    for (const [es, t] of Object.entries(cat)) {
      if (!t || (t === es && !/\{\d+\}/.test(es))) continue;
      if (/\{\d+\}/.test(es)) addPattern(es, t); else exact.set(es.trim(), t.trim());
    }
  } catch (e) { console.warn('idioma', lang, e); lang = 'es'; setLocale('es-ES'); document.documentElement.lang = 'es'; return; }
  document.title = tr(document.title);
  walk(document.body);
  new MutationObserver((recs) => {
    for (const r of recs) {
      if (r.type === 'characterData') doText(r.target as Text);
      else if (r.type === 'attributes') doAttrs(r.target as Element);
      else for (const n of r.addedNodes) walk(n);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
