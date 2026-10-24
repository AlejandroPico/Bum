/**
 * Frases de la narración del recorrido cinematográfico. Cada momento tiene varias versiones que
 * cuentan lo mismo con otras palabras; se elige una al azar (sin repetir la última) para que el
 * recorrido no suene siempre igual. Están escritas para oírse: números redondos, sin siglas y sin
 * repetir el nombre del lugar que ya se ha dicho en el título.
 *
 * En otros idiomas sólo se eligen las versiones que ya tienen traducción en el catálogo; si no hay
 * ninguna, se usa la primera (que siempre está traducida).
 */
import { lang, tr } from './i18n';

const last = new Map<string, number>();
/** una versión al azar, distinta de la última vez */
export function pick(key: string, variants: (string | false | null | undefined)[]): string {
  const all = variants.filter((v): v is string => !!v);
  if (!all.length) return '';
  let idx = all.map((_, i) => i);
  if (lang !== 'es') { const ok = idx.filter((i) => tr(all[i]) !== all[i]); idx = ok.length ? ok : [0]; }
  if (idx.length > 1) idx = idx.filter((i) => i !== last.get(key));
  const i = idx[Math.floor(Math.random() * idx.length)];
  last.set(key, i);
  return all[i];
}

// ------------------------------------------------------------------ vuelo
export const launchLines = (site: string, country: string, vec: string, place: string, range: string, dur: string) => [
  `Desde ${site}, ${country}, despega un ${vec} rumbo a ${place}. Tiene que recorrer ${range} kilómetros y tardará unos ${dur}.`,
  `Se enciende el motor en ${site}, ${country}. Un ${vec} sale hacia ${place}, a ${range} kilómetros. Llegará en unos ${dur}.`,
  `Todo empieza en ${site}, ${country}: un ${vec} se eleva con destino a ${place}. Por delante, ${range} kilómetros y unos ${dur} de vuelo.`,
  `Lanzamiento desde ${site}, ${country}. El ${vec} pone rumbo a ${place}: ${range} kilómetros que recorrerá en unos ${dur}.`,
  `En ${site}, ${country}, sale disparado un ${vec}. Su objetivo es ${place}, a ${range} kilómetros de distancia, y el viaje durará unos ${dur}.`,
];
export const hgvLines = (alt: string) => [
  `El cohete lo sube hasta unos cien kilómetros y allí suelta el planeador, que vuela por la alta atmósfera a unos ${alt} kilómetros de altura y a más de quince veces la velocidad del sonido. Cambia de rumbo sobre la marcha, así que los radares no pueden calcular dónde caerá.`,
  `Arriba, a unos cien kilómetros, el cohete libera un planeador. Desciende hasta unos ${alt} kilómetros y vuela allí a más de quince veces la velocidad del sonido, girando a su antojo: nadie puede saber con certeza dónde acabará.`,
  `El planeador se separa del cohete y se queda en la alta atmósfera, a unos ${alt} kilómetros de altura. Va a más de quince veces la velocidad del sonido y puede cambiar de dirección, algo que una ojiva normal no hace.`,
  `Ahora vuela un planeador hipersónico: a unos ${alt} kilómetros de altura y a más de quince veces la velocidad del sonido. Como maniobra, su trayectoria no es un arco fijo y es muy difícil de seguir.`,
];
export const cruiseLines = () => [
  'El misil vuela a unos sesenta metros del suelo, siguiendo el relieve y esquivando las defensas, por debajo del horizonte de los radares. Es lento, más o menos como un avión de pasajeros, pero muy difícil de ver.',
  'Pegado al terreno, a unos sesenta metros de altura, el misil se esconde de los radares detrás de colinas y montañas. Va a la velocidad de un avión de pasajeros: lento, pero casi invisible.',
  'Es un misil de crucero: vuela bajo, rozando el paisaje, para que los radares no lo vean hasta el último momento. No es rápido, pero su ruta es difícil de adivinar.',
  'El misil sigue el relieve a ras de suelo, como un pequeño avión sin piloto. Su arma no es la velocidad, sino la sorpresa: los radares apenas lo detectan.',
];
export const aircraftLines = () => [
  'Un bombardero lleva la bomba a unos once kilómetros de altura. Tardará horas en llegar y los radares lo verán venir, pero puede ser difícil de interceptar.',
  'La bomba viaja en un bombardero, a unos once kilómetros de altura. El viaje es largo, de horas, y los radares lo seguirán, pero derribarlo no es sencillo.',
  'Es un bombardero, como en Hiroshima. Vuela a unos once kilómetros de altura y tardará horas: hay tiempo para verlo llegar, no siempre para detenerlo.',
  'Un avión de bombardeo se acerca a gran altura, unos once kilómetros. Es la forma más antigua de llevar una bomba nuclear: lenta, visible y, aun así, peligrosa.',
];
export const ballisticLines = (boost: string, apogee: string) => [
  `Tras ${boost} minutos de propulsión, el motor se apaga y la ojiva sigue un arco por el espacio. Llegará a ${apogee} kilómetros de altura, mucho más alto que la Estación Espacial Internacional.`,
  `El motor funciona ${boost} minutos y se apaga. A partir de ahí la ojiva vuela por inercia, como una piedra lanzada, y sube hasta ${apogee} kilómetros, por encima de la Estación Espacial.`,
  `Apagado el motor, a los ${boost} minutos, sólo queda la caída libre: un gran arco por el espacio que alcanza ${apogee} kilómetros de altura.`,
  `En ${boost} minutos el cohete ha hecho su trabajo. La ojiva sale de la atmósfera y sube hasta ${apogee} kilómetros, más que la órbita de la Estación Espacial Internacional, antes de empezar a caer.`,
  `La fase de propulsión dura ${boost} minutos. Después, silencio: la ojiva cruza el espacio en un arco que culmina a ${apogee} kilómetros de altura.`,
];
export const mirvLines = (n: number) => [
  `A mitad del camino, el vehículo de reentrada suelta las ${n} ojivas que lleva. Cada una sigue su propia trayectoria hacia un objetivo distinto.`,
  `Ahora se separan las ${n} ojivas. Cada una tiene su propio blanco y su propio camino.`,
  `El misil no lleva una bomba, sino ${n}. En pleno vuelo se reparten y cada una apunta a un lugar diferente.`,
  `Llega el momento de la separación: ${n} ojivas se desprenden una tras otra, cada una hacia un objetivo distinto.`,
];
export const reentryLines = (kms: string, warn: string) => [
  `La ojiva vuelve a entrar en la atmósfera a ${kms} kilómetros por segundo. Desde que los satélites vieron el lanzamiento, ha habido unos ${warn} minutos de aviso.`,
  `Reentrada a ${kms} kilómetros por segundo: la ojiva brilla al rozar el aire. Desde el lanzamiento, el aviso ha sido de unos ${warn} minutos.`,
  `La ojiva cae de nuevo hacia la Tierra a ${kms} kilómetros por segundo. Quien estuviera debajo habría tenido, como mucho, unos ${warn} minutos para ponerse a cubierto.`,
  `Vuelve a la atmósfera a ${kms} kilómetros por segundo, envuelta en un resplandor. Han pasado unos ${warn} minutos desde que se detectó el lanzamiento.`,
];
export const arrivalLines = (warn: string) => [
  `Faltan pocos minutos para llegar. Con este tipo de arma, el aviso sería de unos ${warn} minutos.`,
  `Está a punto de llegar. La gente de la zona habría tenido unos ${warn} minutos de aviso.`,
  `Ya casi está aquí. Desde que se detectó, ha habido unos ${warn} minutos para reaccionar.`,
];

// ------------------------------------------------------------------ situación
export const introLines = (asteroid: boolean, place: string, name: string, energy: string, hiro: string, where: string) => asteroid ? [
  `Estamos en ${place}. Vamos a ver qué pasaría si cayera aquí ${name}: ${energy} de energía, ${hiro}.`,
  `${place}. Imaginemos que ${name} cae justo aquí. Llegaría con ${energy} de energía, ${hiro}.`,
  `Este es el escenario: ${name} choca contra ${place} con ${energy} de energía, ${hiro}.`,
  `Vamos a ${place}. Aquí caerá ${name}, con una energía de ${energy}, ${hiro}.`,
  `Supongamos que ${name} se dirige hacia ${place}. Su energía, ${energy}, equivale a ${hiro}.`,
] : [
  `Estamos en ${place}. Vamos a ver qué pasaría si estallara aquí ${name}: ${energy}, ${hiro}, ${where}.`,
  `${place}. Imaginemos que aquí estalla ${name}, ${where}: ${energy}, ${hiro}.`,
  `Este es el escenario: ${name} detona ${where} sobre ${place}. Su potencia es de ${energy}, ${hiro}.`,
  `Vamos a ${place}. El arma es ${name}, con ${energy}, ${hiro}, y estallará ${where}.`,
  `Supongamos que ${name} estalla en ${place}, ${where}. Hablamos de ${energy}, ${hiro}.`,
  `Un día cualquiera en ${place}. De pronto, ${name} detona ${where}: ${energy}, ${hiro}.`,
];
export const popLines = (pop: string) => [
  `En la zona que alcanzan sus efectos viven unos ${pop} habitantes.`,
  `Dentro del área afectada viven unos ${pop} habitantes.`,
  `Hasta donde llegan sus efectos hay unos ${pop} habitantes.`,
  `Su alcance cubre lugares donde viven unos ${pop} habitantes.`,
];
export const entryLines = (sp: string) => [
  `El objeto entra en la atmósfera a ${sp} kilómetros por segundo. El aire que tiene delante se comprime y se calienta tanto que brilla más que el Sol, y la presión empieza a romperlo.`,
  `A ${sp} kilómetros por segundo, el objeto choca con la atmósfera. El aire comprimido delante de él se pone incandescente y la presión empieza a resquebrajarlo.`,
  `Entra en la atmósfera a ${sp} kilómetros por segundo. Desde el suelo se vería una bola más brillante que el Sol cruzando el cielo.`,
  `El bólido atraviesa la atmósfera a ${sp} kilómetros por segundo. El rozamiento lo calienta hasta brillar como un segundo Sol mientras empieza a partirse.`,
];

// ------------------------------------------------------------------ explosión
export const flashLines = (asteroid: boolean, dist: string, fb: string, burn: string | null) => {
  const b = burn ? `: quien esté al aire libre sufre quemaduras graves hasta ${burn}` : '';
  return asteroid ? [
    `Toda su energía de movimiento se libera de golpe. Se forma una bola de fuego de ${fb} de radio y un destello de calor que viaja a la velocidad de la luz${b}.`,
    `En un instante, toda esa velocidad se convierte en calor. La bola de fuego mide ${fb} de radio y su luz llega antes que cualquier otra cosa${b}.`,
    `El choque libera la energía de golpe: una bola de fuego de ${fb} de radio y un destello que lo ilumina todo${b}.`,
    `Ya está aquí. Su energía se libera en un instante y se forma una bola de fuego de ${fb} de radio${b}.`,
  ] : [
    `Estamos a ${dist} de la zona cero. En una millonésima de segundo se forma una bola de fuego más caliente que el centro del Sol, que crece hasta ${fb} de radio. Su luz y su calor llegan a la vez, a la velocidad de la luz${b}.`,
    `Desde aquí, a ${dist}, se ve el destello. Una bola de fuego más caliente que el Sol crece hasta ${fb} de radio en un instante${b}.`,
    `A ${dist} de la explosión, el cielo se vuelve blanco. La bola de fuego alcanza ${fb} de radio, y su calor llega a la vez que su luz${b}.`,
    `Primero, la luz. Estamos a ${dist} y una bola de fuego de ${fb} de radio brilla durante unos segundos más que el Sol${b}.`,
    `Un destello cegador, visible a cientos de kilómetros. Estamos a ${dist}: la bola de fuego crece hasta ${fb} de radio${b}.`,
  ];
};
export const shockLines = (secs: string, eff: string, wind: string) => [
  `${secs} segundos después del destello llega la onda expansiva: un muro de aire comprimido que avanza más deprisa que el sonido. Aquí ${eff}, y el viento que la sigue sopla a unos ${wind} kilómetros por hora.`,
  `Pasan ${secs} segundos de silencio y llega la onda expansiva. Aquí ${eff}; detrás viene un viento de unos ${wind} kilómetros por hora.`,
  `La onda tarda ${secs} segundos en llegar hasta aquí. Cuando lo hace, ${eff}, y el viento sopla a unos ${wind} kilómetros por hora.`,
  `Tras ${secs} segundos, el golpe: aire comprimido que viaja más rápido que el sonido. Aquí ${eff}, con un viento de unos ${wind} kilómetros por hora.`,
  `Primero fue la luz; ${secs} segundos después, el estruendo. Aquí ${eff}, y el viento alcanza unos ${wind} kilómetros por hora.`,
];
export const aerialLines = (psi20: string | null, psi5: string | null, psi1: string) => {
  const a = psi20 ? `Hasta ${psi20} no queda casi nada en pie. ` : '';
  const b = psi5 ? `Hasta ${psi5} se derrumba la mayoría de los edificios. ` : '';
  return [
    `Desde el aire se ve cómo avanza la onda. ${a}${b}Y hasta ${psi1} revientan los cristales, que hieren a muchísima gente.`,
    `Vista desde arriba, la onda es un anillo que se expande. ${a}${b}Hasta ${psi1} saltan los cristales de las ventanas.`,
    `El anillo de la onda se aleja del centro. ${a}${b}Más lejos, hasta ${psi1}, los daños son menores, pero los cristales rotos hieren a mucha gente.`,
    `La onda sigue su camino. ${a}${b}Su último efecto serio, la rotura de cristales, llega hasta ${psi1}.`,
  ];
};
export const radiationLines = (r: string) => [
  `En el primer minuto, la explosión emite también rayos gamma y neutrones. Hasta ${r}, la dosis que recibiría una persona sin protección sería mortal, aunque tan cerca la onda y el calor ya son más letales.`,
  `Hay otro peligro invisible: la radiación del primer minuto. Hasta ${r}, una persona sin protección recibiría una dosis mortal, aunque a esa distancia la onda y el calor matan antes.`,
  `Además del calor y la onda, la explosión suelta un chorro de rayos gamma y neutrones. Sin protección, sería mortal hasta ${r}.`,
  `La radiación inicial llega en el primer minuto. Hasta ${r} sería una dosis mortal para quien no estuviera protegido.`,
];
export const cloudLines = (mins: string, top: string, width: string, dirt: string) => [
  `El aire caliente sube como un globo y arrastra humo y polvo: así se forma la nube en forma de hongo. En unos ${mins} minutos llega a ${top} de altura, y su sombrero mide ${width} de ancho.${dirt}`,
  `La bola de fuego, mucho más ligera que el aire, sube y tira de una columna de polvo. Es el hongo: en unos ${mins} minutos alcanza ${top} de altura y ${width} de ancho.${dirt}`,
  `Ahora se forma la imagen que todos conocemos: la nube en forma de hongo. Subirá hasta ${top} en unos ${mins} minutos, con un sombrero de ${width}.${dirt}`,
  `El calor empuja hacia arriba una enorme columna de humo y polvo. En unos ${mins} minutos, el hongo llega a ${top} de altura y se ensancha hasta ${width}.${dirt}`,
  `Sube la nube. Tardará unos ${mins} minutos en llegar a ${top}, donde se aplana en un sombrero de ${width}.${dirt}`,
];
export const dirtLines = (kind: 'asteroid' | 'ground' | 'air') => kind === 'asteroid' ? [
  ' Lleva roca pulverizada y vapor del propio objeto.',
  ' Está hecha de roca pulverizada y del vapor del propio objeto.',
] : kind === 'ground' ? [
  ' Como la bola de fuego ha tocado el suelo, la nube va cargada de tierra que se ha vuelto radiactiva.',
  ' La bola de fuego ha tocado el suelo: la nube arrastra tierra contaminada que caerá después.',
  ' Al tocar el suelo, la explosión ha levantado toneladas de tierra radiactiva que viajan dentro de la nube.',
] : [
  ' Al estallar en el aire, la bola de fuego no ha tocado el suelo: la nube lleva poca tierra y habrá poca lluvia radiactiva local.',
  ' Como estalló en el aire, la nube apenas lleva tierra: la lluvia radiactiva cercana será escasa.',
  ' La explosión fue aérea, así que casi no hay tierra en la nube y la contaminación cercana será pequeña.',
];
export const heatLines = (burn: string, fire: string) => [
  `El destello de calor prende fuego a todo lo que arde con facilidad: cortinas, papel, madera seca. Quien estuviera al aire libre tendría quemaduras de tercer grado hasta ${burn}.${fire}`,
  `El calor del destello dura unos segundos, pero basta para incendiar papel, tela y madera. Hasta ${burn}, quien estuviera al aire libre sufriría quemaduras de tercer grado.${fire}`,
  `Hasta ${burn}, el calor quema la piel expuesta en tercer grado. Por toda la zona empiezan a arder ventanas, toldos y árboles secos.${fire}`,
  `Una sombra, un muro, cualquier cosa que tapara el destello habría protegido. Al descubierto, las quemaduras de tercer grado llegan hasta ${burn}.${fire}`,
];
export const fireLines = (kind: 'firestorm' | 'conflagration' | 'none') => kind === 'firestorm' ? [
  ' En una ciudad densa y con poco viento, miles de incendios se juntan en una tormenta de fuego que aspira el aire de alrededor, como pasó en Hiroshima.',
  ' Los incendios acaban uniéndose en una tormenta de fuego que absorbe el aire de alrededor, como en Hiroshima.',
] : kind === 'conflagration' ? [
  ' Empujados por el viento, los incendios siguen avanzando durante horas.',
  ' El viento extiende los incendios, que avanzan durante horas.',
] : [''];
export const falloutLines = (dir: string, area: string, reach: string) => [
  `Al cabo de una hora empieza a caer el polvo de la nube. El viento lo arrastra hacia ${dir}: es la lluvia radiactiva. Cubre unos ${area} kilómetros cuadrados y llega hasta ${reach} kilómetros. Meterse en un sótano o en el centro de un edificio sólido durante al menos un día reduce la dosis decenas de veces.`,
  `Ahora cae lo que subió con la nube. El viento lo lleva hacia ${dir} y lo deposita sobre unos ${area} kilómetros cuadrados, hasta ${reach} kilómetros. Quedarse dentro de un edificio sólido el primer día es lo que más vidas salva.`,
  `La lluvia radiactiva viaja con el viento hacia ${dir}. En las horas siguientes cubre unos ${area} kilómetros cuadrados y alcanza ${reach} kilómetros. Su radiación cae deprisa: cada siete horas, diez veces menos.`,
  `El polvo radiactivo empieza a caer al cabo de una hora, arrastrado hacia ${dir}. Llega a ${reach} kilómetros y cubre unos ${area} kilómetros cuadrados. Un sótano o el centro de un edificio grande reducen mucho la dosis.`,
  `Hacia ${dir} se extiende una franja de lluvia radiactiva de unos ${area} kilómetros cuadrados, que llega hasta ${reach} kilómetros. Lo más importante para quien esté ahí: entrar en un edificio sólido y no salir en un día.`,
];
export const balanceLines = (deaths: string, injured: string, fall: string) => [
  `En las primeras horas habría unos ${deaths} muertos y ${injured} heridos${fall}. En el mapa, cuanto más intenso es el color, más víctimas por kilómetro cuadrado. Son estimaciones con modelos científicos públicos: la realidad dependería de muchos más factores.`,
  `El balance de las primeras horas: unos ${deaths} muertos y ${injured} heridos${fall}. El color del mapa muestra dónde se concentran las víctimas. Son cálculos con modelos públicos, no predicciones exactas.`,
  `Unos ${deaths} muertos y ${injured} heridos en las primeras horas${fall}. El mapa colorea cada zona según las víctimas por kilómetro cuadrado. La cifra real podría ser mayor o menor.`,
  `Cuando todo pasa, quedan unos ${deaths} muertos y ${injured} heridos${fall}. Las zonas más oscuras del mapa son las que más víctimas tienen. Es una estimación: la realidad dependería de muchos factores.`,
];
export const emptyLines = () => [
  'Por suerte, la zona afectada está casi deshabitada.',
  'Afortunadamente, en esta zona casi no vive nadie.',
  'La zona está casi vacía: las víctimas serían muy pocas.',
];
