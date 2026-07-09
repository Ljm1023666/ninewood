import { describe, it, expect } from 'vitest'
import {
  resolveInputToPaths,
  resolveInputFacets,
  resolveIntentPaths,
  resolveInputFull,
  segmentInputText,
  extractKwPathsFromText,
  type PathVocabEntry,
} from '../services/path-resolver.js'

const VOCAB: PathVocabEntry[] = [
  { raw: 'cat:家政服务', type: 'cat', value: '家政服务', demandCount: 30 },
  { raw: 'tag:家政服务', type: 'tag', value: '家政服务', demandCount: 28 },
  { raw: 'cat:技术开发', type: 'cat', value: '技术开发', demandCount: 12 },
  { raw: 'kw:空调', type: 'kw', value: '空调', demandCount: 5 },
  { raw: 'attr:servicetype=online', type: 'attr', value: 'servicetype=online', demandCount: 40 },
]

const GAME_VOCAB: PathVocabEntry[] = [
  { raw: 'tag:代练', type: 'tag', value: '代练', demandCount: 590 },
  { raw: 'cat:游戏代练', type: 'cat', value: '游戏代练', demandCount: 590 },
  { raw: 'tag:王者荣耀', type: 'tag', value: '王者荣耀', demandCount: 200 },
  { raw: 'kw:打野', type: 'kw', value: '打野', demandCount: 80 },
  { raw: 'kw:游走', type: 'kw', value: '游走', demandCount: 60 },
  { raw: 'kw:王者荣耀成就标代打', type: 'kw', value: '王者荣耀成就标代打', demandCount: 40 },
]

describe('segmentInputText', () => {
  it('拆出中文片段', () => {
    const segs = segmentInputText('家政生活请223')
    expect(segs).toContain('家政')
    expect(segs).not.toContain('223')
  })

  it('「王者荣耀」不产生 n-gram 垃圾碎片「者荣」', () => {
    const segs = segmentInputText('王者荣耀教学陪玩')
    expect(segs).not.toContain('者荣')
    expect(segs).not.toContain('王者荣')
    expect(segs.some((s) => s.includes('王者') || s.includes('荣耀') || s.includes('陪玩'))).toBe(true)
  })
})

describe('extractKwPathsFromText', () => {
  it('从标题提取 kw', () => {
    const kws = extractKwPathsFromText('空调深度清洗服务')
    expect(kws.some((p) => p.startsWith('kw:'))).toBe(true)
  })

  it('「王者荣耀教学陪玩」不产出 kw:者荣', () => {
    const kws = extractKwPathsFromText('王者荣耀教学陪玩 中路郑州周边可约')
    expect(kws.some((p) => p.endsWith(':者荣'))).toBe(false)
    expect(kws).toContain('kw:王者荣耀')
    expect(kws.some((p) => p.includes('陪玩') || p.includes('中路'))).toBe(true)
  })
})

describe('resolveInputToPaths', () => {
  it('「家政」映射到池内 cat:家政服务', () => {
    const paths = resolveInputToPaths('家政', VOCAB)
    expect(paths).toContain('cat:家政服务')
    expect(paths).not.toContain('cat:家政')
  })

  it('「家政生活」仍能摸到家政服务', () => {
    const paths = resolveInputToPaths('家政生活', VOCAB)
    expect(paths).toContain('cat:家政服务')
  })

  it('识别线上别名 → 进入 facets 而非 paths', () => {
    const paths = resolveInputToPaths('家政 线上', VOCAB)
    const facets = resolveInputFacets('家政 线上', VOCAB)
    expect(paths).toContain('cat:家政服务')
    expect(paths).not.toContain('attr:servicetype=online')
    expect(facets).toContain('attr:servicetype=online')
  })

  it('保留显式路径', () => {
    expect(resolveInputToPaths('cat:技术开发', VOCAB)).toContain('cat:技术开发')
  })
})

describe('resolveIntentPaths', () => {
  it('「荣耀 打野 代练」意图路径含打野，不含长标题 kw', () => {
    const intents = resolveIntentPaths('荣耀 打野 代练', GAME_VOCAB)
    expect(intents).toContain('tag:王者荣耀')
    expect(intents).toContain('kw:打野')
    expect(intents).toContain('tag:代练')
    expect(intents).not.toContain('kw:王者荣耀成就标代打')
    expect(intents.length).toBe(3)
  })

  it('resolveInputFull 返回 facets 且 intentPaths 是 paths 子集', () => {
    const full = resolveInputFull('荣耀 打野 代练', GAME_VOCAB)
    expect(Array.isArray(full.facets)).toBe(true)
    expect(Array.isArray(full.unresolvedSegments)).toBe(true)
    for (const p of full.intentPaths) {
      expect(full.paths).toContain(p)
    }
    expect(full.paths.every((p) => !p.startsWith('attr:'))).toBe(true)
  })
})

describe('resolveInputFacets · 预算短语 → bkt', () => {
  it('「预算500」产出 bkt:price=100_500', () => {
    const facets = resolveInputFacets('预算500', VOCAB)
    expect(facets).toContain('bkt:price=100_500')
  })

  it('「500块」产出 bkt', () => {
    const facets = resolveInputFacets('500块', VOCAB)
    expect(facets).toContain('bkt:price=100_500')
  })

  it('「价格1000以内」产出 bkt:price=500_1000', () => {
    const facets = resolveInputFacets('价格1000以内', VOCAB)
    expect(facets).toContain('bkt:price=500_1000')
  })

  it('「北京 预算500」同时含 rgn 与 bkt', () => {
    const facets = resolveInputFacets('北京 预算500', VOCAB)
    expect(facets).toContain('rgn:110000')
    expect(facets).toContain('bkt:price=100_500')
  })

  it('「家政」不产出 bkt（无回归）', () => {
    const facets = resolveInputFacets('家政', VOCAB)
    expect(facets).not.toContain('bkt:price=100_500')
  })
})

describe('resolveIntentPaths · 复合意图', () => {
  it('「王者荣耀代练」同时含 tag:王者荣耀 与 tag:代练', () => {
    const intents = resolveIntentPaths('王者荣耀代练', GAME_VOCAB)
    expect(intents).toContain('tag:王者荣耀')
    expect(intents).toContain('tag:代练')
  })

  it('空格分词「荣耀 打野 代练」仍保持原行为', () => {
    const intents = resolveIntentPaths('荣耀 打野 代练', GAME_VOCAB)
    expect(intents).toContain('tag:王者荣耀')
    expect(intents).toContain('kw:打野')
    expect(intents).toContain('tag:代练')
    expect(intents.length).toBe(3)
  })
})
