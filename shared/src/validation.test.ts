import { describe, expect, it } from 'vitest';
import { isSixDigitAccount, validateNickname, validatePassword } from './validation';

describe('账号格式校验', () => {
  it('6 位纯数字合法', () => {
    expect(isSixDigitAccount('123456')).toBe(true);
  });
  it('非 6 位非法', () => {
    expect(isSixDigitAccount('12345')).toBe(false);
    expect(isSixDigitAccount('1234567')).toBe(false);
  });
  it('含字母非法', () => {
    expect(isSixDigitAccount('abc123')).toBe(false);
    expect(isSixDigitAccount('12345a')).toBe(false);
  });
});

describe('密码校验', () => {
  it('大小写 + 数字 + 特殊字符 → 通过', () => {
    expect(validatePassword('Abc123!@').ok).toBe(true);
  });
  it('缺特殊字符 → 不通过', () => {
    expect(validatePassword('Abc1234').ok).toBe(false);
  });
  it('缺数字 → 不通过', () => {
    expect(validatePassword('Abcdef!@').ok).toBe(false);
  });
  it('缺大写 → 不通过', () => {
    expect(validatePassword('abc123!@').ok).toBe(false);
  });
});

describe('昵称校验', () => {
  it('2~12 字符合法', () => {
    expect(validateNickname('张三').ok).toBe(true);
    expect(validateNickname('火焰斗士').ok).toBe(true);
  });
  it('少于 2 字符非法', () => {
    expect(validateNickname('a').ok).toBe(false);
  });
  it('超过 12 字符非法', () => {
    expect(validateNickname('一二三四五六七八九十十一十二十三').ok).toBe(false);
  });
});
