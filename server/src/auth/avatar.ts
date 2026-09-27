import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DEFAULT_AVATAR } from '@rockingdom/shared';
import { config } from '../config';

const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const AVATAR_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export interface AvatarResult {
  path: string;
  error?: string;
}

/**
 * 解析并保存头像：
 *  - 空值 / 默认头像 / 已有静态资源 → 返回默认路径
 *  - data URL（base64）→ 校验 MIME 与大小，随机文件名写入 uploads/avatars/
 */
export function resolveAvatar(input: string | undefined): AvatarResult {
  if (!input || input === DEFAULT_AVATAR || input.startsWith('/assets/')) {
    return { path: DEFAULT_AVATAR };
  }
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(input);
  if (!m) return { path: DEFAULT_AVATAR, error: '头像格式不支持' };
  const mime = m[1];
  let buf: Buffer;
  try {
    buf = Buffer.from(m[2], 'base64');
  } catch {
    return { path: DEFAULT_AVATAR, error: '头像数据无效' };
  }
  if (buf.length === 0) return { path: DEFAULT_AVATAR, error: '头像数据为空' };
  if (buf.length > AVATAR_MAX_BYTES) {
    return { path: DEFAULT_AVATAR, error: '头像大小不能超过 2MB' };
  }
  const filename = `${randomUUID()}${AVATAR_EXT[mime]}`;
  const filepath = resolve(config.uploadsDir, 'avatars', filename);
  mkdirSync(dirname(filepath), { recursive: true });
  writeFileSync(filepath, buf);
  return { path: `/uploads/avatars/${filename}` };
}
