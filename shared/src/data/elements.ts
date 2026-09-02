import type { ElementType } from '../types';

/**
 * 属性克制关系（单向克制，倍率 2.0 / 1.0）
 *
 *   火 → 草
 *   草 → 水
 *   水 → 火
 */
export const TYPE_CHART: Record<ElementType, Partial<Record<ElementType, number>>> = {
  FIRE: { GRASS: 2.0 },
  GRASS: { WATER: 2.0 },
  WATER: { FIRE: 2.0 },
};

export function getTypeMultiplier(
  attack: ElementType | undefined,
  defender: ElementType,
): number {
  if (!attack) return 1.0;
  return TYPE_CHART[attack]?.[defender] ?? 1.0;
}

export const ELEMENT_NAMES: Record<ElementType, string> = {
  FIRE: '火',
  WATER: '水',
  GRASS: '草',
};
