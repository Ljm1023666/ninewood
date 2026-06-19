import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { demandRouter } from '../routes/demand.js';

const app = express();
app.use(express.json());
app.use('/api/demands', demandRouter);

describe('Demand API', () => {
  it('POST /api/demands - should reject unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/demands')
      .send({ title: '测试' });
    expect(res.status).toBe(401);
  });

  it('POST /api/demands - should reject fake token', async () => {
    const res = await request(app)
      .post('/api/demands')
      .set('Authorization', 'Bearer test-token')
      .send({});
    expect(res.status).toBe(401);
  });

  // 搜索路由存在但需要数据库连接，此处仅验证路由可达
  it('GET /api/demands/search - route exists', async () => {
    const res = await request(app).get('/api/demands/search');
    expect(res.status).not.toBe(404);
  });
});
