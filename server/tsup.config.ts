import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  sourcemap: false,
  target: 'node20',
  // 将共享包直接打包进产物，避免运行时依赖 .ts 源码
  noExternal: ['@rockingdom/shared'],
});
