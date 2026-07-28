import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  resolve: vi.fn(),
  getExecutor: vi.fn(),
  getRecipe: vi.fn(),
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: { loopOffering: { findMany: m.findMany } } }))
vi.mock('../path-search.js', () => ({ resolveQueryToPaths: m.resolve }))
vi.mock('./executors/index.js', () => ({ getLoopExecutor: m.getExecutor }))
vi.mock('./composition.service.js', () => ({ getRecipe: m.getRecipe }))

import { recommendLoops } from './recommendation.service.js'

function offering(overrides: Record<string, unknown> = {}) {
  return {
    id: 'earth-1', title: '需求智能结构化', summary: '整理需求字段', paths: ['tag:需求结构化'],
    status: 'ACTIVE', dealRate: null, avgDurationMs: null, internalSuccessRate: 0.9,
    recentTotalN: 99, requiresVerification: true, createdAt: new Date('2026-01-01'),
    endpoint: { healthStatus: 'ONLINE', hostMode: 'PLATFORM_HOSTED', successRatePublic: false, capacityJson: null },
    definition: { loopKind: 'EARTH', code: 'builtin.earth.demand.structure', name: '需求结构化', description: null, executionMode: 'HYBRID', inputSchema: {}, outcomeSchema: {} },
    verificationContracts: [{ id: 'vc1', isRequired: true, verifierEndpoint: { id: 'v1', code: 'builtin.heaven.validate.demand_fields', name: '字段验证' } }],
    ...overrides,
  }
}

beforeEach(() => {
  Object.values(m).forEach((mock) => mock.mockReset())
  m.resolve.mockResolvedValue({ paths: [], facets: [], suggestions: [], status: 'miss' })
  m.getExecutor.mockReturnValue({ execute: vi.fn() })
  m.getRecipe.mockReturnValue(undefined)
})

describe('recommendLoops', () => {
  it('只返回可执行地回，并隐藏未公开成功率及样本量', async () => {
    m.findMany.mockResolvedValue([offering()])
    const result = await recommendLoops({ q: '帮我整理结构化需求' })
    expect(result.items).toHaveLength(1)
    expect(result.items[0].loopKind).toBe('EARTH')
    expect(result.items[0].metrics.publicSuccessRate).toBeNull()
    expect(result.items[0].metrics.sampleSize).toBeNull()
    expect(JSON.stringify(result.items[0])).not.toContain('internalSuccessRate')
  })

  it('无执行器或无明确匹配时返回待确认人回草稿', async () => {
    m.findMany.mockResolvedValue([offering()])
    m.getExecutor.mockReturnValue(undefined)
    const result = await recommendLoops({ q: '寻找线下木工' })
    expect(result.items).toEqual([])
    expect(result.humanFallback).toMatchObject({ kind: 'HUMAN', requiresConfirmation: true })
  })

  it('组合路径无单步执行器仍可被推荐', async () => {
    m.getExecutor.mockReturnValue(undefined)
    m.getRecipe.mockReturnValue({
      code: 'builtin.compose.demand_ready',
      steps: [{ key: 'structure', definitionCode: 'builtin.earth.demand.structure', relation: 'DELEGATE' }],
    })
    m.findMany.mockResolvedValue([
      offering({
        id: 'compose-1',
        title: '需求就绪大回',
        definition: {
          loopKind: 'EARTH',
          code: 'builtin.compose.demand_ready',
          name: '需求就绪大回',
          description: null,
          executionMode: 'HYBRID',
          inputSchema: {},
          outcomeSchema: {},
        },
      }),
    ])
    const result = await recommendLoops({ q: '需求就绪整理路径' })
    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('compose-1')
    expect(result.items[0].composition?.stepCount).toBe(1)
  })

  it('路径命中优先于文本命中，排序稳定', async () => {
    m.resolve.mockResolvedValue({ paths: ['tag:需求结构化'], facets: [], suggestions: [], status: 'hit' })
    m.findMany.mockResolvedValue([
      offering({ id: 'text', paths: [], title: '需求结构化' }),
      offering({ id: 'path', title: '另一方案' }),
    ])
    const result = await recommendLoops({ q: '需求结构化' })
    expect(result.items.map((item) => item.id)).toEqual(['path', 'text'])
  })
})
