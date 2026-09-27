import { io, type Socket } from 'socket.io-client';

// 生产环境：不设置 VITE_SERVER_URL 时，连接「同源地址」（由 Nginx 反代 /socket.io）。
// 开发环境：在 client/.env 里设置 VITE_SERVER_URL=http://localhost:3000
const SERVER_URL: string =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? '';

const socketOptions = {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 800,
  reconnectionDelayMax: 3000,
  reconnectionAttempts: Infinity,
};

export const socket: Socket = SERVER_URL
  ? io(SERVER_URL, socketOptions)
  : io(socketOptions);

const PLAYER_ID_KEY = 'petpvp:playerId';

/** 每个浏览器标签页一个稳定身份，重连时凭此恢复对局 */
export function getOrCreatePlayerId(): string {
  let id = sessionStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = generatePlayerId();
    sessionStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

function generatePlayerId(): string {
  // 安全上下文（HTTPS / localhost）下用 crypto.randomUUID
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // 降级：纯 HTTP（非 localhost）下 crypto.randomUUID 不可用
  const rand = () => Math.random().toString(16).slice(2);
  return `${rand()}-${rand()}-${rand()}`;
}
