import { Router } from 'express';
import type { AuthUser } from '@rockingdom/shared';
import { isSixDigitAccount, validateNickname, validatePassword } from '@rockingdom/shared';
import { createUser, findUserByAccount, findUserById, type UserRow } from '../db/users';
import { createSession, deleteSessionsForUser } from '../db/sessions';
import { generateToken } from '../auth/token';
import { hashPassword, verifyPassword } from '../auth/password';
import { resolveAvatar } from '../auth/avatar';
import { requireAuth, type AuthedRequest } from '../middleware/auth';

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    account: row.account,
    nickname: row.nickname,
    avatar: row.avatar,
  };
}

export function setupAuthRoutes(): Router {
  const router = Router();

  router.post('/register', (req, res) => {
    const body = (req.body ?? {}) as {
      account?: unknown;
      password?: unknown;
      nickname?: unknown;
      avatar?: unknown;
    };
    const account = typeof body.account === 'string' ? body.account.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
    const avatar = typeof body.avatar === 'string' ? body.avatar : undefined;

    if (!isSixDigitAccount(account)) {
      return res
        .status(400)
        .json({ success: false, code: 'INVALID_ACCOUNT', message: '账号必须为6位数字' });
    }
    const pwResult = validatePassword(password);
    if (!pwResult.ok) {
      return res
        .status(400)
        .json({ success: false, code: 'WEAK_PASSWORD', message: pwResult.message });
    }
    const nickResult = validateNickname(nickname);
    if (!nickResult.ok) {
      return res
        .status(400)
        .json({ success: false, code: 'INVALID_NICKNAME', message: nickResult.message });
    }
    if (findUserByAccount(account)) {
      return res
        .status(409)
        .json({ success: false, code: 'ACCOUNT_EXISTS', message: '账号已存在！' });
    }
    const avatarResult = resolveAvatar(avatar);
    if (avatarResult.error) {
      return res
        .status(400)
        .json({ success: false, code: 'INVALID_AVATAR', message: avatarResult.error });
    }

    const user = createUser({
      account,
      passwordHash: hashPassword(password),
      nickname,
      avatar: avatarResult.path,
    });
    const token = generateToken();
    createSession(token, user.id);
    res.json({ success: true, token, user: toAuthUser(user) });
  });

  router.post('/login', (req, res) => {
    const body = (req.body ?? {}) as { account?: unknown; password?: unknown };
    const account = typeof body.account === 'string' ? body.account.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    const user = findUserByAccount(account);
    // 账号不存在与密码错误统一返回同一句，避免泄露账号是否存在
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ success: false, message: '账号或密码错误' });
    }
    // 单会话登录：先删除该账号已有的旧会话，把旧登录挤下线
    deleteSessionsForUser(user.id);
    const token = generateToken();
    createSession(token, user.id);
    res.json({ success: true, token, user: toAuthUser(user) });
  });

  router.get('/me', requireAuth, (req, res) => {
    const userId = (req as AuthedRequest).userId as string;
    const user = findUserById(userId);
    if (!user) {
      return res.status(401).json({ success: false, message: '账号不存在' });
    }
    res.json({ success: true, user: toAuthUser(user) });
  });

  return router;
}
