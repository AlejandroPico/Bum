import type { Article } from '../types';
import { ARTICLES as fund } from './fundamentos';
import { ARTICLES as tipos } from './tipos';
import { ARTICLES as hist } from './historia';
import { ARTICLES as relatos } from './relatos';
import { ARTICLES as efec } from './efectos';
import { ARTICLES as acc } from './accidentes';
import { ARTICLES as cosmos } from './cosmos';
import { ARTICLES as catN } from './catalogo-nuclear';
import { ARTICLES as catO } from './catalogo-otros';
export { GLOSSARY } from './glosario';
import { EXTRA } from './extra';

export const ALL_ARTICLES: Article[] = [...fund, ...tipos, ...hist, ...relatos, ...efec, ...acc, ...cosmos, ...catN, ...catO];

for (const a of ALL_ARTICLES) {
  const x = EXTRA[a.id];
  if (!x) continue;
  let i = a.blocks.length;
  while (i > 0 && a.blocks[i - 1].t === 'sim') i--;
  a.blocks.splice(i, 0, ...x.blocks);
  if (x.related) a.related = [...new Set([...(a.related ?? []), ...x.related])];
}
export { IMAGES } from './media';
export { VIDEOS } from './videos';
export { MATH } from './math';
export { SOURCES } from './sources';
