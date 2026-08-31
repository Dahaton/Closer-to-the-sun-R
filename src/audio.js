import { state } from './state.js';

class AudioManager {
  constructor() {
    this.soundPath = "./assets/sounds/";
    this.audioCache = new Map();
    this.channels = new Map();
  }

  getAudioInstance(filename) {
    const encodedFilename = encodeURIComponent(filename).replace(/%2F/g, '/');
    const fullPath = this.soundPath + encodedFilename;
    return new Audio(fullPath);
  }

  playSound(filename, volume = 50, pitch = 1.0) {
    const globalVol = (state.soundVolume !== undefined ? state.soundVolume : 0) / 100;
    if (globalVol <= 0.0001) return;
    const sound = this.getAudioInstance(filename);
    const finalVol = Math.max(0, Math.min(1, (volume / 100) * globalVol));
    sound.volume = finalVol;
    sound.playbackRate = pitch;
    sound.play().catch(() => {});
  }

  playMusicOnChannel(filename, channel = 1, loop = true, volume = 50) {
    this.stopChannel(channel);

    const globalVol = (state.musicVolume !== undefined ? state.musicVolume : 0) / 100;
    const music = this.getAudioInstance(filename);
    music.loop = loop;
    
    const baseVol = Math.max(0, Math.min(1, volume / 100));
    music.volume = baseVol * globalVol;

    this.channels.set(channel, {
      audio: music,
      baseVolume: baseVol,
      fadeInterval: null
    });

    music.play().catch(() => {});
  }

  updateVolumes() {
    const globalMusicVol = (state.musicVolume !== undefined ? state.musicVolume : 0) / 100;
    this.channels.forEach((ch) => {
      if (ch.audio && !ch.fadeInterval) {
        ch.audio.volume = Math.max(0, Math.min(1, ch.baseVolume * globalMusicVol));
      }
    });
  }

  fadeMusicVolume(channel, targetVolume = 0, durationSec = 1.0) {
    const ch = this.channels.get(channel);
    if (!ch || !ch.audio) return;

    if (ch.fadeInterval) {
      clearInterval(ch.fadeInterval);
    }

    const globalMusicVol = (state.musicVolume !== undefined ? state.musicVolume : 0) / 100;
    const startVolume = ch.audio.volume;
    const endVolume = Math.max(0, Math.min(1, (targetVolume / 100) * globalMusicVol));
    const steps = 30;
    const intervalTime = (durationSec * 1000) / steps;
    let step = 0;

    ch.fadeInterval = setInterval(() => {
      step++;
      const currentVol = startVolume + (endVolume - startVolume) * (step / steps);
      ch.audio.volume = Math.max(0, Math.min(1, currentVol));

      if (step >= steps) {
        clearInterval(ch.fadeInterval);
        ch.fadeInterval = null;
        if (endVolume === 0) {
          ch.audio.pause();
        }
      }
    }, intervalTime);
  }

  stopChannel(channel) {
    const ch = this.channels.get(channel);
    if (ch) {
      if (ch.fadeInterval) clearInterval(ch.fadeInterval);
      if (ch.audio) {
        ch.audio.pause();
        ch.audio.currentTime = 0;
      }
      this.channels.delete(channel);
    }
  }

  stopAll() {
    for (const channelKey of this.channels.keys()) {
      this.stopChannel(channelKey);
    }
  }
}

export const audio = new AudioManager();