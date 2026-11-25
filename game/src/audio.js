// Tiny WebAudio synth for the game's sounds: no audio files, every effect is a
// short oscillator blip made at the moment it is needed. The context is created
// lazily on the first sound so a page that never gets a gesture stays silent.

export function createAudio() {
  let context = null;
  let enabled = true;

  function ensure() {
    if (context !== null) return context;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    } catch {
      context = null;
    }
    return context;
  }

  /** One blip: a waveform at a frequency for a duration, sliding to a second frequency. */
  function blip(type, from, to, seconds, gain) {
    if (!enabled) return;
    const ctx = ensure();
    if (ctx === null) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + seconds);
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  return {
    pick() { blip('sine', 520, 700, 0.07, 0.12); },
    chop() { blip('square', 180, 120, 0.06, 0.1); },
    sizzle() { blip('sawtooth', 900, 500, 0.09, 0.05); },
    plate() { blip('triangle', 440, 660, 0.09, 0.12); },
    serve() {
      blip('sine', 880, 880, 0.1, 0.14);
      setTimeout(() => blip('sine', 1318, 1318, 0.16, 0.14), 90);
    },
    fail() { blip('sawtooth', 160, 90, 0.22, 0.12); },
    tick() { blip('sine', 1000, 1000, 0.04, 0.07); },
    toggle() { enabled = !enabled; return enabled; },
    isEnabled() { return enabled; },
  };
}
