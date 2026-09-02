/**
 * 共享类型定义 —— 前后端通信契约 + 游戏核心数据结构。
 * 所有文件都可以从这里 import，保证类型一致。
 */

// ==============================
// 属性（元素）
// ==============================
export type ElementType = 'FIRE' | 'WATER' | 'GRASS';

// ==============================
// 技能
// ==============================
export type SkillType = 'ATTACK' | 'DEFENSE' | 'STATUS';
export type AttackType = 'PHYSICAL' | 'MAGICAL';

export interface SkillDefinition {
  id: string;
  name: string;
  type: SkillType;
  /** 仅攻击技能有 */
  attackType?: AttackType;
  /** 攻击技能用于属性克制判断；防御/状态技能若有属性归属（如火系防御技）也用于火系技能计数 */
  element?: ElementType;
  /** 仅攻击技能有：基础威力 */
  power?: number;
  /** 基础能耗（能量消耗） */
  cost: number;
  description: string;
}

// ==============================
// 宠物
// ==============================
export type PetId = 'fire' | 'water' | 'grass';

export interface PetStats {
  maxHp: number;
  physicalAttack: number;
  physicalDefense: number;
  magicAttack: number;
  magicDefense: number;
  speed: number;
}

export interface PetDefinition {
  id: PetId;
  name: string;
  element: ElementType;
  baseStats: PetStats;
  initialEnergy: number;
  maxEnergy: number;
  passiveName: string;
  passiveDescription: string;
  skillIds: string[];
}

// ==============================
// 战斗特性（被动）运行状态
// ==============================
export interface PassiveState {
  /** 烈火战神：每使用一次技能 +0.3，物攻 = 基础物攻 × multiplier */
  attackBoostMultiplier: number;
  /** 烈火战神：吹火威力每次使用 +20 */
  fireBlowPowerBonus: number;
  /** 烈火战神：山火威力每次其他火系技能 ×2 */
  mountainFireMultiplier: number;
  /** 武斗酷猫：每回复一次能量 +1，下次攻击消耗 */
  nextAttackBonusStacks: number;
  /** 圣水守护：每使用一次技能 +2，下次技能消耗 */
  skillCostReduction: number;
  /** 圣水守护：魔法攻击倍率（润泽 → 2.7，水泡盾 ×1.7） */
  magicAttackMultiplier: number;
  /** 圣水守护：润泽是否已生效（每场战斗仅一次） */
  moistureApplied: boolean;
  /** 圣水守护：天洪能耗是否已永久降为 1 */
  tianhongCostReduced: boolean;
}

// ==============================
// 战斗行动
// ==============================
export type BattleActionType = 'SKILL' | 'SWITCH' | 'FLEE';

export interface BattleAction {
  type: BattleActionType;
  /** type === 'SKILL' 时的技能 id */
  skillId?: string;
  /** type === 'SWITCH' 时要换上的宠物实例 id */
  targetInstanceId?: string;
}

// ==============================
// 战斗阶段
// ==============================
export type BattlePhase =
  | 'STARTER_SELECTION'
  | 'BATTLE'
  | 'FORCED_SWITCH'
  | 'GAME_OVER';

// ==============================
// 运行时宠物状态（发送给客户端）
// ==============================
export type PetStatus = 'ACTIVE' | 'BENCHED' | 'DEFEATED';

export interface PetView {
  instanceId: string;
  petId: PetId;
  name: string;
  element: ElementType;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  status: PetStatus;
  /** 当前（可能被增益后的）物攻/魔攻 */
  physicalAttack: number;
  physicalDefense: number;
  magicAttack: number;
  magicDefense: number;
  speed: number;
  passive: PassiveState;
}

export interface PlayerView {
  id: string;
  name: string;
  pets: PetView[];
  activePetInstanceId: string | null;
  hasSelectedStarter: boolean;
  actionSubmitted: boolean;
}

export interface BattleStateView {
  roomId: string;
  phase: BattlePhase;
  turn: number;
  /** 以“当前查看者”视角给出的自身状态 */
  self: PlayerView;
  /** 对手状态 */
  opponent: PlayerView;
  winnerId: string | null;
  winnerName: string | null;
  isDraw: boolean;
  /** 当前需要强制换宠的玩家 id 列表 */
  forcedSwitchPlayerIds: string[];
  message: string | null;
}

// ==============================
// 战斗事件（用于战斗日志 + 动画表现）
// ==============================
export type BattleEventType =
  | 'TURN_START'
  | 'FLEE'
  | 'SWITCH'
  | 'ATTACK'
  | 'DEFENSE'
  | 'STATUS'
  | 'DAMAGE'
  | 'HEAL'
  | 'ENERGY'
  | 'BUFF'
  | 'DEATH'
  | 'COUNTER'
  | 'FORCED_SWITCH'
  | 'VICTORY';

export interface BattleEvent {
  type: BattleEventType;
  actorId?: string;
  targetId?: string;
  actorName?: string;
  targetName?: string;
  petName?: string;
  skillName?: string;
  /** 伤害 / 回复 / 能量变化的数值（正值） */
  value?: number;
  /** 面向玩家的一行日志文本 */
  description: string;
}

// ==============================
// Socket 事件载荷
// ==============================
export interface QueueMatchedPayload {
  roomId: string;
  playerId: string;
  opponentName: string;
  state: BattleStateView;
}

export interface TurnResultPayload {
  turn: number;
  events: BattleEvent[];
  state: BattleStateView;
}

export interface ForceSwitchPayload {
  playerId: string;
  state: BattleStateView;
}

export interface GameOverPayload {
  winnerId: string | null;
  winnerName: string | null;
  isDraw: boolean;
  state: BattleStateView;
}

export interface ErrorPayload {
  message: string;
  code?: string;
}
