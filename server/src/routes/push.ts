import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { z } from 'zod'
import { success, fail } from '../utils/response.js'
import { prisma } from '../lib/prisma.js'
import { matchAndPush } from '../services/push-engine.js'

export const pushRouter = Router()

// GET /api/pushes/preferences
pushRouter.get('/preferences', authMiddleware, async (req: Request, res: Response) => {
  try {
    let pref = await prisma.pushPreference.findUnique({
      where: { userId: req.user!.userId },
    })
    if (!pref) {
      pref = await prisma.pushPreference.create({
        data: { userId: req.user!.userId },
      })
    }
    success(res, pref)
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

// PUT /api/pushes/preferences
pushRouter.put('/preferences', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = prefSchema.parse(req.body)
    const pref = await prisma.pushPreference.upsert({
      where: { userId: req.user!.userId },
      update: data,
      create: { userId: req.user!.userId, ...data },
    })
    success(res, pref, '偏好已更新')
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

// POST /api/pushes/execute/:demandId — 执行推送
pushRouter.post('/execute/:demandId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const target = pushExecSchema.parse(req.body)
    const result = await matchAndPush(req.params.demandId, target)
    success(res, result, '推送完成')
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数错误', 400, e.errors)
    fail(res, e.message || 'server error', 500)
  }
})
