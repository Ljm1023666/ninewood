import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

process.env.ADMIN_API_KEY = 'ninewood-local-admin-key';
process.env.NODE_ENV = 'test';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: { count: vi.fn().mockResolvedValue(3), findMany: vi.fn().mockResolvedValue([]) },
    userTag: { count: vi.fn().mockResolvedValue(0) },
    order: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    demand: {
      count: vi.fn().mockResolvedValue(1),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    circle: {
      count: vi.fn().mockResolvedValue(2),
      groupBy: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: (_req: express.Request, res: express.Response) => {
    res.status(401).json({ code: 401, message: '未登录', timestamp: Date.now() });
  },
}));

vi.mock('../middleware/admin.js', () => ({
  adminMiddleware: (_req: express.Request, res: express.Response) => {
    res.status(403).json({ code: 403, message: '无权访问', timestamp: Date.now() });
  },
}));

import { adminRouter } from '../routes/admin.js';

describe('admin API key gate', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);

  it('rejects requests without key or JWT', async () => {
    const res = await request(app).get('/api/admin/health');
    expect(res.status).toBe(401);
  });

  it('allows health with valid X-Admin-Api-Key', async () => {
    const res = await request(app)
      .get('/api/admin/health')
      .set('X-Admin-Api-Key', 'ninewood-local-admin-key');
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
  });
});
