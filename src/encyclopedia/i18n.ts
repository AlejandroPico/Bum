/**
 * Traducción de los artículos de la enciclopedia.
 *
 * Los artículos se escriben en castellano. Cada idioma tiene un paquete (`i18n/<idioma>.json`) que
 * guarda la traducción de cada texto indexada por una huella del texto original: así, si un texto
 * castellano cambia, su traducción antigua deja de aplicarse sola (se ve el castellano hasta que se
 * vuelve a traducir) y no hace falta llevar la cuenta de posiciones. El mismo recorrido sirve para
 * extraer los textos (scripts/enc-i18n.ts) y para aplicar las traducciones al cargar.
 *
 * No se traducen: los identificadores, los nombres exactos de los presets del simulador, las
 * fórmulas, los créditos y licencias de las imágenes ni la bibliografía.
 */
import type { Article, Block, GlossaryTerm, ImgRef } from './types';
import type { VidRef } from './content/videos';

export interface EncContent {
  articles: Article[];
  glossary: GlossaryTerm[];
  images: Record<string, ImgRef[]>;
  videos: Record<string, VidRef[]>;
  math: Record<string, Block[]>;
}

/** huella corta y estable de un texto (cyrb53 en base 36) */
export function hashStr(s: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** ¿tiene algo que traducir? */
const has = (s: string | undefined): s is string => !!s && /[A-Za-zÀ-ÿ]/.test(s);

type Fn = (s: string) => string;

function block(b: Block, f: Fn) {
  const T = (s: string) => (has(s) ? f(s) : s);
  switch (b.t) {
    case 'p': case 'h': case 'note': b.text = T(b.text); break;
    case 'list': b.items = b.items.map(T); break;
    case 'facts': b.rows = b.rows.map(([k, v]) => [T(k), T(v)]); break;
    case 'quote': b.text = T(b.text); b.by = T(b.by); break;
    case 'timeline': b.items = b.items.map((x) => ({ date: T(x.date), text: T(x.text) })); break;
    case 'compare': b.head = b.head.map(T); b.rows = b.rows.map((r) => r.map(T)); break;
    case 'model': case 'diagram': case 'chart': case 'widget': if (b.caption) b.caption = T(b.caption); break;
    case 'sim': if (b.label) b.label = T(b.label); break;
    case 'img': b.caption = T(b.caption); break;
    case 'gallery': b.items = b.items.map((x) => ({ ...x, caption: T(x.caption) })); break;
    case 'math': if (b.caption) b.caption = T(b.caption); if (b.vars) b.vars = b.vars.map(([k, v]) => [k, T(v)]); break;
    case 'step': b.time = T(b.time); b.title = T(b.title); b.text = T(b.text); break;
    case 'sources': break;
  }
}

/**
 * Recorre todos los textos traducibles y los sustituye por lo que devuelva `f`.
 * `keepTags`: conserva también las etiquetas originales (para que la búsqueda en castellano siga
 * funcionando en cualquier idioma).
 */
export function walkContent(c: EncContent, f: Fn, keepTags = false) {
  const T = (s: string) => (has(s) ? f(s) : s);
  for (const a of c.articles) {
    a.title = T(a.title);
    a.summary = T(a.summary);
    if (a.tags) { const t = a.tags.map(T); a.tags = keepTags ? [...new Set([...t, ...a.tags])] : t; }
    for (const b of a.blocks) block(b, f);
  }
  for (const g of c.glossary) { g.term = T(g.term); g.def = T(g.def); }
  for (const list of Object.values(c.images)) for (const r of list) r.caption = T(r.caption);
  for (const list of Object.values(c.videos)) for (const v of list) v.caption = T(v.caption);
  for (const list of Object.values(c.math)) for (const b of list) block(b, f);
}

/** aplica un paquete de traducciones (huella → texto) */
export function applyPack(c: EncContent, pack: Record<string, string>) {
  let hit = 0, miss = 0;
  walkContent(c, (s) => { const t = pack[hashStr(s)]; if (t) { hit++; return t; } miss++; return s; }, true);
  return { hit, miss };
}
