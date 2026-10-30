// @ts-nocheck — script de Node (sin tipos de Node en el proyecto)
/**
 * Traducción de la enciclopedia: extrae los textos que faltan, recoge las traducciones y comprueba
 * los paquetes `src/encyclopedia/i18n/<idioma>.json` (huella del texto castellano → traducción).
 *
 *   npx tsx scripts/enc-i18n.ts todo [palabras]   textos que faltan en algún idioma, en trozos de
 *                                                 unas 9000 palabras: enc-todo/NN.json ({"1": "texto"…})
 *   npx tsx scripts/enc-i18n.ts merge             recoge enc-todo/out/<idioma>/NN.json, los valida y
 *                                                 los añade a los paquetes (y quita lo que ya no existe)
 *   npx tsx scripts/enc-i18n.ts check             cobertura de cada idioma
 *
 * La carpeta enc-todo/ es de trabajo y no se sube a git.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ALL_ARTICLES, GLOSSARY, IMAGES, VIDEOS, MATH } from '../src/encyclopedia/content/index';
import { hashStr, walkContent } from '../src/encyclopedia/i18n';

const ALL_LANGS = ['ca', 'en', 'fr', 'de', 'pt', 'it', 'ru', 'zh'];
/** LANGS=en,ca limita a esos idiomas; ENC_TODO=enc-todo/en usa otra carpeta de trozos (para tandas por idioma) */
const LANGS = process.env.LANGS ? process.env.LANGS.split(',') : ALL_LANGS;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PACKS = path.join(ROOT, 'src/encyclopedia/i18n');
const TODO = path.join(ROOT, process.env.ENC_TODO ?? 'enc-todo');

// todos los textos, en orden de lectura y sin repetir
const texts = new Map<string, string>();
walkContent({ articles: ALL_ARTICLES, glossary: GLOSSARY, images: IMAGES, videos: VIDEOS, math: MATH }, (s) => { const h = hashStr(s); if (!texts.has(h)) texts.set(h, s); return s; });

const readPack = (l: string): Record<string, string> => { try { return JSON.parse(fs.readFileSync(path.join(PACKS, `${l}.json`), 'utf8')); } catch { return {}; } };
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** lo que una traducción tiene que conservar tal cual */
function marks(s: string) {
  const links = [...s.matchAll(/\[\[([a-z0-9-]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]).sort().join(',');
  const urls = [...s.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]).sort().join(',');
  const bold = (s.match(/\*\*/g) ?? []).length;
  // los ordinales franceses o ingleses (1^{er}, 2^{e}…) no cuentan
  const sup = (s.replace(/\^\{(er|re|e|ère|ème|nd|st|rd|th|o|a)\}/g, '').match(/[\^_]\{/g) ?? []).length;
  return { links, urls, bold, sup };
}
function validate(es: string, t: string, l = ''): string | null {
  if (typeof t !== 'string' || !t.trim()) return 'vacío';
  const a = marks(es), b = marks(t);
  if (a.links !== b.links) return `enlaces internos distintos (${a.links} ≠ ${b.links})`;
  if (a.urls !== b.urls) return 'URL distintas';
  if (a.bold !== b.bold) return 'negritas descuadradas';
  if (a.sup !== b.sup) return 'superíndices o subíndices distintos';
  const r = t.length / es.length;
  const [lo, hi] = l === 'zh' || l === 'ja' ? [0.08, 1.1] : [0.45, 2.2];
  if (es.length > 60 && (r < lo || r > hi)) return `longitud sospechosa (${r.toFixed(2)})`;
  return null;
}

const mode = process.argv[2] ?? 'check';

if (mode === 'todo') {
  const per = +(process.argv[3] ?? 9000);
  const packs = Object.fromEntries(LANGS.map((l) => [l, readPack(l)]));
  const missing = [...texts].filter(([h]) => LANGS.some((l) => !packs[l][h]));
  // se rehacen los trozos (las traducciones de out/ se conservan: recógelas antes con merge)
  if (fs.existsSync(TODO)) for (const f of fs.readdirSync(TODO)) if (/^\d+(\.map)?\.json$/.test(f)) fs.rmSync(path.join(TODO, f));
  fs.mkdirSync(TODO, { recursive: true });
  let n = 0, chunk: [string, string][] = [], w = 0, total = 0;
  const flush = () => {
    if (!chunk.length) return;
    const id = String(++n).padStart(2, '0');
    fs.writeFileSync(path.join(TODO, `${id}.json`), JSON.stringify(Object.fromEntries(chunk.map(([, s], i) => [String(i + 1), s])), null, 1));
    fs.writeFileSync(path.join(TODO, `${id}.map.json`), JSON.stringify(chunk.map(([h]) => h)));
    chunk = []; w = 0;
  };
  for (const [h, s] of missing) { chunk.push([h, s]); w += words(s); total += words(s); if (w >= per) flush(); }
  flush();
  console.log(`${missing.length} textos (${total} palabras) en ${n} trozos en enc-todo/`);
  for (const l of LANGS) console.log(`  ${l}: faltan ${[...texts.keys()].filter((h) => !packs[l][h]).length}`);
} else if (mode === 'merge') {
  for (const l of LANGS) {
    const pack = readPack(l);
    const dir = path.join(TODO, 'out', l);
    let added = 0;
    const bad: string[] = [];
    if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).filter((x) => /^\d+\.json$/.test(x)).sort()) {
      const id = f.replace('.json', '');
      const map: string[] = JSON.parse(fs.readFileSync(path.join(TODO, `${id}.map.json`), 'utf8'));
      let out: Record<string, string>;
      try { out = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { bad.push(`${l}/${f}: JSON roto (${(e as Error).message})`); continue; }
      map.forEach((h, i) => {
        const t = out[String(i + 1)];
        const es = texts.get(h);
        if (!es) return; // ya no existe
        if (t === undefined) { bad.push(`${l}/${id}#${i + 1}: falta`); return; }
        const err = validate(es, t, l);
        if (err) { bad.push(`${l}/${id}#${i + 1}: ${err} · ${es.slice(0, 70)}`); return; }
        if (pack[h] !== t) { pack[h] = t; added++; }
      });
    }
    // en el orden de los textos y sin lo que ya no existe
    const clean: Record<string, string> = {};
    for (const h of texts.keys()) if (pack[h]) clean[h] = pack[h];
    fs.mkdirSync(PACKS, { recursive: true });
    fs.writeFileSync(path.join(PACKS, `${l}.json`), JSON.stringify(clean));
    console.log(`${l}: +${added} · ${Object.keys(clean).length}/${texts.size}${bad.length ? ` · ${bad.length} con problemas` : ''}`);
    if (bad.length) fs.writeFileSync(path.join(TODO, `bad-${l}.txt`), bad.join('\n'));
  }
} else {
  for (const l of LANGS) {
    const pack = readPack(l);
    const miss = [...texts].filter(([h]) => !pack[h]);
    const mw = miss.reduce((s, [, t]) => s + words(t), 0);
    console.log(`${l}: ${texts.size - miss.length}/${texts.size} textos · faltan ${miss.length} (${mw} palabras)`);
  }
}
