import { Router, Request, Response } from 'express'
import { success, fail } from '../utils/response.js'
import { prisma } from '../lib/prisma.js'
import { refreshTagStats } from '../services/tag-stats.js'

export const tagStatsRouter = Router()

// GET /api/tag-stats?tagName=&regionId=
tagStatsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const tagName = req.query.tagName as string | undefined
    const regionId = req.query.regionId ? Number(req.query.regionId) : undefined

    const where: any = {}
    if (tagName) where.tagName = tagName
    if (regionId) where.regionId = regionId

    const stats = await prisma.tagStats.findMany({
      where,
      orderBy: { totalAmount: 'desc' },
      take: 50,
    })

    success(res, {
      stats,
      // 色条颜色计算
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

// POST /api/tag-stats/refresh — 手动刷新统计
tagStatsRouter.post('/refresh', async (_req: Request, res: Response) => {
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
