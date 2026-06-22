import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Wave B · DEMAND_DIGEST.run 行为单测（mock demand-search）
 *
 * 覆盖：
 *   - 命中列表 → count + summary + payload
 *   - 空列表 → count=0, summary 含「未找到匹配」
 *   - summary 含筛选条件描述
 *   - 摘要中包含 path 字段（前端跳转）
 *   - 公益标记展示
 */

const m = vi.hoisted(() => ({ searchDemands: vi.fn() }))

vi.mock('../services/agent/demand-search.js', () => ({
  searchDemands: m.searchDemands,
  DEMAND_SEARCH_AGENT_LIMIT: 20,
  DEMAND_SEARCH_AUTOMATION_LIMIT: 10,
}))

import { getTaskType, DEMAND_DIGEST_ID } from '../services/agent/task-types/index.js'

beforeEach(() => {
  m.searchDemands.mockReset()
})

describe('DEMAND_DIGEST.run · happy path', () => {
  it('returns items + structured payload + summary', async () => {
    m.searchDemands.mockResolvedValueOnce([
      {
        id: 'd1',
        title: '求陪玩 王者荣耀',
        category: '游戏',
        type: 'ONLINE',
        price: 50,
        city: 'BJ',
        applicants: 0,
        createdAt: new Date('2026-06-22T08:00:00Z'),
        expireAt: new Date('2026-06-23T08:00:00Z'),
        isWelfare: false,
      },
      {
        id: 'd2',
        title: '公益代取药',
        category: '跑腿',
        type: 'OFFLINE',
        price: 0,
        city: 'SH',
        applicants: 1,
        createdAt: new Date('2026-06-22T09:00:00Z'),
        expireAt: new Date('2026-06-23T09:00:00Z'),
        isWelfare: true,
      },
    ])

    const t = getTaskType(DEMAND_DIGEST_ID)!
    const r = await t.run('user-1', { keyword: '王者', tagName: '陪玩', limit: 5 })

    expect(r.count).toBe(2)
    expect(r.payload).toHaveLength(2)
    expect((r.payload[0] as { id: string }).id).toBe('d1')
    expect((r.payload[0] as { path: string }).path).toBe('/demand/d1')
    expect((r.payload[1] as { isWelfare: boolean }).isWelfare).toBe(true)
    expect(r.summary).toContain('共找到 **2**')
    expect(r.summary).toContain('关键词「王者」')
    expect(r.summary).toContain('标签「陪玩」')
    expect(r.summary).toContain('求陪玩 王者荣耀')
    expect(r.summary).toContain('🧡公益')

    // 共享函数被传 limitMax=10（自动化）
    const call = m.searchDemands.mock.calls[0]
    expect(call[1]).toEqual({ limitMax: 10 })
    expect(call[0]).toMatchObject({ keyword: '王者', tagName: '陪玩', limit: 5 })
  })

  it('forwards all filter fields to demand-search', async () => {
    m.searchDemands.mockResolvedValueOnce([])
    const t = getTaskType(DEMAND_DIGEST_ID)!
    await t.run('u', {
      keyword: 'k',
      category: 'c',
      serviceType: 'ONLINE',
      cityCode: 'BJ',
      minPrice: 10,
      maxPrice: 100,
      createdWithinHours: 24,
    })
    expect(m.searchDemands.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        keyword: 'k',
        category: 'c',
        serviceType: 'ONLINE',
        cityCode: 'BJ',
        minPrice: 10,
        maxPrice: 100,
        createdWithinHours: 24,
      }),
    )
  })
})

describe('DEMAND_DIGEST.run · empty', () => {
  it('returns count=0 and "未找到匹配" summary', async () => {
    m.searchDemands.mockResolvedValueOnce([])
    const t = getTaskType(DEMAND_DIGEST_ID)!
    const r = await t.run('u', { keyword: 'no-such-thing' })
    expect(r.count).toBe(0)
    expect(r.payload).toEqual([])
    expect(r.summary).toContain('本次未找到匹配需求')
    expect(r.summary).toContain('关键词「no-such-thing」')
  })
})

describe('DEMAND_DIGEST.run · no filters', () => {
  it('summary mentions "无筛选条件"', async () => {
    m.searchDemands.mockResolvedValueOnce([])
    const t = getTaskType(DEMAND_DIGEST_ID)!
    const r = await t.run('u', {})
    expect(r.summary).toContain('无筛选条件')
  })
})