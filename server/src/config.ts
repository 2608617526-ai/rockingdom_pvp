import 'dotenv/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 服务端配置：全部来自环境变量，不硬编码 IP / 端口 / 域名。
 * 数据目录 / 上传目录默认相对 server/ 目录解析（开发时为 server/src，构建后为 server/dist）。
 */
const here = dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT ?? 3000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  dataDir: process.env.DATA_DIR ?? resolve(here, '..', 'data'),
  uploadsDir: process.env.UPLOADS_DIR ?? resolve(here, '..', 'uploads'),
  dbPath: process.env.DB_PATH ?? resolve(here, '..', 'data', 'game.db'),
};
