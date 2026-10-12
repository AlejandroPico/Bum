/**
 * Narrador: lee en voz alta los textos del recorrido con la síntesis de voz del propio navegador
 * (sin servidores), en el idioma de la aplicación. Elige la voz más natural que haya en el equipo
 * (las «neuronales» o «naturales» de Edge, las de Google en Chrome, las mejoradas de macOS…), lee
 * frase a frase (los navegadores cortan las locuciones largas) y avisa al terminar.
 */
import { langInfo } from './i18n';

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
    const parts = text.match(/[^.!?;]+[.!?;]+|[^.!?;]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
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
