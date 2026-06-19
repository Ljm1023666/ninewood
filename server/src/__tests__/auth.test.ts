import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authRouter } from '../routes/auth.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth API', () => {
  it('POST /api/auth/login - should reject invalid phone', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ phone: '123', password: '1' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('POST /api/auth/send-code - should reject invalid phone', async () => {
    const res = await request(app)
      .post('/api/auth/send-code')
      .send({ phone: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('POST /api/auth/register - should reject missing code', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ phone: '13800000001' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });
});
