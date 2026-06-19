import { beforeAll, afterAll } from 'vitest';

// 测试环境变量
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ninewood:ninewood_test@localhost:5432/ninewood_test';
process.env.JWT_SECRET = 'test_secret_key';
process.env.NODE_ENV = 'test';
process.env.SENTRY_DSN = '';

beforeAll(async () => {
  // 测试前的全局设置（如数据库迁移）
});

afterAll(async () => {
  // 测试后的全局清理
});
