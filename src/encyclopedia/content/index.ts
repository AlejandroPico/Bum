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
import { ARTICLES as nuevosE } from './nuevos-efectos';
import { ARTICLES as nuevosO } from './nuevos-otros';
export { GLOSSARY } from './glosario';
import { EXTRA } from './extra';
import { EXTRA2 } from './extra-2';
import { EXTRA3 } from './extra-3';

export const ALL_ARTICLES: Article[] = [...fund, ...tipos, ...hist, ...relatos, ...efec, ...acc, ...cosmos, ...nuevosE, ...nuevosO, ...catN, ...catO];

for (const ex of [EXTRA, EXTRA2, EXTRA3]) for (const a of ALL_ARTICLES) {
  const x = ex[a.id];
  if (!x) continue;
  let i = a.blocks.length;
  while (i > 0 && a.blocks[i - 1].t === 'sim') i--;
  a.blocks.splice(i, 0, ...x.blocks);
  if (x.related) a.related = [...new Set([...(a.related ?? []), ...x.related])];
}
import { IMAGES } from './media';
import { VIDEOS } from './videos';
import { IMAGES_EXTRA, VIDEOS_EXTRA } from './media-extra';
for (const [id, l] of Object.entries(IMAGES_EXTRA)) IMAGES[id] = [...(IMAGES[id] ?? []), ...l.filter((x) => !(IMAGES[id] ?? []).some((y) => y.file === x.file))];
for (const [id, l] of Object.entries(VIDEOS_EXTRA)) VIDEOS[id] = [...(VIDEOS[id] ?? []), ...l];
export { IMAGES, VIDEOS };
export { MATH } from './math';
export { SOURCES } from './sources';
