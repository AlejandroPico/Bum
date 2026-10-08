/** Sonido sintetizado (Web Audio): siseo del destello, estampido y retumbo prolongado. */
export class Audio {
  ctx: AudioContext | null = null;
  enabled = true;
  private master: GainNode | null = null;

  private ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -12; comp.ratio.value = 6;
      this.master.connect(comp).connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  unlock() { this.ensure(); }

  private noise(seconds: number, brown = false) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  /** destello: un siseo grave inmediato (efecto cinematográfico) */
  flash(intensity: number) {
    if (!this.enabled || !this.ensure()) return;
    const ctx = this.ctx!;
    const n = this.noise(3);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.5;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.12 * intensity, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
    n.connect(f).connect(g).connect(this.master!);
    n.start();
  }

  /** llegada de la onda expansiva al observador */
  boom(intensity: number) {
    if (!this.enabled || !this.ensure()) return;
    const ctx = this.ctx!;
    const I = Math.max(0.05, Math.min(1, intensity));
    const t = ctx.currentTime;
    // golpe inicial
    const n = this.noise(1.2);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2500, t); lp.frequency.exponentialRampToValueAtTime(120, t + 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.0 * I, t + 0.012); g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    n.connect(lp).connect(g).connect(this.master!);
    n.start(t);
    // sub-grave
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(55, t); o.frequency.exponentialRampToValueAtTime(22, t + 1.5);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.9 * I, t); og.gain.exponentialRampToValueAtTime(0.001, t + 2);
    o.connect(og).connect(this.master!); o.start(t); o.stop(t + 2.1);
    // retumbo largo
    const r = this.noise(12, true);
    const rl = ctx.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 180;
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0, t); rg.gain.linearRampToValueAtTime(0.8 * I, t + 0.4); rg.gain.exponentialRampToValueAtTime(0.001, t + 11);
    r.connect(rl).connect(rg).connect(this.master!);
    r.start(t);
  }

  /** silbido/rugido del bólido */
  rumble(seconds: number) {
    if (!this.enabled || !this.ensure()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const n = this.noise(seconds + 1, true);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(200, t); f.frequency.linearRampToValueAtTime(900, t + seconds);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + seconds); g.gain.linearRampToValueAtTime(0, t + seconds + 0.3);
    n.connect(f).connect(g).connect(this.master!);
    n.start(t);
  }
}
