import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'

process.env.ADMIN_API_KEY = 'ninewood-local-admin-key'
process.env.NODE_ENV = 'test'

const mocks = vi.hoisted(() => ({
  refreshTagStats: vi.fn().mockResolvedValue({ refreshed: 3 }),
  getUnreadCount: vi.fn().mockResolvedValue(7),
  getMessages: vi.fn().mockResolvedValue({ items: [], page: 1 }),
  userFindUnique: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
  },
}))

vi.mock('../services/tag-stats.js', () => ({
  refreshTagStats: mocks.refreshTagStats,
  getPlatformTrends: vi.fn(),
  getOverviewExtras: vi.fn(),
}))

vi.mock('../services/message.service.js', () => ({
  messageService: {
    getUnreadCount: mocks.getUnreadCount,
    getMessages: mocks.getMessages,
    getConversations: vi.fn(),
    getNotifications: vi.fn(),
    send: vi.fn(),
  },
}))

vi.mock('../services/comm.service.js', () => ({
  tryStartCommWindow: vi.fn(),
}))

vi.mock('../services/card-attachment.service.js', () => ({
  cardAttachmentService: {},
}))

vi.mock('../services/loop/heaven-runner.service.js', () => ({
  triggerResourceHeaven: vi.fn(),
}))

vi.mock('../middleware/upload.js', () => ({
  upload: { single: () => (_req: any, _res: any, next: any) => next() },
  verifyUpload: (_req: any, _res: any, next: any) => next(),
}))

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    const uid = req.headers['x-test-user']
    if (!uid) {
      res.status(401).json({ code: 401, message: '未登录', timestamp: Date.now() })
      return
    }
    req.user = { userId: String(uid), phone: '1', certLevel: 'NONE' }
    next()
  },
}))

vi.mock('../middleware/admin.js', () => ({
  adminMiddleware: (req: any, res: any, next: any) => {
    if (req.headers['x-test-admin'] === '1') {
      next()
      return
    }
    res.status(403).json({ code: 403, message: '无权访问', timestamp: Date.now() })
  },
}))

import { healthActionsRouter, isHealthActionsEnabled, canManageWindowsServices } from '../routes/health-actions.js'
import { healthRouter } from '../routes/health.js'
import { tagStatsRouter } from '../routes/tag-stats.js'
import { messageRouter } from '../routes/message.js'

describe('P0 安全止血包', () => {
  beforeEach(() => {
    mocks.refreshTagStats.mockClear()
    mocks.getUnreadCount.mockClear()
    mocks.getMessages.mockClear()
    process.env.NODE_ENV = 'test'
  })

  afterEach(() => {
    process.env.NODE_ENV = 'test'
  })

  describe('health-actions', () => {
    const app = express()
    app.use(express.json())
    app.use('/api', healthActionsRouter)

    it('匿名请求被拒绝', async () => {
      const res = await request(app).post('/api/health/start-all')
      expect(res.status).toBe(401)
    })

    it('已登录非管理员被拒绝', async () => {
      const res = await request(app)
        .post('/api/health/start-all')
        .set('x-test-user', 'u1')
      expect(res.status).toBe(403)
    })

    it('生产环境彻底禁用（优先于管理员鉴权）', async () => {
      process.env.NODE_ENV = 'production'
      expect(isHealthActionsEnabled()).toBe(false)
      const res = await request(app)
        .post('/api/health/start-all')
        .set('x-test-user', 'admin')
        .set('x-test-admin', '1')
      expect(res.status).toBe(403)
      expect(res.body.message).toMatch(/生产环境已禁用/)
    })

    it('非生产 + 管理员可通过鉴权进入业务', async () => {
      process.env.NODE_ENV = 'test'
      expect(isHealthActionsEnabled()).toBe(true)
      const res = await request(app)
        .post(`/api/health/restart/${encodeURIComponent('Express 服务器')}`)
        .set('x-test-user', 'admin')
        .set('x-test-admin', '1')
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(false)
      expect(String(res.body.message)).toMatch(/无法自我重启/)
    })

    it('非 Windows 环境拒绝 sc 管理本地服务', () => {
      // 帮助函数本身可测；容器/Linux 构建机上应为 false
      if (process.platform !== 'win32') {
        expect(canManageWindowsServices()).toBe(false)
      } else {
        expect(canManageWindowsServices()).toBe(true)
      }
    })
  })

  describe('health live 探针', () => {
    const app = express()
    app.use('/api', healthRouter)

    it('GET /api/health/live 无需鉴权且恒为 ok', async () => {
      const res = await request(app).get('/api/health/live')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
      expect(res.body.service).toBe('ninewood-server')
    })
  })

  describe('tag-stats/refresh', () => {
    const app = express()
    app.use(express.json())
    app.use('/api/tag-stats', tagStatsRouter)

    it('匿名刷新被拒绝', async () => {
      const res = await request(app).post('/api/tag-stats/refresh')
      expect(res.status).toBe(401)
      expect(mocks.refreshTagStats).not.toHaveBeenCalled()
    })

    it('非管理员刷新被拒绝', async () => {
      const res = await request(app)
        .post('/api/tag-stats/refresh')
        .set('x-test-user', 'u1')
      expect(res.status).toBe(403)
      expect(mocks.refreshTagStats).not.toHaveBeenCalled()
    })

    it('管理员可刷新', async () => {
      const res = await request(app)
        .post('/api/tag-stats/refresh')
        .set('x-test-user', 'admin')
        .set('x-test-admin', '1')
      expect(res.status).toBe(200)
      expect(mocks.refreshTagStats).toHaveBeenCalledTimes(1)
      expect(res.body.data.refreshed).toBe(3)
    })

    it('可用 X-Admin-Api-Key 刷新', async () => {
      const res = await request(app)
        .post('/api/tag-stats/refresh')
        .set('X-Admin-Api-Key', 'ninewood-local-admin-key')
      expect(res.status).toBe(200)
      expect(mocks.refreshTagStats).toHaveBeenCalled()
    })
  })

  describe('messages/unread-count 路由顺序', () => {
    const app = express()
    app.use(express.json())
    app.use('/api/messages', messageRouter)

    it('GET /unread-count 命中未读接口而非 :userId', async () => {
      const res = await request(app)
        .get('/api/messages/unread-count')
        .set('x-test-user', 'u1')
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual({ count: 7 })
      expect(mocks.getUnreadCount).toHaveBeenCalledWith('u1')
      expect(mocks.getMessages).not.toHaveBeenCalled()
    })

    it('GET /:userId 仍可取会话消息', async () => {
      const res = await request(app)
        .get('/api/messages/peer-1')
        .set('x-test-user', 'u1')
      expect(res.status).toBe(200)
      expect(mocks.getMessages).toHaveBeenCalledWith('u1', 'peer-1', 1)
    })
  })
})
