import { useEffect } from 'react';
import { useGame } from './hooks/useGame';
import { useUser } from './hooks/useUser';
import { socket } from './socket';
import { clearSession, GUEST_USER } from './auth/user';
import { playSFX } from './audio';
import ToastContainer, { showToast } from './components/Toast';
import WelcomePage from './pages/WelcomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import MatchmakingPage from './pages/MatchmakingPage';
import StarterSelectionPage from './pages/StarterSelectionPage';
import BattlePage from './pages/BattlePage';
import GameOverPage from './pages/GameOverPage';

export default function App() {
  const game = useGame();
  const { user, setUser } = useUser();

  // 异地登录被挤下线：清登录态 + 回欢迎页 + 游戏风格提示
  useEffect(() => {
    const onKicked = () => {
      clearSession();
      setUser(GUEST_USER);
      game.resetToWelcome();
      showToast('账号已在别处登录，已下线');
    };
    socket.on('session:kicked', onKicked);
    return () => {
      socket.off('session:kicked', onKicked);
    };
  }, [game.resetToWelcome, setUser]);

  // 鼠标悬停音效（事件委托，仅桌面端 hover 设备生效）
  useEffect(() => {
    if (!window.matchMedia?.('(hover: hover)').matches) return;
    let lastEl: HTMLElement | null = null;
    const onOver = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.(
        'button, [role="button"], .carousel__item',
      ) as HTMLElement | null;
      if (!el) {
        lastEl = null;
        return;
      }
      if (el === lastEl) return;
      lastEl = el;
      playSFX('hover');
    };
    document.addEventListener('mouseover', onOver);
    return () => document.removeEventListener('mouseover', onOver);
  }, []);

  const renderPage = () => {
    switch (game.screen) {
      case 'welcome':
        return <WelcomePage game={game} setUser={setUser} />;
      case 'register':
        return <RegisterPage game={game} setUser={setUser} />;
      case 'login':
        return <LoginPage game={game} setUser={setUser} />;
      case 'starter':
        return <StarterSelectionPage game={game} user={user} />;
      case 'battle':
        return <BattlePage game={game} user={user} />;
      case 'gameover':
        return <GameOverPage game={game} />;
      case 'matchmaking':
      default:
        return <MatchmakingPage game={game} user={user} setUser={setUser} />;
    }
  };

  return (
    <>
      {renderPage()}
      <ToastContainer />
    </>
  );
}
