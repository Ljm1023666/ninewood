/**
 * 愿景合规集成测试（真库）：种子 → 推荐 → 运行样板/组合 → 结算事件。
 * 无 DATABASE_URL / 连不上库时 skip，不阻断 CI mock 套件。
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../lib/prisma.js'
import { ensureSystemOfferings, runOffering, quoteOfferingFee } from './offering.service.js'
import { recommendLoops } from './recommendation.service.js'
import { createUserOffering, healthCheckUserOffering } from './supply.service.js'
import './executors/index.js'

const hasDb = Boolean(process.env.DATABASE_URL)
let dbOk = false

beforeAll(async () => {
  if (!hasDb) return
  try {
    await prisma.$queryRaw`SELECT 1`
    dbOk = true
  } catch {
    dbOk = false
  }
})

describe.runIf(hasDb)('自然回 V3 · 真库愿景联调', () => {
  it('探测数据库', async () => {
    if (!dbOk) {
      console.warn('[v3-vision] DATABASE_URL 存在但连不上库，跳过联调')
    }
    expect(hasDb).toBe(true)
  })

  it('种子后可推荐组合与文本精简，并跑通核验闭环', async ({ skip }) => {
    if (!dbOk) {
      skip()
      return
    }

    const seed = await ensureSystemOfferings()
    expect(seed.definitions).toBeGreaterThan(0)
    expect(seed.composeRecipes).toBeGreaterThanOrEqual(2)

    const textRec = await recommendLoops({ q: '文本精简 写作 降重预备' })
    const textHit = textRec.items.find(
      (i) =>
        i.definitionCode === 'builtin.earth.text.condense' ||
        i.definitionCode === 'builtin.compose.text_ready',
    )
    expect(textHit, '应推荐到文本精简样板或组合').toBeTruthy()

    const user = await prisma.user.findFirst({ select: { id: true } })
    expect(user, '需要至少一个用户做 initiator').toBeTruthy()

    const textOffering = await prisma.loopOffering.findFirst({
      where: { definition: { code: 'builtin.earth.text.condense' }, status: 'ACTIVE' },
      include: { endpoint: true, verificationContracts: true },
    })
    expect(textOffering).toBeTruthy()
    expect(textOffering!.verificationContracts.length).toBeGreaterThan(0)

    const longText =
      '这是第一句重复内容。这是第一句重复内容。我们还要保留一句关键信息。最后再加一句无关废话。额外再写一句用来说明背景的文字。'
    // 去重后压缩比通常在 0.15–0.4；契约下限 0.15，应能通过
    const okRun = await runOffering(textOffering!.id, user!.id, {
      input: { text: longText, claimedCompressionRatio: 0.15 },
    })
    expect(okRun.status).toBe('SUCCEEDED')
    expect(okRun.runId).toBeTruthy()

    const events = await prisma.loopEvent.findMany({
      where: { loopRunId: okRun.runId },
      orderBy: { createdAt: 'asc' },
    })
    expect(events.some((e) => e.type === 'SETTLEMENT_ELIGIBLE')).toBe(true)

    // 诚实算法达不到 95% 压缩 → 天回 FAILED → 整回 FAILED
    const failRun = await runOffering(textOffering!.id, user!.id, {
      input: { text: longText, claimedCompressionRatio: 0.95 },
    })
    expect(failRun.status).toBe('FAILED')
    const failEvents = await prisma.loopEvent.findMany({ where: { loopRunId: failRun.runId } })
    expect(failEvents.some((e) => e.type === 'SETTLEMENT_BLOCKED')).toBe(true)

    const composeRec = await recommendLoops({ q: '需求就绪' })
    expect(
      composeRec.items.some((i) => i.definitionCode === 'builtin.compose.demand_ready'),
      '组合大回应进入推荐池（不得因无 executor 被健康巡检打成 UNKNOWN）',
    ).toBe(true)

    const composeOffering = await prisma.loopOffering.findFirst({
      where: { definition: { code: 'builtin.compose.demand_ready' }, status: 'ACTIVE' },
      include: { endpoint: true },
    })
    expect(composeOffering).toBeTruthy()
    expect(composeOffering!.endpoint?.healthStatus).toBe('ONLINE')
    const composed = await runOffering(composeOffering!.id, user!.id, {
      input: {
        description: '想找人帮忙写论文提纲，预算五百左右，最好这周搞定',
      },
    })
    expect(['SUCCEEDED', 'INCONCLUSIVE']).toContain(composed.status)
    const links = await prisma.loopLink.findMany({ where: { sourceRunId: composed.runId } })
    expect(links.length).toBeGreaterThanOrEqual(1)
    expect(links.every((l) => l.relation === 'DELEGATE' || l.relation === 'VERIFY')).toBe(true)

    const quote = await quoteOfferingFee(textOffering!.id, 100)
    expect(quote.platformFee).toBe(5)
    expect(quote.monitorFeeCap).toBe(1)

    const mine = await createUserOffering(user!.id, {
      title: `联调地回${Date.now().toString(36)}`,
      summary: '愿景联调临时地回',
      endpointUrl: 'https://example.com/loop-health',
      ioDoc: '输入：text\n输出：ok',
      verifierCodes: ['builtin.heaven.validate.demand_fields'],
    })
    expect(mine.endpoint.healthStatus).toBe('UNKNOWN')
    const health = await healthCheckUserOffering(user!.id, mine.id)
    // example.com 可能 ONLINE 或 DEGRADED，但必须写出真实探测结果，不得保持 UNKNOWN
    expect(['ONLINE', 'DEGRADED', 'OFFLINE']).toContain(health.healthStatus)
  }, 60_000)
})
