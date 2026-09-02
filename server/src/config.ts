import 'dotenv/config';

/**
 * 服务端配置：全部来自环境变量，不硬编码 IP / 端口 / 域名。
 */
export const config = {
  port: Number(process.env.PORT ?? 3000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV ?? 'development',
};
