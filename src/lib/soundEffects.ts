// Organic, cute synthesized sound effects using the Web Audio API
// 100% client-side, zero external assets or network dependencies.

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('loom_sound_enabled') ?? localStorage.getItem('aura_sound_enabled');
      this.enabled = stored !== null ? stored === 'true' : true;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('loom_sound_enabled', String(this.enabled));
    }
    if (this.enabled) {
      this.bubblePop();
    }
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem('loom_sound_enabled', String(val));
    }
  }

  /**
   * Cute chat bubble send sound: ascending buoyant water-drop pop ("bloop!")
   */
  public bubbleSend() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Main bubbling droplet oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Cheerful ascending curve
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(860, now + 0.09);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);

      // Sweet secondary overtone for extra cuteness
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(640, now + 0.02);
      osc2.frequency.exponentialRampToValueAtTime(1280, now + 0.08);

      gain2.gain.setValueAtTime(0.06, now + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.02);
      osc2.stop(now + 0.11);
    } catch {
      // Ignore
    }
  }

  /**
   * Cute chat bubble receive sound: cheerful 2-tone melodic bubble ("bloop-ding!")
   */
  public bubbleReceive() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Note 1: E5 (659Hz) rounded drop
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(540, now);
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.06);

      gain1.gain.setValueAtTime(0.14, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.18);

      // Note 2: A5 (880Hz) bright sparkling chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.07);
      osc2.frequency.exponentialRampToValueAtTime(1046.5, now + 0.14); // up to C6

      gain2.gain.setValueAtTime(0.12, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.07);
      osc2.stop(now + 0.38);
    } catch {
      // Ignore
    }
  }

  /**
   * Light tactile cute bubble pop for clicks and micro-interactions
   */
  public bubblePop() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.05);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      // Ignore
    }
  }

  /**
   * Playful triple mini-pop arpeggio for emoji reactions and mood clicks
   */
  public reactionPop() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const freqs = [600, 750, 950];
      freqs.forEach((f, idx) => {
        const time = now + idx * 0.05;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, time);
        osc.frequency.exponentialRampToValueAtTime(f * 1.3, time + 0.04);

        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.07);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Cute, tactile button pop
   */
  public pop() {
    this.bubblePop();
  }

  /**
   * Gentle peaceful chime (harmonic warm marimba)
   */
  public chime() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.09 / (idx + 1), now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.5);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Letter folding paper swoosh sound
   */
  public foldSwoosh() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Filtered noise sweep
      const bufferSize = ctx.sampleRate * 0.3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.3);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.32);
    } catch {
      // Ignore
    }
  }

  /**
   * Warm wax seal stamp sound (soft low thud + warm high resonance)
   */
  public sealStamp() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Soft low thud
      const oscLow = ctx.createOscillator();
      const gainLow = ctx.createGain();
      oscLow.type = 'sine';
      oscLow.frequency.setValueAtTime(180, now);
      oscLow.frequency.exponentialRampToValueAtTime(60, now + 0.18);
      gainLow.gain.setValueAtTime(0.18, now);
      gainLow.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      oscLow.connect(gainLow);
      gainLow.connect(ctx.destination);
      oscLow.start(now);
      oscLow.stop(now + 0.22);

      // Warm shimmer seal ting
      const oscHigh = ctx.createOscillator();
      const gainHigh = ctx.createGain();
      oscHigh.type = 'triangle';
      oscHigh.frequency.setValueAtTime(880, now + 0.05);
      oscHigh.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
      gainHigh.gain.setValueAtTime(0.08, now + 0.05);
      gainHigh.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      oscHigh.connect(gainHigh);
      gainHigh.connect(ctx.destination);
      oscHigh.start(now + 0.05);
      oscHigh.stop(now + 0.55);
    } catch {
      // Ignore
    }
  }

  /**
   * Magical sparkle arpeggio (time capsule unlocking / celestial sparkle)
   */
  public sparkle() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [659.25, 783.99, 987.77, 1046.5, 1318.51, 1567.98]; // E5, G5, B5, C6, E6, G6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.08, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.4);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Deep contemplative chord when entering future self or completing reflection
   */
  public contemplative() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Chord: F3, C4, A4, E5 (warm Fmaj7)
      const chord = [174.61, 261.63, 440.0, 659.25];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.04 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.3);
      });
    } catch {
      // Ignore
    }
  }
}

export const sounds = new SoundManager();
