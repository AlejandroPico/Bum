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

## 1.1 — Enciclopedia a fondo

- [ ] La enciclopedia respeta el tema (día, tarde, noche, automático), igual que el resto de la app.
- [ ] Contenido más ancho en escritorio (≈80 % del espacio disponible) y maquetación rediseñada.
- [ ] Fotografías (Wikimedia Commons, dominio público o licencias libres) con pie, autor y licencia.
- [ ] Bloques de matemáticas: fórmulas y leyes de escala con explicación (todas de fuentes públicas).
- [ ] Fuentes y bibliografía por artículo.
- [ ] Fichas que faltan: Tsar Bomba de 100 Mt y los asteroides de la lista Sentry.
- [ ] Ampliar las fichas cortas del catálogo (< 450 palabras).
- [ ] Visor 3D tipo «atlas de anatomía»: lista de capas/partes con casillas, opacidad por capa,
      despiece progresivo con deslizador, rótulos sobre las piezas, más detalle en los modelos.
      **Límite de seguridad:** nivel de museo (lo que se ha mostrado en exposiciones y fuentes
      públicas); sin cantidades, dimensiones internas ni parámetros de diseño; las armas modernas
      sólo con su aspecto exterior genérico.
- [ ] Gráficos interactivos: arsenales por país (1945–hoy), pruebas nucleares por año y país.
- [ ] Widgets: calculadora de escala (ley de la raíz cúbica), comparador de energías, etc.
- [ ] Historias guiadas dentro de la enciclopedia: Hiroshima, crisis de los misiles de Cuba, Chernóbil.
- [x] Menú de botones arriba a la derecha (globo, enciclopedia, capas, tema, acerca de) — hecho en 0.10.

## 1.2 — Calidad

- [ ] Pruebas automáticas de los cálculos físicos contra valores de referencia (Glasstone & Dolan,
      Hiroshima/Nagasaki, Sedan, Baker, Cheliábinsk, Tunguska…): `npm test`.
- [ ] Repaso completo en móvil y tableta (todas las pantallas, gestos, paneles, enciclopedia).
- [ ] Aviso y opción «reducir destellos» (fotosensibilidad).
- [ ] Primera carga más rápida (carga diferida del motor 3D y de la enciclopedia).

## 1.3 — Simulación ampliada

- [ ] Viento que cambia con las horas (previsión horaria de Open-Meteo) en lluvia radiactiva y plumas.
- [ ] Guerra a gran escala e invierno nuclear (intercambios entre países, hollín, enfriamiento, cosechas).
- [ ] El relieve hace sombra al calor y a la onda expansiva.
- [ ] Daño edificio a edificio y recuento de edificios destruidos/dañados.
- [ ] «¿Estoy a salvo?»: tu ubicación, distancia, efectos que te alcanzan, llegada de la lluvia y qué hacer.
- [ ] Comparar dos escenarios a la vez (mapa partido).
- [ ] Trayectoria de misiles: país de lanzamiento, arco sobre el globo y tiempo de vuelo.
- [ ] Más catástrofes: tormenta solar tipo Carrington, rotura de una gran presa, lluvia negra.

## 1.4 — Visual

- [ ] Mapa de calor de víctimas y de población.
- [ ] Recorrido cinematográfico automático.
- [ ] Tiempo real visible en el mapa (lluvia, nubes, niebla).

## Más adelante

- [ ] Varios idiomas (inglés y otros), elegidos según el idioma del sistema.

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
- El autor hace `git push`; los commits se dejan hechos en su carpeta local.

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

- `npm run typecheck` y `npm run build` sin errores antes de cada commit.
- Capturas con Playwright + SwiftShader (navegador sin GPU) para revisar el aspecto.
