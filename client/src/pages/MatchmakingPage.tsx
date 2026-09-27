import { useEffect, useState } from 'react';
import type { GameController } from '../hooks/useGame';
import type { CurrentUser } from '../auth/user';
import { clearSession, GUEST_USER } from '../auth/user';
import ParticleBackground from '../components/ParticleBackground';
import FireEnergy from '../components/FireEnergy';
import RotatingGlobe from '../components/RotatingGlobe';
import UserBadge from '../components/UserBadge';
import HistoryModal from '../components/HistoryModal';
import BattleLogModal from '../components/BattleLogModal';
import AccountModal from '../components/AccountModal';
import { playBGM } from '../audio';

interface Props {
  game: GameController;
  user: CurrentUser;
  setUser: (u: CurrentUser) => void;
}

export default function MatchmakingPage({ game, user, setUser }: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    playBGM('lobby');
  }, []);

  const onLogout = () => {
    setAccountOpen(false);
    clearSession();
    setUser(GUEST_USER);
    game.refreshAuth();
    game.resetToWelcome();
  };

  return (
    <div className="page page--matchmaking">
      <ParticleBackground />
      <FireEnergy />
      <UserBadge user={user} onClick={() => setAccountOpen(true)} />

      <button className="mm-back" onClick={game.resetToWelcome} aria-label="返回">
        ← 返回
      </button>

      {!user.isGuest && (
        <button className="history-fab" onClick={() => setHistoryOpen(true)} aria-label="过往对局">
          <span className="history-fab__icon">⚔️</span>
          <span className="history-fab__label">过往对局</span>
        </button>
      )}

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

      {historyOpen && !user.isGuest && (
        <HistoryModal
          user={user}
          onClose={() => setHistoryOpen(false)}
          onSelectBattle={(id) => setDetailId(id)}
        />
      )}
      {detailId && !user.isGuest && (
        <BattleLogModal user={user} battleId={detailId} onClose={() => setDetailId(null)} />
      )}
      {accountOpen && (
        <AccountModal user={user} onClose={() => setAccountOpen(false)} onLogout={onLogout} />
      )}
    </div>
  );
}
