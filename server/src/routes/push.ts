import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { z } from 'zod'
import { success, fail } from '../utils/response.js'
import { prisma } from '../lib/prisma.js'
import { matchAndPush } from '../services/push-engine.js'
import rateLimit from 'express-rate-limit'

export const pushRouter = Router()

const isProd = process.env.NODE_ENV === 'production'
const skipRateLimit = !isProd || process.env.DISABLE_RATE_LIMIT === '1'

/** 手动执行推送限流 */
export const pushExecuteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => skipRateLimit,
  keyGenerator: (req) => {
    const userId = (req as { user?: { userId: string } }).user?.userId ?? 'anon'
    const demandId = req.params.demandId ?? 'unknown'
    return `push-exec:${userId}:${demandId}`
  },
  message: { code: 429, message: '推送执行过于频繁，请稍后再试', timestamp: Date.now() },
})

// GET /api/pushes/preferences
pushRouter.get('/preferences', authMiddleware, async (req: Request, res: Response) => {
  try {
    let pref = await prisma.pushPreference.findUnique({
      where: { userId: req.user!.userId },
    })
    if (!pref) {
      // 无记录：返回建议空壳，不自动 create（避免把「无偏好」写成默认全开）
      success(res, {
        userId: req.user!.userId,
        receivePushes: null,
        pushFrequency: null,
        excludeKeywords: [],
        excludeTags: [],
        excludeRegions: [],
        exists: false,
        note: '无 PushPreference：不得解释为默认接受全部通知',
      })
      return
    }
    success(res, { ...pref, exists: true })
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

const prefSchema = z.object({
  excludeKeywords: z.array(z.string()).optional(),
  excludeTags: z.array(z.string()).optional(),
  excludeRegions: z.array(z.number()).optional(),
  receivePushes: z.boolean().optional(),
  pushFrequency: z.enum(['HIGH', 'NORMAL', 'LOW', 'OFF']).optional(),
})

// PUT /api/pushes/preferences — 保留兼容；主权设置请用 /api/notifications/*
pushRouter.put('/preferences', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = prefSchema.parse(req.body)
    const pref = await prisma.pushPreference.upsert({
      where: { userId: req.user!.userId },
      update: data,
      create: { userId: req.user!.userId, ...data },
    })
    success(res, pref, '偏好已更新（兼容层；正向订阅请在推送设置中明确保存）')
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数错误', 400, e.errors)
    fail(res, e.message || 'server error', 500)
  }
})

const pushExecSchema = z.object({
  tags: z.array(z.string()).optional(),
  regions: z.array(z.number()).optional(),
  ageMin: z.number().optional(),
  ageMax: z.number().optional(),
})

async function assertCanExecutePush(userId: string, demandId: string) {
  const demand = await prisma.demand.findUnique({
    where: { id: demandId },
    select: { id: true, userId: true },
  })
  if (!demand) {
    throw Object.assign(new Error('需求不存在'), { status: 404 })
  }
  if (demand.userId === userId) return demand
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (me?.role === 'ADMIN') return demand
  throw Object.assign(new Error('仅需求所有者或管理员可执行推送'), { status: 403 })
}

// POST /api/pushes/execute/:demandId — 执行推送（所有权 + 限流 + 审计）
pushRouter.post(
  '/execute/:demandId',
  authMiddleware,
  pushExecuteLimiter,
  async (req: Request, res: Response) => {
    try {
      const demandId = req.params.demandId as string
      const actorId = req.user!.userId
      await assertCanExecutePush(actorId, demandId)
      const target = pushExecSchema.parse(req.body)
      const io = req.app.get('io')
      const result = await matchAndPush(demandId, target, io)

      // 审计：不入用户通知表；写简易日志行到 NotificationDelivery 抑制记录可选
      // 使用 SYSTEM 资源类型避免污染用户投递统计：仅 console + 返回体
      console.info('[push:execute]', {
        actorId,
        demandId,
        sent: result.totalSent,
        rejected: result.totalRejected,
        sovereignty: result.sovereignty,
      })

      success(res, result, '推送完成')
    } catch (e: any) {
      if (e instanceof z.ZodError) return fail(res, '参数错误', 400, e.errors)
      fail(res, e.message || 'server error', e.status || 500)
    }
  },
)
