import { describe, expect, it } from 'vitest'
import type { DemandFields } from '@/stores/demand-workspace'
import {
  isDemandReadyToPublish,
  resolveExpectedOutcome,
  validateDemandForPublish,
} from '@/utils/demand-publish'

const baseFields: DemandFields = {
  title: '王者荣耀代打',
  description: '星耀二上王者',
  serviceType: 'ONLINE',
  budget: '50元',
  schedule: '今晚',
  category: '游戏陪玩',
  taxonomyLeafId: null,
  scopeLabels: [],
  suggestedKeywords: [],
  isCertifiedOnly: false,
  expectedOutcome: '',
  visibilityWindow: 15,
  maxApplicants: 10,
  tags: [],
  aiTags: [],
  tagsConfirmed: false,
}

describe('resolveExpectedOutcome', () => {
  it('优先使用 expectedOutcome', () => {
    expect(
      resolveExpectedOutcome({ ...baseFields, expectedOutcome: '上王者' }),
    ).toBe('上王者')
  })

  it('无 expectedOutcome 时回退到描述', () => {
    expect(resolveExpectedOutcome(baseFields)).toBe('星耀二上王者')
  })

  it('全空时给默认文案', () => {
    expect(
      resolveExpectedOutcome({
        ...baseFields,
        expectedOutcome: '',
        description: '',
        title: '',
      }),
    ).toBe('按约定交付')
  })
})

describe('validateDemandForPublish', () => {
  it('完整字段可通过', () => {
    expect(validateDemandForPublish(baseFields)).toEqual([])
    expect(isDemandReadyToPublish(baseFields)).toBe(true)
  })

  it('线下缺地区不通过', () => {
    const issues = validateDemandForPublish({
      ...baseFields,
      serviceType: 'OFFLINE',
      regionId: undefined,
    })
    expect(issues.some((i) => i.field === 'regionId')).toBe(true)
  })
})
