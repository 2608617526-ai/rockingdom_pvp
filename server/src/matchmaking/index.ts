import type { PlayerState } from '../types';

/**
 * 极简匹配队列：1v1，任意时刻最多一个等待中的玩家。
 */
export class MatchmakingQueue {
  private waiting: PlayerState | null = null;

  /** 加入队列；若有对手则返回对手，否则入队返回 null */
  join(player: PlayerState): PlayerState | null {
    if (this.waiting && this.waiting.id !== player.id) {
      const opponent = this.waiting;
      this.waiting = null;
      return opponent;
    }
    this.waiting = player;
    return null;
  }

  leave(playerId: string): void {
    if (this.waiting?.id === playerId) {
      this.waiting = null;
    }
  }

  has(playerId: string): boolean {
    return this.waiting?.id === playerId;
  }
}
