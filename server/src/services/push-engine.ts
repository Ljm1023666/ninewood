/**
 * AI 2.7 推送匹配引擎
 * 双向 opt-in/opt-out 规则引擎
 */

import { prisma } from '../lib/prisma.js'

interface PushTarget {
  ageMin?: number
  ageMax?: number
  tags?: string[]
  regions?: number[]
  excludeKeywords?: string[]
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
): Promise<PushResult> {
  const result: PushResult = {
    totalMatched: 0,
    totalRejected: 0,
    totalSent: 0,
    rejectReasons: {},
  }

  // 查找匹配的服务者 (IDLE 状态 + 目标标签)
  const where: any = { status: 'IDLE' }
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
  for (const p of providers) {
    const { accept, reason } = await shouldReceivePush(p.userId, target)
    if (!accept) {
      result.totalRejected++
      if (reason) {
        result.rejectReasons[reason] = (result.rejectReasons[reason] || 0) + 1
      }
    }
  }

  result.totalSent = result.totalMatched - result.totalRejected

  // TODO: 实际发送通知（MVP 阶段只返回结果）
  // await batchNotify(acceptedUserIds, demandId)

  return result
}
