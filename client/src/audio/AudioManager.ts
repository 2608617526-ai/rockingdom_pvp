import { AUDIO_ASSETS, type BgmKey, type SfxKey } from './sounds';

/**
 * 统一音频管理。所有音频缺失时静默降级，绝不抛错、绝不阻断游戏流程。
 */
class AudioManager {
  private cache = new Map<string, HTMLAudioElement>();
  private bgm: HTMLAudioElement | null = null;
  private bgmKey: BgmKey | null = null;
  private masterVolume = 0.7;
  private muted = false;

  playSFX(key: SfxKey): void {
    const audio = this.load(AUDIO_ASSETS[key]);
    if (!audio) return;
    audio.volume = this.muted ? 0 : this.masterVolume;
    audio.currentTime = 0;
    audio.play().catch(() => {
      /* 资源缺失或自动播放受限时静默失败 */
    });
  }

  playBGM(key: BgmKey): void {
    if (this.bgmKey === key && this.bgm) {
      this.bgm.volume = this.muted ? 0 : this.masterVolume;
      this.bgm.play().catch(() => {});
      return;
    }
    this.stopBGM();
    const audio = this.load(AUDIO_ASSETS[key]);
    this.bgmKey = key;
    if (!audio) return;
    audio.loop = true;
    audio.volume = this.muted ? 0 : this.masterVolume;
    this.bgm = audio;
    audio.play().catch(() => {});
  }

  stopBGM(): void {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.currentTime = 0;
      this.bgm = null;
    }
    this.bgmKey = null;
  }

  setVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.bgm) this.bgm.volume = this.muted ? 0 : this.masterVolume;
  }

  mute(): void {
    this.muted = true;
    if (this.bgm) this.bgm.volume = 0;
  }

  unmute(): void {
    this.muted = false;
    if (this.bgm) this.bgm.volume = this.masterVolume;
  }

  toggleMute(): boolean {
    if (this.muted) this.unmute();
    else this.mute();
    return this.muted;
  }

  private load(src: string): HTMLAudioElement | null {
    const cached = this.cache.get(src);
    if (cached) return cached;
    try {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = src;
      audio.addEventListener('error', () => {
        // 非阻塞告警：音频文件缺失不影响游戏
        console.warn(`[audio] 音频资源不存在，已跳过: ${src}`);
      });
      this.cache.set(src, audio);
      return audio;
    } catch (e) {
      console.warn(`[audio] 音频加载失败: ${src}`, e);
      return null;
    }
  }
}

export const audioManager = new AudioManager();
