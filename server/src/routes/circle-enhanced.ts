/**
 * AI 2.9 需求圈增强 API
 * 公开圈、圈内需求流转、升级体系
 */

import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { z } from 'zod'
import { success, fail } from '../utils/response.js'
import { prisma } from '../lib/prisma.js'

export const circleEnhancedRouter = Router()

// GET /api/circles-enhanced — 公开圈列表
circleEnhancedRouter.get('/', async (req: Request, res: Response) => {
  try {
    const regionId = req.query.regionId ? Number(req.query.regionId) : undefined
    const page = req.query.page ? Number(req.query.page) : 1
    const limit = req.query.limit ? Number(req.query.limit) : 20

    const where: any = { type: 'PUBLIC', status: 'ACTIVE' }
    if (regionId) where.cityCode = String(regionId)

    const [circles, total] = await Promise.all([
      prisma.circle.findMany({
        where,
        include: { _count: { select: { members: true, demands: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { memberCount: 'desc' },
      }),
      prisma.circle.count({ where }),
    ])

    success(res, { circles, total, page, totalPages: Math.ceil(total / limit) })
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

const createCircleSchema = z.object({
  name: z.string().min(2).max(50),
  type: z.enum(['PRIVATE', 'PUBLIC']).default('PRIVATE'),
  cityCode: z.string().optional(),
})

// POST /api/circles-enhanced — 创建需求圈
circleEnhancedRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = createCircleSchema.parse(req.body)

    // 公开圈需带地区前缀
    if (data.type === 'PUBLIC' && !data.name.includes('需求圈')) {
      return fail(res, '公开圈名称需包含"需求圈"', 400)
    }

    const circle = await prisma.circle.create({
      data: {
        name: data.name,
        type: data.type,
        ownerId: req.user!.userId,
        cityCode: data.cityCode || null,
      },
    })

    // 自动加入
    await prisma.circleMember.create({
      data: {
        circleId: circle.id,
        userId: req.user!.userId,
        role: 'OWNER',
      },
    })

    success(res, circle, '创建成功', 201)
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数错误', 400, e.errors)
    fail(res, e.message || 'server error', 500)
  }
})

// POST /api/circles-enhanced/:id/join — 加入需求圈
circleEnhancedRouter.post('/:id/join', authMiddleware, async (req: Request, res: Response) => {
  try {
    const circle = await prisma.circle.findUnique({ where: { id: req.params.id } })
    if (!circle) return fail(res, '圈子不存在', 404)

    const existing = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: circle.id, userId: req.user!.userId } },
    })
    if (existing) return fail(res, '已在圈内', 409)

    await prisma.circleMember.create({
      data: {
        circleId: circle.id,
        userId: req.user!.userId,
        role: 'MEMBER',
      },
    })

    await prisma.circle.update({
      where: { id: circle.id },
      data: { memberCount: { increment: 1 } },
    })

    success(res, null, '加入成功')
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

// POST /api/circles-enhanced/:id/publish-demand — 圈内发布需求
circleEnhancedRouter.post('/:id/publish-demand', authMiddleware, async (req: Request, res: Response) => {
  try {
    const circle = await prisma.circle.findUnique({ where: { id: req.params.id } })
    if (!circle) return fail(res, '圈子不存在', 404)

    const {
      title, description, expectedOutcome, minPrice,
      category, serviceType,
    } = req.body
    if (!title || !description || !expectedOutcome || !minPrice) {
      return fail(res, '缺少必填字段', 400)
    }

    const demand = await prisma.demand.create({
      data: {
        userId: req.user!.userId,
        title,
        description,
        expectedOutcome,
        minPrice,
        category: category || '圈内需求',
        serviceType: serviceType || 'ONLINE',
        expireAt: new Date(Date.now() + 15 * 60000),
        visibilityWindow: 15,
        visibleUntil: new Date(Date.now() + 15 * 60000),
        circleId: circle.id,
        isPublic: false,
        status: 'ACTIVE',
      },
    })

    // 关联圈内
    await prisma.circleDemand.create({
      data: {
        circleId: circle.id,
        demandId: demand.id,
      },
    })

    success(res, { demand, circle }, '发布成功', 201)
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

// POST /api/circles-enhanced/:id/demands/:demandId/publish — 将圈内需求公开
circleEnhancedRouter.post('/:id/demands/:demandId/publish', authMiddleware, async (req: Request, res: Response) => {
  try {
    const cd = await prisma.circleDemand.findUnique({
      where: { circleId_demandId: { circleId: req.params.id, demandId: req.params.demandId } },
    })
    if (!cd) return fail(res, '关联不存在', 404)

    await prisma.circleDemand.update({
      where: { circleId_demandId: { circleId: req.params.id, demandId: req.params.demandId } },
      data: { isPublic: true },
    })

    await prisma.demand.update({
      where: { id: cd.demandId },
      data: { isPublic: true },
    })

    success(res, null, '已公开到大众市场')
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

// GET /api/circles-enhanced/:id/demands — 查看圈内需求
circleEnhancedRouter.get('/:id/demands', async (req: Request, res: Response) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1
    const limit = req.query.limit ? Number(req.query.limit) : 20

    const where = { circleId: req.params.id }
    const [demands, total] = await Promise.all([
      prisma.circleDemand.findMany({
        where,
        include: {
          demand: {
            include: {
              user: { select: { id: true, nickname: true, avatarUrl: true } },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.circleDemand.count({ where }),
    ])

    success(res, { demands, total, page, totalPages: Math.ceil(total / limit) })
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})
