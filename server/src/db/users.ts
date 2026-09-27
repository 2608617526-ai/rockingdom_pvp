import { randomUUID } from 'node:crypto';
import { getDb } from './index';

export interface UserRow {
  id: string;
  account: string;
  password_hash: string;
  nickname: string;
  avatar: string;
  created_at: string;
}

export interface NewUser {
  account: string;
  passwordHash: string;
  nickname: string;
  avatar: string;
}

export function createUser(input: NewUser): UserRow {
  const db = getDb();
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (id, account, password_hash, nickname, avatar, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, input.account, input.passwordHash, input.nickname, input.avatar, createdAt);
  return {
    id,
    account: input.account,
    password_hash: input.passwordHash,
    nickname: input.nickname,
    avatar: input.avatar,
    created_at: createdAt,
  };
}

export function findUserByAccount(account: string): UserRow | undefined {
  return getDb()
    .prepare('SELECT * FROM users WHERE account = ?')
    .get(account) as UserRow | undefined;
}

export function findUserById(id: string): UserRow | undefined {
  return getDb()
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(id) as UserRow | undefined;
}
