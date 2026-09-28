// src/index.ts
import { mkdirSync as mkdirSync3 } from "fs";
import { resolve as resolve3 } from "path";
import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";

// src/config.ts
import "dotenv/config";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
var here = dirname(fileURLToPath(import.meta.url));
var config = {
  port: Number(process.env.PORT ?? 3e3),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV ?? "development",
  dataDir: process.env.DATA_DIR ?? resolve(here, "..", "data"),
  uploadsDir: process.env.UPLOADS_DIR ?? resolve(here, "..", "uploads"),
  dbPath: process.env.DB_PATH ?? resolve(here, "..", "data", "game.db")
};

// ../shared/src/constants.ts
var DAMAGE_NUMERATOR = 37;
var DAMAGE_DENOMINATOR = 41;
var DEFENSE_REDUCTION = 0.3;
var ENERGY_CHARGE_AMOUNT = 5;
var PHOTOSYNTHESIS_ENERGY = 3;
var FIRE_ATTACK_BOOST_PER_SKILL = 0.3;
var FIRE_BLOW_POWER_GROWTH = 20;
var MOUNTAIN_FIRE_MULTIPLIER = 2;
var FIRE_SHIELD_BURN_RATIO = 0.1;
var GRASS_NEXT_ATTACK_BONUS = 0.2;
var ENZYME_HEAL_RATIO = 0.2;
var PHOTOSYNTHESIS_HEAL_RATIO = 0.2;
var SIEVE_FLOW_HP_THRESHOLD = 0.8;
var SIEVE_FLOW_BONUS_POWER = 60;
var WATER_COST_REDUCTION_PER_SKILL = 2;
var MOISTURE_MAGIC_MULTIPLIER = 2.7;
var BUBBLE_SHIELD_MAGIC_MULTIPLIER = 1.7;
var DELUGE_COST_REDUCTION_PER_COUNTER = 6;
var DEFAULT_AVATAR = "/assets/avatar/default-pig.svg";

// ../shared/src/logic.ts
function createInitialPassiveState() {
  return {
    attackBoostMultiplier: 1,
    magicAttackMultiplier: 1,
    fireBlowPowerBonus: 0,
    mountainFireMultiplier: 1,
    nextAttackBonusStacks: 0,
    nextSkillCostReduction: 0,
    heavenlyFloodCostReduction: 0,
    moistureApplied: false
  };
}
function getActualSkillCost(petId, skill, passive) {
  let cost = skill.cost;
  if (skill.id === "deluge") {
    cost -= passive.heavenlyFloodCostReduction;
  }
  if (petId === "water") {
    cost -= passive.nextSkillCostReduction;
  }
  return Math.max(0, cost);
}

// ../shared/src/validation.ts
function isSixDigitAccount(value) {
  return /^\d{6}$/.test(value);
}
function validatePassword(password) {
  const missing = [];
  if (!/[A-Z]/.test(password)) missing.push("\u5927\u5199\u5B57\u6BCD");
  if (!/[a-z]/.test(password)) missing.push("\u5C0F\u5199\u5B57\u6BCD");
  if (!/\d/.test(password)) missing.push("\u6570\u5B57");
  if (!/[^A-Za-z0-9]/.test(password)) missing.push("\u7279\u6B8A\u5B57\u7B26");
  if (missing.length === 0) return { ok: true, message: "" };
  return { ok: false, message: `\u5BC6\u7801\u8FD8\u9700\u5305\u542B\uFF1A${missing.join("\u3001")}` };
}
function validateNickname(nickname) {
  const len = Array.from(nickname.trim()).length;
  if (len < 2) return { ok: false, message: "\u6635\u79F0\u81F3\u5C11 2 \u4E2A\u5B57\u7B26" };
  if (len > 12) return { ok: false, message: "\u6635\u79F0\u6700\u591A 12 \u4E2A\u5B57\u7B26" };
  return { ok: true, message: "" };
}

// ../shared/src/data/elements.ts
var TYPE_CHART = {
  FIRE: { GRASS: 2 },
  GRASS: { WATER: 2 },
  WATER: { FIRE: 2 }
};
function getTypeMultiplier(attack, defender) {
  if (!attack) return 1;
  return TYPE_CHART[attack]?.[defender] ?? 1;
}

// ../shared/src/data/pets.ts
var PET_DEFINITIONS = {
  fire: {
    id: "fire",
    name: "\u70C8\u706B\u6218\u795E",
    element: "FIRE",
    baseStats: {
      maxHp: 400,
      physicalAttack: 173,
      physicalDefense: 100,
      magicAttack: 0,
      magicDefense: 100,
      speed: 130
    },
    initialEnergy: 10,
    maxEnergy: 10,
    passiveName: "\u70BD\u70ED\u6218\u610F",
    passiveDescription: "\u6BCF\u6B21\u4F7F\u7528\u6280\u80FD\u540E\uFF0C\u7269\u7406\u653B\u51FB\u529B\u63D0\u9AD8 30%\u3002",
    skillIds: ["fire_blow", "fire_cart", "fire_shield", "mountain_fire", "charge"]
  },
  water: {
    id: "water",
    name: "\u5723\u6C34\u5B88\u62A4",
    element: "WATER",
    baseStats: {
      maxHp: 600,
      physicalAttack: 0,
      physicalDefense: 150,
      magicAttack: 130,
      magicDefense: 150,
      speed: 65
    },
    initialEnergy: 10,
    maxEnergy: 10,
    passiveName: "\u8282\u80FD\u65BD\u6CD5",
    passiveDescription: "\u6BCF\u6B21\u4F7F\u7528\u6280\u80FD\u540E\uFF0C\u4E0B\u4E00\u6B21\u6280\u80FD\u7684\u80FD\u91CF\u6D88\u8017\u964D\u4F4E 2 \u70B9\uFF0C\u6700\u4F4E\u4E0D\u4F1A\u4F4E\u4E8E 0\u3002",
    skillIds: ["moisture", "bubble_shield", "deluge", "bubble", "charge"]
  },
  grass: {
    id: "grass",
    name: "\u6B66\u6597\u9177\u732B",
    element: "GRASS",
    baseStats: {
      maxHp: 500,
      physicalAttack: 150,
      physicalDefense: 120,
      magicAttack: 0,
      magicDefense: 120,
      speed: 135
    },
    initialEnergy: 10,
    maxEnergy: 10,
    passiveName: "\u81EA\u7136\u4E4B\u529B",
    passiveDescription: "\u6BCF\u6B21\u6062\u590D 1 \u70B9\u80FD\u91CF\u540E\uFF0C\u4E0B\u4E00\u6B21\u653B\u51FB\u6280\u80FD\u4F24\u5BB3\u63D0\u9AD8 20%\u3002\u5982\u679C\u4E0B\u4E00\u56DE\u5408\u6CA1\u6709\u4F7F\u7528\u653B\u51FB\u6280\u80FD\uFF0C\u6548\u679C\u4E0D\u4F1A\u6D88\u5931\u3002",
    skillIds: ["sieve_flow", "enzyme", "cactus", "photosynthesis", "charge"]
  }
};
var PET_LIST = [
  PET_DEFINITIONS.fire,
  PET_DEFINITIONS.water,
  PET_DEFINITIONS.grass
];

// ../shared/src/data/skills.ts
var SKILL_DEFINITIONS = {
  // ============ 烈火战神 ============
  fire_blow: {
    id: "fire_blow",
    name: "\u5439\u706B",
    type: "ATTACK",
    attackType: "PHYSICAL",
    element: "FIRE",
    power: 60,
    cost: 1,
    description: "\u9020\u6210\u7269\u7406\u4F24\u5BB3\u3002\u6BCF\u4F7F\u7528\u4E00\u6B21\uFF0C\u8BE5\u6280\u80FD\u81EA\u8EAB\u5A01\u529B\u6C38\u4E45 +20\u3002"
  },
  fire_cart: {
    id: "fire_cart",
    name: "\u706B\u4E91\u8F66",
    type: "ATTACK",
    attackType: "PHYSICAL",
    element: "FIRE",
    power: 140,
    cost: 5,
    description: "\u9020\u6210\u5927\u91CF\u7269\u7406\u4F24\u5BB3\uFF0C\u65E0\u989D\u5916\u6548\u679C\u3002"
  },
  fire_shield: {
    id: "fire_shield",
    name: "\u706B\u7130\u62A4\u76FE",
    type: "DEFENSE",
    element: "FIRE",
    cost: 2,
    description: "\u672C\u56DE\u5408\u51CF\u4F24 70%\u3002\u82E5\u5BF9\u65B9\u672C\u56DE\u5408\u4F7F\u7528\u653B\u51FB\u6280\u80FD\uFF0C\u5BF9\u65B9\u53D7\u5230\u81EA\u8EAB\u6700\u5927\u751F\u547D\u503C 10% \u7684\u707C\u70E7\u4F24\u5BB3\u3002"
  },
  mountain_fire: {
    id: "mountain_fire",
    name: "\u5C71\u706B",
    type: "ATTACK",
    attackType: "PHYSICAL",
    element: "FIRE",
    power: 30,
    cost: 3,
    description: "\u521D\u59CB\u5A01\u529B 30\u3002\u6BCF\u4F7F\u7528\u4E00\u6B21\u5176\u4ED6\u706B\u7CFB\u6280\u80FD\uFF0C\u8BE5\u6280\u80FD\u5A01\u529B\u7FFB\u500D\uFF08\u6301\u7EED\u6574\u573A\u6218\u6597\uFF09\u3002"
  },
  // ============ 武斗酷猫 ============
  sieve_flow: {
    id: "sieve_flow",
    name: "\u7B5B\u7BA1\u5954\u6D41",
    type: "ATTACK",
    attackType: "PHYSICAL",
    element: "GRASS",
    power: 80,
    cost: 3,
    description: "\u82E5\u5F53\u524D\u751F\u547D\u503C\u4E25\u683C\u9AD8\u4E8E\u6700\u5927\u751F\u547D\u503C\u7684 80%\uFF0C\u5A01\u529B +60\uFF08\u8FBE\u5230 140\uFF09\u3002"
  },
  enzyme: {
    id: "enzyme",
    name: "\u9176\u6D53\u5EA6\u8C03\u6574",
    type: "DEFENSE",
    element: "GRASS",
    cost: 2,
    description: "\u672C\u56DE\u5408\u51CF\u4F24 70%\u3002\u82E5\u5BF9\u65B9\u672C\u56DE\u5408\u4F7F\u7528\u653B\u51FB\u6280\u80FD\uFF0C\u81EA\u8EAB\u56DE\u590D\u6700\u5927\u751F\u547D\u503C 20%\u3002"
  },
  cactus: {
    id: "cactus",
    name: "\u4ED9\u4EBA\u638C\u523A\u51FB",
    type: "ATTACK",
    attackType: "PHYSICAL",
    element: "GRASS",
    power: 155,
    cost: 6,
    description: "\u9020\u6210\u6781\u9AD8\u7269\u7406\u4F24\u5BB3\uFF0C\u65E0\u989D\u5916\u6548\u679C\u3002"
  },
  photosynthesis: {
    id: "photosynthesis",
    name: "\u5149\u5408\u4F5C\u7528",
    type: "STATUS",
    element: "GRASS",
    cost: 0,
    description: "\u56DE\u590D\u6700\u5927\u751F\u547D\u503C 20%\uFF0C\u5E76\u56DE\u590D 3 \u70B9\u80FD\u91CF\u3002"
  },
  // ============ 圣水守护 ============
  moisture: {
    id: "moisture",
    name: "\u6DA6\u6CFD",
    type: "STATUS",
    element: "WATER",
    cost: 0,
    description: "\u9B54\u6CD5\u653B\u51FB\u63D0\u5347\u81F3\u57FA\u7840\u503C\u7684 270%\uFF08\u6BCF\u573A\u6218\u6597\u4EC5\u53EF\u751F\u6548\u4E00\u6B21\uFF09\u3002"
  },
  bubble_shield: {
    id: "bubble_shield",
    name: "\u6C34\u6CE1\u76FE",
    type: "DEFENSE",
    element: "WATER",
    cost: 2,
    description: "\u672C\u56DE\u5408\u51CF\u4F24 70%\u3002\u82E5\u6210\u529F\u5E94\u5BF9\u5BF9\u65B9\u653B\u51FB\uFF0C\u81EA\u8EAB\u9B54\u6CD5\u653B\u51FB\u63D0\u5347 70%\u3002"
  },
  deluge: {
    id: "deluge",
    name: "\u5929\u6D2A",
    type: "ATTACK",
    attackType: "MAGICAL",
    element: "WATER",
    power: 140,
    cost: 7,
    description: "\u82E5\u5BF9\u65B9\u672C\u56DE\u5408\u4F7F\u7528\u72B6\u6001\u7C7B\u6280\u80FD\uFF0C\u5219\u5148\u624B\u653B\u51FB\uFF0C\u4E14\u5929\u6D2A\u81EA\u8EAB\u80FD\u8017\u6C38\u4E45\u51CF\u5C11 6\uFF08\u53EF\u53E0\u52A0\uFF0C\u6700\u4F4E\u4E3A 0\uFF09\u3002"
  },
  bubble: {
    id: "bubble",
    name: "\u6C14\u6CE1",
    type: "ATTACK",
    attackType: "MAGICAL",
    element: "WATER",
    power: 100,
    cost: 3,
    description: "\u9020\u6210\u9B54\u6CD5\u4F24\u5BB3\u3002"
  },
  // ============ 通用 ============
  charge: {
    id: "charge",
    name: "\u805A\u80FD",
    type: "STATUS",
    cost: 0,
    description: "\u56DE\u590D 5 \u70B9\u80FD\u91CF\uFF08\u4E0D\u8D85\u8FC7\u4E0A\u9650\uFF09\u3002"
  }
};
var SKILL_LIST = Object.values(SKILL_DEFINITIONS);

// src/battle/state.ts
function createPetInstances(defs, ownerId) {
  return defs.map((def) => ({
    instanceId: `${ownerId}:${def.id}`,
    def,
    hp: def.baseStats.maxHp,
    maxHp: def.baseStats.maxHp,
    energy: def.initialEnergy,
    maxEnergy: def.maxEnergy,
    status: "BENCHED",
    passive: createInitialPassiveState()
  }));
}
function createPlayerState(id, socketId, name, user = null) {
  return {
    id,
    socketId,
    name,
    userId: user?.userId ?? null,
    account: user?.account ?? "",
    avatar: user?.avatar ?? DEFAULT_AVATAR,
    isGuest: !user,
    pets: createPetInstances(PET_LIST, id),
    activePetId: null,
    selectedStarter: null,
    currentAction: null,
    ready: false,
    connected: true
  };
}
function getActivePet(player) {
  return player.pets.find((p) => p.instanceId === player.activePetId);
}
function setActivePet(player, instanceId) {
  for (const p of player.pets) {
    if (p.instanceId === player.activePetId && p.status === "ACTIVE") {
      p.status = "BENCHED";
    }
  }
  player.activePetId = instanceId;
  const target = player.pets.find((p) => p.instanceId === instanceId);
  if (target) target.status = "ACTIVE";
}
function getPhysicalAttack(pet) {
  return pet.def.baseStats.physicalAttack * pet.passive.attackBoostMultiplier;
}
function getMagicAttack(pet) {
  return pet.def.baseStats.magicAttack * pet.passive.magicAttackMultiplier;
}

// src/battle/BattleEngine.ts
import { randomUUID } from "crypto";

// src/battle/priority.ts
function determineSkillOrder(a, b, skillIdA, skillIdB) {
  const skillA = SKILL_DEFINITIONS[skillIdA];
  const skillB = SKILL_DEFINITIONS[skillIdB];
  if (skillA?.type === "DEFENSE" && skillB?.type === "ATTACK") {
    return [
      { player: a, skillId: skillIdA },
      { player: b, skillId: skillIdB }
    ];
  }
  if (skillB?.type === "DEFENSE" && skillA?.type === "ATTACK") {
    return [
      { player: b, skillId: skillIdB },
      { player: a, skillId: skillIdA }
    ];
  }
  if (skillA?.id === "deluge" && skillB?.type === "STATUS") {
    return [
      { player: a, skillId: skillIdA },
      { player: b, skillId: skillIdB }
    ];
  }
  if (skillB?.id === "deluge" && skillA?.type === "STATUS") {
    return [
      { player: b, skillId: skillIdB },
      { player: a, skillId: skillIdA }
    ];
  }
  const speedA = getActivePet(a)?.def.baseStats.speed ?? 0;
  const speedB = getActivePet(b)?.def.baseStats.speed ?? 0;
  if (speedA > speedB) {
    return [
      { player: a, skillId: skillIdA },
      { player: b, skillId: skillIdB }
    ];
  }
  if (speedB > speedA) {
    return [
      { player: b, skillId: skillIdB },
      { player: a, skillId: skillIdA }
    ];
  }
  return [
    { player: a, skillId: skillIdA },
    { player: b, skillId: skillIdB }
  ];
}

// src/battle/damage.ts
function calculateDamage(attacker, defender, skill, defending) {
  const typeMult = getTypeMultiplier(skill.element, defender.def.element);
  let raw;
  if (skill.attackType === "MAGICAL") {
    raw = (skill.power ?? 0) * (getMagicAttack(attacker) / defender.def.baseStats.magicDefense) * typeMult * (DAMAGE_NUMERATOR / DAMAGE_DENOMINATOR);
  } else {
    raw = (skill.power ?? 0) * (getPhysicalAttack(attacker) / defender.def.baseStats.physicalDefense) * typeMult * (DAMAGE_NUMERATOR / DAMAGE_DENOMINATOR);
  }
  let damage = raw;
  if (attacker.def.id === "grass" && attacker.passive.nextAttackBonusStacks > 0) {
    damage *= 1 + GRASS_NEXT_ATTACK_BONUS * attacker.passive.nextAttackBonusStacks;
  }
  if (defending) {
    damage *= DEFENSE_REDUCTION;
  }
  return Math.max(1, Math.floor(damage));
}

// src/battle/passives.ts
function newTurnContext(events) {
  return { events, defending: {}, defenseSkillId: {} };
}
function applyAfterSkillPassives(pet, actor, skill, ctx) {
  if (pet.def.id === "fire") {
    pet.passive.attackBoostMultiplier += FIRE_ATTACK_BOOST_PER_SKILL;
    if (skill.id === "fire_blow") {
      pet.passive.fireBlowPowerBonus += FIRE_BLOW_POWER_GROWTH;
    }
    if (skill.element === "FIRE" && skill.id !== "mountain_fire") {
      pet.passive.mountainFireMultiplier *= MOUNTAIN_FIRE_MULTIPLIER;
    }
    ctx.events.push({
      type: "BUFF",
      actorId: actor.id,
      petName: pet.def.name,
      description: `${pet.def.name} \u7684\u7269\u7406\u653B\u51FB\u63D0\u5347\u4E86\uFF01`
    });
  }
  if (pet.def.id === "water") {
    pet.passive.nextSkillCostReduction += WATER_COST_REDUCTION_PER_SKILL;
  }
}
function onEnergyRestore(pet, actor, ctx) {
  if (pet.def.id === "grass") {
    pet.passive.nextAttackBonusStacks += 1;
    ctx.events.push({
      type: "BUFF",
      actorId: actor.id,
      petName: pet.def.name,
      description: `${pet.def.name} \u84C4\u529B\u5B8C\u6BD5\uFF0C\u4E0B\u4E00\u6B21\u653B\u51FB\u4F24\u5BB3\u63D0\u5347\uFF01`
    });
  }
}

// src/battle/effects.ts
function paySkillCost(pet, skill) {
  const cost = getActualSkillCost(pet.def.id, skill, pet.passive);
  if (pet.def.id === "water") {
    pet.passive.nextSkillCostReduction = 0;
  }
  pet.energy = Math.max(0, pet.energy - cost);
  return cost;
}
function fireBlowPower(pet) {
  return 60 + pet.passive.fireBlowPowerBonus;
}
function mountainFirePower(pet) {
  return 30 * pet.passive.mountainFireMultiplier;
}
function sieveFlowPower(pet) {
  const base = 80;
  if (pet.hp > pet.maxHp * SIEVE_FLOW_HP_THRESHOLD) {
    return base + SIEVE_FLOW_BONUS_POWER;
  }
  return base;
}
function effectivePower(pet, skill) {
  switch (skill.id) {
    case "fire_blow":
      return fireBlowPower(pet);
    case "mountain_fire":
      return mountainFirePower(pet);
    case "sieve_flow":
      return sieveFlowPower(pet);
    default:
      return skill.power ?? 0;
  }
}
function resolveSkill(actor, opponent, skillId, ctx) {
  const pet = getActivePet(actor);
  if (!pet || pet.status === "DEFEATED") return;
  const skill = SKILL_DEFINITIONS[skillId];
  if (!skill) return;
  if (skill.id === "deluge" && opponent.currentAction?.type === "SKILL") {
    const oppSkill = SKILL_DEFINITIONS[opponent.currentAction.skillId ?? ""];
    if (oppSkill?.type === "STATUS") {
      pet.passive.heavenlyFloodCostReduction += DELUGE_COST_REDUCTION_PER_COUNTER;
      ctx.events.push({
        type: "BUFF",
        actorId: actor.id,
        petName: pet.def.name,
        description: "\u5929\u6D2A\u6210\u529F\u5E94\u5BF9\u72B6\u6001\u6280\u80FD\uFF0C\u81EA\u8EAB\u80FD\u8017\u6C38\u4E45\u51CF\u5C11 6\uFF01"
      });
    }
  }
  const cost = paySkillCost(pet, skill);
  if (cost > 0) {
    ctx.events.push({
      type: "ENERGY",
      actorId: actor.id,
      petName: pet.def.name,
      value: cost,
      description: `${pet.def.name} \u6D88\u8017\u4E86 ${cost} \u70B9\u80FD\u91CF\u3002`
    });
  }
  if (skill.type === "ATTACK") {
    const targetPet = getActivePet(opponent);
    if (!targetPet) return;
    ctx.events.push({
      type: "ATTACK",
      actorId: actor.id,
      targetId: opponent.id,
      actorName: actor.name,
      targetName: opponent.name,
      petName: pet.def.name,
      skillName: skill.name,
      description: `${pet.def.name} \u4F7F\u7528\u4E86 ${skill.name}\uFF01`
    });
    const defending = !!ctx.defending[opponent.id];
    const dmg = calculateDamage(
      pet,
      targetPet,
      { ...skill, power: effectivePower(pet, skill) },
      defending
    );
    if (pet.def.id === "grass") {
      pet.passive.nextAttackBonusStacks = 0;
    }
    targetPet.hp = Math.max(0, targetPet.hp - dmg);
    ctx.events.push({
      type: "DAMAGE",
      actorId: actor.id,
      targetId: opponent.id,
      petName: targetPet.def.name,
      value: dmg,
      description: `${targetPet.def.name} \u53D7\u5230 ${dmg} \u70B9\u4F24\u5BB3\uFF01`
    });
    if (targetPet.hp <= 0) {
      targetPet.status = "DEFEATED";
      ctx.events.push({
        type: "DEATH",
        targetId: opponent.id,
        petName: targetPet.def.name,
        description: `${targetPet.def.name} \u5012\u4E0B\u4E86\uFF01`
      });
    }
    if (defending) {
      triggerDefenseCounter(opponent, ctx.defenseSkillId[opponent.id], actor, ctx);
    }
  } else if (skill.type === "DEFENSE") {
    ctx.defending[actor.id] = true;
    ctx.defenseSkillId[actor.id] = skill.id;
    ctx.events.push({
      type: "DEFENSE",
      actorId: actor.id,
      petName: pet.def.name,
      skillName: skill.name,
      description: `${pet.def.name} \u4F7F\u7528\u4E86 ${skill.name}\uFF0C\u8FDB\u5165\u9632\u5FA1\u59FF\u6001\uFF01`
    });
  } else {
    applyStatusEffect(pet, actor, skill, ctx);
  }
  applyAfterSkillPassives(pet, actor, skill, ctx);
}
function applyStatusEffect(pet, actor, skill, ctx) {
  ctx.events.push({
    type: "STATUS",
    actorId: actor.id,
    petName: pet.def.name,
    skillName: skill.name,
    description: `${pet.def.name} \u4F7F\u7528\u4E86 ${skill.name}\uFF01`
  });
  switch (skill.id) {
    case "charge": {
      const before = pet.energy;
      pet.energy = Math.min(pet.maxEnergy, pet.energy + ENERGY_CHARGE_AMOUNT);
      const restored = pet.energy - before;
      if (restored > 0) {
        ctx.events.push({
          type: "ENERGY",
          actorId: actor.id,
          petName: pet.def.name,
          value: restored,
          description: `${pet.def.name} \u56DE\u590D\u4E86 ${restored} \u70B9\u80FD\u91CF\uFF01`
        });
        onEnergyRestore(pet, actor, ctx);
      } else {
        ctx.events.push({
          type: "STATUS",
          actorId: actor.id,
          petName: pet.def.name,
          description: `${pet.def.name} \u4F7F\u7528\u4E86\u805A\u80FD\uFF0C\u4F46\u80FD\u91CF\u5DF2\u6EE1\u3002`
        });
      }
      break;
    }
    case "photosynthesis": {
      const beforeHp = pet.hp;
      pet.hp = Math.min(
        pet.maxHp,
        pet.hp + Math.floor(pet.maxHp * PHOTOSYNTHESIS_HEAL_RATIO)
      );
      const healed = pet.hp - beforeHp;
      if (healed > 0) {
        ctx.events.push({
          type: "HEAL",
          actorId: actor.id,
          petName: pet.def.name,
          value: healed,
          description: `${pet.def.name} \u56DE\u590D\u4E86 ${healed} \u70B9\u751F\u547D\uFF01`
        });
      }
      const beforeEnergy = pet.energy;
      pet.energy = Math.min(pet.maxEnergy, pet.energy + PHOTOSYNTHESIS_ENERGY);
      const restored = pet.energy - beforeEnergy;
      if (restored > 0) {
        ctx.events.push({
          type: "ENERGY",
          actorId: actor.id,
          petName: pet.def.name,
          value: restored,
          description: `${pet.def.name} \u56DE\u590D\u4E86 ${restored} \u70B9\u80FD\u91CF\uFF01`
        });
        onEnergyRestore(pet, actor, ctx);
      }
      break;
    }
    case "moisture": {
      if (!pet.passive.moistureApplied) {
        pet.passive.moistureApplied = true;
        pet.passive.magicAttackMultiplier = MOISTURE_MAGIC_MULTIPLIER;
        ctx.events.push({
          type: "BUFF",
          actorId: actor.id,
          petName: pet.def.name,
          description: `${pet.def.name} \u7684\u9B54\u6CD5\u653B\u51FB\u5927\u5E45\u63D0\u5347\uFF01`
        });
      } else {
        ctx.events.push({
          type: "STATUS",
          actorId: actor.id,
          petName: pet.def.name,
          description: `${pet.def.name} \u4F7F\u7528\u4E86\u6DA6\u6CFD\uFF0C\u4F46\u589E\u76CA\u5DF2\u5B58\u5728\u3002`
        });
      }
      break;
    }
    default:
      break;
  }
}
function triggerDefenseCounter(defender, defenseSkillId, attacker, ctx) {
  const defenderPet = getActivePet(defender);
  const attackerPet = getActivePet(attacker);
  if (!defenderPet || !attackerPet) return;
  ctx.events.push({
    type: "COUNTER",
    actorId: defender.id,
    petName: defenderPet.def.name,
    description: `${defenderPet.def.name} \u6210\u529F\u5E94\u5BF9\u4E86\u653B\u51FB\uFF01`
  });
  switch (defenseSkillId) {
    case "fire_shield": {
      const burn = Math.floor(defenderPet.maxHp * FIRE_SHIELD_BURN_RATIO);
      attackerPet.hp = Math.max(0, attackerPet.hp - burn);
      ctx.events.push({
        type: "DAMAGE",
        targetId: attacker.id,
        petName: attackerPet.def.name,
        value: burn,
        description: `${attackerPet.def.name} \u53D7\u5230\u707C\u70E7\u4F24\u5BB3 ${burn} \u70B9\uFF01`
      });
      if (attackerPet.hp <= 0) {
        attackerPet.status = "DEFEATED";
        ctx.events.push({
          type: "DEATH",
          targetId: attacker.id,
          petName: attackerPet.def.name,
          description: `${attackerPet.def.name} \u5012\u4E0B\u4E86\uFF01`
        });
      }
      break;
    }
    case "enzyme": {
      if (defenderPet.status !== "ACTIVE") break;
      const before = defenderPet.hp;
      defenderPet.hp = Math.min(
        defenderPet.maxHp,
        defenderPet.hp + Math.floor(defenderPet.maxHp * ENZYME_HEAL_RATIO)
      );
      const healed = defenderPet.hp - before;
      if (healed > 0) {
        ctx.events.push({
          type: "HEAL",
          actorId: defender.id,
          petName: defenderPet.def.name,
          value: healed,
          description: `${defenderPet.def.name} \u56DE\u590D\u4E86 ${healed} \u70B9\u751F\u547D\uFF01`
        });
      }
      break;
    }
    case "bubble_shield": {
      if (defenderPet.status !== "ACTIVE") break;
      defenderPet.passive.magicAttackMultiplier *= BUBBLE_SHIELD_MAGIC_MULTIPLIER;
      ctx.events.push({
        type: "BUFF",
        actorId: defender.id,
        petName: defenderPet.def.name,
        description: `${defenderPet.def.name} \u7684\u9B54\u6CD5\u653B\u51FB\u63D0\u5347\u4E86\uFF01`
      });
      break;
    }
    default:
      break;
  }
}

// src/battle/validation.ts
function validateAction(player, action) {
  if (!action || typeof action.type !== "string") {
    return { ok: false, reason: "\u975E\u6CD5\u884C\u52A8" };
  }
  switch (action.type) {
    case "SKILL":
      return validateSkillAction(player, action.skillId);
    case "SWITCH":
      return validateSwitchAction(player, action.targetInstanceId);
    default:
      return { ok: false, reason: "\u672A\u77E5\u884C\u52A8\u7C7B\u578B" };
  }
}
function validateSkillAction(player, skillId) {
  if (!skillId) return { ok: false, reason: "\u7F3A\u5C11\u6280\u80FD" };
  const pet = getActivePet(player);
  if (!pet) return { ok: false, reason: "\u5F53\u524D\u6CA1\u6709\u51FA\u6218\u5BA0\u7269" };
  if (pet.status === "DEFEATED") return { ok: false, reason: "\u5F53\u524D\u5BA0\u7269\u5DF2\u9635\u4EA1" };
  if (!pet.def.skillIds.includes(skillId)) {
    return { ok: false, reason: "\u8BE5\u6280\u80FD\u4E0D\u5C5E\u4E8E\u5F53\u524D\u5BA0\u7269" };
  }
  const skill = SKILL_DEFINITIONS[skillId];
  if (!skill) return { ok: false, reason: "\u672A\u77E5\u6280\u80FD" };
  const cost = getActualSkillCost(pet.def.id, skill, pet.passive);
  if (pet.energy < cost) return { ok: false, reason: "\u80FD\u91CF\u4E0D\u8DB3" };
  return { ok: true };
}
function validateSwitchAction(player, targetInstanceId) {
  if (!targetInstanceId) return { ok: false, reason: "\u7F3A\u5C11\u5207\u6362\u76EE\u6807" };
  const pet = player.pets.find((p) => p.instanceId === targetInstanceId);
  if (!pet) return { ok: false, reason: "\u76EE\u6807\u5BA0\u7269\u4E0D\u5B58\u5728" };
  if (pet.status === "DEFEATED") {
    return { ok: false, reason: "\u4E0D\u80FD\u5207\u6362\u5230\u5DF2\u9635\u4EA1\u7684\u5BA0\u7269" };
  }
  if (player.activePetId === targetInstanceId) {
    return { ok: false, reason: "\u8BE5\u5BA0\u7269\u5DF2\u5728\u573A\u4E0A" };
  }
  return { ok: true };
}

// src/battle/BattleEngine.ts
var BattleEngine = class {
  static createRoom(playerA, playerB) {
    return {
      id: randomUUID(),
      players: [playerA, playerB],
      turn: 0,
      phase: "STARTER_SELECTION",
      winnerId: null,
      isDraw: false,
      forcedSwitchPlayerIds: [],
      createdAt: Date.now(),
      log: []
    };
  }
  /** 双方都选完首发后，将首发宠物设为出战，进入第 1 回合 */
  static initializeBattle(room) {
    for (const p of room.players) {
      const starter = p.pets.find((pet) => pet.def.id === p.selectedStarter);
      if (starter) setActivePet(p, starter.instanceId);
    }
    room.turn = 1;
    room.phase = "BATTLE";
  }
  static selectStarter(room, playerId, petId) {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, reason: "\u73A9\u5BB6\u4E0D\u5B58\u5728" };
    if (room.phase !== "STARTER_SELECTION") {
      return { ok: false, reason: "\u5F53\u524D\u4E0D\u80FD\u9009\u62E9\u9996\u53D1" };
    }
    if (player.selectedStarter) {
      return { ok: false, reason: "\u5DF2\u7ECF\u9009\u62E9\u8FC7\u9996\u53D1\u5BA0\u7269" };
    }
    if (!player.pets.some((p) => p.def.id === petId)) {
      return { ok: false, reason: "\u65E0\u6548\u7684\u5BA0\u7269" };
    }
    player.selectedStarter = petId;
    player.ready = true;
    return { ok: true };
  }
  static chooseAction(room, playerId, action) {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, reason: "\u73A9\u5BB6\u4E0D\u5B58\u5728" };
    if (room.phase !== "BATTLE") return { ok: false, reason: "\u5F53\u524D\u4E0D\u662F\u884C\u52A8\u9636\u6BB5" };
    if (room.forcedSwitchPlayerIds.includes(playerId)) {
      return { ok: false, reason: "\u9700\u8981\u5148\u5207\u6362\u5BA0\u7269" };
    }
    if (player.currentAction) {
      return { ok: false, reason: "\u672C\u56DE\u5408\u5DF2\u9009\u62E9\u884C\u52A8" };
    }
    const result = validateAction(player, action);
    if (!result.ok) return result;
    player.currentAction = action;
    return { ok: true };
  }
  static confirmSwitch(room, playerId, targetInstanceId) {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, reason: "\u73A9\u5BB6\u4E0D\u5B58\u5728" };
    if (room.phase !== "FORCED_SWITCH") {
      return { ok: false, reason: "\u5F53\u524D\u4E0D\u9700\u8981\u5F3A\u5236\u6362\u5BA0" };
    }
    if (!room.forcedSwitchPlayerIds.includes(playerId)) {
      return { ok: false, reason: "\u4F60\u4E0D\u9700\u8981\u5F3A\u5236\u6362\u5BA0" };
    }
    const pet = player.pets.find((p) => p.instanceId === targetInstanceId);
    if (!pet) return { ok: false, reason: "\u76EE\u6807\u5BA0\u7269\u4E0D\u5B58\u5728" };
    if (pet.status === "DEFEATED") {
      return { ok: false, reason: "\u4E0D\u80FD\u5207\u6362\u5230\u5DF2\u9635\u4EA1\u7684\u5BA0\u7269" };
    }
    if (player.activePetId === targetInstanceId) {
      return { ok: false, reason: "\u8BE5\u5BA0\u7269\u5DF2\u5728\u573A\u4E0A" };
    }
    setActivePet(player, targetInstanceId);
    room.forcedSwitchPlayerIds = room.forcedSwitchPlayerIds.filter(
      (id) => id !== playerId
    );
    if (room.forcedSwitchPlayerIds.length === 0) {
      room.phase = "BATTLE";
      room.turn += 1;
    }
    return { ok: true };
  }
  static surrender(room, playerId) {
    const winner = room.players.find((p) => p.id !== playerId);
    room.phase = "GAME_OVER";
    room.winnerId = winner?.id ?? null;
    room.isDraw = false;
    room.endReason = "SURRENDER";
    return { winnerId: winner?.id ?? null };
  }
  /** 断线判负 */
  static handleDisconnect(room, playerId) {
    const winner = room.players.find((p) => p.id !== playerId);
    room.phase = "GAME_OVER";
    room.winnerId = winner?.id ?? null;
    room.isDraw = false;
    room.endReason = "DISCONNECT";
    return { winnerId: winner?.id ?? null };
  }
  static resolveTurn(room) {
    const events = [];
    const [a, b] = room.players;
    const actionA = a.currentAction;
    const actionB = b.currentAction;
    events.push({ type: "TURN_START", description: `\u7B2C ${room.turn} \u56DE\u5408` });
    const switchA = actionA?.type === "SWITCH";
    const switchB = actionB?.type === "SWITCH";
    if (switchA || switchB) {
      const ctx2 = newTurnContext(events);
      if (switchA && switchB) {
        const order = this.switchOrder(room);
        for (const p of order) {
          this.dispatchSwitch(room, p, p.currentAction.targetInstanceId, ctx2);
        }
      } else if (switchA) {
        this.dispatchSwitch(room, a, actionA.targetInstanceId, ctx2);
        if (actionB?.type === "SKILL") {
          resolveSkill(b, a, actionB.skillId, ctx2);
        }
      } else {
        this.dispatchSwitch(room, b, actionB.targetInstanceId, ctx2);
        if (actionA?.type === "SKILL") {
          resolveSkill(a, b, actionA.skillId, ctx2);
        }
      }
      return this.finalizeTurn(room, events);
    }
    const ctx = newTurnContext(events);
    const [first, second] = determineSkillOrder(
      a,
      b,
      actionA.skillId,
      actionB.skillId
    );
    resolveSkill(first.player, second.player, first.skillId, ctx);
    const secondPet = getActivePet(second.player);
    if (secondPet && secondPet.status !== "DEFEATED") {
      resolveSkill(second.player, first.player, second.skillId, ctx);
    } else {
      events.push({
        type: "FORCED_SWITCH",
        actorId: second.player.id,
        actorName: second.player.name,
        description: `${second.player.name} \u7684\u5BA0\u7269\u5DF2\u9635\u4EA1\uFF0C\u65E0\u6CD5\u7EE7\u7EED\u884C\u52A8\uFF01`
      });
    }
    return this.finalizeTurn(room, events);
  }
  /** 双方都切换时的顺序：速度高者先；平手时先加入者先 */
  static switchOrder(room) {
    const [a, b] = room.players;
    const speedA = getActivePet(a)?.def.baseStats.speed ?? 0;
    const speedB = getActivePet(b)?.def.baseStats.speed ?? 0;
    return speedA >= speedB ? [a, b] : [b, a];
  }
  static dispatchSwitch(_room, player, targetInstanceId, ctx) {
    const pet = player.pets.find((p) => p.instanceId === targetInstanceId);
    if (!pet) return;
    setActivePet(player, targetInstanceId);
    ctx.events.push({
      type: "SWITCH",
      actorId: player.id,
      actorName: player.name,
      petName: pet.def.name,
      description: `${player.name} \u6362\u4E0A\u4E86 ${pet.def.name}\uFF01`
    });
  }
  static finalizeTurn(room, events) {
    const needsSwitch = [];
    for (const p of room.players) {
      const active = getActivePet(p);
      if (active && active.status === "DEFEATED") {
        const hasLiving = p.pets.some((pet) => pet.status !== "DEFEATED");
        if (hasLiving) needsSwitch.push(p.id);
      }
    }
    const victory = this.checkVictory(room);
    if (victory.gameOver) {
      room.phase = "GAME_OVER";
      room.winnerId = victory.winnerId;
      room.isDraw = victory.isDraw;
      room.endReason = victory.isDraw ? "DRAW" : "DEFEAT";
      if (victory.isDraw) {
        events.push({ type: "VICTORY", description: "\u53CC\u65B9\u5168\u90E8\u5BA0\u7269\u9635\u4EA1\uFF0C\u5E73\u5C40\uFF01" });
      } else {
        const winner = room.players.find((p) => p.id === victory.winnerId);
        events.push({
          type: "VICTORY",
          actorId: winner?.id,
          actorName: winner?.name,
          description: `${winner?.name} \u83B7\u5F97\u4E86\u80DC\u5229\uFF01`
        });
      }
      return { events, gameOver: true };
    }
    for (const p of room.players) p.currentAction = null;
    if (needsSwitch.length > 0) {
      room.phase = "FORCED_SWITCH";
      room.forcedSwitchPlayerIds = needsSwitch;
      for (const id of needsSwitch) {
        const p = room.players.find((pl) => pl.id === id);
        events.push({
          type: "FORCED_SWITCH",
          actorId: id,
          actorName: p?.name,
          description: `${p?.name} \u9700\u8981\u9009\u62E9\u4E0B\u4E00\u53EA\u51FA\u6218\u5BA0\u7269\uFF01`
        });
      }
    } else {
      room.phase = "BATTLE";
      room.turn += 1;
    }
    return { events, gameOver: false };
  }
  static checkVictory(room) {
    const alive = room.players.map(
      (p) => p.pets.some((pet) => pet.status !== "DEFEATED")
    );
    if (!alive[0] && !alive[1]) {
      return { gameOver: true, winnerId: null, isDraw: true };
    }
    if (!alive[0]) {
      return { gameOver: true, winnerId: room.players[1].id, isDraw: false };
    }
    if (!alive[1]) {
      return { gameOver: true, winnerId: room.players[0].id, isDraw: false };
    }
    return { gameOver: false, winnerId: null, isDraw: false };
  }
};

// src/battle/serialize.ts
function buildStateView(room, viewerId) {
  const self = room.players.find((p) => p.id === viewerId) ?? room.players[0];
  const opp = room.players.find((p) => p.id !== self.id) ?? room.players[1];
  return {
    roomId: room.id,
    phase: room.phase,
    turn: room.turn,
    self: buildPlayerView(self),
    opponent: buildPlayerView(opp),
    winnerId: room.winnerId,
    winnerName: room.players.find((p) => p.id === room.winnerId)?.name ?? null,
    isDraw: room.isDraw,
    forcedSwitchPlayerIds: room.forcedSwitchPlayerIds,
    message: null
  };
}
function buildPlayerView(player) {
  return {
    id: player.id,
    name: player.name,
    pets: player.pets.map(buildPetView),
    activePetInstanceId: player.activePetId,
    hasSelectedStarter: !!player.selectedStarter,
    actionSubmitted: !!player.currentAction
  };
}
function buildPetView(pet) {
  return {
    instanceId: pet.instanceId,
    petId: pet.def.id,
    name: pet.def.name,
    element: pet.def.element,
    hp: pet.hp,
    maxHp: pet.maxHp,
    energy: pet.energy,
    maxEnergy: pet.maxEnergy,
    status: pet.status,
    physicalAttack: getPhysicalAttack(pet),
    physicalDefense: pet.def.baseStats.physicalDefense,
    magicAttack: getMagicAttack(pet),
    magicDefense: pet.def.baseStats.magicDefense,
    speed: pet.def.baseStats.speed,
    passive: pet.passive
  };
}

// src/matchmaking/index.ts
var MatchmakingQueue = class {
  waiting = null;
  /** 加入队列；若有对手则返回对手，否则入队返回 null */
  join(player) {
    if (this.waiting && this.waiting.id !== player.id) {
      const opponent = this.waiting;
      this.waiting = null;
      return opponent;
    }
    this.waiting = player;
    return null;
  }
  leave(playerId) {
    if (this.waiting?.id === playerId) {
      this.waiting = null;
    }
  }
  has(playerId) {
    return this.waiting?.id === playerId;
  }
};

// src/db/index.ts
import { mkdirSync } from "fs";
import { dirname as dirname2 } from "path";
var { DatabaseSync: DatabaseSyncCtor } = process.getBuiltinModule(
  "node:sqlite"
);
var db = null;
function initDatabase() {
  if (db) return db;
  mkdirSync(dirname2(config.dbPath), { recursive: true });
  const database = new DatabaseSyncCtor(config.dbPath);
  database.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      account       TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nickname      TEXT NOT NULL,
      avatar        TEXT NOT NULL,
      created_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS battles (
      id          TEXT PRIMARY KEY,
      p1_user_id  TEXT,
      p1_account  TEXT NOT NULL,
      p1_nickname TEXT NOT NULL,
      p1_avatar   TEXT NOT NULL,
      p2_user_id  TEXT,
      p2_account  TEXT NOT NULL,
      p2_nickname TEXT NOT NULL,
      p2_avatar   TEXT NOT NULL,
      winner_id   TEXT,
      is_draw     INTEGER NOT NULL,
      created_at  TEXT NOT NULL,
      battle_log  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_battles_p1 ON battles(p1_user_id);
    CREATE INDEX IF NOT EXISTS idx_battles_p2 ON battles(p2_user_id);
  `);
  db = database;
  return db;
}
function getDb() {
  if (!db) return initDatabase();
  return db;
}

// src/db/sessions.ts
function createSession(token, userId) {
  getDb().prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)").run(token, userId, (/* @__PURE__ */ new Date()).toISOString());
}
function findUserIdByToken(token) {
  const row = getDb().prepare("SELECT user_id FROM sessions WHERE token = ?").get(token);
  return row?.user_id ?? null;
}
function deleteSessionsForUser(userId) {
  getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

// src/db/users.ts
import { randomUUID as randomUUID2 } from "crypto";
function createUser(input) {
  const db2 = getDb();
  const id = randomUUID2();
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  db2.prepare(
    `INSERT INTO users (id, account, password_hash, nickname, avatar, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, input.account, input.passwordHash, input.nickname, input.avatar, createdAt);
  return {
    id,
    account: input.account,
    password_hash: input.passwordHash,
    nickname: input.nickname,
    avatar: input.avatar,
    created_at: createdAt
  };
}
function findUserByAccount(account) {
  return getDb().prepare("SELECT * FROM users WHERE account = ?").get(account);
}
function findUserById(id) {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id);
}

// src/db/battles.ts
function insertBattle(b) {
  getDb().prepare(
    `INSERT INTO battles (
         id, p1_user_id, p1_account, p1_nickname, p1_avatar,
         p2_user_id, p2_account, p2_nickname, p2_avatar,
         winner_id, is_draw, created_at, battle_log
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
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
    JSON.stringify(b.battleLog)
  );
}
function listBattlesForUser(userId) {
  return getDb().prepare(
    "SELECT * FROM battles WHERE p1_user_id = ? OR p2_user_id = ? ORDER BY created_at DESC"
  ).all(userId, userId);
}
function getBattleById(id) {
  return getDb().prepare("SELECT * FROM battles WHERE id = ?").get(id);
}

// src/history/index.ts
function recordBattle(room) {
  const hasRegistered = room.players.some((p) => p.userId);
  if (!hasRegistered) return;
  const [a, b] = room.players;
  const winner = room.players.find((p) => p.id === room.winnerId);
  const winnerId = winner ? winner.userId ?? winner.id : null;
  insertBattle({
    id: room.id,
    player1: toHistoryPlayer(a),
    player2: toHistoryPlayer(b),
    winnerId,
    isDraw: room.isDraw,
    createdAt: new Date(room.createdAt).toISOString(),
    battleLog: room.log
  });
}
function toHistoryPlayer(p) {
  return {
    userId: p.userId,
    account: p.account,
    nickname: p.name,
    avatar: p.avatar
  };
}

// src/socket/index.ts
var VALID_PLAYER_ID = /^[a-zA-Z0-9_-]{6,64}$/;
function setupSocket(io2) {
  const queue = new MatchmakingQueue();
  const rooms = /* @__PURE__ */ new Map();
  const playerToRoom = /* @__PURE__ */ new Map();
  const userIdToSocket = /* @__PURE__ */ new Map();
  const userIdToRoom = /* @__PURE__ */ new Map();
  function roomOf(playerId) {
    const roomId = playerToRoom.get(playerId);
    return roomId ? rooms.get(roomId) : void 0;
  }
  function emitState(room) {
    for (const p of room.players) {
      if (p.socketId) {
        io2.to(p.socketId).emit("battle:state", buildStateView(room, p.id));
      }
    }
  }
  function cleanupRoom(roomId) {
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
  function emitGameOver(room) {
    recordBattle(room);
    const winner = room.players.find((p) => p.id === room.winnerId);
    for (const p of room.players) {
      if (p.socketId) {
        const payload = {
          winnerId: room.winnerId,
          winnerName: winner?.name ?? null,
          isDraw: room.isDraw,
          reason: room.endReason,
          state: buildStateView(room, p.id)
        };
        io2.to(p.socketId).emit("battle:gameOver", payload);
      }
    }
  }
  function forfeitPlayer(playerId) {
    const room = roomOf(playerId);
    if (!room || room.phase === "GAME_OVER") return;
    BattleEngine.handleDisconnect(room, playerId);
    const winner = room.players.find((p) => p.id === room.winnerId);
    const loser = room.players.find((p) => p.id === playerId);
    room.log.push({
      type: "VICTORY",
      actorId: winner?.id,
      actorName: winner?.name,
      description: `${loser?.name} \u65AD\u7EBF\uFF0C${winner?.name} \u83B7\u80DC\uFF01`
    });
    emitGameOver(room);
    cleanupRoom(room.id);
  }
  io2.on("connection", (socket) => {
    socket.data.playerId = null;
    socket.on("session:hello", (payload) => {
      const playerId = typeof payload?.playerId === "string" ? payload.playerId : "";
      if (!VALID_PLAYER_ID.test(playerId)) return;
      socket.data.playerId = playerId;
      const token = typeof payload?.token === "string" ? payload.token : "";
      const userId = token ? findUserIdByToken(token) : null;
      const userRow = userId ? findUserById(userId) : null;
      socket.data.user = userRow ? {
        id: userRow.id,
        account: userRow.account,
        nickname: userRow.nickname,
        avatar: userRow.avatar
      } : null;
      if (userId) {
        const battleRoomId = userIdToRoom.get(userId);
        const battleRoom = battleRoomId ? rooms.get(battleRoomId) : void 0;
        const battlePlayer = battleRoom?.players.find((p) => p.userId === userId);
        const inBattle = !!battleRoom && !!battlePlayer && battleRoom.phase !== "GAME_OVER";
        if (inBattle) {
          battlePlayer.socketId = socket.id;
          battlePlayer.connected = true;
          socket.data.playerId = battlePlayer.id;
        }
        const oldSocketId = userIdToSocket.get(userId);
        if (oldSocketId && oldSocketId !== socket.id) {
          const oldSocket = io2.sockets.sockets.get(oldSocketId);
          if (oldSocket) {
            oldSocket.emit("session:kicked", { message: "\u8D26\u53F7\u5DF2\u5728\u522B\u5904\u767B\u5F55\uFF0C\u5DF2\u4E0B\u7EBF" });
            oldSocket.disconnect(true);
          }
        }
        userIdToSocket.set(userId, socket.id);
        if (inBattle) {
          socket.emit("session:restored", { playerId: battlePlayer.id });
          socket.emit("battle:state", buildStateView(battleRoom, battlePlayer.id));
          return;
        }
      }
      const room = roomOf(playerId);
      const player = room?.players.find((p) => p.id === playerId);
      if (room && player && !player.connected) {
        player.socketId = socket.id;
        player.connected = true;
        socket.emit("session:restored", { playerId });
        socket.emit("battle:state", buildStateView(room, playerId));
      } else {
        socket.emit("session:helloed", { playerId });
      }
    });
    socket.on("queue:join", () => {
      const playerId = socket.data.playerId;
      if (!playerId) return;
      const existing = roomOf(playerId);
      if (existing) {
        if (existing.phase !== "GAME_OVER") {
          socket.emit("error", { message: "\u4F60\u5DF2\u5728\u5BF9\u5C40\u4E2D" });
          return;
        }
        cleanupRoom(existing.id);
      }
      const user = socket.data.user;
      const nickname = user?.nickname ?? `\u6E38\u5BA2${playerId.slice(0, 4)}`;
      const player = createPlayerState(
        playerId,
        socket.id,
        nickname,
        user ? { userId: user.id, account: user.account, avatar: user.avatar } : null
      );
      const opponent = queue.join(player);
      if (!opponent) {
        socket.emit("queue:waiting", { message: "\u7B49\u5F85\u5176\u4ED6\u73A9\u5BB6\u52A0\u5165\u2026\u2026" });
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
          io2.to(p.socketId).emit("queue:matched", {
            roomId: room.id,
            playerId: p.id,
            opponentName: room.players.find((x) => x.id !== p.id)?.name ?? "",
            state: buildStateView(room, p.id)
          });
        }
      }
    });
    socket.on("queue:leave", () => {
      const playerId = socket.data.playerId;
      if (playerId) queue.leave(playerId);
    });
    socket.on("chat:message", (payload) => {
      const playerId = socket.data.playerId;
      if (!playerId) return;
      const room = roomOf(playerId);
      if (!room) return;
      const text = typeof payload?.text === "string" ? payload.text.trim() : "";
      if (!text || text.length > 120) return;
      const player = room.players.find((p) => p.id === playerId);
      const message = { playerId, name: player?.name ?? "\u73A9\u5BB6", text };
      for (const p of room.players) {
        if (p.socketId) io2.to(p.socketId).emit("chat:message", message);
      }
    });
    socket.on("battle:selectStarter", (payload) => {
      const playerId = socket.data.playerId;
      if (!playerId) return;
      const room = roomOf(playerId);
      if (!room) return;
      const petId = typeof payload?.petId === "string" ? payload.petId : "";
      const result = BattleEngine.selectStarter(room, playerId, petId);
      if (!result.ok) {
        socket.emit("error", { message: result.reason ?? "\u9009\u62E9\u5931\u8D25" });
        return;
      }
      socket.emit("battle:starterSelected", { playerId });
      const bothReady = room.players.every((p) => p.ready);
      if (bothReady) {
        BattleEngine.initializeBattle(room);
        for (const p of room.players) {
          if (p.socketId) {
            io2.to(p.socketId).emit("battle:turnStart", {
              turn: room.turn,
              state: buildStateView(room, p.id)
            });
          }
        }
      }
      emitState(room);
    });
    socket.on("battle:chooseAction", (payload) => {
      const playerId = socket.data.playerId;
      if (!playerId) return;
      const room = roomOf(playerId);
      if (!room) return;
      const action = payload?.action;
      const result = BattleEngine.chooseAction(room, playerId, action);
      if (!result.ok) {
        socket.emit("error", { message: result.reason ?? "\u884C\u52A8\u5931\u8D25" });
        return;
      }
      socket.emit("battle:actionReceived", { playerId, action });
      emitState(room);
      if (room.players.every((p) => p.currentAction)) {
        const resolution = BattleEngine.resolveTurn(room);
        room.log.push(...resolution.events);
        for (const p of room.players) {
          if (p.socketId) {
            const payload2 = {
              turn: room.turn,
              events: resolution.events,
              state: buildStateView(room, p.id)
            };
            io2.to(p.socketId).emit("battle:turnResult", payload2);
          }
        }
        if (room.phase === "GAME_OVER") {
          emitGameOver(room);
          cleanupRoom(room.id);
        } else if (room.phase === "FORCED_SWITCH") {
          for (const p of room.players) {
            if (p.socketId && room.forcedSwitchPlayerIds.includes(p.id)) {
              io2.to(p.socketId).emit("battle:forceSwitch", {
                playerId: p.id,
                state: buildStateView(room, p.id)
              });
            }
          }
          emitState(room);
        } else {
          for (const p of room.players) {
            if (p.socketId) {
              io2.to(p.socketId).emit("battle:turnStart", {
                turn: room.turn,
                state: buildStateView(room, p.id)
              });
            }
          }
        }
      }
    });
    socket.on("battle:confirmSwitch", (payload) => {
      const playerId = socket.data.playerId;
      if (!playerId) return;
      const room = roomOf(playerId);
      if (!room) return;
      const targetInstanceId = typeof payload?.targetInstanceId === "string" ? payload.targetInstanceId : "";
      const result = BattleEngine.confirmSwitch(room, playerId, targetInstanceId);
      if (!result.ok) {
        socket.emit("error", { message: result.reason ?? "\u6362\u5BA0\u5931\u8D25" });
        return;
      }
      socket.emit("battle:switchConfirmed", { playerId });
      emitState(room);
      if (room.forcedSwitchPlayerIds.length === 0 && room.phase === "BATTLE") {
        for (const p of room.players) {
          if (p.socketId) {
            io2.to(p.socketId).emit("battle:turnStart", {
              turn: room.turn,
              state: buildStateView(room, p.id)
            });
          }
        }
      }
    });
    socket.on("battle:surrender", () => {
      const playerId = socket.data.playerId;
      if (!playerId) return;
      const room = roomOf(playerId);
      if (!room || room.phase === "GAME_OVER") return;
      BattleEngine.surrender(room, playerId);
      const winner = room.players.find((p) => p.id === room.winnerId);
      const loser = room.players.find((p) => p.id === playerId);
      room.log.push({
        type: "VICTORY",
        actorId: winner?.id,
        actorName: winner?.name,
        description: `${loser?.name} \u8BA4\u8F93\uFF0C${winner?.name} \u83B7\u80DC\uFF01`
      });
      emitGameOver(room);
      cleanupRoom(room.id);
    });
    socket.on("disconnect", () => {
      const userId = socket.data.user?.id;
      if (userId && userIdToSocket.get(userId) === socket.id) {
        userIdToSocket.delete(userId);
      }
      const playerId = socket.data.playerId;
      if (!playerId) return;
      if (queue.has(playerId)) {
        queue.leave(playerId);
        return;
      }
      const room = roomOf(playerId);
      if (!room || room.phase === "GAME_OVER") return;
      const player = room.players.find((p) => p.id === playerId);
      if (!player || player.socketId !== socket.id) return;
      forfeitPlayer(playerId);
    });
  });
}

// src/routes/auth.ts
import { Router } from "express";

// src/auth/token.ts
import { randomBytes } from "crypto";
function generateToken() {
  return randomBytes(32).toString("hex");
}

// src/auth/password.ts
import { randomBytes as randomBytes2, scryptSync, timingSafeEqual } from "crypto";
var KEY_LEN = 64;
function hashPassword(password) {
  const salt = randomBytes2(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const idx = stored.indexOf(":");
  if (idx <= 0) return false;
  const salt = stored.slice(0, idx);
  const expected = Buffer.from(stored.slice(idx + 1), "hex");
  if (expected.length !== KEY_LEN) return false;
  const candidate = scryptSync(password, salt, KEY_LEN);
  return timingSafeEqual(candidate, expected);
}

// src/auth/avatar.ts
import { randomUUID as randomUUID3 } from "crypto";
import { mkdirSync as mkdirSync2, writeFileSync } from "fs";
import { dirname as dirname3, resolve as resolve2 } from "path";
var AVATAR_MAX_BYTES = 2 * 1024 * 1024;
var AVATAR_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif"
};
function resolveAvatar(input) {
  if (!input || input === DEFAULT_AVATAR || input.startsWith("/assets/")) {
    return { path: DEFAULT_AVATAR };
  }
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(input);
  if (!m) return { path: DEFAULT_AVATAR, error: "\u5934\u50CF\u683C\u5F0F\u4E0D\u652F\u6301" };
  const mime = m[1];
  let buf;
  try {
    buf = Buffer.from(m[2], "base64");
  } catch {
    return { path: DEFAULT_AVATAR, error: "\u5934\u50CF\u6570\u636E\u65E0\u6548" };
  }
  if (buf.length === 0) return { path: DEFAULT_AVATAR, error: "\u5934\u50CF\u6570\u636E\u4E3A\u7A7A" };
  if (buf.length > AVATAR_MAX_BYTES) {
    return { path: DEFAULT_AVATAR, error: "\u5934\u50CF\u5927\u5C0F\u4E0D\u80FD\u8D85\u8FC7 2MB" };
  }
  const filename = `${randomUUID3()}${AVATAR_EXT[mime]}`;
  const filepath = resolve2(config.uploadsDir, "avatars", filename);
  mkdirSync2(dirname3(filepath), { recursive: true });
  writeFileSync(filepath, buf);
  return { path: `/uploads/avatars/${filename}` };
}

// src/middleware/auth.ts
function requireAuth(req, res, next) {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const userId = token ? findUserIdByToken(token) : null;
  if (!userId) {
    res.status(401).json({ success: false, message: "\u672A\u767B\u5F55" });
    return;
  }
  req.userId = userId;
  next();
}

// src/routes/auth.ts
function toAuthUser(row) {
  return {
    id: row.id,
    account: row.account,
    nickname: row.nickname,
    avatar: row.avatar
  };
}
function setupAuthRoutes() {
  const router = Router();
  router.post("/register", (req, res) => {
    const body = req.body ?? {};
    const account = typeof body.account === "string" ? body.account.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
    const avatar = typeof body.avatar === "string" ? body.avatar : void 0;
    if (!isSixDigitAccount(account)) {
      return res.status(400).json({ success: false, code: "INVALID_ACCOUNT", message: "\u8D26\u53F7\u5FC5\u987B\u4E3A6\u4F4D\u6570\u5B57" });
    }
    const pwResult = validatePassword(password);
    if (!pwResult.ok) {
      return res.status(400).json({ success: false, code: "WEAK_PASSWORD", message: pwResult.message });
    }
    const nickResult = validateNickname(nickname);
    if (!nickResult.ok) {
      return res.status(400).json({ success: false, code: "INVALID_NICKNAME", message: nickResult.message });
    }
    if (findUserByAccount(account)) {
      return res.status(409).json({ success: false, code: "ACCOUNT_EXISTS", message: "\u8D26\u53F7\u5DF2\u5B58\u5728\uFF01" });
    }
    const avatarResult = resolveAvatar(avatar);
    if (avatarResult.error) {
      return res.status(400).json({ success: false, code: "INVALID_AVATAR", message: avatarResult.error });
    }
    const user = createUser({
      account,
      passwordHash: hashPassword(password),
      nickname,
      avatar: avatarResult.path
    });
    const token = generateToken();
    createSession(token, user.id);
    res.json({ success: true, token, user: toAuthUser(user) });
  });
  router.post("/login", (req, res) => {
    const body = req.body ?? {};
    const account = typeof body.account === "string" ? body.account.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const user = findUserByAccount(account);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ success: false, message: "\u8D26\u53F7\u6216\u5BC6\u7801\u9519\u8BEF" });
    }
    deleteSessionsForUser(user.id);
    const token = generateToken();
    createSession(token, user.id);
    res.json({ success: true, token, user: toAuthUser(user) });
  });
  router.get("/me", requireAuth, (req, res) => {
    const userId = req.userId;
    const user = findUserById(userId);
    if (!user) {
      return res.status(401).json({ success: false, message: "\u8D26\u53F7\u4E0D\u5B58\u5728" });
    }
    res.json({ success: true, user: toAuthUser(user) });
  });
  return router;
}

// src/routes/battles.ts
import { Router as Router2 } from "express";
function player1(row) {
  return {
    userId: row.p1_user_id,
    account: row.p1_account,
    nickname: row.p1_nickname,
    avatar: row.p1_avatar
  };
}
function player2(row) {
  return {
    userId: row.p2_user_id,
    account: row.p2_account,
    nickname: row.p2_nickname,
    avatar: row.p2_avatar
  };
}
function setupBattleRoutes() {
  const router = Router2();
  router.get("/history", requireAuth, (req, res) => {
    const userId = req.userId;
    const rows = listBattlesForUser(userId);
    const battles = rows.map((row) => {
      const isP1 = row.p1_user_id === userId;
      const opponent = isP1 ? player2(row) : player1(row);
      const result = row.is_draw ? "draw" : row.winner_id === userId ? "win" : "lose";
      return { id: row.id, opponent, result, createdAt: row.created_at };
    });
    const wins = battles.filter((b) => b.result === "win").length;
    res.json({ success: true, battles, total: battles.length, wins });
  });
  router.get("/:id", requireAuth, (req, res) => {
    const userId = req.userId;
    const row = getBattleById(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "\u5BF9\u5C40\u4E0D\u5B58\u5728" });
    }
    if (row.p1_user_id !== userId && row.p2_user_id !== userId) {
      return res.status(403).json({ success: false, message: "\u65E0\u6743\u67E5\u770B\u8BE5\u5BF9\u5C40" });
    }
    let battleLog = [];
    try {
      battleLog = JSON.parse(row.battle_log);
    } catch {
      battleLog = [];
    }
    const battle = {
      id: row.id,
      player1: player1(row),
      player2: player2(row),
      winnerId: row.winner_id,
      isDraw: !!row.is_draw,
      createdAt: row.created_at,
      battleLog
    };
    res.json({ success: true, battle });
  });
  return router;
}

// src/index.ts
initDatabase();
mkdirSync3(resolve3(config.uploadsDir, "avatars"), { recursive: true });
var app = express();
var httpServer = createServer(app);
app.use(express.json({ limit: "8mb" }));
app.use("/uploads", express.static(config.uploadsDir));
var io = new Server(httpServer, {
  cors: {
    origin: config.clientOrigin,
    methods: ["GET", "POST"]
  }
});
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "rockingdom-pvp-server",
    time: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.use("/api/auth", setupAuthRoutes());
app.use("/api/battles", setupBattleRoutes());
setupSocket(io);
httpServer.listen(config.port, () => {
  console.log(`[server] \u6D1B\u514B\u738B\u56FD\u4E3B\u5BA0PK \u670D\u52A1\u7AEF\u5DF2\u542F\u52A8\uFF0C\u7AEF\u53E3 ${config.port}`);
  console.log(`[server] \u5141\u8BB8\u7684\u524D\u7AEF\u6765\u6E90(CORS): ${config.clientOrigin}`);
  console.log(`[server] \u73AF\u5883: ${config.nodeEnv}`);
  console.log(`[server] \u6570\u636E\u5E93: ${config.dbPath}`);
  console.log(`[server] \u5934\u50CF\u76EE\u5F55: ${resolve3(config.uploadsDir, "avatars")}`);
});
