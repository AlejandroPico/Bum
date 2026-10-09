/** identificador de la ficha del catálogo a partir del nombre de un preset */
export function slug(name: string): string {
  return 'cat-' + name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
