export class SceneAudio {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = {
      rain: true,
      piano: true,
      wind: false,
      thunder: false,
      creaks: false,
      musicBox: false,
      ...options
    };
    this.rainOsc = null;
    this.pianoOsc = null;
    this.musicBoxGain = null;
    this.rainGain = null;
    this.pianoGain = null;
    this.windGain = null;
    this.thunderGain = null;
    this.started = false;
  }

  start() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext || this.started) return;

    this.context = window.__houseAudioContext || new AudioContext();
    window.__houseAudioContext = this.context;
    this.rainGain = this.context.createGain();
    this.pianoGain = this.context.createGain();
    this.windGain = this.context.createGain();
    this.thunderGain = this.context.createGain();
    this.musicBoxGain = this.context.createGain();
    this.rainGain.gain.value = 0;
    this.pianoGain.gain.value = 0;
    this.windGain.gain.value = 0;
    this.thunderGain.gain.value = 0;
    this.musicBoxGain.gain.value = 0;
    this.rainGain.connect(this.context.destination);
    this.pianoGain.connect(this.context.destination);
    this.windGain.connect(this.context.destination);
    this.thunderGain.connect(this.context.destination);
    this.musicBoxGain.connect(this.context.destination);

    if (this.options.rain) this.createRain();
    if (this.options.piano) this.createPiano();
    if (this.options.wind) this.createWind();
    if (this.options.thunder) this.scheduleThunder();
    if (this.options.creaks) this.scheduleCreaks();
    if (this.options.musicBox) this.createMusicBox();
    this.started = true;
  }

  fadeIn() {
    if (!this.context || !this.started) return;
    const now = this.context.currentTime;
    this.rainGain.gain.cancelScheduledValues(now);
    this.pianoGain.gain.cancelScheduledValues(now);
    this.windGain.gain.cancelScheduledValues(now);
    this.thunderGain.gain.cancelScheduledValues(now);
    this.musicBoxGain.gain.cancelScheduledValues(now);
    this.rainGain.gain.linearRampToValueAtTime(this.options.rain ? 0.16 : 0, now + 2.5);
    this.pianoGain.gain.linearRampToValueAtTime(this.options.piano ? 0.055 : 0, now + 4);
    this.windGain.gain.linearRampToValueAtTime(this.options.wind ? 0.075 : 0, now + 3.5);
    this.thunderGain.gain.linearRampToValueAtTime(this.options.thunder ? 0.08 : 0, now + 2.5);
    this.musicBoxGain.gain.linearRampToValueAtTime(this.options.musicBox ? 0.042 : 0, now + 3);
  }

  fadeOut() {
    if (!this.context || !this.started) return;
    const now = this.context.currentTime;
    this.rainGain.gain.linearRampToValueAtTime(0, now + 1.6);
    this.pianoGain.gain.linearRampToValueAtTime(0, now + 1.6);
    this.windGain.gain.linearRampToValueAtTime(0, now + 1.6);
    this.thunderGain.gain.linearRampToValueAtTime(0, now + 1.6);
    this.musicBoxGain.gain.linearRampToValueAtTime(0, now + 1.6);
  }

  createMusicBox() {
    const notes = [523.25, 659.25, 783.99, 659.25, 587.33, 659.25];
    let index = 0;
    this.musicBoxTimer = window.setInterval(() => {
      if (!this.context || !this.musicBoxGain) return;
      const now = this.context.currentTime;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = "sine";
      osc.frequency.value = notes[index % notes.length];
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
      osc.connect(gain);
      gain.connect(this.musicBoxGain);
      osc.start(now);
      osc.stop(now + 1.5);
      index += 1;
    }, 2800);
  }

  createRain() {
    const bufferSize = this.context.sampleRate * 2;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.42;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1350;
    source.connect(filter);
    filter.connect(this.rainGain);
    source.start();
  }

  createPiano() {
    const notes = [196, 246.94, 293.66, 246.94, 220, 261.63];
    let index = 0;
    this.pianoTimer = window.setInterval(() => {
      if (!this.context || !this.pianoGain) return;
      const now = this.context.currentTime;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = "triangle";
      osc.frequency.value = notes[index % notes.length];
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.45, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      osc.connect(gain);
      gain.connect(this.pianoGain);
      osc.start(now);
      osc.stop(now + 1.9);
      index += 1;
    }, 2300);
  }

  createWind() {
    const bufferSize = this.context.sampleRate * 3;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.22;
    }

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.45;
    source.buffer = buffer;
    source.loop = true;
    source.connect(filter);
    filter.connect(this.windGain);
    source.start();
  }

  scheduleThunder() {
    const play = () => {
      if (!this.context || !this.thunderGain) return;
      const now = this.context.currentTime;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(52, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 1.2);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
      osc.connect(gain);
      gain.connect(this.thunderGain);
      osc.start(now);
      osc.stop(now + 2.6);
      this.thunderTimer = window.setTimeout(play, Phaser.Math.Between(18000, 34000));
    };

    this.thunderTimer = window.setTimeout(play, Phaser.Math.Between(5000, 12000));
  }

  scheduleCreaks() {
    const play = () => {
      if (!this.context) return;
      const now = this.context.currentTime;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      const filter = this.context.createBiquadFilter();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(118, now);
      osc.frequency.exponentialRampToValueAtTime(64, now + 0.9);
      filter.type = "lowpass";
      filter.frequency.value = 520;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.018, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.context.destination);
      osc.start(now);
      osc.stop(now + 1.3);
      this.creakTimer = window.setTimeout(play, Phaser.Math.Between(9000, 19000));
    };

    this.creakTimer = window.setTimeout(play, Phaser.Math.Between(3500, 9000));
  }

  destroy() {
    if (this.musicBoxTimer) window.clearInterval(this.musicBoxTimer);
    if (this.pianoTimer) window.clearInterval(this.pianoTimer);
    if (this.thunderTimer) window.clearTimeout(this.thunderTimer);
    if (this.creakTimer) window.clearTimeout(this.creakTimer);
    this.fadeOut();
  }
}
