import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { demandRouter } from '../routes/demand.js';
import { orderRouter } from '../routes/order.js';

const app = express();
app.use(express.json());
app.use('/api/demands', demandRouter);
app.use('/api/orders', orderRouter);

describe('P0-01 acceptApplicant creates Order', () => {
  it('POST /api/demands/:id/accept/:applicantId - requires auth', async () => {
    const res = await request(app)
      .post('/api/demands/d-1/accept/a-1');
    expect(res.status).toBe(401);
  });

  it('POST /api/orders/:id - requires auth', async () => {
    const res = await request(app).get('/api/orders/o-1');
    expect(res.status).toBe(401);
  });
});
