import { describe, it, expect, beforeEach } from 'vitest'

/**
 * Wave A · AgentTaskType 注册表 + DEMAND_DIGEST validateFilters 单测
 *
 * 覆盖：
 *   - 注册表基本行为（getTaskType / listTaskTypes / 重复注册抛错）
 *   - validateFilters：合法 / 缺字段 / 字段类型错 / 业务约束
 *   - DEMAND_DIGEST run stub 抛错（直到 Wave B 实现）
 */

import {
  DEMAND_DIGEST_ID,
  getTaskType,
  listTaskTypes,
  registerTaskType as registerTaskTypeForTest,
  validateDemandDigestFilters,
} from '../services/agent/task-types/index.js'

describe('task-types registry', () => {
  it('registers built-in DEMAND_DIGEST', () => {
    const t = getTaskType(DEMAND_DIGEST_ID)
    expect(t).toBeDefined()
    expect(t!.id).toBe(DEMAND_DIGEST_ID)
    expect(t!.label).toBe('需求筛选摘要')
    expect(Array.isArray(t!.intentSignals)).toBe(true)
    expect(t!.intentSignals.length).toBeGreaterThan(0)
  })

  it('registers PRICE_WATCH placeholder', () => {
    const t = getTaskType('PRICE_WATCH')
    expect(t).toBeDefined()
    expect(t!.validateFilters({})).toEqual({ ok: false, error: expect.stringContaining('暂未实现') })
  })

  it('lists all registered types', () => {
    const all = listTaskTypes()
    const ids = all.map(t => t.id)
    expect(ids).toContain(DEMAND_DIGEST_ID)
    expect(ids).toContain('PRICE_WATCH')
  })

  it('returns undefined for unknown type', () => {
    expect(getTaskType('NOT_A_TYPE')).toBeUndefined()
  })

  it('rejects duplicate registration', () => {
    expect(() =>
      registerTaskTypeForTest({
        id: DEMAND_DIGEST_ID,
        label: 'dup',
        intentSignals: [],
        validateFilters: () => ({ ok: true }),
        run: async () => ({ count: 0, summary: '', payload: [] }),
      }),
    ).toThrow(/duplicate registration/)
  })
})

describe('DEMAND_DIGEST.validateFilters · valid input', () => {
  it('accepts empty filters (uses defaults)', () => {
    const r = validateDemandDigestFilters({})
    expect(r.ok).toBe(true)
    expect(r.normalized).toEqual({ limit: 10 })
  })

  it('accepts all valid fields and normalizes', () => {
    const r = validateDemandDigestFilters({
      keyword: '  王者荣耀  ',
      category: '游戏',
      serviceType: 'ONLINE',
      cityCode: 'BJ',
      tagName: '陪玩',
      minPrice: 10,
      maxPrice: 100,
      limit: 5,
      createdWithinHours: 24,
    })
    expect(r.ok).toBe(true)
    expect(r.normalized).toEqual({
      keyword: '王者荣耀',
      category: '游戏',
      serviceType: 'ONLINE',
      cityCode: 'BJ',
      tagName: '陪玩',
      minPrice: 10,
      maxPrice: 100,
      limit: 5,
      createdWithinHours: 24,
    })
  })

  it('caps limit at 10 (硬顶)', () => {
    const r = validateDemandDigestFilters({ limit: 100 })
    expect(r.ok).toBe(true)
    expect(r.normalized!.limit).toBe(10)
  })

  it('floors limit and createdWithinHours', () => {
    const r = validateDemandDigestFilters({ limit: 3.9, createdWithinHours: 1.5 })
    expect(r.normalized!.limit).toBe(3)
    expect(r.normalized!.createdWithinHours).toBe(1)
  })
})

describe('DEMAND_DIGEST.validateFilters · invalid input', () => {
  it('rejects non-object filters', () => {
    expect(validateDemandDigestFilters(null).ok).toBe(false)
    expect(validateDemandDigestFilters('x').ok).toBe(false)
    expect(validateDemandDigestFilters(42).ok).toBe(false)
    expect(validateDemandDigestFilters([]).ok).toBe(false)
  })

  it('rejects unknown fields', () => {
    const r = validateDemandDigestFilters({ foo: 1 })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/未知字段.*foo/)
  })

  it('rejects wrong-type keyword / category / cityCode / tagName', () => {
    expect(validateDemandDigestFilters({ keyword: 123 }).ok).toBe(false)
    expect(validateDemandDigestFilters({ category: 123 }).ok).toBe(false)
    expect(validateDemandDigestFilters({ cityCode: 123 }).ok).toBe(false)
    expect(validateDemandDigestFilters({ tagName: 123 }).ok).toBe(false)
  })

  it('rejects keyword longer than 50', () => {
    const r = validateDemandDigestFilters({ keyword: 'a'.repeat(51) })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/50/)
  })

  it('rejects invalid serviceType', () => {
    const r = validateDemandDigestFilters({ serviceType: 'BOTH' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/ONLINE.*OFFLINE/)
  })

  it('rejects negative price', () => {
    expect(validateDemandDigestFilters({ minPrice: -1 }).ok).toBe(false)
    expect(validateDemandDigestFilters({ maxPrice: -1 }).ok).toBe(false)
  })

  it('rejects minPrice > maxPrice', () => {
    const r = validateDemandDigestFilters({ minPrice: 100, maxPrice: 50 })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/minPrice.*maxPrice/)
  })

  it('rejects limit < 1', () => {
    expect(validateDemandDigestFilters({ limit: 0 }).ok).toBe(false)
    expect(validateDemandDigestFilters({ limit: -1 }).ok).toBe(false)
  })

  it('rejects createdWithinHours < 1', () => {
    const r = validateDemandDigestFilters({ createdWithinHours: 0 })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/createdWithinHours/)
  })
})

describe('intentSignals · DEMAND_DIGEST', () => {
  it('matches common automate phrasings', () => {
    const t = getTaskType(DEMAND_DIGEST_ID)!
    const samples = [
      '每小时帮我筛含王者荣耀的需求',
      '每天早上 9 点筛需求',
      '每周一推一次摘要',
      '自动筛标签陪玩的需求',
      '需求筛选摘要推送到消息',
    ]
    for (const s of samples) {
      const hit = t.intentSignals.some(re => re.test(s))
      expect(hit, `expected ${t.id} signals to match: ${s}`).toBe(true)
    }
  })

  it('does not match unrelated phrases', () => {
    const t = getTaskType(DEMAND_DIGEST_ID)!
    const samples = ['今天天气不错', '帮我搜一下 Python 教程', 'hello world']
    for (const s of samples) {
      const hit = t.intentSignals.some(re => re.test(s))
      expect(hit, `expected no match for: ${s}`).toBe(false)
    }
  })
})