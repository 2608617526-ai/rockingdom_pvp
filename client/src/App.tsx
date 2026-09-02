import { useGame } from './hooks/useGame';
import MatchmakingPage from './pages/MatchmakingPage';
import StarterSelectionPage from './pages/StarterSelectionPage';
import BattlePage from './pages/BattlePage';
import GameOverPage from './pages/GameOverPage';

export default function App() {
  const game = useGame();

  switch (game.screen) {
    case 'starter':
      return <StarterSelectionPage game={game} />;
    case 'battle':
      return <BattlePage game={game} />;
    case 'gameover':
      return <GameOverPage game={game} />;
    case 'matchmaking':
    default:
      return <MatchmakingPage game={game} />;
  }
}
