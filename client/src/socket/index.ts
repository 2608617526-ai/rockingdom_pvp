import { io, type Socket } from 'socket.io-client';

const SERVER_URL: string =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ??
  'http://localhost:3000';

export const socket: Socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 800,
  reconnectionDelayMax: 3000,
  reconnectionAttempts: Infinity,
});

const PLAYER_ID_KEY = 'petpvp:playerId';

/** 每个浏览器标签页一个稳定身份，重连时凭此恢复对局 */
export function getOrCreatePlayerId(): string {
  let id = sessionStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}
