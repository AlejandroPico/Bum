import type { ImgRef } from '../types';
import type { VidRef } from './videos';

/**
 * Segunda tanda de fotografías, vídeos y animaciones de Wikimedia Commons (versión 1.21): imágenes
 * para los artículos nuevos y para los que no tenían, y vídeos o GIF para los que no tenían ninguno.
 * Se suman a las de media.ts y videos.ts (las fotos, detrás de las que ya hubiera).
 */
export const IMAGES_EXTRA: Record<string, ImgRef[]> = {
  "invierno-nuclear": [
    {"file": "KuwaitiOilFires-STS037-152-91-(2).jpg", "caption": "Humo de los pozos de petróleo incendiados en Kuwait (1991) visto desde el transbordador espacial. Fue la mayor prueba real de cuánto humo puede subir y cuánto tarda en caer.", "credit": "NASA", "license": "Public domain"},
    {"file": "Global temperature changes after nuclear winter.jpg", "caption": "Mapas de la CIA con el cambio de temperatura a los 40 días (arriba) y a los 243 días (abajo) de un intercambio nuclear, según los modelos de los años ochenta.", "credit": "CIA", "license": "Public domain"},
    {"file": "Pyrocumulonimbus Argentina 2018.png", "caption": "Un pirocumulonimbo, nube de tormenta creada por un gran incendio, sube el humo hasta la estratosfera: el mecanismo que alimenta el invierno nuclear.", "credit": "NASA", "license": "Public domain"},
    {"file": "Nuclear winter nrc.PNG", "caption": "Gráfico del Consejo Nacional de Investigación de EE. UU. sobre el enfriamiento tras un intercambio nuclear.", "credit": "National Research Council", "license": "Public domain"},
  ],
  "relato-hiroshima": [
    {"file": "Hiroshima Peace Memorial (Genbaku Dome), 20240817 0823 4200.jpg", "caption": "La Cúpula de la Bomba Atómica de Hiroshima, el único edificio que quedó en pie cerca del hipocentro, conservada como memorial.", "credit": "Jakub Hałun", "license": "CC BY 4.0"},
    {"file": "HiroshimaMarcelJunod7028.jpg", "caption": "Hiroshima tras la bomba, en una fotografía de la colección de Marcel Junod, el médico del Comité Internacional de la Cruz Roja que llegó a la ciudad en septiembre de 1945.", "license": "Public domain"},
  ],
  "relato-crisis-de-cuba": [
    {"file": "Soviet-R-12-nuclear-ballistic missile.jpg", "caption": "Un misil soviético R-12 (SS-4) como los que se instalaron en Cuba en 1962, en una foto de la CIA.", "credit": "CIA", "license": "Public domain"},
    {"file": "Cuban Missile Crisis 1962 (15332098127).jpg", "caption": "Documentación de la crisis de los misiles conservada en los archivos de Nueva Zelanda.", "credit": "Archives New Zealand", "license": "CC BY-SA 2.0"},
  ],
  "relato-chernobil": [
    {"file": "IAEA 02790015 (5613115146).jpg", "caption": "El reactor 4 de Chernóbil poco después del accidente, en una imagen del archivo del OIEA.", "credit": "IAEA Imagebank", "license": "CC BY-SA 2.0"},
    {"file": "SPOT-1-1986-05-01-Tchernobyl-PAN.jpg", "caption": "La central de Chernóbil vista por el satélite francés SPOT-1 el 1 de mayo de 1986, cinco días después de la explosión.", "credit": "CNES / SPOT", "license": "Licence Ouverte"},
    {"file": "Chernobyl nuclear disaster aftermath abandoned town of Pripyat 02.jpg", "caption": "Prípiat, la ciudad de los trabajadores de la central, evacuada el 27 de abril de 1986 y abandonada desde entonces.", "credit": "Hnapel", "license": "CC0"},
  ],
  "chernobil": [
    {"file": "SPOT-1-1986-05-01-Tchernobyl-PAN.jpg", "caption": "La central vista desde el espacio el 1 de mayo de 1986.", "credit": "CNES / SPOT", "license": "Licence Ouverte"},
  ],
  "guerra-nuclear": [
    {"file": "Peacekeeper-missile-testing.jpg", "caption": "Ojivas de prueba de un misil Peacekeeper reentrando sobre el atolón de Kwajalein (fotografía de larga exposición). Cada trazo es una ojiva independiente.", "credit": "US Army", "license": "Public domain"},
    {"file": "LAUNCH CONTROL CAPSULE. ACOUSTICAL ENCLOSURE. COMMUNICATIONS CONSOLE AT LEFT; LAUNCH CONTROL CONSOLE AT RIGHT. PADLOCKED PANEL AT TOP CENTER CONTAINS MISSILE LAUNCH KEYS. HAER COLO,62-NERAY.V,1-27.tif", "caption": "Cápsula de control de lanzamiento de misiles Minuteman III: la caja con candado guardaba las llaves de lanzamiento.", "credit": "Historic American Engineering Record", "license": "Public domain"},
    {"file": "Able Archer 83 After Action Report.jpg", "caption": "Informe del ejercicio Able Archer 83 de la OTAN, que en noviembre de 1983 la URSS llegó a temer que encubriera un ataque real.", "credit": "US Air Force", "license": "Public domain"},
    {"file": "Doomsday Clock Graph 2007.png", "caption": "El Reloj del Apocalipsis del Boletín de Científicos Atómicos: minutos que faltaban para la medianoche en cada momento de la Guerra Fría.", "credit": "Fastfission", "license": "CC BY-SA 3.0"},
  ],
  "ver-una-explosion-de-lejos": [
    {"file": "Nuclear spectators.jpg", "caption": "Observadores de la OTAN ante la prueba Boltzmann (Nevada, 28 de mayo de 1957): gafas oscuras, de espaldas al destello o tapándose los oídos.", "credit": "US Government", "license": "Public domain"},
    {"file": "Plumbbob John 006.jpg", "caption": "Cinco oficiales se quedaron de pie justo debajo de la explosión aérea John (1957), a 5,6 km de altura, para demostrar que el suelo bajo una explosión alta era seguro.", "credit": "US Government", "license": "Public domain"},
    {"file": "NNSA-NSO-140.jpg", "caption": "Alvin Graves, director de las pruebas, en News Nob, la colina desde la que la prensa y los observadores seguían las explosiones de Nevada (1953).", "credit": "NNSA / Nevada Site Office", "license": "Public domain"},
  ],
  "sanidad-y-hospitales": [
    {"file": "Blast-damaged celings and partions, Red Cross Hospital, Hiroshima.jpg", "caption": "Techos y tabiques destrozados en el Hospital de la Cruz Roja de Hiroshima, a unos 1,5 km del hipocentro: uno de los pocos hospitales que siguió funcionando.", "credit": "US Government", "license": "Public domain"},
    {"file": "Hiroshima red cross hospital october 1945.jpg", "caption": "El Hospital de la Cruz Roja de Hiroshima en octubre de 1945.", "credit": "Shunkichi Kikuchi", "license": "Public domain"},
    {"file": "HiroshimaMarcelJunod7028.jpg", "caption": "Hiroshima tras la bomba (colección de Marcel Junod). El médico del CICR llegó en septiembre de 1945 con 15 toneladas de material médico.", "license": "Public domain"},
  ],
  "los-dias-despues": [
    {"file": "Living room after blast, Welfare photos of Operation Cue Atomic Explosion, May 5, 1955, by the Federal Civil Defense Administration, from the Digital Commonwealth - commonwealth h128s1975.jpg", "caption": "Una sala de estar tras la explosión de la operación Cue (Nevada, 1955), en la que la defensa civil estadounidense probó casas, refugios y suministros.", "credit": "Federal Civil Defense Administration", "license": "Public domain"},
    {"file": "Fallout shelter sign, Madison, Minnesota.jpg", "caption": "Señal de refugio antiatómico en un edificio de Minnesota: la red de refugios públicos de los años sesenta.", "credit": "Myotus", "license": "CC0"},
  ],
  "dispersion-de-la-lluvia-radiactiva": [
    {"file": "Bravo Fallout.jpg", "caption": "Mapa de la lluvia radiactiva de Castle Bravo (1954): la mancha se alargó más de 500 km a favor del viento.", "credit": "US DoE", "license": "Public domain"},
    {"file": "Fukushima trajectory animation for days 10 to 21 after the accident.gif", "caption": "Trayectorias calculadas del aire que salió de Fukushima entre los días 10 y 21 del accidente: el mismo tipo de cálculo que usa el simulador.", "credit": "Jtmonone2", "license": "Public domain"},
  ],
  "defensa-antimisiles": [
    {"file": "FTG-12 GROUND-BASED INTERCEPTOR LAUNCHES FROM VSFB (8162773).jpg", "caption": "Lanzamiento de un interceptor GBI desde la base de Vandenberg (California) en la prueba FTG-12.", "credit": "US Space Force / Kadielle Shaw", "license": "Public domain"},
    {"file": "THAAD missile launch in 2005 -1.jpg", "caption": "Lanzamiento de prueba de un interceptor THAAD (2005).", "credit": "Missile Defense Agency", "license": "Public domain"},
    {"file": "ABM Pushkino.jpg", "caption": "Ilustración del Pentágono (1983) del sistema antimisiles de Moscú, el único operativo del mundo durante décadas: el gran radar de Pushkino y los nuevos interceptores en silos.", "credit": "Ronald C. Wittmann", "license": "Public domain"},
    {"file": "Patriot missile firing during Balikatan 2023.jpg", "caption": "Disparo de un misil Patriot durante unas maniobras en Filipinas (2023).", "credit": "US Marine Corps / Tyler Andrews", "license": "Public domain"},
    {"file": "Iron Dome in Operation Protective Edge.jpg", "caption": "Batería de la Cúpula de Hierro israelí, pensada para cohetes de corto alcance.", "credit": "Israel Defense Forces", "license": "CC BY 2.0"},
  ],
  "roturas-de-presas": [
    {"file": "Teton Dam failure.jpg", "caption": "La presa de Teton (Idaho) en el momento de romperse, el 5 de junio de 1976.", "credit": "US Bureau of Reclamation", "license": "Public domain"},
    {"file": "Diga del Vajont vista da Erto.jpg", "caption": "La presa de Vajont (Italia), intacta: en 1963 un deslizamiento cayó en el embalse y la ola que saltó por encima mató a casi 2000 personas.", "credit": "VENET01", "license": "CC BY-SA 4.0"},
    {"file": "Flooding of Rexburg Idaho Caused by Teton Dam Failure - DPLA - 56a24dca0c2049bcab3fe9733b5f8cf3.jpg", "caption": "Rexburg (Idaho) inundada por la rotura de la presa de Teton.", "credit": "US Bureau of Reclamation", "license": "Public domain"},
    {"file": "Banqiaomap.png", "caption": "Mapa de la catástrofe de Banqiao (China, 1975), la peor rotura de presas de la historia.", "credit": "Rolfmueller", "license": "CC BY-SA 3.0"},
  ],
  "erupciones-volcanicas": [
    {"file": "Eruption of Mount Pinatubo, June 15, 1991 (original resolution).jpg", "caption": "La erupción del Pinatubo (Filipinas) el 15 de junio de 1991: su nube enfrió el planeta medio grado durante dos años.", "credit": "NOAA / R. Lapointe, US Air Force", "license": "Public domain"},
    {"file": "Mount Tambora Volcano, Sumbawa Island, Indonesia.jpg", "caption": "La caldera del Tambora vista desde la Estación Espacial Internacional. Su erupción de 1815 causó el «año sin verano».", "credit": "NASA", "license": "Public domain"},
    {"file": "Pinatubo early eruption 1991.jpg", "caption": "Una de las primeras explosiones del Pinatubo, días antes de la gran erupción.", "credit": "T. J. Casadevall, USGS", "license": "Public domain"},
  ],
  "tormentas-solares": [
    {"file": "NASA's SDO Observes an X-class Solar Flare (15562323166).jpg", "caption": "Una fulguración de clase X fotografiada por el observatorio solar SDO de la NASA.", "credit": "NASA Goddard", "license": "Public domain"},
    {"file": "Carrington Richard drawing of 1859 sunspots.jpeg", "caption": "El dibujo de Richard Carrington de las manchas solares del 1 de septiembre de 1859, cuando vio la fulguración que provocó la mayor tormenta geomagnética registrada.", "credit": "Richard Carrington", "license": "Public domain"},
    {"file": "Magenta G5 aurora over Tuntorp, Lysekil Municipality 11.jpg", "caption": "Aurora de la tormenta extrema (G5) del 10 de mayo de 2024 vista desde el sur de Suecia.", "credit": "W.carter", "license": "CC BY-SA 4.0"},
    {"file": "VIIRS Aurora Borealis under North Pole.jpg", "caption": "La aurora boreal vista de noche desde un satélite meteorológico.", "credit": "NASA / NOAA", "license": "Public domain"},
  ],
  "apofis": [
    {"file": "PIA24168-Asteroid-99942Apophis-RadarImages-20210326.jpg", "caption": "Imágenes de radar de Apofis tomadas en marzo de 2021, cuando se descartó el riesgo de impacto durante al menos cien años.", "credit": "NASA/JPL-Caltech, NSF/AUI/GBO", "license": "Public domain"},
    {"file": "Apophis model comparison.png", "caption": "Forma de Apofis reconstruida a partir de las observaciones de radar.", "credit": "M. Brozović, L. Benner et al.", "license": "CC BY 4.0"},
  ],
  "2024-yr4": [
    {"file": "Asteroid 2024 YR4 (NIRCam and Webb images) (2024YR4).jpg", "caption": "El asteroide 2024 YR4 visto por el telescopio espacial James Webb en marzo de 2025: mide unos 60 m, como un edificio de quince plantas.", "credit": "NASA, ESA, CSA, STScI, A. Rivkin (JHU APL)", "license": "CC BY 4.0"},
    {"file": "2024 YR4 JWST NIRCam F150W 2025-03-08.png", "caption": "2024 YR4 en la imagen infrarroja del Webb del 8 de marzo de 2025.", "credit": "A. S. Rivkin et al./NASA/ESA", "license": "Public domain"},
  ],
};

export const VIDEOS_EXTRA: Record<string, VidRef[]> = {
  "implosion": [
    {"file": "Implosion bomb animated.gif", "caption": "El principio de la implosión: las lentes explosivas comprimen la esfera central de forma simétrica.", "kind": "gif", "w": 300, "h": 293, "credit": "Fastfission", "license": "Public domain"},
  ],
  "reaccion-en-cadena": [
    {"file": "UFission.gif", "caption": "Una reacción en cadena: cada fisión libera neutrones que provocan nuevas fisiones.", "kind": "gif", "w": 800, "h": 600, "credit": "Anynobody", "license": "CC BY-SA 3.0"},
  ],
  "hiroshima": [
    {"file": "Hiro.gif", "caption": "Representación del vuelo del Enola Gay sobre Hiroshima, la caída de Little Boy y la nube de hongo.", "kind": "gif", "w": 500, "h": 264, "credit": "Anynobody", "license": "CC BY 2.5"},
  ],
  "lluvia-radiactiva": [
    {"file": "CastleBravo1.gif", "caption": "La nube de Castle Bravo (1954), cuya lluvia radiactiva alcanzó atolones habitados y un pesquero japonés.", "kind": "gif", "w": 324, "h": 182, "credit": "USDE", "license": "Public domain"},
  ],
  "dispersion-de-la-lluvia-radiactiva": [
    {"file": "Fukushima trajectory animation from 2011-03-19 to 2011-03-25.gif", "caption": "Trayectorias del aire que salía de Fukushima del 19 al 25 de marzo de 2011: el viento cambia con la altura y con los días.", "kind": "gif", "w": 734, "h": 913, "credit": "Jtmonone2", "license": "CC BY-SA 3.0"},
  ],
  "radiactividad": [
    {"file": "Halflife-sim.gif", "caption": "Simulación de la semivida: los núcleos se desintegran al azar, pero la mitad lo hace siempre en el mismo tiempo.", "kind": "gif", "w": 100, "h": 188, "credit": "Sbyrnes321", "license": "Public domain"},
  ],
  "bomba-de-caida-libre": [
    {"file": "819666-F-35A DCA FWSD B61-12.webm", "caption": "Un caza F-35A lanza una bomba B61-12 inerte en una prueba de vuelo (2021).", "kind": "video", "w": 3840, "h": 2160, "credit": "US Air Force / Travis Minyon", "license": "Public domain"},
  ],
  "misil-de-crucero": [
    {"file": "USS Barry fires Tomahawk for Operation Odyssey Dawn.ogv", "caption": "El destructor USS Barry dispara un misil de crucero Tomahawk (2011).", "kind": "video", "w": 816, "h": 448, "credit": "US Navy", "license": "Public domain"},
  ],
  "torpedo-nuclear": [
    {"file": "Operation Wigwam test.ogv", "caption": "La prueba Wigwam (1955): una carga nuclear de profundidad explota a 610 m bajo el Pacífico.", "kind": "video", "w": 352, "h": 240, "credit": "US DoE", "license": "Public domain"},
  ],
  "tratados": [
    {"file": "President Reagan and Mikhail Gorbachev's Remarks and Signing of the INF Treaty on December 8, 1987.webm", "caption": "Reagan y Gorbachov firman el Tratado INF en la Casa Blanca, el 8 de diciembre de 1987: por primera vez se eliminaba una categoría entera de armas nucleares.", "kind": "video", "w": 654, "h": 480, "credit": "Reagan Library", "license": "CC BY 3.0"},
  ],
  "nagasaki": [
    {"file": "Tale of Two Cities (1946).webm", "caption": "«A Tale of Two Cities» (1946), película del ejército estadounidense sobre los efectos de las bombas en Hiroshima y Nagasaki.", "kind": "video", "w": 640, "h": 480, "credit": "US War Department", "license": "Public domain"},
  ],
  "proteccion-civil": [
    {"file": "Family Fallout Shelters Etc 1955.webm", "caption": "Película de la defensa civil estadounidense sobre los refugios familiares contra la lluvia radiactiva (1955).", "kind": "video", "w": 628, "h": 466, "credit": "US Department of Defense", "license": "Public domain"},
  ],
  "meteor-crater": [
    {"file": "Meteor Crater in Arizona, USA.webm", "caption": "Vuelo sobre el cráter Barringer (Meteor Crater), en Arizona.", "kind": "video", "w": 1920, "h": 1080, "credit": "Angel Schatz", "license": "CC BY 2.0"},
  ],
  "defensa-antimisiles": [
    {"file": "FTM-22 - Aegis Ballistic Missile Defense Flight Test Video (131003-A-MD123-007).webm", "caption": "Prueba FTM-22 (2013): un buque con el sistema Aegis lanza un SM-3 que destruye un misil blanco fuera de la atmósfera.", "kind": "video", "w": 1280, "h": 720, "credit": "Missile Defense Agency", "license": "Public domain"},
    {"file": "FET-01 THAAD Test (170730-O-AO981-156).webm", "caption": "Prueba del sistema THAAD (2017): intercepción de un misil de alcance medio en la fase final de su vuelo.", "kind": "video", "w": 1920, "h": 1080, "credit": "Missile Defense Agency / Leah Garton", "license": "Public domain"},
    {"file": "SM-3 missile launches and intercepts USA 193 satellite.ogv", "caption": "Un SM-3 destruye el satélite averiado USA-193 en 2008, a 247 km de altura.", "kind": "video", "w": 340, "h": 300, "credit": "US Department of Defense", "license": "Public domain"},
  ],
  "erupciones-volcanicas": [
    {"file": "Mount Saint Helens Recovery (SVS15005 - Mount Saint Helens).webm", "caption": "El monte Santa Helena visto por los satélites Landsat de 1979 a hoy: la erupción de 1980 y la lenta recuperación del bosque.", "kind": "video", "w": 5760, "h": 3240, "credit": "NASA Scientific Visualization Studio", "license": "Public domain"},
    {"file": "Volcanic eruption on La Palma creates concentric gravity waves (CIRA 2021-10-05).gif", "caption": "La erupción de La Palma (2021) desde un satélite: la columna crea ondas concéntricas en la atmósfera.", "kind": "gif", "w": 600, "h": 500, "credit": "CSU/CIRA & NOAA", "license": "Public domain"},
  ],
  "roturas-de-presas": [
    {"file": "Kakhovka dam destruction1.gif", "caption": "La presa de Kajovka (Ucrania) antes y después de su destrucción en junio de 2023, vista por el satélite Sentinel-2.", "kind": "gif", "w": 1200, "h": 597, "credit": "Copernicus Sentinel-2", "license": "Attribution"},
  ],
  "tormentas-solares": [
    {"file": "Largest Flare yet from Solar Cycle 25 (SVS14592 SDO X8pt7 flare May 14 2024 ProRes Outro).webm", "caption": "La mayor fulguración del ciclo solar 25 (X8,7, 14 de mayo de 2024), filmada por el SDO.", "kind": "video", "w": 3840, "h": 2160, "credit": "NASA Scientific Visualization Studio", "license": "Public domain"},
    {"file": "Coronal mass ejection hits Earth.gif", "caption": "Una eyección de masa coronal alcanza la magnetosfera terrestre (animación de la NASA).", "kind": "gif", "w": 670, "h": 377, "credit": "NASA Goddard / Tom Bridgman", "license": "Public domain"},
    {"file": "May 2024 aurora timelapse near Calgary.webm", "caption": "La aurora de la gran tormenta de mayo de 2024 a cámara rápida, cerca de Calgary (Canadá).", "kind": "video", "w": 1920, "h": 1080, "credit": "Sparweb's Projects", "license": "CC BY 3.0"},
  ],
  "apofis": [
    {"file": "Asteroid Apophis 2029 Earth Flyby – Animations (SVS20414 - Apophis Distance Animation Horizontal 4k).webm", "caption": "Lo cerca que pasará Apofis el 13 de abril de 2029: por dentro de la órbita de los satélites geoestacionarios.", "kind": "video", "w": 3840, "h": 2160, "credit": "NASA Scientific Visualization Studio", "license": "Public domain"},
    {"file": "Animation of 99942 Apophis orbit around Sun.gif", "caption": "La órbita de Apofis, que cruza la de la Tierra dos veces en cada vuelta al Sol.", "kind": "gif", "w": 560, "h": 420, "credit": "Phoenix7777", "license": "CC BY-SA 4.0"},
    {"file": "Apophis orbit diverted by Earth's gravity - NEO Toolkit ESA25472683.gif", "caption": "Cómo la gravedad de la Tierra desviará la órbita de Apofis en 2029 (ESA).", "kind": "gif", "w": 800, "h": 398, "credit": "ESA", "license": "CC BY-SA 3.0 IGO"},
  ],
  "2024-yr4": [
    {"file": "Near Earth Asteroid 2024 YR4 observed with the VLT.webm", "caption": "2024 YR4 moviéndose entre las estrellas, observado con el Very Large Telescope de ESO.", "kind": "video", "w": 1492, "h": 1080, "credit": "ESO/O. Hainaut et al.", "license": "CC BY 4.0"},
  ],
  "defensa-planetaria": [
    {"file": "Orbital effect of DART's impact on Dimorphos.webm", "caption": "Cómo cambió la órbita de Dimorfo alrededor de Dídimo tras el choque de DART: 33 minutos menos por vuelta.", "kind": "video", "w": 3840, "h": 2160, "credit": "NASA/Johns Hopkins APL/Jon Emmerich", "license": "Public domain"},
  ],
  "guerra-nuclear": [
    {"file": "How would a nuclear war between Russia and the US affect you personally? - Future of Life Institute.webm", "caption": "Resumen animado de lo que la ciencia sabe sobre las consecuencias de una guerra nuclear entre Rusia y EE. UU., incluido el invierno nuclear (en inglés).", "kind": "video", "w": 1920, "h": 1080, "credit": "Future of Life Institute", "license": "CC0"},
  ],
  "invierno-nuclear": [
    {"file": "2020 Creek Fire pyrocumulonimbus cloud formation.gif", "caption": "Formación de un pirocumulonimbo sobre el incendio Creek (California, 2020), visto por el satélite GOES-17: así sube el humo hacia la estratosfera.", "kind": "gif", "w": 624, "h": 653, "credit": "NOAA, GOES-17", "license": "Public domain"},
  ],
  "shoemaker-levy-9": [
    {"file": "Animation of Shoemaker-Levy 9's orbit around Jupiter.gif", "caption": "La órbita del cometa Shoemaker-Levy 9 alrededor de Júpiter hasta su choque en 1994.", "kind": "gif", "w": 560, "h": 420, "credit": "Phoenix7777", "license": "CC BY-SA 4.0"},
  ],
};
