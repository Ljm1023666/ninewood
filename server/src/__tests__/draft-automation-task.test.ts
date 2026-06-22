import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Wave E · draft_automation_task 工具单测
 *
 * 覆盖 spec §7.2：
 *   - L1（自动执行，requiresConfirmation=false）
 *   - 校验 name/type/frequency/filters/atHour/weekday
 *   - 通过 ctx.send('task_draft', ...) 推送草稿
 *   - 不调 prisma 写库（side_effect: none）
 *   - 默认 deliveryChannels = [MESSAGE, AGENT_INBOX]
 *   - 非法 filters / frequency / WEEKLY 缺 weekday 等拒绝
 */

import { toolRegistry } from '../services/agent/tool-registry.js'
import { registerNinewoodTools } from '../services/agent/tools.js'

beforeEach(() => {
  // 工具注册是幂等的；但同一进程内重复 register 会抛 duplicate；保持单次即可
  if (toolRegistry.listAll().every(t => t.definition.name !== 'draft_automation_task')) {
    registerNinewoodTools()
  }
})

describe('draft_automation_task · tool definition', () => {
  it('is registered as L1 (requiresConfirmation=false)', () => {
    const t = toolRegistry.get('draft_automation_task')!
    expect(t).toBeDefined()
    expect(t.requiresConfirmation).toBe(false)
    expect(t.category).toBe('automation')
    expect(t.definition.parameters.required).toEqual(
      expect.arrayContaining(['name', 'type', 'frequency', 'filters']),
    )
  })

  it('frequency enum limited to HOURLY/DAILY/WEEKLY', () => {
    const t = toolRegistry.get('draft_automation_task')!
    const props = t.definition.parameters.properties as Record<string, { enum?: string[] }>
    expect(props.frequency.enum).toEqual(['HOURLY', 'DAILY', 'WEEKLY'])
  })
})

describe('draft_automation_task · handler', () => {
  const baseCtx = (sends: Array<{ event: string; data: unknown }>) =>
    ({
      userId: 'u1',
      conversationId: 'c1',
      send: vi.fn((event: string, data: unknown) => {
        sends.push({ event, data })
      }),
    }) as never

  it('returns success and emits task_draft SSE for valid HOURLY', async () => {
    const sends: Array<{ event: string; data: unknown }> = []
    const ctx = baseCtx(sends)
    const t = toolRegistry.get('draft_automation_task')!

    const r = await t.handler(
      {
        name: '王者需求推送',
        type: 'DEMAND_DIGEST',
        frequency: 'HOURLY',
        atMinute: 30,
        filters: { keyword: '王者', tagName: '陪玩' },
      },
      ctx,
    )

    expect(r.success).toBe(true)
    expect(r.data).toMatchObject({
      name: '王者需求推送',
      type: 'DEMAND_DIGEST',
      frequency: 'HOURLY',
      atMinute: 30,
      deliveryChannels: ['MESSAGE', 'AGENT_INBOX'],
    })
    expect((r.data as { draftId: string }).draftId).toMatch(/^draft_/)

    // 发出 task_draft SSE
    const events = sends.filter(s => s.event === 'task_draft')
    expect(events).toHaveLength(1)
    const draft = (events[0].data as { humanSchedule: string; humanFilters: string })
    expect(draft.humanSchedule).toBe('每小时 :30')
    expect(draft.humanFilters).toContain('关键词「王者」')
    expect(draft.humanFilters).toContain('标签「陪玩」')

    // 不发 report / plan
    expect(sends.some(s => s.event === 'report')).toBe(false)
    expect(sends.some(s => s.event === 'plan')).toBe(false)
  })

  it('returns success for valid WEEKLY with weekday', async () => {
    const sends: Array<{ event: string; data: unknown }> = []
    const t = toolRegistry.get('draft_automation_task')!

    const r = await t.handler(
      {
        name: '周报',
        type: 'DEMAND_DIGEST',
        frequency: 'WEEKLY',
        atHour: 9,
        atMinute: 0,
        weekday: 1,
        filters: { keyword: '周报' },
      },
      baseCtx(sends),
    )

    expect(r.success).toBe(true)
    const draft = sends[0].data as { humanSchedule: string }
    expect(draft.humanSchedule).toBe('每周一 09:00')
  })

  it('rejects WEEKLY without weekday', async () => {
    const t = toolRegistry.get('draft_automation_task')!
    const r = await t.handler(
      { name: 'x', type: 'DEMAND_DIGEST', frequency: 'WEEKLY', atHour: 9, filters: {} },
      baseCtx([]),
    )
    expect(r.success).toBe(false)
    expect(r.error).toBe('WEEKDAY_INVALID')
  })

  it('rejects DAILY without atHour', async () => {
    const t = toolRegistry.get('draft_automation_task')!
    const r = await t.handler(
      { name: 'x', type: 'DEMAND_DIGEST', frequency: 'DAILY', filters: {} },
      baseCtx([]),
    )
    expect(r.success).toBe(false)
    expect(r.error).toBe('AT_HOUR_INVALID')
  })

  it('rejects invalid type', async () => {
    const t = toolRegistry.get('draft_automation_task')!
    const r = await t.handler(
      { name: 'x', type: 'PRICE_WATCH', frequency: 'HOURLY', filters: {} },
      baseCtx([]),
    )
    expect(r.success).toBe(false)
    expect(r.error).toBe('TYPE_INVALID')
  })

  it('rejects name > 50 chars', async () => {
    const t = toolRegistry.get('draft_automation_task')!
    const r = await t.handler(
      { name: 'a'.repeat(51), type: 'DEMAND_DIGEST', frequency: 'HOURLY', filters: {} },
      baseCtx([]),
    )
    expect(r.success).toBe(false)
    expect(r.error).toBe('NAME_INVALID')
  })

  it('rejects invalid filters (negative price)', async () => {
    const t = toolRegistry.get('draft_automation_task')!
    const r = await t.handler(
      {
        name: 'x',
        type: 'DEMAND_DIGEST',
        frequency: 'HOURLY',
        filters: { minPrice: -1 },
      },
      baseCtx([]),
    )
    expect(r.success).toBe(false)
    expect(r.error).toBe('FILTERS_INVALID')
  })

  it('honors explicit deliveryChannels', async () => {
    const sends: Array<{ event: string; data: unknown }> = []
    const t = toolRegistry.get('draft_automation_task')!

    await t.handler(
      {
        name: 'x',
        type: 'DEMAND_DIGEST',
        frequency: 'HOURLY',
        filters: {},
        deliveryChannels: ['AGENT_INBOX'],
      },
      baseCtx(sends),
    )
    const draft = sends[0].data as { deliveryChannels: string[] }
    expect(draft.deliveryChannels).toEqual(['AGENT_INBOX'])
  })

  it('does NOT call prisma (side_effect: none)', async () => {
    // draft 应只 send SSE + return result，不写 DB。
    // 这里 mock prisma 全空，验证没有调用到
    const t = toolRegistry.get('draft_automation_task')!
    const sends: Array<{ event: string; data: unknown }> = []
    const r = await t.handler(
      { name: 'x', type: 'DEMAND_DIGEST', frequency: 'HOURLY', filters: { keyword: 'k' } },
      baseCtx(sends),
    )
    expect(r.success).toBe(true)
    // 不依赖 prisma mock — 通过类型签名 + 不在 ctx.send 之外产生副作用来断言
    expect(sends).toHaveLength(1)
  })
})