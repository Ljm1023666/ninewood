import { describe, it, expect } from 'vitest'
import {
  computeMinHitRequired,
  parseSearchQuery,
  assertIntentPathsForFilter,
} from '../services/path-search-query.js'
import { PathCodecError } from '../services/path-codec.js'

describe('parseSearchQuery', () => {
  it('默认 any + cross_hit', () => {
    const q = parseSearchQuery({ pathCount: 5 })
    expect(q).toEqual({
      match: 'any',
      minHit: 1,
      intentMatch: 'off',
      sort: 'cross_hit',
    })
  })

  it('custom 需要 minHit', () => {
    expect(() => parseSearchQuery({ pathCount: 5, match: 'custom' })).toThrow(PathCodecError)
  })

  it('custom minHit 越界报错', () => {
    expect(() =>
      parseSearchQuery({ pathCount: 3, match: 'custom', minHit: 5 }),
    ).toThrow(PathCodecError)
  })

  it('intentMatch 非 off 无 q 时降级为 off（不报错）', () => {
    const q = parseSearchQuery({ pathCount: 3, intentMatch: 'any' })
    expect(q.intentMatch).toBe('off')
  })

  it('非法 sort 报错', () => {
    expect(() => parseSearchQuery({ pathCount: 3, sort: 'bogus' })).toThrow(PathCodecError)
  })
})

describe('computeMinHitRequired', () => {
  it('majority 向上取整', () => {
    expect(computeMinHitRequired('majority', 1, 5)).toBe(3)
    expect(computeMinHitRequired('majority', 1, 4)).toBe(2)
  })

  it('all 等于路径数', () => {
    expect(computeMinHitRequired('all', 1, 5)).toBe(5)
  })
})

describe('assertIntentPathsForFilter', () => {
  it('intentMatch=all 无意图路径时报错', () => {
    expect(() => assertIntentPathsForFilter('all', 0)).toThrow(PathCodecError)
  })
})
