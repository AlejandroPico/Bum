/**
 * Enciclopedia de Bum: tipos de contenido.
 *
 * Cada artículo es una lista de bloques. El texto de los bloques admite un marcado mínimo:
 *   **negrita**, *cursiva* y enlaces internos [[id-del-articulo|texto visible]] (o [[id]]).
 *
 * Nivel del contenido: divulgativo / de museo. Se explica qué es cada cosa, cómo funciona en
 * términos generales, sus partes principales tal como se han mostrado públicamente y su historia.
 * Nunca cantidades de material, dimensiones de componentes internos ni parámetros de diseño.
 */

export type CatId = 'fund' | 'tipos' | 'hist' | 'efec' | 'acc' | 'cosmos' | 'cat';

export const CATEGORIES: { id: CatId; name: string; desc: string }[] = [
  { id: 'fund', name: 'Fundamentos', desc: 'Átomos, radiactividad, fisión, fusión y energía.' },
  { id: 'tipos', name: 'Tipos de armas', desc: 'Cómo funcionan las armas de fisión, termonucleares y convencionales, y sus vectores.' },
  { id: 'hist', name: 'Historia', desc: 'Del descubrimiento de la fisión a los arsenales actuales.' },
  { id: 'efec', name: 'Efectos', desc: 'Bola de fuego, onda expansiva, calor, radiación, lluvia radiactiva y clima.' },
  { id: 'acc', name: 'Accidentes y desastres', desc: 'Accidentes nucleares, incidentes con armas y grandes explosiones.' },
  { id: 'cosmos', name: 'Impactos cósmicos', desc: 'Asteroides, cometas y defensa planetaria.' },
  { id: 'cat', name: 'Catálogo', desc: 'Ficha de cada arma, prueba y explosión del simulador.' },
];

/** modelos 3D disponibles en el visor */
export type ModelId =
  | 'littleboy'   // Little Boy (cañón)
  | 'fatman'      // Fat Man (implosión)
  | 'gadget'      // dispositivo Trinity (implosión, sin carcasa) sobre su torre
  | 'staged'      // esquema conceptual de un arma de dos etapas (primario + secundario)
  | 'sausage'     // dispositivo Ivy Mike
  | 'bomb'        // bomba de caída libre genérica (paramétrica)
  | 'rv'          // vehículo de reentrada (ojiva de misil) genérico
  | 'missile'     // misil balístico genérico (paramétrico)
  | 'cruise'      // misil de crucero genérico
  | 'torpedo'     // torpedo / dron submarino genérico
  | 'shell'       // proyectil de artillería / Davy Crockett
  | 'conventional'; // bomba convencional de gran tamaño (MOAB, GBU-57…)

/** parámetros de los modelos genéricos (todas las medidas EXTERIORES y públicas, en metros) */
export interface ModelParams {
  /** longitud total */
  L?: number;
  /** diámetro */
  D?: number;
  /** relleno interior conceptual */
  inner?: 'fission' | 'staged' | 'chemical' | 'none';
  /** número de etapas (misiles) */
  stages?: number;
  /** número de ojivas en el bus (misiles MIRV) */
  warheads?: number;
  /** aletas: cruz, anillo, rejilla o ninguna */
  fins?: 'cross' | 'ring' | 'grid' | 'none';
  /** color de la carcasa (hex) */
  color?: string;
  /** texto corto que se muestra en el visor (p. ej. "B83") */
  label?: string;
}

/** esquemas animados disponibles */
export type DiagramId =
  | 'atom'          // estructura del átomo: núcleo (protones, neutrones) y electrones
  | 'isotopes'      // U-235 / U-238 / Pu-239: mismos protones, distintos neutrones
  | 'decay'         // desintegración alfa, beta y gamma; semivida
  | 'fission'       // neutrón + U-235 → fragmentos + neutrones + energía
  | 'chain'         // reacción en cadena que se multiplica por generaciones
  | 'critical'      // subcrítico (los neutrones escapan) frente a supercrítico (cualitativo)
  | 'fusion'        // deuterio + tritio → helio + neutrón + energía
  | 'gun'           // principio de cañón: dos piezas subcríticas que se unen
  | 'implosion'     // principio de implosión: compresión simétrica de una esfera
  | 'staged'        // dos etapas: el primario emite radiación que comprime el secundario (conceptual)
  | 'fireball'      // fases de la bola de fuego (destello, expansión, ascenso, hongo)
  | 'blast'         // onda expansiva: sobrepresión, viento, onda de Mach en explosiones aéreas
  | 'thermal'       // pulso térmico y alcance de las quemaduras
  | 'fallout'       // nube, partículas que caen con el viento y regla del 7-10
  | 'emp'           // pulso electromagnético de gran altitud
  | 'impact';       // entrada de un asteroide: fricción, fragmentación, explosión aérea o cráter

export type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }
  | { t: 'list'; items: string[]; ordered?: boolean }
  | { t: 'facts'; rows: [string, string][] }
  | { t: 'quote'; text: string; by: string }
  | { t: 'note'; text: string }
  | { t: 'timeline'; items: { date: string; text: string }[] }
  | { t: 'model'; id: ModelId; params?: ModelParams; caption?: string }
  | { t: 'diagram'; id: DiagramId; caption?: string }
  | { t: 'compare'; head: string[]; rows: string[][] }
  /** botón "Simular en el mapa" con el nombre EXACTO de un preset del simulador */
  | { t: 'sim'; preset: string; label?: string };

export interface Article {
  /** identificador único en minúsculas con guiones (p. ej. "proyecto-manhattan") */
  id: string;
  title: string;
  cat: CatId;
  /** una o dos frases que aparecen en el índice y en la cabecera */
  summary: string;
  /** palabras clave para la búsqueda */
  tags?: string[];
  blocks: Block[];
  /** ids de artículos relacionados */
  related?: string[];
  /** orden dentro de la categoría (menor primero) */
  order?: number;
}

export interface GlossaryTerm {
  term: string;
  def: string;
  /** artículo donde se explica en detalle */
  see?: string;
}
