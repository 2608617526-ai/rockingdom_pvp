/**
 * 用户身份：正式账号来自后端（注册 / 登录返回），游客为前端默认。
 * 正式账号持久化到 localStorage，刷新后自动恢复。
 */
import { DEFAULT_AVATAR } from '@rockingdom/shared';

export interface CurrentUser {
  /** 正式账号 userId（游客无） */
  id?: string;
  /** 6 位数字账号（游客无） */
  account?: string;
  nickname: string;
  avatar: string;
  isGuest: boolean;
  /** 登录会话 token（游客无） */
  token?: string;
}

export { DEFAULT_AVATAR };

export const GUEST_USER: CurrentUser = {
  nickname: '游客',
  avatar: DEFAULT_AVATAR,
  isGuest: true,
};

const TOKEN_KEY = 'petpvp:token';
const USER_KEY = 'petpvp:user';

/** 持久化登录态（游客则清除） */
export function saveSession(user: CurrentUser): void {
  if (user.isGuest || !user.token) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, user.token);
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      id: user.id,
      account: user.account,
      nickname: user.nickname,
      avatar: user.avatar,
    }),
  );
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** 读取持久化的正式账号；无则返回游客 */
export function loadStoredUser(): CurrentUser {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CurrentUser>;
      if (parsed && parsed.nickname && parsed.id && !parsed.isGuest) {
        return {
          id: parsed.id,
          account: parsed.account,
          nickname: parsed.nickname,
          avatar: parsed.avatar ?? DEFAULT_AVATAR,
          isGuest: false,
          token: getToken() ?? undefined,
        };
      }
    }
  } catch {
    // 忽略损坏数据
  }
  return GUEST_USER;
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
