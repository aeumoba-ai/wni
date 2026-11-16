const AUDIO_STORAGE_KEY = 'monopoli_konoha_audio_v1';

export const DEFAULT_AUDIO_SETTINGS = {
  master: 85,   // 0..100
  music: 65,    // 0..100 (Musik Latar / BGM)
  ui: 80,       // 0..100 (Suara Klik & UI)
  sfx: 90,      // 0..100 (Efek Permainan: dadu, beli, sirine, jackpot)
  muted: false,
  bgmOn: false,
};

function clampPct(v, fallback = 80) {
  const n = Number(v);
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.bgmTimer = null;
    this.bgmStep = 0;

    const saved = this.loadSettings();
    this.volumes = {
      master: saved.master,
      music: saved.music,
      ui: saved.ui,
      sfx: saved.sfx,
    };
    this.muted = saved.muted;
    this.bgmPlaying = false;
    this.bgmWantOn = saved.bgmOn;
  }

  loadSettings() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return { ...DEFAULT_AUDIO_SETTINGS };
      }
      const raw = window.localStorage.getItem(AUDIO_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
      const parsed = JSON.parse(raw);
      return {
        master: clampPct(parsed.master, DEFAULT_AUDIO_SETTINGS.master),
        music: clampPct(parsed.music, DEFAULT_AUDIO_SETTINGS.music),
        ui: clampPct(parsed.ui, DEFAULT_AUDIO_SETTINGS.ui),
        sfx: clampPct(parsed.sfx, DEFAULT_AUDIO_SETTINGS.sfx),
        muted: Boolean(parsed.muted),
        bgmOn: Boolean(parsed.bgmOn),
      };
    } catch {
      return { ...DEFAULT_AUDIO_SETTINGS };
    }
  }

  saveSettings() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(
        AUDIO_STORAGE_KEY,
        JSON.stringify({
          ...this.volumes,
          muted: this.muted,
          bgmOn: this.bgmPlaying,
        })
      );
    } catch {
      // Ignore storage quota / private mode errors
    }
  }

  getSettings() {
    return {
      master: this.volumes.master,
      music: this.volumes.music,
      ui: this.volumes.ui,
      sfx: this.volumes.sfx,
      muted: this.muted,
      bgmOn: this.bgmPlaying,
    };
  }

  setVolume(channel, percent) {
    if (!(channel in this.volumes)) return this.getSettings();
    this.volumes[channel] = clampPct(percent, this.volumes[channel]);
    if (channel === 'master' && this.volumes.master > 0 && this.muted) {
      this.muted = false;
    }
    if (channel === 'music') {
      if (this.volumes.music === 0 && this.bgmPlaying) {
        this.stopBgm(false);
      } else if (this.volumes.music > 0 && this.bgmWantOn && !this.bgmPlaying && !this.muted) {
        this.startBgm();
      }
    }
    this.saveSettings();
    return this.getSettings();
  }

  applySettings(next) {
    if (next.master !== undefined) this.volumes.master = clampPct(next.master, this.volumes.master);
    if (next.music !== undefined) this.volumes.music = clampPct(next.music, this.volumes.music);
    if (next.ui !== undefined) this.volumes.ui = clampPct(next.ui, this.volumes.ui);
    if (next.sfx !== undefined) this.volumes.sfx = clampPct(next.sfx, this.volumes.sfx);
    if (next.muted !== undefined) {
      this.muted = Boolean(next.muted);
      if (this.muted) this.stopBgm(false);
    }
    if (next.bgmOn !== undefined) {
      this.bgmWantOn = Boolean(next.bgmOn);
      if (this.bgmWantOn && !this.muted && this.volumes.music > 0 && this.volumes.master > 0) {
        this.startBgm();
      } else if (!this.bgmWantOn) {
        this.stopBgm(true);
      }
    }
    this.saveSettings();
    return this.getSettings();
  }

  resetSettings() {
    this.volumes = {
      master: DEFAULT_AUDIO_SETTINGS.master,
      music: DEFAULT_AUDIO_SETTINGS.music,
      ui: DEFAULT_AUDIO_SETTINGS.ui,
      sfx: DEFAULT_AUDIO_SETTINGS.sfx,
    };
    this.muted = false;
    this.saveSettings();
    return this.getSettings();
  }

  effectiveGain(channel, baseGain) {
    if (this.muted) return 0;
    const masterScale = this.volumes.master / 100;
    const chanScale = (this.volumes[channel] ?? 100) / 100;
    return baseGain * masterScale * chanScale;
  }

  ensureContext() {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
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
      this.stopBgm(false);
    } else if (this.bgmWantOn && this.volumes.music > 0 && this.volumes.master > 0) {
      this.startBgm();
    }
    this.saveSettings();
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  playTone(freq, duration = 0.14, type = 'triangle', gainPeak = 0.12, delay = 0, channel = 'sfx') {
    const scaledPeak = this.effectiveGain(channel, gainPeak);
    if (scaledPeak <= 0.0005) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(scaledPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // === UI & CLICK CHANNEL ===
  playClick() {
    this.playTone(580, 0.055, 'sine', 0.09, 0, 'ui');
  }

  playTurnChime() {
    this.playTone(587.33, 0.1, 'sine', 0.09, 0, 'ui');
    this.playTone(880, 0.18, 'sine', 0.1, 0.1, 'ui');
  }

  // === GAME SFX CHANNEL ===
  playDice() {
    const freqs = [240, 320, 280, 410, 350, 520];
    freqs.forEach((f, idx) => {
      this.playTone(f + Math.random() * 50, 0.055, 'square', 0.05, idx * 0.075, 'sfx');
    });
  }

  playHop(stepIdx = 0) {
    const scale = [392, 440, 494, 523, 587, 659, 784];
    const freq = scale[stepIdx % scale.length];
    this.playTone(freq, 0.09, 'triangle', 0.095, 0, 'sfx');
  }

  playBuy() {
    this.playTone(523.25, 0.12, 'triangle', 0.12, 0, 'sfx');
    this.playTone(659.25, 0.12, 'triangle', 0.12, 0.08, 'sfx');
    this.playTone(783.99, 0.22, 'triangle', 0.14, 0.16, 'sfx');
  }

  playUpgrade() {
    [440, 554, 659, 880].forEach((f, i) => {
      this.playTone(f, 0.13, 'triangle', 0.11, i * 0.07, 'sfx');
    });
  }

  playCash() {
    this.playTone(987.77, 0.09, 'sine', 0.11, 0, 'sfx');
    this.playTone(1318.5, 0.2, 'sine', 0.12, 0.08, 'sfx');
  }

  playPay() {
    this.playTone(420, 0.1, 'triangle', 0.09, 0, 'sfx');
    this.playTone(330, 0.16, 'triangle', 0.09, 0.09, 'sfx');
  }

  playOuch() {
    this.playTone(349, 0.14, 'sawtooth', 0.065, 0, 'sfx');
    this.playTone(311, 0.16, 'sawtooth', 0.065, 0.13, 'sfx');
    this.playTone(261, 0.28, 'sawtooth', 0.075, 0.27, 'sfx');
  }

  playBankrupt() {
    [330, 293, 261, 196].forEach((f, i) => {
      this.playTone(f, 0.22, 'sawtooth', 0.075, i * 0.17, 'sfx');
    });
  }

  playSiren() {
    this.playTone(680, 0.18, 'sawtooth', 0.065, 0, 'sfx');
    this.playTone(920, 0.18, 'sawtooth', 0.065, 0.18, 'sfx');
    this.playTone(680, 0.18, 'sawtooth', 0.065, 0.36, 'sfx');
    this.playTone(920, 0.22, 'sawtooth', 0.065, 0.54, 'sfx');
  }

  playCard() {
    this.playTone(480, 0.07, 'sine', 0.085, 0, 'sfx');
    this.playTone(720, 0.12, 'triangle', 0.105, 0.06, 'sfx');
  }

  playJackpot() {
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => {
      this.playTone(f, 0.15, 'triangle', 0.125, i * 0.085, 'sfx');
    });
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

  // === MUSIC / BGM CHANNEL ===
  startBgm() {
    if (this.muted || this.bgmPlaying) return;
    if (this.volumes.music <= 0 || this.volumes.master <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.bgmPlaying = true;
    this.bgmWantOn = true;
    // Playful Indonesian pentatonic/pelog-inspired cheerful marimba loop
    const melody = [523, 587, 659, 784, 659, 587, 523, 0, 587, 659, 784, 880, 784, 659, 587, 0];
    const bass = [261, 0, 196, 0, 220, 0, 196, 0, 261, 0, 220, 0, 196, 0, 196, 0];
    this.bgmTimer = setInterval(() => {
      if (this.muted || !this.bgmPlaying) return;
      const idx = this.bgmStep % melody.length;
      this.bgmStep++;
      if (melody[idx]) this.playTone(melody[idx], 0.2, 'sine', 0.042, 0, 'music');
      if (bass[idx]) this.playTone(bass[idx], 0.26, 'triangle', 0.036, 0, 'music');
    }, 340);
    this.saveSettings();
  }

  stopBgm(clearIntent = true) {
    this.bgmPlaying = false;
    if (clearIntent) this.bgmWantOn = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.saveSettings();
  }

  toggleBgm() {
    if (this.bgmPlaying) {
      this.stopBgm(true);
      return false;
    }
    this.muted = false;
    if (this.volumes.music === 0) this.volumes.music = DEFAULT_AUDIO_SETTINGS.music;
    if (this.volumes.master === 0) this.volumes.master = DEFAULT_AUDIO_SETTINGS.master;
    this.startBgm();
    return this.bgmPlaying;
  }
}

export const soundEngine = new SoundEngine();
