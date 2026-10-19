/**
 * Extrae los textos visibles del código (cadenas y plantillas) y dice cuántos faltan en cada catálogo de
 * `src/i18n/`. Uso: npm run i18n. Escribe la lista completa en i18n-textos.json (no se sube a git).
 */
import { parse } from '@babel/parser';
import fs from 'fs';
import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../src');
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (!p.includes('/encyclopedia')) walk(p); } else if (p.endsWith('.ts') && !p.endsWith('.worker.ts')) files.push(p); } })(root);
for (const f of ['Encyclopedia.ts', 'types.ts', 'diagrams.ts', 'widgets.ts']) files.push(root + '/encyclopedia/' + f);
const BLOCK_CALLEE = new Set(['querySelector', 'querySelectorAll', 'getElementById', 'addEventListener', 'removeEventListener', 'add', 'remove', 'toggle', 'contains', 'setLayoutProperty', 'setPaintProperty', 'getLayer', 'getSource', 'removeLayer', 'removeSource', 'addSource', 'getPaintProperty', 'getLayoutProperty', 'setFilter', 'setProperty', 'getItem', 'setItem', 'removeItem', 'createElement', 'getContext', 'getExtension', 'on', 'off', 'once', 'warn', 'error', 'log', 'matchMedia', 'setAttribute', 'getAttribute', 'import', 'require', 'fetch', 'Worker', 'URL', 'includes', 'startsWith', 'endsWith', 'split', 'replace', 'test', 'match', 'padStart', 'join', 'toLocaleString', 'getParameter', 'postMessage', 'setStyle', 'setSky', 'getStyle', 'querySourceFeatures', 'queryRenderedFeatures']);
const out = new Map();
const isCodey = (s) => {
  const t = s.trim();
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(t)) return true;
  if (/^(https?:|data:|\.\/|#[0-9a-f]{3,8}$|rgba?\(|hsla?\(|[a-z]+:\/\/)/i.test(t)) return true;
  if (/^[a-z0-9]+([-_][a-z0-9]+)+$/.test(t)) return true; // kebab/snake
  if (/^[a-z][a-zA-Z0-9]*$/.test(t) && !/[áéíóúñ]/.test(t)) return 'maybe';
  if (/^[A-Z0-9_]+$/.test(t) && t.length < 6) return true;
  if (/^[.#\[]?[a-z-]+[\]\s.#>:a-z-]*$/.test(t) && /[.#\[]/.test(t[0])) return true;
  if (/^(mousemove|mouseleave|click|change|input|keydown|pointerdown|load|idle|render)$/.test(t)) return true;
  if (/<svg|<path|viewBox|stroke-width/.test(t)) return true;
  if (/^[\w-]+\s*:\s*[\w#().,% -]+;?$/.test(t)) return true; // css decl
  return false;
};
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let ast;
  try { ast = parse(src, { sourceType: 'module', plugins: ['typescript'] }); } catch (e) { console.error('parse', f, e.message); continue; }
  const visit = (node, parent, key) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'ImportDeclaration' || node.type === 'TSTypeAnnotation' || node.type === 'TSLiteralType' || node.type === 'TSTypeAliasDeclaration' || node.type === 'TSInterfaceDeclaration') return;
    let calleeName = null;
    if (parent && parent.type === 'CallExpression' && key === 'arguments') {
      const c = parent.callee; calleeName = c.type === 'MemberExpression' ? c.property.name : c.name;
      // add/remove/toggle/contains sólo son código si van sobre classList
      if (['add', 'remove', 'toggle', 'contains'].includes(calleeName) && !(c.type === 'MemberExpression' && c.object.type === 'MemberExpression' && c.object.property.name === 'classList')) calleeName = null;
    }
    if (parent && parent.type === 'ObjectProperty' && key === 'key') return;
    if (parent && parent.type === 'BinaryExpression' && ['===', '!==', '==', '!='].includes(parent.operator)) return;
    if (parent && parent.type === 'SwitchCase') return;
    if (node.type === 'StringLiteral') {
      if (calleeName && BLOCK_CALLEE.has(calleeName)) return;
      const c = isCodey(node.value);
      if (c === true) return;
      const rel = path.relative(root, f);
      const k = node.value;
      if (!out.has(k)) out.set(k, { files: new Set(), maybe: c === 'maybe' });
      out.get(k).files.add(rel);
      return;
    }
    if (node.type === 'TemplateLiteral') {
      if (calleeName && BLOCK_CALLEE.has(calleeName)) { for (const e of node.expressions) visit(e, node, 'expressions'); return; }
      const parts = node.quasis.map((q) => q.value.cooked ?? q.value.raw);
      let pat = ''; parts.forEach((p, i) => { pat += p; if (i < node.expressions.length) pat += `{${i}}`; });
      const lit = parts.join('');
      if (!isCodey(lit) || (/[a-záéíóúñ]{3,}\s/i.test(lit))) {
        const c = isCodey(lit);
        if (c !== true && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,}/.test(lit)) {
          const rel = path.relative(root, f);
          if (!out.has(pat)) out.set(pat, { files: new Set(), maybe: false, tpl: true });
          out.get(pat).files.add(rel);
        }
      }
      for (const e of node.expressions) visit(e, node, 'expressions');
      return;
    }
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'start' || k === 'end' || k === 'leadingComments' || k === 'trailingComments' || k === 'extra') continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach((x) => x && typeof x.type === 'string' && visit(x, node, k));
      else if (v && typeof v.type === 'string') visit(v, node, k);
    }
  };
  visit(ast.program, null, null);
}
const arr = [...out.entries()].map(([k, v]) => ({ k, files: [...v.files], maybe: v.maybe, tpl: !!v.tpl }));


// ---- textos que faltan en cada catálogo
const keepMaybe = new Set(['fuera', 'bajo', 'riesgo', 'grave', 'extremo', 'norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste', 'ojiva', 'radiactiva', 'dentro', 'viento', 'toneladas', 'kilotones', 'megatones', 'mortal', 'insignificante', 'inapreciable', 'inviable', 'submarina', 'relieve', 'impactador', 'impactadores']);
const bad = (s) => /uniform |void main|gl_|attribute |varying |vec[234]\(|nwr\[|\[out:json|Noto Sans|<a href|precision highp|#version/.test(s);
const want = new Set();
for (const x of arr) {
  if (x.maybe && !keepMaybe.has(x.k.trim())) continue;
  if (bad(x.k) || x.files.every((f) => f.startsWith('fx/') && f !== 'fx/plan.ts') || x.files.every((f) => /i18n|narrator|perf/.test(f))) continue;
  const segs = /<[a-z][^>]*>/i.test(x.k) ? x.k.split(/<[^>]+>/).filter((s) => /[A-Za-zÁÉÍÓÚáéíóúñ]{3,}/.test(s)).map((s) => s.trim()) : [x.k.trim()];
  for (const s of segs) if (s) want.add(s);
}
for (const L of ['ca', 'en', 'fr', 'de', 'pt', 'it']) {
  const cat = JSON.parse(fs.readFileSync(path.join(root, 'i18n', L + '.json'), 'utf8'));
  const miss = [...want].filter((s) => !(s in cat));
  console.log(`${L}: ${miss.length} textos sin entrada en el catálogo (muchos son iguales en ese idioma o son código)`);
}
fs.writeFileSync(path.join(root, '..', 'i18n-textos.json'), JSON.stringify([...want], null, 1));
console.log('Lista completa en i18n-textos.json');
