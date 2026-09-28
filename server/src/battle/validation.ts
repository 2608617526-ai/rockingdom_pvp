import {
  SKILL_DEFINITIONS,
  getActualSkillCost,
  type BattleAction,
} from '@rockingdom/shared';
import type { PlayerState } from '../types';
import { getActivePet } from './state';

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

/** 校验一个行动是否合法（服务端是唯一权威，客户端提交不可信） */
export function validateAction(
  player: PlayerState,
  action: BattleAction,
): ValidationResult {
  if (!action || typeof action.type !== 'string') {
    return { ok: false, reason: '非法行动' };
  }
  switch (action.type) {
    case 'SKILL':
      return validateSkillAction(player, action.skillId);
    case 'SWITCH':
      return validateSwitchAction(player, action.targetInstanceId);
    default:
      return { ok: false, reason: '未知行动类型' };
  }
}

function validateSkillAction(
  player: PlayerState,
  skillId?: string,
): ValidationResult {
  if (!skillId) return { ok: false, reason: '缺少技能' };
  const pet = getActivePet(player);
  if (!pet) return { ok: false, reason: '当前没有出战宠物' };
  if (pet.status === 'DEFEATED') return { ok: false, reason: '当前宠物已阵亡' };
  if (!pet.def.skillIds.includes(skillId)) {
    return { ok: false, reason: '该技能不属于当前宠物' };
  }
  const skill = SKILL_DEFINITIONS[skillId];
  if (!skill) return { ok: false, reason: '未知技能' };
  const cost = getActualSkillCost(pet.def.id, skill, pet.passive);
  if (pet.energy < cost) return { ok: false, reason: '能量不足' };
  return { ok: true };
}

function validateSwitchAction(
  player: PlayerState,
  targetInstanceId?: string,
): ValidationResult {
  if (!targetInstanceId) return { ok: false, reason: '缺少切换目标' };
  const pet = player.pets.find((p) => p.instanceId === targetInstanceId);
  if (!pet) return { ok: false, reason: '目标宠物不存在' };
  if (pet.status === 'DEFEATED') {
    return { ok: false, reason: '不能切换到已阵亡的宠物' };
  }
  if (player.activePetId === targetInstanceId) {
    return { ok: false, reason: '该宠物已在场上' };
  }
  return { ok: true };
}
