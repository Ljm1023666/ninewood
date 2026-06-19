import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { depositRouter } from '../routes/deposit.js';

const app = express();
app.use(express.json());
app.use('/api/deposits', depositRouter);

describe('Deposit API', () => {
  it('POST /api/deposits/hold - should reject unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/deposits/hold')
      .send({ demandIds: ['test-id'] });
    expect(res.status).toBe(401);
  });

  it('POST /api/deposits/hold - should reject unauthenticated with empty demandIds', async () => {
    const res = await request(app)
      .post('/api/deposits/hold')
      .send({ demandIds: [] });
    expect(res.status).toBe(401);
  });

  it('GET /api/deposits/my - should require auth', async () => {
    const res = await request(app).get('/api/deposits/my');
    expect(res.status).toBe(401);
  });

  it('POST /api/deposits/:id/return - should require auth', async () => {
    const res = await request(app).post('/api/deposits/test-id/return');
    expect(res.status).toBe(401);
  });
});
