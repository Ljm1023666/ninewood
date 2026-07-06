import { describe, it, expect, vi } from 'vitest'

vi.mock('../services/ai/client.js', () => ({
  chatCompletion: vi.fn().mockRejectedValue(new Error('AI offline')),
  parseJSON: (text: string) => {
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  },
}))

import {
  buildAgentTaskFromDescription,
  parseTaskHeuristics,
  TaskBuildError,
} from '../services/agent/task-builder.js'

describe('parseTaskHeuristics', () => {
  it('parses hourly + tag + createdWithinHours', () => {
    const d = parseTaskHeuristics('每小时帮我筛含王者荣耀标签的近24小时新需求')
    expect(d.frequency).toBe('HOURLY')
    expect(d.filters?.tagName).toBeTruthy()
    expect(d.filters?.createdWithinHours).toBe(24)
  })

  it('parses daily at 9:00', () => {
    const d = parseTaskHeuristics('每天早上9点推送代练需求摘要')
    expect(d.frequency).toBe('DAILY')
    expect(d.atHour).toBe(9)
  })
})

describe('buildAgentTaskFromDescription', () => {
  it('builds task with steps when AI is offline (heuristic fallback)', async () => {
    const build = await buildAgentTaskFromDescription({
      description: '每小时帮我筛含王者荣耀标签的近24小时新需求',
    })

    expect(build.type).toBe('DEMAND_DIGEST')
    expect(build.frequency).toBe('HOURLY')
    expect(build.steps.length).toBeGreaterThanOrEqual(4)
    expect(build.steps[0]?.key).toBe('trigger')
    expect(build.humanFilters).toContain('王者荣耀')
    expect(build.deliveryChannels).toContain('MESSAGE')
  })

  it('supports multi-round with feedback', async () => {
    const build = await buildAgentTaskFromDescription({
      description: '每天推送新需求',
      feedback: '改成每周一早上9点，标签原神',
      previousSummary: '之前是每天推送',
      round: 1,
    })

    expect(build.round).toBe(2)
    expect(build.userDescription).toContain('补充：')
  })

  it('rejects empty description', async () => {
    await expect(buildAgentTaskFromDescription({ description: '  ' })).rejects.toBeInstanceOf(
      TaskBuildError,
    )
  })
})
