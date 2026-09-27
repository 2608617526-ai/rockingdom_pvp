/** 页面底部火焰能量光效（纯 CSS，轻量、不影响操作与性能） */
export default function FireEnergy() {
  const flames = Array.from({ length: 14 });
  return (
    <div className="fire-energy" aria-hidden="true">
      {flames.map((_, i) => (
        <span
          key={i}
          className="fire-energy__flame"
          style={{
            left: `${(i * 100) / flames.length}%`,
            animationDelay: `${(i % 6) * 0.35}s`,
            animationDuration: `${2 + (i % 4) * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}
