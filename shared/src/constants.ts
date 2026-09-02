/**
 * 所有战斗相关的可调数值常量集中管理。
 * 修改这里即可统一调整战斗平衡。
 */

// ---- 伤害公式 ----
export const DAMAGE_NUMERATOR = 37;
export const DAMAGE_DENOMINATOR = 41;

// ---- 防御 ----
/** 防御技能减伤 70% => 实际受到 30% 伤害 */
export const DEFENSE_REDUCTION = 0.3;

// ---- 能量 ----
/** 聚能回复的能量点数 */
export const ENERGY_CHARGE_AMOUNT = 5;
/** 光合作用回复的能量点数 */
export const PHOTOSYNTHESIS_ENERGY = 3;

// ---- 烈火战神 ----
/** 每使用一次技能，物攻倍率增加 30%（基于基础值） */
export const FIRE_ATTACK_BOOST_PER_SKILL = 0.3;
/** 吹火：每次使用自身威力 +20 */
export const FIRE_BLOW_POWER_GROWTH = 20;
/** 山火：每次其他火系技能使用，威力 ×2 */
export const MOUNTAIN_FIRE_MULTIPLIER = 2;
/** 火焰护盾：反伤灼烧 = 防御方最大生命值 10% */
export const FIRE_SHIELD_BURN_RATIO = 0.1;

// ---- 武斗酷猫 ----
/** 每回复一次能量，下次攻击伤害 +20%（可叠加） */
export const GRASS_NEXT_ATTACK_BONUS = 0.2;
/** 酶浓度调整：应对攻击时回复最大生命值 20% */
export const ENZYME_HEAL_RATIO = 0.2;
/** 光合作用：回复最大生命值 20% */
export const PHOTOSYNTHESIS_HEAL_RATIO = 0.2;
/** 筛管奔流：生命值高于最大生命值 80% 时触发 */
export const SIEVE_FLOW_HP_THRESHOLD = 0.8;
/** 筛管奔流：满足条件时额外增加的威力 */
export const SIEVE_FLOW_BONUS_POWER = 60;

// ---- 圣水守护 ----
/** 每使用一次技能，下次技能能耗 -2 */
export const WATER_COST_REDUCTION_PER_SKILL = 2;
/** 润泽：魔法攻击提升至基础值的 270%（×2.7） */
export const MOISTURE_MAGIC_MULTIPLIER = 2.7;
/** 水泡盾：应对攻击时魔法攻击 ×1.7 */
export const BUBBLE_SHIELD_MAGIC_MULTIPLIER = 1.7;
/** 天洪：应对状态技能后能耗永久降为 1 */
export const DELUGE_REDUCED_COST = 1;

// ---- 断线 ----
/** 战斗中断线宽限时间（毫秒），超时判定失败 */
export const DISCONNECT_GRACE_MS = 10000;
