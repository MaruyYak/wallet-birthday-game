import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SoundService {
  private sounds: { [key: string]: HTMLAudioElement } = {};
  private isBrowser = typeof window !== 'undefined';

  constructor() {}

  public loadAllSounds() {
    if (!this.isBrowser) return;

    this.loadSound('bowlShake', 'assets/sounds/bowl-shake.mp3');
    this.loadSound('cakeAppear', 'assets/sounds/happy-birthday.mp3');
    this.loadSound('playerJump', 'assets/sounds/player-jump.mp3');
    this.loadSound('ingredientCollect', 'assets/sounds/ingredient-collect.mp3');
    this.loadSound('collision', 'assets/sounds/collision.mp3');
    this.loadSound('candleBlow', 'assets/sounds/candle-blow.mp3');
    this.loadSound('ingFalling', 'assets/sounds/falling.mp3');
  }

  private loadSound(name: string, path: string) {
    if (!this.isBrowser) return;

    const audio = new Audio(path);
    audio.load();
    this.sounds[name] = audio;
  }

  public play(name: string, volume: number = 1) {
    if (!this.isBrowser) return;

    const audio = this.sounds[name];
    if (audio) {
      audio.currentTime = 0;
      audio.volume = volume;
      audio.play().catch(err => console.warn(`Ошибка воспроизведения звука ${name}:`, err));
    }
  }

    stop(name: string) {
    const audio = this.sounds[name];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }
}
