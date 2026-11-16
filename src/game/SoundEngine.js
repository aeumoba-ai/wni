class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
  }

  ensureContext() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(mute) {
    this.muted = !!mute;
    if (this.muted) {
      this.stopBgm();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopBgm();
    }
    return this.muted;
  }

  playTone(freq, duration = 0.14, type = 'triangle', gainPeak = 0.12, delay = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playClick() {
    this.playTone(540, 0.06, 'sine', 0.08);
  }

  playDice() {
    const freqs = [240, 320, 280, 410, 350, 520];
    freqs.forEach((f, idx) => {
      this.playTone(f + Math.random() * 50, 0.055, 'square', 0.045, idx * 0.075);
    });
  }

  playHop(stepIdx = 0) {
    const scale = [392, 440, 494, 523, 587, 659, 784];
    const freq = scale[stepIdx % scale.length];
    this.playTone(freq, 0.09, 'triangle', 0.09);
  }

  playBuy() {
    this.playTone(523.25, 0.12, 'triangle', 0.12, 0);
    this.playTone(659.25, 0.12, 'triangle', 0.12, 0.08);
    this.playTone(783.99, 0.22, 'triangle', 0.14, 0.16);
  }

  playUpgrade() {
    [440, 554, 659, 880].forEach((f, i) => {
      this.playTone(f, 0.13, 'triangle', 0.11, i * 0.07);
    });
  }

  playCash() {
    this.playTone(987.77, 0.09, 'sine', 0.11, 0);
    this.playTone(1318.5, 0.2, 'sine', 0.12, 0.08);
  }

  playPay() {
    this.playTone(420, 0.1, 'triangle', 0.09, 0);
    this.playTone(330, 0.16, 'triangle', 0.09, 0.09);
  }

  playOuch() {
    this.playTone(349, 0.14, 'sawtooth', 0.06, 0);
    this.playTone(311, 0.16, 'sawtooth', 0.06, 0.13);
    this.playTone(261, 0.28, 'sawtooth', 0.07, 0.27);
  }

  playBankrupt() {
    [330, 293, 261, 196].forEach((f, i) => {
      this.playTone(f, 0.22, 'sawtooth', 0.07, i * 0.17);
    });
  }

  playSiren() {
    this.playTone(680, 0.18, 'sawtooth', 0.06, 0);
    this.playTone(920, 0.18, 'sawtooth', 0.06, 0.18);
    this.playTone(680, 0.18, 'sawtooth', 0.06, 0.36);
    this.playTone(920, 0.22, 'sawtooth', 0.06, 0.54);
  }

  playCard() {
    this.playTone(480, 0.07, 'sine', 0.08, 0);
    this.playTone(720, 0.12, 'triangle', 0.1, 0.06);
  }

  playJackpot() {
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => {
      this.playTone(f, 0.15, 'triangle', 0.12, i * 0.085);
    });
  }

  playTurnChime() {
    this.playTone(587.33, 0.1, 'sine', 0.09, 0);
    this.playTone(880, 0.18, 'sine', 0.1, 0.1);
  }

  playByName(name) {
    switch (name) {
      case 'buy':
        this.playBuy();
        break;
      case 'upgrade':
        this.playUpgrade();
        break;
      case 'cash':
        this.playCash();
        break;
      case 'pay':
        this.playPay();
        break;
      case 'ouch':
        this.playOuch();
        break;
      case 'bankrupt':
        this.playBankrupt();
        break;
      case 'siren':
        this.playSiren();
        break;
      case 'card':
        this.playCard();
        break;
      case 'jackpot':
        this.playJackpot();
        break;
      default:
        this.playClick();
    }
  }

  startBgm() {
    if (this.muted || this.bgmPlaying) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.bgmPlaying = true;
    // Playful Indonesian pentatonic/pelog-inspired cheerful marimba loop
    const melody = [523, 587, 659, 784, 659, 587, 523, 0, 587, 659, 784, 880, 784, 659, 587, 0];
    const bass = [261, 0, 196, 0, 220, 0, 196, 0, 261, 0, 220, 0, 196, 0, 196, 0];
    this.bgmTimer = setInterval(() => {
      if (this.muted || !this.bgmPlaying) return;
      const idx = this.bgmStep % melody.length;
      this.bgmStep++;
      if (melody[idx]) this.playTone(melody[idx], 0.2, 'sine', 0.025);
      if (bass[idx]) this.playTone(bass[idx], 0.26, 'triangle', 0.022);
    }, 340);
  }

  stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  toggleBgm() {
    if (this.bgmPlaying) {
      this.stopBgm();
      return false;
    } else {
      this.muted = false;
      this.startBgm();
      return true;
    }
  }
}

export const soundEngine = new SoundEngine();
