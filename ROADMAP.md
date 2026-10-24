# Bum — hoja de ruta y notas de traspaso

Este documento sirve para que cualquier persona (o asistente de IA) pueda retomar el proyecto
sabiendo en qué punto está, qué falta y cómo se trabaja. **Mantenlo al día con cada versión.**

Estado: `[x]` hecho · `[~]` en curso · `[ ]` pendiente.

---

## Versión publicada: 1.0 (octubre de 2026)

La 1.0 es todo lo que había hasta la 0.10 (ver el historial de git): simulador nuclear, de asteroides y
de otros escenarios (accidentes, bombas sucias, supervolcanes), ataques múltiples, explosiones bajo
tierra y bajo el agua, lluvia radiactiva por capas con viento real, refugio, EMP, tsunami sobre
batimetría, defensa planetaria, población real (WorldPop), infraestructuras (OpenStreetMap), riesgos
de la NASA (Sentry), mapa de pruebas nucleares, post-procesado, vista desde el suelo, temas
día/tarde/noche/automático, «Acerca de», PWA instalable y enciclopedia (≈180 artículos).

---

## 1.1 — Enciclopedia a fondo (publicada)

Hecho:
- Temas día/tarde/noche/automático en toda la enciclopedia; maquetación ancha (≈ 80 %) con ficha e índice laterales; una sola columna si el artículo no tiene ficha.
- Fotografías de Wikimedia Commons (`content/media.ts`, ~490, con autoría y licencia; reintento y ocultación si fallan).
- Vídeos y animaciones GIF de Commons (`content/videos.ts`, 40) en la sección «En movimiento» y, el primero, en mitad del texto.
- Fórmulas (`content/math.ts`), fuentes por artículo y sección (`content/sources.ts`), simuladores y gráficos interactivos (`widgets.ts`) colocados en sus artículos (arsenales, pruebas por año y país, potencias, Reloj del Juicio Final).
- Historias guiadas (`content/relatos.ts`): Hiroshima, crisis de Cuba y Chernóbil, con pasos, fotos y botón al simulador (también para los casos de «Otros»: `sidebar.selectOther`).
- Artículo «Lista de riesgo Sentry»; diseño de 100 Mt de la Tsar Bomba; 20 fichas cortas ampliadas (`content/extra.ts`).
- Visor 3D tipo atlas: panel «Capas» (casillas por capa y pieza, opacidad por pieza, quitar/poner capa, aislar con doble clic), deslizador de despiece y rótulos con líneas guía.
- Móvil: índice plegable (botón «Índice»); tableta: barra lateral de 240 px; cabecera del visor adaptable.

Para más adelante dentro de la enciclopedia: modelos 3D con más detalle exterior (remaches, paneles, marcas), más historias guiadas (Castle Bravo, Palomares, Cheliábinsk), más vídeos.

## 1.2 — Calidad (publicada)

- [x] Pruebas automáticas de los cálculos (`tests/physics.test.ts`, `npm test`, 53 comprobaciones): 1 kt y 1 Mt
      frente a Glasstone y NUKEMAP, ley de la raíz cúbica, Hiroshima, Sedan, Baker, regla t^−1,2 de la lluvia
      radiactiva, Starfish Prime, energía de los asteroides, Cheliábinsk, Tunguska, Meteor Crater, Chicxulub,
      Chernóbil (áreas contaminadas de UNSCEAR), Pinatubo, robustez y formato. También se ejecutan en el flujo
      de GitHub Actions antes de compilar.
- [x] Móvil: los paneles de ajustes y resultados son hojas inferiores opacas; la barra superior ya no tapa las
      pestañas; menús emergentes opacos; al lanzar una simulación en móvil o tableta se pliega el panel de ajustes;
      en tableta la línea de tiempo pasa por debajo del panel de resultados.
- [x] «Reducir destellos» (Mapas y capas → Efectos): atenúa el destello, el resplandor, el cielo y la sacudida, y el
      brillo sube despacio. Se activa solo si el sistema pide «reducir movimiento». Aviso de fotosensibilidad la
      primera vez que se lanza una simulación.
- [x] Carga más rápida: three.js y el motor de efectos (`src/fx/engine.ts`) se descargan en paralelo con el mapa y se
      instalan al terminar de cargarse; esquemas de la enciclopedia diferidos; bibliotecas en trozos propios
      (maplibre, three, d3) para la caché; conexiones anticipadas a los servidores de teselas; tipografías que no
      bloquean el dibujado; las teselas guardadas sin conexión se conservan entre versiones.

En 1.3 se añadió el gesto táctil para orientar al norte: doble toque con dos dedos (equivale al doble clic derecho).

## 1.3 — Simulación ampliada (publicada)

- [x] Viento hora a hora: `fetchWeather` pide 48 h de previsión por niveles (`Environment.windHourly`);
      `windAt(env, z, tH)` interpola en altura y en tiempo. La lluvia radiactiva integra la caída de cada
      partícula con el viento de cada hora; la nube deriva con una tabla precalculada (`FxPlan.driftTable`); las
      emisiones de reactor usan bocanadas lagrangianas (`releaseTrajectories` en `physics/other.ts`).
- [x] Guerra a gran escala e invierno nuclear (`data/war.ts`, `computeWar` en `physics/disasters.ts`): cinco
      escenarios de Xia et al. 2022 (5 a 150 Tg de hollín), objetivos representativos en el mapa, enfriamiento,
      lluvias, calorías, muertes directas y por hambre, gráfico de 15 años en el resumen.
- [x] Sombra del relieve (`physics/terrain.ts` + `elevationSampler`): líneas de visión desde la bola de fuego;
      zonas protegidas del destello en el mapa y en Física.
- [x] Edificios: recuento uno a uno de los edificios del mapa visibles (por sobrepresión en su centro) y recuento
      en el servidor con Overpass por zonas (`fetchBuildingCounts`); bloque en la pestaña Población.
- [x] «¿Estoy a salvo?» (botón del escudo; `physics/safety.ts`): tu ubicación o un punto del mapa, efectos que
      llegan, hora de llegada de la onda y de la lluvia, dosis según refugio, probabilidad de morir y consejos.
- [x] Mapa partido (pestaña Comparar → botón): segundo mapa sincronizado con los anillos de otro escenario y un
      divisor arrastrable que pasa por la zona cero.
- [x] Trayectoria de misiles (`data/launch.ts`): 19 bases públicas, ortodrómica, tiempo de vuelo, apogeo,
      velocidad de reentrada y aviso; animación del vuelo antes de la detonación y sección en Física.
- [x] Más catástrofes en «Otros»: rotura de presa con inundación por el relieve real (11 presas, entre ellas Tous,
      Banqiao y Teton), tormenta geomagnética (6 casos, de 1859 a 2024; bandas geomagnéticas y óvalo auroral en
      el globo) y lluvia negra tras las tormentas de fuego.

Pendiente menor: inundación de presas con un modelo hidráulico de verdad (ahora es una ola que se atenúa con la
distancia); el mapa partido no muestra los efectos 3D del escenario B.

## 1.4 — Visual (publicada)

- [x] Mapas de calor (`physics/heat.ts` + `map/heat.ts`): población (WorldPop o modelo urbano), muertes
      inmediatas (las mismas probabilidades que el recuento combinado) y muertes por la lluvia radiactiva de la
      primera semana sin refugio. Se eligen en Mapas y capas → Mapa de calor o en la pestaña Población; leyenda con
      escala logarítmica y total. Sin simulación, la población de la zona que se ve. La estimación de muertes por
      la lluvia radiactiva del resumen usa ahora la supervivencia local a cada distancia (antes la media del
      círculo) y coincide con el mapa (prueba en `npm test`).
- [x] Recorrido cinematográfico (`src/tour.ts`, botón de la cámara de cine en la línea de tiempo): repite la
      simulación con planos de situación, testigo a pie de calle, onda expansiva, órbita del hongo, calor, lluvia
      radiactiva y balance con el mapa de calor de víctimas; franjas de cine, rótulos con las cifras, interfaz
      oculta. Esc, el botón «Salir» o cualquier gesto en el mapa lo detienen. En equipos lentos adelanta el reloj
      en los cortes de plano para no desfasarse.
- [x] Tiempo real en el mapa (`map/weather.ts`, Mapas y capas → Tiempo): nubes de Open-Meteo en una rejilla de
      9 × 9 puntos (≈ 1.200 km) con textura de ruido, que se recarga al mirar otra región; radar de precipitación
      observado (RainViewer, opcional); lluvia o nieve en pantalla al acercarse al suelo; cielo cubierto, menos luz
      y niebla según las nubes y la visibilidad (`applyTimeOfDay` con `SkyWeather`).
- Las imágenes del mapa (calor y nubes) usan fuentes «canvas» (`map/canvas-layer.ts`): las de tipo «image» pasan
  por la cola de descargas y podían no aparecer mientras cargaban teselas.

Pendiente menor: las nubes no se mueven con el viento; el radar sólo llega al nivel de zoom 7 (límite de la API).

## 1.4.1 — Actualizaciones sin caché antigua (publicada)

- [x] El service worker sirve la página primero desde la red (`cache: 'no-cache'`) y sólo usa la copia guardada sin
      conexión; los archivos con huella (`assets/`) van primero a la caché; la instalación evita la caché HTTP de
      GitHub Pages (10 min). Antes, la página guardada se servía primero y una versión nueva podía tardar varias
      recargas en verse (se seguía viendo la 1.0).
- [x] La app busca versiones nuevas al volver a la pestaña y cada hora, y se recarga sola cuando se instala una
      (si hay una simulación en marcha, sólo avisa).

## 1.5 — Rendimiento en equipos modestos (publicada)

Motivo: en portátiles (Surface Book 2) la web se atascaba y el equipo se calentaba incluso en calidad baja.
Lo que más costaba: pantalla de alta densidad (×2 = cuatro veces más píxeles), suavizado de bordes, nube
volumétrica a pantalla completa, post-procesado, el desenfoque de fondo de los paneles (se recalcula en cada
fotograma del mapa), dibujar sin parar aunque la simulación estuviera en pausa o terminada, y reenviar las capas
de efectos al mapa varias veces por segundo durante la lluvia radiactiva.

- [x] `src/perf.ts`: nivel de calidad común (Mínima 0,25 · Baja 0,5 · Alta 1 · Ultra 1,6) y detección de equipos poco
      potentes (gráfica integrada o por software, ≤ 4 núcleos, ≤ 4 GB, pantalla táctil). En Auto se empieza en Baja
      en esos equipos y en Alta en el resto; si la animación baja de 24 fps durante 2,5 s, baja un nivel en plena
      simulación (la nube volumétrica se cambia por la de partículas) y lo recuerda (`bum:autoq`).
- [x] Modo ligero (Baja y Mínima): mapa a 1 píxel por píxel CSS (¾ en Mínima), sin suavizado ni fundidos de rótulos
      (al cargar), sin nube volumétrica (ni su textura de ruido), sin post-procesado, menos partículas, 30 fps como
      máximo (`FxLayer.maxFps`), sin sombreado del relieve ni desenfoque de los paneles, sin recuento de edificios
      del mapa; Mínima quita además el relieve y los edificios 3D. Visor 3D de la enciclopedia a 1×, 30 fps y parado
      fuera de la vista; lluvia en pantalla con la mitad de gotas.
- [x] Para todos: la escena sólo se redibuja si algo se mueve (reproducción, destello, sacudida, órbita o recorrido);
      con la enciclopedia abierta, tampoco. Las capas de efectos (`Overlays.refresh`) llevan una firma por grupo
      (anillos, lluvia radiactiva, marcas, incendio) y sólo se reenvían las que cambian, con el frente de la lluvia
      en pasos del 2,5 %. Las capas de destello con mezcla de color se ocultan cuando no se ven.

## 1.6 — Preparación y menús (publicada con la 1.7)

- [x] 1.6a Calidad en automático para todos: al llegar a esta versión se olvida la calidad elegida antes
      (`pv: 2` en `bum:mapprefs`); se puede cambiar a mano en el menú del ojo.
- [x] 1.6b Botón «Visualización y calidad» (ojo) en la barra de arriba: plano/globo, qué se ve (cúpulas, anillos,
      lluvia radiactiva, marcas, daños, incendios, etiquetas), sonido, cámara cinemática, post-procesado y calidad.
      Sale del panel izquierdo (`Sidebar.viewEl`).
- [x] 1.6c Panel «Preparando la simulación» (`ui/prep.ts`): pasos con su estado (efectos, población real, mapa y
      relieve de cada plano) y barra de progreso; se visitan tras el panel los planos que va a usar la cámara
      (vuelo del misil, encuadre inicial, planos cinemáticos, nube, lluvia radiactiva) esperando a que el mapa cargue
      sus teselas (`prefetchCams`), y la simulación empieza sola al terminar. El recorrido cinematográfico hace lo
      mismo con sus planos (incluido el testigo a pie de calle).

## 1.7 — Vuelo del arma (publicada)

- [x] 1.7a El vuelo es parte de la línea de tiempo: el reloj empieza en el lanzamiento (T−) y llega a la detonación
      en unos 12 s reales a ×1, con pausa, rebobinado, velocidad y marcas (lanzamiento, separación, reentrada).
      Rótulo con el tiempo que falta, la fase y la altura; ruta prevista tenue y tramo recorrido; al final la cámara
      va sola hacia el objetivo.
- [x] 1.7b Tipos de vuelo (`data/flight.ts`), elegidos según el arma o a mano («Tipo de vuelo»): balístico (arco por el
      espacio), planeador hipersónico (Avangard, DF-17: cohete hasta ~100 km y planeo a ~55 km maniobrando), misil de
      crucero (Kh-102, Tomahawk: a ~60 m del suelo, subsónico, ruta con desvíos) y bombardero (bombas de gravedad).
- [x] 1.7c Ojivas múltiples (MIRV): con varios objetivos a menos de ~1.500 km entre sí, un solo misil sube, el bus se
      separa a mitad del vuelo y cada ojiva va a su objetivo; si están más separados, un misil por objetivo.

Pendiente menor: la trayectoria se dibuja sobre el mapa (con su altura en el rótulo), no como arco en 3D; las ojivas
de un MIRV llegan a la vez.

## 1.8 — Idiomas y recorrido narrado (publicada)

- [x] 1.8a Idiomas (`src/i18n/`): castellano, catalán, inglés, francés, alemán, portugués (europeo) e italiano. Se toma
      el del sistema (`navigator.languages`; gallego y euskera → castellano; otros → inglés) o el elegido en el menú del
      ojo («Idioma»; se guarda en `bum:lang` y recarga). El código sigue escrito en castellano: un observador del
      documento cambia cada texto y atributo visible por su traducción del catálogo `<idioma>.json` (clave = texto en
      castellano). Los textos con datos son plantillas («Distancia {0} km»); lo intercalado se traduce a su vez y, si van
      dos marcadores seguidos, se reparte buscando el corte que deja más trozos traducidos. Cifras en el formato del
      idioma (`LOCALE`/`DEC` en `i18n/locale.ts`), nombres del mapa en el idioma (`name:<idioma>`), rosa de los vientos
      localizada. `main.ts` carga el idioma y después `app.ts`. Los artículos de la enciclopedia (`data-i18n-skip`)
      siguen en castellano, con un aviso.
- [x] 1.8b Recorrido narrado (`src/narrator.ts`, «Narración por voz» en el menú del ojo y botón «Voz» durante el
      recorrido): voz del navegador en el idioma activo (elige las voces «naturales»/«neuronales»; frase a frase). La
      imagen se congela mientras explica cada parte: lanzamiento y vuelo del misil, destello y bola de fuego, llegada de
      la onda, onda vista desde el aire, radiación inicial, hongo, calor e incendios, lluvia radiactiva y balance. Sin voz
      en el idioma, subtítulos.
- [x] 1.8c Traducción de la interfaz (≈ 2.100 textos por idioma) hecha con un extractor de cadenas
      (`/tmp/claude-0/i18n/extract.mjs` en la sesión; hay que repetirlo y traducir lo nuevo al añadir textos).
- [x] Además: cámara de persecución del misil en el modo cinemático (detrás de la cabeza, más alta cuanto más alto
      vuela, también en el recorrido), opción «Empezar con el recorrido» (el recorrido arranca solo al detonar) y la
      línea de tiempo vuelve a aparecer si algo la ocultó con una simulación en marcha.

Desde la 1.21 los artículos se traducen con paquetes por idioma (ver 1.21); revisar textos nuevos en cada versión.

## 1.8.1 — Todas las marcas del mapa en «Efectos» (publicada)

- [x] La pestaña Efectos lista y deja ocultar todo lo que se dibuja en el mapa: además de los anillos, la lluvia
      radiactiva, el tsunami, los incendios y el pulso, ahora «Suelo quemado y marcas del terreno» (`scorch`: zona cero
      calcinada, suelo arrasado, suelo chamuscado, suelo activado por neutrones, oleada de base, eyecta y cráter, con su
      color), «Lluvia negra» (`blackrain`: los dos óvalos a sotavento, intensa y débil, con su superficie) y «Sombra del
      relieve» (`shadow`). Con todo desactivado en Efectos, el mapa queda limpio.
- [x] Los botones de mapa de calor (población, víctimas, lluvia radiactiva) también al final de Efectos.

## 1.8.2 — Revisión: día y noche, vuelo, ataque múltiple, tormenta solar y guerra (publicada)

- [x] Día y noche reales en el planeta (`src/map/daynight.ts`): punto subsolar por la fecha y la hora (con el tema
      automático, la hora real más el tiempo simulado; con un tema fijo, esa hora en la longitud del objetivo). En el
      globo visto de lejos, la luz de MapLibre se orienta hacia el Sol (antes la sombra salía girada: noche en un
      hemisferio y día en el otro); en el mapa plano, sombra de la noche con los crepúsculos (se desvanece al acercarse).
- [x] Durante el vuelo del misil sólo se rotulan países, capitales y grandes ciudades.
- [x] Ataque múltiple: los hongos, el humo de los incendios y la bola de fuego de cada detonación se dibujaban todos
      en la primera (las partículas no usaban la posición de su explosión). También la lluvia negra en todas y el
      final de la simulación según la detonación más larga.
- [x] Tormenta solar con cronología: rayos X a los 8 min (apagón de radio en la cara de día), protones por los polos
      y, al llegar la eyección (17,6 h en 1859, 54 h en 1989…), el óvalo auroral baja hacia el ecuador y vuelve a subir;
      rótulos en el mapa y capas explicadas y ocultables en Efectos.
- [x] Guerra nuclear con vida (`src/map/war-layer.ts`, `warSchedule` en `data/war.ts`): misiles por oleadas entre los
      dos bandos (primer ataque, respuesta antes de que lleguen las ojivas, segundas oleadas), destellos y brasas en
      cada objetivo, zonas de daño, humo y un velo de hollín que en días rodea el planeta; rótulo con la fase y las
      ojivas detonadas; reloj desde el primer lanzamiento; «Lanza primero» elegible. Escenarios nuevos (estimaciones
      propias por comparación con Xia et al. 2022): Corea del Norte–Corea del Sur, Corea del Norte–Japón, China–EE. UU.
      y Rusia–OTAN en Europa. Vista desde encima del polo para EE. UU.–Rusia.

## 1.9 — Las pruebas nucleares en el tiempo (publicada)

- [x] Botón «Historia de las pruebas nucleares» (reloj, en la barra de arriba; también en «Mapas y capas»): el mapa del
      mundo, plano o en globo, con un calendario que avanza mes a mes. Cada una de las 2.057 explosiones (1945–2017)
      es un destello en su lugar con el color de su país y queda marcada; a la izquierda, el total, cuántas fueron en el
      aire o bajo tierra, los megatones y el contador de cada país. Abajo, un histograma por años y países que sirve de
      calendario (se pulsa o se arrastra). Velocidad de 1 mes/s, 3 meses/s o 1 año/s; los años sin pruebas pasan deprisa
      y cerca de los momentos clave (Trinity, Hiroshima, Nagasaki, Ivy Mike, la moratoria, la Tsar Bomba, los tratados,
      las últimas pruebas de cada país, Corea del Norte) va más despacio y escribe una frase, que se lee en voz alta
      si está activada la narración. Un pitido por explosión, con un tono por país (como la obra de Isao Hashimoto).
      Pulsando un punto: nombre, fecha, lugar, tipo, potencia y finalidad. Espacio, flechas y Esc.
- [x] Datos (`src/data/tests-history.json`, se carga sólo al abrir): SIPRI / FOA, Bergkvist y Ferm (2000), «Nuclear
      Explosions 1945–1998» (2.051 explosiones, vía TidyTuesday 2019-08-20), con las coordenadas que faltaban
      completadas y nombres legibles de las zonas, más las 6 pruebas de Corea del Norte con rendimientos estimados.
      Se genera con un script de Python (ver notas de traspaso).

## 1.10 — Misil en 3D, nubes con viento, presas con cálculo hidráulico y mapa partido completo (publicada)

- [x] Vuelo del arma en 3D (`src/fx/Missile.ts`): el arco por el aire o por el espacio a su altura real (en el mapa
      plano con coordenadas Mercator; en el globo, con la curvatura), con la estela recorrida, la llama del cohete y el
      brillo de reentrada; sobre el suelo queda sólo la «sombra» de la trayectoria. El rótulo del reloj va pegado a la
      cabeza en 3D y la cámara de persecución tiene en cuenta la altura.
- [x] Ojivas MIRV escalonadas (`MIRV_GAP_S`, 7 s): cada una llega a su objetivo unos segundos después de la anterior
      y estalla con todos sus efectos a su hora (bola de fuego, onda, hongo, anillos, radiación, suelo quemado, lluvia
      radiactiva, lluvia negra): los módulos 3D van con retraso (`Delayed`) y el mapa lleva un reloj por detonación
      (`Overlays.enterSet`), también con su propio avance de la onda en cualquier ataque múltiple.
- [x] Nubes del tiempo real que avanzan con el viento a 700 hPa (≈ 3 km), en tiempo real y con el tiempo simulado.
- [x] Rotura de presas con cálculo hidráulico (`src/physics/dambreak.ts`, en un worker): aguas someras en la
      aproximación inercial local (Bates et al. 2010, LISFLOOD-FP) con rozamiento de Manning sobre la rejilla del relieve,
      hidrograma de la brecha (Froehlich 2008) hasta vaciar el embalse; fotos de la inundación en el tiempo para el mapa,
      profundidad máxima y hora de llegada para las víctimas. Mientras calcula, se ve la estimación rápida.
- [x] Mapa partido: el escenario B con sus efectos 3D y al mismo reloj y luz que A.

## 1.11 — Escalada paso a paso (publicada)

- [x] En la guerra nuclear, el rótulo muestra la fase («Fase 2 de 6»: primer ataque, respuesta antes de que lleguen las
      ojivas, segundas oleadas, incendios, humo en la estratosfera, invierno nuclear) y el balance acumulado de cada
      bando: ojivas recibidas y muertes por las explosiones (proporcionales a las cifras del escenario). Botones ◀ ⏯ ▶
      para ir de fase en fase y quedarse en cada una.

## 1.12 — Refugio más cercano (publicada)

- [x] En «¿Estoy a salvo?», los refugios a menos de 2,5 km del punto según OpenStreetMap (`fetchShelters`): bocas y
      estaciones de metro, aparcamientos subterráneos y de varias plantas, refugios y búnkeres abiertos. Para cada uno,
      la distancia, el tiempo andando (camino un 30 % más largo que la línea recta, a 5 km/h), su protección orientativa
      frente a la radiación (FEMA 2010) y si llegarías antes que la onda o antes de que empiece la lluvia radiactiva.
      Se marcan en el mapa y, al pulsarlos, la cámara va hasta ellos.

## 1.13 — Hospitales y sanidad, y «Días después» (publicada)

- [x] Hospitales y sanidad (pestaña Población, `src/physics/health.ts`): hospitales de OpenStreetMap alrededor de la
      zona (`fetchHospitals`), destruidos (> 5 psi), dañados (1–5 psi) o en servicio, camas disponibles (150 por hospital
      si no constan; 35 % de las camas en funcionamiento), heridos que necesitarían ingreso, cuántos se quedarían sin cama
      y quemados graves. Se marcan en el mapa por colores (ocultables en Efectos).
- [x] Pestaña «Días después» (explosiones nucleares): primeras horas, regla del 7-10 con la radiación de la zona más
      contaminada, primeros días sin luz ni agua (con las subestaciones y potabilizadoras de la zona), semanas del
      síndrome de radiación y el regreso (cuándo bajaría la radiación, cesio-137), con datos de Hiroshima, Nagasaki,
      Chernóbil y Fukushima.

## 1.14 — Defensa antimisiles (publicada)

- [x] Defensa antimisiles (`src/data/defense.ts`), con trayectoria del misil y la opción «Con defensa antimisiles»:
      sistemas reales por zona (GMD en Alaska y California; Aegis Ashore en Rumanía y Polonia; Arrow 3 en Alemania;
      Arrow 2 y 3, THAAD y Honda de David en Israel; THAAD en Corea del Sur y el Golfo; SM-3 IIA en Japón; A-135 en
      Moscú; escudo de Delhi; Patriot/SAMP-T y defensa aérea), en capas (curso medio, alta exo y endo, terminal).
- [x] Salvas de interceptores con probabilidad por interceptor, inventario limitado (saturación con muchas ojivas),
      señuelos de las potencias nucleares, planeadores hipersónicos que burlan las capas exteriores, y misiles de
      crucero y aviones frente a la defensa aérea. Cada simulación es una tirada.
- [x] Animación: el interceptor (cian) sale de su base y se encuentra con la ojiva; si acierta, la ojiva acaba ahí
      con un destello; si falla, sigue. Avisos en pantalla y marca «Intercepción» en la línea de tiempo.
- [x] Sólo estallan las ojivas que pasan; si se derriban todas, ficha «Ataque interceptado» con el botón «Ver qué
      habría pasado si llegan». Pestaña «Defensa» con las capas, los disparos, los derribos y la saturación.
- [x] Arreglo: las estelas del misil a veces se quedaban cortas al saltar en la línea de tiempo.

## 1.15 — «Desde mi ventana» (publicada)

- [x] Vista de realidad aumentada (`src/ui/window-view.ts`), desde el botón de la ventana en los resultados o
      «Verlo desde aquí» en «¿Estoy a salvo?»: la cámara trasera del móvil de fondo y la brújula y los sensores de
      inclinación orientan la escena. Sin sensores (ordenador), se mira alrededor arrastrando; con ellos, arrastrar
      corrige la brújula.
- [x] Bola de fuego, tronco, polvo de la base y sombrero del hongo con su tamaño angular real desde tu punto (tu
      ubicación, el punto elegido o, si no hay, uno a 20 km), con la deriva del viento, el horizonte con rumbos y la
      parte que tapa la curvatura de la Tierra (con refracción). Altura de la mirada: calle, 3.ª, 10.ª o 30.ª planta.
- [x] Reloj en tiempo real (o ×10, ×60): destello, cuenta atrás hasta la onda expansiva («¡Aléjate de la ventana
      y túmbate!»), estruendo con vibración, sacudida y cristales rotos a partir de 0,5 psi. Varias detonaciones a la
      vez en un ataque múltiple.

## 1.16 — Realidad virtual y móviles modestos (publicada)

- [x] Realidad virtual (`src/ui/vr-view.ts`), desde «Desde mi ventana»: con gafas de RV (WebXR, la zona cero se pone
      delante; gatillo para la velocidad y botón lateral para volver a empezar) o con el móvil en un visor tipo
      Cardboard (pantalla partida y brújula, con el norte real). Bola de fuego, tronco, polvo y sombrero del hongo en
      3D a su distancia real, anillos de 5 y 1 psi en el suelo, curvatura de la Tierra, destello, sacudida y
      estruendo con la onda expansiva, y un rótulo con el reloj y los avisos.
- [x] Móviles modestos: se detectan los de gama baja (gráfica antigua, 2–3 GB de memoria, ahorro de datos) y
      empiezan en Mínima; Mínima a 24 fotogramas por segundo; con calidad baja, a 15 cuando el hongo ya sólo se
      disipa; las detonaciones secundarias de un ataque múltiple llevan menos partículas y sin escombros; con la
      batería baja y sin cargar se pasa a Mínima; «Desde mi ventana» con menos resolución y menos detalle.

## 1.17 — Lluvia radiactiva con partículas e invierno nuclear en el mapa (publicada)

- [x] Lluvia radiactiva con un modelo lagrangiano de partículas, al estilo de HYSPLIT (`src/physics/fallout.ts`):
      5000 partículas salen del sombrero y del tronco del hongo con su velocidad de caída (distribución log-normal),
      viajan con el viento de su altura y de su hora (perfil real y previsión horaria), se dispersan con la
      turbulencia (más en la capa de mezcla) y la lluvia prevista hora a hora (Open-Meteo) arrastra parte al suelo
      antes de tiempo. Lo que cae se reparte con un núcleo que se ensancha con la distancia: manchas curvadas y
      alargadas en lugar de la elipse. La hora de llegada a cada punto sale del propio modelo. Semilla fija: el mismo
      escenario da siempre la misma pluma.
- [x] Las partículas en el mapa (`src/map/fallout-particles.ts`), en su sitio de cada instante y coloreadas por su
      altura; ocultables en Efectos.
- [x] Invierno nuclear en el mapa (`src/map/winter-layer.ts`), en las guerras: mes a mes durante diez años, la bajada
      de temperatura en cada lugar (los continentes, su interior, el hemisferio norte y el verano se enfrían más) y
      las cosechas perdidas, ajustadas a la media del escenario. Máscara de tierra y mar a 1° (Natural Earth,
      `scripts/landmask.mjs`).

## 1.18 — Arsenales del mundo y reconstrucciones históricas (publicada)

- [x] La historia tiene ahora tres pestañas: Pruebas, Arsenales y Reconstrucciones (`src/ui/hist-views.ts`).
- [x] Arsenales del mundo 1945–2026 (`src/data/arsenals.ts`, FAS vía Our World in Data): un círculo por país que
      crece y mengua año a año, el total y el reparto por países, una gráfica apilada que se puede recorrer y los
      tratados e hitos (TNP, SALT, INF, START, Nuevo START…), que se detienen un momento y se leen en voz alta con la
      narración.
- [x] Reconstrucciones (`src/data/historic.ts`): Trinity, Hiroshima, Nagasaki, Castle Bravo, Tsar Bomba, Tunguska y
      Cheliábinsk, con su arma o su asteroide, su lugar, su hora y el tiempo de aquel día. Pestaña «Lo que pasó» en
      los resultados: la historia y una tabla del modelo frente a lo medido (coincide, cerca, se queda corto, se
      pasa), con notas de por qué difiere cuando difiere (relieve, población de entonces, atmósfera…) y fuentes.

## 1.19 — Modo clase y «Desde mi ventana», segunda parte (publicada)

- [x] Modo clase / presentación (`src/ui/present.ts`, botón de la pantalla en la barra): cada diapositiva guarda el
      escenario entero (arma o asteroide, objetivo, tiempo, ataque múltiple, trayectoria, defensa), un título y notas
      para quien presenta. Al presentar se lanza cada simulación con su recorrido cinematográfico; ← y → para cambiar,
      «Pasar sola» con cuenta atrás, Esc para salir (se recupera el escenario de antes). Se guarda en el navegador y
      se comparte con un enlace. Cuatro lecciones preparadas: De Hiroshima a la Tsar Bomba, Una ciudad y cuatro armas,
      Amenazas del espacio y Más allá de las bombas.
- [x] «Desde mi ventana», segunda parte: el relieve real (modelo del terreno hasta 90 km) dibuja el horizonte y tapa
      la parte del hongo que queda detrás de los montes; la diferencia de altura entre tu sitio y la zona cero cuenta.
      De noche el hongo sólo se ve por la luz de la bola de fuego (rojiza y violácea al principio) y el resplandor de
      los incendios. El Sol aparece como referencia. Calibración guiada de la brújula (el «ocho» y apuntar al Sol o a
      la zona cero). Grietas en los cristales también al saltar con la barra. La noche también en realidad virtual.

## 1.20 — Asteroides reales de la NASA (publicada)

- [x] Catálogo de asteroides reales (`src/ui/neo-panel.ts`, botón en el panel de asteroides), con los datos de
      NASA/JPL (`src/data/neo-catalog.json`, generado con `npm run neo`, porque sus API no se pueden consultar desde el
      navegador):
      · Lista de riesgo Sentry: los más de 2000 objetos con alguna probabilidad de chocar, con búsqueda y orden por
        peligro (Palermo), probabilidad, tamaño o fecha; los 40 más peligrosos, con sus fechas de impacto posibles y
        su energía.
      · Acercamientos de los próximos 10 años a menos de 19 distancias lunares.
      · Famosos (Apophis, Bennu, 2024 YR4, Didymos, Eros, Itokawa, Ryugu, 1950 DA, Toutatis, Phaethon, Ganymed,
        2023 DW): tamaño medido, tipo de órbita, distancia mínima entre órbitas, máximo acercamiento e historia.
- [x] Cualquiera se simula con un clic: su diámetro, su densidad (la medida, si se conoce), la velocidad de entrada
      (la de encuentro más la que da la gravedad terrestre) y el ángulo más probable (45°).

## 1.21 — Enciclopedia revisada y ampliada, traducible, y «¿Estoy a salvo?» completo (publicada)

- [x] 11 artículos nuevos: una guerra nuclear, cómo viaja la lluvia radiactiva, ver una explosión de lejos,
      sanidad y hospitales, los días después, defensa antimisiles, roturas de presas, erupciones volcánicas,
      tormentas solares, Apofis y 2024 YR4 (`content/nuevos-efectos.ts`, `content/nuevos-otros.ts`).
- [x] 34 artículos cortos ampliados con secciones, tablas, cronologías y citas nuevas (`content/extra-2.ts` y
      `extra-3.ts`, que se añaden al final de cada artículo como `extra.ts`); invierno nuclear rehecho a fondo.
      Algunas erratas corregidas (DEFCON 2 el 24 de octubre, la línea directa de 1963, la directriz de riesgo
      radiológico de 2010, los Tomahawk nucleares de 1983–1984). 192 artículos y unas 184 000 palabras.
- [x] 7 esquemas animados nuevos (23 en total): MIRV, vuelo de un misil balístico, defensa antimisiles por capas,
      factor de protección de un refugio, dispersión de la lluvia radiactiva, invierno nuclear y «el destello y el
      estruendo» (la onda a 343 m/s).
- [x] Unas 75 fotos, vídeos y animaciones nuevas de Wikimedia Commons (`content/media-extra.ts`), comprobadas una
      a una: imágenes para los artículos que no tenían (historias guiadas, invierno nuclear) y para los nuevos, y
      vídeo o GIF para muchos que no tenían ninguno (pruebas de defensa antimisiles, DART, Apofis 2029, la
      fulguración X8,7 de 2024, Wigwam, el Tratado INF, el monte Santa Helena…).
- [x] Traducción de la enciclopedia: cada idioma tiene un paquete `src/encyclopedia/i18n/<idioma>.json` (huella del
      texto castellano → traducción), que se carga sólo al abrirla. Si un texto castellano cambia, su traducción
      deja de aplicarse sola y se ve en castellano hasta que se vuelva a traducir. `npx tsx scripts/enc-i18n.ts
      todo` saca lo que falta en trozos (`enc-todo/`, fuera de git), `merge` recoge y valida las traducciones
      (enlaces internos, URL, negritas, superíndices, longitud) y `check` da la cobertura. Los textos de la
      interfaz de la enciclopedia, de los esquemas y de los gráficos pasan por `tr()`. La búsqueda funciona en el
      idioma elegido y también en castellano.
- [x] «¿Estoy a salvo?» por pestañas: Tu punto, Qué hacer (plan minuto a minuto y hacia dónde irse, en
      perpendicular al viento), Refugio (factor de protección de cada sitio, dosis en 48 h y dos semanas, cuándo
      salir con la regla del 7-10, refugios cercanos), Sanidad (hospitales más cercanos que seguirían abiertos,
      primeros auxilios, yoduro potásico) y Mochila (lista de emergencia guardada en el navegador y plan familiar).
      La capa de hospitales afectados viene oculta y se activa desde Efectos o desde el propio panel.

## Propuestas para las próximas versiones

Cada una se puede hacer por separado; el orden es una sugerencia y el número de versión se asigna al hacerla.

- [x] 1.21.1: la enciclopedia en francés (artículos, esquemas, gráficos y «¿Estoy a salvo?»). El validador acepta
      los ordinales franceses (1^{er}).
- [x] 1.21.2: la enciclopedia en alemán. Unas 20 etiquetas de esquemas que se habían quedado en castellano
      («punto cero», «alto», «casa de madera»…), traducidas en todos los idiomas.
- [x] 1.21.3: la enciclopedia en portugués (europeo).
- [x] 1.21.4: selector de idioma con la bandera de cada idioma (el automático muestra la del idioma del
      sistema). Ubicación inicial: la ciudad de la conexión (por la IP, sin pedir nada) y, si el usuario da
      permiso, su posición exacta; ya no abre siempre en Madrid.
- [x] 1.21.5: móvil y tableta (hasta 1180 px, vertical y horizontal): los dos paneles son cajones laterales que
      se retiran del todo a su lado; retirados, dejan una pestaña con flecha en el borde de la pantalla para
      volver a abrirlos. En pantallas estrechas, abrir uno retira el otro. El escritorio no cambia.
- [x] 1.21.6: durante la animación, el mapa vuelve a responder al primer arrastre. La cámara automática (giro
      lento, órbita del hongo, persecución del misil, recorrido) movía la cámara en cada fotograma y cada uno de
      esos movimientos cancelaba el arrastre que el usuario empezaba; el clic acababa poniendo un objetivo nuevo.
      Ahora, al pulsar el mapa con cualquier botón o con el dedo, la cámara pasa al usuario en el acto.
- [x] 1.21.7: la enciclopedia en italiano. Con ella, los siete idiomas de partida están completos (interfaz y
      enciclopedia). Otras 14 etiquetas de esquemas que seguían en castellano («espacio», «lanzamiento»,
      «deuterio»…), traducidas en todos.
- [x] 1.21.8 · Expandir textos: la narración del recorrido tiene de 3 a 6 versiones de cada momento
      (`src/tour-lines.ts`), elegidas al azar sin repetir la última; en otros idiomas sólo las que tienen
      traducción. Texto pensado para oírse (`forSpeech` en `src/narrator.ts`): siglas con su nombre completo
      («EE. UU.» → «Estados Unidos»), unidades en palabras («km» → «kilómetros»), números sin separador de miles
      (la voz se paraba en «1.250») y frases cortadas sólo al final, nunca dentro de un número. El lugar no se
      repite (el título no se lee si el texto ya lo nombra) y nunca se leen coordenadas: la ciudad más cercana
      o «un punto a unos 40 kilómetros al norte de…». En la presentación, la barra sube a la franja de arriba
      durante el recorrido para no taparse con los subtítulos.
- [ ] Más idiomas, para llegar a la mayor parte de la población mundial: chino (simplificado), japonés, hindi,
      ruso y, posiblemente, árabe. Interfaz completa y enciclopedia, uno por entrega (las banderas ya están en
      `src/ui/flags.ts`). El árabe se escribe de derecha a izquierda: pide adaptar la maquetación (paneles,
      línea de tiempo, enciclopedia) además de traducir.
      La versión 2.0 se publica cuando estén todos completos (lo que falta se ve en castellano).
      Para seguir: `npx tsx scripts/enc-i18n.ts todo` (los trozos de enc-todo/ ya sirven para los cuatro idiomas),
      traducir siguiendo `scripts/enc-i18n-rules.md` y `merge`; las cadenas de interfaz que faltan, con `npm run i18n`.

## Descartado por ahora

- Compartir/guardar escenarios, informes PDF, vistas previas para redes (poco uso; el enlace ya guarda el escenario).
- Publicación automática con GitHub Actions (el autor hace `git push` a mano).
- Captura de pantalla.

---

## Notas de traspaso (cómo se trabaja en este proyecto)

### Preferencias del autor (Alejandro Pico Pérez)

- Todo en español. Minimalismo, **sin esquinas redondeadas**, sin cajetines y con pocas líneas divisorias.
- `favicon.svg` en la raíz es el icono de la app (lo usa su portfolio para las tarjetas de proyecto).
- Sus proyectos siempre tienen «la enciclopedia»: muy completa y detallada, con esquemas interactivos.
- Siempre hay botón «Acerca de» (i): nombre, icono, versión, descripción sin tecnicismos, instalar,
  enlaces al repositorio (https://github.com/AlejandroPico/Bum) y al portfolio
  (https://alejandropico.github.io/Portfolio/) y autor.
- Doble clic derecho en el mapa = norte arriba (sustituye a la brújula).
- Temas día / tarde / noche / automático (según fecha y hora del equipo), botón sólo con icono.
- El autor suele hacer `git push` él mismo; a veces pide subirlo directamente a GitHub desde la nube.

### Estructura

- `src/main.ts` — arranque, estado, mapa, barra de botones, detonación y bucle de animación.
- `src/physics/` — modelos: `effects.ts` (armas, enterradas), `asteroid.ts`, `fallout.ts` (lluvia por
  capas), `other.ts` (accidentes, bombas sucias, volcanes), `wind.ts`, `tsunami.worker.ts`.
- `src/fx/` — efectos 3D (three.js en una capa de MapLibre): bola de fuego, hongo volumétrico,
  onda, cúpulas, incendios, polvo del derrumbe, post-procesado. `plan.ts` = línea temporal determinista.
- `src/map/` — mapas base, capas GeoJSON de efectos (`overlays.ts`), pruebas nucleares.
- `src/ui/` — panel izquierdo, resultados, estadísticas, línea de tiempo, temas.
- `src/data/` — armas y asteroides (`presets.ts`), ciudades, WorldPop, OpenStreetMap, pruebas.
- `src/encyclopedia/` — `content/*.ts` (artículos; ver `content/IDS.md`), `diagrams.ts`
  (esquemas animados), `viewer/` (modelos 3D desmontables), `Encyclopedia.ts` (interfaz).
- `public/sw.js` — service worker (sube `VERSION` en cada versión).

### Versión

- Se actualiza en tres sitios: `package.json`, `APP_VERSION` en `src/main.ts` y `VERSION` en `public/sw.js`.

### Comprobaciones

- `npm run typecheck`, `npm test` y `npm run build` sin errores antes de cada commit.
- Capturas con Playwright + SwiftShader (navegador sin GPU) para revisar el aspecto.
