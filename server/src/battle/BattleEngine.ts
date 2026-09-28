import { randomUUID } from 'node:crypto';
import type { BattleAction, BattleEvent } from '@rockingdom/shared';
import type { BattleRoom, PlayerState } from '../types';
import { getActivePet, setActivePet } from './state';
import { determineSkillOrder } from './priority';
import { resolveSkill } from './effects';
import { newTurnContext, type TurnContext } from './passives';
import { validateAction, type ValidationResult } from './validation';

export interface ActionResult {
  ok: boolean;
  reason?: string;
}

export interface TurnResolution {
  events: BattleEvent[];
  gameOver: boolean;
}

/**
 * 战斗引擎：游戏规则的唯一权威。
 * 负责行动校验、行动顺序、回合结算、胜负判定、换宠等核心逻辑。
 * 具体的伤害计算 / 优先级 / 技能效果 / 被动分别位于 damage.ts / priority.ts / effects.ts / passives.ts。
 */
export class BattleEngine {
  static createRoom(playerA: PlayerState, playerB: PlayerState): BattleRoom {
    return {
      id: randomUUID(),
      players: [playerA, playerB],
      turn: 0,
      phase: 'STARTER_SELECTION',
      winnerId: null,
      isDraw: false,
      forcedSwitchPlayerIds: [],
      createdAt: Date.now(),
      log: [],
    };
  }

  /** 双方都选完首发后，将首发宠物设为出战，进入第 1 回合 */
  static initializeBattle(room: BattleRoom): void {
    for (const p of room.players) {
      const starter = p.pets.find((pet) => pet.def.id === p.selectedStarter);
      if (starter) setActivePet(p, starter.instanceId);
    }
    room.turn = 1;
    room.phase = 'BATTLE';
  }

  static selectStarter(
    room: BattleRoom,
    playerId: string,
    petId: string,
  ): ActionResult {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, reason: '玩家不存在' };
    if (room.phase !== 'STARTER_SELECTION') {
      return { ok: false, reason: '当前不能选择首发' };
    }
    if (player.selectedStarter) {
      return { ok: false, reason: '已经选择过首发宠物' };
    }
    if (!player.pets.some((p) => p.def.id === petId)) {
      return { ok: false, reason: '无效的宠物' };
    }
    player.selectedStarter = petId;
    player.ready = true;
    return { ok: true };
  }

  static chooseAction(
    room: BattleRoom,
    playerId: string,
    action: BattleAction,
  ): ActionResult {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, reason: '玩家不存在' };
    if (room.phase !== 'BATTLE') return { ok: false, reason: '当前不是行动阶段' };
    if (room.forcedSwitchPlayerIds.includes(playerId)) {
      return { ok: false, reason: '需要先切换宠物' };
    }
    if (player.currentAction) {
      return { ok: false, reason: '本回合已选择行动' };
    }
    const result = validateAction(player, action);
    if (!result.ok) return result;
    player.currentAction = action;
    return { ok: true };
  }

  static confirmSwitch(
    room: BattleRoom,
    playerId: string,
    targetInstanceId: string,
  ): ActionResult {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, reason: '玩家不存在' };
    if (room.phase !== 'FORCED_SWITCH') {
      return { ok: false, reason: '当前不需要强制换宠' };
    }
    if (!room.forcedSwitchPlayerIds.includes(playerId)) {
      return { ok: false, reason: '你不需要强制换宠' };
    }
    const pet = player.pets.find((p) => p.instanceId === targetInstanceId);
    if (!pet) return { ok: false, reason: '目标宠物不存在' };
    if (pet.status === 'DEFEATED') {
      return { ok: false, reason: '不能切换到已阵亡的宠物' };
    }
    if (player.activePetId === targetInstanceId) {
      return { ok: false, reason: '该宠物已在场上' };
    }
    setActivePet(player, targetInstanceId);
    room.forcedSwitchPlayerIds = room.forcedSwitchPlayerIds.filter(
      (id) => id !== playerId,
    );
    if (room.forcedSwitchPlayerIds.length === 0) {
      room.phase = 'BATTLE';
      room.turn += 1;
    }
    return { ok: true };
  }

  static surrender(room: BattleRoom, playerId: string): { winnerId: string | null } {
    const winner = room.players.find((p) => p.id !== playerId);
    room.phase = 'GAME_OVER';
    room.winnerId = winner?.id ?? null;
    room.isDraw = false;
    room.endReason = 'SURRENDER';
    return { winnerId: winner?.id ?? null };
  }

  /** 断线判负 */
  static handleDisconnect(
    room: BattleRoom,
    playerId: string,
  ): { winnerId: string | null } {
    const winner = room.players.find((p) => p.id !== playerId);
    room.phase = 'GAME_OVER';
    room.winnerId = winner?.id ?? null;
    room.isDraw = false;
    room.endReason = 'DISCONNECT';
    return { winnerId: winner?.id ?? null };
  }

  static resolveTurn(room: BattleRoom): TurnResolution {
    const events: BattleEvent[] = [];
    const [a, b] = room.players;
    const actionA = a.currentAction;
    const actionB = b.currentAction;

    events.push({ type: 'TURN_START', description: `第 ${room.turn} 回合` });

    // 1. 切换（优先级最高）
    const switchA = actionA?.type === 'SWITCH';
    const switchB = actionB?.type === 'SWITCH';
    if (switchA || switchB) {
      const ctx = newTurnContext(events);
      if (switchA && switchB) {
        const order = this.switchOrder(room);
        for (const p of order) {
          this.dispatchSwitch(room, p, p.currentAction!.targetInstanceId!, ctx);
        }
      } else if (switchA) {
        this.dispatchSwitch(room, a, actionA!.targetInstanceId!, ctx);
        if (actionB?.type === 'SKILL') {
          resolveSkill(b, a, actionB.skillId!, ctx);
        }
      } else {
        this.dispatchSwitch(room, b, actionB!.targetInstanceId!, ctx);
        if (actionA?.type === 'SKILL') {
          resolveSkill(a, b, actionA.skillId!, ctx);
        }
      }
      return this.finalizeTurn(room, events);
    }

    // 3. 双方技能
    const ctx = newTurnContext(events);
    const [first, second] = determineSkillOrder(
      a,
      b,
      actionA!.skillId!,
      actionB!.skillId!,
    );
    resolveSkill(first.player, second.player, first.skillId, ctx);

    // 若第一行动导致对方当前宠物阵亡，则取消第二行动
    const secondPet = getActivePet(second.player);
    if (secondPet && secondPet.status !== 'DEFEATED') {
      resolveSkill(second.player, first.player, second.skillId, ctx);
    } else {
      events.push({
        type: 'FORCED_SWITCH',
        actorId: second.player.id,
        actorName: second.player.name,
        description: `${second.player.name} 的宠物已阵亡，无法继续行动！`,
      });
    }

    return this.finalizeTurn(room, events);
  }

  /** 双方都切换时的顺序：速度高者先；平手时先加入者先 */
  private static switchOrder(room: BattleRoom): PlayerState[] {
    const [a, b] = room.players;
    const speedA = getActivePet(a)?.def.baseStats.speed ?? 0;
    const speedB = getActivePet(b)?.def.baseStats.speed ?? 0;
    return speedA >= speedB ? [a, b] : [b, a];
  }

  private static dispatchSwitch(
    _room: BattleRoom,
    player: PlayerState,
    targetInstanceId: string,
    ctx: TurnContext,
  ): void {
    const pet = player.pets.find((p) => p.instanceId === targetInstanceId);
    if (!pet) return;
    setActivePet(player, targetInstanceId);
    ctx.events.push({
      type: 'SWITCH',
      actorId: player.id,
      actorName: player.name,
      petName: pet.def.name,
      description: `${player.name} 换上了 ${pet.def.name}！`,
    });
  }

  private static finalizeTurn(
    room: BattleRoom,
    events: BattleEvent[],
  ): TurnResolution {
    // 检查阵亡 => 需要强制换宠的玩家
    const needsSwitch: string[] = [];
    for (const p of room.players) {
      const active = getActivePet(p);
      if (active && active.status === 'DEFEATED') {
        const hasLiving = p.pets.some((pet) => pet.status !== 'DEFEATED');
        if (hasLiving) needsSwitch.push(p.id);
      }
    }

    // 结算胜负
    const victory = this.checkVictory(room);
    if (victory.gameOver) {
      room.phase = 'GAME_OVER';
      room.winnerId = victory.winnerId;
      room.isDraw = victory.isDraw;
      room.endReason = victory.isDraw ? 'DRAW' : 'DEFEAT';
      if (victory.isDraw) {
        events.push({ type: 'VICTORY', description: '双方全部宠物阵亡，平局！' });
      } else {
        const winner = room.players.find((p) => p.id === victory.winnerId);
        events.push({
          type: 'VICTORY',
          actorId: winner?.id,
          actorName: winner?.name,
          description: `${winner?.name} 获得了胜利！`,
        });
      }
      return { events, gameOver: true };
    }

    // 重置本回合行动
    for (const p of room.players) p.currentAction = null;

    if (needsSwitch.length > 0) {
      room.phase = 'FORCED_SWITCH';
      room.forcedSwitchPlayerIds = needsSwitch;
      for (const id of needsSwitch) {
        const p = room.players.find((pl) => pl.id === id);
        events.push({
          type: 'FORCED_SWITCH',
          actorId: id,
          actorName: p?.name,
          description: `${p?.name} 需要选择下一只出战宠物！`,
        });
      }
    } else {
      room.phase = 'BATTLE';
      room.turn += 1;
    }

    return { events, gameOver: false };
  }

  private static checkVictory(room: BattleRoom): {
    gameOver: boolean;
    winnerId: string | null;
    isDraw: boolean;
  } {
    const alive = room.players.map((p) =>
      p.pets.some((pet) => pet.status !== 'DEFEATED'),
    );
    if (!alive[0] && !alive[1]) {
      return { gameOver: true, winnerId: null, isDraw: true };
    }
    if (!alive[0]) {
      return { gameOver: true, winnerId: room.players[1].id, isDraw: false };
    }
    if (!alive[1]) {
      return { gameOver: true, winnerId: room.players[0].id, isDraw: false };
    }
    return { gameOver: false, winnerId: null, isDraw: false };
  }
}

export type { ValidationResult };
