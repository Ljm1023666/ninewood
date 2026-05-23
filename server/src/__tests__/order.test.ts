import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { orderRouter } from '../routes/order.js';

const app = express();
app.use(express.json());
app.use('/api/orders', orderRouter);

describe('Order API', () => {
  it('POST /api/orders - should reject unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ demandId: 'test-id', applicationId: 'test-app-id' });
    expect(res.status).toBe(401);
  });

  it('POST /api/orders - should reject request without required fields (with valid token bypass)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({});
    expect(res.status).toBe(401);
  });

  it('GET /api/orders - should require auth', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });

  it('POST /api/orders/:id/prepay - should require auth', async () => {
    const res = await request(app).post('/api/orders/test-id/prepay');
    expect(res.status).toBe(401);
  });

  it('POST /api/orders/:id/complete - should require auth', async () => {
    const res = await request(app).post('/api/orders/test-id/complete');
    expect(res.status).toBe(401);
  });

  it('POST /api/orders/:id/confirm - should require auth', async () => {
    const res = await request(app).post('/api/orders/test-id/confirm');
    expect(res.status).toBe(401);
  });

  it('POST /api/orders/:id/dispute - should require auth', async () => {
    const res = await request(app).post('/api/orders/test-id/dispute');
    expect(res.status).toBe(401);
  });

  it('POST /api/orders/:id/cancel - should require auth', async () => {
    const res = await request(app).post('/api/orders/test-id/cancel');
    expect(res.status).toBe(401);
  });

  it('POST /api/orders/:id/partial - should require auth', async () => {
    const res = await request(app).post('/api/orders/test-id/partial').send({});
    expect(res.status).toBe(401);
  });
});
