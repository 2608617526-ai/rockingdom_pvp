import { useEffect } from 'react';
import type { GameController } from '../hooks/useGame';
import type { CurrentUser } from '../auth/user';
import { clearSession, GUEST_USER } from '../auth/user';
import ParticleBackground from '../components/ParticleBackground';
import FireEnergy from '../components/FireEnergy';
import { playBGM } from '../audio';

interface Props {
  game: GameController;
  setUser: (u: CurrentUser) => void;
}

export default function WelcomePage({ game, setUser }: Props) {
  useEffect(() => {
    playBGM('auth');
  }, []);

  const guestLogin = () => {
    clearSession();
    setUser(GUEST_USER);
    game.refreshAuth();
    game.guestLogin();
  };

  return (
    <div className="page page--welcome">
      <ParticleBackground />
      <FireEnergy />
      <div className="welcome-content">
        <h1 className="mm-title">洛克王国主宠PK</h1>
        <p className="mm-subtitle">在线实时 · 1v1 · 三宠物回合制对战</p>

        <div className="welcome-actions">
          <button className="btn btn--primary btn--glow" onClick={game.goToLogin}>
            登录
          </button>
          <button className="btn btn--primary" onClick={game.goToRegister}>
            注册
          </button>
          <button className="btn btn--ghost btn--small" onClick={guestLogin}>
            游客登录
          </button>
        </div>

        <footer className="mm-footer">
          <span className={`conn-dot ${game.connected ? 'conn-dot--ok' : ''}`} />
          {game.connected ? '已连接服务器' : '未连接服务器'}
        </footer>
      </div>
    </div>
  );
}
