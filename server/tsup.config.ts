import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  sourcemap: false,
  // node:sqlite 需要 Node 22.5+，目标按运行时版本设置
  target: 'node24',
  // 将共享包直接打包进产物，避免运行时依赖 .ts 源码
  noExternal: ['@rockingdom/shared'],
});
