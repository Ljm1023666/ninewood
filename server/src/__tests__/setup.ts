import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 测试环境变量（保留 CI 注入的 DATABASE_URL）
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://ninewood:ninewood_test@localhost:5432/ninewood_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.SENTRY_DSN = '';

beforeAll(async () => {
  // 测试前的全局设置（如数据库迁移）
});

afterAll(async () => {
  // 测试后的全局清理
});
