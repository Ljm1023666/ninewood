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

  it('POST /api/demands - should validate required fields', async () => {
    const res = await request(app)
      .post('/api/demands')
      .set('Authorization', 'Bearer test-token')
      .send({});
    expect(res.status).toBe(400);
  });

  it('GET /api/demands - should return paginated list', async () => {
    const res = await request(app).get('/api/demands');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
  });
});
