import { useEffect } from 'react';
import type { GameController } from '../hooks/useGame';
import ParticleBackground from '../components/ParticleBackground';
import RotatingGlobe from '../components/RotatingGlobe';
import { playBGM } from '../audio';

interface Props {
  game: GameController;
}

export default function MatchmakingPage({ game }: Props) {
  useEffect(() => {
    playBGM('lobby');
  }, []);

  return (
    <div className="page page--matchmaking">
      <ParticleBackground />
      <div className="mm-content">
        <h1 className="mm-title">洛克王国主宠PK</h1>
        <p className="mm-subtitle">在线实时 · 1v1 · 三宠物回合制对战</p>

        <div className="mm-actions">
          {game.matching ? (
            <div className="mm-matching">
              <RotatingGlobe />
              <p className="mm-status">匹配中……</p>
              <p className="mm-hint">等待其他玩家加入……</p>
              <button className="btn btn--ghost" onClick={game.leaveQueue}>
                取消匹配
              </button>
            </div>
          ) : (
            <button className="btn btn--primary btn--glow" onClick={game.joinQueue}>
              开始匹配
            </button>
          )}
        </div>

        {game.connectionError && <p className="mm-error">{game.connectionError}</p>}

        <footer className="mm-footer">
          <span className={`conn-dot ${game.connected ? 'conn-dot--ok' : ''}`} />
          {game.connected ? '已连接服务器' : '未连接服务器'}
        </footer>
      </div>
    </div>
  );
}
