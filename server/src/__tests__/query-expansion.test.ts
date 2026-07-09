import { describe, it, expect } from 'vitest'
import { applyQueryExpansions, matchExpansionRule } from '../services/query-expansion.js'

const POOL_TAGS = [
  '网约车',
  '叫车',
  '打车',
  '租车',
  '自驾租车',
  '出租车',
  '包车',
  '财务外包',
  '客服外包',
]

describe('query-expansion', () => {
  it('打车 → 网约车/叫车，排除出租车/包车/租车', () => {
    const { expandPaths, excludePaths } = applyQueryExpansions(['打车'], POOL_TAGS)
    expect(expandPaths).toEqual(expect.arrayContaining(['tag:网约车', 'tag:叫车']))
    expect(excludePaths).toEqual(
      expect.arrayContaining(['tag:出租车', 'tag:包车', 'tag:租车', 'tag:自驾租车']),
    )
  })

  it('租车 → 排除出租车/包车/网约车/叫车', () => {
    const { expandPaths, excludePaths } = applyQueryExpansions(['租车'], POOL_TAGS)
    expect(expandPaths).toEqual(expect.arrayContaining(['tag:租车', 'tag:自驾租车']))
    expect(excludePaths).toEqual(
      expect.arrayContaining(['tag:出租车', 'tag:包车', 'tag:网约车', 'tag:叫车']),
    )
    for (const p of expandPaths) {
      expect(excludePaths).not.toContain(p)
    }
  })

  it('出租车 → 排除租车/自驾租车/网约车', () => {
    const { expandPaths, excludePaths } = applyQueryExpansions(['出租车'], POOL_TAGS)
    expect(expandPaths).toContain('tag:出租车')
    expect(excludePaths).toEqual(
      expect.arrayContaining(['tag:租车', 'tag:自驾租车', 'tag:网约车', 'tag:叫车']),
    )
  })

  it('外包 → 三类复合 tag，无 exclude', () => {
    const { expandPaths, excludePaths } = applyQueryExpansions(['外包'], POOL_TAGS)
    expect(expandPaths).toEqual(
      expect.arrayContaining(['tag:财务外包', 'tag:客服外包']),
    )
    expect(excludePaths).toHaveLength(0)
  })

  it('池内无 tag 时不挂载 expand', () => {
    const { expandPaths } = applyQueryExpansions(['外包'], ['租车'])
    expect(expandPaths).toHaveLength(0)
  })

  it('触发词精确匹配，不做模糊扩散', () => {
    expect(matchExpansionRule('打车的')).toBeNull()
    expect(matchExpansionRule('租车')).not.toBeNull()
  })
})
