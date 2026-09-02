import { createServer } from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { config } from './config';
import { setupSocket } from './socket';

const app = express();
const httpServer = createServer(app);

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

setupSocket(io);

httpServer.listen(config.port, () => {
  console.log(`[server] 洛克王国主宠PK 服务端已启动，端口 ${config.port}`);
  console.log(`[server] 允许的前端来源(CORS): ${config.clientOrigin}`);
  console.log(`[server] 环境: ${config.nodeEnv}`);
});
