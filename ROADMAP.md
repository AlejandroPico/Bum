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

Pendiente: traducir los artículos de la enciclopedia (por idiomas, en varias entregas); revisar textos nuevos en cada versión.

## Propuestas para las próximas versiones

Cada una se puede hacer por separado; el orden es una sugerencia.

- [ ] 1.9 Defensa antimisiles: interceptores (GMD, Aegis SM-3, Arrow 3, S-500…) desde bases reales, probabilidad de
      interceptación según el tipo de arma (los planeadores y los MIRV la complican) y animación del intento.
- [ ] 2.0 Sección histórica: las pruebas nucleares en el tiempo, con botón de reproducir y un destello por prueba: animación de las más de 2.000 pruebas de 1945 a 2017 sobre el mapa, año a
      año, con un contador por país y un sonido por prueba (al estilo de la obra de Isao Hashimoto).
- [ ] 2.1 Refugio más cercano (dentro de «¿Estoy a salvo?»): estaciones de metro, aparcamientos subterráneos y sótanos públicos de OpenStreetMap
      cerca de tu punto, con el tiempo andando y si llegarías antes que la onda o la lluvia.
- [ ] 2.2 Escalada: el contraataque y la respuesta, paso a paso, con los vuelos de los misiles de cada bando y el
      balance acumulado (enlaza con la guerra a gran escala y el invierno nuclear).
- [ ] 2.3 «Desde mi ventana»: en el móvil, la cámara y la brújula muestran el tamaño real del hongo y de la bola de
      fuego sobre tu horizonte, según dónde estés.
- [ ] 2.4 Hospitales y sanidad: camas y hospitales de la zona frente al número de heridos y quemados (cuántos quedarían
      sin atender), con los hospitales destruidos marcados en el mapa.
- [ ] 2.5 Días después: línea de tiempo de las semanas siguientes (síndrome de radiación, agua, electricidad, ayuda
      exterior, regreso a la zona) con lo que se sabe de Hiroshima, Chernóbil y Fukushima.

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
