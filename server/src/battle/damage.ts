import {
  DAMAGE_DENOMINATOR,
  DAMAGE_NUMERATOR,
  DEFENSE_REDUCTION,
  GRASS_NEXT_ATTACK_BONUS,
  getTypeMultiplier,
  type SkillDefinition,
} from '@rockingdom/shared';
import type { PetInstance } from '../types';
import { getMagicAttack, getPhysicalAttack } from './state';

/**
 * 伤害计算（唯一权威位置）。
 *
 *  物理：power × 攻击方物攻 / 防御方物防 × 克制 × 37/41
 *  魔法：power × 攻击方魔攻 / 防御方魔防 × 克制 × 37/41
 *
 * 再叠加：武斗酷猫下次攻击加成；防御减伤 70%。
 * 最终 floor，最小伤害 1。
 *
 * 注意：武斗酷猫的攻击加成标记由调用方在攻击后清空。
 */
export function calculateDamage(
  attacker: PetInstance,
  defender: PetInstance,
  skill: SkillDefinition,
  defending: boolean,
): number {
  const typeMult = getTypeMultiplier(skill.element, defender.def.element);
  let raw: number;

  if (skill.attackType === 'MAGICAL') {
    raw =
      (skill.power ?? 0) *
      (getMagicAttack(attacker) / defender.def.baseStats.magicDefense) *
      typeMult *
      (DAMAGE_NUMERATOR / DAMAGE_DENOMINATOR);
  } else {
    raw =
      (skill.power ?? 0) *
      (getPhysicalAttack(attacker) / defender.def.baseStats.physicalDefense) *
      typeMult *
      (DAMAGE_NUMERATOR / DAMAGE_DENOMINATOR);
  }

  let damage = raw;

  if (attacker.def.id === 'grass' && attacker.passive.nextAttackBonusStacks > 0) {
    damage *= 1 + GRASS_NEXT_ATTACK_BONUS * attacker.passive.nextAttackBonusStacks;
  }

  if (defending) {
    damage *= DEFENSE_REDUCTION;
  }

  return Math.max(1, Math.floor(damage));
}
