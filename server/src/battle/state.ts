import {
  createInitialPassiveState,
  PET_LIST,
  type PetDefinition,
} from '@rockingdom/shared';
import type { PetInstance, PlayerState } from '../types';

/** 创建一只宠物的三个实例（每人一只） */
export function createPetInstances(
  defs: PetDefinition[],
  ownerId: string,
): PetInstance[] {
  return defs.map((def) => ({
    instanceId: `${ownerId}:${def.id}`,
    def,
    hp: def.baseStats.maxHp,
    maxHp: def.baseStats.maxHp,
    energy: def.initialEnergy,
    maxEnergy: def.maxEnergy,
    status: 'BENCHED' as const,
    passive: createInitialPassiveState(),
  }));
}

export function createPlayerState(
  id: string,
  socketId: string,
  name: string,
): PlayerState {
  return {
    id,
    socketId,
    name,
    pets: createPetInstances(PET_LIST, id),
    activePetId: null,
    selectedStarter: null,
    currentAction: null,
    ready: false,
    connected: true,
  };
}

export function getActivePet(player: PlayerState): PetInstance | undefined {
  return player.pets.find((p) => p.instanceId === player.activePetId);
}

/** 切换出战宠物：旧出战宠物置为 BENCHED（阵亡的保持 DEFEATED），新宠物置为 ACTIVE */
export function setActivePet(player: PlayerState, instanceId: string): void {
  for (const p of player.pets) {
    if (p.instanceId === player.activePetId && p.status === 'ACTIVE') {
      p.status = 'BENCHED';
    }
  }
  player.activePetId = instanceId;
  const target = player.pets.find((p) => p.instanceId === instanceId);
  if (target) target.status = 'ACTIVE';
}

/** 当前物理攻击（含烈火战神被动增益） */
export function getPhysicalAttack(pet: PetInstance): number {
  return pet.def.baseStats.physicalAttack * pet.passive.attackBoostMultiplier;
}

/** 当前魔法攻击（含圣水守护被动增益） */
export function getMagicAttack(pet: PetInstance): number {
  return pet.def.baseStats.magicAttack * pet.passive.magicAttackMultiplier;
}
