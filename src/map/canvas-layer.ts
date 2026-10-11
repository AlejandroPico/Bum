/**
 * Imagen dibujada en un lienzo y colocada en el mapa entre cuatro esquinas. Se usa una fuente
 * «canvas» (no pasa por la cola de descargas de imágenes, que puede estar ocupada con teselas).
 */
import type maplibregl from 'maplibre-gl';

export type Corners = [[number, number], [number, number], [number, number], [number, number]];

/** pone o actualiza la capa `id` con el contenido actual de `canvas` */
export function putCanvas(map: maplibregl.Map, id: string, canvas: HTMLCanvasElement, coordinates: Corners, paint: Record<string, unknown>, before?: string) {
  const src = map.getSource(id) as maplibregl.CanvasSource | undefined;
  if (src) {
    src.setCoordinates(coordinates);
    // la textura sólo se vuelve a subir mientras la fuente «reproduce»: un fotograma basta
    src.play();
    map.triggerRepaint();
    map.once('render', () => requestAnimationFrame(() => src.pause()));
    return;
  }
  map.addSource(id, { type: 'canvas', canvas, coordinates, animate: false });
  map.addLayer({ id, type: 'raster', source: id, paint: paint as never }, before && map.getLayer(before) ? before : undefined);
}

export function dropLayer(map: maplibregl.Map, id: string) {
  if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource(id)) map.removeSource(id);
}
