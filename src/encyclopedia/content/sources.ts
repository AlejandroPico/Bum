import type { CatId } from '../types';

/**
 * Bibliografía de la enciclopedia. Cada artículo muestra sus fuentes propias y las generales de
 * su sección. Todas son obras o webs públicas y de divulgación o de referencia.
 */
const GLASSTONE = 'Glasstone, S. y Dolan, P. J. (1977). *The Effects of Nuclear Weapons*, 3.ª ed. Departamento de Defensa y Departamento de Energía de EE. UU. [Texto completo](https://www.fourmilab.ch/etexts/www/effects/)';
const RHODES = 'Rhodes, R. (1986). *The Making of the Atomic Bomb*. Simon & Schuster (en español: *La historia de la bomba atómica*).';
const RHODES2 = 'Rhodes, R. (1995). *Dark Sun: The Making of the Hydrogen Bomb*. Simon & Schuster.';
const NWA = 'Sublette, C. *Nuclear Weapon Archive*. [nuclearweaponarchive.org](https://nuclearweaponarchive.org/)';
const AHF = 'Atomic Heritage Foundation / National Museum of Nuclear Science & History. [ahf.nuclearmuseum.org](https://ahf.nuclearmuseum.org/)';
const FAS = 'Kristensen, H. M., Korda, M. y otros. *Status of World Nuclear Forces*. Federation of American Scientists. [fas.org](https://fas.org/initiative/status-world-nuclear-forces/)';
const SIPRI = 'SIPRI Yearbook (2025 y 2026): *Armaments, Disarmament and International Security*. Stockholm International Peace Research Institute. [sipri.org](https://www.sipri.org/yearbook)';
const CTBTO = 'Comisión Preparatoria de la Organización del Tratado de Prohibición Completa de los Ensayos Nucleares (OTPCE). [ctbto.org](https://www.ctbto.org/)';
const WELLERSTEIN = 'Wellerstein, A. (2021). *Restricted Data: The History of Nuclear Secrecy in the United States*. University of Chicago Press; y su blog [Restricted Data](https://blog.nuclearsecrecy.com/).';
const NNDC = 'National Nuclear Data Center, Brookhaven National Laboratory: datos nucleares evaluados. [nndc.bnl.gov](https://www.nndc.bnl.gov/)';
const KRANE = 'Krane, K. S. (1988). *Introductory Nuclear Physics*. Wiley.';
const IAEA = 'Organismo Internacional de Energía Atómica (OIEA). [iaea.org](https://www.iaea.org/)';
const UNSCEAR = 'Comité Científico de las Naciones Unidas para el Estudio de los Efectos de las Radiaciones Atómicas (UNSCEAR), informes 2000, 2008 y 2020/2021. [unscear.org](https://www.unscear.org/)';
const RERF = 'Radiation Effects Research Foundation (Hiroshima y Nagasaki): estudios de los supervivientes. [rerf.or.jp](https://www.rerf.or.jp/en/)';
const HPMM = 'Museo Conmemorativo de la Paz de Hiroshima. [hpmmuseum.jp](https://hpmmuseum.jp/?lang=eng)';
const OTA = 'Office of Technology Assessment (1979). *The Effects of Nuclear War*. Congreso de EE. UU.';
const TOON = 'Toon, O. B., Robock, A. y otros (2019). «Rapidly expanding nuclear arsenals in Pakistan and India portend regional and global catastrophe». *Science Advances*, 5(10).';
const XIA = 'Xia, L., Robock, A. y otros (2022). «Global food insecurity and famine from reduced crop, marine fishery and livestock production due to climate disruption from nuclear war soot injection». *Nature Food*, 3, 586–596.';
const COLLINS = 'Collins, G. S., Melosh, H. J. y Marcus, R. A. (2005). «Earth Impact Effects Program». *Meteoritics & Planetary Science*, 40(6), 817–840. [Calculadora](https://impact.ese.ic.ac.uk/ImpactEarth/)';
const CNEOS = 'NASA, Center for Near Earth Object Studies (CNEOS) y sistema Sentry. [cneos.jpl.nasa.gov](https://cneos.jpl.nasa.gov/)';
const ESA = 'ESA, Centro de Coordinación de Objetos Cercanos (NEOCC). [neo.ssa.esa.int](https://neo.ssa.esa.int/)';
const SCHLOSSER = 'Schlosser, E. (2013). *Command and Control: Nuclear Weapons, the Damascus Accident, and the Illusion of Safety*. Penguin.';
const NUKEMAP = 'Wellerstein, A. *NUKEMAP*. [nuclearsecrecy.com/nukemap](https://nuclearsecrecy.com/nukemap/)';

export const SOURCES: { byId: Record<string, string[]>; byCat: Partial<Record<CatId, string[]>> } = {
  byCat: {
    fund: [KRANE, NNDC, RHODES],
    tipos: [GLASSTONE, NWA, RHODES, RHODES2, WELLERSTEIN],
    hist: [RHODES, RHODES2, AHF, WELLERSTEIN, NWA],
    relatos: [RHODES, AHF],
    efec: [GLASSTONE, OTA, NUKEMAP, RERF],
    acc: [IAEA, UNSCEAR, SCHLOSSER],
    cosmos: [COLLINS, CNEOS, ESA],
    cat: [NWA, FAS, SIPRI, GLASSTONE],
  },
  byId: {
    hiroshima: [HPMM, RERF, 'Hersey, J. (1946). *Hiroshima*. Alfred A. Knopf.'],
    nagasaki: ['Museo de la Bomba Atómica de Nagasaki. [nabmuseum.jp](https://nagasakipeace.jp/)', RERF],
    hibakusha: [RERF, HPMM],
    'pruebas-nucleares': [CTBTO, 'Yang, X., North, R., Romney, C. y Richards, P. G. (2003). *Worldwide Nuclear Explosions*. Center for Monitoring Research.'],
    'arsenales-actuales': [FAS, SIPRI],
    'potencias-nucleares': [FAS, SIPRI],
    tratados: ['Oficina de Asuntos de Desarme de las Naciones Unidas (UNODA). [disarmament.unoda.org](https://disarmament.unoda.org/)', CTBTO],
    'crisis-de-los-misiles': ['National Security Archive, George Washington University: «The Cuban Missile Crisis, 1962». [nsarchive.gwu.edu](https://nsarchive.gwu.edu/)', 'Dobbs, M. (2008). *One Minute to Midnight*. Knopf.'],
    'invierno-nuclear': [TOON, XIA, 'Turco, R. P., Toon, O. B., Ackerman, T. P., Pollack, J. B. y Sagan, C. (1983). «Nuclear winter: global consequences of multiple nuclear explosions». *Science*, 222, 1283–1292.'],
    'lluvia-radiactiva': [GLASSTONE, 'Way, K. y Wigner, E. P. (1948). «The rate of decay of fission products». *Physical Review*, 73, 1318.'],
    'efectos-en-la-salud': [RERF, UNSCEAR, 'ICRP (2007). Publicación 103: recomendaciones de la Comisión Internacional de Protección Radiológica.'],
    'proteccion-civil': ['FEMA (2022). *Planning Guidance for Response to a Nuclear Detonation*, 3.ª ed.', 'Kearny, C. H. (1987). *Nuclear War Survival Skills*. Oak Ridge National Laboratory.'],
    chernobil: [UNSCEAR, 'OIEA (2006). *Chernobyl\'s Legacy: Health, Environmental and Socio-Economic Impacts* (Chernobyl Forum).'],
    fukushima: [UNSCEAR, 'OIEA (2015). *The Fukushima Daiichi Accident: Report by the Director General*.'],
    palomares: ['Stiles, D. (2006). «A Fusion Bomb over Andalucía: U.S. Information Policy and the 1966 Palomares Incident». *Journal of Cold War Studies*, 8(1).', 'CIEMAT: plan de vigilancia radiológica de Palomares.'],
    'damascus-titan': [SCHLOSSER],
    goldsboro: [SCHLOSSER],
    'falsas-alarmas': ['Hoffman, D. E. (2009). *The Dead Hand*. Doubleday.'],
    tunguska: ['Chyba, C. F., Thomas, P. J. y Zahnle, K. J. (1993). «The 1908 Tunguska explosion: atmospheric disruption of a stony asteroid». *Nature*, 361, 40–44.'],
    cheliabinsk: ['Popova, O. P. y otros (2013). «Chelyabinsk airburst, damage assessment, meteorite recovery, and characterization». *Science*, 342, 1069–1073.', 'Brown, P. G. y otros (2013). *Nature*, 503, 238–241.'],
    chicxulub: ['Schulte, P. y otros (2010). «The Chicxulub asteroid impact and mass extinction at the Cretaceous-Paleogene boundary». *Science*, 327, 1214–1218.'],
    'defensa-planetaria': ['Daly, R. T. y otros (2023). «Successful kinetic impact into an asteroid for planetary defence». *Nature*, 616, 443–447.', 'Cheng, A. F. y otros (2023). «Momentum transfer from the DART mission kinetic impact on asteroid Dimorphos». *Nature*, 616, 457–460.', CNEOS],
    'escalas-de-riesgo': ['Binzel, R. P. (2000). «The Torino Impact Hazard Scale». *Planetary and Space Science*, 48, 297–303.', 'Chesley, S. R. y otros (2002). «Quantifying the risk posed by potential Earth impacts». *Icarus*, 159, 423–432.'],
    'tsar-bomba': ['Khariton, Y. y Smirnov, Y. (1993). «The Khariton version». *Bulletin of the Atomic Scientists*, 49(4).', 'Rosatom (2020): documental y archivo desclasificado sobre la prueba de 1961.'],
    'prueba-trinity': ['Bainbridge, K. T. (1976). *Trinity*. Los Alamos Scientific Laboratory, LA-6300-H.', 'Selby, H. D. y otros (2021). «A new yield assessment for the Trinity nuclear test, 75 years later». *Nuclear Technology*, 207.'],
    'proyecto-manhattan': ['Hewlett, R. G. y Anderson, O. E. (1962). *The New World, 1939–1946*. Atomic Energy Commission.', 'Departamento de Energía de EE. UU.: *The Manhattan Project: An Interactive History*. [osti.gov](https://www.osti.gov/opennet/manhattan-project-history/)'],
    'pulso-electromagnetico': ['Longmire, C. L. (1978). «On the electromagnetic pulse produced by nuclear explosions». *IEEE Transactions on Antennas and Propagation*, 26(1).', 'Comisión del Congreso de EE. UU. sobre EMP (2008). *Critical National Infrastructures*.'],
  },
};
