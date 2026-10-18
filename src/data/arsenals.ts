/**
 * Arsenales nucleares del mundo, 1945–2026: cabezas nucleares de cada país año a año (inventario
 * militar, desplegadas y en reserva; sin contar las retiradas a la espera de ser desmontadas). Estimaciones de la Federation of American Scientists (Kristensen,
 * Korda y Johns, «Status of World Nuclear Forces»), recopiladas por Our World in Data.
 */
export const ARS_Y0 = 1945, ARS_Y1 = 2026;
export const ARSENALS: { id: string; name: string; color: string; lat: number; lon: number; n: number[] }[] = [
  { id: 'USA', name: 'Estados Unidos', color: '#4f8ff7', lat: 39.5, lon: -98.5, n: [2,9,13,50,170,299,438,841,1169,1703,2422,3692,5543,7345,12298,18638,22229,25540,28133,29463,31139,31175,31255,29561,27552,26008,25830,26516,27835,28537,27519,25914,25542,24418,24138,24104,23208,22886,23305,23459,23368,23317,23575,23205,22217,21392,19008,13708,11511,10979,10904,11011,10903,10732,10685,10577,10526,10457,10027,8570,8360,7853,5709,5273,5113,5066,4897,4881,4804,4717,4571,4018,3822,3785,3805,3750,3713,3768,3748,3708,3700,3700] },
  { id: 'RUS', name: 'URSS / Rusia', color: '#ef4444', lat: 60, lon: 92, n: [0,0,0,0,1,5,25,50,120,150,200,426,660,863,1048,1627,2492,3346,4259,5242,6144,7091,8400,9490,10671,11736,13279,14600,15878,17286,19235,22165,24281,26169,28258,30665,32146,33486,35130,36825,38582,40159,38107,36538,35078,32980,29154,26734,24403,21339,18179,15942,15442,14368,13188,12188,11152,10114,9076,8038,7000,6643,6286,5929,5527,5215,4858,4750,4650,4600,4500,4490,4300,4350,4330,4310,4495,4477,4489,4380,4309,4400] },
  { id: 'GBR', name: 'Reino Unido', color: '#c084fc', lat: 53, lon: -1.8, n: [0,0,0,0,0,0,0,0,1,5,10,50,58,60,78,105,155,211,256,271,271,281,355,317,306,375,412,423,500,500,500,500,500,500,500,500,500,385,380,350,350,350,350,350,350,350,350,250,250,250,234,203,203,240,240,280,280,280,280,280,280,245,245,245,245,225,225,225,225,225,225,225,225,225,225,225,225,225,225,225,225,225] },
  { id: 'FRA', name: 'Francia', color: '#2dd4bf', lat: 46.6, lon: 2.4, n: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,32,36,36,36,36,36,45,70,116,145,188,212,228,235,235,250,274,274,279,280,360,355,420,410,410,505,540,540,525,510,500,450,450,450,450,470,350,350,350,350,350,350,350,300,300,300,300,300,300,300,300,300,300,300,300,290,290,290,290,290,290,290] },
  { id: 'CHN', name: 'China', color: '#facc15', lat: 35, lon: 103, n: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,20,25,35,50,75,100,130,150,170,180,180,180,190,195,205,210,216,218,220,222,224,226,228,230,232,234,234,234,234,234,234,232,232,232,232,235,235,235,235,235,235,235,235,240,240,240,240,250,250,260,260,270,280,290,350,370,390,410,500,600,620] },
  { id: 'ISR', name: 'Israel', color: '#7dd3fc', lat: 31.2, lon: 34.9, n: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,4,6,8,11,13,15,17,20,22,24,26,29,31,33,35,38,40,42,44,47,49,51,53,56,58,60,62,63,64,66,68,70,72,74,76,78,80,80,80,80,80,80,80,80,80,80,80,80,80,80,80,80,90,90,90,90,90,90,90] },
  { id: 'IND', name: 'India', color: '#fb923c', lat: 22.5, lon: 79, n: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,8,13,18,23,28,33,38,43,50,60,70,80,90,100,100,100,110,120,130,140,140,150,160,160,164,172,180,190] },
  { id: 'PAK', name: 'Pakistán', color: '#4ade80', lat: 30, lon: 69.5, n: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,8,14,20,26,32,38,44,50,60,70,80,90,100,110,115,120,125,130,140,150,150,160,165,165,170,170,170,170] },
  { id: 'PRK', name: 'Corea del Norte', color: '#f472b6', lat: 40.2, lon: 127.2, n: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,5,5,10,15,15,20,25,30,50,50,60] },
  { id: 'ZAF', name: 'Sudáfrica', color: '#94a3b8', lat: -29, lon: 24.5, n: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,4,5,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
];

/** tratados e hitos (año con decimales y texto) */
export const ARS_EVENTS: [number, string][] = [
  [1945.6, 'Hiroshima y Nagasaki: Estados Unidos es el único país con armas nucleares'],
  [1949.66, 'La URSS prueba su primera bomba: empieza la carrera'],
  [1952.8, 'El Reino Unido se une; Estados Unidos prueba la primera bomba de hidrógeno'],
  [1960.1, 'Francia prueba su primera bomba'],
  [1962.8, 'Crisis de los misiles de Cuba: el mundo, al borde de la guerra nuclear'],
  [1963.6, 'Tratado de prohibición parcial: se acaban las pruebas en la atmósfera, el mar y el espacio'],
  [1964.8, 'China prueba su primera bomba'],
  [1967.0, 'Máximo del arsenal de Estados Unidos: 31 255 cabezas'],
  [1968.5, 'Tratado de No Proliferación (TNP)'],
  [1972.4, 'SALT I y Tratado ABM: primeros límites entre las dos superpotencias'],
  [1979.5, 'SALT II (firmado, nunca ratificado)'],
  [1986.0, 'Máximo mundial: unas 64 000 cabezas en los arsenales (más de 70 000 contando las retiradas)'],
  [1987.95, 'Tratado INF: se eliminan todos los misiles de alcance intermedio en Europa'],
  [1991.55, 'START I; en diciembre se disuelve la URSS'],
  [1993.2, 'Sudáfrica revela que fabricó seis bombas y las desmontó'],
  [1996.7, 'Tratado de Prohibición Completa de los Ensayos (aún sin entrar en vigor)'],
  [1998.4, 'India y Pakistán prueban sus bombas'],
  [2006.8, 'Primera prueba nuclear de Corea del Norte'],
  [2010.3, 'Nuevo START: 1550 cabezas desplegadas por bando'],
  [2017.5, 'Tratado sobre la Prohibición de las Armas Nucleares (en vigor desde 2021)'],
  [2019.6, 'Fin del Tratado INF'],
  [2023.15, 'Rusia suspende su participación en el Nuevo START'],
  [2026.1, 'Expira el Nuevo START (5 de febrero de 2026)'],
];
