import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { config } from './config';
import { setupSocket } from './socket';
import { initDatabase } from './db';
import { setupAuthRoutes } from './routes/auth';
import { setupBattleRoutes } from './routes/battles';

// 初始化数据库（建目录 + 建表）与上传目录
initDatabase();
mkdirSync(resolve(config.uploadsDir, 'avatars'), { recursive: true });

const app = express();
const httpServer = createServer(app);

// 账号接口需要解析 JSON 请求体（头像以 base64 data URL 传输，放宽上限）
app.use(express.json({ limit: '8mb' }));
// 提供上传的头像
app.use('/uploads', express.static(config.uploadsDir));

const io = new Server(httpServer, {
  cors: {
    origin: config.clientOrigin,
    methods: ['GET', 'POST'],
  },
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'rockingdom-pvp-server',
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', setupAuthRoutes());
app.use('/api/battles', setupBattleRoutes());

setupSocket(io);

httpServer.listen(config.port, () => {
  console.log(`[server] 洛克王国主宠PK 服务端已启动，端口 ${config.port}`);
  console.log(`[server] 允许的前端来源(CORS): ${config.clientOrigin}`);
  console.log(`[server] 环境: ${config.nodeEnv}`);
  console.log(`[server] 数据库: ${config.dbPath}`);
  console.log(`[server] 头像目录: ${resolve(config.uploadsDir, 'avatars')}`);
});
