import type { Block } from '../types';

/**
 * Sección «Las matemáticas» de los artículos: fórmulas públicas de física nuclear, de los efectos
 * de las explosiones y de los impactos, con su explicación. Son leyes generales y de escala que
 * aparecen en libros de texto y en Glasstone & Dolan; no hay parámetros de diseño de armas.
 *
 * Marcado de fórmulas: a^{2}, x_{0}, \frac{a}{b}, \sqrt{x}, letras griegas \lambda, \Delta…
 */
export const MATH: Record<string, Block[]> = {
  atomo: [
    { t: 'p', text: 'El tamaño del núcleo crece con el número de nucleones *A*: su volumen es proporcional a *A*, como si los protones y neutrones fueran canicas apretadas. El radio del átomo, en cambio, es casi el mismo para todos los elementos (unos 0,1 nanómetros), unas 100 000 veces mayor que el núcleo.' },
    { t: 'math', f: 'R \\approx r_{0} · A^{1/3}', caption: 'Radio aproximado de un núcleo atómico.', vars: [['R', 'radio del núcleo'], ['r_{0}', '≈ 1,2 femtómetros (1 fm = 10^{−15} m)'], ['A', 'número másico: protones + neutrones']] },
    { t: 'p', text: 'Para el uranio-238, *R* ≈ 1,2 · 238^{1/3} ≈ 7,4 fm. Si el núcleo midiera 1 cm, el átomo entero tendría casi un kilómetro de diámetro.' },
    { t: 'math', f: '\\Delta m = Z · m_{p} + N · m_{n} − M_{núcleo}', caption: 'Defecto de masa: el núcleo pesa menos que sus piezas por separado; esa diferencia es la energía que las mantiene unidas.', vars: [['Z', 'número de protones'], ['N', 'número de neutrones'], ['m_{p}, m_{n}', 'masas del protón y del neutrón']] },
  ],
  isotopos: [
    { t: 'math', f: '^{A}_{Z}X  →  ^{235}_{92}U , ^{238}_{92}U , ^{239}_{94}Pu', caption: 'Notación de los isótopos: arriba el número másico, abajo el número atómico.', vars: [['A', 'protones + neutrones'], ['Z', 'protones (define el elemento)']] },
    { t: 'p', text: 'El uranio natural es un 99,27 % de uranio-238 y un 0,72 % de uranio-235. Como los dos isótopos son químicamente idénticos, sólo se pueden separar aprovechando su pequeñísima diferencia de masa (algo más de un 1 %), lo que explica las enormes plantas de enriquecimiento del Proyecto Manhattan.' },
    { t: 'math', f: '\\frac{v_{235}}{v_{238}} = \\sqrt{\\frac{m_{238}}{m_{235}}} \\approx 1,0043', caption: 'Ley de Graham: en un gas, las moléculas más ligeras se mueven algo más deprisa. En la difusión gaseosa del hexafluoruro de uranio la ventaja es de sólo un 0,43 % por etapa, por eso hacían falta miles de etapas en cascada.' },
  ],
  radiactividad: [
    { t: 'p', text: 'La desintegración radiactiva es un proceso al azar: cada núcleo tiene la misma probabilidad de desintegrarse en cada instante, sin memoria de su pasado. De ahí sale una ley exponencial.' },
    { t: 'math', f: 'N(t) = N_{0} · e^{−\\lambda t} = N_{0} · (\\frac{1}{2})^{t / T_{1/2}}', caption: 'Ley de desintegración radiactiva.', vars: [['N_{0}', 'núcleos al principio'], ['\\lambda', 'constante de desintegración'], ['T_{1/2}', 'semivida = ln 2 / λ']] },
    { t: 'math', f: 'A = \\lambda N  (becquerelios: desintegraciones por segundo)', caption: 'Actividad: cuantos más núcleos y más corta su semivida, más radiactiva es una muestra.' },
    { t: 'p', text: 'Ejemplo: el cesio-137 tiene una semivida de 30,2 años. Después de 10 semividas (302 años) queda 1/1024 de la cantidad inicial, una milésima parte; por eso las zonas contaminadas en Chernóbil seguirán vigiladas durante siglos. El yodo-131, con 8 días de semivida, prácticamente desaparece en tres meses.' },
  ],
  fision: [
    { t: 'p', text: 'En cada fisión de un núcleo de uranio-235 se liberan unos 200 MeV (megaelectronvoltios), unas 50 millones de veces más que en la combustión de una molécula de gasolina. La energía viene de la pequeña diferencia de masa entre el núcleo inicial y los fragmentos.' },
    { t: 'math', f: 'E = \\Delta m · c^{2}', caption: 'La equivalencia entre masa y energía de Einstein.', vars: [['\\Delta m', 'masa que «desaparece» en la reacción'], ['c', 'velocidad de la luz, 299 792 458 m/s']] },
    { t: 'math', f: 'n + ^{235}U → ^{141}Ba + ^{92}Kr + 3n + ≈ 200 MeV', caption: 'Una de las muchas formas en que se puede romper el uranio-235.' },
    { t: 'math', f: '1 kt = 4,184 · 10^{12} J  ≈ 1,45 · 10^{23} fisiones  ≈ 57 g de material fisionado', caption: 'Equivalencias de la escala de las armas: en una explosión de 1 kilotón se fisionan unos 57 gramos de uranio o plutonio, aunque el arma contenga mucho más material, que en gran parte no llega a reaccionar.' },
    { t: 'p', text: 'De esos 200 MeV, unos 168 MeV se los llevan los fragmentos en forma de energía de movimiento (que se convierte en calor), unos 5 MeV los neutrones, unos 7 MeV los rayos gamma inmediatos y el resto se libera después, poco a poco, con la desintegración de los fragmentos radiactivos: es la energía de la lluvia radiactiva.' },
  ],
  'reaccion-en-cadena': [
    { t: 'p', text: 'Si cada fisión provoca, de media, *k* nuevas fisiones, la población de neutrones se multiplica por *k* en cada «generación». El factor *k* decide todo: por debajo de 1 la reacción se apaga, igual a 1 se mantiene (un reactor) y por encima de 1 crece exponencialmente.' },
    { t: 'math', f: 'N_{n} = N_{0} · k^{n}', caption: 'Neutrones en la generación n.', vars: [['k', 'factor de multiplicación'], ['n', 'número de generaciones']] },
    { t: 'math', f: '2^{80} \\approx 1,2 · 10^{24}', caption: 'Con k = 2, en unas 80 generaciones se alcanzan las fisiones de una explosión de decenas de kilotones. Cada generación dura unos 10 nanosegundos («shake»), así que toda la reacción sucede en menos de una millonésima de segundo.' },
    { t: 'p', text: 'Esa es la razón de que la reacción en cadena de un arma sea tan violenta y a la vez tan difícil de conseguir: el material se expande por el propio calor en una fracción de microsegundo y la reacción se detiene, por lo que sólo una pequeña parte llega a fisionarse.' },
  ],
  'masa-critica': [
    { t: 'p', text: 'Que una pieza de material fisible sea crítica depende del equilibrio entre los neutrones que nacen en su interior (proporcional al volumen) y los que escapan por la superficie (proporcional al área). Al crecer el tamaño, el volumen aumenta más deprisa que la superficie, y llega un punto en que se generan más neutrones de los que escapan.' },
    { t: 'math', f: '\\frac{superficie}{volumen} = \\frac{4\\pi r^{2}}{\\frac{4}{3}\\pi r^{3}} = \\frac{3}{r}', caption: 'Para una esfera, la proporción de superficie por la que escapan los neutrones disminuye al aumentar el radio.' },
    { t: 'p', text: 'Por la misma razón, comprimir el material (aumentar su densidad) reduce la distancia media que recorre un neutrón antes de chocar con otro núcleo, y la masa necesaria para la criticidad disminuye aproximadamente con el cuadrado de la densidad. Ese es el principio de la [[implosion|implosión]].' },
    { t: 'math', f: 'M_{c} \\propto \\frac{1}{\\rho^{2}}', caption: 'Dependencia cualitativa de la masa crítica con la densidad.' },
  ],
  fusion: [
    { t: 'math', f: '^{2}H + ^{3}H → ^{4}He (3,5 MeV) + n (14,1 MeV)', caption: 'Fusión de deuterio y tritio: 17,6 MeV por reacción, la mayor parte en el neutrón.' },
    { t: 'math', f: 'n + ^{6}Li → ^{3}H + ^{4}He + 4,8 MeV', caption: 'El litio-6 produce tritio cuando absorbe un neutrón; por eso el deuteruro de litio sirve de combustible sólido.' },
    { t: 'p', text: 'Para que dos núcleos se fusionen hay que vencer su repulsión eléctrica, y eso sólo ocurre a temperaturas de decenas de millones de grados. La condición de que la fusión produzca más energía de la que se pierde se resume en el criterio de Lawson:' },
    { t: 'math', f: 'n · \\tau · T > 3 · 10^{21} keV · s / m^{3}', caption: 'Criterio de Lawson (triple producto) para la mezcla de deuterio y tritio.', vars: [['n', 'densidad de núcleos'], ['\\tau', 'tiempo de confinamiento'], ['T', 'temperatura']] },
    { t: 'p', text: 'Por masa, la fusión libera unas cuatro veces más energía que la fisión: unos 80 kilotones por kilogramo de mezcla de deuterio y tritio frente a unos 17 kilotones por kilogramo de uranio-235 fisionado por completo.' },
  ],
  'energia-y-tnt': [
    { t: 'math', f: '1 t TNT = 4,184 · 10^{9} J   ·   1 kt = 4,184 · 10^{12} J   ·   1 Mt = 4,184 · 10^{15} J', caption: 'La tonelada de TNT es una unidad convencional de energía (una tonelada real de TNT libera algo menos).' },
    { t: 'math', f: 'E = m c^{2}  ⇒  1 g → 9 · 10^{13} J \\approx 21,5 kt', caption: 'Un solo gramo de masa convertido íntegramente en energía equivale a unos 21 kilotones, más que la bomba de Hiroshima, en la que se convirtió en energía menos de un gramo de materia.' },
    { t: 'math', f: 'E_{cinética} = \\frac{1}{2} m v^{2}', caption: 'La energía de un asteroide: por su enorme velocidad (decenas de km/s), una roca de 50 metros lleva la energía de varios megatones.' },
    { t: 'p', text: 'Comparaciones útiles: un rayo libera unos mil millones de julios (0,25 t de TNT); un terremoto de magnitud 7, unos 2 · 10^{15} J (≈ 0,5 Mt); el consumo mundial de energía de un año, unos 6 · 10^{20} J (≈ 140 000 Mt).' },
    { t: 'widget', id: 'energy', caption: 'Convierte cualquier energía entre unidades y compárala con explosiones conocidas.' },
  ],
  'unidades-de-radiacion': [
    { t: 'math', f: '1 Gy = 1 J/kg   ·   1 Sv = 1 Gy × w_{R} × w_{T}', caption: 'Dosis absorbida (gray) y dosis equivalente/efectiva (sievert).', vars: [['w_{R}', 'factor de ponderación de la radiación: 1 para gamma y beta, hasta 20 para alfa'], ['w_{T}', 'factor de ponderación del tejido (dosis efectiva)']] },
    { t: 'math', f: '1 rad = 0,01 Gy   ·   1 rem = 0,01 Sv   ·   1 R (roentgen) \\approx 0,0096 Gy en tejido', caption: 'Equivalencias con las unidades antiguas, que siguen apareciendo en los textos sobre armas nucleares.' },
    { t: 'p', text: 'Una radiografía de tórax supone unos 0,02 mSv; la radiación natural de fondo, unos 2,4 mSv al año; el límite anual para trabajadores expuestos es de 20 mSv; una dosis de 4–5 Sv recibida de golpe mata a la mitad de las personas sin tratamiento médico.' },
  ],
  'bola-de-fuego': [
    { t: 'p', text: 'Las dimensiones de la bola de fuego crecen con la potencia, pero mucho más despacio que ella: para tener una bola diez veces mayor hace falta una explosión unas 300 veces más potente.' },
    { t: 'math', f: 'R_{máx} \\approx 70 m · Y^{0,4}', caption: 'Radio máximo aproximado de la bola de fuego de una explosión aérea (la que usa el simulador; en superficie es algo mayor).', vars: [['Y', 'potencia en kilotones']] },
    { t: 'math', f: 't_{máx} \\approx 0,032 s · Y^{0,5}', caption: 'Momento del segundo máximo de luz, cuando se libera la mayor parte del calor.' },
    { t: 'p', text: 'Ejemplos: 15 kt (Hiroshima) → unos 200 m de radio; 1 Mt → unos 1100 m; 50 Mt (Tsar Bomba) → unos 4,8 km. La bola de fuego de la Tsar Bomba casi tocó el suelo a pesar de estallar a 4 km de altura.' },
  ],
  'onda-expansiva': [
    { t: 'p', text: 'La onda expansiva cumple la **ley de escala de la raíz cúbica**: las distancias a las que se produce una misma sobrepresión crecen con la raíz cúbica de la energía. Una bomba ocho veces más potente sólo duplica el alcance de cada efecto (y multiplica por cuatro la superficie dañada).' },
    { t: 'math', f: '\\frac{R}{R_{1}} = (\\frac{Y}{1 kt})^{1/3}', caption: 'Ley de Hopkinson-Cranz (escala de la raíz cúbica).', vars: [['R_{1}', 'distancia a la que una explosión de 1 kt produce esa sobrepresión'], ['Y', 'potencia en kilotones']] },
    { t: 'math', f: '\\Delta p(r) \\approx \\frac{P_{X} R_{X}}{4 r} (1 + 3 (\\frac{R_{X}}{r})^{1,3})', caption: 'Ajuste de la sobrepresión de una explosión de 1 kt en superficie (forma de Collins y otros, 2005), con P_{X} ≈ 75 kPa y R_{X} ≈ 290 m; para otras potencias se usa r / Y^{1/3}.' },
    { t: 'math', f: 'u = \\frac{5 \\Delta p}{7 P_{0}} · \\frac{c_{0}}{\\sqrt{1 + 6\\Delta p / 7P_{0}}}', caption: 'Velocidad máxima del viento tras el frente de choque (relaciones de Rankine-Hugoniot para el aire).', vars: [['P_{0}', 'presión atmosférica (101,3 kPa)'], ['c_{0}', 'velocidad del sonido (≈ 340 m/s)']] },
    { t: 'widget', id: 'scaling', caption: 'Mueve la potencia y mira cómo crecen los radios de cada efecto según las leyes de escala.' },
  ],
  'radiacion-termica': [
    { t: 'p', text: 'Entre un tercio y algo más de la energía de una explosión aérea sale como radiación térmica. Como la luz de una bombilla, se reparte sobre la superficie de una esfera cada vez mayor y además la atmósfera absorbe una parte por el camino.' },
    { t: 'math', f: 'Q = \\frac{f · E · \\tau}{4 \\pi R^{2}}', caption: 'Energía térmica que llega por unidad de superficie (fluencia).', vars: [['f', 'fracción térmica (≈ 0,35 en el aire)'], ['E', 'energía total'], ['\\tau', 'transmisión de la atmósfera, que depende de la visibilidad'], ['R', 'distancia']] },
    { t: 'p', text: 'Las quemaduras de tercer grado requieren unos 8–10 cal/cm² para una explosión de 1 kt, pero algo más para las grandes, porque su pulso térmico dura más y la piel tiene tiempo de disipar parte del calor.' },
    { t: 'widget', id: 'distance', caption: '¿Qué llega a cada distancia? Elige la potencia y la distancia.' },
  ],
  'radiacion-inicial': [
    { t: 'math', f: 'D(R) \\propto \\frac{e^{−R/\\lambda}}{R^{2}}', caption: 'La dosis de la radiación inicial cae con el cuadrado de la distancia y, además, exponencialmente por la absorción del aire.', vars: [['\\lambda', 'longitud de atenuación en el aire (varios cientos de metros para neutrones y rayos gamma de alta energía)']] },
    { t: 'p', text: 'Por esa atenuación exponencial, en las bombas grandes la radiación inicial queda dentro de la zona destruida por la onda y el calor, mientras que en las pequeñas (o en la «bomba de neutrones») es el efecto de mayor alcance.' },
  ],
  'lluvia-radiactiva': [
    { t: 'p', text: 'La radiactividad de la mezcla de productos de fisión disminuye con el tiempo siguiendo una ley potencial descubierta por Katharine Way y Eugene Wigner en 1948:' },
    { t: 'math', f: 'R(t) = R_{1} · t^{−1,2}', caption: 'Tasa de dosis de la lluvia radiactiva t horas después de la explosión.', vars: [['R_{1}', 'tasa de dosis una hora después (H+1)'], ['t', 'horas desde la explosión']] },
    { t: 'p', text: 'De ahí sale la **regla del 7-10**: por cada multiplicación por 7 del tiempo, la tasa de dosis se divide por 10. A las 7 horas queda un 10 %; a las 49 horas (unos 2 días), un 1 %; a las 2 semanas, un 0,1 %.' },
    { t: 'math', f: 'D(t_{1}, t_{2}) = \\int_{t_{1}}^{t_{2}} R_{1} t^{−1,2} dt = 5 R_{1} (t_{1}^{−0,2} − t_{2}^{−0,2})', caption: 'Dosis acumulada entre dos instantes. Es la fórmula que usa la calculadora de refugio del simulador.' },
    { t: 'widget', id: 'decay', caption: 'Calcula la tasa de dosis y la dosis acumulada a medida que pasan las horas.' },
  ],
  'pulso-electromagnetico': [
    { t: 'p', text: 'En una explosión a gran altura, los rayos gamma arrancan electrones de las moléculas del aire (efecto Compton) a unos 20–40 km de altura. El campo magnético de la Tierra los hace girar, y esos electrones en giro emiten un pulso de radio muy intenso que llega a todo el horizonte visible desde el punto de la explosión.' },
    { t: 'math', f: 'R_{horizonte} = \\sqrt{2 R_{T} h + h^{2}}', caption: 'Distancia al horizonte desde la altura de la explosión: el pulso E1 cubre todo ese círculo.', vars: [['R_{T}', 'radio de la Tierra (6371 km)'], ['h', 'altura de la explosión']] },
    { t: 'p', text: 'A 400 km de altura (Starfish Prime) el horizonte está a unos 2300 km. El campo máximo, de unas decenas de kilovoltios por metro, no depende mucho de la potencia porque la ionización del aire lo «satura».' },
  ],
  'invierno-nuclear': [
    { t: 'p', text: 'Los modelos de clima estiman el enfriamiento a partir de la cantidad de hollín que el fuego de las ciudades inyecta en la estratosfera, donde no lo lava la lluvia y puede permanecer años.' },
    { t: 'math', f: '\\Delta T_{global} \\approx −1 °C (5 Tg) · −4 °C (37 Tg) · −8 °C (150 Tg)', caption: 'Enfriamiento medio de la superficie terrestre en los primeros años según la cantidad de hollín (en teragramos, millones de toneladas), según Toon, Robock y otros (2019) y Xia y otros (2022).' },
    { t: 'p', text: 'Un intercambio entre India y Pakistán con un centenar de bombas podría inyectar entre 5 y 47 Tg de hollín; una guerra total entre Estados Unidos y Rusia, unos 150 Tg, suficiente para provocar hambrunas que matarían a la mayor parte de la población mundial.' },
  ],
  'explosiones-aereas-y-de-superficie': [
    { t: 'p', text: 'Cuando la onda de choque se refleja en el suelo, la onda reflejada viaja por el aire ya comprimido y caliente, y alcanza a la onda directa formando un frente único, el «pie de Mach», con una presión mucho mayor. Hay una altura óptima para cada nivel de sobrepresión que se quiere maximizar, y también sigue la escala de la raíz cúbica:' },
    { t: 'math', f: 'h_{óptima}(Y) = h_{óptima}(1 kt) · Y^{1/3}', caption: 'Altura de explosión que maximiza el alcance de una sobrepresión dada.' },
    { t: 'p', text: 'Para maximizar el alcance de 5 psi (daño grave a la mayoría de los edificios) la altura óptima de 1 kt es de unos 200–220 m, de modo que para 1 Mt es de unos 2 km. Hiroshima y Nagasaki estallaron a unos 580 y 500 m.' },
  ],
  'efectos-en-la-salud': [
    { t: 'p', text: 'Para los efectos tardíos (cáncer), la protección radiológica usa el modelo lineal sin umbral: el riesgo es proporcional a la dosis, por pequeña que sea. Es una hipótesis prudente; a dosis muy bajas el riesgo es demasiado pequeño para medirlo.' },
    { t: 'math', f: 'riesgo \\approx 5 \\% por Sv  ⇒  casos \\approx 0,05 × dosis colectiva (persona·Sv)', caption: 'Coeficiente de riesgo de la ICRP (Publicación 103). Es el que usa el simulador para estimar los cánceres a largo plazo.' },
    { t: 'math', f: 'DL_{50/60} \\approx 4–5 Gy', caption: 'Dosis que mata a la mitad de las personas expuestas en 60 días sin tratamiento; con cuidados médicos intensivos puede subir a unos 6–7 Gy.' },
  ],
  'proteccion-civil': [
    { t: 'math', f: 'D_{interior} = \\frac{D_{exterior}}{FP}', caption: 'Factor de protección (FP) de un refugio: cuántas veces reduce la dosis respecto a estar al aire libre.' },
    { t: 'p', text: 'Valores orientativos: coche ≈ 1,5; casa de madera ≈ 3; planta baja de un edificio de ladrillo ≈ 10; sótano ≈ 40; centro de un gran edificio de hormigón ≈ 200; refugio subterráneo ≈ 1000 o más. Cada 10 cm de hormigón reducen a la mitad la radiación gamma de la lluvia radiactiva.' },
  ],
  'nube-de-hongo': [
    { t: 'p', text: 'La bola de fuego sube como un globo caliente. Su velocidad de ascenso y la altura final dependen de la energía y de la estabilidad de la atmósfera; para explosiones grandes, la nube atraviesa la tropopausa y se aplana en la estratosfera.' },
    { t: 'math', f: 'H_{cima} \\approx 4 km (1 kt) · 12 km (20 kt) · 19 km (1 Mt) · 37 km (10 Mt)', caption: 'Altura aproximada de la cima de la nube, según los gráficos de Glasstone & Dolan (figura 2.16). La relación no es una ley sencilla porque cambia al cruzar la tropopausa.' },
  ],
  'asteroides-y-cometas': [
    { t: 'math', f: 'E = \\frac{1}{2} \\rho \\frac{\\pi D^{3}}{6} v^{2}', caption: 'Energía de un impacto a partir del diámetro, la densidad y la velocidad.', vars: [['\\rho', 'densidad (≈ 3000 kg/m³ para roca, 7800 para hierro, 600–1000 para un cometa)'], ['D', 'diámetro'], ['v', 'velocidad (11–72 km/s)']] },
    { t: 'math', f: 'N(> E) \\approx 3,7 · E^{−0,9}  impactos al año (E en kt)', caption: 'Frecuencia de los objetos que explotan en la atmósfera terrestre con una energía mayor que E (Brown y otros, 2002). Un evento de 10 Mt, como Tunguska, ocurre más o menos una vez cada mil años.' },
    { t: 'widget', id: 'asteroid', caption: 'Calcula la energía de un impacto y cada cuánto tiempo ocurre uno así.' },
  ],
  chicxulub: [
    { t: 'math', f: 'D_{cráter} \\approx 1,16 (\\frac{\\rho_{i}}{\\rho_{t}})^{1/3} L^{0,78} v^{0,44} g^{−0,22} sin^{1/3}\\theta', caption: 'Diámetro del cráter transitorio (Collins y otros, 2005, a partir de los experimentos de Holsapple y Schmidt). El cráter final de los impactos grandes es casi el doble.', vars: [['\\rho_{i}, \\rho_{t}', 'densidad del objeto y del terreno'], ['L', 'diámetro del objeto'], ['v', 'velocidad'], ['g', 'gravedad'], ['\\theta', 'ángulo de entrada']] },
    { t: 'p', text: 'Con un objeto de unos 10 km a 20 km/s se obtiene un cráter transitorio de unos 90–100 km y uno final de unos 180 km, como el que está enterrado bajo la península de Yucatán.' },
  ],
  'meteor-crater': [
    { t: 'math', f: 'M_{sísmica} \\approx 0,67 log_{10}(E) − 5,87', caption: 'Magnitud del terremoto que provoca un impacto (E en julios, eficiencia sísmica de una diezmilésima; Collins y otros, 2005).' },
  ],
  'defensa-planetaria': [
    { t: 'math', f: '\\Delta v = \\beta \\frac{m_{i} v_{i}}{M}', caption: 'Cambio de velocidad de un asteroide golpeado por un impactador cinético.', vars: [['\\beta', 'factor de multiplicación del impulso por el material expulsado (≈ 3,6 medido en DART)'], ['m_{i}, v_{i}', 'masa y velocidad del impactador'], ['M', 'masa del asteroide']] },
    { t: 'math', f: '\\Delta x \\approx 3 · \\Delta v · t', caption: 'Desplazamiento a lo largo de la órbita al cabo de un tiempo t: el pequeño empujón cambia el periodo orbital y el error se acumula vuelta a vuelta. Con décadas de antelación basta con unos centímetros por segundo.' },
  ],
  'escalas-de-riesgo': [
    { t: 'math', f: 'PS = log_{10} \\frac{p_{i}}{f_{B} · \\Delta T}', caption: 'Escala de Palermo: compara la probabilidad de un impacto con el riesgo de fondo de objetos de esa energía durante el mismo tiempo.', vars: [['p_{i}', 'probabilidad del impacto'], ['f_{B} = 0,03 · E^{−0,8}', 'frecuencia anual de fondo (E en megatones)'], ['\\Delta T', 'años que faltan para el posible impacto']] },
    { t: 'p', text: 'Un valor de −2 significa un riesgo cien veces menor que el de fondo; 0, igual al de fondo; valores positivos indican una situación que merece mucha atención. Ningún objeto conocido supera hoy el 0.' },
  ],
  tunguska: [
    { t: 'math', f: 'E \\approx 3–15 Mt  ⇒  D \\approx 50–60 m (roca, 15–20 km/s)', caption: 'Estimaciones de la energía de Tunguska a partir del área de árboles derribados (unos 2150 km²) y de las ondas registradas por los barómetros de todo el mundo.' },
  ],
  cheliabinsk: [
    { t: 'math', f: 'E \\approx 440–500 kt  ·  D \\approx 19 m  ·  v \\approx 19 km/s  ·  h_{explosión} \\approx 27–30 km', caption: 'Parámetros del bólido de Cheliábinsk (Popova y otros, 2013; Brown y otros, 2013).' },
  ],
  'tsar-bomba': [
    { t: 'math', f: 'R(50 Mt) / R(15 kt) = (50000/15)^{1/3} \\approx 15', caption: 'Por la escala de la raíz cúbica, la Tsar Bomba (3300 veces más potente que la bomba de Hiroshima) sólo multiplicó por unas 15 veces el alcance de la onda expansiva: rompió cristales a unos 900 km.' },
  ],
  hiroshima: [
    { t: 'math', f: '15 kt \\approx 6,3 · 10^{13} J  ⇒  \\Delta m = E/c^{2} \\approx 0,7 g', caption: 'Toda la energía de la bomba de Hiroshima corresponde a menos de un gramo de masa convertida en energía.' },
  ],
};
