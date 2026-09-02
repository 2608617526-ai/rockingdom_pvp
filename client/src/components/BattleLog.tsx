import type { BattleEvent } from '@rockingdom/shared';

interface Props {
  events: BattleEvent[];
}

export default function BattleLog({ events }: Props) {
  return (
    <div className="battle-log">
      <div className="battle-log__title">战斗日志</div>
      <div className="battle-log__list">
        {events.length === 0 && (
          <div className="battle-log__empty">等待战斗开始……</div>
        )}
        {events.map((e, i) => (
          <div
            key={i}
            className={`battle-log__entry battle-log__entry--${e.type.toLowerCase()}`}
          >
            {e.description}
          </div>
        ))}
      </div>
    </div>
  );
}
