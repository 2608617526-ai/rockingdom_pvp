import type {
  BattleStateView,
  PetView,
  PlayerView,
} from '@rockingdom/shared';
import type { BattleRoom, PetInstance, PlayerState } from '../types';
import { getMagicAttack, getPhysicalAttack } from './state';

/** 以 viewerId 视角构建客户端状态 */
export function buildStateView(
  room: BattleRoom,
  viewerId: string,
): BattleStateView {
  const self =
    room.players.find((p) => p.id === viewerId) ?? room.players[0];
  const opp =
    room.players.find((p) => p.id !== self.id) ?? room.players[1];
  return {
    roomId: room.id,
    phase: room.phase,
    turn: room.turn,
    self: buildPlayerView(self),
    opponent: buildPlayerView(opp),
    winnerId: room.winnerId,
    winnerName: room.players.find((p) => p.id === room.winnerId)?.name ?? null,
    isDraw: room.isDraw,
    forcedSwitchPlayerIds: room.forcedSwitchPlayerIds,
    message: null,
  };
}

function buildPlayerView(player: PlayerState): PlayerView {
  return {
    id: player.id,
    name: player.name,
    pets: player.pets.map(buildPetView),
    activePetInstanceId: player.activePetId,
    hasSelectedStarter: !!player.selectedStarter,
    actionSubmitted: !!player.currentAction,
  };
}

function buildPetView(pet: PetInstance): PetView {
  return {
    instanceId: pet.instanceId,
    petId: pet.def.id,
    name: pet.def.name,
    element: pet.def.element,
    hp: pet.hp,
    maxHp: pet.maxHp,
    energy: pet.energy,
    maxEnergy: pet.maxEnergy,
    status: pet.status,
    physicalAttack: getPhysicalAttack(pet),
    physicalDefense: pet.def.baseStats.physicalDefense,
    magicAttack: getMagicAttack(pet),
    magicDefense: pet.def.baseStats.magicDefense,
    speed: pet.def.baseStats.speed,
    passive: pet.passive,
  };
}
