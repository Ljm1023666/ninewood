/**
 * AI 2.8 标签统计分析
 * 按标签 × 区域维度聚合市场指标
 */

import { prisma } from '../lib/prisma.js'

export async function refreshTagStats(tagName?: string, regionId?: number) {
  const where: any = {}
  if (tagName) where.tagName = tagName
  if (regionId) where.regionId = regionId

  // 分组聚合
  const groups = await prisma.userTag.groupBy({
    by: ['tagName', 'regionId'],
    where,
    _count: { id: true },
    _avg: { rating: true },
  })

  for (const g of groups) {
    // 活跃服务者数
    const activeProviders = await prisma.userTag.count({
      where: {
        tagName: g.tagName,
        regionId: g.regionId,
        status: 'IDLE',
      },
    })

    // 活跃需求数
    const activeDemands = await prisma.demand.count({
      where: {
        tags: { has: g.tagName },
        regionId: g.regionId || undefined,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
    })

    // 已完成卡牌统计
    const completed = await prisma.demand.findMany({
      where: {
        tags: { has: g.tagName },
        regionId: g.regionId || undefined,
        status: 'COMPLETED',
      },
      select: { minPrice: true },
    })

    const totalCards = completed.length
    const totalAmount = completed.reduce((s, c) => s + Number(c.minPrice), 0)
    const avgAmount = totalCards > 0 ? totalAmount / totalCards : 0

    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)

    await prisma.tagStats.upsert({
      where: {
        tagName_regionId_periodStart: {
          tagName: g.tagName,
          regionId: g.regionId ?? 0,
          periodStart,
        },
      },
      update: {
        totalCards,
        totalAmount,
        avgAmount,
        activeProviders,
        activeDemands,
        updatedAt: now,
      },
      create: {
        tagName: g.tagName,
        regionId: g.regionId ?? 0,
        totalCards,
        totalAmount,
        avgAmount,
        activeProviders,
        activeDemands,
        periodStart,
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      },
    })
  }

  return { groupsUpdated: groups.length }
}
