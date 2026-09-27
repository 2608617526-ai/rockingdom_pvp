import { describe, it, expect } from 'vitest';
import {
  createInitialPassiveState,
  getActualSkillCost,
} from './logic';
import type { PassiveState } from './types';
import { SKILL_DEFINITIONS } from './data/skills';

const water = (overrides: Partial<PassiveState> = {}): PassiveState => ({
  ...createInitialPassiveState(),
  ...overrides,
});

const skill = (id: string) => SKILL_DEFINITIONS[id];

describe('技能能耗计算 getActualSkillCost（圣水守护）', () => {
  it('初始无减耗时，气泡基础能耗为 3', () => {
    expect(getActualSkillCost('water', skill('bubble'), water())).toBe(3);
  });

  it('下一技能减耗 2 时，气泡 = 3-2 = 1', () => {
    expect(
      getActualSkillCost('water', skill('bubble'), water({ nextSkillCostReduction: 2 })),
    ).toBe(1);
  });

  it('下一技能减耗 2 时，水泡盾 = 2-2 = 0（最低为 0）', () => {
    expect(
      getActualSkillCost('water', skill('bubble_shield'), water({ nextSkillCostReduction: 2 })),
    ).toBe(0);
  });

  it('下一技能减耗 2 时，润泽(0 能耗)仍为 0，不为负', () => {
    expect(
      getActualSkillCost('water', skill('moisture'), water({ nextSkillCostReduction: 2 })),
    ).toBe(0);
  });

  it('每次使用技能后 +2，下一次技能结算时消耗，之后恢复基础能耗', () => {
    const passive = water();
    // 第一次用气泡：3
    expect(getActualSkillCost('water', skill('bubble'), passive)).toBe(3);
    // 使用后被动：+2
    passive.nextSkillCostReduction += 2;
    // 第二次用水泡盾：2-2=0
    expect(getActualSkillCost('water', skill('bubble_shield'), passive)).toBe(0);
    // 消费掉减耗
    passive.nextSkillCostReduction = 0;
    // 第三次用水泡盾：恢复 2
    expect(getActualSkillCost('water', skill('bubble_shield'), passive)).toBe(2);
  });
});

describe('技能能耗计算 getActualSkillCost（天洪）', () => {
  it('未应对状态技能时，天洪基础能耗仍为 7', () => {
    expect(getActualSkillCost('water', skill('deluge'), water())).toBe(7);
  });

  it('第一次成功应对状态技能（永久减耗 6），天洪 = 7-6 = 1', () => {
    expect(
      getActualSkillCost('water', skill('deluge'), water({ heavenlyFloodCostReduction: 6 })),
    ).toBe(1);
  });

  it('第二次成功应对（永久减耗 12），天洪 = 0', () => {
    expect(
      getActualSkillCost('water', skill('deluge'), water({ heavenlyFloodCostReduction: 12 })),
    ).toBe(0);
  });

  it('第三次成功应对（永久减耗 18），天洪仍为 0，不为负', () => {
    expect(
      getActualSkillCost('water', skill('deluge'), water({ heavenlyFloodCostReduction: 18 })),
    ).toBe(0);
  });

  it('天洪永久减耗只影响天洪，不影响其他技能', () => {
    const passive = water({ heavenlyFloodCostReduction: 6 });
    expect(getActualSkillCost('water', skill('bubble'), passive)).toBe(3);
    expect(getActualSkillCost('water', skill('bubble_shield'), passive)).toBe(2);
    expect(getActualSkillCost('water', skill('moisture'), passive)).toBe(0);
  });

  it('天洪永久减耗(6) 与 圣水下一技能减耗(2) 独立叠加：7-6-2=0', () => {
    expect(
      getActualSkillCost(
        'water',
        skill('deluge'),
        water({ heavenlyFloodCostReduction: 6, nextSkillCostReduction: 2 }),
      ),
    ).toBe(0);
  });
});

describe('技能基础能耗不可变', () => {
  it('getActualSkillCost 绝不写回 skill.cost', () => {
    const s = skill('deluge');
    const before = s.cost;
    getActualSkillCost(
      'water',
      s,
      water({ heavenlyFloodCostReduction: 6, nextSkillCostReduction: 2 }),
    );
    expect(s.cost).toBe(before);
  });

  it('多次计算后，所有技能基础能耗仍保持不变', () => {
    const passive = water({ heavenlyFloodCostReduction: 12, nextSkillCostReduction: 2 });
    getActualSkillCost('water', skill('deluge'), passive);
    getActualSkillCost('water', skill('bubble'), passive);
    expect(skill('deluge').cost).toBe(7);
    expect(skill('bubble').cost).toBe(3);
  });
});
