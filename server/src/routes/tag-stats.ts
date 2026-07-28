import { Router, Request, Response } from 'express'
import { success, fail } from '../utils/response.js'
import { prisma } from '../lib/prisma.js'
import { refreshTagStats, getPlatformTrends, getOverviewExtras } from '../services/tag-stats.js'
import { adminGate } from '../middleware/admin-gate.js'

export const tagStatsRouter = Router()

// GET /api/tag-stats?tagName=&regionId=
tagStatsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const tagName = req.query.tagName as string | undefined
    const regionId = req.query.regionId ? Number(req.query.regionId) : undefined

    const where: any = {}
    if (tagName) where.tagName = tagName
    if (regionId) where.regionId = regionId

    let stats = await prisma.tagStats.findMany({
      where,
      orderBy: { totalAmount: 'desc' },
      take: 50,
    })

    // 表为空时自动刷新一次
    if (stats.length === 0) {
      await refreshTagStats()
      stats = await prisma.tagStats.findMany({
        where,
        orderBy: { totalAmount: 'desc' },
        take: 50,
      })
    }

    success(res, {
      stats: stats.map((s) => ({
        ...s,
        // 前端统一使用 completedOrders，与 DB totalCards 对齐
        completedOrders: s.totalCards,
      })),
      colors: stats.map((s) => ({
        tagName: s.tagName,
        regionId: s.regionId,
        color: calculateColor(s.avgAmount, stats.map((x) => x.avgAmount)),
      })),
    })
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})


// GET /api/tag-stats/overview — 主要指标总览（P2-01）
tagStatsRouter.get('/overview', async (_req: Request, res: Response) => {
  try {
    const [userCount, orderCount, demandCount, completedOrderAgg, allStats, extras] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.demand.count(),
      prisma.order.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { agreedPrice: true },
        _count: { id: true },
      }),
      prisma.tagStats.findMany({ select: { totalCards: true, activeProviders: true, activeDemands: true } }),
      getOverviewExtras(),
    ])
    const totalTags = allStats.length
    const activeTags = allStats.filter(
      (s) => (s.totalCards || 0) > 0 || (s.activeProviders || 0) > 0,
    ).length
    const totalRevenue = Number(completedOrderAgg._sum.agreedPrice || 0)
    success(res, {
      overview: {
        userCount,
        orderCount,
        demandCount,
        revenue: totalRevenue,
        totalTags,
        activeTags,
        completedOrders: completedOrderAgg._count.id,
        newDemandsThisWeek: extras.newDemandsThisWeek,
        relatedDemands: extras.activeDemandsCount,
      },
    })
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

// GET /api/tag-stats/trends?days=30 — 平台时间序列
tagStatsRouter.get('/trends', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 30
    const trends = await getPlatformTrends(Number.isFinite(days) ? days : 30)
    success(res, trends)
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

// POST /api/tag-stats/refresh — 手动刷新统计（仅管理员）
tagStatsRouter.post('/refresh', adminGate, async (_req: Request, res: Response) => {
  try {
    const result = await refreshTagStats()
    success(res, result, '刷新完成')
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

function calculateColor(amount: number, all: number[]): string {
  if (all.length === 0) return '#6b7280'
  const sorted = all.sort((a, b) => a - b)
  const idx = sorted.indexOf(amount)
  const pct = idx / sorted.length
  if (pct >= 0.9) return '#ef4444'
  if (pct >= 0.75) return '#f59e0b'
  if (pct >= 0.5) return '#22c55e'
  if (pct >= 0.25) return '#06b6d4'
  return '#6b7280'
}
