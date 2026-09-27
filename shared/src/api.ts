/**
 * 账号 / 历史对局相关的共享类型 —— 前后端 API 契约。
 */
import type { BattleEvent } from './types';

/** 登录 / 注册返回的正式账号信息（不含任何敏感字段） */
export interface AuthUser {
  id: string;
  account: string;
  nickname: string;
  avatar: string;
}

/** 历史对局中的一名玩家快照 */
export interface HistoryPlayer {
  /** 正式账号 userId；游客为 null */
  userId: string | null;
  account: string;
  nickname: string;
  avatar: string;
}

export type HistoryResult = 'win' | 'lose' | 'draw';

/** 历史对局列表项（已转换为“当前用户视角”） */
export interface HistoryBattleSummary {
  id: string;
  opponent: HistoryPlayer;
  result: HistoryResult;
  createdAt: string;
}

/** 单场对局详情（原始 player1/player2 顺序，客户端按当前用户视角再排版） */
export interface HistoryBattleDetail {
  id: string;
  player1: HistoryPlayer;
  player2: HistoryPlayer;
  winnerId: string | null;
  isDraw: boolean;
  createdAt: string;
  battleLog: BattleEvent[];
}
