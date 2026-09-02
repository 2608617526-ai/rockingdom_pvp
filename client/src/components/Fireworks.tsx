import { useMemo } from 'react';
import type { CSSProperties } from 'react';

/** 胜利烟花（纯 CSS） */
export default function Fireworks() {
  const bursts = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: 6 + Math.random() * 88,
        top: 8 + Math.random() * 58,
        delay: Math.random() * 1.8,
        hue: Math.floor(Math.random() * 360),
        size: 5 + Math.random() * 6,
      })),
    [],
  );

  return (
    <div className="fireworks" aria-hidden="true">
      {bursts.map((b) => (
        <div
          key={b.id}
          className="firework"
          style={
            {
              left: `${b.left}%`,
              top: `${b.top}%`,
              animationDelay: `${b.delay}s`,
              '--hue': b.hue,
              '--size': `${b.size}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
