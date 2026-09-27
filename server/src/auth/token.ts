import { randomBytes } from 'node:crypto';

/** 生成登录会话 token（随机不透明串，存数据库可撤销）。 */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}
