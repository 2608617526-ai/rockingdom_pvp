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
    passiveName: '炽热战意',
    passiveDescription: '每次使用技能后，物理攻击力提高 30%。',
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
    passiveName: '节能施法',
    passiveDescription: '每次使用技能后，下一次技能的能量消耗降低 2 点，最低不会低于 0。',
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
    passiveName: '自然之力',
    passiveDescription: '每次恢复 1 点能量后，下一次攻击技能伤害提高 20%。如果下一回合没有使用攻击技能，效果不会消失。',
    skillIds: ['sieve_flow', 'enzyme', 'cactus', 'photosynthesis', 'charge'],
  },
};

export const PET_LIST: PetDefinition[] = [
  PET_DEFINITIONS.fire,
  PET_DEFINITIONS.water,
  PET_DEFINITIONS.grass,
];
