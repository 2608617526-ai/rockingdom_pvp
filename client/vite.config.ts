import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // 共享包直接以源码形式参与构建，跳过预打包
    exclude: ['@rockingdom/shared'],
  },
  server: {
    port: 5173,
    fs: {
      // 允许访问 workspace 根目录，以解析共享包源码
      allow: ['..'],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
