import {
  FIRE_ATTACK_BOOST_PER_SKILL,
  FIRE_BLOW_POWER_GROWTH,
  MOUNTAIN_FIRE_MULTIPLIER,
  WATER_COST_REDUCTION_PER_SKILL,
  type BattleEvent,
  type SkillDefinition,
} from '@rockingdom/shared';
import type { PetInstance, PlayerState } from '../types';

/** 单回合结算的临时上下文 */
export interface TurnContext {
  events: BattleEvent[];
  /** 本回合处于防御姿态（减伤 70%）的玩家 */
  defending: Record<string, boolean>;
  /** 防御姿态对应的防御技能 id */
  defenseSkillId: Record<string, string | null>;
}

export function newTurnContext(events: BattleEvent[]): TurnContext {
  return { events, defending: {}, defenseSkillId: {} };
}

/**
 * 每次成功使用技能后触发的被动：
 *  - 烈火战神：物理攻击 +30%（基于基础值）
 *  - 吹火：自身威力 +20
 *  - 山火：其他火系技能使用时威力 ×2
 *  - 圣水守护：下一次技能能耗 -2
 */
export function applyAfterSkillPassives(
  pet: PetInstance,
  actor: PlayerState,
  skill: SkillDefinition,
  ctx: TurnContext,
): void {
  if (pet.def.id === 'fire') {
    pet.passive.attackBoostMultiplier += FIRE_ATTACK_BOOST_PER_SKILL;
    if (skill.id === 'fire_blow') {
      pet.passive.fireBlowPowerBonus += FIRE_BLOW_POWER_GROWTH;
    }
    if (skill.element === 'FIRE' && skill.id !== 'mountain_fire') {
      pet.passive.mountainFireMultiplier *= MOUNTAIN_FIRE_MULTIPLIER;
    }
    ctx.events.push({
      type: 'BUFF',
      actorId: actor.id,
      petName: pet.def.name,
      description: `${pet.def.name} 的物理攻击提升了！`,
    });
  }
  if (pet.def.id === 'water') {
    pet.passive.nextSkillCostReduction += WATER_COST_REDUCTION_PER_SKILL;
  }
}

/** 每次回复能量后触发的被动：武斗酷猫获得 +1 下次攻击强化标记 */
export function onEnergyRestore(
  pet: PetInstance,
  actor: PlayerState,
  ctx: TurnContext,
): void {
  if (pet.def.id === 'grass') {
    pet.passive.nextAttackBonusStacks += 1;
    ctx.events.push({
      type: 'BUFF',
      actorId: actor.id,
      petName: pet.def.name,
      description: `${pet.def.name} 蓄力完毕，下一次攻击伤害提升！`,
    });
  }
}
