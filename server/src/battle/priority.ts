import { SKILL_DEFINITIONS, type SkillDefinition } from '@rockingdom/shared';
import type { PlayerState } from '../types';
import { getActivePet } from './state';

export interface OrderedAction {
  player: PlayerState;
  skillId: string;
}

/**
 * 决定两个技能行动的执行顺序。
 *
 * 规则（优先级从高到低）：
 *  1. 防御技能应对攻击技能 => 防御方先执行（减伤先生效）
 *  2. 天洪应对状态技能 => 天洪方先执行
 *  3. 其余情况：速度高者先；速度相同：房间内先加入的玩家先（players[0]）
 */
export function determineSkillOrder(
  a: PlayerState,
  b: PlayerState,
  skillIdA: string,
  skillIdB: string,
): [OrderedAction, OrderedAction] {
  const skillA: SkillDefinition | undefined = SKILL_DEFINITIONS[skillIdA];
  const skillB: SkillDefinition | undefined = SKILL_DEFINITIONS[skillIdB];

  if (skillA?.type === 'DEFENSE' && skillB?.type === 'ATTACK') {
    return [
      { player: a, skillId: skillIdA },
      { player: b, skillId: skillIdB },
    ];
  }
  if (skillB?.type === 'DEFENSE' && skillA?.type === 'ATTACK') {
    return [
      { player: b, skillId: skillIdB },
      { player: a, skillId: skillIdA },
    ];
  }

  if (skillA?.id === 'deluge' && skillB?.type === 'STATUS') {
    return [
      { player: a, skillId: skillIdA },
      { player: b, skillId: skillIdB },
    ];
  }
  if (skillB?.id === 'deluge' && skillA?.type === 'STATUS') {
    return [
      { player: b, skillId: skillIdB },
      { player: a, skillId: skillIdA },
    ];
  }

  const speedA = getActivePet(a)?.def.baseStats.speed ?? 0;
  const speedB = getActivePet(b)?.def.baseStats.speed ?? 0;
  if (speedA > speedB) {
    return [
      { player: a, skillId: skillIdA },
      { player: b, skillId: skillIdB },
    ];
  }
  if (speedB > speedA) {
    return [
      { player: b, skillId: skillIdB },
      { player: a, skillId: skillIdA },
    ];
  }
  // 平手：先加入者先（a 恒为 players[0]）
  return [
    { player: a, skillId: skillIdA },
    { player: b, skillId: skillIdB },
  ];
}
