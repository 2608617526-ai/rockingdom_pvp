import type { ElementType, PetId } from '@rockingdom/shared';

/** 元素主题色 */
export const ELEMENT_COLORS: Record<
  ElementType,
  { primary: string; secondary: string; glow: string }
> = {
  FIRE: { primary: '#ff5722', secondary: '#ffb300', glow: '#ff6d00' },
  WATER: { primary: '#2196f3', secondary: '#00e5ff', glow: '#2979ff' },
  GRASS: { primary: '#43a047', secondary: '#aeea00', glow: '#76ff03' },
};

export const ELEMENT_LABELS: Record<ElementType, string> = {
  FIRE: '火',
  WATER: '水',
  GRASS: '草',
};

/** 宠物视觉配置（用于占位立绘 / 卡片配色） */
export const PET_VISUALS: Record<
  PetId,
  { gradient: string; symbol: string; color: string }
> = {
  fire: {
    gradient: 'linear-gradient(160deg, #ff6d00, #b71c1c)',
    symbol: '🔥',
    color: '#ff6d00',
  },
  water: {
    gradient: 'linear-gradient(160deg, #00b0ff, #0d47a1)',
    symbol: '💧',
    color: '#00b0ff',
  },
  grass: {
    gradient: 'linear-gradient(160deg, #76ff03, #1b5e20)',
    symbol: '🍃',
    color: '#76ff03',
  },
};
