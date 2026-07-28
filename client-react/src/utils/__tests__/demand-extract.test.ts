import { describe, expect, it } from 'vitest'
import { extractDemandAnalyzeResult } from '@/utils/demand-extract'

describe('extractDemandAnalyzeResult', () => {
  it('从描述中提取标题、类目、预算与线上交付', () => {
    const r = extractDemandAnalyzeResult(
      '需要开发一个小程序\n预算 3000 元，希望线上交付，2026-08-01 截止',
    )
    expect(r.title).toContain('小程序')
    expect(r.category).toBe('技术开发')
    expect(r.budget).toBe('3000')
    expect(r.serviceType).toBe('ONLINE')
    expect(r.schedule).toBe('2026-08-01')
    expect(r.confidence).toBeTruthy()
  })

  it('预算缺失时标记 missingInfo', () => {
    const r = extractDemandAnalyzeResult('上门保洁打扫一下家里', {
      mode: 'DEMAND',
    })
    expect(r.category).toBe('家政保洁')
    expect(r.missingInfo).toContain('预算')
  })

  it('服务卡模式不强制预算', () => {
    const r = extractDemandAnalyzeResult('提供 UI 设计服务，线上沟通', {
      mode: 'SERVICE_CARD',
    })
    expect(r.category).toBe('UI设计')
    expect(r.missingInfo ?? []).not.toContain('预算')
  })
})
