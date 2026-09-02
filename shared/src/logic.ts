import type { PassiveState, PetId, SkillDefinition } from './types';
import { DELUGE_REDUCED_COST } from './constants';

/**
 * 与战斗相关的纯函数（服务端校验与客户端 UI 计算共用同一份逻辑，
 * 保证“能不能用 / 消耗多少”两边永远一致）。
 */

export function createInitialPassiveState(): PassiveState {
  return {
    attackBoostMultiplier: 1,
    magicAttackMultiplier: 1,
    fireBlowPowerBonus: 0,
    mountainFireMultiplier: 1,
    nextAttackBonusStacks: 0,
    skillCostReduction: 0,
    moistureApplied: false,
    tianhongCostReduced: false,
  };
}

/** 某技能在“不考虑被动减耗”情况下的基础能耗（天洪被永久降耗后为 1） */
export function effectiveBaseSkillCost(
  skill: SkillDefinition,
  passive: PassiveState,
): number {
  if (skill.id === 'deluge' && passive.tianhongCostReduced) {
    return DELUGE_REDUCED_COST;
  }
  return skill.cost;
}

/** 某技能当前实际需要消耗的能量（已计入圣水守护的被动减耗） */
export function effectiveSkillCost(
  petId: PetId,
  skill: SkillDefinition,
  passive: PassiveState,
): number {
  let base = effectiveBaseSkillCost(skill, passive);
  if (petId === 'water') {
    // 天洪永久降耗后最低为 1，圣水守护的被动减耗不得再把它扣到 0
    const floor = skill.id === 'deluge' ? 1 : 0;
    base = Math.max(floor, base - passive.skillCostReduction);
  }
  return base;
}
