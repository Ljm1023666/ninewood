import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

/**
 * Wave D · /api/agent/tasks API 单测
 *
 * 覆盖 spec §6：
 *   - GET /            任务列表
 *   - POST /           创建（配额 5）
 *   - GET /:id         详情 + recentRuns
 *   - PATCH /:id       修改（含 schedule / enabled / filters）
 *   - DELETE /:id
 *   - POST /:id/run-now 立即执行 + 写 run + (MESSAGE 投递)
 *   - GET /inbox       结果箱分页
 *   - GET /inbox/unread-count
 *   - POST /inbox/:runId/read 标记已读
 */

const m = vi.hoisted(() => ({
  // AgentTask
  agentTaskFindMany: vi.fn(),
  agentTaskFindFirst: vi.fn(),
  agentTaskCount: vi.fn(),
  agentTaskCreate: vi.fn(),
  agentTaskUpdate: vi.fn(),
  agentTaskDelete: vi.fn(),
  // AgentTaskRun
  agentTaskRunFindMany: vi.fn(),
  agentTaskRunCount: vi.fn(),
  agentTaskRunFindFirst: vi.fn(),
  agentTaskRunCreate: vi.fn(),
  agentTaskRunUpdate: vi.fn(),
  // Message
  messageCreate: vi.fn(),
  notificationSubscriptionUpsert: vi.fn(),
  notificationSubscriptionDeleteMany: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    agentTask: {
      findMany: m.agentTaskFindMany,
      findFirst: m.agentTaskFindFirst,
      count: m.agentTaskCount,
      create: m.agentTaskCreate,
      update: m.agentTaskUpdate,
      delete: m.agentTaskDelete,
    },
    agentTaskRun: {
      findMany: m.agentTaskRunFindMany,
      count: m.agentTaskRunCount,
      findFirst: m.agentTaskRunFindFirst,
      create: m.agentTaskRunCreate,
      update: m.agentTaskRunUpdate,
    },
    message: { create: m.messageCreate },
    notificationSubscription: {
      upsert: m.notificationSubscriptionUpsert,
      deleteMany: m.notificationSubscriptionDeleteMany,
    },
  },
}))

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { userId: req.headers['x-test-userid'] || 'u1', phone: '13800000000', certLevel: 'NONE' }
    next()
  },
}))

// 用 spy 替换 DEMAND_DIGEST.run；保持 validateFilters/注册表原行为
const runSpy = vi.fn()
vi.mock('../services/agent/task-types/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/agent/task-types/index.js')>()
  const real = actual.getTaskType(actual.DEMAND_DIGEST_ID)!
  return {
    ...actual,
    getTaskType: (id: string) => {
      if (id === 'DEMAND_DIGEST') return { ...real, run: runSpy }
      return actual.getTaskType(id)
    },
  }
})

import { agentTasksRouter } from '../routes/agent-tasks.js'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/agent/tasks', agentTasksRouter)
  return app
}

beforeEach(() => {
  process.env.NOTIFICATION_SOVEREIGNTY_ENABLED = '0'
  for (const fn of Object.values(m)) fn.mockReset()
  runSpy.mockReset()
  m.notificationSubscriptionUpsert.mockResolvedValue({})
  m.notificationSubscriptionDeleteMany.mockResolvedValue({ count: 0 })
})

// ─── GET / ────────────────────────────────────────────────────────────────

describe('GET /', () => {
  it('returns task list for current user', async () => {
    const app = buildApp()
    m.agentTaskFindMany.mockResolvedValueOnce([{ id: 't1', name: '王者' }])
    const r = await request(app).get('/api/agent/tasks')
    expect(r.status).toBe(200)
    expect(r.body.tasks).toHaveLength(1)
    expect(m.agentTaskFindMany.mock.calls[0][0]).toMatchObject({
      where: { userId: 'u1' },
    })
  })
})

// ─── POST / ───────────────────────────────────────────────────────────────

describe('POST /', () => {
  it('creates a HOURLY task with defaults', async () => {
    const app = buildApp()
    m.agentTaskCount.mockResolvedValueOnce(0)
    m.agentTaskCreate.mockResolvedValueOnce({
      id: 't-new',
      userId: 'u1',
      name: '王者推送',
      type: 'DEMAND_DIGEST',
      enabled: true,
      frequency: 'HOURLY',
      atHour: null,
      atMinute: 0,
      weekday: null,
      filters: { keyword: '王者', limit: 10 },
      deliveryChannels: ['MESSAGE', 'AGENT_INBOX'],
      nextRunAt: new Date('2026-06-22T11:00:00Z'),
    })

    const r = await request(app)
      .post('/api/agent/tasks')
      .send({
        name: '王者推送',
        type: 'DEMAND_DIGEST',
        frequency: 'HOURLY',
        filters: { keyword: '王者' },
      })

    expect(r.status).toBe(201)
    expect(r.body.task.id).toBe('t-new')
    const createArgs = m.agentTaskCreate.mock.calls[0][0]
    expect(createArgs.data.userId).toBe('u1')
    expect(createArgs.data.type).toBe('DEMAND_DIGEST')
    expect(createArgs.data.frequency).toBe('HOURLY')
    expect(createArgs.data.deliveryChannels).toEqual(['MESSAGE', 'AGENT_INBOX'])
    expect(createArgs.data.filters).toEqual({ keyword: '王者', limit: 10 })
    expect(createArgs.data.nextRunAt).toBeInstanceOf(Date)
  })

  it('rejects when over quota (5 tasks)', async () => {
    const app = buildApp()
    m.agentTaskCount.mockResolvedValueOnce(5)
    const r = await request(app)
      .post('/api/agent/tasks')
      .send({ name: 'x', type: 'DEMAND_DIGEST', frequency: 'HOURLY', filters: {} })
    expect(r.status).toBe(400)
    expect(r.body.message).toContain('上限')
    expect(m.agentTaskCreate).not.toHaveBeenCalled()
  })

  it('rejects unknown type', async () => {
    const app = buildApp()
    m.agentTaskCount.mockResolvedValueOnce(0)
    const r = await request(app)
      .post('/api/agent/tasks')
      .send({ name: 'x', type: 'GHOST', frequency: 'HOURLY', filters: {} })
    expect(r.status).toBe(400)
    expect(r.body.message).toContain('DEMAND_DIGEST')
  })

  it('rejects invalid filters', async () => {
    const app = buildApp()
    m.agentTaskCount.mockResolvedValueOnce(0)
    const r = await request(app)
      .post('/api/agent/tasks')
      .send({ name: 'x', type: 'DEMAND_DIGEST', frequency: 'HOURLY', filters: { minPrice: -5 } })
    expect(r.status).toBe(400)
    expect(r.body.message).toContain('filters')
  })

  it('rejects DAILY without atHour', async () => {
    const app = buildApp()
    m.agentTaskCount.mockResolvedValueOnce(0)
    const r = await request(app)
      .post('/api/agent/tasks')
      .send({ name: 'x', type: 'DEMAND_DIGEST', frequency: 'DAILY', filters: {} })
    expect(r.status).toBe(400)
    expect(r.body.message).toContain('atHour')
  })

  it('rejects WEEKLY without weekday', async () => {
    const app = buildApp()
    m.agentTaskCount.mockResolvedValueOnce(0)
    const r = await request(app)
      .post('/api/agent/tasks')
      .send({ name: 'x', type: 'DEMAND_DIGEST', frequency: 'WEEKLY', atHour: 9, filters: {} })
    expect(r.status).toBe(400)
    expect(r.body.message).toContain('weekday')
  })

  it('rejects name > 50 chars', async () => {
    const app = buildApp()
    m.agentTaskCount.mockResolvedValueOnce(0)
    const r = await request(app)
      .post('/api/agent/tasks')
      .send({ name: 'a'.repeat(51), type: 'DEMAND_DIGEST', frequency: 'HOURLY', filters: {} })
    expect(r.status).toBe(400)
  })
})

// ─── GET /:id ─────────────────────────────────────────────────────────────

describe('GET /:id', () => {
  it('returns task + recentRuns', async () => {
    const app = buildApp()
    m.agentTaskFindFirst.mockResolvedValueOnce({ id: 't1', userId: 'u1', name: 'x' })
    m.agentTaskRunFindMany.mockResolvedValueOnce([{ id: 'r1' }])

    const r = await request(app).get('/api/agent/tasks/t1')
    expect(r.status).toBe(200)
    expect(r.body.task.id).toBe('t1')
    expect(r.body.recentRuns).toHaveLength(1)
  })

  it('404 when task belongs to other user', async () => {
    const app = buildApp()
    m.agentTaskFindFirst.mockResolvedValueOnce(null)
    const r = await request(app).get('/api/agent/tasks/t1')
    expect(r.status).toBe(404)
  })
})

// ─── PATCH /:id ───────────────────────────────────────────────────────────

describe('PATCH /:id', () => {
  it('updates enabled', async () => {
    const app = buildApp()
    m.agentTaskFindFirst.mockResolvedValueOnce({
      id: 't1',
      userId: 'u1',
      type: 'DEMAND_DIGEST',
      frequency: 'HOURLY',
      atHour: null,
      atMinute: 0,
      weekday: null,
    })
    m.agentTaskUpdate.mockResolvedValueOnce({ id: 't1', enabled: false })

    const r = await request(app)
      .patch('/api/agent/tasks/t1')
      .send({ enabled: false })

    expect(r.status).toBe(200)
    expect(r.body.task.enabled).toBe(false)
    expect(m.agentTaskUpdate.mock.calls[0][0].data.enabled).toBe(false)
  })

  it('updates schedule and recomputes nextRunAt', async () => {
    const app = buildApp()
    m.agentTaskFindFirst.mockResolvedValueOnce({
      id: 't1',
      userId: 'u1',
      type: 'DEMAND_DIGEST',
      frequency: 'HOURLY',
      atHour: null,
      atMinute: 0,
      weekday: null,
    })
    m.agentTaskUpdate.mockResolvedValueOnce({ id: 't1' })

    const r = await request(app)
      .patch('/api/agent/tasks/t1')
      .send({ frequency: 'DAILY', atHour: 9, atMinute: 30 })

    expect(r.status).toBe(200)
    const data = m.agentTaskUpdate.mock.calls[0][0].data
    expect(data.frequency).toBe('DAILY')
    expect(data.atHour).toBe(9)
    expect(data.atMinute).toBe(30)
    expect(data.nextRunAt).toBeInstanceOf(Date)
  })

  it('rejects invalid filters', async () => {
    const app = buildApp()
    m.agentTaskFindFirst.mockResolvedValueOnce({
      id: 't1',
      userId: 'u1',
      type: 'DEMAND_DIGEST',
      frequency: 'HOURLY',
      atHour: null,
      atMinute: 0,
      weekday: null,
    })
    const r = await request(app)
      .patch('/api/agent/tasks/t1')
      .send({ filters: { serviceType: 'BOTH' } })
    expect(r.status).toBe(400)
  })

  it('404 when not owned', async () => {
    const app = buildApp()
    m.agentTaskFindFirst.mockResolvedValueOnce(null)
    const r = await request(app).patch('/api/agent/tasks/t1').send({ enabled: false })
    expect(r.status).toBe(404)
  })
})

// ─── DELETE /:id ──────────────────────────────────────────────────────────

describe('DELETE /:id', () => {
  it('deletes when owned', async () => {
    const app = buildApp()
    m.agentTaskFindFirst.mockResolvedValueOnce({ id: 't1' })
    m.agentTaskDelete.mockResolvedValueOnce({ id: 't1' })

    const r = await request(app).delete('/api/agent/tasks/t1')
    expect(r.status).toBe(204)
    expect(m.agentTaskDelete).toHaveBeenCalledOnce()
  })

  it('404 when not owned', async () => {
    const app = buildApp()
    m.agentTaskFindFirst.mockResolvedValueOnce(null)
    const r = await request(app).delete('/api/agent/tasks/t1')
    expect(r.status).toBe(404)
    expect(m.agentTaskDelete).not.toHaveBeenCalled()
  })
})

// ─── POST /:id/run-now ────────────────────────────────────────────────────

describe('POST /:id/run-now', () => {
  it('runs DEMAND_DIGEST, writes run, sends MESSAGE; returns run', async () => {
    const app = buildApp()
    m.agentTaskFindFirst.mockResolvedValueOnce({
      id: 't1',
      userId: 'u1',
      name: '王者推送',
      type: 'DEMAND_DIGEST',
      filters: { keyword: '王者' },
      deliveryChannels: ['MESSAGE', 'AGENT_INBOX'],
    })
    runSpy.mockResolvedValueOnce({ count: 2, summary: '共找到 2 条匹配需求', payload: [{}, {}] })
    m.agentTaskRunCreate.mockResolvedValueOnce({
      id: 'r-new',
      status: 'SUCCESS',
      resultCount: 2,
      summary: '共找到 2 条匹配需求',
    })

    const r = await request(app).post('/api/agent/tasks/t1/run-now')

    expect(r.status).toBe(200)
    expect(r.body.run.id).toBe('r-new')
    expect(runSpy).toHaveBeenCalledWith('u1', { keyword: '王者' })
    expect(m.agentTaskRunCreate.mock.calls[0][0].data.status).toBe('SUCCESS')
    expect(m.messageCreate.mock.calls[0][0].data.content).toContain('[AGENT_TASK]')
    expect(m.messageCreate.mock.calls[0][0].data.content).toContain('王者推送')
    expect(m.agentTaskUpdate).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { lastRunAt: expect.any(Date), lastSummary: '共找到 2 条匹配需求' },
    })
  })

  it('writes ERROR run when run() throws; no MESSAGE', async () => {
    const app = buildApp()
    m.agentTaskFindFirst.mockResolvedValueOnce({
      id: 't1',
      userId: 'u1',
      name: 'x',
      type: 'DEMAND_DIGEST',
      filters: {},
      deliveryChannels: ['MESSAGE', 'AGENT_INBOX'],
    })
    runSpy.mockRejectedValueOnce(new Error('boom'))
    m.agentTaskRunCreate.mockResolvedValueOnce({
      id: 'r-err',
      status: 'ERROR',
      resultCount: 0,
      summary: '执行失败：boom',
    })

    const r = await request(app).post('/api/agent/tasks/t1/run-now')

    expect(r.status).toBe(200)
    expect(r.body.run.status).toBe('ERROR')
    expect(m.messageCreate).not.toHaveBeenCalled()
  })

  it('does not send MESSAGE when channels exclude it', async () => {
    const app = buildApp()
    m.agentTaskFindFirst.mockResolvedValueOnce({
      id: 't1',
      userId: 'u1',
      name: 'x',
      type: 'DEMAND_DIGEST',
      filters: {},
      deliveryChannels: ['AGENT_INBOX'],
    })
    runSpy.mockResolvedValueOnce({ count: 1, summary: 's', payload: [{}] })
    m.agentTaskRunCreate.mockResolvedValueOnce({ id: 'r1', status: 'SUCCESS' })

    const r = await request(app).post('/api/agent/tasks/t1/run-now')

    expect(r.status).toBe(200)
    expect(m.messageCreate).not.toHaveBeenCalled()
  })
})

// ─── inbox ────────────────────────────────────────────────────────────────

describe('GET /inbox', () => {
  it('returns paginated runs for current user', async () => {
    const app = buildApp()
    m.agentTaskRunFindMany.mockResolvedValueOnce([{ id: 'r1', task: { id: 't1', name: 'x', type: 'DEMAND_DIGEST' } }])
    m.agentTaskRunCount.mockResolvedValueOnce(7)

    const r = await request(app).get('/api/agent/tasks/inbox?limit=5&offset=2')

    expect(r.status).toBe(200)
    expect(r.body.runs).toHaveLength(1)
    expect(r.body.total).toBe(7)
    expect(m.agentTaskRunFindMany.mock.calls[0][0]).toMatchObject({
      where: { task: { userId: 'u1' } },
      take: 5,
      skip: 2,
    })
  })

  it('caps limit at 100', async () => {
    const app = buildApp()
    m.agentTaskRunFindMany.mockResolvedValueOnce([])
    m.agentTaskRunCount.mockResolvedValueOnce(0)
    await request(app).get('/api/agent/tasks/inbox?limit=999')
    expect(m.agentTaskRunFindMany.mock.calls[0][0].take).toBe(100)
  })
})

describe('GET /inbox/unread-count', () => {
  it('counts runs where readAt is null', async () => {
    const app = buildApp()
    m.agentTaskRunCount.mockResolvedValueOnce(3)
    const r = await request(app).get('/api/agent/tasks/inbox/unread-count')
    expect(r.status).toBe(200)
    expect(r.body.count).toBe(3)
    expect(m.agentTaskRunCount.mock.calls[0][0]).toMatchObject({
      where: { task: { userId: 'u1' }, readAt: null },
    })
  })
})

describe('POST /inbox/:runId/read', () => {
  it('marks read when owned', async () => {
    const app = buildApp()
    m.agentTaskRunFindFirst.mockResolvedValueOnce({ id: 'r1', readAt: null })
    m.agentTaskRunUpdate.mockResolvedValueOnce({ id: 'r1' })

    const r = await request(app).post('/api/agent/tasks/inbox/r1/read')
    expect(r.status).toBe(204)
    expect(m.agentTaskRunUpdate).toHaveBeenCalledOnce()
  })

  it('does not re-update when already read', async () => {
    const app = buildApp()
    m.agentTaskRunFindFirst.mockResolvedValueOnce({ id: 'r1', readAt: new Date() })

    const r = await request(app).post('/api/agent/tasks/inbox/r1/read')
    expect(r.status).toBe(204)
    expect(m.agentTaskRunUpdate).not.toHaveBeenCalled()
  })

  it('404 when not owned', async () => {
    const app = buildApp()
    m.agentTaskRunFindFirst.mockResolvedValueOnce(null)
    const r = await request(app).post('/api/agent/tasks/inbox/r1/read')
    expect(r.status).toBe(404)
  })
})
