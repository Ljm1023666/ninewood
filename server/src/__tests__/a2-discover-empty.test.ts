/**
 * A2：Discover / loops recommend 空查询不得返回默认 Feed
 */
import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { loopRouter } from '../routes/loop.js'

const app = express()
app.use(express.json())
app.use('/api/loops', loopRouter)

describe('A2 Discover empty query', () => {
  it('GET /api/loops/recommend 无 q/paths/facets → 400', async () => {
    const res = await request(app).get('/api/loops/recommend')
    expect(res.status).toBe(400)
    expect(res.body?.message || res.body?.data).toBeTruthy()
  })
})
