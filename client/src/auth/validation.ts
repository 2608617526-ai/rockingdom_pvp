/**
 * 账号 / 密码 / 昵称校验 —— 与后端共用同一套规则（定义在 shared）。
 */
export { isSixDigitAccount, validateNickname, validatePassword } from '@rockingdom/shared';
export type { ValidationResult } from '@rockingdom/shared';
