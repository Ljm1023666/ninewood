/**
 * AI 2.7 推送匹配引擎
 * 7 步规则链 + 实际发送通知
 */

import { prisma } from '../lib/prisma.js'
import type { Server as SocketIOServer } from 'socket.io'

interface PushTarget {
  ageMin?: number
  ageMax?: number
  tags?: string[]
  regions?: number[]
  excludeKeywords?: string[]
  /** Stage 1.1: 仅当为 true 时才在 where 中加 autoReceive 筛透。手动推送路由不传此参。 */
  autoReceiveOnly?: boolean
}

interface PushResult {
  totalMatched: number
  totalRejected: number
  totalSent: number
  rejectReasons: Record<string, number>
}

/** 7 步判断链 */
export async function shouldReceivePush(
  userId: string,
  target: PushTarget,
): Promise<{ accept: boolean; reason?: string }> {
  const pref = await prisma.pushPreference.findUnique({
    where: { userId },
  })
  if (!pref) return { accept: true }

  // 1. 全局 OFF
  if (!pref.receivePushes) return { accept: false, reason: 'GLOBAL_OFF' }

  // 2. 命中 excludeKeywords
  if (
    target.excludeKeywords?.some((kw) => pref.excludeKeywords.includes(kw))
  ) {
    return { accept: false, reason: 'EXCLUDE_KEYWORD' }
  }

  // 3. 命中 excludeTags
  if (target.tags?.some((t) => pref.excludeTags.includes(t))) {
    return { accept: false, reason: 'EXCLUDE_TAG' }
  }

  // 4. 命中 excludeRegions
  if (target.regions?.some((r) => pref.excludeRegions.includes(r))) {
    return { accept: false, reason: 'EXCLUDE_REGION' }
  }

  // 5-7. 默认接受
  return { accept: true }
}

export async function matchAndPush(
  demandId: string,
  target: PushTarget,
  io?: SocketIOServer,
): Promise<PushResult> {
  const result: PushResult = {
    totalMatched: 0,
    totalRejected: 0,
    totalSent: 0,
    rejectReasons: {},
  }

  const demand = await prisma.demand.findUnique({
    where: { id: demandId },
    select: { title: true, tagName: true, regionId: true },
  })

  // 查找匹配的服务者 (IDLE 状态 + 目标标签、可选 autoReceive)
  const where: any = { status: 'IDLE' }
  if (target.autoReceiveOnly) where.autoReceive = true
  if (target.tags && target.tags.length > 0) {
    where.tagName = { in: target.tags }
  }
  if (target.regions && target.regions.length > 0) {
    where.regionId = { in: target.regions }
  }

  const providers = await prisma.userTag.findMany({
    where,
    select: { userId: true },
    take: 500,
  })

  result.totalMatched = providers.length

  // 逐个检查规则引擎
  const accepted: string[] = []
  for (const p of providers) {
    const { accept, reason } = await shouldReceivePush(p.userId, target)
    if (!accept) {
      result.totalRejected++
      if (reason) {
        result.rejectReasons[reason] = (result.rejectReasons[reason] || 0) + 1
      }
    } else {
      accepted.push(p.userId)
    }
  }

  result.totalSent = accepted.length

  // 实际发送通知
  if (io && accepted.length > 0) {
    for (const userId of accepted) {
      try {
        io.to(`user:${userId}`).emit('push:new_demand', {
          demandId,
          title: demand?.title || '',
          tagName: demand?.tagName || '',
          regionId: demand?.regionId || null,
          pushedAt: new Date().toISOString(),
        })
      } catch {
        // 单条失败不阻塞
      }
    }
  }

  return result
}

/**
 * Stage 1.1: 需求发布后自动触发一次推送，仅命中 autoReceive=true 的服务者
 * 错误不会反向影响 demand 创建（由调用方 catch 吃掉）
 */
export async function triggerAutoReceivePush(
  demandId: string,
  io?: SocketIOServer,
): Promise<PushResult> {
  const demand = await prisma.demand.findUnique({
    where: { id: demandId },
    select: { tagName: true, regionId: true, tags: true },
  })
  if (!demand) {
    return { totalMatched: 0, totalRejected: 0, totalSent: 0, rejectReasons: {} }
  }
  // 优先用 demand.tags（AI 标签数组），为空时回退到 tagName（单值）
  const tags =
    demand.tags && demand.tags.length > 0
      ? demand.tags
      : demand.tagName
        ? [demand.tagName]
        : undefined
  const regions = demand.regionId ? [demand.regionId] : undefined
  return matchAndPush(
    demandId,
    {
      tags,
      regions,
      autoReceiveOnly: true,
    },
    io,
  )
}
