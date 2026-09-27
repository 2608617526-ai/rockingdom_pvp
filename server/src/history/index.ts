import type { HistoryPlayer } from '@rockingdom/shared';
import { insertBattle } from '../db/battles';
import type { BattleRoom, PlayerState } from '../types';

/**
 * 战斗结束 → 组装 BattleHistory → 写入 SQLite。
 * 与 BattleEngine 完全解耦：BattleEngine 只产出胜负，这里负责持久化。
 */
export function recordBattle(room: BattleRoom): void {
  // 至少一方是正式账号才永久保存；纯游客对局不落库。
  const hasRegistered = room.players.some((p) => p.userId);
  if (!hasRegistered) return;

  const [a, b] = room.players;
  const winner = room.players.find((p) => p.id === room.winnerId);
  // 胜者若是正式账号记 userId，否则记 playerId（游客）
  const winnerId = winner ? (winner.userId ?? winner.id) : null;

  insertBattle({
    id: room.id,
    player1: toHistoryPlayer(a),
    player2: toHistoryPlayer(b),
    winnerId,
    isDraw: room.isDraw,
    createdAt: new Date(room.createdAt).toISOString(),
    battleLog: room.log,
  });
}

function toHistoryPlayer(p: PlayerState): HistoryPlayer {
  return {
    userId: p.userId,
    account: p.account,
    nickname: p.name,
    avatar: p.avatar,
  };
}
