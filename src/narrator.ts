/**
 * Narrador: lee en voz alta los textos del recorrido con la síntesis de voz del propio navegador
 * (sin servidores), en el idioma de la aplicación. Elige la voz más natural que haya en el equipo
 * (las «neuronales» o «naturales» de Edge, las de Google en Chrome, las mejoradas de macOS…), lee
 * frase a frase (los navegadores cortan las locuciones largas) y avisa al terminar.
 */
import { langInfo, lang } from './i18n';

/** palabras de las unidades para leerlas enteras (la voz deletrea «km» o lee «m» como «eme») */
const UNITS: Record<string, Record<string, string>> = {
  es: { 'km²': 'kilómetros cuadrados', 'km/h': 'kilómetros por hora', 'km/s': 'kilómetros por segundo', km: 'kilómetros', m: 'metros', s: 'segundos', min: 'minutos', h: 'horas', kt: 'kilotones', Mt: 'megatones' },
  ca: { 'km²': 'quilòmetres quadrats', 'km/h': 'quilòmetres per hora', 'km/s': 'quilòmetres per segon', km: 'quilòmetres', m: 'metres', s: 'segons', min: 'minuts', h: 'hores', kt: 'quilotones', Mt: 'megatones' },
  en: { 'km²': 'square kilometres', 'km/h': 'kilometres per hour', 'km/s': 'kilometres per second', km: 'kilometres', m: 'metres', s: 'seconds', min: 'minutes', h: 'hours', kt: 'kilotons', Mt: 'megatons' },
  fr: { 'km²': 'kilomètres carrés', 'km/h': 'kilomètres par heure', 'km/s': 'kilomètres par seconde', km: 'kilomètres', m: 'mètres', s: 'secondes', min: 'minutes', h: 'heures', kt: 'kilotonnes', Mt: 'mégatonnes' },
  de: { 'km²': 'Quadratkilometer', 'km/h': 'Kilometer pro Stunde', 'km/s': 'Kilometer pro Sekunde', km: 'Kilometer', m: 'Meter', s: 'Sekunden', min: 'Minuten', h: 'Stunden', kt: 'Kilotonnen', Mt: 'Megatonnen' },
  pt: { 'km²': 'quilómetros quadrados', 'km/h': 'quilómetros por hora', 'km/s': 'quilómetros por segundo', km: 'quilómetros', m: 'metros', s: 'segundos', min: 'minutos', h: 'horas', kt: 'quilotoneladas', Mt: 'megatoneladas' },
  ru: { 'km²': 'квадратных километров', 'km/h': 'километров в час', 'km/s': 'километров в секунду', km: 'километров', m: 'метров', s: 'секунд', min: 'минут', h: 'часов', kt: 'килотонн', Mt: 'мегатонн', 'км²': 'квадратных километров', 'км/ч': 'километров в час', 'км/с': 'километров в секунду', км: 'километров', м: 'метров', с: 'секунд', мин: 'минут', ч: 'часов', кт: 'килотонн', Мт: 'мегатонн' },
  zh: { 'km²': '平方公里', 'km/h': '公里每小时', 'km/s': '公里每秒', km: '公里', m: '米', s: '秒', min: '分钟', h: '小时', kt: '千吨', Mt: '百万吨' },
  ja: { 'km²': '平方キロメートル', 'km/h': 'キロメートル毎時', 'km/s': 'キロメートル毎秒', km: 'キロメートル', m: 'メートル', s: '秒', min: '分', h: '時間', kt: 'キロトン', Mt: 'メガトン' },
  it: { 'km²': 'chilometri quadrati', 'km/h': 'chilometri orari', 'km/s': 'chilometri al secondo', km: 'chilometri', m: 'metri', s: 'secondi', min: 'minuti', h: 'ore', kt: 'chilotoni', Mt: 'megatoni' },
};
/** siglas que la voz deletrearía: se leen como nombre completo */
const ABBR: Record<string, [RegExp, string][]> = {
  es: [[/\bEE\.\s?UU\.?/g, 'Estados Unidos'], [/\bEEUU\b/g, 'Estados Unidos'], [/\bURSS\b/g, 'Unión Soviética'], [/≈\s?/g, 'unos '], [/\bpsi\b/g, 'libras por pulgada cuadrada']],
  ca: [[/\bEUA\b/g, 'Estats Units'], [/\bURSS\b/g, 'Unió Soviètica'], [/≈\s?/g, 'uns '], [/\bpsi\b/g, 'lliures per polzada quadrada']],
  en: [[/\bthe US\b/g, 'the United States'], [/\bUS\b/g, 'United States'], [/\bUSSR\b/g, 'Soviet Union'], [/≈\s?/g, 'about '], [/\bpsi\b/g, 'pounds per square inch']],
  fr: [[/\bURSS\b/g, 'Union soviétique'], [/≈\s?/g, 'environ '], [/\bpsi\b/g, 'livres par pouce carré']],
  de: [[/\bUdSSR\b/g, 'Sowjetunion'], [/≈\s?/g, 'etwa '], [/\bpsi\b/g, 'Pfund pro Quadratzoll']],
  pt: [[/\bEUA\b/g, 'Estados Unidos'], [/\bURSS\b/g, 'União Soviética'], [/≈\s?/g, 'cerca de '], [/\bpsi\b/g, 'libras por polegada quadrada']],
  ru: [[/≈\s?/g, 'около '], [/\bpsi\b/g, 'фунтов на квадратный дюйм']],
  zh: [[/≈\s?/g, '约'], [/\s?\bpsi\b/g, '磅每平方英寸']],
  ja: [[/≈\s?/g, '約'], [/\s?\bpsi\b/g, 'ポンド毎平方インチ']],
  it: [[/\bURSS\b/g, 'Unione Sovietica'], [/≈\s?/g, 'circa '], [/\bpsi\b/g, 'libbre per pollice quadrato']],
};

/**
 * Prepara un texto para la voz: siglas y unidades con su nombre completo, números sin separador de
 * miles (la voz hacía una pausa en el punto de «12.500» y leía «12» y luego «500») y sin abreviaturas.
 */
export function forSpeech(text: string, L: string = lang): string {
  let t = text;
  for (const [re, w] of ABBR[L] ?? ABBR.es) t = t.replace(re, w);
  // separador de miles: punto (o coma en inglés) y espacios finos o duros entre grupos de tres cifras
  const grp = L === 'en' || L === 'zh' || L === 'ja' ? ',' : '.';
  for (let k = 0; k < 3; k++) t = t.replace(new RegExp(`(\\d)[${grp === '.' ? '\\.' : ','}\u00a0\u202f\u2009 ](?=\\d{3}(?!\\d))`, 'g'), '$1');
  const U = UNITS[L] ?? UNITS.es;
  t = t.replace(/(\d)\s?(km²|km\/h|km\/s|km|min|Mt|kt|m|s|h|км²|км\/ч|км\/с|км|мин|Мт|кт|м|с|ч)(?![\p{Script=Latin}\p{Script=Cyrillic}\d²\/])/gu, (_m, d: string, u: string) => `${d} ${U[u] ?? u}`);
  t = t.replace(/×\s?(\d[\d.,]*)/g, (_m, n: string) => `${n} ${L === 'en' ? 'times' : L === 'ru' ? 'раз' : L === 'zh' || L === 'ja' ? '倍' : L === 'de' ? 'mal' : L === 'fr' ? 'fois' : L === 'it' ? 'volte' : L === 'ca' ? 'vegades' : 'veces'}`);
  return t.replace(/\s{2,}/g, ' ').trim();
}

const NICE = /natural|neural|online|premium|enhanced|mejorad|google|siri|wavenet/i;
const BAD = /espeak|compact|eloquence/i;

export class Narrator {
  private voice: SpeechSynthesisVoice | null = null;
  private ready: Promise<void> | null = null;
  private token = 0;
  /** hay síntesis de voz en este navegador */
  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  /** espera a la lista de voces (en Chrome llega después de cargar la página) y elige la mejor */
  prepare() {
    if (!this.supported) return Promise.resolve();
    if (this.ready) return this.ready;
    this.ready = new Promise<void>((res) => {
      const pick = () => {
        const all = speechSynthesis.getVoices();
        if (!all.length) return false;
        const tags = langInfo().speech.map((t) => t.toLowerCase());
        const score = (v: SpeechSynthesisVoice) => {
          const l = v.lang.toLowerCase().replace('_', '-');
          const ti = tags.findIndex((t) => l === t || l.startsWith(t + '-') || (t.length === 2 && l.split('-')[0] === t));
          if (ti < 0) return -1;
          return 100 - ti * 10 + (NICE.test(v.name) ? 40 : 0) - (BAD.test(v.name) ? 60 : 0) + (v.localService ? 0 : 5);
        };
        const best = all.map((v) => ({ v, s: score(v) })).filter((x) => x.s >= 0).sort((a, b) => b.s - a.s)[0];
        this.voice = best?.v ?? null;
        return true;
      };
      if (pick()) { res(); return; }
      const on = () => { if (pick()) { speechSynthesis.removeEventListener('voiceschanged', on); res(); } };
      speechSynthesis.addEventListener('voiceschanged', on);
      setTimeout(() => { pick(); res(); }, 2000);
    });
    return this.ready;
  }

  /** hay una voz en el idioma de la aplicación */
  get hasVoice() { return !!this.voice; }
  get voiceName() { return this.voice?.name ?? ''; }

  /** lee un texto; se resuelve al terminar (o al cancelar) */
  async speak(text: string): Promise<void> {
    if (!this.supported || !text) return;
    await this.prepare();
    if (!this.voice) return;
    const tok = ++this.token;
    // frases cortas: más naturales (pausas en los puntos) y sin el corte de las locuciones largas
    // se corta sólo en los finales de frase (punto y espacio), nunca dentro de un número como «1,2» o «1.2»
    const parts = forSpeech(text).split(/(?<=[.!?;:])\s+(?=\S)|(?<=[。！？；])/).map((x) => x.trim()).filter(Boolean);
    for (const p of parts) {
      if (tok !== this.token) return;
      await new Promise<void>((res) => {
        const u = new SpeechSynthesisUtterance(p);
        u.voice = this.voice;
        u.lang = this.voice!.lang;
        u.rate = 0.96;
        u.pitch = 1;
        let done = false;
        const fin = () => { if (!done) { done = true; clearTimeout(guard); res(); } };
        u.onend = fin; u.onerror = fin;
        // por si el navegador no avisa del final: tiempo de sobra según la longitud
        const guard = setTimeout(fin, 2500 + p.length * 110);
        speechSynthesis.speak(u);
      });
    }
  }

  cancel() {
    this.token++;
    if (this.supported) speechSynthesis.cancel();
  }
}
