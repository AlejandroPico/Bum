/**
 * Arranque: primero el idioma (catálogo de traducciones) y después la aplicación.
 */
import { initI18n } from './i18n';

initI18n().finally(() => import('./app'));
