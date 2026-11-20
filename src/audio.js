// Procedural Web Audio API chiptune & adaptive BGM engine

const NOTE_FREQ = {
  C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, G3: 196.0, Ab3: 207.65, A3: 220.0, Bb3: 233.08, B3: 246.94,
  C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.0, Ab4: 415.3, A4: 440.0, Bb4: 466.16, B4: 493.88,
  C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5,
};

const SOLAR_MELODY = [
  'E5', null, 'G5', 'A5', 'G5', null, 'E5', 'D5',
  'C5', null, 'D5', 'E5', 'G5', null, 'D5', null,
  'E5', null, 'G5', 'A5', 'C6', null, 'B5', 'A5',
  'G5', 'E5', 'D5', 'E5', 'C5', null, null, null,
];

const SOLAR_BASS = [
  'C3', null, 'G3', null, 'A3', null, 'E3', null,
  'F3', null, 'C3', null, 'G3', null, 'D3', null,
  'C3', null, 'G3', null, 'A3', null, 'E3', null,
  'F3', null, 'G3', null, 'C3', null, 'G3', null,
];

const LUNAR_MELODY = [
  'A4', 'C5', 'E5', null, 'B4', 'D5', 'G5', null,
  'E5', null, 'D5', 'C5', 'B4', null, 'G4', null,
  'A4', 'C5', 'E5', 'A5', 'G5', null, 'E5', 'D5',
  'C5', null, 'B4', 'A4', 'E5', null, null, null,
];

const LUNAR_BASS = [
  'A3', null, 'E3', null, 'G3', null, 'D3', null,
  'F3', null, 'C3', null, 'E3', null, 'B3', null,
  'A3', null, 'E3', null, 'G3', null, 'D3', null,
  'F3', null, 'G3', null, 'A3', null, 'E3', null,
];

const BOSS_MELODY = [
  'E5', 'Eb5', 'E5', 'G5', 'E5', null, 'D5', 'C5',
  'B4', 'E5', 'G5', 'A5', 'G5', 'Fs4', 'E5', null,
  'A5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5', 'G5',
  'B5', null, 'A5', 'G5', 'E5', null, 'B4', null,
];

const BOSS_BASS = [
  'E3', 'E3', 'G3', 'E3', 'A3', 'E3', 'G3', 'Fs4',
  'E3', 'E3', 'B3', 'A3', 'G3', 'E3', 'D3', 'B3',
  'C3', 'C3', 'G3', 'C3', 'D3', 'D3', 'A3', 'D3',
  'E3', 'G3', 'A3', 'B3', 'E3', null, 'B3', null,
];

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.bgmMode = 'solar'; // 'solar' | 'lunar' | 'boss' | 'off'
    this.step = 0;
    this.stepTimer = 0;
    this.unlocked = false;
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.28;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.unlocked = true;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.28, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  setBgmMode(mode) {
    this.bgmMode = mode;
  }

  update(dt) {
    if (!this.unlocked || !this.ctx || this.muted || this.bgmMode === 'off') return;
    if (this.ctx.state !== 'running') return;

    const stepDuration = this.bgmMode === 'boss' ? 0.125 : 0.16;
    this.stepTimer += dt;
    if (this.stepTimer >= stepDuration) {
      this.stepTimer -= stepDuration;
      this._playBgmStep();
      this.step = (this.step + 1) % 32;
    }
  }

  _playBgmStep() {
    const isBoss = this.bgmMode === 'boss';
    const isLunar = this.bgmMode === 'lunar';
    const mel = isBoss ? BOSS_MELODY : isLunar ? LUNAR_MELODY : SOLAR_MELODY;
    const bas = isBoss ? BOSS_BASS : isLunar ? LUNAR_BASS : SOLAR_BASS;

    const mNote = mel[this.step];
    const bNote = bas[this.step];

    if (mNote && NOTE_FREQ[mNote]) {
      this._tone({
        freq: NOTE_FREQ[mNote],
        type: isLunar ? 'triangle' : isBoss ? 'sawtooth' : 'square',
        dur: isLunar ? 0.22 : 0.13,
        vol: isLunar ? 0.075 : 0.045,
        attack: 0.008,
      });
    }
    if (bNote && NOTE_FREQ[bNote]) {
      this._tone({
        freq: NOTE_FREQ[bNote],
        type: 'triangle',
        dur: 0.16,
        vol: isBoss ? 0.095 : 0.08,
        attack: 0.005,
      });
    }
    // Soft hi-hat / pulse percussion
    if (this.step % 2 === 1 && (isBoss || this.step % 4 === 3)) {
      this._noise(0.03, isBoss ? 0.032 : 0.014, 5200);
    }
  }

  _tone({ freq, freqEnd = null, type = 'square', dur = 0.12, vol = 0.16, attack = 0.005, delay = 0 }) {
    if (!this.ctx || !this.master || this.muted) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + dur);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  _noise(dur = 0.08, vol = 0.12, filterFreq = 1800) {
    if (!this.ctx || !this.master || this.muted) return;
    const now = this.ctx.currentTime;
    const sampleCount = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(now);
  }

  playJump(isLunar = false) {
    this._tone({ freq: isLunar ? 240 : 210, freqEnd: isLunar ? 620 : 520, type: 'square', dur: 0.13, vol: 0.13 });
  }

  playWallJump() {
    this._tone({ freq: 290, freqEnd: 690, type: 'triangle', dur: 0.11, vol: 0.16 });
  }

  playDash(isLunar = false) {
    this._noise(0.11, 0.15, isLunar ? 2800 : 1600);
    this._tone({ freq: isLunar ? 640 : 480, freqEnd: 150, type: 'sawtooth', dur: 0.12, vol: 0.12 });
  }

  playPhaseShift(toLunar) {
    const start = toLunar ? 580 : 320;
    const end = toLunar ? 310 : 660;
    this._tone({ freq: start, freqEnd: end, type: 'sine', dur: 0.17, vol: 0.18 });
    this._tone({ freq: start * 1.5, freqEnd: end * 1.5, type: 'triangle', dur: 0.15, vol: 0.1, delay: 0.02 });
  }

  playCoin(combo = 1) {
    const mult = Math.min(1.65, 1 + (combo - 1) * 0.08);
    this._tone({ freq: 988 * mult, type: 'square', dur: 0.07, vol: 0.11 });
    this._tone({ freq: 1318 * mult, type: 'square', dur: 0.14, vol: 0.11, delay: 0.055 });
  }

  playStomp(combo = 1) {
    const pitch = Math.min(2.0, 1 + (combo - 1) * 0.15);
    this._tone({ freq: 240 * pitch, freqEnd: 520 * pitch, type: 'square', dur: 0.11, vol: 0.16 });
    this._noise(0.05, 0.09, 1200);
  }

  playShellKick() {
    this._tone({ freq: 180, freqEnd: 460, type: 'sawtooth', dur: 0.09, vol: 0.16 });
    this._noise(0.06, 0.12, 900);
  }

  playBlockBump() {
    this._tone({ freq: 170, freqEnd: 95, type: 'triangle', dur: 0.09, vol: 0.18 });
  }

  playShatter() {
    this._noise(0.16, 0.19, 1400);
    this._tone({ freq: 220, freqEnd: 65, type: 'sawtooth', dur: 0.14, vol: 0.14 });
  }

  playSpring() {
    this._tone({ freq: 200, freqEnd: 780, type: 'sine', dur: 0.22, vol: 0.18 });
    this._tone({ freq: 300, freqEnd: 980, type: 'triangle', dur: 0.18, vol: 0.1, delay: 0.03 });
  }

  playGroundPound() {
    this._noise(0.18, 0.22, 420);
    this._tone({ freq: 140, freqEnd: 38, type: 'sawtooth', dur: 0.22, vol: 0.2 });
  }

  playDashCrystal() {
    this._tone({ freq: 660, freqEnd: 1180, type: 'triangle', dur: 0.12, vol: 0.15 });
    this._tone({ freq: 990, freqEnd: 1560, type: 'sine', dur: 0.14, vol: 0.12, delay: 0.04 });
  }

  playCheckpoint() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this._tone({ freq: n, type: 'triangle', dur: 0.18, vol: 0.14, delay: i * 0.065 });
    });
  }

  playPowerup() {
    const notes = [392, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this._tone({ freq: n, type: 'square', dur: 0.11, vol: 0.12, delay: i * 0.05 });
    });
  }

  playHurt() {
    this._tone({ freq: 310, freqEnd: 90, type: 'sawtooth', dur: 0.24, vol: 0.18 });
    this._noise(0.15, 0.16, 700);
  }

  playBossHit() {
    this._noise(0.22, 0.22, 650);
    this._tone({ freq: 420, freqEnd: 110, type: 'sawtooth', dur: 0.26, vol: 0.2 });
    this._tone({ freq: 620, freqEnd: 880, type: 'square', dur: 0.14, vol: 0.12, delay: 0.08 });
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const delays = [0, 0.1, 0.2, 0.32, 0.48, 0.6];
    notes.forEach((n, i) => {
      this._tone({ freq: n, type: 'square', dur: i === notes.length - 1 ? 0.45 : 0.14, vol: 0.14, delay: delays[i] });
    });
  }
}
