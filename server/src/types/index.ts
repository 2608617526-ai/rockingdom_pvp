import type {
  BattleAction,
  BattleEvent,
  BattlePhase,
  GameOverReason,
  PassiveState,
  PetDefinition,
  PetStatus,
} from '@rockingdom/shared';

/** 服务端运行时宠物实例 */
export interface PetInstance {
  instanceId: string;
  def: PetDefinition;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  status: PetStatus;
  passive: PassiveState;
}

/** 服务端运行时玩家状态 */
export interface PlayerState {
  id: string;
  socketId: string | null;
  name: string;
  /** 正式账号 userId；游客为 null */
  userId: string | null;
  /** 6 位账号（游客为空） */
  account: string;
  /** 头像 URL */
  avatar: string;
  isGuest: boolean;
  pets: PetInstance[];
  /** 当前出战宠物实例 id */
  activePetId: string | null;
  /** 已选择的首发宠物定义 id */
  selectedStarter: string | null;
  /** 本回合已提交的行动 */
  currentAction: BattleAction | null;
  ready: boolean;
  connected: boolean;
}

/** 战斗房间（全部暂存于内存） */
export interface BattleRoom {
  id: string;
  players: PlayerState[];
  turn: number;
  phase: BattlePhase;
  winnerId: string | null;
  isDraw: boolean;
  forcedSwitchPlayerIds: string[];
  createdAt: number;
  /** 整场战斗累积的日志（用于持久化历史对局） */
  log: BattleEvent[];
  /** 战斗结束原因（结算时写入，用于通知客户端） */
  endReason?: GameOverReason;
}

export type { BattleAction, BattlePhase };
