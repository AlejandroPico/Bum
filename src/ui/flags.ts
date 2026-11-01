/** Banderas (simplificadas, 3:2) de cada idioma, en SVG para que se vean igual en todos los sistemas. */
const svg = (body: string) => `<svg viewBox="0 0 30 20" width="21" height="14" aria-hidden="true">${body}</svg>`;
export const FLAGS: Record<string, string> = {
  es: svg('<rect width="30" height="20" fill="#c60b1e"/><rect y="5" width="30" height="10" fill="#ffc400"/>'),
  ca: svg('<rect width="30" height="20" fill="#fcdd09"/>' + [0, 1, 2, 3].map((i) => `<rect y="${2.22 + i * 4.44}" width="30" height="2.22" fill="#da121a"/>`).join('')),
  en: svg('<rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.6"/><path d="M15 0V20M0 10H30" stroke="#fff" stroke-width="6"/><path d="M15 0V20M0 10H30" stroke="#c8102e" stroke-width="3.4"/>'),
  fr: svg('<rect width="10" height="20" fill="#0055a4"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ef4135"/>'),
  de: svg('<rect width="30" height="6.67" fill="#000"/><rect y="6.67" width="30" height="6.67" fill="#dd0000"/><rect y="13.33" width="30" height="6.67" fill="#ffce00"/>'),
  pt: svg('<rect width="30" height="20" fill="#ff0000"/><rect width="12" height="20" fill="#006600"/><circle cx="12" cy="10" r="4" fill="none" stroke="#ffcc00" stroke-width="1.4"/><rect x="10.4" y="8" width="3.2" height="4" fill="#fff" stroke="#ff0000" stroke-width=".6"/>'),
  it: svg('<rect width="10" height="20" fill="#009246"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ce2b37"/>'),
  zh: svg('<rect width="30" height="20" fill="#de2910"/><polygon points="5,2 6.2,5.6 2.4,3.4 7.6,3.4 3.8,5.6" fill="#ffde00" transform="translate(0,1) scale(1.1)"/>' + [[10, 2], [12, 4], [12, 7], [10, 9]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".8" fill="#ffde00"/>`).join('')),
  ja: svg('<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/>'),
  ko: svg('<rect width="30" height="20" fill="#fff"/><g transform="rotate(33.7 15 10)"><path d="M10 10a5 5 0 0 1 10 0a2.5 2.5 0 0 0-5 0a2.5 2.5 0 0 1-5 0z" fill="#cd2e3a"/><path d="M20 10a5 5 0 0 1-10 0a2.5 2.5 0 0 0 5 0a2.5 2.5 0 0 1 5 0z" fill="#0047a0"/></g>' + [[5.2, 4], [24.8, 16], [24.8, 4], [5.2, 16]].map(([x, y], i) => `<g transform="rotate(${i < 2 ? -56.3 : 56.3} ${x} ${y})" fill="#000">${[-1.2, 0, 1.2].map((d) => `<rect x="${x - 2}" y="${y + d - 0.4}" width="4" height=".8"/>`).join('')}</g>`).join('')),
  ru: svg('<rect width="30" height="6.67" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#0039a6"/><rect y="13.33" width="30" height="6.67" fill="#d52b1e"/>'),
  ar: svg('<rect width="30" height="20" fill="#006c35"/><rect x="7" y="8" width="16" height="1.6" fill="#fff"/><rect x="9" y="12" width="12" height="1" fill="#fff"/>'),
  hi: svg('<rect width="30" height="6.67" fill="#ff9933"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#138808"/><circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" stroke-width=".7"/>'),
};
/** icono del modo automático (un globo) */
export const AUTO_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg>';
