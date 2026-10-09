# Bum — simulador 3D de ataques nucleares e impactos

**Demo:** https://alejandropico.github.io/Bum/

Simulador web de los efectos de **armas nucleares** e **impactos de asteroides y cometas** sobre cualquier
lugar del mundo, con mapa satelital en 3D (relieve + edificios), bola de fuego, onda expansiva, nube en
forma de hongo, cúpulas tridimensionales de cada efecto, incendios, lluvia radiactiva arrastrada por el
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

- **Objetivo**: busca un lugar, pulsa una ciudad rápida o haz clic en el mapa.
- **Arma nuclear**: modelos históricos y actuales, o potencia libre (de 1 t a 100 Mt), fracción de fisión
  y tipo de detonación (superficie, aérea óptima o altura personalizada — hasta explosiones espaciales con EMP).
- **Impacto cósmico**: diámetro, composición/densidad, velocidad, ángulo, dirección de llegada y terreno
  (sedimento, roca o agua con profundidad).
- **Entorno**: viento (dirección y velocidad), humedad, visibilidad y hora del día (incluye noche con luces
  de ciudad).
- **Resultados**: panel flotante (se arrastra y se minimiza) con víctimas estimadas, cada efecto con su radio
  y superficie (clic = ocultar/mostrar, doble clic = encuadrar), lluvia radiactiva, datos físicos y tiempos
  de llegada de la onda.
- **Línea de tiempo**: reproducir/pausar, rebobinar, velocidad ×0,25–×16. La escala es logarítmica: los
  primeros segundos se ven a cámara lenta.
- Botón de cámara (línea de tiempo): plano cinematográfico del hongo completo con órbita lenta.
- Atajos: `H` oculta la interfaz · `Espacio` pausa · `D` detona.
- El enlace (botón compartir) guarda el escenario completo en la URL.

## Modelos físicos

| Efecto | Modelo |
|---|---|
| Sobrepresión | Ajuste de Glasstone & Dolan (1977) para 1 kt en superficie (forma de Collins et al. 2005) + realce de la onda de Mach para explosiones aéreas, calibrado con las tablas de *The Effects of Nuclear Weapons* |
| Radiación térmica | Fluencia `f·E·τ/(4πR²)` con transmisión atmosférica según la visibilidad; umbrales de quemaduras e ignición escalados con la duración del pulso |
| Radiación inicial | Curvas de dosis ancladas a Glasstone (500 rem / 100 rem) con atenuación exponencial en aire |
| Bola de fuego, nube | Escalados empíricos de Glasstone (radio ∝ Y^0,4; altura de la nube por tramos) |
| Lluvia radiactiva | Modelo analítico simplificado (tipo WSEG-10): actividad 1 kt fisión ≈ 3000 R/h·mi² a H+1, penacho log-normal a sotavento con dispersión lateral; isolíneas 1–1000 rad/h |
| Asteroides | Collins, Melosh & Marcus (2005): fragmentación, modelo "pancake", explosión aérea, velocidad de impacto, cráter simple/complejo, eyecta, sismicidad, tsunami (aprox.) |
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

## Hoja de ruta

- [ ] Ciudades fotorrealistas con Google Photorealistic 3D Tiles (requiere clave de API) o Cesium.
- [ ] Población real con rejilla GHSL/WorldPop en lugar del modelo de densidad.
- [ ] Ataques múltiples (MIRV) y escenarios encadenados.
- [ ] Explosiones subterráneas y submarinas.
- [x] Hongo volumétrico con *ray-marching*.
- [x] Disipación de la nube (el tronco se deshace, el sombrero se extiende, se erosiona y deriva con el viento).
- [ ] Post-procesado (bloom, distorsión por calor).
- [ ] Refugios y tiempo de permanencia recomendado frente a la lluvia radiactiva.
- [ ] Versión en inglés.

## Licencia

MIT — ver [LICENSE](LICENSE).
