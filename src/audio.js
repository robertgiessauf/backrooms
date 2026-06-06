export function resumeAudioContext(audio) {
  if (!audio) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return null;
    }
    const ctx = new AudioContext();
    const base = ctx.createOscillator();
    const buzz = ctx.createOscillator();
    const lightBuzz = ctx.createOscillator();
    const lightHarmonic = ctx.createOscillator();
    const gain = ctx.createGain();
    const lightGain = ctx.createGain();
    const sourceGain = ctx.createGain();
    const lightBuzzGain = ctx.createGain();
    const lightHarmonicGain = ctx.createGain();
    const lightSourceGain = ctx.createGain();
    const lightPan = typeof ctx.createStereoPanner === "function" ? ctx.createStereoPanner() : null;
    const lightBuzzFilter = ctx.createBiquadFilter();
    const lightHarmonicFilter = ctx.createBiquadFilter();
    const filter = ctx.createBiquadFilter();

    base.type = "sine";
    buzz.type = "sawtooth";
    lightBuzz.type = "sawtooth";
    lightHarmonic.type = "triangle";
    lightBuzz.frequency.value = 118;
    lightHarmonic.frequency.value = 236;
    filter.type = "lowpass";
    filter.frequency.value = 780;
    lightBuzzFilter.type = "lowpass";
    lightBuzzFilter.frequency.value = 360;
    lightBuzzFilter.Q.value = 1.1;
    lightHarmonicFilter.type = "bandpass";
    lightHarmonicFilter.frequency.value = 260;
    lightHarmonicFilter.Q.value = 1.4;
    gain.gain.value = 0.0001;
    lightGain.gain.value = 0.0001;
    sourceGain.gain.value = 0.38;
    lightBuzzGain.gain.value = 0.72;
    lightHarmonicGain.gain.value = 0.18;
    lightSourceGain.gain.value = 0.32;

    base.connect(sourceGain);
    buzz.connect(sourceGain);
    sourceGain.connect(filter);
    lightBuzz.connect(lightBuzzFilter);
    lightBuzzFilter.connect(lightBuzzGain);
    lightBuzzGain.connect(lightSourceGain);
    lightHarmonic.connect(lightHarmonicFilter);
    lightHarmonicFilter.connect(lightHarmonicGain);
    lightHarmonicGain.connect(lightSourceGain);
    lightSourceGain.connect(lightGain);
    filter.connect(gain);
    gain.connect(ctx.destination);
    if (lightPan) {
      lightGain.connect(lightPan);
      lightPan.connect(ctx.destination);
    } else {
      lightGain.connect(ctx.destination);
    }

    base.start();
    buzz.start();
    lightBuzz.start();
    lightHarmonic.start();
    audio = { ctx, base, buzz, lightBuzz, lightHarmonic, gain, lightGain, lightPan };
  }

  if (audio.ctx.state === "suspended") {
    audio.ctx.resume();
  }

  return audio;
}
