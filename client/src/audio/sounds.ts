/**
 * 音频资源配置表。
 * 把音频文件放入 client/public/assets/audio/ 对应目录即可自动生效，
 * 文件名与这里保持一致（或自行修改这里的路径）。
 */
export const AUDIO_ASSETS = {
  // 背景音乐
  lobby: '/assets/audio/bgm/lobby.mp3',
  battle: '/assets/audio/bgm/battle.mp3',
  // 音效
  click: '/assets/audio/sfx/click.mp3',
  match: '/assets/audio/sfx/match.mp3',
  attack: '/assets/audio/sfx/attack.mp3',
  hit: '/assets/audio/sfx/hit.mp3',
  defense: '/assets/audio/sfx/defense.mp3',
  switch: '/assets/audio/sfx/switch.mp3',
  energy: '/assets/audio/sfx/energy.mp3',
  heal: '/assets/audio/sfx/heal.mp3',
  victory: '/assets/audio/sfx/victory.mp3',
  defeat: '/assets/audio/sfx/defeat.mp3',
} as const;

export type SfxKey = keyof typeof AUDIO_ASSETS;
export type BgmKey = 'lobby' | 'battle';
