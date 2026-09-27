import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { config } from '../config';

// node:sqlite 是 Node 22.5+ 内置模块。用 process.getBuiltinModule 在运行时加载，
// 避免 tsup/esbuild 把 `node:sqlite` 前缀剥离成 `sqlite` 导致运行时找不到模块。
const { DatabaseSync: DatabaseSyncCtor } = process.getBuiltinModule(
  'node:sqlite',
) as typeof import('node:sqlite');

let db: DatabaseSync | null = null;

/** 初始化数据库（建目录 + 建表），幂等。 */
export function initDatabase(): DatabaseSync {
  if (db) return db;
  mkdirSync(dirname(config.dbPath), { recursive: true });
  const database = new DatabaseSyncCtor(config.dbPath);
  database.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      account       TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nickname      TEXT NOT NULL,
      avatar        TEXT NOT NULL,
      created_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS battles (
      id          TEXT PRIMARY KEY,
      p1_user_id  TEXT,
      p1_account  TEXT NOT NULL,
      p1_nickname TEXT NOT NULL,
      p1_avatar   TEXT NOT NULL,
      p2_user_id  TEXT,
      p2_account  TEXT NOT NULL,
      p2_nickname TEXT NOT NULL,
      p2_avatar   TEXT NOT NULL,
      winner_id   TEXT,
      is_draw     INTEGER NOT NULL,
      created_at  TEXT NOT NULL,
      battle_log  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_battles_p1 ON battles(p1_user_id);
    CREATE INDEX IF NOT EXISTS idx_battles_p2 ON battles(p2_user_id);
  `);
  db = database;
  return db;
}

export function getDb(): DatabaseSync {
  if (!db) return initDatabase();
  return db;
}
