import type { ImgRef } from '../types';

/**
 * Fotografías e ilustraciones de Wikimedia Commons, enlazadas (no copiadas) con su autoría y licencia.
 * La primera imagen de cada artículo es la de cabecera. Nada de planos de diseño ni fotos de víctimas.
 */
export const IMAGES: Record<string, ImgRef[]> = {
  "atomo": [
    {"file": "Rutherford-atom-for-carbon lg.jpg", "caption": "Modelo atómico de Rutherford para el carbono, dibujado por el propio Rutherford.", "credit": "Ernest Rutherford", "license": "Public domain"},
    {"file": "Solvay conference 1927 Version2.jpg", "caption": "Conferencia Solvay de 1927: Bohr, Einstein, Curie, Heisenberg, Schrödinger y otros fundadores de la física cuántica.", "credit": "Benjamin Couprie", "license": "Public domain"},
    {"file": "Ernest Rutherford 1908.jpg", "caption": "Ernest Rutherford hacia 1908, año de su Nobel de Química.", "credit": "Bain News Service, publisher", "license": "Public domain"},
    {"file": "Niels Bohr - LOC - ggbain - 35303.jpg", "caption": "Niels Bohr, autor del modelo atómico de capas (1913).", "credit": "Bain News Service, publisher Restored by: Bammesk", "license": "Public domain"},
  ],
  "isotopos": [
    {"file": "Uranium ore and \"yellowcake\" uranium concentrate at the Greifswald Nuclear Power Plant information center.jpg", "caption": "Mineral de uranio y concentrado «yellowcake» en la exposición de la central de Greifswald (Alemania).", "credit": "Siarhei Besarab</", "license": "CC BY-SA 4.0"},
    {"file": "\" The Calutron Girls\" Y-12 Oak Ridge 1944 Large Format (32093954911) (2).jpg", "caption": "Las «chicas del calutrón» de Oak Ridge (1944) separaban isótopos de uranio con espectrómetros de masas gigantes.", "credit": "doe-oakridge", "license": "Public domain"},
    {"file": "Pitchblende371.JPG", "caption": "Pechblenda, el mineral del que los Curie aislaron el radio.", "credit": "Geomartin (<a href=\"//commons.wikimedia.or", "license": "Public domain"},
  ],
  "radiactividad": [
    {"file": "Marie Curie in her Paris Laboratory, 1912.jpg", "caption": "Marie Curie en su laboratorio de París, 1912.", "credit": "unattributed", "license": "Public domain"},
    {"file": "Portrait of Antoine-Henri Becquerel.jpg", "caption": "Henri Becquerel, descubridor de la radiactividad (1896).", "credit": "Paul Nadar", "license": "Public domain"},
    {"file": "Pierre and Marie Curie at work in laboratory Wellcome L0001761.jpg", "caption": "Pierre y Marie Curie trabajando en su laboratorio.", "license": "CC BY 4.0"},
    {"file": "Portable Geiger counter Berthold LB122-02.jpg", "caption": "Contador Geiger portátil, el instrumento clásico para medir radiactividad.", "credit": "Lilly_M", "license": "CC BY-SA 3.0"},
  ],
  "fision": [
    {"file": "Hahn and Meitner in 1912.jpg", "caption": "Otto Hahn y Lise Meitner en su laboratorio de Berlín, 1912.", "credit": "Autor desconocido", "license": "Public domain"},
    {"file": "Nuclear Fission Experimental Apparatus 1938 - Deutsches Museum - Munich.jpg", "caption": "Mesa de trabajo con la que Hahn y Strassmann descubrieron la fisión en 1938 (Deutsches Museum, Múnich).", "credit": "J Brew", "license": "CC BY-SA 2.0"},
    {"file": "Otto Hahn's notebook 1938 - Deutsches Museum - Munich.jpg", "caption": "Cuaderno de laboratorio de Otto Hahn de 1938 (Deutsches Museum).", "credit": "J Brew", "license": "CC BY-SA 2.0"},
    {"file": "Lise Meitner (1878-1968), lecturing at Catholic University, Washington, D.C., 1946.jpg", "caption": "Lise Meitner dando una conferencia en Washington; ella y Frisch explicaron físicamente la fisión.", "credit": "Smithsonian Institution", "license": "Public domain"},
  ],
  "reaccion-en-cadena": [
    {"file": "Scale Model of CP-1.jpg", "caption": "Maqueta a escala de la Chicago Pile-1, el primer reactor nuclear (1942).", "credit": "Credit Line: Argonne National Laboratory, courtesy of AIP Emilio Segrè Visual Ar", "license": "Public domain"},
    {"file": "Stagg Field reactor.jpg", "caption": "Ilustración de la Chicago Pile-1 bajo las gradas del estadio Stagg Field.", "credit": "Melvin A. Miller of the Argonne National Laboratory", "license": "Public domain"},
    {"file": "Members of the Chicago Pile-1 team at the University of Chicago, 1946.jpg", "caption": "Parte del equipo de la Chicago Pile-1 en 1946, con Enrico Fermi en primera fila.", "credit": "National Security Research Center / Los Alamos National Laboratory", "license": "Attribution"},
    {"file": "Leo Szilard.jpg", "caption": "Leó Szilárd, que imaginó la reacción en cadena en 1933.", "credit": "U.S. Department of Energy", "license": "Public domain"},
  ],
  "masa-critica": [
    {"file": "Louis Slotin & Harry K. Daghlian Jr.jpg", "caption": "Louis Slotin y Harry Daghlian, los dos físicos que murieron en accidentes de criticidad en Los Álamos (1945–1946).", "credit": "Los Alamos Archive", "license": "Public domain"},
    {"file": "LANL Slotin Building.jpg", "caption": "Edificio de Los Álamos donde se realizaban los experimentos críticos.", "credit": "Los Alamos National Laboratory", "license": "Public domain"},
  ],
  "fusion": [
    {"file": "The Sun by the Atmospheric Imaging Assembly of NASA's Solar Dynamics Observatory - 20100819.jpg", "caption": "El Sol, un reactor de fusión natural, visto por el observatorio SDO de la NASA.", "credit": "NASA/SDO (AIA)", "license": "Public domain"},
    {"file": "National Ignition Facility's target chamber.jpg", "caption": "Cámara de blancos del National Ignition Facility (EE. UU.), donde se logró la ignición por fusión en 2022.", "credit": "Lawrence Livermore National Security", "license": "CC BY-SA 3.0"},
    {"file": "X5.4 solar flare seen by SDO in 171 Å extreme ultraviolet light.jpg", "caption": "Fulguración solar X5.4 vista en ultravioleta extremo.", "credit": "NASA/Goddard Space Flight Center", "license": "Public domain"},
  ],
  "energia-y-tnt": [
    {"file": "TNT Crystals2.jpg", "caption": "Cristales de TNT (trinitrotolueno), el explosivo que sirve de unidad para medir la energía.", "credit": "Wremmerswaal", "license": "CC BY-SA 4.0"},
    {"file": "TNT detonation on Kaho'olawe Island during Operation Sailor Hat, shot Bravo, 1965.jpg", "caption": "Detonación de 500 t de TNT en la isla de Kaho'olawe (operación Sailor Hat, 1965), usada para simular los efectos de una explosión nuclear.", "credit": "US Navy Employee", "license": "Public domain"},
    {"file": "Minor Scale Blast.jpg", "caption": "Prueba de explosivos convencionales Minor Scale (1985), unas 4 800 t de ANFO.", "credit": "U.S. Army", "license": "Public domain"},
  ],
  "uranio": [
    {"file": "Uranium ore and \"yellowcake\" uranium concentrate at the Greifswald Nuclear Power Plant information center.jpg", "caption": "Mineral de uranio y «yellowcake» (concentrado de óxido de uranio).", "credit": "Siarhei Besarab</", "license": "CC BY-SA 4.0"},
    {"file": "Yellowcake.jpg", "caption": "Yellowcake, el polvo amarillo que se obtiene al procesar el mineral.", "license": "Public domain"},
    {"file": "Ames Process uranium biscuit.jpg", "caption": "Lingote («biscuit») de uranio metálico del proceso Ames, Proyecto Manhattan.", "credit": "Autor desconocido", "license": "Public domain"},
    {"file": "World Uranium Mining Production 2021.png", "caption": "Producción mundial de uranio por países (2021).", "credit": "Liberum scientia", "license": "CC BY-SA 4.0"},
  ],
  "plutonio": [
    {"file": "Plutonium-238 pellet.jpg", "caption": "Pastilla de plutonio-238 incandescente por su propio calor de desintegración (para generadores espaciales).", "credit": "Plutonium_pellet.jpg: DOE Photo derivative work: <a href=\"//commons.wikimedia.or", "license": "Public domain"},
    {"file": "Worker holding a plutonium button.jpg", "caption": "Trabajador sosteniendo un «botón» de plutonio metálico.", "credit": "Federal government of the United States", "license": "Public domain"},
    {"file": "Hanford B Reactor.jpg", "caption": "El reactor B de Hanford, primer reactor de producción de plutonio del mundo (1944).", "credit": "Autor desconocido", "license": "Public domain"},
    {"file": "Hanford B-Reactor Area 1944.jpg", "caption": "Zona del reactor B de Hanford en 1944.", "credit": "US Army Corps of Engineers", "license": "Public domain"},
  ],
  "combustibles-de-fusion": [
    {"file": "Lithium paraffin.jpg", "caption": "Litio metálico conservado en parafina.", "credit": "Tomihahndorf at Ge", "license": "Public domain"},
    {"file": "Deuterium oxide Norsk.jpg", "caption": "Agua pesada (óxido de deuterio).", "credit": "Alchemist-hp (<span", "license": "FAL"},
    {"file": "Arak heavy water reactor2.JPG", "caption": "Reactor de agua pesada de Arak (Irán).", "credit": "Nanking2010", "license": "Public domain"},
  ],
  "unidades-de-radiacion": [
    {"file": "Pocket Dosimeters, extracted from Radiac instruments and film badges used at atmospheric nuclear tests (1985).png", "caption": "Dosímetros de bolsillo usados en los años cincuenta.", "credit": "Washington, D.C. : Defense Nuclear Agency, [1985]", "license": "Public domain"},
    {"file": "Radiation Film Badge, extracted from Introduction to industrial hygiene engineering and control (552) - nonionizing and ionizing radiation (1978).png", "caption": "Placa dosimétrica de película fotográfica.", "credit": "McClintock, James C., Hritz, Ronald J., Byers, Bruce B. National Institute for O", "license": "Public domain"},
    {"file": "Portable Geiger counter Berthold LB122-02.jpg", "caption": "Contador Geiger portátil Berthold.", "credit": "Lilly_M", "license": "CC BY-SA 3.0"},
    {"file": "Geiger counter measuring tree at Chernobyl.jpg", "caption": "Midiendo la radiactividad de un árbol en Chernóbil con un contador Geiger.", "credit": "ArticCynda", "license": "CC BY-SA 4.0"},
  ],
  "arma-de-fision": [
    {"file": "Fat Man nuclear bomb replica at NMUSAF.jpg", "caption": "Réplica de Fat Man en el Museo Nacional de la Fuerza Aérea de EE. UU.", "credit": "Christopher M. Reed", "license": "CC BY-SA 4.0"},
    {"file": "Little Boy atomic bomb replica displayed beneath a B-29 Superfortress - National Museum of the United States Air Force, Dayton, Ohio, USA.jpg", "caption": "Réplica de Little Boy expuesta bajo un B-29 en el mismo museo.", "credit": "Sebastiaan Broekhoven", "license": "CC BY-SA 4.0"},
    {"file": "Wendover AFB ABomb Replica.jpg", "caption": "Réplica de bomba atómica en la base de Wendover (Utah), donde se entrenó el grupo 509.", "credit": "John Stanton – C", "license": "CC BY-SA 3.0"},
  ],
  "tipo-canon": [
    {"file": "Atombombe Little Boy 2.jpg", "caption": "Little Boy antes de ser cargada en el Enola Gay (Tinian, 1945).", "credit": "Autor desconocido", "license": "Public domain"},
    {"file": "Photograph of S. Dike Examining Fit of Little Boy Unit in Bomb Bay of Enola Gay - DPLA - 902e4ae592dd7ca0f23aa1b6c78f083e.jpg", "caption": "Comprobando el ajuste de Little Boy en la bodega del Enola Gay.", "credit": "War Department. Office of the Chief of Engineers. Manhattan Engineer District. 8", "license": "Public domain"},
    {"file": "Upshot-Knothole GRABLE.jpg", "caption": "Disparo Grable (1953): el cañón atómico M65 dispara un proyectil nuclear tipo cañón en Nevada.", "license": "Public domain"},
    {"file": "US Army Artillery Museum - 292.jpg", "caption": "Cañón atómico M65 en el museo de artillería del Ejército de EE. UU.", "credit": "Vincent Jackson", "license": "CC BY-SA 4.0"},
  ],
  "implosion": [
    {"file": "Fat Man Assembled Tinian 1945.jpg", "caption": "Fat Man ya montada en Tinian, agosto de 1945.", "credit": "War Department. Office of the Chief of Engineers. Manhattan Engineer District. (", "license": "Public domain"},
    {"file": "Fat Man names on bomb.jpg", "caption": "La cola de Fat Man con las firmas de quienes la prepararon.", "license": "Public domain"},
    {"file": "The gadget in the Trinity Test Site tower (1945).jpg", "caption": "El «Gadget» de Trinity en lo alto de su torre, julio de 1945.", "credit": "Los Alamos National Laboratory", "license": "Attribution"},
    {"file": "Trinity Hoisting Gadget TR-384.jpg", "caption": "Izado del Gadget a la torre de Trinity.", "credit": "Unknown Manhattan Project photographer(s)", "license": "Public domain"},
  ],
  "fision-potenciada": [
    {"file": "Operation Greenhouse George Device 001.jpg", "caption": "El dispositivo George de la operación Greenhouse (1951).", "credit": "Federal government of the United States", "license": "Public domain"},
    {"file": "Greenhouse Item 001.jpg", "caption": "Explosión Item (Greenhouse, 1951), la primera prueba de un arma de fisión potenciada.", "credit": "Federal government of the United States", "license": "Public domain"},
    {"file": "GreenhouseGeorgeDeckChairs.jpg", "caption": "Observadores con gafas oscuras en Enewetak durante la operación Greenhouse.", "credit": "AEC", "license": "Public domain"},
  ],
  "bomba-de-hidrogeno": [
    {"file": "IvyMike2.jpg", "caption": "Ivy Mike (1 de noviembre de 1952), la primera bomba de hidrógeno: 10,4 Mt.", "credit": "Photo courtesy of National Nuclear Security Administration / Nevada Site Office", "license": "Public domain"},
    {"file": "Ivy Mike - Elugelab pt1.jpg", "caption": "El islote de Elugelab antes de Ivy Mike.", "license": "Public domain"},
    {"file": "Ivy Mike - Elugelab pt2.jpg", "caption": "El cráter donde estaba Elugelab tras la explosión: la isla desapareció.", "license": "Public domain"},
    {"file": "EdwardTeller1958.jpg", "caption": "Edward Teller en 1958.", "license": "Public domain"},
  ],
  "armas-de-tres-etapas": [
    {"file": "B41 nuclear bomb.jpg", "caption": "La bomba B41, la de mayor potencia del arsenal estadounidense (25 Mt), en exhibición.", "credit": "Ultimate source: Either a photo of the Air Force or the DOE.", "license": "Public domain"},
    {"file": "Mark 41 thermonuclear bomb casing.jpg", "caption": "Carcasa de la Mark 41.", "credit": "Wilson44691", "license": "CC0"},
    {"file": "Castle Bravo Blast.jpg", "caption": "Castle Bravo (1954), la mayor prueba estadounidense: 15 Mt.", "credit": "United States Department of Energy", "license": "Public domain"},
  ],
  "bomba-de-neutrones": [
    {"file": "Cohen-samuel t.jpg", "caption": "Samuel Cohen, impulsor del arma de radiación reforzada.", "credit": "Los Alamos National Laboratory", "license": "Attribution"},
    {"file": "MGM-52 Lance 06.jpg", "caption": "El misil Lance, que habría portado la ojiva W70 de radiación reforzada.", "credit": "U.S. Army", "license": "Public domain"},
  ],
  "bomba-sucia": [
    {"file": "Welcome home, 'Dirty Bombs!' 130214-A-SF231-940.jpg", "caption": "Ejercicio militar de respuesta a una «bomba sucia» en EE. UU. (2013).", "credit": "Pfc. Leon Cook", "license": "Public domain"},
    {"file": "Goiânia Accident Devair Ferreira's scrapyard - Mapillary (gcUqFY1EPmBChAZ87GDJd3).jpg", "caption": "Lugar del desguace de Goiânia (Brasil), donde una fuente de cesio abierta en 1987 causó el peor accidente radiológico de América.", "credit": "kaart_4 @ Mapillary.com", "license": "CC BY-SA 4.0"},
    {"file": "02010019 radioactive cesium source Goiânia accident.jpg", "caption": "La fuente de cesio-137 de Goiânia.", "credit": "IAEA Imagebank", "license": "CC BY 2.0"},
  ],
  "explosivos-convencionales": [
    {"file": "MOAB bomb.jpg", "caption": "La GBU-43/B MOAB, una de las mayores bombas convencionales (11 t de explosivo).", "credit": "U.S. Department of Defense photograph", "license": "Public domain"},
    {"file": "Trinity Test - 100 Ton Test - High Explosive Stack 003.jpg", "caption": "Pila de 100 t de explosivo para la prueba de calibración previa a Trinity (mayo de 1945).", "credit": "Federal government of the United States", "license": "Public domain"},
    {"file": "TNT detonation on Kaho'olawe Island during Operation Sailor Hat, shot Bravo, 1965.jpg", "caption": "Detonación de 500 t de TNT en la operación Sailor Hat (1965).", "credit": "US Navy Employee", "license": "Public domain"},
  ],
  "vectores": [
    {"file": "Barksdale Global Power Museum September 2015 49 (Boeing B-52G Stratofortress).jpg", "caption": "Bombardero B-52G en el Museo Global Power de Barksdale.", "credit": "Michael Barera", "license": "CC BY-SA 4.0"},
    {"file": "Minuteman III Launch (2000550566).jpg", "caption": "Lanzamiento de prueba de un misil Minuteman III.", "credit": "Stephen DeLoriea", "license": "Public domain"},
    {"file": "B-52 Stratofortress assigned to the 307th Bomb Wing (cropped).jpg", "caption": "B-52 Stratofortress en vuelo.", "credit": "Airman 1st Class Victor J. Caputo", "license": "Public domain"},
  ],
  "bomba-de-caida-libre": [
    {"file": "Model of B61 nuclear bomb at the National Atomic Testing Museum.jpg", "caption": "Modelo de la bomba B61 en el National Atomic Testing Museum de Las Vegas.", "credit": "Peter Burka", "license": "CC BY-SA 2.0"},
    {"file": "B83 nuclear bomb trainer.jpg", "caption": "Bomba de entrenamiento B83.", "credit": "U.S. Air Force/Master Sgt. Ken Hammond", "license": "Public domain"},
    {"file": "B83 nuclear bomb test with F-4C Phantom 1983.JPEG", "caption": "Prueba de lanzamiento de una B83 desde un F-4C Phantom (1983).", "credit": "Zapka, USAF", "license": "Public domain"},
  ],
  "misil-balistico": [
    {"file": "Minuteman III Launch (2000550566).jpg", "caption": "Lanzamiento de un Minuteman III.", "credit": "Stephen DeLoriea", "license": "Public domain"},
    {"file": "Titan II missile, Titan Missile Museum.jpg", "caption": "Un Titan II en su silo, hoy Titan Missile Museum (Arizona).", "credit": "Jeff Keyzer", "license": "CC BY 2.0"},
    {"file": "Minuteman III Launch Control.JPG", "caption": "Consola de control de lanzamiento del Minuteman III.", "credit": "Chitrapa", "license": "Public domain"},
  ],
  "mirv": [
    {"file": "Ten LGM-118 Peacekeeper MIRVs over Kwajalein in 1984.jpeg", "caption": "Diez vehículos de reentrada de un Peacekeeper cayendo sobre Kwajalein en una prueba (1984): cada estela es una ojiva inerte.", "credit": "USAF", "license": "Public domain"},
    {"file": "MX MIRV reentry vehicles.jpg", "caption": "Vehículos de reentrada del misil MX Peacekeeper.", "credit": "DOD Defense Visual Information Center", "license": "Public domain"},
    {"file": "W87 MIRV.jpg", "caption": "Vehículos de reentrada Mk21 en el bus del Peacekeeper.", "credit": "US government DOD and/or DOE photograph", "license": "Public domain"},
  ],
  "misil-de-crucero": [
    {"file": "AGM-86 ALCM.JPEG", "caption": "Misil de crucero AGM-86 ALCM lanzado desde el aire.", "credit": "R.L. House", "license": "Public domain"},
    {"file": "20180328 AGM-86B Udvar-Hazy.jpg", "caption": "AGM-86B en el museo Udvar-Hazy del Smithsonian.", "credit": "Balon Greyjoy", "license": "CC0"},
    {"file": "Tomahawk Cruise Missile is launched (2002).JPEG", "caption": "Lanzamiento de un Tomahawk desde un buque (2002).", "credit": "U.S. Navy image", "license": "Public domain"},
  ],
  "planeador-hipersonico": [
    {"file": "DF-5B, first stage.jpg", "caption": "Primera etapa de un DF-5B, el tipo de cohete que puede portar planeadores hipersónicos (desfile de Pekín).", "credit": "IceUnshattered", "license": "CC BY-SA 4.0"},
  ],
  "torpedo-nuclear": [
    {"file": "Status-6.jpg", "caption": "Maqueta del Status-6 «Poseidón» mostrada en la televisión rusa (2015).", "credit": "Russian DoD (license in bottom of the page)", "license": "CC BY 4.0"},
    {"file": "Mark 45 Nuclear Torpedo.jpg", "caption": "Torpedo nuclear Mark 45 ASTOR en un museo.", "credit": "Cliff", "license": "CC BY 2.0"},
  ],
  "artilleria-nuclear": [
    {"file": "M65 Atomic Cannon 001.jpg", "caption": "El cañón atómico M65 «Atomic Annie».", "credit": "Federal Government of the United States", "license": "Public domain"},
    {"file": "Davy-Crockett-propellent-charge.png", "caption": "Montaje de la Davy Crockett, el arma nuclear más pequeña desplegada.", "credit": "US government DOD and/or DOE photograph", "license": "Public domain"},
    {"file": "M388 Davy Crockett mounted on Jeep c1961.jpg", "caption": "Davy Crockett montada en un jeep (hacia 1961).", "credit": "U.S. Navy", "license": "Public domain"},
  ],
  "triada-nuclear": [
    {"file": "B-2 Spirit original.jpg", "caption": "El bombardero furtivo B-2 Spirit, la pata aérea de la tríada.", "credit": "U.S. Air Force photo/Staff Sgt. Bennie J. Davis III", "license": "Public domain"},
    {"file": "An unarmed Trident II D5 missile launches from USS Rhode Island (SSBN-740) off the coast of Cape Canaveral 9 May 2019.jpg", "caption": "Lanzamiento de un Trident II D5 desde el submarino USS Rhode Island, la pata marítima.", "credit": "John Kowalski", "license": "Public domain"},
    {"file": "Trident II missile image.jpg", "caption": "Misil Trident II saliendo del agua.", "credit": "Autor desconocido", "license": "Public domain"},
  ],
  "descubrimiento-de-la-fision": [
    {"file": "Versuchsaufbau Hahn Deutsches Museum-2.jpg", "caption": "Mesa de trabajo de Hahn y Strassmann (Deutsches Museum).", "credit": "Versuchsaufbau_Hahn_Deutsches_Museum.jpg: <a href", "license": "CC BY-SA 3.0"},
    {"file": "Otto Hahn's notebook 1938 - Deutsches Museum - Munich.jpg", "caption": "Cuaderno de Otto Hahn de 1938.", "credit": "J Brew", "license": "CC BY-SA 2.0"},
    {"file": "Dahlem Thielallee Hahn-Meitner-Bau-1.JPG", "caption": "El edificio Hahn-Meitner en Berlín-Dahlem, antiguo Instituto Kaiser Wilhelm de Química.", "credit": "Fridolin freudenfett (Peter Kuley)", "license": "CC BY-SA 3.0"},
    {"file": "Otto Hahn - Taschenkalender von 1938.jpg", "caption": "Agenda de bolsillo de Otto Hahn de 1938.", "license": "CC BY-SA 3.0"},
  ],
  "carta-de-einstein": [
    {"file": "Einstein-Roosevelt-letter.png", "caption": "Primera página de la carta de Einstein a Roosevelt (2 de agosto de 1939).", "credit": "Albert Einstein", "license": "Public domain"},
    {"file": "Einstein Szilard p1.jpg", "caption": "Página 1 del borrador Einstein–Szilárd.", "credit": "Written by Leó Szilárd and signed by Albert Einstein.", "license": "Public domain"},
    {"file": "Letter on display from Einstein to President Roosevelt.JPG", "caption": "La carta expuesta en un museo.", "credit": "Ryan Adams", "license": "CC BY-SA 3.0"},
  ],
  "proyecto-manhattan": [
    {"file": "Trinity shot color.jpg", "caption": "Trinity, la culminación técnica del proyecto.", "credit": "Jack W. Aeby, July 16, 1945, Civilian worker at Los Alamos laboratory, working u", "license": "Public domain"},
    {"file": "Manhattan Project monthly expenditures 1943-1946.png", "caption": "Gasto mensual del Proyecto Manhattan, 1943–1946.", "credit": "Manhattan Engineer District, US Army Corps of Engineers", "license": "Public domain"},
    {"file": "Manhattan Project employment graph 1942-1946.png", "caption": "Empleados del proyecto, 1942–1946: llegó a superar los 125 000.", "credit": "US Army Corps of Engineers", "license": "Public domain"},
    {"file": "Are your drawers closed? Manhattan Project security poster.png", "caption": "Cartel de seguridad del proyecto: «¿Están cerrados sus cajones?».", "credit": "Unknown: There is a signature in the bottom left of the image that may be \"Don L", "license": "Public domain"},
    {"file": "Leslie Groves 1942.jpg", "caption": "El general Leslie Groves, director militar del proyecto.", "credit": "An Office of War Information photographer", "license": "Public domain"},
  ],
  "los-alamos": [
    {"file": "Fuller Lodge.jpg", "caption": "Fuller Lodge, centro social del laboratorio de Los Álamos.", "credit": "Bill Johnson", "license": "CC BY-SA 4.0"},
    {"file": "Cocktail party attendees at Fuller Lodge, 1946.jpg", "caption": "Fiesta en Fuller Lodge, 1946.", "credit": "Los Alamos Laboratory", "license": "Attribution"},
  ],
  "oak-ridge-y-hanford": [
    {"file": "Y-12 Calutron operators.jpg", "caption": "Operadoras de los calutrones del Y-12 en Oak Ridge.", "credit": "Manhattan Project", "license": "Public domain"},
    {"file": "1945-K-25-Plant-Aerial-Oak-Ridge-Tennessee.jpg", "caption": "La planta K-25 de difusión gaseosa en 1945, entonces el mayor edificio del mundo.", "credit": "Ed Westcott / DoE Oak Ridge", "license": "Public domain"},
    {"file": "K-25 Foot print aerial 2014 Oak Ridge (14291200195).jpg", "caption": "Huella de la K-25 vista desde el aire en 2014.", "credit": "doe-oakridge", "license": "Public domain"},
  ],
  "oppenheimer": [
    {"file": "Oppenheimer (cropped).jpg", "caption": "J. Robert Oppenheimer.", "credit": "Autor desconocido", "license": "Public domain"},
    {"file": "Trinity Test - Oppenheimer and Groves at Ground Zero 002.jpg", "caption": "Oppenheimer y Groves en la zona cero de Trinity, septiembre de 1945.", "credit": "U.S. Army Corps of Engineers", "license": "Public domain"},
    {"file": "J. Robert Oppenheimer Testifies to Congress.jpg", "caption": "Oppenheimer declarando ante el Congreso.", "credit": "Harris & Ewing", "license": "Public domain"},
  ],
  "prueba-trinity": [
    {"file": "Trinity Test Fireball 16ms.jpg", "caption": "La bola de fuego de Trinity 16 milisegundos después de la detonación.", "credit": "Berlyn Brixner / Los Alamos National Laboratory", "license": "Public domain"},
    {"file": "Trinity Detonation T&B.jpg", "caption": "Trinity unos segundos después de la detonación.", "credit": "United States Department of Energy", "license": "Public domain"},
    {"file": "Trinity Test Fireball 53ms.jpg", "caption": "La bola de fuego a 53 ms.", "credit": "Photo courtesy of National Nuclear Security Administration / Nevada Site Office", "license": "Public domain"},
    {"file": "Trinity Site Obelisk National Historic Landmark.jpg", "caption": "El obelisco en la zona cero de Trinity.", "credit": "Samat Jain", "license": "Public domain"},
  ],
  "hiroshima": [
    {"file": "Atomic cloud over Hiroshima.jpg", "caption": "La nube sobre Hiroshima fotografiada desde el Enola Gay.", "credit": "George R. Caron", "license": "Public domain"},
    {"file": "Firestorm cloud over Hiroshima (from Matsuyama).jpg", "caption": "La nube de la tormenta de fuego sobre Hiroshima vista desde Matsuyama.", "credit": "509th Operations Group", "license": "Public domain"},
    {"file": "Hiroshima aftermath.jpg", "caption": "Hiroshima arrasada tras el bombardeo.", "credit": "U.S. Navy Public Affairs Resources Website", "license": "Public domain"},
    {"file": "Hiroshima-Nagasaki 2012 (7746128592).jpg", "caption": "Monumento en el Parque de la Paz de Hiroshima.", "credit": "The Official CTBTO Photostream", "license": "CC BY 2.0"},
  ],
  "nagasaki": [
    {"file": "Nagasakibomb.jpg", "caption": "La nube sobre Nagasaki, 9 de agosto de 1945.", "credit": "Charles Levy", "license": "Public domain"},
    {"file": "Atomic cloud over Nagasaki from Koyagi-jima.jpeg", "caption": "La nube vista desde Koyagi-jima, a 10 km.", "credit": "Hiromichi Matsuda (松田 弘道, 1900-1969)[2]", "license": "Public domain"},
    {"file": "Atomic Cloud Rises Over Nagasaki, Japan - NARA - 535795.tif", "caption": "La nube ascendiendo sobre Nagasaki (NARA).", "credit": "Charles Levy", "license": "Public domain"},
  ],
  "fin-de-la-guerra": [
    {"file": "Surrender of Japan - USS Missouri (restored).jpg", "caption": "Firma de la rendición de Japón a bordo del USS Missouri, 2 de septiembre de 1945.", "credit": "Army Signal Corps", "license": "Public domain"},
    {"file": "Instrument of surrender Japan2.jpg", "caption": "El instrumento de rendición de Japón.", "credit": "United States War Department[2]<a rel=\"nofollow\" class=\"external autonumber\" hre", "license": "Public domain"},
    {"file": "Imperial Rescript on the Termination of the War2.jpg", "caption": "El edicto imperial que puso fin a la guerra.", "credit": "大日本帝國", "license": "Public domain"},
  ],
  "hibakusha": [
    {"file": "Genbaku Dome04-r.JPG", "caption": "La Cúpula de la Bomba Atómica (Genbaku), único edificio en pie cerca del hipocentro, hoy Patrimonio de la Humanidad.", "credit": "Oilstreet", "license": "CC BY 2.5"},
    {"file": "Sadako Sasaki Statue.jpg", "caption": "Estatua de Sadako Sasaki en el Parque de la Paz.", "credit": "SGurmu", "license": "CC BY-SA 4.0"},
    {"file": "Peace Park - 1.JPG", "caption": "Parque Conmemorativo de la Paz de Hiroshima.", "credit": "Shakespeare at E", "license": "CC BY-SA 3.0"},
    {"file": "Origami (AM 1996.22.1-2).jpg", "caption": "Grullas de papel de origami, símbolo de los hibakusha.", "credit": "Autor desconocido", "license": "CC BY 4.0"},
  ],
  "operacion-crossroads": [
    {"file": "Operation Crossroads Baker Edit.jpg", "caption": "La prueba submarina Baker (julio de 1946), con la columna de agua y la «ola base».", "credit": "Original: United States Department of Defense</", "license": "Public domain"},
    {"file": "Crossroads Able 004.jpg", "caption": "La prueba aérea Able.", "credit": "Federal government of the United States", "license": "Public domain"},
    {"file": "Bikini Atoll, Marshall Islands (35055478541).jpg", "caption": "El atolón de Bikini hoy.", "credit": "O.V.E.R.V.I.E.W.", "license": "CC BY 2.0"},
  ],
  "programa-sovietico": [
    {"file": "Polytechnical Museum - Mock-up of RDS-1 - 2025-05.jpg", "caption": "Maqueta de la RDS-1, la primera bomba soviética, en el Museo Politécnico de Moscú.", "credit": "Александр Сигачёв", "license": "CC0"},
    {"file": "Igor Kurchatov 1929.jpg", "caption": "Ígor Kurchátov, director del programa soviético, en 1929.", "credit": "Autor desconocido", "license": "Public domain"},
    {"file": "Kurchatov museum 05.jpg", "caption": "Casa-museo de Kurchátov.", "credit": "Andreykor", "license": "CC BY 4.0"},
    {"file": "Joe-1 location prediction 1949.jpg", "caption": "Predicción estadounidense de la ubicación de la prueba Joe-1 (1949).", "credit": "United States Weather Bureau", "license": "Public domain"},
  ],
  "la-super": [
    {"file": "EdwardTeller1958.jpg", "caption": "Edward Teller, el gran defensor de la «Super».", "license": "Public domain"},
    {"file": "Stanislaw Ulam.tif", "caption": "Stanisław Ulam, coautor de la idea que hizo posible la bomba H.", "credit": "Los Alamos National Laboratory", "license": "Attribution"},
    {"file": "IvyMike2.jpg", "caption": "Ivy Mike, la primera prueba del diseño Teller-Ulam (1952).", "credit": "Photo courtesy of National Nuclear Security Administration / Nevada Site Office", "license": "Public domain"},
  ],
  "ivy-mike": [
    {"file": "IvyMike2.jpg", "caption": "La nube de Ivy Mike, 1 de noviembre de 1952.", "credit": "Photo courtesy of National Nuclear Security Administration / Nevada Site Office", "license": "Public domain"},
    {"file": "Ivy Mike overshooting top.jpg", "caption": "La cima de la nube, que superó los 40 km.", "credit": "Lookout Mountain Studios", "license": "Public domain"},
    {"file": "Ivy Mike - Elugelab pt1.jpg", "caption": "Elugelab antes.", "license": "Public domain"},
    {"file": "Ivy Mike - Elugelab pt2.jpg", "caption": "Elugelab después.", "license": "Public domain"},
    {"file": "Operation Ivy, Mike cloud, aerial view - NARA - 558592.tif", "caption": "Vista aérea de la nube (NARA).", "credit": "UnknownUnknown USAF personnel: \"Personnel conducting this project photography ca", "license": "Public domain"},
  ],
  "castle-bravo": [
    {"file": "Castle Bravo Blast.jpg", "caption": "Castle Bravo, 1 de marzo de 1954: 15 Mt, más del doble de lo previsto.", "credit": "United States Department of Energy", "license": "Public domain"},
    {"file": "Bravo fallout2.png", "caption": "Contornos de la lluvia radiactiva de Bravo sobre las islas Marshall.", "credit": "United States Department of Energy", "license": "Public domain"},
    {"file": "Daigo Fukuryū Maru 01.JPG", "caption": "El pesquero japonés Daigo Fukuryū Maru, alcanzado por la lluvia radiactiva, conservado en Tokio.", "credit": "carpkazu", "license": "Public domain"},
    {"file": "Bravo secondary fireball.jpg", "caption": "Bola de fuego secundaria de Bravo.", "credit": "Nigel Cook", "license": "Public domain"},
  ],
  "tsar-bomba": [
    {"file": "Tsar Bomba Revised.jpg", "caption": "La nube de la Tsar Bomba (30 de octubre de 1961), fotografiada desde 160 km.", "credit": "User:Croquant with modifications by User:Hex", "license": "CC BY-SA 3.0"},
    {"file": "Tsar Bomba fireball 1961.jpg", "caption": "La bola de fuego de la Tsar Bomba.", "credit": "Cover Images/The Ministry of Medium Machine Building of the USSR/Associated Pres", "license": "Public domain"},
    {"file": "Tsar Bomba.JPG", "caption": "Carcasa de la Tsar Bomba en el museo de Sárov.", "license": "CC BY-SA 3.0"},
    {"file": "Mushroomcloud Size.png", "caption": "Comparación de la altura de nubes de hongo según la potencia.", "license": "CC BY-SA 3.0"},
  ],
  "carrera-armamentistica": [
    {"file": "US and USSR nuclear stockpiles.png", "caption": "Arsenales de EE. UU. y la URSS a lo largo de la Guerra Fría.", "license": "Public domain"},
    {"file": "Kennedy and Khrushchev at Vienna Meeting - NARA - 193203.jpg", "caption": "Kennedy y Jruschov en la cumbre de Viena (1961).", "credit": "Stanley Tretick", "license": "Public domain"},
    {"file": "Titan II launch.jpg", "caption": "Lanzamiento de un Titan II.", "credit": "U.S. Air Force", "license": "Public domain"},
  ],
  "destruccion-mutua-asegurada": [
    {"file": "Oscar-Zero Missile Alert Facility Minuteman ICBM Launch Control 20100410.jpg", "caption": "Centro de control de lanzamiento Oscar-Zero de Minuteman (Dakota del Norte), hoy museo.", "credit": "Chad Kainz from Chicago, USA", "license": "CC BY 2.0"},
    {"file": "Robert McNamara official portrait.jpg", "caption": "Robert McNamara, secretario de Defensa que popularizó la doctrina.", "credit": "DoD photo by Oscar Porter, U.S. Army.", "license": "Public domain"},
    {"file": "LAUNCH CONTROL SUPPORT BUILDING. 'MISSILE ART' MURAL PAINTED ON INTERIOR WALL OF ELEVATOR SHAFT. VIEW TO EAST. - Minuteman III ICBM Launch Control Facility November-1, 1.5 HAER COLO,62-NERAY.V,1-18.tif", "caption": "Mural en un centro de control de lanzamiento.", "license": "Public domain"},
  ],
  "crisis-de-los-misiles": [
    {"file": "Cuban missiles.jpg", "caption": "Foto de reconocimiento de un U-2 sobre una base de misiles en Cuba (octubre de 1962).", "credit": "see above", "license": "Public domain"},
    {"file": "U-2 photo during Cuban Missile Crisis.jpg", "caption": "Otra foto del U-2 durante la crisis.", "credit": "USAF", "license": "Public domain"},
    {"file": "President Kennedy with advisors after EXCOMM meeting, 29 October 1962.jpg", "caption": "Kennedy con sus asesores tras una reunión del ExComm, 29 de octubre de 1962.", "credit": "Cecil Stoughton", "license": "Public domain"},
    {"file": "Poltava 1962.jpg", "caption": "El carguero soviético Poltava, que transportaba misiles a Cuba.", "credit": "USAF", "license": "Public domain"},
  ],
  "tratados": [
    {"file": "Reagan and Gorbachev signing.jpg", "caption": "Reagan y Gorbachov firman el Tratado INF (1987).", "credit": "White House Photographic Office", "license": "Public domain"},
    {"file": "President Kennedy signs Nuclear Test Ban Treaty, 07 October 1963.jpg", "caption": "Kennedy firma el Tratado de Prohibición Parcial de Ensayos (7 de octubre de 1963).", "credit": "Robert LeRoy Knudsen", "license": "Public domain"},
    {"file": "The Soviet Union 1963 CPA 2943 stamp (Treaty Banning Nuclear Weapon Tests in the Atmosphere, in Outer Space and Under Water, Moscow. Treaty name, Spasskaya Tower and globe).jpg", "caption": "Sello soviético de 1963 dedicado al tratado.", "credit": "Post of the Soviet Union (Рис.: И. Л. Левин. Арх.: <a href=\"https://ru.wikipedia", "license": "Public domain"},
  ],
  "pruebas-nucleares": [
    {"file": "Sedan Plowshare Crater.jpg", "caption": "El cráter Sedan (Nevada, 1962): 390 m de diámetro, abierto por una explosión subterránea de 104 kt.", "credit": "Federal Government of the United States", "license": "Public domain"},
    {"file": "Nevada Test Site craters.jpg", "caption": "Cráteres de hundimiento de pruebas subterráneas en el sitio de pruebas de Nevada.", "credit": "Federal Government of the United States", "license": "Public domain"},
    {"file": "Upshot-Knothole Annie 001.jpg", "caption": "Disparo Annie (Upshot-Knothole, 1953).", "credit": "Federal Government of the United States", "license": "Public domain"},
    {"file": "Semipalatinsk crater and lake.jpg", "caption": "Lago del «cráter atómico» de Semipalatinsk (Kazajistán).", "credit": "The Official CTBTO Photostream", "license": "CC BY 2.0"},
  ],
  "potencias-nucleares": [
    {"file": "Nuclear weapon programs worldwide 2.png", "caption": "Programas nucleares en el mundo: estados con armas, que las tuvieron o que las investigaron.", "credit": "No machine-readable author provided. Robotico assumed (based on copyright claims", "license": "Public domain"},
    {"file": "Nuclear umbrella by country.png", "caption": "Estados con armas nucleares, bajo «paraguas nuclear» o en alianzas.", "credit": "Boston Mayflower", "license": "CC BY-SA 4.0"},
  ],
  "arsenales-actuales": [
    {"file": "Minuteman III warheads.jpg", "caption": "Ojivas del Minuteman III.", "credit": "Unknown or not provided", "license": "Public domain"},
    {"file": "19-03-2012-Parade-rehearsal - Topol-M.jpg", "caption": "Lanzador Topol-M en el ensayo del desfile de Moscú (2012).", "credit": "Vitaly V. Kuzmin", "license": "CC BY-SA 4.0"},
    {"file": "Active LGM-30 Minuteman Sites.png", "caption": "Bases activas de Minuteman en EE. UU.", "credit": "Bwmoll3", "license": "CC BY-SA 3.0"},
  ],
  "bola-de-fuego": [
    {"file": "Tumbler Snapper rope tricks.jpg", "caption": "Los «trucos de cuerda» (Tumbler-Snapper, 1952): picos en la bola de fuego por los cables de la torre que se vaporizan.", "credit": "U.S. Air Force 1352nd Photographic Group, Lookout Mountain Station", "license": "Public domain"},
    {"file": "Mushroom cloud sequence.jpg", "caption": "Secuencia de formación de una nube de hongo.", "license": "Public domain"},
    {"file": "Rapatronic Picture 009.jpg", "caption": "Fotografía Rapatronic de una bola de fuego en sus primeros milisegundos.", "credit": "Federal Government of the United States", "license": "Public domain"},
    {"file": "Trinity Test Fireball 16ms.jpg", "caption": "La bola de fuego de Trinity a 16 ms.", "credit": "Berlyn Brixner / Los Alamos National Laboratory", "license": "Public domain"},
  ],
  "nube-de-hongo": [
    {"file": "Operation Crossroads Baker Edit.jpg", "caption": "La nube de la prueba submarina Baker (Crossroads, 1946), con la columna de agua y el anillo de condensación.", "credit": "Original: United States Department of Defense</", "license": "Public domain"},
    {"file": "Castle Romeo.jpg", "caption": "Castle Romeo (1954, 11 Mt) sobre el atolón de Bikini.", "credit": "United States Department of Energy", "license": "Public domain"},
    {"file": "Upshot-Knothole Annie 001.jpg", "caption": "La nube de Annie (Upshot-Knothole, 1953) en Nevada.", "credit": "Federal Government of the United States", "license": "Public domain"},
    {"file": "Upshot-Knothole Nancy 001.jpg", "caption": "Nancy (Upshot-Knothole, 1953).", "credit": "Federal government of the United States", "license": "Public domain"},
  ],
  "onda-expansiva": [
    {"file": "Operation Doorstep - Destruction of house n°1 - Frame 1.jpg", "caption": "Operación Doorstep (1953): casa de prueba a 1 100 m de una explosión de 16 kt, primer fotograma.", "credit": "National Nuclear Security Administration / Nevada Site Office", "license": "Public domain"},
    {"file": "Operation Doorstep - Destruction of house n°1 - Frame 4.jpg", "caption": "La misma casa un instante después: la onda de choque la destroza.", "credit": "National Nuclear Security Administration / Nevada Site Office", "license": "Public domain"},
    {"file": "Operation Doorstep - Destruction of house n°1 - Frame 6.jpg", "caption": "Fotograma final: la casa queda reducida a escombros en unos 2,3 s.", "credit": "National Nuclear Security Administration / Nevada Site Office", "license": "Public domain"},
    {"file": "NTS - Apple-2 wooden house.jpg", "caption": "La «casa Apple-2», que sobrevivió en pie en las pruebas de 1955 en Nevada.", "credit": "Federal Government of the United States", "license": "Public domain"},
  ],
  "radiacion-termica": [
    {"file": "The Shadow - Hiroshima.jpg", "caption": "Sombra de una persona grabada en los escalones de un banco de Hiroshima: el destello blanqueó la piedra alrededor.", "credit": "Autor desconocido", "license": "Public domain"},
    {"file": "Human Shadow Etched Position - 2up.jpg", "caption": "La escalera de la sombra, conservada en el Museo de la Paz de Hiroshima.", "credit": "US military", "license": "Public domain"},
  ],
  "radiacion-inicial": [
    {"file": "Pocket Dosimeters, extracted from Radiac instruments and film badges used at atmospheric nuclear tests (1985).png", "caption": "Dosímetros de bolsillo de la época de las pruebas atmosféricas.", "credit": "Washington, D.C. : Defense Nuclear Agency, [1985]", "license": "Public domain"},
    {"file": "Fast Neutron Film Badge, extracted from A simplified film dosimeter for fission neutrons (1958).jpg", "caption": "Placa dosimétrica para neutrones rápidos.", "credit": "Ross, S. W.", "license": "Public domain"},
    {"file": "National Bonsai and Penjing Museum - Hiroshima survivor.jpg", "caption": "Pino blanco japonés que sobrevivió a 3 km del hipocentro de Hiroshima, hoy en el Museo Nacional del Bonsái de Washington.", "credit": "APK", "license": "CC BY-SA 4.0"},
  ],
  "explosiones-aereas-y-de-superficie": [
    {"file": "Operation Plumbbob - Priscilla 2.jpg", "caption": "Priscilla (Plumbbob, 1957), explosión desde un globo a 213 m de altura.", "credit": "Photo courtesy of National Nuclear Security Administration / Nevada Site Office", "license": "Public domain"},
    {"file": "Operation Plumbbob - Diablo tower.jpg", "caption": "Torre de Diablo (Plumbbob).", "credit": "Photo courtesy of National Nuclear Security Administration / Nevada Site Office", "license": "Public domain"},
    {"file": "Storax Sedan nuke.jpg", "caption": "Sedan (1962): explosión enterrada a poca profundidad que levanta una cúpula de tierra.", "credit": "Federal Government of the United States", "license": "Public domain"},
    {"file": "Sedan Plowshare Crater.jpg", "caption": "El cráter Sedan.", "credit": "Federal Government of the United States", "license": "Public domain"},
  ],
  "lluvia-radiactiva": [
    {"file": "Bravo Fallout.jpg", "caption": "El penacho de lluvia radiactiva de Castle Bravo (1954).", "credit": "United States Department of Energy", "license": "Public domain"},
    {"file": "Fallout shelter sign (US).jpg", "caption": "Señal de refugio antinuclear («fallout shelter»), omnipresente en EE. UU. en los años 60.", "credit": "Jud McCranie", "license": "CC BY-SA 4.0"},
    {"file": "US fallout exposure.png", "caption": "Exposición al yodo-131 de las pruebas de Nevada, por condados de EE. UU.", "credit": "National Cancer Institute", "license": "Public domain"},
    {"file": "Fallout shelter Baltimore.jpg", "caption": "Refugio antinuclear en Baltimore.", "credit": "Japs 88", "license": "CC BY-SA 4.0"},
  ],
  "pulso-electromagnetico": [
    {"file": "Starfish Prime aurora from Honolulu 1.jpg", "caption": "Aurora artificial sobre Honolulu tras Starfish Prime (9 de julio de 1962), una explosión a 400 km de altura.", "license": "Public domain"},
    {"file": "Starfish prime 35mm frame.jpg", "caption": "Starfish Prime en un fotograma de 35 mm.", "credit": "US Department of Defense", "license": "CC BY-SA 4.0"},
    {"file": "E-4 advanced airborne command post EMP sim.jpg", "caption": "El avión E-4 en el simulador de pulso electromagnético de Kirtland (Nuevo México).", "credit": "Camera Operator: SGT. ERNIE STONE", "license": "Public domain"},
  ],
  "efectos-en-la-salud": [
    {"file": "Radiation Effects Research Foundation Hiroshima.jpg", "caption": "Sede de la Radiation Effects Research Foundation en Hiroshima, que estudia a los supervivientes desde 1947.", "credit": "Taisyo", "license": "CC BY 3.0"},
    {"file": "RERF cancer ERR.jpg", "caption": "Riesgo relativo adicional de cáncer según dosis en los supervivientes (RERF).", "credit": "Dale L. Preston, Donald A. Pierce, Yukiko Shimizu, Harry M. Cullings, Shoichiro ", "license": "Public domain"},
    {"file": "RERF leukemia excess.jpg", "caption": "Exceso de leucemias en los supervivientes (RERF).", "credit": "Dale L. Preston, Donald A. Pierce, Yukiko Shimizu, Harry M. Cullings, Shoichiro ", "license": "Public domain"},
  ],
  "proteccion-civil": [
    {"file": "P.S. 58 - Carroll & Smith Sts. Bklyn. hold a take cover drill 01489v.jpg", "caption": "Simulacro escolar «agacharse y cubrirse» en Brooklyn durante la Guerra Fría.", "credit": "Walter Albertin", "license": "Public domain"},
    {"file": "Fallout shelter sign on a building.JPG", "caption": "Señal de refugio antinuclear en un edificio.", "credit": "Gesalbte", "license": "Public domain"},
    {"file": "Fallout shelter Baltimore.jpg", "caption": "Refugio antinuclear en Baltimore.", "credit": "Japs 88", "license": "CC BY-SA 4.0"},
  ],
  "palomares": [
    {"file": "Palomares Bomb Casings.jpg", "caption": "Carcasas de las bombas de Palomares (1966), expuestas en el National Museum of Nuclear Science & History.", "credit": "Plumbob78 at English", "license": "Public domain"},
    {"file": "1966 Palomares B-52 crash - recovered H-bomb.jpg", "caption": "La bomba recuperada del mar tras 80 días de búsqueda, a bordo del USS Petrel.", "credit": "Autor desconocido", "license": "Public domain"},
    {"file": "B28 nuclear bomb, National Museum of Nuclear Science & History.JPG", "caption": "Una B28 como las cuatro del accidente.", "credit": "byteboy", "license": "CC BY 3.0"},
    {"file": "Entrada Palomares 2.jpg", "caption": "Entrada a Palomares (Cuevas del Almanzora, Almería).", "credit": "Schumi4ever", "license": "CC BY-SA 4.0"},
  ],
  "thule": [
    {"file": "Thule AFB B-52 Crash Site.jpg", "caption": "Lugar del accidente del B-52 en la bahía de North Star (1968).", "credit": "United States Air Force", "license": "Public domain"},
    {"file": "ThuleRadiationCheck.jpg", "caption": "Control radiológico de trabajadores durante la limpieza («Project Crested Ice»).", "credit": "United States Air Force", "license": "Public domain"},
    {"file": "Thule Air Base aerial view.jpg", "caption": "La base aérea de Thule (hoy Pituffik) desde el aire.", "credit": "TSGT Lee E. Schading / U.S. Air Force", "license": "Public domain"},
  ],
  "goldsboro": [
    {"file": "Goldsboro bomb Weapon No 1 color.jpg", "caption": "La bomba n.º 1 de Goldsboro, con su paracaídas, tras el accidente de 1961.", "credit": "United States Air Force", "license": "Public domain"},
    {"file": "Goldsboro Broken Arrow cleanup 1961.jpg", "caption": "Trabajos de recuperación en el campo.", "credit": "U.S. Air Force", "license": "Public domain"},
    {"file": "1961 Goldsboro B-52 crash sign - \"Nuclear Mishap\" marker in Eureka, NC (cropped).jpg", "caption": "Placa conmemorativa del «accidente nuclear» en Eureka (Carolina del Norte).", "credit": "RJHaas", "license": "CC BY-SA 3.0"},
  ],
  "damascus-titan": [
    {"file": "Titan II missile, Titan Missile Museum.jpg", "caption": "Un Titan II en su silo, hoy Titan Missile Museum (Arizona).", "credit": "Jeff Keyzer", "license": "CC BY 2.0"},
    {"file": "Titan II Missile Silo.jpg", "caption": "El silo del Titan II visto desde arriba.", "credit": "JoannaPoe", "license": "CC BY-SA 4.0"},
  ],
  "falsas-alarmas": [
    {"file": "Petrow semperoper1.JPG", "caption": "Stanislav Petrov, el oficial que en 1983 juzgó falsa una alarma de ataque.", "credit": "Z thomas", "license": "CC BY-SA 3.0"},
    {"file": "Vasili Arkhipov.jpg", "caption": "Vasili Arjípov, que en 1962 se negó a autorizar el torpedo nuclear del submarino B-59.", "credit": "Image courtesy by Olga Arkhipova", "license": "CC BY-SA 4.0"},
    {"file": "Stanislav Petrov memorial stone.jpg", "caption": "Placa en memoria de Petrov.", "credit": "User:Brandmeister (Togrul Safarov)", "license": "Public domain"},
  ],
  "accidentes-de-criticidad": [
    {"file": "Louis Slotin & Harry K. Daghlian Jr.jpg", "caption": "Louis Slotin y Harry Daghlian, víctimas de accidentes de criticidad en Los Álamos.", "credit": "Los Alamos Archive", "license": "Public domain"},
    {"file": "Slotin criticality map.png", "caption": "Plano del accidente de Slotin (1946), con la posición de las personas en la sala.", "credit": "unknown member of Los Alamos Laboratory", "license": "Public domain"},
    {"file": "Tokai village hall.JPG", "caption": "Ayuntamiento de Tōkai (Japón), localidad del accidente de 1999.", "credit": "アラツク", "license": "CC BY-SA 4.0"},
  ],
  "kyshtym": [
    {"file": "Map of the East Urals Radioactive Trace.png", "caption": "Mapa de la «traza radiactiva de los Urales Orientales» tras la explosión de Kyshtym (1957).", "credit": "Goran tek-en (following request by <a href=\"//commons.wikimedia.org/wiki/User:Ki", "license": "CC BY-SA 4.0"},
    {"file": "Mayak-FMSF-Cetac-37.jpg", "caption": "Centro de ventilación del almacén de material fisible de Mayak, el complejo donde ocurrió el accidente.", "credit": "Carl Anderson, US Army Corps of Engineers", "license": "Public domain"},
    {"file": "Ozersk Broadway.jpg", "caption": "Ozersk, la ciudad cerrada junto a Mayak.", "credit": "Sergey Nemanov", "license": "CC BY-SA 3.0"},
  ],
  "windscale": [
    {"file": "HD.15.003 (11824034284) (right crop).jpg", "caption": "Las chimeneas de las pilas de Windscale (Reino Unido), donde se incendió el reactor 1 en 1957.", "credit": "ENERGY.GOV", "license": "Public domain"},
    {"file": "Sellafield.jpg", "caption": "El complejo de Sellafield hoy.", "credit": "Reading Tom", "license": "CC BY 2.0"},
    {"file": "Calder Hall nuclear power station (11823864155).jpg", "caption": "Calder Hall, primera central nuclear comercial del mundo, junto a Windscale.", "credit": "ENERGY.GOV", "license": "Public domain"},
  ],
  "chernobil": [
    {"file": "Chernobyl reactor 4.jpg", "caption": "El reactor 4 de Chernóbil tras el accidente.", "credit": "Mattias Hill", "license": "CC BY-SA 4.0"},
    {"file": "Chernobyl Reactor 4 model inside.jpg", "caption": "Maqueta del reactor 4 dañado.", "credit": "ArticCynda", "license": "CC BY-SA 4.0"},
    {"file": "Chernobyl New Safe Confinement August 2016.jpg", "caption": "El Nuevo Confinamiento Seguro, la mayor estructura móvil jamás construida, sobre el reactor (2016).", "credit": "Cls14", "license": "CC BY-SA 4.0"},
    {"file": "IAEA 02790015 (5613115146).jpg", "caption": "Expertos del OIEA en la zona.", "credit": "IAEA Imagebank", "license": "CC BY-SA 2.0"},
  ],
  "fukushima": [
    {"file": "Fukushima Daiichi Nuclear Power Plant seen from the sea.jpg", "caption": "La central de Fukushima Daiichi vista desde el mar.", "credit": "<a href=\"//commons.wikimedia.org/w/index.php?title=User:%E3%83%96%E3%83%AB%E3%83", "license": "CC BY 4.0"},
    {"file": "Fukushima I by Digital Globe crop.jpg", "caption": "Imagen de satélite tras las explosiones de 2011.", "credit": "Digital Globe", "license": "CC BY-SA 3.0"},
    {"file": "IAEA Experts at Fukushima (02813336).jpg", "caption": "Expertos del OIEA en Fukushima.", "credit": "IAEA Imagebank", "license": "CC BY-SA 2.0"},
    {"file": "Aerial photo of Fukushima Daiichi Nuclear Power Plant 2021.jpg", "caption": "Vista aérea de la central en 2021.", "credit": "資源エネルギー庁", "license": "CC BY 4.0"},
  ],
  "asteroides-y-cometas": [
    {"file": "Eros - PIA02923 (color).jpg", "caption": "El asteroide Eros fotografiado por la sonda NEAR Shoemaker.", "credit": "NASA/JPL/JHUAPL (color version published at Planetary Society)", "license": "Public domain"},
    {"file": "Bennu mosaic OSIRIS-REx (square).png", "caption": "El asteroide Bennu, del que OSIRIS-REx trajo muestras.", "credit": "NASA/Goddard/University of Arizona", "license": "Public domain"},
    {"file": "Comet-Hale-Bopp-29-03-1997 hires adj.jpg", "caption": "El cometa Hale-Bopp en 1997.", "credit": "Philipp Salzgeber", "license": "CC BY-SA 2.0 at"},
  ],
  "tunguska": [
    {"file": "Tunguska Ereignis-1.jpg", "caption": "Árboles abatidos por la explosión de Tunguska, fotografiados por la expedición de Leonid Kulik en 1927.", "credit": "Leonid Kulik, the expedition to the Tunguska event", "license": "Public domain"},
    {"file": "Tunguska event effect areas 3.png", "caption": "Área afectada por la explosión de Tunguska.", "credit": "own work and chatGPT 4o and 3 AI", "license": "Public domain"},
    {"file": "Tunguska and Los Angeles (4093217182).jpg", "caption": "El área de Tunguska superpuesta a Los Ángeles.", "credit": "Lunar and Planetary Institute from Houston, TX, USA", "license": "CC BY 2.0"},
  ],
  "cheliabinsk": [
    {"file": "2013 Chelyabinsk meteor trace.jpg", "caption": "La estela del meteoro de Cheliábinsk (15 de febrero de 2013).", "credit": "Alex Alishevskikh", "license": "CC BY-SA 2.0"},
    {"file": "Chelyabinsk meteorite Historical Museum 1.jpg", "caption": "El mayor fragmento, de unos 570 kg, recuperado del lago Chebarkul y expuesto en el museo de Cheliábinsk.", "credit": "Lumaca", "license": "CC BY-SA 4.0"},
    {"file": "Orbit of 2012 DA14 and Chelyabinsk meteor 2.jpg", "caption": "Órbitas del asteroide 2012 DA14 y del meteoro de Cheliábinsk: coincidieron el mismo día por pura casualidad.", "credit": "NASA / MSFC / Meteroid Environment Office", "license": "Public domain"},
    {"file": "Cheljabinsk meteorite fragment.jpg", "caption": "Fragmento del meteorito.", "credit": "Svend Buhl", "license": "CC BY-SA 3.0"},
  ],
  "meteor-crater": [
    {"file": "Meteor Crater - Arizona.jpg", "caption": "Meteor Crater (Arizona): 1,2 km de diámetro y 50 000 años.", "credit": "National Map Seamless Server", "license": "Public domain"},
    {"file": "Barringer Crater aerial photo by USGS.jpg", "caption": "Fotografía aérea del USGS.", "credit": "USGS/D. Roddy", "license": "Public domain"},
    {"file": "Meteor Crater, Arizona (ASTER).jpg", "caption": "El cráter visto por el satélite ASTER.", "credit": "NASA/METI/AIST/Japan Space Systems, and U.S./Japan ASTER Science Team", "license": "Public domain"},
  ],
  "chicxulub": [
    {"file": "Chicxulub Free-Air Gravity anomaly.png", "caption": "Anomalía gravitatoria del cráter de Chicxulub (península de Yucatán).", "credit": "J. Klokočník, J. Kostelecký, I. Pešek, P. Novák, C. A. Wagner, and J. Sebera", "license": "CC BY 3.0"},
    {"file": "KT boundary 054.jpg", "caption": "El límite K-Pg: la capa de arcilla del impacto que acabó con los dinosaurios no avianos.", "credit": "Original uploader was Glenlarson at <a class=\"external text\" data-mw-original-hr", "license": "Public domain"},
    {"file": "Thin white line = KT (now K-Pg) boundary (5090097984).jpg", "caption": "La fina línea blanca del límite K-Pg en un afloramiento.", "credit": "Mike Beauregard from Nunavut, Canada", "license": "CC BY 2.0"},
  ],
  "shoemaker-levy-9": [
    {"file": "Hubble's Panoramic Picture of Comet P-Shoemaker-Levy 9 (opo9426c).jpg", "caption": "Panorámica del Hubble del cometa Shoemaker-Levy 9 fragmentado en 21 trozos (1994).", "credit": "HA. Weaver, T. ESmith ( Space Telescope Science Institute), and <a rel=\"nofollow", "license": "Public domain"},
    {"file": "Comet Shoemaker-Levy 9 Impact Sites on Jupiter (1994-44-210).jpg", "caption": "Cicatrices de los impactos en Júpiter.", "license": "Public domain"},
    {"file": "Shoemaker-Levy 9 Fragment G Scar (39755495252).png", "caption": "La cicatriz del fragmento G, mayor que la Tierra.", "credit": "geckzilla", "license": "CC BY 2.0"},
  ],
  "defensa-planetaria": [
    {"file": "Dimorphos North-Up Image Composition (final 10 full-frame images).png", "caption": "Dimorphos fotografiado por DART en sus últimos segundos antes del impacto (26 de septiembre de 2022).", "credit": "NASA/Johns Hopkins APL", "license": "Public domain"},
    {"file": "Footprint of DART spacecraft over the spot where it impacted asteroid Dimorphos.jpg", "caption": "Silueta de la sonda DART sobre el punto de impacto en Dimorphos.", "credit": "NASA/Johns Hopkins APL", "license": "Public domain"},
    {"file": "Artist's illustration of NASA's Double Asteroid Redirection Test Mission.jpg", "caption": "Ilustración de la misión DART.", "credit": "National Aeronautics and Space Administration", "license": "Public domain"},
    {"file": "Hera in orbit.jpg", "caption": "La misión Hera de la ESA, que estudiará el resultado del impacto.", "credit": "ESA – Science Office", "license": "CC BY-SA 3.0 igo"},
  ],
  "escalas-de-riesgo": [
    {"file": "Torino scale big es.png", "caption": "La escala de Turín, del 0 (sin riesgo) al 10 (colisión segura con catástrofe global).", "license": "CC BY-SA 3.0"},
    {"file": "99942 Apophis shape.png", "caption": "Forma del asteroide Apophis, que pasará a 32 000 km de la Tierra en 2029.", "credit": "Astronomical Institute of the Charles University: Josef Ďurech, Vojtěch Sidorin", "license": "CC BY 4.0"},
    {"file": "Change in orbit of Apophis in 2029.png", "caption": "Cambio de la órbita de Apophis en su paso de 2029.", "credit": "Eric Kvaalen", "license": "CC BY-SA 4.0"},
    {"file": "Vera C Rubin Observatory in the Snow (IMG 0315-CC).jpg", "caption": "El observatorio Vera C. Rubin, que multiplicará el descubrimiento de asteroides.", "credit": "NOIRLab/NSF/AURA/C. Corco", "license": "CC BY 4.0"},
  ],
  "cat-tsar-bomba-urss-1961": [
    {"file": "Tsar Bomba Revised.jpg", "caption": "La nube de la Tsar Bomba.", "credit": "User:Croquant with modifications by User:Hex", "license": "CC BY-SA 3.0"},
    {"file": "Tsar Bomba fireball 1961.jpg", "caption": "La bola de fuego.", "credit": "Cover Images/The Ministry of Medium Machine Building of the USSR/Associated Pres", "license": "Public domain"},
    {"file": "Tsar Bomba.JPG", "caption": "Carcasa de la Tsar Bomba en Sárov.", "license": "CC BY-SA 3.0"},
    {"file": "Tupolev Tu-95 Bear side view aft 1984.jpg", "caption": "El bombardero Tu-95 como el Tu-95V que la lanzó.", "credit": "USN", "license": "Public domain"},
  ],
  "cat-prueba-219-urss-1962": [
    {"file": "NovayaZemlya.A2001222.0835.250m.jpg", "caption": "Nueva Zembla, el polígono ártico de pruebas soviético, desde satélite.", "license": "Public domain"},
    {"file": "Novaya Zemlya - 25370385488.jpg", "caption": "Costa de Nueva Zembla.", "credit": "Vasilyev Serge", "license": "CC BY 2.0"},
  ],
  "cat-castle-bravo-ee-uu-1954": [
    {"file": "Castle Bravo Blast.jpg", "caption": "Castle Bravo.", "credit": "United States Department of Energy", "license": "Public domain"},
    {"file": "Castle Bravo Shrimp Device 001.jpg", "caption": "El dispositivo «Shrimp» en su cabina de pruebas en Namu.", "credit": "Federal government of the United States", "license": "Public domain"},
    {"file": "Bravo fallout2.png", "caption": "La lluvia radiactiva de Bravo.", "credit": "United States Department of Energy", "license": "Public domain"},
  ],
  "cat-castle-yankee-ee-uu-1954": [
    {"file": "Operation Castle - Yankee.jpg", "caption": "Castle Yankee (5 de mayo de 1954, 13,5 Mt).", "credit": "Federal Government of the United States.", "license": "Public domain"},
    {"file": "Operation Castle Barge Transport.jpg", "caption": "Transporte en barcaza durante la operación Castle.", "credit": "USDE", "license": "Public domain"},
  ],
  "cat-ivy-mike-ee-uu-1952": [
    {"file": "IvyMike2.jpg", "caption": "Ivy Mike.", "credit": "Photo courtesy of National Nuclear Security Administration / Nevada Site Office", "license": "Public domain"},
    {"file": "Ivy Mike - Elugelab pt1.jpg", "caption": "Elugelab antes.", "license": "Public domain"},
    {"file": "Ivy Mike - Elugelab pt2.jpg", "caption": "Elugelab después.", "license": "Public domain"},
    {"file": "Enewetak Atoll 2005-09-01, EO-1 bands 10-8-2-1.png", "caption": "El atolón de Enewetak desde satélite (2005).", "credit": "NASA", "license": "Public domain"},
  ],
  "cat-prueba-n-6-china-1967": [
    {"file": "ChinaTest6 1.jpg", "caption": "Prueba n.º 6, la primera bomba H china (17 de junio de 1967).", "credit": "Autor desconocido", "license": "Public domain"},
    {"file": "20240324 Deserts near Lop Nur 01.jpg", "caption": "Desierto de Lop Nur, el polígono de pruebas chino.", "credit": "Windmemories", "license": "CC BY-SA 4.0"},
  ],
  "cat-canopus-francia-1968": [
    {"file": "Fangataufa.JPG", "caption": "Atolón de Fangataufa (Polinesia Francesa), escenario de Canopus.", "credit": "NASA Johnson Space Center - Earth Sciences and Image Analysis", "license": "Public domain"},
    {"file": "ISS-40 Fangataufa Atoll.jpg", "caption": "Fangataufa desde la Estación Espacial Internacional.", "credit": "NASA", "license": "Public domain"},
  ],
  "cat-grapple-x-reino-unido-1957": [
    {"file": "OperationGrappleXmasIslandHbomb.jpg", "caption": "Explosión de la operación Grapple sobre la isla de Navidad (Kiritimati).", "credit": "Royal Air Force", "license": "Public domain"},
    {"file": "Operation Grapple May 1957.jpg", "caption": "Grapple, mayo de 1957.", "credit": "Autor desconocido", "license": "Public domain"},
    {"file": "Royal Engineers assemble huts on Christmas Island.jpg", "caption": "Ingenieros británicos montando barracones en la isla de Navidad.", "credit": "Ministry of Supply official photographer", "license": "Public domain"},
  ],
  "cat-rds-37-urss-1955": [
    {"file": "RDS 37.jpg", "caption": "La explosión de la RDS-37 (22 de noviembre de 1955), primera bomba H soviética de dos etapas.", "credit": "Luis Kurbos", "license": "CC BY-SA 4.0"},
    {"file": "Test Nucléaire Semipalatinsk.jpg", "caption": "Prueba nuclear en Semipalatinsk.", "credit": "Perrona Patrick André Perron", "license": "CC BY 3.0"},
  ],
  "cat-starfish-prime-ee-uu-1962": [
    {"file": "Starfish Prime aurora from Honolulu 1.jpg", "caption": "La aurora artificial vista desde Honolulu.", "license": "Public domain"},
    {"file": "Starfish prime 35mm frame.jpg", "caption": "Fotograma de 35 mm.", "credit": "US Department of Defense", "license": "CC BY-SA 4.0"},
    {"file": "Johnston Atoll satellite map.jpg", "caption": "El atolón Johnston, desde donde se lanzó el cohete.", "credit": "National Aeronautics and Space Administration Wikipedia User: Surfsupusa", "license": "Public domain"},
  ],
  "cat-orange-herald-reino-unido-1957": [
    {"file": "OperationGrappleXmasIslandHbomb.jpg", "caption": "Explosión de la operación Grapple.", "credit": "Royal Air Force", "license": "Public domain"},
    {"file": "NASA-MaldenIsland.jpg", "caption": "La isla Malden desde satélite.", "credit": "NASA Johnson Space Center", "license": "Public domain"},
  ],
  "cat-hwasong-14-prueba-6-corea-del-norte-2017": [
    {"file": "Punggye-ri Nuclear Test Site.jpg", "caption": "Polígono de pruebas de Punggye-ri (Corea del Norte) desde satélite.", "credit": "USGS", "license": "Public domain"},
    {"file": "M 6.3 Explosion - 22km ENE of Sungjibaegam, North Korea.jpg", "caption": "Registro sísmico del USGS: magnitud 6,3 el 3 de septiembre de 2017.", "credit": "USGS", "license": "Public domain"},
    {"file": "KN-20-Pg.jpg", "caption": "Misil norcoreano en un desfile.", "credit": "Dittwjfsdgkvkdjg", "license": "CC BY-SA 4.0"},
  ],
  "cat-sedan-ee-uu-1962": [
    {"file": "Storax Sedan nuke.jpg", "caption": "La explosión de Sedan levantando la cúpula de tierra.", "credit": "Federal Government of the United States", "license": "Public domain"},
    {"file": "Sedan Plowshare Crater.jpg", "caption": "El cráter Sedan.", "credit": "Federal Government of the United States", "license": "Public domain"},
    {"file": "Sedan Crater info.JPG", "caption": "Panel informativo del cráter.", "credit": "Johnherrick", "license": "CC BY-SA 3.0"},
  ],
  "cat-shakti-i-india-1998": [
    {"file": "Pokhran, Rajasthan, India - panoramio.jpg", "caption": "Pokhran (Rajastán), cerca del polígono de pruebas indio.", "credit": "Vipin Vasudeva", "license": "CC BY-SA 3.0"},
  ],
  "cat-chagai-i-pakistan-1998": [
    {"file": "Chagaiatomictests.jpg", "caption": "Las montañas de Ras Koh (Chagai) tras las pruebas de 1998.", "credit": "Government of Pakistan", "license": "CC BY 4.0"},
  ],
  "cat-trinity-ee-uu-1945": [
    {"file": "Trinity Test Fireball 16ms.jpg", "caption": "La bola de fuego a 16 ms.", "credit": "Berlyn Brixner / Los Alamos National Laboratory", "license": "Public domain"},
    {"file": "Trinity Detonation T&B.jpg", "caption": "Trinity unos segundos después.", "credit": "United States Department of Energy", "license": "Public domain"},
    {"file": "Trinity tower.jpg", "caption": "La torre de Trinity.", "credit": "Federal government of the United States", "license": "Public domain"},
    {"file": "Trinity crater (annotated) 2.jpg", "caption": "El cráter de Trinity visto desde el aire.", "credit": "Trinity_crater.jpg: Federal government of the United States derivative work: <a ", "license": "Public domain"},
  ],
  "cat-rds-1-urss-1949": [
    {"file": "Polytechnical Museum - Mock-up of RDS-1 - 2025-05.jpg", "caption": "Maqueta de la RDS-1 en el Museo Politécnico de Moscú.", "credit": "Александр Сигачёв", "license": "CC0"},
    {"file": "RIAN archive 440214 A monument to Kurchatov on the background of the Semipalatinsk nuclear test site's Central Staff.jpg", "caption": "Monumento a Kurchátov en Semipalatinsk.", "credit": "Alexander Liskin / Александр Лыскин", "license": "CC BY-SA 3.0"},
  ],
  "cat-596-china-1964": [
    {"file": "1965-01 1964年 首次原子弹爆炸3.jpg", "caption": "La nube de la prueba 596, la primera bomba china (16 de octubre de 1964).", "credit": "《人民画报》", "license": "Public domain"},
    {"file": "Zhou Enlai announced the success of China's atomic bomb test.jpg", "caption": "Zhou Enlai anuncia el éxito de la prueba.", "credit": "Autor desconocido", "license": "Public domain"},
    {"file": "Lop Nur Test Base image by KH-4 Corona on 1964-10-08 DS1011-1038DF069.png", "caption": "El polígono de Lop Nur fotografiado por un satélite espía Corona días antes.", "credit": "KH-4 Corona satellite", "license": "Public domain"},
  ],
  "cat-fat-man-nagasaki-1945": [
    {"file": "Fat Man Assembled Tinian 1945.jpg", "caption": "Fat Man montada en Tinian.", "credit": "War Department. Office of the Chief of Engineers. Manhattan Engineer District. (", "license": "Public domain"},
    {"file": "Fat Man nuclear bomb replica at NMUSAF.jpg", "caption": "Réplica en el Museo Nacional de la Fuerza Aérea.", "credit": "Christopher M. Reed", "license": "CC BY-SA 4.0"},
    {"file": "Fat Man on Tinian 77-BT-186.jpg", "caption": "Fat Man en Tinian.", "credit": "United States Navy", "license": "Public domain"},
  ],
  "cat-little-boy-hiroshima-1945": [
    {"file": "Atombombe Little Boy 2.jpg", "caption": "Little Boy en Tinian.", "credit": "Autor desconocido", "license": "Public domain"},
    {"file": "Little Boy atomic bomb replica displayed beneath a B-29 Superfortress - National Museum of the United States Air Force, Dayton, Ohio, USA.jpg", "caption": "Réplica bajo un B-29.", "credit": "Sebastiaan Broekhoven", "license": "CC BY-SA 4.0"},
    {"file": "Little Boy bomb.jpg", "caption": "Little Boy en su carro.", "credit": "US Atomic Energy Commission (now US Department of Energy)", "license": "Public domain"},
  ],
  "cat-grable-ee-uu-1953": [
    {"file": "Upshot-Knothole GRABLE.jpg", "caption": "Grable, disparada por el cañón M65 en Nevada.", "license": "Public domain"},
    {"file": "M65 Atomic Cannon 001.jpg", "caption": "El cañón M65 «Atomic Annie».", "credit": "Federal Government of the United States", "license": "Public domain"},
  ],
  "cat-smiling-buddha-india-1974": [
    {"file": "Pokhran, Rajasthan, India - panoramio.jpg", "caption": "Pokhran (Rajastán), cerca del lugar de la prueba.", "credit": "Vipin Vasudeva", "license": "CC BY-SA 3.0"},
  ],
  "cat-b41-ee-uu": [
    {"file": "B41 nuclear bomb.jpg", "caption": "Bomba B41.", "credit": "Ultimate source: Either a photo of the Air Force or the DOE.", "license": "Public domain"},
    {"file": "Mark 41 thermonuclear bomb casing.jpg", "caption": "Carcasa de la Mark 41.", "credit": "Wilson44691", "license": "CC0"},
    {"file": "Mk 41 Nuclear Bomb w Convair B-36 Peacemaker (6693382923) (11).jpg", "caption": "Mk 41 junto a un bombardero B-36.", "credit": "Clemens Vasters from Viersen, Germany", "license": "CC BY 2.0"},
  ],
  "cat-r-36m-ojiva-unica-urss": [
    {"file": "R-36M missile.JPG", "caption": "Misil R-36M (SS-18 «Satan») en exhibición.", "credit": "Vladimir Zinin", "license": "CC BY-SA 3.0"},
    {"file": "Side view of a R-36M missile.JPG", "caption": "Vista lateral del R-36M.", "credit": "Vladimir Zinin", "license": "CC BY-SA 3.0"},
    {"file": "Парк ракет. Дніпропетровськ.JPG", "caption": "Parque de cohetes de Dnipró (Ucrania), donde se diseñó.", "credit": "Pavlo1", "license": "CC BY-SA 4.0"},
  ],
  "cat-mk-17-ee-uu": [
    {"file": "Mk17 bomb.jpg", "caption": "Bomba Mk 17, la primera bomba H lanzable por un avión estadounidense.", "license": "Public domain"},
    {"file": "Mk-17 Theronuclear Bomb, National Museum of Nuclear Science & History.JPG", "caption": "Mk 17 en el National Museum of Nuclear Science & History.", "credit": "byteboy", "license": "CC BY 3.0"},
  ],
  "cat-b53-w53-ee-uu": [
    {"file": "B53 thermonuclear bomb - Justgrimes - 30894266357.jpg", "caption": "Bomba B53.", "credit": "justgrimes", "license": "CC BY-SA 2.0"},
    {"file": "Inspection of B53 nuclear bomb 2006.jpg", "caption": "Inspección de la última B53 antes de su desmantelamiento (2006).", "credit": "Unkwon", "license": "Public domain"},
    {"file": "532d Strategic Missile Squadron - LGM-25C Titan II Sites.png", "caption": "Lanzamiento de un Titan II, el misil que portaba la W53.", "credit": "Bwmoll3", "license": "CC BY-SA 3.0"},
  ],
  "cat-df-5-ojiva-unica-china": [
    {"file": "Dongfeng-5B head.JPG", "caption": "Ojiva y cono del DF-5B en el Museo Militar de Pekín.", "credit": "IceUnshattered", "license": "CC BY-SA 4.0"},
    {"file": "DF-5B, first stage.jpg", "caption": "Primera etapa de un DF-5B.", "credit": "IceUnshattered", "license": "CC BY-SA 4.0"},
  ],
  "cat-b28-ee-uu": [
    {"file": "B28 nuclear bomb, National Museum of Nuclear Science & History.JPG", "caption": "B28 en el National Museum of Nuclear Science & History.", "credit": "byteboy", "license": "CC BY 3.0"},
    {"file": "Mk 28 nuclear bomb Ellsworth AFB 1984.JPEG", "caption": "Mk 28 en la base aérea de Ellsworth (1984).", "credit": "TSgt. Boyd Belcher, USAF", "license": "Public domain"},
    {"file": "Palomares Bomb Casings.jpg", "caption": "Carcasas de Palomares.", "credit": "Plumbob78 at English", "license": "Public domain"},
  ],
  "cat-w56-ee-uu": [
    {"file": "LGM-30F Minuteman II W56 Mk-11 warhead.jpg", "caption": "Vehículo de reentrada Mk-11 con la ojiva W56 del Minuteman II.", "credit": "USAF", "license": "Public domain"},
    {"file": "Minuteman II in silo 1980.jpg", "caption": "Minuteman II en su silo (1980).", "license": "Public domain"},
    {"file": "Minuteman II ICBM - March AFB Museum - panoramio.jpg", "caption": "Minuteman II en el museo de March.", "credit": "Steve Riggins", "license": "CC BY 3.0"},
  ],
  "cat-b43-ee-uu": [
    {"file": "Hull of a B43 nuclear bomb, on display in Dresden.jpg", "caption": "Carcasa de una B43 expuesta en Dresde.", "credit": "Photographer: Mosbatho", "license": "CC BY 4.0"},
    {"file": "B43 bomb casing on display.jpg", "caption": "Carcasa de B43 en exhibición.", "credit": "Greg Goebel", "license": "Public domain"},
  ],
  "cat-w62-ee-uu": [
    {"file": "Minuteman III warheads.jpg", "caption": "Ojivas del Minuteman III.", "credit": "Unknown or not provided", "license": "Public domain"},
    {"file": "Minuteman III RVs.jpg", "caption": "Vehículos de reentrada del Minuteman III.", "credit": "USAF", "license": "Public domain"},
  ],
  "cat-w48-ee-uu": [
    {"file": "W48 155-millimeter nuclear shell.jpg", "caption": "Proyectil nuclear W48 de 155 mm.", "credit": "US-Department of Energy", "license": "Public domain"},
    {"file": "W33, W48 and W79 nuclear artillery shells.jpg", "caption": "Proyectiles nucleares W33, W48 y W79.", "credit": "Department of Energy", "license": "Public domain"},
    {"file": "W48 nuclear artillery shell - Atomic Testing Museum, Las Vegas 23.jpg", "caption": "W48 en el National Atomic Testing Museum de Las Vegas.", "credit": "justgrimes", "license": "CC BY-SA 2.0"},
  ],
  "cat-w54-davy-crockett-ee-uu": [
    {"file": "Davy Crockett at the National Museum of Nuclear Science and History.gk.jpg", "caption": "Davy Crockett en el National Museum of Nuclear Science and History.", "credit": "Grendelkhan", "license": "CC BY-SA 3.0"},
    {"file": "M388 Davy Crockett mounted on Jeep c1961.jpg", "caption": "Davy Crockett montada en un jeep.", "credit": "U.S. Navy", "license": "Public domain"},
    {"file": "SADM carry bag.jpg", "caption": "Bolsa de transporte de la SADM, la versión «mochila» de la W54.", "credit": "McDuff, Glen George.", "license": "Public domain"},
  ],
  "cat-poseidon-status-6-rusia": [
    {"file": "Status-6.jpg", "caption": "Diapositiva del Status-6 «Poseidón» mostrada por error en la televisión rusa (2015).", "credit": "Russian DoD (license in bottom of the page)", "license": "CC BY 4.0"},
    {"file": "Belgorod.jpg", "caption": "El submarino Belgorod, portador previsto del Poseidón.", "credit": "Bairuilong", "license": "CC BY-SA 4.0"},
  ],
  "cat-avangard-rusia": [
    {"file": "UR-100N ICBM at ARMY-2022.jpg", "caption": "Misil UR-100N UTTKh, el cohete portador del planeador Avangard, en ARMY-2022.", "credit": "Boevaya mashina", "license": "CC BY-SA 3.0"},
    {"file": "Model of UR-100N UTTKh.jpg", "caption": "Maqueta del UR-100N UTTKh.", "credit": "Boevaya mashina", "license": "CC BY-SA 4.0"},
  ],
  "cat-b83-1-ee-uu": [
    {"file": "B83 nuclear bomb trainer.jpg", "caption": "Bomba de entrenamiento B83.", "credit": "U.S. Air Force/Master Sgt. Ken Hammond", "license": "Public domain"},
    {"file": "B83 nuclear bomb test with F-4C Phantom 1983.JPEG", "caption": "Prueba de lanzamiento de una B83 desde un F-4C (1983).", "credit": "Zapka, USAF", "license": "Public domain"},
    {"file": "B-83 nuclear weapon.jpg", "caption": "Bomba B83.", "license": "Public domain"},
  ],
  "cat-r-36m2-ojiva-mirv-rusia": [
    {"file": "Russian SS-18 Satan (16172539190).jpg", "caption": "Misil SS-18 «Satan» en el parque de cohetes de Dnipró.", "credit": "Clay Gilliland", "license": "CC BY-SA 2.0"},
    {"file": "Музей ракетной техники РВСН.jpg", "caption": "Museo de cohetes de las Fuerzas de Misiles Estratégicos de Rusia.", "credit": "Ministry of Defense of Russia", "license": "CC BY 4.0"},
    {"file": "Artist's concept of a Soviet SS-18 ICBM.JPEG", "caption": "Concepto artístico estadounidense de un SS-18 (años 80).", "credit": "Autor desconocido", "license": "Public domain"},
  ],
  "cat-topol-m-rusia": [
    {"file": "19-03-2012-Parade-rehearsal - Topol-M.jpg", "caption": "Lanzador Topol-M en el ensayo del desfile de Moscú (2012).", "credit": "Vitaly V. Kuzmin", "license": "CC BY-SA 4.0"},
    {"file": "RT-2PM2 Topol-M-23.jpg", "caption": "Topol-M (RT-2PM2) en movimiento.", "credit": "Vitaly V. Kuzmin", "license": "CC BY-SA 4.0"},
    {"file": "Topol-M ICBM tanks during the Victory parade 2012.jpg", "caption": "Topol-M en el desfile de la Victoria de 2012.", "credit": "Stefan Un", "license": "CC BY 2.0"},
  ],
  "cat-w88-ee-uu": [
    {"file": "An unarmed Trident II D5 missile launches from USS Rhode Island (SSBN-740) off the coast of Cape Canaveral 9 May 2019.jpg", "caption": "Lanzamiento de un Trident II D5 desde el USS Rhode Island.", "credit": "John Kowalski", "license": "Public domain"},
    {"file": "Trident II D5 launches from the USS Nebraska (SSBN 739), March 26, 2008.jpg", "caption": "Trident II D5 lanzado desde el USS Nebraska (2008).", "credit": "National Museum of the U.S. Navy", "license": "Public domain"},
  ],
  "cat-b61-11-ee-uu": [
    {"file": "B-61 bomb.jpg", "caption": "Bomba B61.", "credit": "Autor desconocido", "license": "Public domain"},
    {"file": "Model of B61 nuclear bomb at the National Atomic Testing Museum.jpg", "caption": "Modelo de B61 en el National Atomic Testing Museum.", "credit": "Peter Burka", "license": "CC BY-SA 2.0"},
    {"file": "US Air Force personell and B61 bomb on board a C17 2.jpg", "caption": "Personal de la Fuerza Aérea con una B61 en un C-17.", "credit": "U.S. Air Force Airman 1st Class Callie Norton", "license": "Public domain"},
  ],
  "cat-b61-13-ee-uu": [
    {"file": "Model of B61 nuclear bomb at the National Atomic Testing Museum.jpg", "caption": "Modelo de B61 en el National Atomic Testing Museum.", "credit": "Peter Burka", "license": "CC BY-SA 2.0"},
    {"file": "B-2 bomb bay 050411-F-1740G-005.jpg", "caption": "Bodega del B-2, uno de los aviones que portarán la B61-13.", "credit": "USAF/Master Sgt Val Gempis", "license": "Public domain"},
  ],
  "cat-w78-ee-uu": [
    {"file": "W78 MK12A RV Minuteman III.jpg", "caption": "Vehículo de reentrada Mk12A de la ojiva W78 del Minuteman III.", "license": "Public domain"},
    {"file": "Minuteman III warheads.jpg", "caption": "Ojivas del Minuteman III.", "credit": "Unknown or not provided", "license": "Public domain"},
  ],
  "cat-w87-ee-uu": [
    {"file": "W87 Peacekeeper warheads.png", "caption": "Ojivas W87 del Peacekeeper.", "credit": "NNSA", "license": "Public domain"},
    {"file": "Ten LGM-118 Peacekeeper MIRVs over Kwajalein in 1984.jpeg", "caption": "Diez vehículos de reentrada del Peacekeeper sobre Kwajalein (1984).", "credit": "USAF", "license": "Public domain"},
    {"file": "Mk21 Reentry vehicle.png", "caption": "Vehículo de reentrada Mk21.", "credit": "L Maartin", "license": "Public domain"},
  ],
  "cat-tna-asmp-a-francia": [
    {"file": "ASMP-A P1220887.jpg", "caption": "Misil ASMP-A en exhibición.", "credit": "David Monniaux", "license": "CC BY-SA 3.0"},
    {"file": "RafaleBGascogne.jpg", "caption": "Rafale B, el avión portador del ASMP-A.", "credit": "Newresid stephanelhernault@yahoo.fr", "license": "CC BY-SA 3.0"},
  ],
  "cat-kh-102-rusia": [
    {"file": "Kh-55 AS-15 Kent 2016 G1.jpg", "caption": "Misil de crucero Kh-55, antecesor del Kh-102.", "credit": "George Chernilevsky", "license": "Public domain"},
    {"file": "H-55 AS-15 Kent 2008 G1.jpg", "caption": "Kh-55 en exhibición.", "credit": "George Chernilevsky", "license": "Public domain"},
  ],
  "cat-hwasong-17-corea-del-norte": [
    {"file": "Hwasong17-20201010-KORN Pyonyang-N323-2.jpg", "caption": "El Hwasong-17 en el desfile de Pyongyang de octubre de 2020.", "credit": "North Korea Public Relationships", "license": "CC BY 4.0"},
    {"file": "Stele memorial of Hwasong ICBM, near Pyongsong - 01.jpg", "caption": "Monumento al ICBM Hwasong cerca de Pyongsong.", "credit": "Jan Engelhardt", "license": "CC BY-SA 4.0"},
  ],
  "cat-w80-1-ee-uu": [
    {"file": "AGM-86 ALCM.JPEG", "caption": "Misil AGM-86 ALCM, portador de la W80-1.", "credit": "R.L. House", "license": "Public domain"},
    {"file": "20180328 AGM-86B Udvar-Hazy.jpg", "caption": "AGM-86B en el museo Udvar-Hazy.", "credit": "Balon Greyjoy", "license": "CC0"},
    {"file": "W80 Mod 1.jpg", "caption": "Ojiva W80 Mod 1.", "credit": "US Department of Energy", "license": "Public domain"},
  ],
  "cat-bulava-ojiva-rusia": [
    {"file": "A Borei class submarine at sea.jpg", "caption": "Submarino de la clase Borei, portador del Bulava.", "credit": "Ministry of Defence of the Russian Federation", "license": "CC BY 4.0"},
    {"file": "K-552 at Northern fleet.jpg", "caption": "Submarino K-552 de la Flota del Norte.", "credit": "Министерство обороны Российской Федерации", "license": "CC BY 4.0"},
  ],
  "cat-yars-rs-24-ojiva-rusia": [
    {"file": "RS-24 Yars.jpg", "caption": "Lanzador del RS-24 Yars.", "credit": "Ministry of Defence of the Russian Federation", "license": "CC BY 4.0"},
    {"file": "RocketExercise2019-06.jpg", "caption": "Ejercicio de las Fuerzas de Misiles Estratégicos (2019).", "credit": "Alexey Kitayev (Алексей Китаев)", "license": "CC BY 4.0"},
    {"file": "Moscow Victory Day Parade (2019) 08.jpg", "caption": "Yars en el desfile de la Victoria de 2019.", "credit": "Минобороны России", "license": "CC BY 4.0"},
  ],
  "cat-holbrook-trident-reino-unido": [
    {"file": "Vanguard-class submarine off Cove Point on Clyde.jpg", "caption": "Submarino británico de la clase Vanguard en el Clyde.", "credit": "dave souza", "license": "CC BY-SA 4.0"},
    {"file": "HMS Vanguard (SSBN-50).jpg", "caption": "HMS Vanguard.", "credit": "OS2 JOHN BOUVIA", "license": "Public domain"},
    {"file": "Trident II missile image.jpg", "caption": "Misil Trident II.", "credit": "Autor desconocido", "license": "Public domain"},
  ],
  "cat-tn-75-tno-francia": [
    {"file": "Argonaute submarine exhibition - model of French submarine le Triomphant.jpg", "caption": "Maqueta del submarino Le Triomphant.", "credit": "Tangopaso", "license": "Public domain"},
    {"file": "Temeraire1048.jpg", "caption": "El submarino Le Téméraire.", "license": "CC BY-SA 2.0 fr"},
    {"file": "M51 ARV.JPG", "caption": "Vehículo de reentrada del misil M51.", "credit": "Autor desconocido", "license": "Public domain"},
  ],
  "cat-w76-1-ee-uu": [
    {"file": "W76-1 NNSA.jpg", "caption": "Ojiva W76-1 (NNSA).", "credit": "National Nuclear Security Administration", "license": "Public domain"},
    {"file": "W76.gif", "caption": "La ojiva W76.", "license": "Attribution"},
    {"file": "Trident II missile image.jpg", "caption": "Misil Trident II.", "credit": "Autor desconocido", "license": "Public domain"},
  ],
  "cat-b61-12-ee-uu": [
    {"file": "F-35A with 2 B61-12 bombs.jpg", "caption": "F-35A con dos B61-12 durante las pruebas.", "credit": "Los Alamos National Laboratory", "license": "Public domain"},
    {"file": "F-35 B61-12 trial.jpg", "caption": "Prueba de la B61-12 con un F-35.", "credit": "Los Alamos National Laboratory", "license": "Public domain"},
    {"file": "B-61 bomb.jpg", "caption": "Bomba B61.", "credit": "Autor desconocido", "license": "Public domain"},
  ],
  "cat-iskander-m-nuclear-rusia": [
    {"file": "Vostok2014-Day2-Iskander-M-05.jpg", "caption": "Iskander-M en las maniobras Vostok-2014.", "credit": "Алексей Ерешко (Alexey Yereshko)", "license": "CC BY 4.0"},
    {"file": "9K720 Iskander (SS-26 Stone) (41253217174).jpg", "caption": "Lanzador del 9K720 Iskander.", "credit": "Dmitriy Fomin from Moscow, Russia", "license": "CC BY 2.0"},
    {"file": "9P78-1 TEL Iskander-M.JPG", "caption": "Vehículo lanzador 9P78-1.", "credit": "Boevaya mashina", "license": "CC BY-SA 4.0"},
  ],
  "cat-w76-2-ee-uu": [
    {"file": "W76-1 NNSA.jpg", "caption": "Ojiva W76 (NNSA).", "credit": "National Nuclear Security Administration", "license": "Public domain"},
    {"file": "Ohio Class.png", "caption": "Submarino de la clase Ohio, portador de la W76-2.", "credit": "A proietti", "license": "CC BY-SA 4.0"},
  ],
  "cat-minor-scale-ee-uu-1985": [
    {"file": "Minor Scale Blast.jpg", "caption": "Minor Scale (27 de junio de 1985): 4 800 t de ANFO, la mayor explosión convencional planificada de EE. UU.", "credit": "U.S. Army", "license": "Public domain"},
  ],
  "cat-heligoland-british-bang-1947": [
    {"file": "The Destruction of Heligoland Defenses. April 1947, Still Taken From An Admiralty Documentary Film Processed For Scientific Purposes. the Camera Was Set Up on the Island of Dune, Half a Mile Away From Heligolan A31319.jpg", "caption": "El «Big Bang» británico de Heligoland (18 de abril de 1947), fotograma de la Admiralty.", "credit": "Autor desconocido", "license": "Public domain"},
    {"file": "Aerial image of Heligoland.jpg", "caption": "Heligoland desde el aire hoy.", "credit": "Carsten Steger", "license": "CC BY-SA 4.0"},
  ],
  "cat-halifax-canada-1917": [
    {"file": "Halifax Explosion blast cloud restored.jpg", "caption": "La nube de la explosión de Halifax (6 de diciembre de 1917), fotografiada a 21 km.", "credit": "Autor desconocido", "license": "Public domain"},
    {"file": "Panoramic view of damage to Halifax waterfront after Halifax Explosion, 1917.jpg", "caption": "Panorámica de los daños en el puerto de Halifax.", "credit": "W.G. MacLaughlan", "license": "Public domain"},
    {"file": "Halifax explosion - Imo.jpg", "caption": "Restos del Imo, el barco que chocó con el Mont-Blanc.", "credit": "Autor desconocido", "license": "Public domain"},
  ],
  "cat-port-chicago-ee-uu-1944": [
    {"file": "Portchicago.jpg", "caption": "El muelle de Port Chicago tras la explosión del 17 de julio de 1944.", "credit": "Mare Island Navy Yard", "license": "Public domain"},
    {"file": "Port Chicago Naval Magazine National Memorial POCH 0007.jpg", "caption": "Memorial Nacional de Port Chicago.", "credit": "National Park Service Digital Image Archives", "license": "Public domain"},
    {"file": "Port Chicago disaster, pier diagram.jpg", "caption": "Esquema del muelle.", "credit": "unknown US military serviceman from Naval Ammunition Depot, Mare Island (NADMI)", "license": "Public domain"},
  ],
  "cat-oppau-alemania-1921": [
    {"file": "Oppau Explosion 1921.JPG", "caption": "El cráter de la explosión de Oppau (BASF, 21 de septiembre de 1921).", "credit": "Autor desconocido", "license": "Public domain"},
    {"file": "Oppau zerstoerte Gebaeude 1921.jpg", "caption": "Edificios destruidos en Oppau.", "credit": "BASF", "license": "CC BY-SA 3.0"},
    {"file": "Ludwigshafen-Oppau Gedenkstein 1921.jpg", "caption": "Piedra conmemorativa en Ludwigshafen-Oppau.", "credit": "--Immanuel Giel 08:12, 18 October 2005 (UTC)", "license": "CC BY-SA 3.0"},
  ],
  "cat-beirut-libano-2020": [
    {"file": "Damages after 2020 Beirut explosions 1.jpg", "caption": "Daños tras la explosión del puerto de Beirut (4 de agosto de 2020).", "credit": "Mahdi Shojaeian", "license": "CC BY 4.0"},
    {"file": "Port of Beirut explosion aftermath 4 August 2020.jpg", "caption": "El puerto de Beirut tras la explosión.", "credit": "Anchal Vohra", "license": "Public domain"},
    {"file": "2020-08-04 Beirut, Lebanon M3.3 explosion intensity map (USGS).jpg", "caption": "Mapa de intensidad del USGS: la explosión registró magnitud 3,3.", "credit": "Un", "license": "Public domain"},
  ],
  "cat-texas-city-ee-uu-1947": [
    {"file": "Txcitydisasterboat.jpg", "caption": "Un barco lanzado a tierra por la explosión de Texas City (1947).", "license": "Public domain"},
    {"file": "Texas City Disaster Firemen Memorial.jpg", "caption": "Memorial a los bomberos de Texas City.", "credit": "Jim Evans", "license": "CC BY-SA 4.0"},
  ],
  "cat-tianjin-china-2015": [
    {"file": "Tianjin explosion scene (1).jpg", "caption": "La zona de la explosión de Tianjin (12 de agosto de 2015).", "credit": "Voice of America/美国之音", "license": "Public domain"},
    {"file": "Tianjin explosion destroyed buildings (6).jpg", "caption": "Edificios destruidos.", "credit": "Voice of America/美国之音", "license": "Public domain"},
  ],
  "cat-foab-padre-de-todas-las-bombas-rusia": [
    {"file": "Fuel Air Explosive bombs in South Vietnam 1970.jpg", "caption": "Bombas de combustible-aire (termobáricas) en Vietnam del Sur, 1970.", "credit": "USN", "license": "Public domain"},
    {"file": "ОДАБ-500ПМВ - МАКС-2009 01.jpg", "caption": "Bomba ODAB-500, también termobárica, en el salón MAKS-2009.", "credit": "Vitaly V. Kuzmin", "license": "CC BY-SA 4.0"},
  ],
  "cat-gbu-43-b-moab-madre-de-todas-las-bombas-ee-uu": [
    {"file": "MOAB bomb.jpg", "caption": "La GBU-43/B MOAB.", "credit": "U.S. Department of Defense photograph", "license": "Public domain"},
    {"file": "MOABAFAM.JPG", "caption": "MOAB en el Museo de Armamento de la Fuerza Aérea.", "credit": "Fl295 at English Wikipedia</", "license": "Public domain"},
  ],
  "cat-blu-82-daisy-cutter-ee-uu": [
    {"file": "BLU-82 bomb at National Museum of the USAF (090122-F-1234P-004).jpg", "caption": "BLU-82 en el Museo Nacional de la Fuerza Aérea de EE. UU.", "credit": "U.S. Air Force", "license": "Public domain"},
    {"file": "BLU-82 Daisy Cutter Fireball.JPG", "caption": "La bola de fuego de una BLU-82.", "credit": "U.S. Air Force photo/Capt. Patrick Nichols", "license": "Public domain"},
  ],
  "cat-grand-slam-reino-unido-1945": [
    {"file": "British Grand Slam bomb.jpg", "caption": "Una Grand Slam británica.", "license": "Public domain"},
    {"file": "A 22,000lb 'Grand Slam' falls away from an Avro Lancaster of No. 617 Squadron RAF during an attack on the viaduct at Arnsberg, Germany, 19 March 1945. CH15374.jpg", "caption": "Una Grand Slam cayendo de un Lancaster del escuadrón 617.", "credit": "No. 1 RAFFPU, Royal Air Force (RAF) official photographer", "license": "Public domain"},
    {"file": "Grand Slam bomb exploding near Arnsberg viaduct 1945.jpg", "caption": "Explosión de una Grand Slam junto al viaducto de Arnsberg (1945).", "credit": "No 4 RAFFPU, Royal Air Force official photographer", "license": "Public domain"},
  ],
  "cat-tallboy-reino-unido-1944": [
    {"file": "Tallboy bomb, Yorkshire Air Museum, Elvington. (6918474131).jpg", "caption": "Tallboy en el Yorkshire Air Museum.", "credit": "Roland Turner from Birmingham, Great Britain", "license": "CC BY-SA 2.0"},
    {"file": "Watten site Tallboy damage.jpg", "caption": "Daños de una Tallboy en el búnker de Watten.", "credit": "Morgan, W.C. (Maj.)", "license": "Public domain"},
  ],
  "cat-gbu-57-mop-ee-uu": [
    {"file": "B-52 releases the MOP during a weapons test.jpg", "caption": "Un B-52 suelta la MOP durante una prueba.", "credit": "DoD photo", "license": "Public domain"},
    {"file": "MOP in the B-2 bomb bay.jpg", "caption": "La MOP en la bodega del B-2.", "credit": "U.S. Air Force photo", "license": "Public domain"},
  ],
  "cat-mk-84-gbu-31-ee-uu": [
    {"file": "Mark-84 bomb.jpg", "caption": "Bomba Mark 84.", "credit": "STAFF SGT. LEE F. CORKRAN", "license": "Public domain"},
    {"file": "Mk 84 bomb explosion Vietnam c1972.jpg", "caption": "Explosión de una Mk 84 en Vietnam, hacia 1972.", "credit": "Bud Taylor, VF-161, USN", "license": "Public domain"},
  ],
  "cat-2008-tc3-sudan-2008": [
    {"file": "Search team pointing at a fragment of 2008 TC3.jpg", "caption": "El equipo de búsqueda señala un fragmento de 2008 TC3 en el desierto de Nubia (Sudán).", "credit": "Peter Jenniskens", "license": "Public domain"},
    {"file": "Almahata Sitta meteorite.jpg", "caption": "Meteorito Almahata Sitta.", "credit": "Jon Taylor", "license": "CC BY-SA 2.0"},
  ],
  "cat-sikhote-alin-rusia-1947": [
    {"file": "Oriented Sikhote-Alin Meteorite 2.jpg", "caption": "Meteorito Sikhote-Alin orientado, con la forma de su caída.", "credit": "NathanScientific", "license": "CC0"},
    {"file": "The third biggest piece of the Sikhote-Alin meteorite.jpg", "caption": "El tercer mayor fragmento del Sikhote-Alin.", "credit": "Christine und Hagen Graf", "license": "CC BY 2.0"},
  ],
  "cat-cheliabinsk-rusia-2013": [
    {"file": "2013 Chelyabinsk meteor trace.jpg", "caption": "La estela del meteoro.", "credit": "Alex Alishevskikh", "license": "CC BY-SA 2.0"},
    {"file": "Ekaterinburg view of 2013 meteor event.jpg", "caption": "El meteoro visto desde Ekaterimburgo.", "credit": "Svetlana Korzhova", "license": "CC BY-SA 3.0"},
    {"file": "Chabarkul Lake.jpg", "caption": "El lago Chebarkul, donde cayó el mayor fragmento.", "credit": "<a href=\"//commons.wikimedia.org/w/index.php?title=User:%D0%9D%D0%B5_%D0%B1%D0%B", "license": "CC0"},
  ],
  "cat-crater-barringer-50-000-a-c": [
    {"file": "Meteor Crater - Arizona.jpg", "caption": "Meteor Crater.", "credit": "National Map Seamless Server", "license": "Public domain"},
    {"file": "Meteor Crater model.jpg", "caption": "Maqueta del cráter.", "credit": "Vicpeters", "license": "CC BY 4.0"},
    {"file": "Canyon-diablo-meteorite.jpg", "caption": "Fragmento del meteorito Canyon Diablo.", "credit": "Geoffrey Notkin, Aerolite Meteorites of Tucson Original uploader was Geoking42 a", "license": "CC BY-SA 2.5"},
  ],
  "cat-tunguska-siberia-1908": [
    {"file": "Tunguska Ereignis-1.jpg", "caption": "Árboles abatidos en Tunguska (expedición Kulik).", "credit": "Leonid Kulik, the expedition to the Tunguska event", "license": "Public domain"},
    {"file": "Tunguska event effect areas 3.png", "caption": "Área afectada.", "credit": "own work and chatGPT 4o and 3 AI", "license": "Public domain"},
  ],
  "cat-2024-yr4-hipotetico": [
    {"file": "Asteroid 2024 YR4 observed with ESO’s Very Large Telescope (eso2505a).jpg", "caption": "El asteroide 2024 YR4 observado por el VLT de ESO.", "credit": "ESO/O. Hainaut", "license": "CC BY 4.0"},
    {"file": "2024 YR4 risk corridor.png", "caption": "Corredor de riesgo de 2024 YR4 antes de descartarse el impacto.", "credit": "Daniel Bamberger (Renerpho)", "license": "CC BY-SA 4.0"},
    {"file": "2024 YR4 2032 uncertainty region 27Jan2025 vs 19Feb2025.png", "caption": "Región de incertidumbre en 2032: a medida que se observaba, la Tierra quedó fuera.", "credit": "NASA JPL/CNEOS", "license": "Public domain"},
  ],
  "cat-dimorphos-hipotetico": [
    {"file": "Dimorphos North-Up Image Composition (final 10 full-frame images).png", "caption": "Dimorphos en las últimas imágenes de DART.", "credit": "NASA/Johns Hopkins APL", "license": "Public domain"},
    {"file": "Dimorphos and Didymos as seen by DARTMission.png", "caption": "Dídimo y Dimorphos vistos por DART.", "credit": "NASA/JH-APL/Roman Tkachenko", "license": "Public domain"},
  ],
  "cat-oumuamua-hipotetico": [
    {"file": "Artist impression of interstellar asteroid ʻOumuamua (eso1737e).tiff", "caption": "Recreación artística de ʻOumuamua, el primer objeto interestelar conocido (ESO).", "credit": "ESO/M. Kornmesser", "license": "CC BY 4.0"},
    {"file": "A2017U1 5gsmoothWHT enhanced.jpg", "caption": "ʻOumuamua visto por los telescopios: apenas un punto.", "credit": "Alan Fitzsimmons (Astrophysics Research Centre, <a href=\"https://en.wikipedia.or", "license": "Public domain"},
  ],
  "cat-itokawa-hipotetico": [
    {"file": "Itokawa06 hayabusa.jpg", "caption": "Itokawa fotografiado por la sonda japonesa Hayabusa.", "credit": "ISAS, JAXA", "license": "CC BY 4.0"},
    {"file": "Asteroid (25143) Itokawa seen in close-up (eso1405c).jpg", "caption": "Itokawa de cerca.", "credit": "JAXA", "license": "CC BY 4.0"},
  ],
  "cat-apophis-hipotetico": [
    {"file": "99942 Apophis shape.png", "caption": "Forma de Apophis según el radar.", "credit": "Astronomical Institute of the Charles University: Josef Ďurech, Vojtěch Sidorin", "license": "CC BY 4.0"},
    {"file": "Size of Apophis asteroid.png", "caption": "Tamaño de Apophis comparado.", "credit": "Phoenix CZE", "license": "CC BY-SA 4.0"},
    {"file": "Change in orbit of Apophis in 2029.png", "caption": "Cambio de su órbita en 2029.", "credit": "Eric Kvaalen", "license": "CC BY-SA 4.0"},
  ],
  "cat-bennu-hipotetico": [
    {"file": "Bennu mosaic OSIRIS-REx (square).png", "caption": "Mosaico de Bennu tomado por OSIRIS-REx.", "credit": "NASA/Goddard/University of Arizona", "license": "Public domain"},
    {"file": "OSIRIS-REx SRC and Bennu.png", "caption": "La cápsula de retorno de muestras de OSIRIS-REx.", "credit": "NASA/Goddard/University of Arizona/Lockheed Martin", "license": "Public domain"},
  ],
  "cat-didymos-hipotetico": [
    {"file": "3-frame mosaic of 65803 Didymos, taken by LICIACube on departure.png", "caption": "Mosaico de Dídimo tomado por LICIACube.", "credit": "NASA / zelario12", "license": "Public domain"},
    {"file": "Didymos from DART I DRACO.jpg", "caption": "Dídimo visto por la cámara DRACO de DART.", "credit": "NASA / zelario12", "license": "Public domain"},
  ],
  "cat-ryugu-hipotetico": [
    {"file": "162173 Ryugu brightened.png", "caption": "Ryugu fotografiado por la sonda Hayabusa2.", "credit": "Original image taken by JAXA/ISAS, processed by User:Anonymsiy, image adjusted b", "license": "CC BY 4.0"},
    {"file": "Hayabusa2 near Ryugu (41404161811).jpg", "caption": "Hayabusa2 cerca de Ryugu.", "credit": "DLR German Aerospace Center", "license": "CC BY 2.0"},
  ],
  "cat-asteroide-de-1-km": [
    {"file": "PIA02475 Eros' Bland Butterscotch Colors.jpg", "caption": "El asteroide Eros (33 km), visto por NEAR Shoemaker.", "credit": "NASA/JPL/JHUAPL", "license": "Public domain"},
    {"file": "Planetoid crashing into primordial Earth.jpg", "caption": "Ilustración de un gran impacto en la Tierra primitiva (NASA).", "credit": "Don Davis (work commissioned by NASA)", "license": "Public domain"},
  ],
  "cat-fragmento-de-shoemaker-levy-9": [
    {"file": "Comet P-Shoemaker-Levy 9 (opo9443e).jpg", "caption": "El cometa fragmentado, en una imagen del Hubble.", "credit": "NASA & ESA", "license": "Public domain"},
    {"file": "Jupiter showing SL9 impact sites.jpg", "caption": "Júpiter con las manchas de los impactos.", "credit": "Hubble Space Telescope Comet Team and NASA", "license": "Public domain"},
  ],
  "cat-cometa-de-5-km": [
    {"file": "Comet 67P on 19 September 2014 NavCam mosaic.jpg", "caption": "El núcleo del cometa 67P/Churiúmov-Guerasimenko, de unos 4 km, visto por Rosetta.", "credit": "ESA/Rosetta/NAVCAM, CC BY-SA IGO 3.0", "license": "CC BY-SA 3.0 igo"},
    {"file": "Comparison of Comet Nucleus Sizes (2022-020).png", "caption": "Comparación de tamaños de núcleos de cometas.", "credit": "ILLUSTRATION: NASA, ESA, Zena Levy (STScI)", "license": "Public domain"},
  ],
  "cat-popigai-siberia-35-ma": [
    {"file": "Popigai crater DS1040-1037DA019-024.jpg", "caption": "El cráter de Popigái (Siberia) fotografiado desde el espacio.", "credit": "James Stuby based on declassified panoramic camera images", "license": "Public domain"},
    {"file": "Popigai nanodiamonds.jpg", "caption": "Nanodiamantes de impacto de Popigái.", "credit": "Hiroaki Ohfuji et al.", "license": "CC BY 4.0"},
  ],
  "cat-chicxulub-extincion-k-pg": [
    {"file": "Chicxulub schematic section.png", "caption": "Sección esquemática del cráter de Chicxulub.", "credit": "Mikenorton", "license": "CC BY-SA 4.0"},
    {"file": "Chicxulub Impact Crater, Gulf of Mexico (33789560443).jpg", "caption": "El cráter de Chicxulub en el golfo de México.", "credit": "O.V.E.R.V.I.E.W.", "license": "CC BY 2.0"},
    {"file": "Cretaceous paleogene iridium anomaly 3.png", "caption": "La anomalía de iridio del límite K-Pg, prueba del impacto.", "credit": "Merikanto", "license": "CC BY-SA 4.0"},
  ],
  "cat-cometa-halley-hipotetico": [
    {"file": "Comet Halley.jpg", "caption": "El cometa Halley en 1986.", "credit": "Kuiper Airborne Observatory, C141 aircraft April 8/9, 1986, New Zealand Expediti", "license": "Public domain"},
    {"file": "Comet Halley close up.jpg", "caption": "El núcleo de Halley fotografiado por la sonda Giotto.", "credit": "ESA/MPS", "license": "CC BY-SA 3.0 igo"},
    {"file": "Bayeux Tapestry 32-33 comet Halley Harold.jpg", "caption": "El Halley en el tapiz de Bayeux (1066).", "credit": "Myrabella", "license": "Public domain"},
  ],
  "cat-vredefort-sudafrica-2000-ma": [
    {"file": "Vredefort Crater, South Africa, OLI satellite image, 27 June 2018 cropped.png", "caption": "La estructura de impacto de Vredefort (Sudáfrica), la mayor de la Tierra, desde satélite.", "credit": "NASA Earth Observatory image created by Lauren Dauphin, using Operational Land I", "license": "Public domain"},
    {"file": "Vredefort Dome in Venterskroon near Parys.jpg", "caption": "La cúpula de Vredefort en Venterskroon.", "credit": "Phillip778899", "license": "CC0"},
  ],
  "cat-eros-hipotetico": [
    {"file": "PIA02475 Eros' Bland Butterscotch Colors.jpg", "caption": "Eros fotografiado por NEAR Shoemaker.", "credit": "NASA/JPL/JHUAPL", "license": "Public domain"},
    {"file": "NEAR Shoemaker final descent.PNG", "caption": "Descenso final de NEAR Shoemaker sobre Eros (2001).", "credit": "Johns Hopkins University/APL", "license": "Public domain"},
  ],
  "cat-cometa-hale-bopp-hipotetico": [
    {"file": "Comet-Hale-Bopp-29-03-1997 hires adj.jpg", "caption": "El cometa Hale-Bopp en 1997.", "credit": "Philipp Salzgeber", "license": "CC BY-SA 2.0 at"},
    {"file": "The unusual tails of comet Hale-Bopp - Eso9806b.jpg", "caption": "Las colas de Hale-Bopp (ESO).", "credit": "ESO", "license": "CC BY 4.0"},
  ],
};
