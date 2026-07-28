import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('../lib/prisma.js', () => ({ prisma: { outcomeEvent: { create: m.create } } }))

import { recordOutcomeEvent } from './outcome-event.service.js'

describe('recordOutcomeEvent', () => {
  beforeEach(() => {
    m.create.mockReset()
    m.create.mockResolvedValue({ id: 'event-1' })
    process.env.OUTCOME_METRICS_ENABLED = '1'
  })

  it('metadata 仅保留白名单，拒绝正文和私信字段', async () => {
    await recordOutcomeEvent({
      userId: 'user-1', correlationId: 'ORDER:1', resourceType: 'ORDER', resourceId: '1', eventType: 'TASK_QUIETED',
      metadata: { outcomeStatus: 'SUCCEEDED', demandBody: 'secret', messageContent: 'secret' },
    })
    expect(m.create.mock.calls[0][0].data.metadata).toEqual({ outcomeStatus: 'SUCCEEDED' })
  })

  it('activeMs 被限制在单次四小时以内', async () => {
    await recordOutcomeEvent({ correlationId: 'ORDER:1', resourceType: 'ORDER', resourceId: '1', eventType: 'ACTIVE_TIME', activeMs: 99_999_999 })
    expect(m.create.mock.calls[0][0].data.activeMs).toBe(14_400_000)
  })

  it('flag 关闭时零写库', async () => {
    process.env.OUTCOME_METRICS_ENABLED = '0'
    await recordOutcomeEvent({ correlationId: 'ORDER:1', resourceType: 'ORDER', resourceId: '1', eventType: 'ACTIVE_TIME', activeMs: 1000 })
    expect(m.create).not.toHaveBeenCalled()
  })
})
