import type { Server, Socket } from 'socket.io';
import type {
  AuthUser,
  BattleAction,
  BattleStateView,
  GameOverPayload,
  TurnResultPayload,
} from '@rockingdom/shared';
import type { BattleRoom } from '../types';
import { createPlayerState } from '../battle/state';
import { BattleEngine } from '../battle/BattleEngine';
import { buildStateView } from '../battle/serialize';
import { MatchmakingQueue } from '../matchmaking';
import { findUserIdByToken } from '../db/sessions';
import { findUserById } from '../db/users';
import { recordBattle } from '../history';

const VALID_PLAYER_ID = /^[a-zA-Z0-9_-]{6,64}$/;

export function setupSocket(io: Server): void {
  const queue = new MatchmakingQueue();
  const rooms = new Map<string, BattleRoom>();
  const playerToRoom = new Map<string, string>();
  // 正式账号 → 当前活动 socket（用于异地登录踢下线）
  const userIdToSocket = new Map<string, string>();
  // 正式账号 → 所在战斗房间（用于异地登录接续战斗）
  const userIdToRoom = new Map<string, string>();

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
      if (p.userId) {
        if (userIdToRoom.get(p.userId) === roomId) userIdToRoom.delete(p.userId);
        if (p.socketId && userIdToSocket.get(p.userId) === p.socketId) {
          userIdToSocket.delete(p.userId);
        }
      }
    }
    rooms.delete(roomId);
  }

  function emitGameOver(room: BattleRoom): void {
    // 战斗结束 → 先持久化历史战绩，再通知双方客户端
    recordBattle(room);
    const winner = room.players.find((p) => p.id === room.winnerId);
    for (const p of room.players) {
      if (p.socketId) {
        const payload: GameOverPayload = {
          winnerId: room.winnerId,
          winnerName: winner?.name ?? null,
          isDraw: room.isDraw,
          reason: room.endReason,
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
    const winner = room.players.find((p) => p.id === room.winnerId);
    const loser = room.players.find((p) => p.id === playerId);
    room.log.push({
      type: 'VICTORY',
      actorId: winner?.id,
      actorName: winner?.name,
      description: `${loser?.name} 断线，${winner?.name} 获胜！`,
    });
    emitGameOver(room);
    cleanupRoom(room.id);
  }

  io.on('connection', (socket: Socket) => {
    socket.data.playerId = null;

    // 客户端在（重）连接时上报自己的稳定身份；若仍在战斗则恢复
    socket.on('session:hello', (payload: { playerId?: unknown; token?: unknown }) => {
      const playerId =
        typeof payload?.playerId === 'string' ? payload.playerId : '';
      if (!VALID_PLAYER_ID.test(playerId)) return;
      socket.data.playerId = playerId;

      // 解析登录 token → 关联正式账号（游客则无）。只保留公开字段，绝不携带密码哈希。
      const token = typeof payload?.token === 'string' ? payload.token : '';
      const userId = token ? findUserIdByToken(token) : null;
      const userRow = userId ? findUserById(userId) : null;
      socket.data.user = userRow
        ? {
            id: userRow.id,
            account: userRow.account,
            nickname: userRow.nickname,
            avatar: userRow.avatar,
          }
        : null;

      // === 异地登录：单账号单会话 ===
      if (userId) {
        const battleRoomId = userIdToRoom.get(userId);
        const battleRoom = battleRoomId ? rooms.get(battleRoomId) : undefined;
        const battlePlayer = battleRoom?.players.find((p) => p.userId === userId);
        const inBattle = !!battleRoom && !!battlePlayer && battleRoom.phase !== 'GAME_OVER';

        // 先迁移 socket（若在战斗中），再踢旧连接：这样旧连接断开时，
        // disconnect 处理器里的 player.socketId !== socket.id 守卫会成立，从而不会判负。
        if (inBattle) {
          battlePlayer.socketId = socket.id;
          battlePlayer.connected = true;
          // 覆盖当前连接身份为战斗中的玩家 id（宠物实例 id 等都以它为准）
          socket.data.playerId = battlePlayer.id;
        }

        // 挤掉该账号之前的旧连接
        const oldSocketId = userIdToSocket.get(userId);
        if (oldSocketId && oldSocketId !== socket.id) {
          const oldSocket = io.sockets.sockets.get(oldSocketId);
          if (oldSocket) {
            oldSocket.emit('session:kicked', { message: '账号已在别处登录，已下线' });
            oldSocket.disconnect(true);
          }
        }
        userIdToSocket.set(userId, socket.id);

        if (inBattle) {
          socket.emit('session:restored', { playerId: battlePlayer.id });
          socket.emit('battle:state', buildStateView(battleRoom, battlePlayer.id));
          return;
        }
      }

      // === 游客 / 未在战斗中的重连恢复 ===
      const room = roomOf(playerId);
      const player = room?.players.find((p) => p.id === playerId);
      if (room && player && !player.connected) {
        player.socketId = socket.id;
        player.connected = true;
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

      const user = socket.data.user as AuthUser | null | undefined;
      const nickname = user?.nickname ?? `游客${playerId.slice(0, 4)}`;
      const player = createPlayerState(
        playerId,
        socket.id,
        nickname,
        user ? { userId: user.id, account: user.account, avatar: user.avatar } : null,
      );
      const opponent = queue.join(player);
      if (!opponent) {
        socket.emit('queue:waiting', { message: '等待其他玩家加入……' });
        return;
      }

      const room = BattleEngine.createRoom(opponent, player);
      rooms.set(room.id, room);
      playerToRoom.set(opponent.id, room.id);
      playerToRoom.set(player.id, room.id);
      for (const p of room.players) {
        if (p.userId) userIdToRoom.set(p.userId, room.id);
      }

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

    // 战斗内实时聊天：仅在对局内存中广播，不落库、结束即销毁
    socket.on('chat:message', (payload: { text?: unknown }) => {
      const playerId = socket.data.playerId as string | null;
      if (!playerId) return;
      const room = roomOf(playerId);
      if (!room) return;
      const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
      if (!text || text.length > 120) return;
      const player = room.players.find((p) => p.id === playerId);
      const message = { playerId, name: player?.name ?? '玩家', text };
      for (const p of room.players) {
        if (p.socketId) io.to(p.socketId).emit('chat:message', message);
      }
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
        room.log.push(...resolution.events);
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
      const winner = room.players.find((p) => p.id === room.winnerId);
      const loser = room.players.find((p) => p.id === playerId);
      room.log.push({
        type: 'VICTORY',
        actorId: winner?.id,
        actorName: winner?.name,
        description: `${loser?.name} 认输，${winner?.name} 获胜！`,
      });
      emitGameOver(room);
      cleanupRoom(room.id);
    });

    socket.on('disconnect', () => {
      // 清理该账号的活动 socket 映射
      const userId = (socket.data.user as AuthUser | null | undefined)?.id;
      if (userId && userIdToSocket.get(userId) === socket.id) {
        userIdToSocket.delete(userId);
      }

      const playerId = socket.data.playerId as string | null;
      if (!playerId) return;
      if (queue.has(playerId)) {
        queue.leave(playerId);
        return;
      }
      const room = roomOf(playerId);
      if (!room || room.phase === 'GAME_OVER') return;
      const player = room.players.find((p) => p.id === playerId);
      // 若已被新连接接管（异地登录迁移），旧连接断开时不再判负
      if (!player || player.socketId !== socket.id) return;
      // 断线立即判负
      forfeitPlayer(playerId);
    });
  });
}

export type { BattleStateView };
