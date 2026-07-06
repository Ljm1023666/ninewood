import { describe, it, expect } from 'vitest'
import { PRESETS, PRESET_BY_ID } from '../presets'

describe('场景预设', () => {
  it('至少 8 个预设', () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(8)
  })

  it('id 唯一', () => {
    const ids = PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('每个预设都有 inputs', () => {
    for (const p of PRESETS) {
      expect(p.inputs).toBeDefined()
      expect(Object.keys(p.inputs).length).toBeGreaterThan(0)
    }
  })

  it('PRESET_BY_ID 索引完整', () => {
    for (const p of PRESETS) {
      expect(PRESET_BY_ID[p.id]).toBe(p)
    }
  })

  it('每个税种都至少 2 个预设', () => {
    const counts: Record<string, number> = {
      'personal-income': 0,
      vat: 0,
      'corporate-income': 0,
    }
    for (const p of PRESETS) {
      counts[p.tax] = (counts[p.tax] || 0) + 1
    }
    expect(counts['personal-income']).toBeGreaterThanOrEqual(2)
    expect(counts['vat']).toBeGreaterThanOrEqual(2)
    expect(counts['corporate-income']).toBeGreaterThanOrEqual(2)
  })
})
