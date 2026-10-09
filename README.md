# Bum — simulador 3D de ataques nucleares e impactos

**Demo:** https://alejandropico.github.io/Bum/

Simulador web de los efectos de **armas nucleares** e **impactos de asteroides y cometas** sobre cualquier
lugar del mundo, con mapa satelital en 3D (relieve + edificios), bola de fuego, onda expansiva, nube en
forma de hongo, cúpulas tridimensionales de cada efecto (aparecen al terminar la bola de fuego), incendios, lluvia radiactiva arrastrada por el
viento, sonido y cámara cinemática.

> Proyecto educativo inspirado en NUKEMAP (Alex Wellerstein) y en *Impact: Earth!* (Collins et al.).
> Las cifras son estimaciones orientativas.

## Puesta en marcha

Requisitos: [Node.js](https://nodejs.org) 20 o superior.

```bash
npm install
npm run dev        # abre http://localhost:5173
```

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run build` | genera la web estática en `dist/` |
| `npm run preview` | sirve `dist/` en local para probar el build |
| `npm run typecheck` | comprobación de tipos TypeScript |
| `npm run check:physics` | imprime los radios calculados para varios escenarios de referencia |

## Publicar en GitHub Pages

1. Sube el repositorio a GitHub (rama `main`).
2. En **Settings → Pages → Build and deployment → Source** elige **GitHub Actions**.
3. Cada `push` a `main` ejecuta `.github/workflows/deploy.yml`, que compila y publica en
   https://alejandropico.github.io/Bum/

## Uso

- **Objetivo**: busca un lugar por su nombre, escribe coordenadas (`40.4168, -3.7038`, `40°25'08"N 3°42'14"O`,
  `40.41 N 3.70 W` o un enlace de mapas con `@lat,lon`), usa tu ubicación o haz clic en el mapa.
- **Arma**: más de 70 modelos ordenados de mayor a menor potencia en cinco grupos — pruebas y bombas históricas,
  armas de la Guerra Fría, arsenales actuales, explosiones no nucleares (Minor Scale, Halifax, Beirut, Tianjin…)
  y bombas convencionales (FOAB, MOAB, GBU-57…) — o potencia libre (1 kg a 1 Gt), fracción de fisión, explosivo
  químico (sin radiación ni lluvia radiactiva) y tipo de detonación (superficie, aérea óptima o altura
  personalizada — hasta explosiones espaciales con EMP).
- **Impacto cósmico**: 22 escenarios (de 2008 TC3 a Hale-Bopp) o diámetro, composición/densidad, velocidad,
  ángulo, dirección de llegada y terreno (sedimento, roca o agua con profundidad).
- **Mapa**: plano 2D (por defecto) o **globo 3D** (botón del globo, arriba a la derecha, o en Visualización).
- **Terreno automático**: en impactos se detecta si el punto es tierra u océano y la profundidad del agua (batimetría de los datos de relieve).
- **Entorno**: botón de **tiempo real** (Open-Meteo, gratuito y sin clave) que trae viento, humedad, visibilidad,
  temperatura, nubosidad y hora local del objetivo; para la lluvia radiactiva se usa el viento medio entre 850 y
  250 hPa (la capa por la que viaja la nube). Opción de actualizarlo al cambiar de objetivo. También se puede
  ajustar todo a mano, incluido el % de población al aire libre (doble clic en el valor = automático).
- **Resultados**: panel flotante (se arrastra y se minimiza) con contadores de fallecidos y heridos y seis
  pestañas — *Resumen*, *Efectos* (de dentro hacia fuera; clic = ocultar/mostrar, doble clic = encuadrar),
  *Población* (por zona, viviendas, sanidad), *Física* (bola de fuego, onda por distancia, sonido, térmica,
  sismicidad, cráter, objeto, tsunami), *Radiación* (radiación inicial, isótopos, lluvia radiactiva por distancia
  con dosis acumuladas, superficie contaminada, protección civil) y *Comparar* (energía, clima, economía).
- **Marcas en el terreno**: suelo quemado, cráter, manto de eyecta, suelo activado por neutrones y zona
  contaminada (rayado) que permanecen tras la explosión.
- **Línea de tiempo**: reproducir/pausar, rebobinar, velocidad ×0,25–×16. La escala es logarítmica: los
  primeros segundos se ven a cámara lenta.
- Botón de cámara (línea de tiempo): plano cinematográfico del hongo completo con órbita lenta.
- Atajos: `H` oculta la interfaz · `Espacio` pausa · `D` detona.
- El enlace (botón compartir) guarda el escenario completo en la URL.

## Enciclopedia

Botón del libro (bajo el del globo, o tecla `E`): más de 170 artículos (fundamentos, tipos de armas, historia, efectos, accidentes, impactos cósmicos y una ficha por cada arma, explosión y asteroide del simulador), glosario de 130 términos, 16 esquemas animados y modelos 3D interactivos (Little Boy, Fat Man, el Gadget de Trinity, Ivy Mike y modelos genéricos de bombas, ojivas, misiles, torpedos y proyectiles) que se pueden girar, cortar, ver en rayos X, desmontar y animar paso a paso. Nivel divulgativo, de museo: sin información de fabricación.

## Modelos físicos

| Efecto | Modelo |
|---|---|
| Sobrepresión | Ajuste de Glasstone & Dolan (1977) para 1 kt en superficie (forma de Collins et al. 2005) + realce de la onda de Mach para explosiones aéreas, calibrado con las tablas de *The Effects of Nuclear Weapons* |
| Radiación térmica | Fluencia `f·E·τ/(4πR²)` con transmisión atmosférica según la visibilidad; umbrales de quemaduras e ignición escalados con la duración del pulso |
| Radiación inicial | Curvas de dosis ancladas a Glasstone (500 rem / 100 rem) con atenuación exponencial en aire |
| Bola de fuego, nube | Escalados empíricos de Glasstone (radio ∝ Y^0,4; altura de la nube por tramos) |
| Lluvia radiactiva | Modelo analítico simplificado (tipo WSEG-10): actividad 1 kt fisión ≈ 3000 R/h·mi² a H+1, penacho log-normal a sotavento con dispersión lateral; isolíneas 1–1000 rad/h |
| Asteroides | Collins, Melosh & Marcus (2005): fragmentación, modelo "pancake", explosión aérea, velocidad de impacto, cráter simple/complejo, eyecta, sismicidad (ec. 40–41), radiación térmica con fracción visible sobre el horizonte |
| Tsunami | Wünnemann et al. (2010): A(D) = min(0,14·Dtc, h)·Dtc/(2D), alcance máximo ~13 000 km; se propaga a √(g·h) |
| Escala planetaria | Ningún efecto supera las antípodas (20 015 km); los círculos son geodésicos (cruzan el antimeridiano y los polos); entradas limitadas a rangos físicos |
| Explosivos químicos | Equivalencia de la onda ≈ 2× la de una nuclear de igual energía (no se pierde energía en radiación); bola de fuego `1,16·W^0,32` m (W en kg); sin radiación ni lluvia radiactiva |
| Isótopos | 1 kt de fisión ≈ 1,45·10²³ fisiones; rendimientos acumulados de I-131 (2,9 %), Cs-137 (6,2 %) y Sr-90 (5,8 %) |
| Víctimas | Densidad urbana de Clark (exponencial) a partir de la población metropolitana de ~100 ciudades + probabilidades de muerte/heridas tipo OTA (1979) combinadas con quemaduras y radiación |

## Tecnología

- [MapLibre GL JS](https://maplibre.org) 5 — mapa 3D con relieve, cielo/niebla y edificios extruidos.
- [three.js](https://threejs.org) — efectos en una capa personalizada que comparte el contexto WebGL y el
  búfer de profundidad con el mapa (los efectos quedan detrás de montañas y edificios).
- Hongo **volumétrico por ray-marching**: densidad analítica (toro del sombrero, columna, collar y faldón)
  erosionada con ruido Perlin-Worley 3D, auto-sombreado hacia el sol, función de fase con *silver lining* y
  emisión del interior incandescente.
- Shaders propios: bola de fuego con turbulencia fractal y rampa de cuerpo negro, onda de choque, nube de
  Wilson, cúpulas de efectos con pulso al paso de la onda, partículas con iluminación volumétrica aproximada.
- Web Audio para el sonido sintetizado (estampido sincronizado con la llegada de la onda a la cámara).
- TypeScript + Vite.

### Fuentes de datos del mapa

- Imágenes satelitales: Esri World Imagery (revisa sus [condiciones de uso](https://www.esri.com/en-us/legal/terms/full-master-agreement) antes de un despliegue público con mucho tráfico).
- Relieve: Mapzen Terrain Tiles en AWS Open Data.
- Edificios, carreteras y topónimos: [OpenFreeMap](https://openfreemap.org) © colaboradores de OpenStreetMap.
- Búsqueda de lugares: Nominatim (OpenStreetMap).
- Tiempo real: [Open-Meteo](https://open-meteo.com) (CC BY 4.0).

## Hoja de ruta

- [ ] Ciudades fotorrealistas con Google Photorealistic 3D Tiles (requiere clave de API) o Cesium.
- [ ] Población real con rejilla GHSL/WorldPop en lugar del modelo de densidad.
- [ ] Ataques múltiples (MIRV) y escenarios encadenados.
- [ ] Explosiones subterráneas y submarinas.
- [x] Hongo volumétrico con *ray-marching*.
- [x] Disipación de la nube (el tronco se deshace, el sombrero se extiende, se erosiona y deriva con el viento).
- [ ] Post-procesado (bloom, distorsión por calor).
- [x] Estadísticas ampliadas (población, sanidad, isótopos, dosis acumuladas, clima, economía).
- [x] Tiempo real (viento en altura) con Open-Meteo.
- [ ] Refugios y tiempo de permanencia recomendado frente a la lluvia radiactiva.
- [ ] Versión en inglés.

## Icono

`favicon.svg` (en la raíz) es el icono del proyecto: se usa como favicon, como logotipo de la interfaz y se publica también en la raíz del sitio.

## Licencia

MIT — ver [LICENSE](LICENSE).
