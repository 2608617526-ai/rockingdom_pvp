import type { BattleEvent, HistoryPlayer } from '@rockingdom/shared';
import { getDb } from './index';

export interface BattleRow {
  id: string;
  p1_user_id: string | null;
  p1_account: string;
  p1_nickname: string;
  p1_avatar: string;
  p2_user_id: string | null;
  p2_account: string;
  p2_nickname: string;
  p2_avatar: string;
  winner_id: string | null;
  is_draw: number;
  created_at: string;
  battle_log: string;
}

export interface NewBattle {
  id: string;
  player1: HistoryPlayer;
  player2: HistoryPlayer;
  winnerId: string | null;
  isDraw: boolean;
  createdAt: string;
  battleLog: BattleEvent[];
}

export function insertBattle(b: NewBattle): void {
  getDb()
    .prepare(
      `INSERT INTO battles (
         id, p1_user_id, p1_account, p1_nickname, p1_avatar,
         p2_user_id, p2_account, p2_nickname, p2_avatar,
         winner_id, is_draw, created_at, battle_log
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      b.id,
      b.player1.userId,
      b.player1.account,
      b.player1.nickname,
      b.player1.avatar,
      b.player2.userId,
      b.player2.account,
      b.player2.nickname,
      b.player2.avatar,
      b.winnerId,
      b.isDraw ? 1 : 0,
      b.createdAt,
      JSON.stringify(b.battleLog),
    );
}

export function listBattlesForUser(userId: string): BattleRow[] {
  return getDb()
    .prepare(
      'SELECT * FROM battles WHERE p1_user_id = ? OR p2_user_id = ? ORDER BY created_at DESC',
    )
    .all(userId, userId) as unknown as BattleRow[];
}

export function getBattleById(id: string): BattleRow | undefined {
  return getDb()
    .prepare('SELECT * FROM battles WHERE id = ?')
    .get(id) as BattleRow | undefined;
}
