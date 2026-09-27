import type { GameController } from '../hooks/useGame';
import Fireworks from '../components/Fireworks';
import ParticleBackground from '../components/ParticleBackground';

interface Props {
  game: GameController;
}

export default function GameOverPage({ game }: Props) {
  const state = game.gameState;
  const isDraw = state?.isDraw ?? false;
  const isWinner = state?.winnerId === state?.self.id;
  const reason = game.gameOverReason;

  let title: string;
  let subtitle: string;
  if (isDraw) {
    title = '平局';
    subtitle = '双方势均力敌，不分胜负';
  } else if (isWinner) {
    title = '恭喜你获得了胜利';
    if (reason === 'DISCONNECT') subtitle = '对手已掉线，您自动获得了胜利';
    else if (reason === 'SURRENDER') subtitle = '对手认输，您获得了胜利';
    else subtitle = '你击败了对手，赢得了这场对战！';
  } else {
    title = '很遗憾您在此次战斗中略逊一筹';
    subtitle = '再接再厉，下次一定能赢！';
  }

  return (
    <div className={`page page--gameover ${isWinner ? 'page--win' : 'page--lose'}`}>
      <ParticleBackground />
      {isWinner && <Fireworks />}

      <div className="go-modal">
        <div className="go-modal__icon">{isDraw ? '🤝' : isWinner ? '🏆' : '💔'}</div>
        <h2 className="go-modal__title">{title}</h2>
        <p className="go-modal__subtitle">{subtitle}</p>

        {state && (
          <div className="go-modal__summary">
            <div className="go-summary-row">
              <span>{state.self.name}</span>
              <span className="go-summary__mark">{isWinner ? '胜利' : isDraw ? '平局' : '失败'}</span>
            </div>
            <div className="go-summary-row">
              <span>{state.opponent.name}</span>
              <span className="go-summary__mark">
                {!isWinner && !isDraw ? '胜利' : isDraw ? '平局' : '失败'}
              </span>
            </div>
          </div>
        )}

        <button className="btn btn--primary btn--glow" onClick={game.resetToMatchmaking}>
          确定
        </button>
      </div>
    </div>
  );
}
