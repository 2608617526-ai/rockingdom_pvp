/**
 * 账号 / 密码 / 昵称的纯函数校验 —— 前后端共用同一套规则，
 * 保证「前端提示」与「后端拒绝」永远一致。
 */

export interface ValidationResult {
  ok: boolean;
  message: string;
}

/** 账号：6 位纯数字 */
export function isSixDigitAccount(value: string): boolean {
  return /^\d{6}$/.test(value);
}

/** 密码：至少一个大写、一个小写、一个数字、一个特殊字符 */
export function validatePassword(password: string): ValidationResult {
  const missing: string[] = [];
  if (!/[A-Z]/.test(password)) missing.push('大写字母');
  if (!/[a-z]/.test(password)) missing.push('小写字母');
  if (!/\d/.test(password)) missing.push('数字');
  if (!/[^A-Za-z0-9]/.test(password)) missing.push('特殊字符');
  if (missing.length === 0) return { ok: true, message: '' };
  return { ok: false, message: `密码还需包含：${missing.join('、')}` };
}

/** 昵称：2~12 个字符（允许中文/英文/数字） */
export function validateNickname(nickname: string): ValidationResult {
  const len = Array.from(nickname.trim()).length;
  if (len < 2) return { ok: false, message: '昵称至少 2 个字符' };
  if (len > 12) return { ok: false, message: '昵称最多 12 个字符' };
  return { ok: true, message: '' };
}
