import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/__tests__/setup.ts'],
    // 真实 PG 集成测试共享本地测试库；跨文件并行会互相污染计数断言。
    fileParallelism: false,
  },
});
