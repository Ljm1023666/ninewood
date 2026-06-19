import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { z } from 'zod'
import { success, fail } from '../utils/response.js'
import { prisma } from '../lib/prisma.js'

export const providerRouter = Router()

const qstr = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : undefined

// 匿名化 userId
function anonymize(id: string): string {
  return id.slice(0, 8) + '...'
}

// ═══ PART B: 服务者检索 ═══

// GET /api/providers/search — 普通检索（仅 IDLE）
providerRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const tagName = qstr(req.query.tagName)
    const regionId = req.query.regionId ? Number(req.query.regionId) : undefined
    const page = req.query.page ? Number(req.query.page) : 1
    const limit = req.query.limit ? Number(req.query.limit) : 20

    const where: any = { status: 'IDLE' }
    if (tagName) where.tagName = tagName
    if (regionId) where.regionId = regionId

    const [providers, total] = await Promise.all([
      prisma.userTag.findMany({
        where,
        select: {
          id: true,
          userId: true,
          tagName: true,
          rating: true,
          orderCount: true,
          regionId: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { orderCount: 'desc' },
      }),
      prisma.userTag.count({ where }),
    ])

    success(res, {
      providers: providers.map((p) => ({
        userId: anonymize(p.userId),
        tagName: p.tagName,
        status: 'IDLE',
        rating: p.rating,
        orderCount: p.orderCount,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

// POST /api/providers/special-search — 特殊检索（穿透 BUSY）
const specialSearchSchema = z.object({
  tagName: z.string().optional(),
  regionId: z.number().optional(),
  includeBusy: z.boolean().default(false),
  notifyOnIdle: z.boolean().default(false),
})

providerRouter.post('/special-search', async (req: Request, res: Response) => {
  try {
    const { tagName, regionId, includeBusy, notifyOnIdle } =
      specialSearchSchema.parse(req.body)

    const statuses = includeBusy ? ['IDLE', 'BUSY'] : ['IDLE']
    const where: any = { status: { in: statuses } }
    if (tagName) where.tagName = tagName
    if (regionId) where.regionId = regionId

    const providers = await prisma.userTag.findMany({
      where,
      select: {
        id: true,
        userId: true,
        tagName: true,
        status: true,
        rating: true,
        orderCount: true,
        regionId: true,
      },
      take: 50,
      orderBy: { rating: 'desc' },
    })

    success(res, {
      providers: providers.map((p) => ({
        userId: anonymize(p.userId),
        tagName: p.tagName,
        status: p.status,
        rating: p.rating,
        orderCount: p.orderCount,
        notifyOnIdle,
      })),
    })
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数错误', 400, e.errors)
    fail(res, e.message || 'server error', 500)
  }
})

// GET /api/providers/certified — 认证检索
providerRouter.get('/certified', async (req: Request, res: Response) => {
  try {
    const tagName = qstr(req.query.tagName)
    const regionId = req.query.regionId ? Number(req.query.regionId) : undefined
    const minLevel = qstr(req.query.minLevel) || 'BASIC'
    const page = req.query.page ? Number(req.query.page) : 1
    const limit = req.query.limit ? Number(req.query.limit) : 20

    const levelOrder = ['NONE', 'BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTER']
    const minIdx = levelOrder.indexOf(minLevel)

    const where: any = {
      certified: true,
      status: { in: ['IDLE', 'BUSY'] },
    }
    if (tagName) where.tagName = tagName
    if (regionId) where.regionId = regionId

    const [providers, total] = await Promise.all([
      prisma.userTag.findMany({
        where,
        include: {
          user: { select: { certificationLevel: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { rating: 'desc' },
      }),
      prisma.userTag.count({ where }),
    ])

    // Filter by min cert level in app (Prisma can't filter on related model's enum easily)
    const filtered = providers.filter((p) => {
      const idx = levelOrder.indexOf(p.user.certificationLevel)
      return idx >= minIdx
    })

    success(res, {
      providers: filtered.map((p) => ({
        userId: anonymize(p.userId),
        tagName: p.tagName,
        certified: true,
        rating: p.rating,
        orderCount: p.orderCount,
        certLevel: p.user.certificationLevel,
      })),
      total,
      page,
    })
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})
