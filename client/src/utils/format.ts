import type { SkillDefinition } from '@rockingdom/shared';
import { ELEMENT_LABELS } from '../data/visuals';

export type HpColor = 'green' | 'yellow' | 'red';

export function hpColor(hp: number, maxHp: number): HpColor {
  const pct = maxHp > 0 ? hp / maxHp : 0;
  if (pct > 0.5) return 'green';
  if (pct > 0.2) return 'yellow';
  return 'red';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function skillTypeLabel(skill: SkillDefinition): string {
  switch (skill.type) {
    case 'ATTACK':
      return skill.attackType === 'MAGICAL' ? '魔法攻击' : '物理攻击';
    case 'DEFENSE':
      return '防御技能';
    case 'STATUS':
      return '状态技能';
    default:
      return '技能';
  }
}

export function elementLabel(el?: string): string {
  if (!el) return '—';
  return ELEMENT_LABELS[el as keyof typeof ELEMENT_LABELS] ?? el;
}
