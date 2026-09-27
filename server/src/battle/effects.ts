import {
  BUBBLE_SHIELD_MAGIC_MULTIPLIER,
  ENZYME_HEAL_RATIO,
  ENERGY_CHARGE_AMOUNT,
  FIRE_SHIELD_BURN_RATIO,
  MOISTURE_MAGIC_MULTIPLIER,
  PHOTOSYNTHESIS_ENERGY,
  PHOTOSYNTHESIS_HEAL_RATIO,
  SIEVE_FLOW_BONUS_POWER,
  SIEVE_FLOW_HP_THRESHOLD,
  SKILL_DEFINITIONS,
  DELUGE_COST_REDUCTION_PER_COUNTER,
  getActualSkillCost,
  type SkillDefinition,
} from '@rockingdom/shared';
import type { PetInstance, PlayerState } from '../types';
import { getActivePet } from './state';
import { calculateDamage } from './damage';
import {
  applyAfterSkillPassives,
  onEnergyRestore,
  type TurnContext,
} from './passives';

/** 计算并扣除技能能耗（圣水守护的通用减耗在 shared 统一计算，这里负责“消耗并清空”） */
function paySkillCost(pet: PetInstance, skill: SkillDefinition): number {
  const cost = getActualSkillCost(pet.def.id, skill, pet.passive);
  if (pet.def.id === 'water') {
    // 消费圣水守护的「下一技能减耗」；天洪永久减耗不在此消费
    pet.passive.nextSkillCostReduction = 0;
  }
  pet.energy = Math.max(0, pet.energy - cost);
  return cost;
}

/** 吹火当前威力：基础 60 + 每次使用 +20 */
function fireBlowPower(pet: PetInstance): number {
  return 60 + pet.passive.fireBlowPowerBonus;
}

/** 山火当前威力：基础 30 × 倍率 */
function mountainFirePower(pet: PetInstance): number {
  return 30 * pet.passive.mountainFireMultiplier;
}

/** 筛管奔流当前威力：HP 严格大于 80% 时 +60 */
function sieveFlowPower(pet: PetInstance): number {
  const base = 80;
  if (pet.hp > pet.maxHp * SIEVE_FLOW_HP_THRESHOLD) {
    return base + SIEVE_FLOW_BONUS_POWER;
  }
  return base;
}

function effectivePower(pet: PetInstance, skill: SkillDefinition): number {
  switch (skill.id) {
    case 'fire_blow':
      return fireBlowPower(pet);
    case 'mountain_fire':
      return mountainFirePower(pet);
    case 'sieve_flow':
      return sieveFlowPower(pet);
    default:
      return skill.power ?? 0;
  }
}

/**
 * 解析并执行一次技能行动（actor 使用 skillId 对付 opponent）。
 * 伤害 / 状态 / 被动全部在服务端完成。
 */
export function resolveSkill(
  actor: PlayerState,
  opponent: PlayerState,
  skillId: string,
  ctx: TurnContext,
): void {
  const pet = getActivePet(actor);
  if (!pet || pet.status === 'DEFEATED') return;

  const skill: SkillDefinition | undefined = SKILL_DEFINITIONS[skillId];
  if (!skill) return;

  // 天洪特殊应对：对方本回合使用状态技能 => 天洪自身能耗永久 -6（可叠加，只影响天洪）
  if (skill.id === 'deluge' && opponent.currentAction?.type === 'SKILL') {
    const oppSkill = SKILL_DEFINITIONS[opponent.currentAction.skillId ?? ''];
    if (oppSkill?.type === 'STATUS') {
      pet.passive.heavenlyFloodCostReduction += DELUGE_COST_REDUCTION_PER_COUNTER;
      ctx.events.push({
        type: 'BUFF',
        actorId: actor.id,
        petName: pet.def.name,
        description: '天洪成功应对状态技能，自身能耗永久减少 6！',
      });
    }
  }

  // 扣除能耗
  const cost = paySkillCost(pet, skill);
  if (cost > 0) {
    ctx.events.push({
      type: 'ENERGY',
      actorId: actor.id,
      petName: pet.def.name,
      value: cost,
      description: `${pet.def.name} 消耗了 ${cost} 点能量。`,
    });
  }

  if (skill.type === 'ATTACK') {
    const targetPet = getActivePet(opponent);
    if (!targetPet) return;

    ctx.events.push({
      type: 'ATTACK',
      actorId: actor.id,
      targetId: opponent.id,
      actorName: actor.name,
      targetName: opponent.name,
      petName: pet.def.name,
      skillName: skill.name,
      description: `${pet.def.name} 使用了 ${skill.name}！`,
    });

    const defending = !!ctx.defending[opponent.id];
    const dmg = calculateDamage(
      pet,
      targetPet,
      { ...skill, power: effectivePower(pet, skill) },
      defending,
    );

    // 武斗酷猫：攻击技能消耗“下一次攻击”强化标记
    if (pet.def.id === 'grass') {
      pet.passive.nextAttackBonusStacks = 0;
    }

    targetPet.hp = Math.max(0, targetPet.hp - dmg);
    ctx.events.push({
      type: 'DAMAGE',
      actorId: actor.id,
      targetId: opponent.id,
      petName: targetPet.def.name,
      value: dmg,
      description: `${targetPet.def.name} 受到 ${dmg} 点伤害！`,
    });

    if (targetPet.hp <= 0) {
      targetPet.status = 'DEFEATED';
      ctx.events.push({
        type: 'DEATH',
        targetId: opponent.id,
        petName: targetPet.def.name,
        description: `${targetPet.def.name} 倒下了！`,
      });
    }

    // 防御技能额外效果：应对成功后在攻击结算之后执行
    if (defending) {
      triggerDefenseCounter(opponent, ctx.defenseSkillId[opponent.id], actor, ctx);
    }
  } else if (skill.type === 'DEFENSE') {
    ctx.defending[actor.id] = true;
    ctx.defenseSkillId[actor.id] = skill.id;
    ctx.events.push({
      type: 'DEFENSE',
      actorId: actor.id,
      petName: pet.def.name,
      skillName: skill.name,
      description: `${pet.def.name} 使用了 ${skill.name}，进入防御姿态！`,
    });
  } else {
    applyStatusEffect(pet, actor, skill, ctx);
  }

  // 每次技能成功执行后触发被动
  applyAfterSkillPassives(pet, actor, skill, ctx);
}

function applyStatusEffect(
  pet: PetInstance,
  actor: PlayerState,
  skill: SkillDefinition,
  ctx: TurnContext,
): void {
  ctx.events.push({
    type: 'STATUS',
    actorId: actor.id,
    petName: pet.def.name,
    skillName: skill.name,
    description: `${pet.def.name} 使用了 ${skill.name}！`,
  });

  switch (skill.id) {
    case 'charge': {
      const before = pet.energy;
      pet.energy = Math.min(pet.maxEnergy, pet.energy + ENERGY_CHARGE_AMOUNT);
      const restored = pet.energy - before;
      if (restored > 0) {
        ctx.events.push({
          type: 'ENERGY',
          actorId: actor.id,
          petName: pet.def.name,
          value: restored,
          description: `${pet.def.name} 回复了 ${restored} 点能量！`,
        });
        onEnergyRestore(pet, actor, ctx);
      } else {
        ctx.events.push({
          type: 'STATUS',
          actorId: actor.id,
          petName: pet.def.name,
          description: `${pet.def.name} 使用了聚能，但能量已满。`,
        });
      }
      break;
    }
    case 'photosynthesis': {
      const beforeHp = pet.hp;
      pet.hp = Math.min(
        pet.maxHp,
        pet.hp + Math.floor(pet.maxHp * PHOTOSYNTHESIS_HEAL_RATIO),
      );
      const healed = pet.hp - beforeHp;
      if (healed > 0) {
        ctx.events.push({
          type: 'HEAL',
          actorId: actor.id,
          petName: pet.def.name,
          value: healed,
          description: `${pet.def.name} 回复了 ${healed} 点生命！`,
        });
      }
      const beforeEnergy = pet.energy;
      pet.energy = Math.min(pet.maxEnergy, pet.energy + PHOTOSYNTHESIS_ENERGY);
      const restored = pet.energy - beforeEnergy;
      if (restored > 0) {
        ctx.events.push({
          type: 'ENERGY',
          actorId: actor.id,
          petName: pet.def.name,
          value: restored,
          description: `${pet.def.name} 回复了 ${restored} 点能量！`,
        });
        onEnergyRestore(pet, actor, ctx);
      }
      break;
    }
    case 'moisture': {
      if (!pet.passive.moistureApplied) {
        pet.passive.moistureApplied = true;
        pet.passive.magicAttackMultiplier = MOISTURE_MAGIC_MULTIPLIER;
        ctx.events.push({
          type: 'BUFF',
          actorId: actor.id,
          petName: pet.def.name,
          description: `${pet.def.name} 的魔法攻击大幅提升！`,
        });
      } else {
        ctx.events.push({
          type: 'STATUS',
          actorId: actor.id,
          petName: pet.def.name,
          description: `${pet.def.name} 使用了润泽，但增益已存在。`,
        });
      }
      break;
    }
    default:
      break;
  }
}

function triggerDefenseCounter(
  defender: PlayerState,
  defenseSkillId: string | null,
  attacker: PlayerState,
  ctx: TurnContext,
): void {
  const defenderPet = getActivePet(defender);
  const attackerPet = getActivePet(attacker);
  if (!defenderPet || !attackerPet) return;

  ctx.events.push({
    type: 'COUNTER',
    actorId: defender.id,
    petName: defenderPet.def.name,
    description: `${defenderPet.def.name} 成功应对了攻击！`,
  });

  switch (defenseSkillId) {
    case 'fire_shield': {
      // 灼烧反伤与防御方是否存活无关
      const burn = Math.floor(defenderPet.maxHp * FIRE_SHIELD_BURN_RATIO);
      attackerPet.hp = Math.max(0, attackerPet.hp - burn);
      ctx.events.push({
        type: 'DAMAGE',
        targetId: attacker.id,
        petName: attackerPet.def.name,
        value: burn,
        description: `${attackerPet.def.name} 受到灼烧伤害 ${burn} 点！`,
      });
      if (attackerPet.hp <= 0) {
        attackerPet.status = 'DEFEATED';
        ctx.events.push({
          type: 'DEATH',
          targetId: attacker.id,
          petName: attackerPet.def.name,
          description: `${attackerPet.def.name} 倒下了！`,
        });
      }
      break;
    }
    case 'enzyme': {
      if (defenderPet.status !== 'ACTIVE') break;
      const before = defenderPet.hp;
      defenderPet.hp = Math.min(
        defenderPet.maxHp,
        defenderPet.hp + Math.floor(defenderPet.maxHp * ENZYME_HEAL_RATIO),
      );
      const healed = defenderPet.hp - before;
      if (healed > 0) {
        ctx.events.push({
          type: 'HEAL',
          actorId: defender.id,
          petName: defenderPet.def.name,
          value: healed,
          description: `${defenderPet.def.name} 回复了 ${healed} 点生命！`,
        });
      }
      break;
    }
    case 'bubble_shield': {
      if (defenderPet.status !== 'ACTIVE') break;
      defenderPet.passive.magicAttackMultiplier *= BUBBLE_SHIELD_MAGIC_MULTIPLIER;
      ctx.events.push({
        type: 'BUFF',
        actorId: defender.id,
        petName: defenderPet.def.name,
        description: `${defenderPet.def.name} 的魔法攻击提升了！`,
      });
      break;
    }
    default:
      break;
  }
}
