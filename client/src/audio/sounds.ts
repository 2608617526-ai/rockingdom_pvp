/**
 * 音频资源配置表。
 * 把音频文件放入 client/public/assets/audio/ 对应目录即可自动生效，
 * 文件名与这里保持一致（或自行修改这里的路径）。
 */
export const BGM_ASSETS = {
  auth: '/assets/audio/bgm/auth.mp3', // 欢迎 / 注册 / 登录
  match: '/assets/audio/bgm/match.mp3', // 匹配 / 选首发
  battle: '/assets/audio/bgm/battle.mp3', // 战斗
  victory: '/assets/audio/bgm/victory.mp3', // 结算 / 胜利
} as const;

export const SFX_ASSETS = {
  hover: '/assets/audio/sfx/hover.mp3', // 鼠标悬停按钮/卡片
  click: '/assets/audio/sfx/click.mp3', // 通用点击 / 确认
  back: '/assets/audio/sfx/back.mp3', // 返回 / 取消 / 关闭
  danger: '/assets/audio/sfx/danger.mp3', // 认输 / 退出登录
  open: '/assets/audio/sfx/open.mp3', // 打开面板 / 弹窗
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

export type BgmKey = keyof typeof BGM_ASSETS;
export type SfxKey = keyof typeof SFX_ASSETS;
