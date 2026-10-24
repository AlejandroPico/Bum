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
  `Una columna de fuego sale de ${site}, ${country}. Es un ${vec} y va hacia ${place}: ${range} kilómetros en unos ${dur}.`,
  `El reloj empieza a correr en ${site}, ${country}. Un ${vec} acaba de despegar hacia ${place}; le quedan ${range} kilómetros y unos ${dur} de viaje.`,
  `Desde ${site}, en ${country}, alguien ha dado la orden. Un ${vec} vuela ya hacia ${place}, a ${range} kilómetros, y llegará en unos ${dur}.`,
];
export const hgvLines = (alt: string) => [
  `El cohete lo sube hasta unos cien kilómetros y allí suelta el planeador, que vuela por la alta atmósfera a unos ${alt} kilómetros de altura y a más de quince veces la velocidad del sonido. Cambia de rumbo sobre la marcha, así que los radares no pueden calcular dónde caerá.`,
  `Arriba, a unos cien kilómetros, el cohete libera un planeador. Desciende hasta unos ${alt} kilómetros y vuela allí a más de quince veces la velocidad del sonido, girando a su antojo: nadie puede saber con certeza dónde acabará.`,
  `El planeador se separa del cohete y se queda en la alta atmósfera, a unos ${alt} kilómetros de altura. Va a más de quince veces la velocidad del sonido y puede cambiar de dirección, algo que una ojiva normal no hace.`,
  `Ahora vuela un planeador hipersónico: a unos ${alt} kilómetros de altura y a más de quince veces la velocidad del sonido. Como maniobra, su trayectoria no es un arco fijo y es muy difícil de seguir.`,
  `Ya no es un cohete, sino un planeador que surca el borde del espacio a unos ${alt} kilómetros de altura. Va a más de quince veces la velocidad del sonido y nunca sigue una línea recta.`,
  `El planeador se lanza en picado hacia la atmósfera y se estabiliza a unos ${alt} kilómetros. Desde ahí puede virar cientos de kilómetros a un lado u otro.`,
  `Vuela a unos ${alt} kilómetros de altura, rodeado de aire tan caliente que brilla. Más de quince veces la velocidad del sonido, y con capacidad de maniobra: es lo que lo hace tan temido.`,
  `A diferencia de una ojiva clásica, que cae como una piedra, este planeador se desliza a unos ${alt} kilómetros de altura y elige su camino hasta el último momento.`,
];
export const cruiseLines = () => [
  'El misil vuela a unos sesenta metros del suelo, siguiendo el relieve y esquivando las defensas, por debajo del horizonte de los radares. Es lento, más o menos como un avión de pasajeros, pero muy difícil de ver.',
  'Pegado al terreno, a unos sesenta metros de altura, el misil se esconde de los radares detrás de colinas y montañas. Va a la velocidad de un avión de pasajeros: lento, pero casi invisible.',
  'Es un misil de crucero: vuela bajo, rozando el paisaje, para que los radares no lo vean hasta el último momento. No es rápido, pero su ruta es difícil de adivinar.',
  'El misil sigue el relieve a ras de suelo, como un pequeño avión sin piloto. Su arma no es la velocidad, sino la sorpresa: los radares apenas lo detectan.',
  'Un misil de crucero es casi un pequeño avión sin piloto. Vuela bajísimo, entre valles y colinas, para que nadie lo vea venir.',
  'Avanza a pocos metros sobre el mar y la tierra, corrigiendo el rumbo con mapas del terreno. Cuando un radar lo detecta, suele quedar muy poco tiempo.',
  'No sube al espacio ni va a velocidades extremas. Su táctica es otra: volar tan bajo que el relieve lo esconde.',
  'Lento pero escurridizo: el misil serpentea a ras de suelo, aprovechando montañas y valles para pasar desapercibido.',
];
export const aircraftLines = () => [
  'Un bombardero lleva la bomba a unos once kilómetros de altura. Tardará horas en llegar y los radares lo verán venir, pero puede ser difícil de interceptar.',
  'La bomba viaja en un bombardero, a unos once kilómetros de altura. El viaje es largo, de horas, y los radares lo seguirán, pero derribarlo no es sencillo.',
  'Es un bombardero, como en Hiroshima. Vuela a unos once kilómetros de altura y tardará horas: hay tiempo para verlo llegar, no siempre para detenerlo.',
  'Un avión de bombardeo se acerca a gran altura, unos once kilómetros. Es la forma más antigua de llevar una bomba nuclear: lenta, visible y, aun así, peligrosa.',
  'Un bombardero estratégico cruza el cielo a once kilómetros de altura. Es la misma idea que en 1945, con aviones mucho más modernos.',
  'La bomba no viaja en un misil, sino en la bodega de un avión. Tardará horas en llegar, y durante todo ese tiempo los radares lo estarán siguiendo.',
  'Un avión de largo alcance se acerca a gran altura con la bomba a bordo. Puede ser derribado, pero también puede llegar.',
  'Es la vía más lenta: un bombardero a once kilómetros de altura, con horas de vuelo por delante. Aun así, nadie puede dar por hecho que lo detendrán.',
];
export const ballisticLines = (boost: string, apogee: string) => [
  `Tras ${boost} minutos de propulsión, el motor se apaga y la ojiva sigue un arco por el espacio. Llegará a ${apogee} kilómetros de altura, mucho más alto que la Estación Espacial Internacional.`,
  `El motor funciona ${boost} minutos y se apaga. A partir de ahí la ojiva vuela por inercia, como una piedra lanzada, y sube hasta ${apogee} kilómetros, por encima de la Estación Espacial.`,
  `Apagado el motor, a los ${boost} minutos, sólo queda la caída libre: un gran arco por el espacio que alcanza ${apogee} kilómetros de altura.`,
  `En ${boost} minutos el cohete ha hecho su trabajo. La ojiva sale de la atmósfera y sube hasta ${apogee} kilómetros, más que la órbita de la Estación Espacial Internacional, antes de empezar a caer.`,
  `La fase de propulsión dura ${boost} minutos. Después, silencio: la ojiva cruza el espacio en un arco que culmina a ${apogee} kilómetros de altura.`,
  `El motor se apaga a los ${boost} minutos. Desde ese instante, la ojiva no necesita nada más: la gravedad la llevará por un arco que sube hasta ${apogee} kilómetros.`,
  `Tras ${boost} minutos de empuje, la ojiva viaja sola por el vacío. En lo más alto de su arco estará a ${apogee} kilómetros de la superficie.`,
  `${boost} minutos de motor y luego, el vacío. La ojiva cruza el espacio en un arco de ${apogee} kilómetros de altura, mucho más alto de lo que vuela cualquier satélite meteorológico bajo.`,
];
export const mirvLines = (n: number) => [
  `A mitad del camino, el vehículo de reentrada suelta las ${n} ojivas que lleva. Cada una sigue su propia trayectoria hacia un objetivo distinto.`,
  `Ahora se separan las ${n} ojivas. Cada una tiene su propio blanco y su propio camino.`,
  `El misil no lleva una bomba, sino ${n}. En pleno vuelo se reparten y cada una apunta a un lugar diferente.`,
  `Llega el momento de la separación: ${n} ojivas se desprenden una tras otra, cada una hacia un objetivo distinto.`,
  `El bus apunta y suelta la primera ojiva; luego gira, apunta otra vez y suelta la siguiente. Así hasta ${n}, cada una con un destino propio.`,
  `Un solo misil, ${n} ataques distintos: las ojivas se separan en el espacio y cada una cae hacia su objetivo.`,
  `Una a una, se desprenden ${n} ojivas, mezcladas con señuelos que en el vacío se mueven exactamente igual.`,
  `Las ${n} ojivas se reparten como los dedos de una mano: cada una seguirá su propio arco hasta un lugar diferente.`,
];
export const reentryLines = (kms: string, warn: string) => [
  `La ojiva vuelve a entrar en la atmósfera a ${kms} kilómetros por segundo. Desde que los satélites vieron el lanzamiento, ha habido unos ${warn} minutos de aviso.`,
  `Reentrada a ${kms} kilómetros por segundo: la ojiva brilla al rozar el aire. Desde el lanzamiento, el aviso ha sido de unos ${warn} minutos.`,
  `La ojiva cae de nuevo hacia la Tierra a ${kms} kilómetros por segundo. Quien estuviera debajo habría tenido, como mucho, unos ${warn} minutos para ponerse a cubierto.`,
  `Vuelve a la atmósfera a ${kms} kilómetros por segundo, envuelta en un resplandor. Han pasado unos ${warn} minutos desde que se detectó el lanzamiento.`,
  `El escudo térmico de la ojiva se pone al rojo a ${kms} kilómetros por segundo. El aviso, desde el lanzamiento, ha sido de unos ${warn} minutos.`,
  `Una estela brillante cruza el cielo: es la ojiva, de vuelta en la atmósfera a ${kms} kilómetros por segundo. Han pasado unos ${warn} minutos desde la alerta.`,
  `A ${kms} kilómetros por segundo, el aire frena y calienta la ojiva, pero no la detiene. Unos ${warn} minutos de aviso es todo lo que ha habido.`,
  `La reentrada dura menos de un minuto. A ${kms} kilómetros por segundo, la ojiva cae casi en vertical; el aviso total ha sido de unos ${warn} minutos.`,
];
export const arrivalLines = (warn: string) => [
  `Faltan pocos minutos para llegar. Con este tipo de arma, el aviso sería de unos ${warn} minutos.`,
  `Está a punto de llegar. La gente de la zona habría tenido unos ${warn} minutos de aviso.`,
  `Ya casi está aquí. Desde que se detectó, ha habido unos ${warn} minutos para reaccionar.`,
  `Se acerca el final del viaje. El aviso total habría sido de unos ${warn} minutos.`,
  `Quedan muy pocos minutos. Con unos ${warn} minutos de aviso, apenas habría tiempo para buscar refugio.`,
  `El arma está a punto de llegar. Unos ${warn} minutos de aviso: tiempo para bajar a un sótano, no mucho más.`,
  `Ya se ve venir. Desde la primera alerta han pasado unos ${warn} minutos.`,
  `Llega la recta final. En total, la población habría tenido unos ${warn} minutos de margen.`,
];

// ------------------------------------------------------------------ situación
export const introLines = (asteroid: boolean, place: string, name: string, energy: string, hiro: string, where: string) => asteroid ? [
  `Estamos en ${place}. Vamos a ver qué pasaría si cayera aquí ${name}: ${energy} de energía, ${hiro}.`,
  `${place}. Imaginemos que ${name} cae justo aquí. Llegaría con ${energy} de energía, ${hiro}.`,
  `Este es el escenario: ${name} choca contra ${place} con ${energy} de energía, ${hiro}.`,
  `Vamos a ${place}. Aquí caerá ${name}, con una energía de ${energy}, ${hiro}.`,
  `Supongamos que ${name} se dirige hacia ${place}. Su energía, ${energy}, equivale a ${hiro}.`,
  `Un objeto del espacio se dirige a ${place}. Es ${name}, y trae ${energy} de energía, ${hiro}.`,
  `Miremos ${place} desde el cielo. Hacia aquí viene ${name}: ${energy} de energía, ${hiro}.`,
  `El blanco es ${place}. ${name} llegará con una energía de ${energy}, ${hiro}.`,
  `Vamos a imaginar que ${name} no pasa de largo y cae sobre ${place}. Su energía, ${energy}, equivale a ${hiro}.`,
  `Nadie lo ha desviado: ${name} va a chocar contra ${place} con ${energy} de energía, ${hiro}.`,
] : [
  `Estamos en ${place}. Vamos a ver qué pasaría si estallara aquí ${name}: ${energy}, ${hiro}, ${where}.`,
  `${place}. Imaginemos que aquí estalla ${name}, ${where}: ${energy}, ${hiro}.`,
  `Este es el escenario: ${name} detona ${where} sobre ${place}. Su potencia es de ${energy}, ${hiro}.`,
  `Vamos a ${place}. El arma es ${name}, con ${energy}, ${hiro}, y estallará ${where}.`,
  `Supongamos que ${name} estalla en ${place}, ${where}. Hablamos de ${energy}, ${hiro}.`,
  `Un día cualquiera en ${place}. De pronto, ${name} detona ${where}: ${energy}, ${hiro}.`,
  `Esto es ${place}. Aquí va a estallar ${name}, ${where}: ${energy}, ${hiro}.`,
  `Miremos ${place} desde el aire. En unos segundos, ${name} detonará ${where}, con ${energy}, ${hiro}.`,
  `El objetivo es ${place}. El arma, ${name}: ${energy}, ${hiro}. Estallará ${where}.`,
  `Una ciudad, ${place}, y un arma, ${name}. Su potencia es de ${energy}, ${hiro}, y estallará ${where}.`,
];
export const popLines = (pop: string) => [
  `En la zona que alcanzan sus efectos viven unos ${pop} habitantes.`,
  `Dentro del área afectada viven unos ${pop} habitantes.`,
  `Hasta donde llegan sus efectos hay unos ${pop} habitantes.`,
  `Su alcance cubre lugares donde viven unos ${pop} habitantes.`,
  `Unos ${pop} habitantes viven dentro del alcance de sus efectos.`,
  `Bajo sus efectos quedarían unos ${pop} habitantes.`,
  `En el radio de sus efectos hay unos ${pop} habitantes.`,
  `Unos ${pop} habitantes viven en la zona que se verá afectada.`,
];
export const entryLines = (sp: string) => [
  `El objeto entra en la atmósfera a ${sp} kilómetros por segundo. El aire que tiene delante se comprime y se calienta tanto que brilla más que el Sol, y la presión empieza a romperlo.`,
  `A ${sp} kilómetros por segundo, el objeto choca con la atmósfera. El aire comprimido delante de él se pone incandescente y la presión empieza a resquebrajarlo.`,
  `Entra en la atmósfera a ${sp} kilómetros por segundo. Desde el suelo se vería una bola más brillante que el Sol cruzando el cielo.`,
  `El bólido atraviesa la atmósfera a ${sp} kilómetros por segundo. El rozamiento lo calienta hasta brillar como un segundo Sol mientras empieza a partirse.`,
  `Llega a ${sp} kilómetros por segundo, más de cincuenta veces la velocidad de una bala. El aire lo frena de golpe y lo hace brillar con fuerza.`,
  `Un trazo de luz cruza el cielo a ${sp} kilómetros por segundo. El objeto se calienta, se deforma y empieza a deshacerse.`,
  `En la atmósfera, a ${sp} kilómetros por segundo, el objeto choca contra un muro de aire. Se vuelve incandescente y empieza a fragmentarse.`,
  `Desde el suelo se vería un bólido cegador, a ${sp} kilómetros por segundo, dejando una estela de humo detrás.`,
];

// ------------------------------------------------------------------ explosión
export const flashLines = (asteroid: boolean, dist: string, fb: string, burn: string | null) => {
  const b = burn ? `: quien esté al aire libre sufre quemaduras graves hasta ${burn}` : '';
  return asteroid ? [
    `Toda su energía de movimiento se libera de golpe. Se forma una bola de fuego de ${fb} de radio y un destello de calor que viaja a la velocidad de la luz${b}.`,
    `En un instante, toda esa velocidad se convierte en calor. La bola de fuego mide ${fb} de radio y su luz llega antes que cualquier otra cosa${b}.`,
    `El choque libera la energía de golpe: una bola de fuego de ${fb} de radio y un destello que lo ilumina todo${b}.`,
    `Ya está aquí. Su energía se libera en un instante y se forma una bola de fuego de ${fb} de radio${b}.`,
  `El impacto convierte en calor una energía inmensa en un instante. La bola de fuego llega a ${fb} de radio${b}.`,
  `Un relámpago blanco, y luego una bola de fuego de ${fb} de radio que se eleva sobre el lugar del choque${b}.`,
  `Todo ocurre en menos de un segundo: el objeto se desintegra y deja una bola de fuego de ${fb} de radio${b}.`,
  `Su velocidad se convierte de golpe en luz y calor: una bola de fuego de ${fb} de radio${b}.`,
  ] : [
    `Estamos a ${dist} de la zona cero. En una millonésima de segundo se forma una bola de fuego más caliente que el centro del Sol, que crece hasta ${fb} de radio. Su luz y su calor llegan a la vez, a la velocidad de la luz${b}.`,
    `Desde aquí, a ${dist}, se ve el destello. Una bola de fuego más caliente que el Sol crece hasta ${fb} de radio en un instante${b}.`,
    `A ${dist} de la explosión, el cielo se vuelve blanco. La bola de fuego alcanza ${fb} de radio, y su calor llega a la vez que su luz${b}.`,
    `Primero, la luz. Estamos a ${dist} y una bola de fuego de ${fb} de radio brilla durante unos segundos más que el Sol${b}.`,
    `Un destello cegador, visible a cientos de kilómetros. Estamos a ${dist}: la bola de fuego crece hasta ${fb} de radio${b}.`,
  `Estamos a ${dist}. Durante unos segundos no hay sombra posible: una bola de fuego de ${fb} de radio lo ilumina todo${b}.`,
  `El primer aviso es la luz, más intensa que mil soles. A ${dist} de aquí crece una bola de fuego de ${fb} de radio${b}.`,
  `A ${dist} de la zona cero, todo se vuelve blanco por un instante. La bola de fuego alcanza ${fb} de radio${b}.`,
  `Ni un sonido todavía, sólo luz. A ${dist}, una bola de fuego de ${fb} de radio brilla sobre la ciudad${b}.`,
  `Ocurre en un parpadeo. Desde ${dist} vemos nacer una bola de fuego que llega a ${fb} de radio${b}.`,
  ];
};
export const shockLines = (secs: string, eff: string, wind: string) => [
  `${secs} segundos después del destello llega la onda expansiva: un muro de aire comprimido que avanza más deprisa que el sonido. Aquí ${eff}, y el viento que la sigue sopla a unos ${wind} kilómetros por hora.`,
  `Pasan ${secs} segundos de silencio y llega la onda expansiva. Aquí ${eff}; detrás viene un viento de unos ${wind} kilómetros por hora.`,
  `La onda tarda ${secs} segundos en llegar hasta aquí. Cuando lo hace, ${eff}, y el viento sopla a unos ${wind} kilómetros por hora.`,
  `Tras ${secs} segundos, el golpe: aire comprimido que viaja más rápido que el sonido. Aquí ${eff}, con un viento de unos ${wind} kilómetros por hora.`,
  `Primero fue la luz; ${secs} segundos después, el estruendo. Aquí ${eff}, y el viento alcanza unos ${wind} kilómetros por hora.`,
  `Durante ${secs} segundos no pasa nada. Luego, de golpe, la onda: aquí ${eff}, y un viento de unos ${wind} kilómetros por hora barre las calles.`,
  `La onda expansiva recorre la distancia en ${secs} segundos. Al llegar, ${eff}; el viento que arrastra supera los ${wind} kilómetros por hora.`,
  `${secs} segundos de espera y llega el golpe de aire. Aquí ${eff}. El viento sopla a unos ${wind} kilómetros por hora.`,
  `El sonido y la onda viajan juntos y tardan ${secs} segundos. Cuando pasan, ${eff}, con rachas de unos ${wind} kilómetros por hora.`,
  `Tras ${secs} segundos llega un muro de aire comprimido. Aquí ${eff}, y el viento alcanza unos ${wind} kilómetros por hora antes de invertirse.`,
];
export const aerialLines = (psi20: string | null, psi5: string | null, psi1: string) => {
  const a = psi20 ? `Hasta ${psi20} no queda casi nada en pie. ` : '';
  const b = psi5 ? `Hasta ${psi5} se derrumba la mayoría de los edificios. ` : '';
  return [
    `Desde el aire se ve cómo avanza la onda. ${a}${b}Y hasta ${psi1} revientan los cristales, que hieren a muchísima gente.`,
    `Vista desde arriba, la onda es un anillo que se expande. ${a}${b}Hasta ${psi1} saltan los cristales de las ventanas.`,
    `El anillo de la onda se aleja del centro. ${a}${b}Más lejos, hasta ${psi1}, los daños son menores, pero los cristales rotos hieren a mucha gente.`,
    `La onda sigue su camino. ${a}${b}Su último efecto serio, la rotura de cristales, llega hasta ${psi1}.`,
    `Desde arriba, la ciudad queda marcada por círculos de destrucción. ${a}${b}El círculo exterior, hasta ${psi1}, es el de los cristales rotos.`,
    `La onda se abre paso entre los edificios como una ola. ${a}${b}Hasta ${psi1}, las ventanas estallan hacia dentro.`,
    `Así se ve la onda desde el cielo: un frente que se aleja del centro. ${a}${b}Pierde fuerza con la distancia, pero hasta ${psi1} todavía rompe cristales.`,
    `El aire comprimido avanza en todas direcciones. ${a}${b}Su huella llega hasta ${psi1}, donde los cristales rotos son la principal causa de heridos.`,
  ];
};
export const radiationLines = (r: string) => [
  `En el primer minuto, la explosión emite también rayos gamma y neutrones. Hasta ${r}, la dosis que recibiría una persona sin protección sería mortal, aunque tan cerca la onda y el calor ya son más letales.`,
  `Hay otro peligro invisible: la radiación del primer minuto. Hasta ${r}, una persona sin protección recibiría una dosis mortal, aunque a esa distancia la onda y el calor matan antes.`,
  `Además del calor y la onda, la explosión suelta un chorro de rayos gamma y neutrones. Sin protección, sería mortal hasta ${r}.`,
  `La radiación inicial llega en el primer minuto. Hasta ${r} sería una dosis mortal para quien no estuviera protegido.`,
  `Hay algo que no se ve ni se siente: un pulso de radiación durante el primer minuto. Sin protección, sería mortal hasta ${r}.`,
  `Junto con la luz sale radiación gamma y neutrones. Hasta ${r}, la dosis sería mortal para una persona al descubierto.`,
  `En ese primer minuto, la radiación atraviesa paredes y cuerpos. Hasta ${r}, recibirla sin protección sería mortal.`,
  `La explosión también emite radiación invisible. Una persona sin protección recibiría una dosis mortal hasta ${r}, aunque cerca del centro la onda y el fuego llegan antes.`,
];
export const cloudLines = (mins: string, top: string, width: string, dirt: string) => [
  `El aire caliente sube como un globo y arrastra humo y polvo: así se forma la nube en forma de hongo. En unos ${mins} minutos llega a ${top} de altura, y su sombrero mide ${width} de ancho.${dirt}`,
  `La bola de fuego, mucho más ligera que el aire, sube y tira de una columna de polvo. Es el hongo: en unos ${mins} minutos alcanza ${top} de altura y ${width} de ancho.${dirt}`,
  `Ahora se forma la imagen que todos conocemos: la nube en forma de hongo. Subirá hasta ${top} en unos ${mins} minutos, con un sombrero de ${width}.${dirt}`,
  `El calor empuja hacia arriba una enorme columna de humo y polvo. En unos ${mins} minutos, el hongo llega a ${top} de altura y se ensancha hasta ${width}.${dirt}`,
  `Sube la nube. Tardará unos ${mins} minutos en llegar a ${top}, donde se aplana en un sombrero de ${width}.${dirt}`,
  `La bola de fuego se eleva y se enrolla sobre sí misma, arrastrando una columna de polvo. En unos ${mins} minutos el hongo alcanza ${top} y mide ${width} de ancho.${dirt}`,
  `Detrás de la bola de fuego queda un tallo de polvo y humo. La nube seguirá subiendo unos ${mins} minutos, hasta ${top}, y se abrirá hasta ${width}.${dirt}`,
  `El hongo crece y crece. Cuando se detenga, dentro de unos ${mins} minutos, estará a ${top} de altura y tendrá ${width} de ancho.${dirt}`,
  `Visto desde lejos, es inconfundible: un hongo que sube hasta ${top} en unos ${mins} minutos, con un sombrero de ${width}.${dirt}`,
  `La nube atraviesa capas de aire cada vez más frías y se ensancha arriba. En unos ${mins} minutos llega a ${top}; su sombrero mide ${width}.${dirt}`,
];
export const dirtLines = (kind: 'asteroid' | 'ground' | 'air') => kind === 'asteroid' ? [
  ' Lleva roca pulverizada y vapor del propio objeto.',
  ' Está hecha de roca pulverizada y del vapor del propio objeto.',
  ' Está llena de roca fundida y pulverizada.',
  ' Dentro viajan el polvo del suelo y los restos del propio objeto.',
  ' La nube es sobre todo roca pulverizada: no es radiactiva.',
  ' Arrastra polvo, roca y vapor del impacto, pero no radiactividad.',
  ' Lo que sube es roca pulverizada; caerá como una lluvia de polvo en los alrededores.',
  ' En su interior hay toneladas de roca triturada y vaporizada.',
] : kind === 'ground' ? [
  ' Como la bola de fuego ha tocado el suelo, la nube va cargada de tierra que se ha vuelto radiactiva.',
  ' La bola de fuego ha tocado el suelo: la nube arrastra tierra contaminada que caerá después.',
  ' Al tocar el suelo, la explosión ha levantado toneladas de tierra radiactiva que viajan dentro de la nube.',
  ' Esa tierra, mezclada con los restos del arma, volverá a caer como lluvia radiactiva.',
  ' La nube va cargada de polvo radiactivo que el viento repartirá en las próximas horas.',
  ' Lleva dentro tierra contaminada: es la semilla de la lluvia radiactiva.',
  ' La explosión en superficie ha convertido toneladas de suelo en polvo radiactivo.',
  ' Todo lo que la bola de fuego ha tocado sube ahora con ella, contaminado.',
] : [
  ' Al estallar en el aire, la bola de fuego no ha tocado el suelo: la nube lleva poca tierra y habrá poca lluvia radiactiva local.',
  ' Como estalló en el aire, la nube apenas lleva tierra: la lluvia radiactiva cercana será escasa.',
  ' La explosión fue aérea, así que casi no hay tierra en la nube y la contaminación cercana será pequeña.',
  ' Al no tocar el suelo, apenas hay polvo radiactivo en la nube.',
  ' La explosión en altura deja poca contaminación local: no ha levantado tierra.',
  ' Como fue en el aire, la lluvia radiactiva será escasa cerca de la zona cero.',
  ' Una explosión aérea ensucia poco el suelo: la nube sube casi limpia de tierra.',
  ' Sin contacto con el suelo, la nube lleva poca tierra y la contaminación cercana será baja.',
];
export const heatLines = (burn: string, fire: string) => [
  `El destello de calor prende fuego a todo lo que arde con facilidad: cortinas, papel, madera seca. Quien estuviera al aire libre tendría quemaduras de tercer grado hasta ${burn}.${fire}`,
  `El calor del destello dura unos segundos, pero basta para incendiar papel, tela y madera. Hasta ${burn}, quien estuviera al aire libre sufriría quemaduras de tercer grado.${fire}`,
  `Hasta ${burn}, el calor quema la piel expuesta en tercer grado. Por toda la zona empiezan a arder ventanas, toldos y árboles secos.${fire}`,
  `Una sombra, un muro, cualquier cosa que tapara el destello habría protegido. Al descubierto, las quemaduras de tercer grado llegan hasta ${burn}.${fire}`,
  `El destello dura unos segundos, pero su calor es brutal. Al aire libre, las quemaduras de tercer grado llegan hasta ${burn}.${fire}`,
  `Hasta ${burn}, la piel al descubierto se quema en tercer grado. Ropas, coches y árboles empiezan a arder.${fire}`,
  `El calor llega a la vez que la luz. Quien estuviera en la calle, hasta ${burn}, sufriría quemaduras de tercer grado.${fire}`,
  `Muchos incendios empiezan en este mismo instante. Las quemaduras graves en la piel expuesta llegan hasta ${burn}.${fire}`,
];
export const fireLines = (kind: 'firestorm' | 'conflagration' | 'none') => kind === 'firestorm' ? [
  ' En una ciudad densa y con poco viento, miles de incendios se juntan en una tormenta de fuego que aspira el aire de alrededor, como pasó en Hiroshima.',
  ' Los incendios acaban uniéndose en una tormenta de fuego que absorbe el aire de alrededor, como en Hiroshima.',
  ' Miles de fuegos se juntan en uno solo, una tormenta de fuego que crea su propio viento.',
  ' Con poco viento y muchos edificios, los incendios se unen en una tormenta de fuego, como en Hiroshima.',
  ' El aire caliente sube tan deprisa que aspira el de alrededor: nace una tormenta de fuego.',
  ' Los incendios ya no se pueden apagar: se funden en una tormenta de fuego que lo consume todo.',
  ' Como en Hiroshima, el fuego se alimenta a sí mismo y forma una tormenta de fuego.',
  ' Sobre la ciudad se forma una tormenta de fuego: vientos hacia el centro y temperaturas altísimas.',
] : kind === 'conflagration' ? [
  ' Empujados por el viento, los incendios siguen avanzando durante horas.',
  ' El viento extiende los incendios, que avanzan durante horas.',
  ' Con el viento a favor, los incendios avanzan de calle en calle.',
  ' Los fuegos se propagan con el viento y siguen activos durante horas.',
  ' El viento empuja las llamas, que se extienden mucho más allá de la zona del destello.',
  ' Las llamas avanzan con el viento: el incendio crecerá durante horas.',
  ' Los incendios no se quedan quietos: el viento los arrastra durante horas.',
  ' El viento convierte los focos sueltos en frentes de fuego que avanzan durante horas.',
] : [''];
export const falloutLines = (dir: string, area: string, reach: string) => [
  `Al cabo de una hora empieza a caer el polvo de la nube. El viento lo arrastra hacia ${dir}: es la lluvia radiactiva. Cubre unos ${area} kilómetros cuadrados y llega hasta ${reach} kilómetros. Meterse en un sótano o en el centro de un edificio sólido durante al menos un día reduce la dosis decenas de veces.`,
  `Ahora cae lo que subió con la nube. El viento lo lleva hacia ${dir} y lo deposita sobre unos ${area} kilómetros cuadrados, hasta ${reach} kilómetros. Quedarse dentro de un edificio sólido el primer día es lo que más vidas salva.`,
  `La lluvia radiactiva viaja con el viento hacia ${dir}. En las horas siguientes cubre unos ${area} kilómetros cuadrados y alcanza ${reach} kilómetros. Su radiación cae deprisa: cada siete horas, diez veces menos.`,
  `El polvo radiactivo empieza a caer al cabo de una hora, arrastrado hacia ${dir}. Llega a ${reach} kilómetros y cubre unos ${area} kilómetros cuadrados. Un sótano o el centro de un edificio grande reducen mucho la dosis.`,
  `Hacia ${dir} se extiende una franja de lluvia radiactiva de unos ${area} kilómetros cuadrados, que llega hasta ${reach} kilómetros. Lo más importante para quien esté ahí: entrar en un edificio sólido y no salir en un día.`,
  `El viento empuja la nube hacia ${dir}, y con ella el polvo radiactivo. Caerá sobre unos ${area} kilómetros cuadrados, hasta ${reach} kilómetros de distancia.`,
  `La lluvia radiactiva cae a favor del viento, hacia ${dir}. Afecta a unos ${area} kilómetros cuadrados y llega a ${reach} kilómetros. Su peligro baja muy deprisa en las primeras horas.`,
  `Horas después, el polvo de la nube se posa sobre una franja hacia ${dir}: unos ${area} kilómetros cuadrados hasta ${reach} kilómetros. Quien esté ahí debe ponerse a cubierto cuanto antes.`,
];
export const balanceLines = (deaths: string, injured: string, fall: string) => [
  `En las primeras horas habría unos ${deaths} muertos y ${injured} heridos${fall}. En el mapa, cuanto más intenso es el color, más víctimas por kilómetro cuadrado. Son estimaciones con modelos científicos públicos: la realidad dependería de muchos más factores.`,
  `El balance de las primeras horas: unos ${deaths} muertos y ${injured} heridos${fall}. El color del mapa muestra dónde se concentran las víctimas. Son cálculos con modelos públicos, no predicciones exactas.`,
  `Unos ${deaths} muertos y ${injured} heridos en las primeras horas${fall}. El mapa colorea cada zona según las víctimas por kilómetro cuadrado. La cifra real podría ser mayor o menor.`,
  `Cuando todo pasa, quedan unos ${deaths} muertos y ${injured} heridos${fall}. Las zonas más oscuras del mapa son las que más víctimas tienen. Es una estimación: la realidad dependería de muchos factores.`,
  `Las cifras de las primeras horas: unos ${deaths} muertos y ${injured} heridos${fall}. En el mapa, el color muestra la densidad de víctimas.`,
  `Al final del día, el balance sería de unos ${deaths} muertos y ${injured} heridos${fall}. Los colores del mapa indican dónde hay más víctimas por kilómetro cuadrado.`,
  `Unos ${deaths} muertos y ${injured} heridos${fall}. Son números calculados con modelos científicos públicos, no una predicción exacta.`,
  `El precio de una sola explosión: unos ${deaths} muertos y ${injured} heridos${fall}. El mapa colorea las zonas según el número de víctimas.`,
  `Esto es lo que dejaría tras de sí: unos ${deaths} muertos y ${injured} heridos${fall}. La realidad podría ser distinta, según la hora, el tiempo y el refugio.`,
  `En las primeras horas: unos ${deaths} muertos y ${injured} heridos${fall}. Las zonas más intensas del mapa concentran la mayoría.`,
];
export const emptyLines = () => [
  'Por suerte, la zona afectada está casi deshabitada.',
  'Afortunadamente, en esta zona casi no vive nadie.',
  'La zona está casi vacía: las víctimas serían muy pocas.',
  'Casi no hay población en la zona, así que las víctimas serían escasas.',
  'Por fortuna, aquí casi no vive nadie.',
  'La zona apenas está habitada: los daños humanos serían pequeños.',
  'Es una zona casi deshabitada, y eso salva muchas vidas.',
  'Con tan poca gente alrededor, el número de víctimas sería muy bajo.',
];
