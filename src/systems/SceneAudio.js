import { resumeGameAudio, startBackgroundMusic } from "./BackgroundMusic.js";

// Scene ambience is intentionally limited to rain, thunder, and creaks.
// The supplied MP3 is the only musical score and is owned globally.
export class SceneAudio {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = {
      rain: true,
      thunder: false,
      creaks: false,
      ...options
    };
    this.sources = [];
    this.started = false;
  }

  start() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext || this.started) return;

    void resumeGameAudio(this.scene);
    startBackgroundMusic(this.scene);

    this.context = window.__houseAudioContext || new AudioContext();
    window.__houseAudioContext = this.context;
    this.rainGain = this.context.createGain();
    this.thunderGain = this.context.createGain();
    this.creakGain = this.context.createGain();
    this.rainGain.gain.value = 0;
    this.thunderGain.gain.value = 0;
    this.creakGain.gain.value = 0;
    this.rainGain.connect(this.context.destination);
    this.thunderGain.connect(this.context.destination);
    this.creakGain.connect(this.context.destination);
    this.started = true;

    if (this.options.rain) this.createRain();
    if (this.options.thunder) this.scheduleThunder();
    if (this.options.creaks) this.scheduleCreaks();
  }

  fadeIn() {
    if (!this.context || !this.started) return;
    const now = this.context.currentTime;
    this.rainGain.gain.cancelScheduledValues(now);
    this.thunderGain.gain.cancelScheduledValues(now);
    this.creakGain.gain.cancelScheduledValues(now);
    this.rainGain.gain.linearRampToValueAtTime(this.options.rain ? 0.14 : 0, now + 2.2);
    this.thunderGain.gain.linearRampToValueAtTime(this.options.thunder ? 0.065 : 0, now + 2.2);
    this.creakGain.gain.linearRampToValueAtTime(this.options.creaks ? 0.022 : 0, now + 2.2);
  }

  fadeOut() {
    if (!this.context || !this.started) return;
    const now = this.context.currentTime;
    this.rainGain.gain.linearRampToValueAtTime(0, now + 1.1);
    this.thunderGain.gain.linearRampToValueAtTime(0, now + 1.1);
    this.creakGain.gain.linearRampToValueAtTime(0, now + 1.1);
  }

  createRain() {
    const bufferSize = this.context.sampleRate * 2;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < bufferSize; index += 1) {
      data[index] = (Math.random() * 2 - 1) * 0.38;
    }

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    source.buffer = buffer;
    source.loop = true;
    filter.type = "lowpass";
    filter.frequency.value = 1250;
    source.connect(filter);
    filter.connect(this.rainGain);
    source.start();
    this.sources.push(source);
  }

  scheduleThunder() {
    const play = () => {
      if (!this.context || !this.thunderGain || !this.started) return;
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(52, now);
      oscillator.frequency.exponentialRampToValueAtTime(28, now + 1.2);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.32, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
      oscillator.connect(gain);
      gain.connect(this.thunderGain);
      oscillator.start(now);
      oscillator.stop(now + 2.6);
      this.thunderTimer = window.setTimeout(play, Phaser.Math.Between(18000, 34000));
    };

    this.thunderTimer = window.setTimeout(play, Phaser.Math.Between(5000, 12000));
  }

  scheduleCreaks() {
    const play = () => {
      if (!this.context || !this.creakGain || !this.started) return;
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const filter = this.context.createBiquadFilter();
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(118, now);
      oscillator.frequency.exponentialRampToValueAtTime(64, now + 0.9);
      filter.type = "lowpass";
      filter.frequency.value = 520;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.018, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(this.creakGain);
      oscillator.start(now);
      oscillator.stop(now + 1.3);
      this.creakTimer = window.setTimeout(play, Phaser.Math.Between(9000, 19000));
    };

    this.creakTimer = window.setTimeout(play, Phaser.Math.Between(3500, 9000));
  }

  destroy() {
    if (this.thunderTimer) window.clearTimeout(this.thunderTimer);
    if (this.creakTimer) window.clearTimeout(this.creakTimer);
    this.fadeOut();
    this.sources.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // A scene may close after the source has already stopped.
      }
    });
    this.sources = [];
    [this.rainGain, this.thunderGain, this.creakGain].forEach((gain) => {
      try {
        gain?.disconnect();
      } catch {
        // Browser audio cleanup is best-effort during page suspension.
      }
    });
    this.started = false;
  }
}
