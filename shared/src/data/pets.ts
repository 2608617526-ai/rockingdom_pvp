import type { PetDefinition } from '../types';

/**
 * 三只固定宠物。
 *
 * 说明：烈火战神(火)、圣水守护(水)、武斗酷猫(草)。
 */
export const PET_DEFINITIONS: Record<string, PetDefinition> = {
  fire: {
    id: 'fire',
    name: '烈火战神',
    element: 'FIRE',
    baseStats: {
      maxHp: 400,
      physicalAttack: 173,
      physicalDefense: 100,
      magicAttack: 0,
      magicDefense: 100,
      speed: 130,
    },
    initialEnergy: 10,
    maxEnergy: 10,
    passiveName: '烈火之怒',
    passiveDescription: '每成功使用一次技能，物理攻击提升 30%（基于基础值，持续整场战斗）。',
    skillIds: ['fire_blow', 'fire_cart', 'fire_shield', 'mountain_fire', 'charge'],
  },
  water: {
    id: 'water',
    name: '圣水守护',
    element: 'WATER',
    baseStats: {
      maxHp: 600,
      physicalAttack: 0,
      physicalDefense: 150,
      magicAttack: 130,
      magicDefense: 150,
      speed: 65,
    },
    initialEnergy: 10,
    maxEnergy: 10,
    passiveName: '圣水流转',
    passiveDescription: '每成功使用一次技能，下一次使用技能的能量消耗降低 2。',
    skillIds: ['moisture', 'bubble_shield', 'deluge', 'bubble', 'charge'],
  },
  grass: {
    id: 'grass',
    name: '武斗酷猫',
    element: 'GRASS',
    baseStats: {
      maxHp: 500,
      physicalAttack: 150,
      physicalDefense: 120,
      magicAttack: 0,
      magicDefense: 120,
      speed: 135,
    },
    initialEnergy: 10,
    maxEnergy: 10,
    passiveName: '光合蓄力',
    passiveDescription: '每回复一次能量，下一次攻击技能伤害提升 20%（可叠加）。',
    skillIds: ['sieve_flow', 'enzyme', 'cactus', 'photosynthesis', 'charge'],
  },
};

export const PET_LIST: PetDefinition[] = [
  PET_DEFINITIONS.fire,
  PET_DEFINITIONS.water,
  PET_DEFINITIONS.grass,
];
