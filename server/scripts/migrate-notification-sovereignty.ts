/**
 * Phase 1B：明确用户意图 → NotificationSubscription 兼容迁移
 *
 * 默认 dry-run；加 --apply 才写库。
 * 仅本地执行；不删改 PushPreference / UserTag / AgentTask。
 *
 * 用法：
 *   pnpm --filter server exec tsx scripts/migrate-notification-sovereignty.ts
 *   pnpm --filter server exec tsx scripts/migrate-notification-sovereignty.ts --apply
 */

import { PrismaClient } from '@prisma/client'
import {
  planFromAgentTask,
  planFromPushPreference,
  planFromUserTag,
  type MigrationPlanItem,
} from '../src/services/notification-legacy-migration.js'

const apply = process.argv.includes('--apply')
const prisma = new PrismaClient()

type Counters = {
  scanned: number
  plannedCreate: number
  alreadyExists: number
  skipped: number
  paused: number
  suggestOnly: number
  failed: number
}

const counters: Counters = {
  scanned: 0,
  plannedCreate: 0,
  alreadyExists: 0,
  skipped: 0,
  paused: 0,
  suggestOnly: 0,
  failed: 0,
}

async function ensurePause(userId: string, item: MigrationPlanItem) {
  if (item.kind !== 'PAUSE_NON_ESSENTIAL') return
  counters.paused++
  if (!apply) return
  await prisma.notificationPolicy.upsert({
    where: { userId },
    create: { userId, nonEssentialPaused: true },
    update: { nonEssentialPaused: true },
  })
}

async function ensureSubscription(
  userId: string,
  item: Extract<MigrationPlanItem, { kind: 'CREATE_SUBSCRIPTION' }>,
) {
  counters.plannedCreate++
  const existing = await prisma.notificationSubscription.findUnique({
    where: {
      userId_eventType_sourceRef: {
        userId,
        eventType: item.eventType,
        sourceRef: item.sourceRef,
      },
    },
  })
  if (existing) {
    counters.alreadyExists++
    if (!apply) return
    await prisma.notificationSubscription.update({
      where: { id: existing.id },
      data: {
        mode: item.mode,
        channels: item.channels,
        filters: item.filters,
        category: 'USER_REQUESTED',
      },
    })
    return
  }
  if (!apply) return
  await prisma.notificationSubscription.create({
    data: {
      userId,
      category: 'USER_REQUESTED',
      eventType: item.eventType,
      mode: item.mode,
      channels: item.channels,
      filters: item.filters,
      sourceRef: item.sourceRef,
    },
  })
}

async function main() {
  console.log(`[migrate-notification] mode=${apply ? 'APPLY' : 'DRY-RUN'}`)

  // 1) PushPreference：不创建订阅；false → pause；true → suggest only
  const prefs = await prisma.pushPreference.findMany()
  for (const pref of prefs) {
    counters.scanned++
    const plans = planFromPushPreference({
      receivePushes: pref.receivePushes,
      pushFrequency: pref.pushFrequency,
      excludeKeywords: pref.excludeKeywords,
      excludeTags: pref.excludeTags,
      excludeRegions: pref.excludeRegions,
    })
    for (const p of plans) {
      try {
        if (p.kind === 'PAUSE_NON_ESSENTIAL') await ensurePause(pref.userId, p)
        else if (p.kind === 'SUGGEST_FILTERS_ONLY') {
          counters.suggestOnly++
          counters.skipped++
        } else if (p.kind === 'NO_OP') counters.skipped++
      } catch (e) {
        counters.failed++
        console.error('[pref]', pref.userId, e)
      }
    }
  }

  // 2) UserTag.autoReceive
  const tags = await prisma.userTag.findMany({ where: { autoReceive: true } })
  for (const tag of tags) {
    counters.scanned++
    const plan = planFromUserTag({
      id: tag.id,
      tagName: tag.tagName,
      autoReceive: tag.autoReceive,
      regionId: tag.regionId,
    })
    try {
      if (plan.kind === 'CREATE_SUBSCRIPTION') await ensureSubscription(tag.userId, plan)
      else counters.skipped++
    } catch (e) {
      counters.failed++
      console.error('[tag]', tag.id, e)
    }
  }

  // 3) AgentTask MESSAGE
  const tasks = await prisma.agentTask.findMany({ where: { enabled: true } })
  for (const task of tasks) {
    counters.scanned++
    const plan = planFromAgentTask({
      id: task.id,
      enabled: task.enabled,
      deliveryChannels: task.deliveryChannels,
    })
    try {
      if (plan.kind === 'CREATE_SUBSCRIPTION') await ensureSubscription(task.userId, plan)
      else counters.skipped++
    } catch (e) {
      counters.failed++
      console.error('[task]', task.id, e)
    }
  }

  console.log('[migrate-notification] summary', counters)
  if (!apply) {
    console.log('[migrate-notification] dry-run 完成；加 --apply 才写库')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
