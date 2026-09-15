// Musik-Playlist + Soundeffekte. Kapselt alles Audio-bezogene, damit Engine
// und UI nichts von <audio>-Details wissen müssen.

const MUSIC_TRACKS = [
  'assets/audio/music-hoernern-1.mp3',
  'assets/audio/music-hoernern-2.mp3',
  'assets/audio/music-hoernern-3.mp3',
  'assets/audio/music-watten-night.mp3',
];

const SFX = {
  deal: 'assets/audio/sfx-deal-card.mp3',
};

const STORAGE_KEY = 'watten-audio-settings';

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export class AudioManager {
  constructor() {
    const saved = loadSettings() || {};
    this.enabled = saved.enabled !== undefined ? saved.enabled : true;
    this.volume = saved.volume !== undefined ? saved.volume : 0.3;
    this.trackIndex = 0;
    this.unlocked = false;

    this.musicEl = new Audio();
    this.musicEl.volume = this.volume;
    this.musicEl.addEventListener('ended', () => this.playNextTrack());

    this.sfxEls = {};
    for (const [name, src] of Object.entries(SFX)) {
      const el = new Audio(src);
      el.preload = 'auto';
      this.sfxEls[name] = el;
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: this.enabled, volume: this.volume }));
    } catch {
      // localStorage kann in seltenen Fällen nicht verfügbar sein - egal, dann eben nicht persistiert.
    }
  }

  /** Muss auf eine echte Nutzer-Interaktion folgen (Browser-Autoplay-Regeln). */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.enabled) this.startMusic();
  }

  startMusic() {
    if (!this.unlocked) return;
    this.musicEl.src = MUSIC_TRACKS[this.trackIndex];
    this.musicEl.volume = this.volume;
    if (this.enabled) {
      this.musicEl.play().catch(() => {});
    }
  }

  playNextTrack() {
    this.trackIndex = (this.trackIndex + 1) % MUSIC_TRACKS.length;
    this.startMusic();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.saveSettings();
    if (enabled) {
      if (!this.musicEl.src) this.startMusic();
      else this.musicEl.play().catch(() => {});
    } else {
      this.musicEl.pause();
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.musicEl.volume = this.volume;
    this.saveSettings();
  }

  playSfx(name) {
    const el = this.sfxEls[name];
    if (!el || !this.unlocked) return;
    try {
      // Eigene Instanz pro Aufruf: der Deal-Sound ist länger als der Abstand
      // zwischen zwei Karten, ein wiederverwendetes <audio> würde sich beim
      // schnellen Austeilen ständig selbst unterbrechen (nie hörbar werden).
      const instance = el.cloneNode(true);
      instance.volume = this.volume;
      instance.play().catch(() => {});
    } catch {
      // Absichtlich still - ein fehlender/blockierter Soundeffekt darf das Spiel nie stoppen.
    }
  }
}

export const audioManager = new AudioManager();
