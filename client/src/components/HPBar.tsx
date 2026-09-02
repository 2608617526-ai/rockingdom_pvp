import { hpColor } from '../utils/format';

interface Props {
  hp: number;
  maxHp: number;
  name?: string;
  side?: 'self' | 'opponent';
}

export default function HPBar({ hp, maxHp, name, side }: Props) {
  const pct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
  const color = hpColor(hp, maxHp);
  return (
    <div className={`hp-bar ${side ? `hp-bar--${side}` : ''}`}>
      {name && <span className="hp-bar__name">{name}</span>}
      <div className={`hp-bar__track hp-bar__track--${color}`}>
        <div className="hp-bar__fill" style={{ width: `${pct}%` }} />
        <span className="hp-bar__text">
          {hp} / {maxHp}
        </span>
      </div>
    </div>
  );
}
