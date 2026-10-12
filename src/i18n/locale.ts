/**
 * Formato de números del idioma activo. Lo fija `initI18n` antes de cargar la aplicación; los
 * cálculos y las pruebas, que no lo llaman, usan el castellano.
 */
export let LOCALE = 'es-ES';
/** separador decimal (para las cifras que se escriben a mano con toFixed) */
export let DEC = ',';
export function setLocale(loc: string) {
  LOCALE = loc;
  DEC = (1.5).toLocaleString(loc).includes(',') ? ',' : '.';
}
