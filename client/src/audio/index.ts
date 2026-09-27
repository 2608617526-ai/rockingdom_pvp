import { audioManager } from './AudioManager';
import type { BgmKey, SfxKey } from './sounds';

export { audioManager } from './AudioManager';
export { BGM_ASSETS, SFX_ASSETS } from './sounds';
export type { BgmKey, SfxKey } from './sounds';

export const playSFX = (key: SfxKey): void => audioManager.playSFX(key);
export const playBGM = (key: BgmKey): void => audioManager.playBGM(key);
export const stopBGM = (): void => audioManager.stopBGM();
export const setVolume = (v: number): void => audioManager.setVolume(v);
export const mute = (): void => audioManager.mute();
export const unmute = (): void => audioManager.unmute();
export const toggleMute = (): boolean => audioManager.toggleMute();
