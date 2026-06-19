/**
 * AI 2.8 卡池生命周期管理
 * 5 阶段衰减 + 10 倍弹性延期
 */

import { prisma } from '../lib/prisma.js'

const DAY = 86400000

export async function runLifecycleCron() {
  const now = new Date()
  const stats = { toNoCover: 0, toNoDetail: 0, toArchived: 0 }

  // 1. ACTIVE → NO_COVER: 封面到期
  const noCover = await prisma.demand.updateMany({
    where: {
      lifecycleStage: 'ACTIVE',
      coverDeletedAt: { lte: now },
    },
    data: {
      lifecycleStage: 'NO_COVER',
      coverImage: null,
    },
  })
  stats.toNoCover = noCover.count

  // 2. NO_COVER → NO_DETAIL: 详情到期
  const noDetail = await prisma.demand.updateMany({
    where: {
      lifecycleStage: 'NO_COVER',
      detailDeletedAt: { lte: now },
    },
    data: {
      lifecycleStage: 'NO_DETAIL',
      description: '',
    },
  })
  stats.toNoDetail = noDetail.count

  // 3. NO_DETAIL → ARCHIVED: 整卡删除（移入死池）
  const archived = await prisma.demand.updateMany({
    where: {
      lifecycleStage: 'NO_DETAIL',
      fullDeletedAt: { lte: now },
    },
    data: {
      lifecycleStage: 'ARCHIVED',
      title: '(已归档)',
    },
  })
  stats.toArchived = archived.count

  if (stats.toNoCover > 0 || stats.toNoDetail > 0 || stats.toArchived > 0) {
    console.log(
      `[lifecycle] noCover: ${stats.toNoCover}, noDetail: ${stats.toNoDetail}, archived: ${stats.toArchived}`,
    )
  }
}

export function extendLifecycle(
  coverDeletedAt: Date,
  detailDeletedAt: Date,
  fullDeletedAt: Date,
  extendMonths: number,
): {
  newCover: Date
  newDetail: Date
  newFull: Date
} {
  const now = new Date()
  const oneDayLater = new Date(now.getTime() + DAY)

  // 封面删除 = max(延期后, now + 1d)
  let newCover = new Date(coverDeletedAt.getTime() + extendMonths * 30 * DAY)
  if (newCover < oneDayLater) newCover = oneDayLater

  // 详情删除 = max(提前 10*n 月, coverDeletedAt + 1d)
  let newDetail = new Date(
    detailDeletedAt.getTime() - extendMonths * 10 * 30 * DAY,
  )
  const minDetail = new Date(newCover.getTime() + DAY)
  if (newDetail < minDetail) newDetail = minDetail

  // 整卡删除 = max(提前 10*n 月, detailDeletedAt + 1d)
  let newFull = new Date(
    fullDeletedAt.getTime() - extendMonths * 10 * 30 * DAY,
  )
  const minFull = new Date(newDetail.getTime() + DAY)
  if (newFull < minFull) newFull = minFull

  return { newCover, newDetail, newFull }
}

/** 初始化需求生命周期（发布时调用） */
export function initLifecycle(
  visibilityWindowDays: number,
): {
  coverDeletedAt: Date
  detailDeletedAt: Date
  fullDeletedAt: Date
} {
  const now = new Date()
  const coverMonths = 1
  const detailMonths = 12
  const fullMonths = 24

  return {
    coverDeletedAt: new Date(now.getTime() + coverMonths * 30 * DAY),
    detailDeletedAt: new Date(now.getTime() + detailMonths * 30 * DAY),
    fullDeletedAt: new Date(now.getTime() + fullMonths * 30 * DAY),
  }
}
