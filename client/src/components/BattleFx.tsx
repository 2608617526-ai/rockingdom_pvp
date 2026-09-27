interface Props {
  side: 'self' | 'opponent';
  kind: 'attack' | 'hit';
}

/**
 * 通用战斗特效（纯 CSS，无素材）：攻击迸发 / 受击冲击波 + 粒子。
 * 只做视觉表现，独立于宠物立绘，未来更换素材依然可复用。
 */
export default function BattleFx({ side, kind }: Props) {
  if (kind === 'attack') {
    return (
      <div className={`battle-fx battle-fx--${side}`}>
        <span className="battle-fx__burst" />
        <span className="battle-fx__streak" />
      </div>
    );
  }
  return (
    <div className={`battle-fx battle-fx--${side}`}>
      <span className="battle-fx__ring" />
      <span className="battle-fx__impact" />
      <span className="battle-fx__particle battle-fx__particle--1" />
      <span className="battle-fx__particle battle-fx__particle--2" />
      <span className="battle-fx__particle battle-fx__particle--3" />
      <span className="battle-fx__particle battle-fx__particle--4" />
    </div>
  );
}
