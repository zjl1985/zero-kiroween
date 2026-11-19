/**
 * Procedural sound: every cue is built from Web Audio oscillators and generated
 * noise, no audio files. The AudioContext is created on the first user gesture.
 * Audio never reads the sim RNG; ambience timing uses Math.random freely.
 */
import { CUE_LAYERS, ENVELOPE, MASTER, THROTTLE, type Cue, type Layer } from "./mix.js";

export type { Cue } from "./mix.js";

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
  const ambienceSources: AudioScheduledSourceNode[] = [];
  const ambienceNodes: AudioNode[] = [];

  function stopAmbience(): void {
    window.clearTimeout(cricketTimer);
    cricketTimer = undefined;
    for (const source of ambienceSources) source.stop();
    for (const node of ambienceNodes) node.disconnect();
    ambienceSources.length = ambienceNodes.length = 0;
    ambienceBus = null;
  }

  const ensure = (): AudioContext | null => {
    if (ac) return ac;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ac = new Ctor();
    master = ac.createGain();
    master.gain.value = muted ? 0 : MASTER.gain;
    // A gentle compressor glues crowded fights; the limiter after it stops stacked cues clipping.
    const comp = ac.createDynamicsCompressor(),
      limiter = ac.createDynamicsCompressor();
    comp.threshold.value = MASTER.compressor.threshold;
    comp.ratio.value = MASTER.compressor.ratio;
    limiter.threshold.value = MASTER.limiter.threshold;
    limiter.knee.value = MASTER.limiter.knee;
    limiter.ratio.value = MASTER.limiter.ratio;
    limiter.attack.value = MASTER.limiter.attack;
    limiter.release.value = MASTER.limiter.release;
    master.connect(comp).connect(limiter).connect(ac.destination);
    noiseBuffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    buildAmbience();
    scheduleCrickets();
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
      attack = opts.attack ?? ENVELOPE.toneAttack;
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    g.gain.setValueAtTime(ENVELOPE.floor, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(ENVELOPE.floor, t0 + dur);
    osc.connect(g).connect(master);
    osc.onended = () => { osc.disconnect(); g.disconnect(); osc.onended = null; };
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
    g.gain.setValueAtTime(ENVELOPE.floor, t0);
    g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.1, t0 + ENVELOPE.noiseAttack);
    g.gain.exponentialRampToValueAtTime(ENVELOPE.floor, t0 + dur);
    src.connect(f).connect(g).connect(master);
    src.onended = () => { src.disconnect(); f.disconnect(); g.disconnect(); src.buffer = null; src.onended = null; };
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + dur + 0.05);
  }

  function buildAmbience(): void {
    if (!ac || !master || !noiseBuffer || !ambienceOn || muted || ambienceBus) return;
    ambienceBus = ac.createGain();
    ambienceBus.gain.value = 0;
    ambienceBus.gain.setTargetAtTime(MASTER.ambience, ac.currentTime, 0.6);
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
    ambienceSources.push(wind, lfo);
    ambienceNodes.push(wind, lp, windGain, lfo, lfoGain, ambienceBus);
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
      ambienceSources.push(o);
      ambienceNodes.push(o, g);
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
      o.onended = () => { o.disconnect(); g.disconnect(); o.onended = null; };
      o.start(t);
      o.stop(t + 0.06);
    }
  }

  function scheduleCrickets(): void {
    window.clearTimeout(cricketTimer);
    if (!ambienceOn || muted || !ac) return;
    cricketTimer = window.setTimeout(() => {
      cricket();
      scheduleCrickets();
    }, 1400 + Math.random() * 3200);
  }

  function layer(l: Layer): void {
    if (l.kind === "tone")
      tone(l.freq, l.dur, { type: l.type, gain: l.gain, to: l.to, delay: l.delay, attack: l.attack });
    else noise(l.dur, { type: l.filter, freq: l.freq, q: l.q, gain: l.gain, delay: l.delay, to: l.to });
  }

  return {
    unlock() {
      const a = ensure();
      if (a && a.state === "suspended") void a.resume();
    },
    setMuted(value) {
      muted = value;
      if (muted) stopAmbience();
      else buildAmbience();
      scheduleCrickets();
      if (ac && master) master.gain.setTargetAtTime(muted ? 0 : MASTER.gain, ac.currentTime, 0.03);
    },
    setAmbience(on) {
      if (ambienceOn === on) return;
      ambienceOn = on;
      if (on) buildAmbience();
      else stopAmbience();
      scheduleCrickets();
    },
    play(cue, intensity = 0) {
      if (!ac || muted || ac.state !== "running") return;
      const prev = last.get(cue) ?? -1;
      if (ac.currentTime - prev < THROTTLE[cue]) return;
      last.set(cue, ac.currentTime);
      for (const l of CUE_LAYERS[cue](intensity, Math.random)) layer(l);
    },
  };
}
