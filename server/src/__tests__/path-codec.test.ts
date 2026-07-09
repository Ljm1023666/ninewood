import { describe, it, expect } from 'vitest'
import {
  derivePaths,
  mergePaths,
  parsePath,
  normalizeValue,
  priceToBucket,
  validateScoringPaths,
  validateFacets,
  splitQueryInputs,
  isScoringPath,
  isFacetPath,
  countPathHits,
  matchedPaths,
  PathCodecError,
  dedupeStable,
} from '../services/path-codec.js'

describe('parsePath', () => {
  it('解析合法路径并归一化', () => {
    const p = parsePath('TX:Oldvwf-React')
    expect(p).toEqual({
      type: 'tx',
      value: 'oldvwf-react',
      raw: 'tx:oldvwf-react',
    })
  })

  it('支持中文 tag', () => {
    const p = parsePath('tag:王者荣耀')
    expect(p?.raw).toBe('tag:王者荣耀')
  })

  it('非法 type 返回 null', () => {
    expect(parsePath('foo:bar')).toBeNull()
  })

  it('空值返回 null', () => {
    expect(parsePath('tag:')).toBeNull()
    expect(parsePath('')).toBeNull()
  })

  it('空格归一化为下划线', () => {
    expect(parsePath('kw:急 单')?.raw).toBe('kw:急_单')
  })
})

describe('normalizeValue', () => {
  it('小写 ASCII', () => {
    expect(normalizeValue('React')).toBe('react')
  })
})

describe('priceToBucket', () => {
  it('分桶边界', () => {
    expect(priceToBucket(0)).toBe('0_100')
    expect(priceToBucket(100)).toBe('0_100')
    expect(priceToBucket(101)).toBe('100_500')
    expect(priceToBucket(500)).toBe('100_500')
    expect(priceToBucket(501)).toBe('500_1000')
    expect(priceToBucket(25000)).toBe('20000_plus')
  })
})

describe('derivePaths', () => {
  const base = {
    category: 'IT技术',
    taxonomyLeafId: 'oldvwf-react',
    serviceType: 'ONLINE' as const,
    minPrice: 800,
    regionId: 110105,
    isCertifiedOnly: true,
    tags: ['React', '前端'],
    tagsConfirmed: true,
  }

  it('全字段需求生成稳定路径集', () => {
    const paths = derivePaths(base)
    expect(paths).toContain('tx:oldvwf-react')
    expect(paths).toContain('cat:it技术')
    expect(paths).toContain('attr:servicetype=online')
    expect(paths).toContain('attr:certonly=true')
    expect(paths).toContain('bkt:price=500_1000')
    expect(paths).toContain('rgn:110105')
    expect(paths).toContain('tag:react')
    expect(paths).toContain('tag:前端')
    expect(paths.length).toBeGreaterThanOrEqual(7)
  })

  it('tagsConfirmed=false 时不含 tag 路径', () => {
    const paths = derivePaths({ ...base, tagsConfirmed: false })
    expect(paths.some((p) => p.startsWith('tag:'))).toBe(false)
  })

  it('无 taxonomy 时跳过 tx', () => {
    const paths = derivePaths({ ...base, taxonomyLeafId: null })
    expect(paths.some((p) => p.startsWith('tx:'))).toBe(false)
  })
})

describe('mergePaths', () => {
  const auto = derivePaths({
    category: '设计',
    serviceType: 'ONLINE',
    minPrice: 200,
    isCertifiedOnly: false,
    tags: [],
    tagsConfirmed: false,
  })

  it('userEdited 为空时使用 auto', () => {
    const merged = mergePaths(auto, [])
    expect(merged.length).toBeGreaterThan(0)
    expect(merged).toContain('attr:servicetype=online')
  })

  it('超过 12 条抛 PATH_LIMIT', () => {
    const many = Array.from({ length: 13 }, (_, i) => `tag:t${i}`)
    expect(() => mergePaths(auto, many)).toThrow(PathCodecError)
    try {
      mergePaths(auto, many)
    } catch (e) {
      expect((e as PathCodecError).code).toBe('PATH_LIMIT')
    }
  })

  it('非法路径抛 PATH_INVALID', () => {
    expect(() => mergePaths(auto, ['badpath'])).toThrow(PathCodecError)
  })

  it('tag 超过 6 条抛 PATH_LIMIT', () => {
    const tags = Array.from({ length: 7 }, (_, i) => `tag:tag${i}`)
    expect(() => mergePaths(auto, tags)).toThrow(PathCodecError)
  })
})

describe('validateScoringPaths', () => {
  it('仅允许计分类型，上限 8', () => {
    const q = [
      'tx:a',
      'cat:b',
      'tag:t1',
      'tag:t2',
      'kw:急单',
      'kw:开发',
      'tag:t3',
      'cat:c',
    ]
    expect(validateScoringPaths(q)).toHaveLength(8)
    expect(() => validateScoringPaths([...q, 'tag:t4'])).toThrow(PathCodecError)
  })

  it('拒绝 facet 类型', () => {
    expect(() => validateScoringPaths(['attr:servicetype=online'])).toThrow(
      PathCodecError,
    )
  })
})

describe('validateFacets', () => {
  it('仅允许 attr/bkt/rgn，上限 6', () => {
    const f = [
      'attr:servicetype=online',
      'bkt:price=0_100',
      'rgn:110105',
    ]
    expect(validateFacets(f)).toHaveLength(3)
    expect(() => validateFacets(['tag:react'])).toThrow(PathCodecError)
  })
})

describe('splitQueryInputs', () => {
  it('拆分计分路径与筛选条件', () => {
    const mixed = [
      'cat:技术开发',
      'kw:程序开发',
      'attr:servicetype=online',
      'bkt:price=500_1000',
    ]
    expect(splitQueryInputs(mixed)).toEqual({
      scoringPaths: ['cat:技术开发', 'kw:程序开发'],
      facets: ['attr:servicetype=online', 'bkt:price=500_1000'],
    })
  })
})

describe('isScoringPath / isFacetPath', () => {
  it('类型判定', () => {
    expect(isScoringPath('tag:react')).toBe(true)
    expect(isScoringPath('attr:servicetype=online')).toBe(false)
    expect(isFacetPath('bkt:price=0_100')).toBe(true)
    expect(isFacetPath('kw:急单')).toBe(false)
  })
})

describe('validateQueryPaths', () => {
  it('检索路径上限 8（legacy alias）', () => {
    const q = [
      'tx:a',
      'cat:b',
      'tag:t1',
      'tag:t2',
      'kw:急单',
      'kw:开发',
      'tag:t3',
      'cat:c',
    ]
    expect(validateScoringPaths(q)).toHaveLength(8)
  })
})

describe('countPathHits / matchedPaths', () => {
  const query = ['tx:a', 'tag:react', 'bkt:price=0_100']
  const demand = ['tx:a', 'tag:react', 'cat:设计']

  it('计分命中数', () => {
    expect(countPathHits(query, demand)).toBe(2)
  })

  it('matchedPaths 按 query 顺序', () => {
    expect(matchedPaths(query, demand)).toEqual(['tx:a', 'tag:react'])
  })
})

describe('dedupeStable', () => {
  it('保留首次出现顺序', () => {
    expect(dedupeStable(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
  })
})
