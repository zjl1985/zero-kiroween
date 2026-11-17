/**
 * Procedural sound: every cue is built from Web Audio oscillators and generated
 * noise, no audio files. The AudioContext is created on the first user gesture.
 * Audio never reads the sim RNG; ambience timing uses Math.random freely.
 */
export type Cue =
  | "shot"
  | "hit"
  | "defeat"
  | "pickup"
  | "levelup"
  | "evolve"
  | "hurt"
  | "shield"
  | "boss"
  | "win"
  | "lose"
  | "pumpkin"
  | "treat"
  | "moon"
  | "streak"
  | "skill"
  | "card"
  | "tear"
  | "crackle";

/** Minimum seconds between repeats of the busiest cues. */
const THROTTLE: Partial<Record<Cue, number>> = {
  shot: 0.07,
  hit: 0.045,
  defeat: 0.05,
  pickup: 0.05,
  tear: 0.08,
  // Repeats while anything burns; the gap sets the crackle's pace.
  crackle: 0.28,
};

export interface Sfx {
  /** Call from a user gesture; creates or resumes the AudioContext. */
  unlock(): void;
  setMuted(muted: boolean): void;
  /** Quiet night ambience, on while a run is being played. */
  setAmbience(on: boolean): void;
  play(cue: Cue, intensity?: number): void;
}

export function createSfx(initiallyMuted: boolean): Sfx {
  let ac: AudioContext | null = null,
    master: GainNode | null = null,
    ambienceBus: GainNode | null = null,
    noiseBuffer: AudioBuffer | null = null,
    muted = initiallyMuted,
    ambienceOn = false,
    cricketTimer: number | undefined;
  const last = new Map<Cue, number>();

  const ensure = (): AudioContext | null => {
    if (ac) return ac;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ac = new Ctor();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.55;
    // A gentle compressor keeps crowded fights from clipping.
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master.connect(comp).connect(ac.destination);
    noiseBuffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    buildAmbience();
    return ac;
  };

  function tone(
    freq: number,
    dur: number,
    opts: { type?: OscillatorType; gain?: number; to?: number; delay?: number; attack?: number } = {},
  ): void {
    if (!ac || !master) return;
    const t0 = ac.currentTime + (opts.delay ?? 0),
      osc = ac.createOscillator(),
      g = ac.createGain(),
      peak = opts.gain ?? 0.1,
      attack = opts.attack ?? 0.005;
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(
    dur: number,
    opts: { type?: BiquadFilterType; freq?: number; q?: number; gain?: number; delay?: number; to?: number } = {},
  ): void {
    if (!ac || !master || !noiseBuffer) return;
    const t0 = ac.currentTime + (opts.delay ?? 0),
      src = ac.createBufferSource(),
      f = ac.createBiquadFilter(),
      g = ac.createGain();
    src.buffer = noiseBuffer;
    src.loop = true;
    f.type = opts.type ?? "bandpass";
    f.frequency.setValueAtTime(opts.freq ?? 1500, t0);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    f.Q.value = opts.q ?? 1;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.1, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + dur + 0.05);
  }

  function buildAmbience(): void {
    if (!ac || !master || !noiseBuffer) return;
    ambienceBus = ac.createGain();
    ambienceBus.gain.value = ambienceOn ? 0.1 : 0;
    ambienceBus.connect(master);
    // Soft wind: looped noise through a low, slowly wandering filter.
    const wind = ac.createBufferSource(),
      lp = ac.createBiquadFilter(),
      windGain = ac.createGain(),
      lfo = ac.createOscillator(),
      lfoGain = ac.createGain();
    wind.buffer = noiseBuffer;
    wind.loop = true;
    lp.type = "lowpass";
    lp.frequency.value = 380;
    windGain.gain.value = 0.28;
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain).connect(lp.frequency);
    wind.connect(lp).connect(windGain).connect(ambienceBus);
    wind.start();
    lfo.start();
    // A low two-note drone under the wind.
    for (const [f, v] of [
      [110, 0.05],
      [164.8, 0.03],
    ] as const) {
      const o = ac.createOscillator(),
        g = ac.createGain();
      o.frequency.value = f;
      g.gain.value = v;
      o.connect(g).connect(ambienceBus);
      o.start();
    }
  }

  function cricket(): void {
    if (!ac || !ambienceBus || !ambienceOn || muted) return;
    const t0 = ac.currentTime,
      base = 4200 + Math.random() * 600;
    for (let i = 0; i < 3; i++) {
      const o = ac.createOscillator(),
        g = ac.createGain(),
        t = t0 + i * 0.07;
      o.frequency.value = base;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.connect(g).connect(ambienceBus);
      o.start(t);
      o.stop(t + 0.06);
    }
  }

  function scheduleCrickets(): void {
    window.clearTimeout(cricketTimer);
    if (!ambienceOn) return;
    cricketTimer = window.setTimeout(() => {
      cricket();
      scheduleCrickets();
    }, 1400 + Math.random() * 3200);
  }

  const voices: Record<Cue, (k: number) => void> = {
    shot: () => tone(980, 0.07, { type: "triangle", gain: 0.035, to: 1500 }),
    hit: () => noise(0.05, { freq: 2200, q: 2, gain: 0.07 }),
    defeat: (k) => {
      // Paper tear plus a soft drop.
      noise(0.14, { type: "highpass", freq: 2600, gain: 0.08 });
      tone(320 + k * 40, 0.14, { gain: 0.05, to: 120 });
    },
    pickup: (k) => tone(1150 + Math.min(k, 8) * 60, 0.08, { gain: 0.04, to: 1800 }),
    levelup: () =>
      [523.3, 659.3, 784, 1046.5].forEach((f, i) =>
        tone(f, 0.22, { type: "triangle", gain: 0.07, delay: i * 0.08 }),
      ),
    evolve: () => {
      [392, 493.9, 587.3, 784].forEach((f, i) => {
        tone(f, 1.1, { gain: 0.05, delay: i * 0.05, attack: 0.04 });
        tone(f * 1.005, 1.1, { gain: 0.03, delay: i * 0.05 + 0.02, attack: 0.05 });
      });
      noise(0.9, { freq: 6000, q: 0.7, gain: 0.03, to: 2000 });
    },
    hurt: () => {
      tone(220, 0.2, { type: "square", gain: 0.05, to: 90 });
      noise(0.12, { type: "lowpass", freq: 900, gain: 0.08 });
    },
    shield: () => {
      tone(660, 0.35, { gain: 0.06 });
      tone(990, 0.35, { gain: 0.04, delay: 0.02 });
    },
    boss: () => {
      for (let i = 0; i < 2; i++) {
        tone(98, 0.5, { type: "sawtooth", gain: 0.05, delay: i * 0.6, attack: 0.08, to: 82 });
        tone(147, 0.5, { type: "triangle", gain: 0.035, delay: i * 0.6, attack: 0.08 });
      }
    },
    win: () =>
      [784, 987.8, 1174.7, 1568].forEach((f, i) => {
        tone(f, 1.4, { gain: 0.06, delay: i * 0.18 });
        tone(f * 2, 0.9, { gain: 0.015, delay: i * 0.18 });
      }),
    lose: () =>
      [392, 329.6, 261.6, 196].forEach((f, i) =>
        tone(f, 0.45, { type: "triangle", gain: 0.06, delay: i * 0.16 }),
      ),
    pumpkin: () => {
      noise(0.45, { type: "lowpass", freq: 300, to: 1400, gain: 0.08 });
      tone(330, 0.4, { type: "triangle", gain: 0.04, to: 495, attack: 0.05 });
    },
    treat: () => {
      tone(520, 0.09, { type: "triangle", gain: 0.06 });
      tone(700, 0.12, { type: "triangle", gain: 0.06, delay: 0.09 });
    },
    moon: () => {
      tone(523.3, 1.6, { gain: 0.07, attack: 0.02 });
      tone(784, 1.6, { gain: 0.05, delay: 0.04 });
      tone(1046.5, 1.2, { gain: 0.03, delay: 0.08 });
      noise(1.0, { freq: 800, to: 5000, q: 0.6, gain: 0.04 });
    },
    streak: (k) => tone(1320 + Math.min(k, 50) * 6, 0.12, { type: "square", gain: 0.025 }),
    skill: () => noise(0.18, { freq: 900, to: 3000, q: 1.4, gain: 0.07 }),
    card: () => noise(0.08, { type: "highpass", freq: 3000, gain: 0.05 }),
    // A short rip: band-passed noise sweeping down, then a dry flap.
    tear: () => {
      noise(0.16, { freq: 4200, to: 1400, q: 2.2, gain: 0.09 });
      noise(0.05, { type: "lowpass", freq: 700, gain: 0.05, delay: 0.12 });
    },
    // Fire: a few tiny pops over a low hiss, scaled by how much is burning.
    crackle: (k) => {
      noise(0.3, { type: "lowpass", freq: 520, gain: 0.025 + Math.min(k, 20) * 0.001 });
      const pops = 2 + Math.min(3, Math.floor(k / 8));
      for (let i = 0; i < pops; i++)
        noise(0.018, { type: "highpass", freq: 2600 + Math.random() * 2400, gain: 0.05, delay: Math.random() * 0.24 });
    },
  };

  return {
    unlock() {
      const a = ensure();
      if (a && a.state === "suspended") void a.resume();
    },
    setMuted(value) {
      muted = value;
      if (ac && master) master.gain.setTargetAtTime(muted ? 0 : 0.55, ac.currentTime, 0.03);
    },
    setAmbience(on) {
      if (ambienceOn === on) return;
      ambienceOn = on;
      if (ac && ambienceBus)
        ambienceBus.gain.setTargetAtTime(on ? 0.1 : 0, ac.currentTime, 0.6);
      scheduleCrickets();
    },
    play(cue, intensity = 0) {
      if (!ac || muted || ac.state !== "running") return;
      const gap = THROTTLE[cue];
      if (gap) {
        const prev = last.get(cue) ?? -1;
        if (ac.currentTime - prev < gap) return;
        last.set(cue, ac.currentTime);
      }
      voices[cue](intensity);
    },
  };
}
