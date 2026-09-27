import type { PassiveState, PetId, SkillDefinition } from './types';

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
    nextSkillCostReduction: 0,
    heavenlyFloodCostReduction: 0,
    moistureApplied: false,
  };
}

/**
 * 获取技能当前实际能耗（纯函数：只计算，绝不修改任何状态）。
 *
 * 实际能耗 = max(0, 基础能耗 - 天洪永久减耗(仅天洪) - 圣水守护下一技能减耗(仅圣水守护))
 *
 * 两个减耗机制完全独立，互不污染：
 *  - heavenlyFloodCostReduction：天洪每成功应对一次状态技能 +6，只影响天洪，永不消耗。
 *  - nextSkillCostReduction：圣水守护每使用一次技能 +2，下次技能结算时消耗并清零。
 *
 * 技能基础能耗（skill.cost）永远是静态配置，绝不被写回修改。
 */
export function getActualSkillCost(
  petId: PetId,
  skill: SkillDefinition,
  passive: PassiveState,
): number {
  let cost = skill.cost;
  if (skill.id === 'deluge') {
    cost -= passive.heavenlyFloodCostReduction;
  }
  if (petId === 'water') {
    cost -= passive.nextSkillCostReduction;
  }
  return Math.max(0, cost);
}
