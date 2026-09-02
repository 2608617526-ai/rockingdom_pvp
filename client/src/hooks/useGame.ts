import { useCallback, useEffect, useState } from 'react';
import type {
  BattleAction,
  BattleEvent,
  BattlePhase,
  BattleStateView,
  PetId,
} from '@rockingdom/shared';
import { socket, getOrCreatePlayerId } from '../socket';
import { playBGM, playSFX } from '../audio';
import type { Screen } from '../types';

export interface GameController {
  screen: Screen;
  gameState: BattleStateView | null;
  lastEvents: BattleEvent[];
  turnSeq: number;
  matching: boolean;
  connectionError: string | null;
  connected: boolean;
  joinQueue: () => void;
  leaveQueue: () => void;
  selectStarter: (petId: PetId) => void;
  chooseAction: (action: BattleAction) => void;
  confirmSwitch: (targetInstanceId: string) => void;
  surrender: () => void;
  resetToMatchmaking: () => void;
}

function screenForPhase(phase: BattlePhase): Screen {
  switch (phase) {
    case 'STARTER_SELECTION':
      return 'starter';
    case 'GAME_OVER':
      return 'gameover';
    default:
      return 'battle';
  }
}

export function useGame(): GameController {
  const [screen, setScreen] = useState<Screen>('matchmaking');
  const [gameState, setGameState] = useState<BattleStateView | null>(null);
  const [lastEvents, setLastEvents] = useState<BattleEvent[]>([]);
  const [turnSeq, setTurnSeq] = useState(0);
  const [matching, setMatching] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const sendHello = () => {
      socket.emit('session:hello', { playerId: getOrCreatePlayerId() });
    };

    const onConnect = () => {
      setConnected(true);
      setConnectionError(null);
      sendHello();
    };
    const onDisconnect = () => {
      setConnected(false);
      setConnectionError('与服务器断开连接，正在重连……');
    };
    const onConnectError = () => {
      setConnected(false);
      setConnectionError('无法连接服务器');
    };

    const onWaiting = () => setMatching(true);

    const onMatched = (payload: { state: BattleStateView }) => {
      setMatching(false);
      setGameState(payload.state);
      setScreen(screenForPhase(payload.state.phase));
      playSFX('match');
    };

    const onState = (state: BattleStateView) => {
      setGameState(state);
      setScreen(screenForPhase(state.phase));
    };

    const onTurnResult = (payload: {
      events: BattleEvent[];
      state: BattleStateView;
    }) => {
      setLastEvents(payload.events);
      setGameState(payload.state);
      setTurnSeq((s) => s + 1);
      setScreen(screenForPhase(payload.state.phase));
    };

    const onForceSwitch = (payload: { state: BattleStateView }) => {
      setGameState(payload.state);
      setScreen(screenForPhase(payload.state.phase));
    };

    const onGameOver = (payload: { state: BattleStateView }) => {
      setGameState(payload.state);
      setScreen('gameover');
      const isWinner = payload.state.winnerId === payload.state.self.id;
      playSFX(isWinner ? 'victory' : 'defeat');
    };

    const onError = (payload: { message?: string }) => {
      setConnectionError(payload.message ?? '发生错误');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('queue:waiting', onWaiting);
    socket.on('queue:matched', onMatched);
    socket.on('battle:state', onState);
    socket.on('battle:turnResult', onTurnResult);
    socket.on('battle:forceSwitch', onForceSwitch);
    socket.on('battle:gameOver', onGameOver);
    socket.on('error', onError);

    if (socket.connected) sendHello();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('queue:waiting', onWaiting);
      socket.off('queue:matched', onMatched);
      socket.off('battle:state', onState);
      socket.off('battle:turnResult', onTurnResult);
      socket.off('battle:forceSwitch', onForceSwitch);
      socket.off('battle:gameOver', onGameOver);
      socket.off('error', onError);
    };
  }, []);

  const joinQueue = useCallback(() => {
    setGameState(null);
    setLastEvents([]);
    setMatching(true);
    setScreen('matchmaking');
    setConnectionError(null);
    socket.emit('queue:join');
    playSFX('click');
  }, []);

  const leaveQueue = useCallback(() => {
    socket.emit('queue:leave');
    setMatching(false);
  }, []);

  const selectStarter = useCallback((petId: PetId) => {
    socket.emit('battle:selectStarter', { petId });
    playSFX('click');
  }, []);

  const chooseAction = useCallback((action: BattleAction) => {
    socket.emit('battle:chooseAction', { action });
  }, []);

  const confirmSwitch = useCallback((targetInstanceId: string) => {
    socket.emit('battle:confirmSwitch', { targetInstanceId });
    playSFX('switch');
  }, []);

  const surrender = useCallback(() => {
    socket.emit('battle:surrender');
  }, []);

  const resetToMatchmaking = useCallback(() => {
    setGameState(null);
    setLastEvents([]);
    setScreen('matchmaking');
    setMatching(false);
    setConnectionError(null);
    playSFX('click');
    playBGM('lobby');
  }, []);

  return {
    screen,
    gameState,
    lastEvents,
    turnSeq,
    matching,
    connectionError,
    connected,
    joinQueue,
    leaveQueue,
    selectStarter,
    chooseAction,
    confirmSwitch,
    surrender,
    resetToMatchmaking,
  };
}
