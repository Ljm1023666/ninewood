import { describe, expect, it } from 'vitest'
import { normalizeAnalyzePayload } from '@/types/demand-analyze'

describe('normalizeAnalyzePayload', () => {
  it('scopePath 映射为 scopeLabels', () => {
    const result = normalizeAnalyzePayload({
      title: '代打',
      scopePath: ['线上服务', '游戏'],
    })
    expect(result.scopeLabels).toEqual(['线上服务', '游戏'])
  })

  it('优先使用 scopeLabels', () => {
    const result = normalizeAnalyzePayload({
      scopeLabels: ['线下到场'],
      scopePath: ['ignored'],
    })
    expect(result.scopeLabels).toEqual(['线下到场'])
  })

  it('解析 regionId', () => {
    const result = normalizeAnalyzePayload({ regionId: 110105 })
    expect(result.regionId).toBe(110105)
  })
})
