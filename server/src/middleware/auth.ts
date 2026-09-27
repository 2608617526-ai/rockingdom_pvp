import type { NextFunction, Request, Response } from 'express';
import { findUserIdByToken } from '../db/sessions';

export interface AuthedRequest extends Request {
  userId?: string;
}

/** 从 `Authorization: Bearer <token>` 解析当前登录用户，失败返回 401。 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const userId = token ? findUserIdByToken(token) : null;
  if (!userId) {
    res.status(401).json({ success: false, message: '未登录' });
    return;
  }
  (req as AuthedRequest).userId = userId;
  next();
}
