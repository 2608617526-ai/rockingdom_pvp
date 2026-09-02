import type { Server, Socket } from 'socket.io';
import type {
  BattleAction,
  BattleStateView,
  GameOverPayload,
  TurnResultPayload,
} from '@rockingdom/shared';
import { DISCONNECT_GRACE_MS } from '@rockingdom/shared';
import type { BattleRoom } from '../types';
import { createPlayerState } from '../battle/state';
import { BattleEngine } from '../battle/BattleEngine';
import { buildStateView } from '../battle/serialize';
import { MatchmakingQueue } from '../matchmaking';

const VALID_PLAYER_ID = /^[a-zA-Z0-9_-]{6,64}$/;

export function setupSocket(io: Server): void {
  const queue = new MatchmakingQueue();
  const rooms = new Map<string, BattleRoom>();
  const playerToRoom = new Map<string, string>();
  const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function roomOf(playerId: string): BattleRoom | undefined {
    const roomId = playerToRoom.get(playerId);
    return roomId ? rooms.get(roomId) : undefined;
  }

  function emitState(room: BattleRoom): void {
    for (const p of room.players) {
      if (p.socketId) {
        io.to(p.socketId).emit('battle:state', buildStateView(room, p.id));
      }
    }
  }

  function cleanupRoom(roomId: string): void {
    const room = rooms.get(roomId);
    if (!room) return;
    for (const p of room.players) {
      playerToRoom.delete(p.id);
      const timer = disconnectTimers.get(p.id);
      if (timer) {
        clearTimeout(timer);
        disconnectTimers.delete(p.id);
      }
    }
    rooms.delete(roomId);
  }

  function emitGameOver(room: BattleRoom): void {
    const winner = room.players.find((p) => p.id === room.winnerId);
    for (const p of room.players) {
      if (p.socketId) {
        const payload: GameOverPayload = {
          winnerId: room.winnerId,
          winnerName: winner?.name ?? null,
          isDraw: room.isDraw,
          state: buildStateView(room, p.id),
        };
        io.to(p.socketId).emit('battle:gameOver', payload);
      }
    }
  }

  function forfeitPlayer(playerId: string): void {
    const room = roomOf(playerId);
    if (!room || room.phase === 'GAME_OVER') return;
    BattleEngine.handleDisconnect(room, playerId);
    emitGameOver(room);
    cleanupRoom(room.id);
  }

  function beginDisconnectGrace(playerId: string): void {
    const room = roomOf(playerId);
    if (!room) return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;
    player.connected = false;
    player.socketId = null;
    emitState(room);
    const timer = setTimeout(() => forfeitPlayer(playerId), DISCONNECT_GRACE_MS);
    disconnectTimers.set(playerId, timer);
  }

  io.on('connection', (socket: Socket) => {
    socket.data.playerId = null;

    // 客户端在（重）连接时上报自己的稳定身份；若仍在战斗则恢复
    socket.on('session:hello', (payload: { playerId?: unknown }) => {
      const playerId =
        typeof payload?.playerId === 'string' ? payload.playerId : '';
      if (!VALID_PLAYER_ID.test(playerId)) return;
      socket.data.playerId = playerId;

      const room = roomOf(playerId);
      const player = room?.players.find((p) => p.id === playerId);
      if (room && player && !player.connected) {
        // 重连恢复
        player.socketId = socket.id;
        player.connected = true;
        const timer = disconnectTimers.get(playerId);
        if (timer) {
          clearTimeout(timer);
          disconnectTimers.delete(playerId);
        }
        socket.emit('session:restored', { playerId });
        socket.emit('battle:state', buildStateView(room, playerId));
      } else {
        socket.emit('session:helloed', { playerId });
      }
    });

    socket.on('queue:join', () => {
      const playerId = socket.data.playerId as string | null;
      if (!playerId) return;

      const existing = roomOf(playerId);
      if (existing) {
        if (existing.phase !== 'GAME_OVER') {
          socket.emit('error', { message: '你已在对局中' });
          return;
        }
        cleanupRoom(existing.id);
      }

      const player = createPlayerState(playerId, socket.id, '');
      const opponent = queue.join(player);
      if (!opponent) {
        socket.emit('queue:waiting', { message: '等待其他玩家加入……' });
        return;
      }

      opponent.name = '玩家1';
      player.name = '玩家2';
      const room = BattleEngine.createRoom(opponent, player);
      rooms.set(room.id, room);
      playerToRoom.set(opponent.id, room.id);
      playerToRoom.set(player.id, room.id);

      for (const p of room.players) {
        if (p.socketId) {
          io.to(p.socketId).emit('queue:matched', {
            roomId: room.id,
            playerId: p.id,
            opponentName: room.players.find((x) => x.id !== p.id)?.name ?? '',
            state: buildStateView(room, p.id),
          });
        }
      }
    });

    socket.on('queue:leave', () => {
      const playerId = socket.data.playerId as string | null;
      if (playerId) queue.leave(playerId);
    });

    socket.on('battle:selectStarter', (payload: { petId?: unknown }) => {
      const playerId = socket.data.playerId as string | null;
      if (!playerId) return;
      const room = roomOf(playerId);
      if (!room) return;
      const petId = typeof payload?.petId === 'string' ? payload.petId : '';
      const result = BattleEngine.selectStarter(room, playerId, petId);
      if (!result.ok) {
        socket.emit('error', { message: result.reason ?? '选择失败' });
        return;
      }
      socket.emit('battle:starterSelected', { playerId });

      const bothReady = room.players.every((p) => p.ready);
      if (bothReady) {
        BattleEngine.initializeBattle(room);
        for (const p of room.players) {
          if (p.socketId) {
            io.to(p.socketId).emit('battle:turnStart', {
              turn: room.turn,
              state: buildStateView(room, p.id),
            });
          }
        }
      }
      emitState(room);
    });

    socket.on('battle:chooseAction', (payload: { action?: unknown }) => {
      const playerId = socket.data.playerId as string | null;
      if (!playerId) return;
      const room = roomOf(playerId);
      if (!room) return;
      const action = payload?.action as BattleAction;
      const result = BattleEngine.chooseAction(room, playerId, action);
      if (!result.ok) {
        socket.emit('error', { message: result.reason ?? '行动失败' });
        return;
      }
      socket.emit('battle:actionReceived', { playerId, action });
      emitState(room);

      if (room.players.every((p) => p.currentAction)) {
        const resolution = BattleEngine.resolveTurn(room);
        for (const p of room.players) {
          if (p.socketId) {
            const payload: TurnResultPayload = {
              turn: room.turn,
              events: resolution.events,
              state: buildStateView(room, p.id),
            };
            io.to(p.socketId).emit('battle:turnResult', payload);
          }
        }

        if (room.phase === 'GAME_OVER') {
          emitGameOver(room);
          cleanupRoom(room.id);
        } else if (room.phase === 'FORCED_SWITCH') {
          for (const p of room.players) {
            if (p.socketId && room.forcedSwitchPlayerIds.includes(p.id)) {
              io.to(p.socketId).emit('battle:forceSwitch', {
                playerId: p.id,
                state: buildStateView(room, p.id),
              });
            }
          }
          emitState(room);
        } else {
          for (const p of room.players) {
            if (p.socketId) {
              io.to(p.socketId).emit('battle:turnStart', {
                turn: room.turn,
                state: buildStateView(room, p.id),
              });
            }
          }
        }
      }
    });

    socket.on('battle:confirmSwitch', (payload: { targetInstanceId?: unknown }) => {
      const playerId = socket.data.playerId as string | null;
      if (!playerId) return;
      const room = roomOf(playerId);
      if (!room) return;
      const targetInstanceId =
        typeof payload?.targetInstanceId === 'string'
          ? payload.targetInstanceId
          : '';
      const result = BattleEngine.confirmSwitch(room, playerId, targetInstanceId);
      if (!result.ok) {
        socket.emit('error', { message: result.reason ?? '换宠失败' });
        return;
      }
      socket.emit('battle:switchConfirmed', { playerId });
      emitState(room);
      if (room.forcedSwitchPlayerIds.length === 0 && room.phase === 'BATTLE') {
        for (const p of room.players) {
          if (p.socketId) {
            io.to(p.socketId).emit('battle:turnStart', {
              turn: room.turn,
              state: buildStateView(room, p.id),
            });
          }
        }
      }
    });

    socket.on('battle:surrender', () => {
      const playerId = socket.data.playerId as string | null;
      if (!playerId) return;
      const room = roomOf(playerId);
      if (!room || room.phase === 'GAME_OVER') return;
      BattleEngine.surrender(room, playerId);
      emitGameOver(room);
      cleanupRoom(room.id);
    });

    socket.on('disconnect', () => {
      const playerId = socket.data.playerId as string | null;
      if (!playerId) return;
      if (queue.has(playerId)) {
        queue.leave(playerId);
        return;
      }
      const room = roomOf(playerId);
      if (!room || room.phase === 'GAME_OVER') return;
      const player = room.players.find((p) => p.id === playerId);
      // 若已被新连接接管（重连），旧连接断开时不再判负
      if (!player || player.socketId !== socket.id) return;
      beginDisconnectGrace(playerId);
    });
  });
}

export type { BattleStateView };
