import type { SkillDefinition } from '../types';

/**
 * 所有技能定义。
 * 技能逻辑由服务器 BattleEngine 根据 skill.id 统一解析，不在此处硬编码战斗流程。
 */
export const SKILL_DEFINITIONS: Record<string, SkillDefinition> = {
  // ============ 烈火战神 ============
  fire_blow: {
    id: 'fire_blow',
    name: '吹火',
    type: 'ATTACK',
    attackType: 'PHYSICAL',
    element: 'FIRE',
    power: 60,
    cost: 1,
    description: '造成物理伤害。每使用一次，该技能自身威力永久 +20。',
  },
  fire_cart: {
    id: 'fire_cart',
    name: '火云车',
    type: 'ATTACK',
    attackType: 'PHYSICAL',
    element: 'FIRE',
    power: 140,
    cost: 5,
    description: '造成大量物理伤害，无额外效果。',
  },
  fire_shield: {
    id: 'fire_shield',
    name: '火焰护盾',
    type: 'DEFENSE',
    element: 'FIRE',
    cost: 2,
    description: '本回合减伤 70%。若对方本回合使用攻击技能，对方受到自身最大生命值 10% 的灼烧伤害。',
  },
  mountain_fire: {
    id: 'mountain_fire',
    name: '山火',
    type: 'ATTACK',
    attackType: 'PHYSICAL',
    element: 'FIRE',
    power: 30,
    cost: 3,
    description: '初始威力 30。每使用一次其他火系技能，该技能威力翻倍（持续整场战斗）。',
  },

  // ============ 武斗酷猫 ============
  sieve_flow: {
    id: 'sieve_flow',
    name: '筛管奔流',
    type: 'ATTACK',
    attackType: 'PHYSICAL',
    element: 'GRASS',
    power: 80,
    cost: 3,
    description: '若当前生命值严格高于最大生命值的 80%，威力 +60（达到 140）。',
  },
  enzyme: {
    id: 'enzyme',
    name: '酶浓度调整',
    type: 'DEFENSE',
    cost: 2,
    description: '本回合减伤 70%。若对方本回合使用攻击技能，自身回复最大生命值 20%。',
  },
  cactus: {
    id: 'cactus',
    name: '仙人掌刺击',
    type: 'ATTACK',
    attackType: 'PHYSICAL',
    element: 'GRASS',
    power: 155,
    cost: 6,
    description: '造成极高物理伤害，无额外效果。',
  },
  photosynthesis: {
    id: 'photosynthesis',
    name: '光合作用',
    type: 'STATUS',
    cost: 0,
    description: '回复最大生命值 20%，并回复 3 点能量。',
  },

  // ============ 圣水守护 ============
  moisture: {
    id: 'moisture',
    name: '润泽',
    type: 'STATUS',
    cost: 0,
    description: '魔法攻击提升至基础值的 270%（每场战斗仅可生效一次）。',
  },
  bubble_shield: {
    id: 'bubble_shield',
    name: '水泡盾',
    type: 'DEFENSE',
    cost: 2,
    description: '本回合减伤 70%。若成功应对对方攻击，自身魔法攻击提升 70%。',
  },
  deluge: {
    id: 'deluge',
    name: '天洪',
    type: 'ATTACK',
    attackType: 'MAGICAL',
    element: 'WATER',
    power: 140,
    cost: 7,
    description: '若对方本回合使用状态类技能，则先手攻击，且能耗永久降为 1。',
  },
  bubble: {
    id: 'bubble',
    name: '气泡',
    type: 'ATTACK',
    attackType: 'MAGICAL',
    element: 'WATER',
    power: 100,
    cost: 3,
    description: '造成魔法伤害。',
  },

  // ============ 通用 ============
  charge: {
    id: 'charge',
    name: '聚能',
    type: 'STATUS',
    cost: 0,
    description: '回复 5 点能量（不超过上限）。',
  },
};

export const SKILL_LIST: SkillDefinition[] = Object.values(SKILL_DEFINITIONS);
