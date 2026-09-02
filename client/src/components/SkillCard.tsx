import type { SkillDefinition } from '@rockingdom/shared';
import { elementLabel, skillTypeLabel } from '../utils/format';
import Tooltip from './Tooltip';

interface SkillCardProps {
  skill: SkillDefinition;
  /** 当前实际能耗 */
  cost: number;
  disabled?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

export function SkillTooltipContent({
  skill,
  cost,
}: {
  skill: SkillDefinition;
  cost: number;
}) {
  return (
    <div className="skill-tooltip">
      <div className="skill-tooltip__title">{skill.name}</div>
      <div className="skill-tooltip__row">类型：{skillTypeLabel(skill)}</div>
      {skill.element && (
        <div className="skill-tooltip__row">属性：{elementLabel(skill.element)}</div>
      )}
      {skill.power !== undefined && (
        <div className="skill-tooltip__row">威力：{skill.power}</div>
      )}
      <div className="skill-tooltip__row">能耗：{cost}</div>
      <div className="skill-tooltip__desc">{skill.description}</div>
    </div>
  );
}

export default function SkillCard({
  skill,
  cost,
  disabled,
  selected,
  onSelect,
}: SkillCardProps) {
  return (
    <Tooltip content={<SkillTooltipContent skill={skill} cost={cost} />}>
      <button
        type="button"
        className={`skill-card ${selected ? 'skill-card--selected' : ''} ${
          disabled ? 'skill-card--disabled' : ''
        }`}
        onClick={onSelect}
        disabled={disabled}
      >
        <span className="skill-card__name">{skill.name}</span>
        <span className="skill-card__cost">⚡{cost}</span>
      </button>
    </Tooltip>
  );
}
