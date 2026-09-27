import { Router } from 'express';
import type { BattleEvent, HistoryBattleDetail, HistoryBattleSummary } from '@rockingdom/shared';
import { getBattleById, listBattlesForUser, type BattleRow } from '../db/battles';
import { requireAuth, type AuthedRequest } from '../middleware/auth';

function player1(row: BattleRow) {
  return {
    userId: row.p1_user_id,
    account: row.p1_account,
    nickname: row.p1_nickname,
    avatar: row.p1_avatar,
  };
}

function player2(row: BattleRow) {
  return {
    userId: row.p2_user_id,
    account: row.p2_account,
    nickname: row.p2_nickname,
    avatar: row.p2_avatar,
  };
}

export function setupBattleRoutes(): Router {
  const router = Router();

  // 当前用户的历史对局（已转换为当前用户视角）
  router.get('/history', requireAuth, (req, res) => {
    const userId = (req as AuthedRequest).userId as string;
    const rows = listBattlesForUser(userId);
    const battles: HistoryBattleSummary[] = rows.map((row) => {
      const isP1 = row.p1_user_id === userId;
      const opponent = isP1 ? player2(row) : player1(row);
      const result = row.is_draw ? 'draw' : row.winner_id === userId ? 'win' : 'lose';
      return { id: row.id, opponent, result, createdAt: row.created_at };
    });
    const wins = battles.filter((b) => b.result === 'win').length;
    res.json({ success: true, battles, total: battles.length, wins });
  });

  // 单场详情（必须属于当前用户，否则 403）
  router.get('/:id', requireAuth, (req, res) => {
    const userId = (req as AuthedRequest).userId as string;
    const row = getBattleById(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: '对局不存在' });
    }
    if (row.p1_user_id !== userId && row.p2_user_id !== userId) {
      return res.status(403).json({ success: false, message: '无权查看该对局' });
    }
    let battleLog: BattleEvent[] = [];
    try {
      battleLog = JSON.parse(row.battle_log) as BattleEvent[];
    } catch {
      battleLog = [];
    }
    const battle: HistoryBattleDetail = {
      id: row.id,
      player1: player1(row),
      player2: player2(row),
      winnerId: row.winner_id,
      isDraw: !!row.is_draw,
      createdAt: row.created_at,
      battleLog,
    };
    res.json({ success: true, battle });
  });

  return router;
}
