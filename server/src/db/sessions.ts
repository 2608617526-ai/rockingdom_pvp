import { getDb } from './index';

export function createSession(token: string, userId: string): void {
  getDb()
    .prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)')
    .run(token, userId, new Date().toISOString());
}

export function findUserIdByToken(token: string): string | null {
  const row = getDb()
    .prepare('SELECT user_id FROM sessions WHERE token = ?')
    .get(token) as { user_id: string } | undefined;
  return row?.user_id ?? null;
}

/** 删除某用户的所有会话（异地登录时把旧登录挤下线） */
export function deleteSessionsForUser(userId: string): void {
  getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}
