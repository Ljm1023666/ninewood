import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { isLegacyShortsEnabled } from '../config/legacy-shorts.js'

describe('legacy shorts 闸门（时间主权 Phase 0）', () => {
  const prevNodeEnv = process.env.NODE_ENV
  const prevFlag = process.env.ENABLE_LEGACY_SHORTS

  beforeEach(() => {
    delete process.env.ENABLE_LEGACY_SHORTS
  })

  afterEach(() => {
    process.env.NODE_ENV = prevNodeEnv
    if (prevFlag === undefined) delete process.env.ENABLE_LEGACY_SHORTS
    else process.env.ENABLE_LEGACY_SHORTS = prevFlag
  })

  it('生产环境即使 ENABLE_LEGACY_SHORTS=1 也禁用', () => {
    process.env.NODE_ENV = 'production'
    process.env.ENABLE_LEGACY_SHORTS = '1'
    expect(isLegacyShortsEnabled()).toBe(false)
  })

  it('非生产默认禁用（无 flag）', () => {
    process.env.NODE_ENV = 'development'
    expect(isLegacyShortsEnabled()).toBe(false)
  })

  it('非生产仅 ENABLE_LEGACY_SHORTS=1 时启用', () => {
    process.env.NODE_ENV = 'development'
    process.env.ENABLE_LEGACY_SHORTS = '1'
    expect(isLegacyShortsEnabled()).toBe(true)
  })

  it('生产形态：未挂载 /api/shorts 返回 404（A1）', async () => {
    process.env.NODE_ENV = 'production'
    process.env.ENABLE_LEGACY_SHORTS = '1'
    const app = express()
    // 与 index.ts 相同闸门：生产不挂载
    if (isLegacyShortsEnabled()) {
      app.get('/api/shorts', (_req, res) => {
        res.status(200).json({ shouldNever: true })
      })
    }
    const res = await request(app).get('/api/shorts')
    expect(res.status).toBe(404)
  })

  it('开发 flag 开启时按闸门挂载', async () => {
    process.env.NODE_ENV = 'development'
    process.env.ENABLE_LEGACY_SHORTS = '1'
    const app = express()
    if (isLegacyShortsEnabled()) {
      app.get('/api/shorts', (_req, res) => {
        res.status(200).json({ ok: true })
      })
    }
    const res = await request(app).get('/api/shorts')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})
