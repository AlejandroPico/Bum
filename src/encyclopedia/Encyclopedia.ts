import type { Article, Block, CatId, GlossaryTerm, ImgRef } from './types';
import { CATEGORIES } from './types';
import { mountDiagram } from './diagrams';
import { slug } from './slug';

/**
 * Enciclopedia de Bum: panel a pantalla completa con índice por categorías, buscador,
 * artículos con esquemas animados y modelos 3D interactivos, glosario y catálogo de todas
 * las armas, explosiones y asteroides del simulador.
 */

const CAT_GROUPS: { from: number; to: number; name: string }[] = [
  { from: 100, to: 199, name: 'Pruebas y bombas históricas' },
  { from: 200, to: 299, name: 'Armas de la Guerra Fría (retiradas)' },
  { from: 300, to: 399, name: 'Arsenales actuales' },
  { from: 400, to: 499, name: 'Explosiones no nucleares' },
  { from: 500, to: 599, name: 'Bombas convencionales' },
  { from: 600, to: 699, name: 'Asteroides y cometas' },
];

/** recorrido recomendado para quien empieza de cero */
const PATH = ['atomo', 'radiactividad', 'fision', 'reaccion-en-cadena', 'masa-critica', 'tipo-canon', 'implosion', 'proyecto-manhattan', 'prueba-trinity', 'hiroshima', 'la-super', 'bomba-de-hidrogeno', 'bola-de-fuego', 'lluvia-radiactiva'];

interface Mounted { destroy(): void }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export class Encyclopedia {
  el: HTMLElement;
  private nav!: HTMLElement;
  private main!: HTMLElement;
  private search!: HTMLInputElement;
  private articles: Article[] = [];
  private byId = new Map<string, Article>();
  private glossary: GlossaryTerm[] = [];
  private images: Record<string, ImgRef[]> = {};
  private math: Record<string, Block[]> = {};
  private sources: { byId: Record<string, string[]>; byCat: Partial<Record<CatId, string[]>> } = { byId: {}, byCat: {} };
  private loaded: Promise<void> | null = null;
  private mounted: Mounted[] = [];
  private observers: IntersectionObserver[] = [];
  private history: string[] = [];
  private current = '';
  private onSim: (preset: string) => void;

  constructor(onSim: (preset: string) => void) {
    this.onSim = onSim;
    this.el = document.createElement('div');
    this.el.id = 'enc';
    this.el.className = 'hidden';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'Enciclopedia');
    document.getElementById('app')!.append(this.el);
    this.el.innerHTML = `
      <aside class="enc-side">
        <div class="enc-brand"><span class="enc-book"></span><div><b>Enciclopedia</b><small>Armas nucleares, efectos e impactos</small></div></div>
        <div class="enc-search"><input type="search" placeholder="Buscar en la enciclopedia…" spellcheck="false" /></div>
        <nav class="enc-nav"></nav>
      </aside>
      <main class="enc-main"></main>
      <div class="enc-top"><button class="enc-back" type="button" title="Atrás">←</button><button class="enc-close" type="button" title="Cerrar (Esc)">✕</button></div>`;
    this.nav = this.el.querySelector('.enc-nav')!;
    this.main = this.el.querySelector('.enc-main')!;
    this.search = this.el.querySelector('.enc-search input')!;
    (this.el.querySelector('.enc-book') as HTMLElement).innerHTML = BOOK_ICON;
    this.el.querySelector('.enc-close')!.addEventListener('click', () => this.close());
    this.el.querySelector('.enc-back')!.addEventListener('click', () => this.back());
    this.search.addEventListener('input', () => { const q = this.search.value.trim(); if (q.length >= 2) this.show(`buscar:${q}`, false); else if (!q && this.current.startsWith('buscar:')) this.back(); });
    this.main.addEventListener('click', (e) => this.onClick(e));
    this.nav.addEventListener('click', (e) => this.onClick(e));
    // Imagen que no carga (Commons caído, límite de peticiones…): un reintento a otro tamaño y, si
    // vuelve a fallar, se retira la figura para no dejar huecos.
    this.main.addEventListener('error', (e) => {
      const img = e.target as HTMLImageElement;
      if (!(img instanceof HTMLImageElement)) return;
      const fig = img.closest('figure');
      const file = img.closest<HTMLElement>('[data-zoom]')?.dataset.zoom;
      if (file && !img.dataset.retry) { img.dataset.retry = '1'; setTimeout(() => { img.src = this.imgUrl(file, 500); }, 1500); return; }
      if (fig?.closest('.enc-gal')) fig.remove();
      else fig?.classList.add('enc-photo-off');
    }, true);
    window.addEventListener('keydown', (e) => {
      if (this.el.classList.contains('hidden')) return;
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      if (e.key === '/' && document.activeElement !== this.search) { e.preventDefault(); this.search.focus(); }
    });
  }

  get isOpen() { return !this.el.classList.contains('hidden'); }

  private load() {
    if (!this.loaded) {
      this.loaded = import('./content/index').then((m) => {
        this.articles = m.ALL_ARTICLES;
        this.glossary = m.GLOSSARY;
        this.images = m.IMAGES;
        this.math = m.MATH;
        this.sources = m.SOURCES;
        for (const a of this.articles) this.byId.set(a.id, a);
        this.buildNav();
      });
    }
    return this.loaded;
  }

  /** ¿existe ficha para este nombre de preset? */
  async hasPreset(name: string) { await this.load(); return this.byId.has(slug(name)); }

  async open(id = '') {
    this.el.classList.remove('hidden');
    document.body.classList.add('enc-open');
    if (!this.loaded) this.main.innerHTML = '<div class="enc-loading">Cargando la enciclopedia…</div>';
    await this.load();
    this.show(id || this.current || 'inicio');
  }
  openPreset(name: string) { this.open(slug(name)); }
  /** abre la ficha que mejor encaja con un nombre (preset, título o etiqueta) */
  async openBest(name: string) {
    await this.load();
    if (this.byId.has(slug(name))) return this.open(slug(name));
    const q = name.toLowerCase();
    const base = q.split(/ · | \(| — /)[0].trim();
    const hit = this.articles.find((a) => a.title.toLowerCase() === q) ?? this.articles.find((a) => a.tags?.some((t) => t.toLowerCase() === q)) ?? this.articles.find((a) => a.title.toLowerCase().includes(q))
      ?? this.articles.find((a) => a.title.toLowerCase().startsWith(base)) ?? this.articles.find((a) => a.tags?.some((t) => t.toLowerCase() === base));
    return this.open(hit?.id ?? '');
  }
  close() {
    this.el.classList.add('hidden');
    document.body.classList.remove('enc-open');
    this.unmountAll();
    this.current = '';
  }
  toggle() { if (this.isOpen) this.close(); else this.open(); }

  private back() {
    this.history.pop();
    const prev = this.history.pop();
    this.show(prev ?? 'inicio');
  }

  // ---------------------------------------------------------------- índice
  private buildNav() {
    const out: string[] = [];
    out.push(`<a class="enc-nav-home" data-go="inicio">Inicio</a>`);
    for (const c of CATEGORIES) {
      const list = this.inCat(c.id);
      out.push(`<details class="enc-cat" data-cat="${c.id}"><summary><span>${c.name}</span><i>${list.length}</i></summary><div>`);
      if (c.id === 'cat') {
        for (const g of CAT_GROUPS) {
          const items = list.filter((a) => (a.order ?? 0) >= g.from && (a.order ?? 0) <= g.to);
          if (!items.length) continue;
          out.push(`<div class="enc-sub">${g.name}</div>`);
          for (const a of items) out.push(`<a data-go="${a.id}">${esc(a.title)}</a>`);
        }
      } else for (const a of list) out.push(`<a data-go="${a.id}">${esc(a.title)}</a>`);
      out.push('</div></details>');
    }
    out.push(`<a class="enc-nav-home" data-go="glosario">Glosario</a>`);
    this.nav.innerHTML = out.join('');
  }

  private inCat(c: CatId) {
    return this.articles.filter((a) => a.cat === c).sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.title.localeCompare(b.title, 'es'));
  }

  // ---------------------------------------------------------------- navegación
  private show(id: string, push = true) {
    this.unmountAll();
    if (push && this.history[this.history.length - 1] !== id) this.history.push(id);
    this.current = id;
    let html = '';
    if (id === 'inicio') html = this.home();
    else if (id === 'glosario') html = this.glossaryPage();
    else if (id.startsWith('buscar:')) html = this.searchPage(id.slice(7));
    else if (id.startsWith('cat:')) html = this.catPage(id.slice(4) as CatId);
    else {
      const a = this.byId.get(id);
      html = a ? this.article(a) : `<div class="enc-art"><h1>No encontrado</h1><p>No hay ningún artículo con ese identificador.</p></div>`;
    }
    this.main.innerHTML = html;
    this.main.scrollTop = 0;
    this.nav.querySelectorAll('a').forEach((x) => x.classList.toggle('on', (x as HTMLElement).dataset.go === id));
    const a = this.byId.get(id);
    if (a) {
      const det = this.nav.querySelector(`details[data-cat="${a.cat}"]`) as HTMLDetailsElement | null;
      if (det) det.open = true;
      this.nav.querySelector(`a[data-go="${id}"]`)?.scrollIntoView({ block: 'nearest' });
    }
    (this.el.querySelector('.enc-back') as HTMLElement).style.visibility = this.history.length > 1 ? 'visible' : 'hidden';
    this.mountWidgets();
  }

  private onClick(e: Event) {
    const t = (e.target as HTMLElement).closest('[data-go],[data-sim],[data-model],[data-anchor],[data-zoom],[data-step],[data-step-d]') as HTMLElement | null;
    if (!t) return;
    if (t.dataset.anchor) { e.preventDefault(); this.main.querySelector(`#${t.dataset.anchor}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (t.dataset.zoom) { e.preventDefault(); this.lightbox(t.dataset.zoom, t.dataset.cap ?? ''); return; }
    if (t.dataset.step !== undefined || t.dataset.stepD !== undefined) {
      e.preventDefault();
      const st = t.closest('.enc-story') as HTMLElement;
      const n = +(st.dataset.n ?? 1);
      const cur = +(st.querySelector('.enc-step.on') as HTMLElement).dataset.i!;
      const to = t.dataset.step !== undefined ? +t.dataset.step : Math.max(0, Math.min(n - 1, cur + +t.dataset.stepD!));
      st.querySelectorAll('.enc-step').forEach((x, i) => x.classList.toggle('on', i === to));
      st.querySelectorAll('.enc-story-bar button').forEach((x, i) => { x.classList.toggle('on', i === to); x.classList.toggle('past', i < to); });
      (st.querySelector('.enc-story-c') as HTMLElement).textContent = `${to + 1} / ${n}`;
      return;
    }
    if (!t.dataset.go && !t.dataset.sim) return;
    e.preventDefault();
    if (t.dataset.go) { if (t.closest('.enc-nav')) this.search.value = ''; this.show(t.dataset.go); }
    else if (t.dataset.sim) { const p = t.dataset.sim; this.close(); this.onSim(p); }
  }

  // ---------------------------------------------------------------- páginas
  private home() {
    const count = this.articles.length;
    const words = Math.round(this.articles.reduce((s, a) => s + JSON.stringify(a.blocks).split(/\s+/).length, 0) / 1000);
    const cats = CATEGORIES.map((c) => `<a class="enc-card" data-go="cat:${c.id}"><b>${c.name}</b><span>${c.desc}</span><i>${this.inCat(c.id).length} artículos</i></a>`).join('');
    const path = PATH.filter((p) => this.byId.has(p)).map((p, i) => `<a data-go="${p}"><b>${i + 1}</b>${esc(this.byId.get(p)!.title)}</a>`).join('');
    return `<div class="enc-art enc-home">
      <div class="enc-kicker">Bum · Enciclopedia</div>
      <h1>Todo sobre las armas nucleares, sus efectos y los impactos cósmicos</h1>
      <p class="enc-lead">De qué está hecho un átomo y por qué puede liberar tanta energía; cómo funcionaban Little Boy y Fat Man, qué fue el Proyecto Manhattan, cómo nació la bomba de hidrógeno y qué ocurre en cada segundo de una explosión. Con esquemas animados y modelos 3D que puedes girar, cortar y desmontar.</p>
      <div class="enc-stats"><span><b>${count}</b> artículos</span><span><b>≈ ${words} 000</b> palabras</span><span><b>${this.glossary.length}</b> términos en el glosario</span></div>
      <h2>Empieza por aquí</h2>
      <div class="enc-path">${path}</div>
      <h2>Secciones</h2>
      <div class="enc-cards">${cats}<a class="enc-card" data-go="glosario"><b>Glosario</b><span>Definiciones breves de los términos técnicos.</span><i>${this.glossary.length} términos</i></a></div>
      <p class="enc-disc">Contenido divulgativo, al nivel de un museo o de una enciclopedia general: explica los principios, la historia y las partes de cada arma tal como se han mostrado públicamente. No incluye ni pretende incluir información para fabricar armas; el diseño interior de las armas modernas es secreto y aquí sólo se representa de forma genérica.</p>
    </div>`;
  }

  private catPage(c: CatId) {
    const cat = CATEGORIES.find((x) => x.id === c)!;
    const list = this.inCat(c);
    let body = '';
    const row = (a: Article) => `<a class="enc-row" data-go="${a.id}"><b>${esc(a.title)}</b><span>${this.md(a.summary)}</span></a>`;
    if (c === 'cat') {
      for (const g of CAT_GROUPS) { const items = list.filter((a) => (a.order ?? 0) >= g.from && (a.order ?? 0) <= g.to); if (items.length) body += `<h2>${g.name}</h2>${items.map(row).join('')}`; }
    } else body = list.map(row).join('');
    return `<div class="enc-art"><div class="enc-kicker">Sección</div><h1>${cat.name}</h1><p class="enc-lead">${cat.desc}</p>${body}</div>`;
  }

  private glossaryPage() {
    let letter = '';
    const items = this.glossary.map((g) => {
      const L = norm(g.term)[0].toUpperCase();
      const head = L !== letter ? `<h2 id="gl-${L}">${(letter = L)}</h2>` : '';
      return `${head}<div class="enc-gl"><b>${esc(g.term)}</b><span>${this.md(g.def)}${g.see && this.byId.has(g.see) ? ` <a data-go="${g.see}">Ver artículo →</a>` : ''}</span></div>`;
    }).join('');
    return `<div class="enc-art"><div class="enc-kicker">Referencia</div><h1>Glosario</h1>${items}</div>`;
  }

  private searchPage(q: string) {
    const n = norm(q);
    const words = n.split(/\s+/).filter(Boolean);
    const scored = this.articles.map((a) => {
      const title = norm(a.title), tags = norm((a.tags ?? []).join(' ')), sum = norm(a.summary);
      let s = 0;
      for (const w of words) {
        if (title.includes(w)) s += 10;
        if (tags.includes(w)) s += 5;
        if (sum.includes(w)) s += 3;
      }
      if (s === 0) { const body = norm(JSON.stringify(a.blocks)); for (const w of words) if (body.includes(w)) s += 1; }
      return { a, s };
    }).filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, 40);
    const gl = this.glossary.filter((g) => words.every((w) => norm(g.term + ' ' + g.def).includes(w))).slice(0, 8);
    const rows = scored.map(({ a }) => `<a class="enc-row" data-go="${a.id}"><b>${esc(a.title)}</b><span>${this.md(a.summary)}</span><i>${CATEGORIES.find((c) => c.id === a.cat)?.name ?? ''}</i></a>`).join('');
    const glr = gl.map((g) => `<div class="enc-gl"><b>${esc(g.term)}</b><span>${this.md(g.def)}${g.see && this.byId.has(g.see) ? ` <a data-go="${g.see}">Ver artículo →</a>` : ''}</span></div>`).join('');
    return `<div class="enc-art"><div class="enc-kicker">Búsqueda</div><h1>«${esc(q)}»</h1>${rows || '<p>No hay artículos que coincidan.</p>'}${glr ? `<h2>En el glosario</h2>${glr}` : ''}</div>`;
  }

  private article(a: Article) {
    const cat = CATEGORIES.find((c) => c.id === a.cat)!;
    // la primera ficha técnica va en la columna lateral
    const fi = a.blocks.findIndex((b) => b.t === 'facts');
    const facts = fi >= 0 ? a.blocks[fi] as Extract<Block, { t: 'facts' }> : null;
    const body = a.blocks.filter((_, i) => i !== fi);
    const imgs = this.images[a.id] ?? [];
    const math = this.math[a.id] ?? [];
    const src = [...(a.sources ?? []), ...(this.sources.byId[a.id] ?? []), ...(this.sources.byCat[a.cat] ?? [])];
    // índice de secciones
    let hn = 0;
    const toc: string[] = [];
    const blocks: string[] = [];
    let story: Extract<Block, { t: 'step' }>[] = [];
    const flushStory = () => { if (story.length) { blocks.push(this.storyHtml(story)); story = []; } };
    body.forEach((b, i) => {
      if (b.t === 'step') { story.push(b); return; }
      flushStory();
      if (b.t === 'h') { const id = `s-${++hn}`; toc.push(`<a data-anchor="${id}">${this.md(b.text)}</a>`); blocks.push(`<h2 id="${id}">${this.md(b.text)}</h2>`); return; }
      blocks.push(this.block(b, i));
      // segunda foto tras el segundo párrafo, para airear el texto
      if (i === 2 && imgs[1]) blocks.push(this.figure(imgs[1], false));
    });
    flushStory();
    if (math.length) { toc.push(`<a data-anchor="s-math">Las matemáticas</a>`); blocks.push(`<h2 id="s-math">Las matemáticas</h2>`, ...math.map((b, i) => this.block(b, 1000 + i))); }
    const rest = imgs.slice(2);
    if (rest.length) { toc.push(`<a data-anchor="s-img">Imágenes</a>`); blocks.push(`<h2 id="s-img">Imágenes</h2>`, this.gallery(rest)); }
    if (src.length) { toc.push(`<a data-anchor="s-src">Fuentes</a>`); blocks.push(`<h2 id="s-src">Fuentes y lecturas</h2>`, this.block({ t: 'sources', items: src }, 2000)); }
    const rel = (a.related ?? []).filter((r) => this.byId.has(r)).map((r) => `<a data-go="${r}">${esc(this.byId.get(r)!.title)}</a>`).join('');
    const list = this.inCat(a.cat);
    const i = list.indexOf(a);
    const prev = list[i - 1], next = list[i + 1];
    const hero = imgs[0] ? this.figure(imgs[0], true) : '';
    return `<article class="enc-art enc-wide">
      <header class="enc-hd">
        <div class="enc-kicker"><a data-go="cat:${a.cat}">${cat.name}</a></div>
        <h1>${esc(a.title)}</h1>
        <p class="enc-lead">${this.md(a.summary)}</p>
      </header>
      <div class="enc-grid">
        <div class="enc-body">
          ${hero}
          ${blocks.join('')}
          ${rel ? `<h2>Artículos relacionados</h2><div class="enc-rel">${rel}</div>` : ''}
          <div class="enc-pn">${prev ? `<a data-go="${prev.id}">← ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a data-go="${next.id}">${esc(next.title)} →</a>` : ''}</div>
        </div>
        <aside class="enc-aside">
          ${facts ? `<div class="enc-box"><div class="enc-box-h">Ficha</div>${this.block(facts, fi)}</div>` : ''}
          ${toc.length > 1 ? `<div class="enc-box enc-toc"><div class="enc-box-h">En este artículo</div>${toc.join('')}</div>` : ''}
        </aside>
      </div>
    </article>`;
  }

  /** URL de una imagen de Wikimedia Commons a un ancho dado */
  private imgUrl(file: string, w: number) { return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, '_'))}?width=${w}`; }
  private imgPage(file: string) { return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`; }
  private credit(r: ImgRef) {
    const parts = [r.credit, r.license].filter(Boolean).map((x) => esc(x!));
    return `<span class="enc-credit">${parts.join(' · ')}${parts.length ? ' · ' : ''}<a href="${this.imgPage(r.file)}" target="_blank" rel="noopener">Wikimedia Commons</a></span>`;
  }
  private figure(r: ImgRef, hero: boolean) {
    return `<figure class="enc-photo${hero ? ' hero' : ''}"><button type="button" class="enc-zoom" data-zoom="${esc(r.file)}" data-cap="${esc(r.caption)}" aria-label="Ampliar"><img loading="lazy" decoding="async" src="${this.imgUrl(r.file, hero ? 1600 : 1100)}" alt="${esc(r.caption)}" /></button><figcaption>${this.md(r.caption)} ${this.credit(r)}</figcaption></figure>`;
  }
  private gallery(items: ImgRef[]) {
    return `<div class="enc-gal">${items.map((r) => `<figure><button type="button" class="enc-zoom" data-zoom="${esc(r.file)}" data-cap="${esc(r.caption)}" aria-label="Ampliar"><img loading="lazy" decoding="async" src="${this.imgUrl(r.file, 700)}" alt="${esc(r.caption)}" /></button><figcaption>${this.md(r.caption)} ${this.credit(r)}</figcaption></figure>`).join('')}</div>`;
  }
  /** relato por pasos con navegación */
  private storyHtml(steps: Extract<Block, { t: 'step' }>[]) {
    const dots = steps.map((s, i) => `<button type="button" class="${i === 0 ? 'on' : ''}" data-step="${i}" title="${esc(s.title)}"><b>${esc(s.time)}</b></button>`).join('');
    const panes = steps.map((s, i) => `<section class="enc-step${i === 0 ? ' on' : ''}" data-i="${i}">
        ${s.file ? `<figure class="enc-photo"><button type="button" class="enc-zoom" data-zoom="${esc(s.file)}" data-cap="${esc(s.title)}"><img loading="lazy" src="${this.imgUrl(s.file, 1200)}" alt="${esc(s.title)}" /></button>${s.credit ? `<figcaption>${this.credit({ file: s.file, caption: '', credit: s.credit })}</figcaption>` : ''}</figure>` : ''}
        <div class="enc-step-t"><div class="enc-step-time">${esc(s.time)}</div><h3>${this.md(s.title)}</h3><p>${this.md(s.text)}</p>${s.sim ? `<button class="enc-sim" type="button" data-sim="${esc(s.sim)}"><span>▶</span>Verlo en el simulador</button>` : ''}</div>
      </section>`).join('');
    return `<div class="enc-story" data-n="${steps.length}"><div class="enc-story-bar">${dots}</div>${panes}<div class="enc-story-nav"><button type="button" data-step-d="-1">← Anterior</button><span class="enc-story-c">1 / ${steps.length}</span><button type="button" data-step-d="1">Siguiente →</button></div></div>`;
  }

  private block(b: Block, i: number): string {
    switch (b.t) {
      case 'p': return `<p>${this.md(b.text)}</p>`;
      case 'h': return `<h2>${this.md(b.text)}</h2>`;
      case 'list': { const tag = b.ordered ? 'ol' : 'ul'; return `<${tag}>${b.items.map((x) => `<li>${this.md(x)}</li>`).join('')}</${tag}>`; }
      case 'facts': return `<dl class="enc-facts">${b.rows.map(([k, v]) => `<dt>${this.md(k)}</dt><dd>${this.md(v)}</dd>`).join('')}</dl>`;
      case 'quote': return `<blockquote>${this.md(b.text)}<cite>${this.md(b.by)}</cite></blockquote>`;
      case 'note': return `<div class="enc-note">${this.md(b.text)}</div>`;
      case 'timeline': return `<ol class="enc-tl">${b.items.map((x) => `<li><b>${this.md(x.date)}</b><span>${this.md(x.text)}</span></li>`).join('')}</ol>`;
      case 'compare': return `<div class="enc-tw"><table><thead><tr>${b.head.map((x) => `<th>${this.md(x)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((x) => `<td>${this.md(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      case 'diagram': return `<figure class="enc-fig" data-diagram="${b.id}" data-i="${i}"><div class="enc-slot"></div>${b.caption ? `<figcaption>${this.md(b.caption)}</figcaption>` : ''}</figure>`;
      case 'model': return `<figure class="enc-fig enc-model" data-model="${b.id}" data-params='${esc(JSON.stringify(b.params ?? {})).replace(/'/g, '&#39;')}'><div class="enc-slot enc-mslot"><span>Modelo 3D · ${esc(b.params?.label ?? b.id)}</span></div>${b.caption ? `<figcaption>${this.md(b.caption)}</figcaption>` : ''}</figure>`;
      case 'sim': return `<button class="enc-sim" type="button" data-sim="${esc(b.preset)}"><span>▶</span>${esc(b.label ?? `Simular ${b.preset} en el mapa`)}</button>`;
      case 'img': return this.figure(b, !!b.wide);
      case 'gallery': return this.gallery(b.items);
      case 'math': return `<div class="enc-math"><div class="enc-f">${this.tex(b.f)}</div>${b.caption ? `<p class="enc-math-c">${this.md(b.caption)}</p>` : ''}${b.vars?.length ? `<dl>${b.vars.map(([k, v]) => `<dt>${this.tex(k)}</dt><dd>${this.md(v)}</dd>`).join('')}</dl>` : ''}</div>`;
      case 'sources': return `<ol class="enc-src">${b.items.map((x) => `<li>${this.md(x)}</li>`).join('')}</ol>`;
      case 'chart': return `<figure class="enc-fig enc-chart" data-chart="${b.id}"><div class="enc-slot"></div>${b.caption ? `<figcaption>${this.md(b.caption)}</figcaption>` : ''}</figure>`;
      case 'widget': return `<figure class="enc-fig enc-widget" data-widget="${b.id}"><div class="enc-slot"></div>${b.caption ? `<figcaption>${this.md(b.caption)}</figcaption>` : ''}</figure>`;
      case 'step': return this.storyHtml([b]);
    }
  }

  /** fórmulas: a^{2}, x_{0}, \frac{a}{b}, \sqrt{x} y letras griegas con \alpha, \Delta… */
  tex(s: string): string {
    const G: Record<string, string> = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', epsilon: 'ε', eta: 'η', theta: 'θ', lambda: 'λ', mu: 'μ', nu: 'ν', pi: 'π', rho: 'ρ', sigma: 'σ', Sigma: 'Σ', tau: 'τ', phi: 'φ', omega: 'ω', Omega: 'Ω', approx: '≈', int: '∫', times: '×', cdot: '·', propto: '∝', infty: '∞', le: '≤', ge: '≥', to: '→', pm: '±' };
    let h = esc(s);
    for (let k = 0; k < 4; k++) {
      h = h.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '<span class="fr"><span>$1</span><span>$2</span></span>')
        .replace(/\\sqrt\{([^{}]*)\}/g, '<span class="sq">√<span>$1</span></span>')
        .replace(/\^\{([^{}]*)\}/g, '<sup>$1</sup>').replace(/_\{([^{}]*)\}/g, '<sub>$1</sub>');
    }
    h = h.replace(/\^([A-Za-z0-9.,+−-]+)/g, '<sup>$1</sup>').replace(/_([A-Za-z0-9]+)/g, '<sub>$1</sub>');
    h = h.replace(/\\([A-Za-z]+)/g, (m, w: string) => G[w] ?? m);
    return h;
  }

  /** marcado mínimo: **negrita**, *cursiva* y [[id|texto]] */
  md(s: string): string {
    let h = esc(s);
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="enc-ext">$1</a>');
    h = h.replace(/\^\{([^{}]*)\}/g, '<sup>$1</sup>').replace(/_\{([^{}]*)\}/g, '<sub>$1</sub>');
    h = h.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_m, id: string, txt?: string) => {
      const a = this.byId.get(id);
      const label = txt ?? a?.title ?? id;
      return a ? `<a class="enc-link" data-go="${id}">${label}</a>` : label;
    });
    h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<i>$2</i>');
    return h;
  }

  // ---------------------------------------------------------------- esquemas y modelos
  private mountWidgets() {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const fig = e.target as HTMLElement;
        const slot = fig.querySelector('.enc-slot') as HTMLElement;
        const live = (fig as unknown as { _m?: Mounted })._m;
        if (e.isIntersecting && !live) {
          if (fig.dataset.chart || fig.dataset.widget) {
            const kind = fig.dataset.chart ? 'chart' : 'widget';
            if ((fig as unknown as { _l?: boolean })._l) continue;
            (fig as unknown as { _l?: boolean })._l = true;
            import('./widgets').then((w) => {
              if (!fig.isConnected) return;
              slot.innerHTML = '';
              const m = kind === 'chart' ? w.mountChart(fig.dataset.chart as never, slot) : w.mountWidget(fig.dataset.widget as never, slot);
              (fig as unknown as { _m?: Mounted })._m = m;
              this.mounted.push(m);
            });
          } else if (fig.dataset.diagram) {
            slot.innerHTML = '';
            const m = mountDiagram(fig.dataset.diagram as never, slot);
            (fig as unknown as { _m?: Mounted })._m = m;
            this.mounted.push(m);
          } else if (fig.dataset.model) {
            slot.classList.add('busy');
            import('./viewer/Viewer').then(({ ModelViewer }) => {
              if ((fig as unknown as { _m?: Mounted })._m || !fig.isConnected) return;
              slot.innerHTML = '';
              slot.classList.remove('busy');
              let params = {};
              try { params = JSON.parse(fig.dataset.params ?? '{}'); } catch { /* sin parámetros */ }
              const v = new ModelViewer(slot, fig.dataset.model as never, params);
              const m = { destroy: () => v.destroy() };
              (fig as unknown as { _m?: Mounted })._m = m;
              this.mounted.push(m);
            });
          }
        } else if (!e.isIntersecting && live && fig.dataset.model) {
          // libera el contexto WebGL de los modelos que quedan lejos de la vista
          live.destroy();
          (fig as unknown as { _m?: Mounted })._m = undefined;
          this.mounted = this.mounted.filter((x) => x !== live);
          slot.innerHTML = `<span>Modelo 3D</span>`;
        }
      }
    }, { root: this.main, rootMargin: '400px 0px' });
    this.main.querySelectorAll('.enc-fig').forEach((f) => io.observe(f));
    this.observers.push(io);
  }

  /** foto a pantalla completa */
  private lightbox(file: string, cap: string) {
    const box = document.createElement('div');
    box.className = 'enc-lb';
    box.innerHTML = `<img src="${this.imgUrl(file, 2400)}" alt="${esc(cap)}" /><div class="enc-lb-c">${esc(cap)} · <a href="${this.imgPage(file)}" target="_blank" rel="noopener">ver en Wikimedia Commons</a></div><button type="button" class="enc-lb-x" title="Cerrar">✕</button>`;
    const close = () => { box.remove(); window.removeEventListener('keydown', key, true); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } };
    box.addEventListener('click', (e) => { if (!(e.target as HTMLElement).closest('a')) close(); });
    window.addEventListener('keydown', key, true);
    this.el.append(box);
  }

  private unmountAll() {
    for (const o of this.observers) o.disconnect();
    this.observers = [];
    for (const m of this.mounted) m.destroy();
    this.mounted = [];
  }
}

export const BOOK_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="miter"><path d="M12 6.5C10 5 7 4.5 3 4.5v13c4 0 7 .5 9 2 2-1.5 5-2 9-2v-13c-4 0-7 .5-9 2z"/><path d="M12 6.5v13"/></svg>';
