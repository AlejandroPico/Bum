/** Vídeos y animaciones de Wikimedia Commons (enlazados, con autoría y licencia). */
export interface VidRef { file: string; caption: string; kind: 'video' | 'gif'; w?: number; h?: number; credit?: string; license?: string }
export const VIDEOS: Record<string, VidRef[]> = {
  "prueba-trinity": [
    {"file": "Trinity and Beyond Clip.webm", "caption": "Trinity, 16 de julio de 1945: la detonación filmada por las cámaras del Proyecto Manhattan (fragmento del documental «Trinity and Beyond»).", "kind": "video", "w": 852, "h": 480, "credit": "US Army", "license": "Public domain"},
    {"file": "TrinityFireballGif.gif", "caption": "La bola de fuego de Trinity en sus primeras décimas de segundo.", "kind": "gif", "w": 312, "h": 175, "credit": "USDE", "license": "Public domain"},
  ],
  "cat-trinity-ee-uu-1945": [
    {"file": "Trinity and Beyond Clip.webm", "caption": "Trinity filmada desde los búnkeres de observación.", "kind": "video", "w": 852, "h": 480, "credit": "US Army", "license": "Public domain"},
  ],
  "castle-bravo": [
    {"file": "Castle Bravo Detonation USDE.ogv", "caption": "Película del Departamento de Energía de EE. UU. sobre Castle Bravo (1954), la mayor prueba estadounidense.", "kind": "video", "w": 1280, "h": 720, "credit": "US DoE", "license": "Public domain"},
  ],
  "cat-castle-bravo-ee-uu-1954": [
    {"file": "Castle Bravo Detonation USDE.ogv", "caption": "Castle Bravo, 1 de marzo de 1954.", "kind": "video", "w": 1280, "h": 720, "credit": "US DoE", "license": "Public domain"},
  ],
  "operacion-crossroads": [
    {"file": "OPERATIONS CROSSROADS, ATOM BOMB TEST, BIKINI ATOLL 111-adc-7171 HD 2Mbps.webm", "caption": "Película original de la operación Crossroads en el atolón de Bikini (1946), con las pruebas Able y Baker.", "kind": "video", "w": 1920, "h": 1080, "credit": "Department of Defense. Department of the Army. Office of the Chief Signal Office", "license": "Public domain"},
  ],
  "nube-de-hongo": [
    {"file": "Able Shot.ogv", "caption": "La prueba Able (Crossroads, 1946) filmada desde varios ángulos: se ve cómo crece la nube.", "kind": "video", "w": 1280, "h": 720, "credit": "United States Department of Energy, United States Navy", "license": "Public domain"},
  ],
  "ivy-mike": [
    {"file": "Ivy Mike test.ogv", "caption": "Película de alta velocidad de la bola de fuego de Ivy Mike (1952), la primera bomba de hidrógeno.", "kind": "video", "w": 1280, "h": 720, "credit": "United States Department of Energy", "license": "Public domain"},
  ],
  "cat-ivy-mike-ee-uu-1952": [
    {"file": "Ivy Mike test.ogv", "caption": "La bola de fuego de Ivy Mike filmada a alta velocidad.", "kind": "video", "w": 1280, "h": 720, "credit": "United States Department of Energy", "license": "Public domain"},
  ],
  "onda-expansiva": [
    {"file": "House No. 1 Yucca Flat (1953-03-17).gif", "caption": "La casa n.º 1 de la operación Doorstep (1953), a 1 100 m de una explosión de 16 kt: la onda de choque la destroza en dos segundos.", "kind": "gif", "w": 900, "h": 504, "credit": "U.S. Department of Defense.", "license": "Public domain"},
  ],
  "explosiones-aereas-y-de-superficie": [
    {"file": "AtomicBlastsOperationsGreenhouseThroughUphotKnothole.webm", "caption": "Recopilación de explosiones de las operaciones Greenhouse a Upshot-Knothole (1951–1953): explosiones en torre, desde avión y en superficie.", "kind": "video", "w": 960, "h": 720, "credit": "United States. Departm", "license": "CC0"},
  ],
  "pulso-electromagnetico": [
    {"file": "High Altitude Weapons Effects 1962 AEC DOMINIC STARFISH PRIME CHECKMATE BLUEGILL KINGFISH TIGHTROPE.webm", "caption": "Película de la AEC sobre las explosiones a gran altitud de 1962 (Starfish Prime, Checkmate, Bluegill…), con las auroras artificiales que provocaron.", "kind": "video", "w": 1104, "h": 589, "credit": "AEC / USDE", "license": "Public domain"},
  ],
  "cat-starfish-prime-ee-uu-1962": [
    {"file": "High Altitude Weapons Effects 1962 AEC DOMINIC STARFISH PRIME CHECKMATE BLUEGILL KINGFISH TIGHTROPE.webm", "caption": "Starfish Prime y las demás pruebas a gran altitud de 1962.", "kind": "video", "w": 1104, "h": 589, "credit": "AEC / USDE", "license": "Public domain"},
  ],
  "hiroshima": [
    {"file": "President Harry S. Truman on the Atomic Bombing of Hiroshima (1945).webm", "caption": "El presidente Truman anuncia el bombardeo de Hiroshima (6 de agosto de 1945).", "kind": "video", "w": 1440, "h": 1080, "credit": "Harry S. Truman Presidential Library", "license": "Public domain"},
  ],
  "atomo": [
    {"file": "Bohr atom animation.gif", "caption": "El modelo de Bohr: el electrón salta entre órbitas permitidas y emite o absorbe luz.", "kind": "gif", "w": 550, "h": 400, "credit": "Kurzon", "license": "CC BY-SA 3.0"},
    {"file": "Planetary atom decay.gif", "caption": "Por qué el átomo «planetario» clásico no funciona: el electrón radiaría energía y caería en espiral al núcleo.", "kind": "gif", "w": 480, "h": 480, "credit": "Jacopo Bertolotti", "license": "CC0"},
  ],
  "fision": [
    {"file": "Fisión nuclear.gif", "caption": "Fisión de un núcleo pesado al absorber un neutrón: se parte en dos fragmentos y libera más neutrones.", "kind": "gif", "w": 640, "h": 259, "credit": "Esteban Moya Morales", "license": "CC BY 4.0"},
  ],
  "fusion": [
    {"file": "Fusion de deux noyaux.gif", "caption": "Modelo de la fusión de dos núcleos atómicos: las formas sucesivas que adopta el conjunto.", "kind": "gif", "w": 640, "h": 480, "credit": "BernieBelon", "license": "CC BY-SA 4.0"},
    {"file": "National Ignition Facility achieves fusion ignition.webm", "caption": "El Laboratorio Lawrence Livermore anuncia la ignición por fusión en el National Ignition Facility (diciembre de 2022).", "kind": "video", "w": 1280, "h": 720, "credit": "Lawrence Livermore National Laboratory", "license": "Public domain"},
  ],
  "radiactividad": [
    {"file": "Wilson chamber.webm", "caption": "Cámara de niebla de Wilson: las estelas son partículas radiactivas y rayos cósmicos que atraviesan vapor sobresaturado.", "kind": "video", "w": 1920, "h": 1080, "credit": "Bilovitskiy", "license": "CC BY 4.0"},
    {"file": "Half Life.gif", "caption": "El periodo de semidesintegración: cada cierto tiempo se desintegra la mitad de los núcleos que quedan.", "kind": "gif", "w": 354, "h": 348, "credit": "Kieran Maher", "license": "Public domain"},
  ],
  "misil-balistico": [
    {"file": "Minuteman GT 245 Operational Test Launch - LF-10 Vandenberg Space Force Base CA - 9 Feb 2023.webm", "caption": "Lanzamiento de prueba de un Minuteman III desde la base de Vandenberg (California).", "kind": "video", "w": 1024, "h": 576, "credit": "SSGT Draeke Layman, Space Launch Delta 30 Public Affairs", "license": "Public domain"},
    {"file": "Trident II UGM-133A D5LE Missile from USS Wyoming, 2021.webm", "caption": "Lanzamiento de un Trident II D5LE desde el submarino USS Wyoming (2021).", "kind": "video", "w": 1920, "h": 1080, "credit": "US Navy Strategic Systems Programs", "license": "Public domain"},
  ],
  "triada-nuclear": [
    {"file": "Trident II UGM-133A D5LE Missile from USS Wyoming, 2021.webm", "caption": "La pata marítima: un Trident II sale del agua tras ser lanzado desde un submarino sumergido.", "kind": "video", "w": 1920, "h": 1080, "credit": "US Navy Strategic Systems Programs", "license": "Public domain"},
  ],
  "cheliabinsk": [
    {"file": "Chelyabinsk meteor security camera footage, Yekaterinburg.webm", "caption": "El bólido de Cheliábinsk grabado por una cámara de seguridad en Ekaterimburgo, a más de 200 km.", "kind": "video", "w": 1280, "h": 720, "credit": "Cámara de seguridad (autor desconocido)", "license": "Public domain"},
    {"file": "2013 Russian meteor event (Magnitogorsk).webm", "caption": "El mismo bólido desde la cámara de un coche en Magnitogorsk.", "kind": "video", "w": 1280, "h": 720, "credit": "Noo4891", "license": "Public domain"},
  ],
  "cat-cheliabinsk-rusia-2013": [
    {"file": "Chelyabinsk meteor security camera footage, Yekaterinburg.webm", "caption": "El bólido de Cheliábinsk, 15 de febrero de 2013.", "kind": "video", "w": 1280, "h": 720, "credit": "Cámara de seguridad (autor desconocido)", "license": "Public domain"},
  ],
  "defensa-planetaria": [
    {"file": "Dart impact replay.webm", "caption": "Los últimos cinco minutos y medio de DART antes de chocar con Dimorphos (26 de septiembre de 2022), acelerados.", "kind": "video", "w": 1920, "h": 1080, "credit": "NASA/Johns Hopkins APL", "license": "Public domain"},
    {"file": "Hubble timelapse of Dimorphos ejecta (September 26-27).gif", "caption": "El Hubble sigue la nube de escombros que levantó el impacto de DART.", "kind": "gif", "w": 440, "h": 440, "credit": "Science: NASA, ESA, Jian-Yang Li (PSI); Animation: Alyssa Pagan (STScI)", "license": "Public domain"},
  ],
  "cat-dimorphos-hipotetico": [
    {"file": "Dart impact replay.webm", "caption": "La aproximación final de DART a Dimorphos.", "kind": "video", "w": 1920, "h": 1080, "credit": "NASA/Johns Hopkins APL", "license": "Public domain"},
  ],
  "shoemaker-levy-9": [
    {"file": "Comet Impact 1994 Animation Reel.webm", "caption": "Simulaciones por ordenador del choque de los fragmentos del cometa con Júpiter (1994).", "kind": "video", "w": 640, "h": 480, "credit": "NASA STI Program", "license": "Public domain"},
    {"file": "Impact site of fragment G.gif", "caption": "La mancha del fragmento G evolucionando en la atmósfera de Júpiter.", "kind": "gif", "w": 744, "h": 460, "credit": "Credit: Hubble Space Telescope Jupiter Imaging Team.", "license": "Public domain"},
  ],
  "asteroides-y-cometas": [
    {"file": "Triple asteroid 3122 Florence.gif", "caption": "Imágenes de radar de Arecibo del asteroide Florence y sus dos pequeñas lunas (2017).", "kind": "gif", "w": 401, "h": 277, "credit": "NAICObservatory/NASA", "license": "Public domain"},
  ],
  "cat-apophis-hipotetico": [
    {"file": "Asteroid Apophis 2029 Earth Flyby – Orbit Visualizations (SVS5651 - apophis 2029 flyby ride-along 2160p60).webm", "caption": "Visualización de la NASA del paso de Apophis junto a la Tierra en abril de 2029.", "kind": "video", "w": 3840, "h": 2160, "credit": "NASA's Scientific Visualization Studio - Science and Technology Corporation/Kel ", "license": "Public domain"},
  ],
  "chicxulub": [
    {"file": "ChicxulubImpact.webm", "caption": "Modelo numérico del impacto de Chicxulub: formación del cráter en los primeros minutos.", "kind": "video", "w": 320, "h": 240, "credit": "MCCONM", "license": "CC BY-SA 4.0"},
  ],
  "cat-chicxulub-extincion-k-pg": [
    {"file": "ChicxulubImpact.webm", "caption": "Simulación numérica de la formación del cráter de Chicxulub.", "kind": "video", "w": 320, "h": 240, "credit": "MCCONM", "license": "CC BY-SA 4.0"},
  ],
  "proteccion-civil": [
    {"file": "Duck and Cover (1951).webm", "caption": "«Duck and Cover» (1951), la película de la Defensa Civil de EE. UU. con la tortuga Bert que se proyectaba en los colegios.", "kind": "video", "w": 1440, "h": 1080, "credit": "United States Office of Civil Defense and National Education Association of the ", "license": "Public domain"},
  ],
  "crisis-de-los-misiles": [
    {"file": "To the Brink- JFK and the Cuban Missile Crisis.webm", "caption": "«To the Brink», documental de los Archivos Nacionales de EE. UU. sobre la crisis de los misiles.", "kind": "video", "w": 1920, "h": 1080, "credit": "US National Archives", "license": "Public domain"},
    {"file": "1962-10-25 The Cuban Crisis.ogg", "caption": "Noticiario de Universal del 25 de octubre de 1962, en plena crisis.", "kind": "video", "w": 400, "h": 300, "credit": "Production Company Universal Studios", "license": "CC0"},
  ],
  "chernobil": [
    {"file": "Reactor Hall of Unit 2, Chernobyl Nuclear Power Plant.webm", "caption": "La sala del reactor de la unidad 2 de Chernóbil, gemela de la unidad 4 que explotó.", "kind": "video", "w": 1920, "h": 1080, "credit": "Carl Willis", "license": "CC BY 3.0"},
  ],
};
