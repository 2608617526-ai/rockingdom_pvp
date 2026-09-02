import type { FloatingNumber } from '../types';

interface Props {
  floaters: FloatingNumber[];
}

export default function FloatingNumberLayer({ floaters }: Props) {
  return (
    <div className="floating-layer">
      {floaters.map((f) => (
        <div
          key={f.id}
          className={`floating-number floating-number--${f.kind} floating-number--${f.side}`}
        >
          {f.label ?? (f.value > 0 ? `+${f.value}` : `${f.value}`)}
        </div>
      ))}
    </div>
  );
}
