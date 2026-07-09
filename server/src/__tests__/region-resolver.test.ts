import { describe, it, expect } from 'vitest'
import { regionIdForAlias, regionIdFromCityCode, regionFacetRaw } from '../services/region-aliases.js'
import {
  resolveInputFull,
  resolveInputFacets,
  resolveInputToPaths,
  type PathVocabEntry,
} from '../services/path-resolver.js'

const NANJING_VOCAB: PathVocabEntry[] = [
  { raw: 'rgn:320100', type: 'rgn', value: '320100', demandCount: 9 },
  { raw: 'kw:南京', type: 'kw', value: '南京', demandCount: 25 },
  { raw: 'tag:租车', type: 'tag', value: '租车', demandCount: 12 },
  { raw: 'tag:出租车', type: 'tag', value: '出租车', demandCount: 3 },
  { raw: 'tag:网约车', type: 'tag', value: '网约车', demandCount: 10 },
  { raw: 'tag:叫车', type: 'tag', value: '叫车', demandCount: 8 },
  { raw: 'cat:家政服务', type: 'cat', value: '家政服务', demandCount: 30 },
]

describe('region-aliases', () => {
  it('南京 → 320100', () => {
    expect(regionIdForAlias('南京')).toBe(320100)
    expect(regionFacetRaw(320100)).toBe('rgn:320100')
  })

  it('cityCode 解析', () => {
    expect(regionIdFromCityCode('320100')).toBe(320100)
    expect(regionIdFromCityCode('')).toBeNull()
  })
})

describe('南京 租车 解析', () => {
  it('南京进 facets 不进 scoring paths', () => {
    const facets = resolveInputFacets('南京 租车', NANJING_VOCAB)
    expect(facets).toContain('rgn:320100')

    const paths = resolveInputToPaths('南京 租车', NANJING_VOCAB, new Set(['南京']))
    expect(paths).not.toContain('kw:南京')
  })

  it('租车只匹配 tag:租车，不映射到出租车', () => {
    const paths = resolveInputToPaths('租车', NANJING_VOCAB)
    expect(paths).toContain('tag:租车')
    expect(paths).not.toContain('tag:出租车')
  })

  it('打车映射到 tag:网约车/tag:叫车，不映射出租车/租车', () => {
    const paths = resolveInputToPaths('打车', NANJING_VOCAB)
    expect(paths).toContain('tag:网约车')
    expect(paths).toContain('tag:叫车')
    expect(paths).not.toContain('tag:出租车')
    expect(paths).not.toContain('tag:租车')
  })

  it('打车 resolveInputFull 排除 tag:出租车/包车/租车', () => {
    const full = resolveInputFull('打车', NANJING_VOCAB)
    expect(full.paths).toContain('tag:网约车')
    expect(full.excludePaths).toContain('tag:出租车')
    expect(full.excludePaths).toContain('tag:租车')
    // 排除路径不应包含正在检索的路径
    for (const p of full.paths) {
      expect(full.excludePaths).not.toContain(p)
    }
    expect(full.status).toBe('hit')
  })

  it('租车 resolveInputFull 排除出租车/包车/网约车', () => {
    const full = resolveInputFull('租车', NANJING_VOCAB)
    expect(full.paths).toContain('tag:租车')
    expect(full.excludePaths).toContain('tag:出租车')
    expect(full.excludePaths).toContain('tag:包车')
    expect(full.excludePaths).toContain('tag:网约车')
    for (const p of full.paths) {
      expect(full.excludePaths).not.toContain(p)
    }
  })

  it('南京 租车 继承租车 excludePaths', () => {
    const full = resolveInputFull('南京 租车', NANJING_VOCAB)
    expect(full.facets).toContain('rgn:320100')
    expect(full.excludePaths).toContain('tag:出租车')
  })

  it('resolveInputFull 无 tag:租车 时租车进 unresolved', () => {
    const full = resolveInputFull('南京 租车', [
      ...NANJING_VOCAB.filter((e) => e.raw !== 'tag:租车'),
    ])
    expect(full.facets).toContain('rgn:320100')
    expect(full.paths).not.toContain('kw:南京')
    expect(full.unresolvedSegments).toContain('租车')
    expect(full.unresolvedSegments).not.toContain('南京')
  })

  it('出租车分词不会误挂 tag:租车', () => {
    const paths = resolveInputToPaths('南京 出租车', NANJING_VOCAB, new Set(['南京']))
    expect(paths).toContain('tag:出租车')
    expect(paths).not.toContain('tag:租车')
  })
})
