import maplibregl, { type Map as MLMap } from 'maplibre-gl';
import { TEST_SITES, NOTABLE_TESTS, TOTAL_TESTS, type NotableTest } from '../data/tests';

/**
 * Capa «Pruebas nucleares»: un círculo por polígono de pruebas (área ∝ número de ensayos) y un
 * punto por cada prueba célebre. Al pulsar se abre una ficha con la opción de simularla.
 */
export class TestsLayer {
  private map: MLMap;
  private popup: maplibregl.Popup | null = null;
  visible = false;
  onSimulate: (t: NotableTest) => void = () => {};
  onBook: (name: string) => void = () => {};

  constructor(map: MLMap) { this.map = map; }

  install() {
    const m = this.map;
    if (m.getSource('tests-sites')) return;
    m.addSource('tests-sites', { type: 'geojson', data: { type: 'FeatureCollection', features: TEST_SITES.map((s, i) => ({ type: 'Feature', properties: { i, name: s.name, count: s.count }, geometry: { type: 'Point', coordinates: [s.lon, s.lat] } })) } });
    m.addSource('tests-notable', { type: 'geojson', data: { type: 'FeatureCollection', features: NOTABLE_TESTS.map((t, i) => ({ type: 'Feature', properties: { i, name: t.name }, geometry: { type: 'Point', coordinates: [t.lon, t.lat] } })) } });
    const vis = this.visible ? 'visible' : 'none';
    m.addLayer({ id: 'tests-sites', type: 'circle', source: 'tests-sites', layout: { visibility: vis }, paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, ['+', 3, ['*', 0.55, ['sqrt', ['get', 'count']]]], 6, ['+', 6, ['*', 1.4, ['sqrt', ['get', 'count']]]]],
      'circle-color': 'rgba(255,196,0,0.18)', 'circle-stroke-color': '#ffc400', 'circle-stroke-width': 1.2,
    } });
    m.addLayer({ id: 'tests-sites-lbl', type: 'symbol', source: 'tests-sites', minzoom: 2.5, layout: { visibility: vis, 'text-field': ['concat', ['get', 'name'], '\n', ['to-string', ['get', 'count']]], 'text-font': ['Noto Sans Regular'], 'text-size': 10.5, 'text-offset': [0, 1.4], 'text-anchor': 'top', 'text-letter-spacing': 0.05 }, paint: { 'text-color': '#ffd866', 'text-halo-color': 'rgba(0,0,0,0.8)', 'text-halo-width': 1.2 } });
    m.addLayer({ id: 'tests-notable', type: 'circle', source: 'tests-notable', layout: { visibility: vis }, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 2.5, 8, 5], 'circle-color': '#ff6b2c', 'circle-stroke-color': '#000', 'circle-stroke-width': 1 } });
    m.addLayer({ id: 'tests-notable-lbl', type: 'symbol', source: 'tests-notable', minzoom: 5, layout: { visibility: vis, 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-offset': [0, -1.1], 'text-anchor': 'bottom' }, paint: { 'text-color': '#ffb38f', 'text-halo-color': 'rgba(0,0,0,0.85)', 'text-halo-width': 1.2 } });
    for (const id of ['tests-sites', 'tests-notable']) {
      m.on('mouseenter', id, () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', id, () => { m.getCanvas().style.cursor = ''; });
    }
  }

  setVisible(on: boolean) {
    this.visible = on;
    for (const id of ['tests-sites', 'tests-sites-lbl', 'tests-notable', 'tests-notable-lbl']) if (this.map.getLayer(id)) this.map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    if (!on) this.popup?.remove();
  }

  /** ¿el clic cae sobre la capa? Si es así abre la ficha y devuelve true */
  handleClick(e: maplibregl.MapMouseEvent): boolean {
    if (!this.visible) return false;
    const f = this.map.queryRenderedFeatures(e.point, { layers: ['tests-notable', 'tests-sites'].filter((l) => this.map.getLayer(l)) });
    if (!f.length) return false;
    const top = f.find((x) => x.layer.id === 'tests-notable') ?? f[0];
    const i = top.properties?.i as number;
    this.popup?.remove();
    const el = document.createElement('div');
    el.className = 'test-pop';
    if (top.layer.id === 'tests-notable') {
      const t = NOTABLE_TESTS[i];
      el.innerHTML = `<div class="tp-k">Prueba nuclear · ${t.date}</div><h3>${t.name}</h3><div class="tp-y">${t.yieldKt >= 1000 ? (t.yieldKt / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' Mt' : t.yieldKt.toLocaleString('es-ES') + ' kt'}</div><p>${t.note}</p>`;
      const row = document.createElement('div'); row.className = 'tp-row';
      const sim = document.createElement('button'); sim.type = 'button'; sim.className = 'btn-line'; sim.textContent = 'Simular aquí';
      sim.onclick = () => { this.popup?.remove(); this.onSimulate(t); };
      const book = document.createElement('button'); book.type = 'button'; book.className = 'btn-ghost'; book.textContent = 'Enciclopedia';
      book.onclick = () => this.onBook(t.preset ?? t.name);
      row.append(sim, book); el.append(row);
    } else {
      const s = TEST_SITES[i];
      el.innerHTML = `<div class="tp-k">${s.country} · ${s.years}</div><h3>${s.name}</h3><div class="tp-y">${s.count.toLocaleString('es-ES')} prueba${s.count > 1 ? 's' : ''}</div><p>${s.note}</p><p class="tp-n">De ${TOTAL_TESTS.toLocaleString('es-ES')} pruebas nucleares en el mundo (1945–2017).</p>`;
    }
    this.popup = new maplibregl.Popup({ closeButton: true, maxWidth: '280px', className: 'bum-popup' }).setLngLat(e.lngLat).setDOMContent(el).addTo(this.map);
    return true;
  }
}
