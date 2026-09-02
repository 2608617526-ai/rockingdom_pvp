interface Props {
  energy: number;
  maxEnergy: number;
}

export default function EnergyBar({ energy, maxEnergy }: Props) {
  const pct = maxEnergy > 0 ? (energy / maxEnergy) * 100 : 0;
  return (
    <div className="energy-bar">
      <div className="energy-bar__track">
        <div className="energy-bar__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="energy-bar__text">
        {energy} / {maxEnergy}
      </span>
    </div>
  );
}
