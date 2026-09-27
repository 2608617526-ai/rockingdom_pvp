import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LEN = 64;

/**
 * 使用 Node 内置 scrypt（内存硬化 KDF）哈希密码。
 * 存储格式：`salt:hash`（均为 hex）。绝不保存明文。
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const idx = stored.indexOf(':');
  if (idx <= 0) return false;
  const salt = stored.slice(0, idx);
  const expected = Buffer.from(stored.slice(idx + 1), 'hex');
  if (expected.length !== KEY_LEN) return false;
  const candidate = scryptSync(password, salt, KEY_LEN);
  return timingSafeEqual(candidate, expected);
}
