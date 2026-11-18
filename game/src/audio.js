// Procedural WebAudio sound effects. No audio files, no network.
// Created lazily on the first user gesture (browsers block audio before that).

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.22;
    return this.muted;
  }

  _tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noise(dur, vol, lowpass) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    let node = src;
    if (lowpass) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = lowpass;
      src.connect(f); node = f;
    }
    node.connect(g); g.connect(this.master);
    src.start(t);
  }

  shoot() { this._tone(880, 0.07, 'square', 0.10, 320); }
  hit() { this._tone(220, 0.05, 'triangle', 0.12, 140); }
  explode() { this._noise(0.28, 0.30, 900); this._tone(120, 0.22, 'sine', 0.22, 40); }
  pearl() { this._tone(1320, 0.09, 'sine', 0.12, 1980); }
  hurt() { this._tone(160, 0.25, 'sawtooth', 0.22, 60); }
  dash() { this._noise(0.12, 0.12, 2400); }
  wave() { this._tone(392, 0.35, 'sine', 0.16, 392); this._tone(523, 0.35, 'sine', 0.12, 523); }
  upgrade() { [523, 659, 784].forEach((f, i) => setTimeout(() => this._tone(f, 0.16, 'sine', 0.16), i * 70)); }
  boss() { this._tone(70, 0.7, 'sawtooth', 0.25, 45); this._noise(0.5, 0.15, 300); }
  gameover() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this._tone(f, 0.3, 'triangle', 0.16), i * 160)); }
}
