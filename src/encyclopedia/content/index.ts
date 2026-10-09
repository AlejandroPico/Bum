import type { Article } from '../types';
import { ARTICLES as fund } from './fundamentos';
import { ARTICLES as tipos } from './tipos';
import { ARTICLES as hist } from './historia';
import { ARTICLES as efec } from './efectos';
import { ARTICLES as acc } from './accidentes';
import { ARTICLES as cosmos } from './cosmos';
import { ARTICLES as catN } from './catalogo-nuclear';
import { ARTICLES as catO } from './catalogo-otros';
export { GLOSSARY } from './glosario';

export const ALL_ARTICLES: Article[] = [...fund, ...tipos, ...hist, ...efec, ...acc, ...cosmos, ...catN, ...catO];
