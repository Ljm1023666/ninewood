/**
 * TASK-11 · 输入解析 → 池内真实路径（顺藤摸瓜）
 * 发布与检索共用：从文本拆段，再与需求池 paths 词汇表匹配
 */
import {
  dedupeStable,
  normalizeValue,
  parsePath,
  PATH_LIMITS,
  SCORING_PATH_TYPES,
  FACET_PATH_TYPES,
  type PathType,
} from './path-codec.js'
import { cutForSearch, extractKeywords } from './jieba-segment.js'
import {
  isRegionKwValue,
  regionFacetRaw,
  regionIdForAlias,
  regionLabelsFromSegments,
} from './region-aliases.js'
import { applyQueryExpansions, matchExpansionRule } from './query-expansion.js'
import { priceFacetFromText } from './price-facet-resolve.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

export interface PathVocabEntry {
  raw: string
  type: PathType
  value: string
  demandCount: number
}

const ATTR_ALIASES: Record<string, string> = {
  online: 'attr:servicetype=online',
  offline: 'attr:servicetype=offline',
  线上: 'attr:servicetype=online',
  线下: 'attr:servicetype=offline',
}

/** 检索同义词：片段 → 池内可能存在的别称（语义须相近，不可跨品类硬绑）
 *  注：打车/叫车 → 网约车 由 query-expansion 受控白名单处理，不再走同义词 */
const SCORING_SYNONYMS: Record<string, string[]> = {
  出租: ['出租车'],
  自驾: ['自驾租车'],
}

/** 无意义的单字/助词，拆段时跳过 */
const STOP_SEGMENTS = new Set(['的', '了', '吗', '呢', '啊', '请', '要', '想', '找', '帮'])

function isScoringVocabEntry(entry: PathVocabEntry): boolean {
  return SCORING_PATH_TYPES.has(entry.type)
}

function pushScoringPath(
  out: string[],
  raw: string,
  typeCounts: Map<PathType, number>,
): void {
  const parsed = parsePath(raw)
  if (!parsed || !SCORING_PATH_TYPES.has(parsed.type)) return
  const limit = PATH_LIMITS.perType[parsed.type]
  if (limit != null) {
    const n = (typeCounts.get(parsed.type) ?? 0) + 1
    if (n > limit) return
    typeCounts.set(parsed.type, n)
  }
  if (out.length >= PATH_LIMITS.perQuery) return
  out.push(parsed.raw)
}

function pushFacet(out: string[], raw: string): void {
  const parsed = parsePath(raw)
  if (!parsed || !FACET_PATH_TYPES.has(parsed.type)) return
  if (out.length >= PATH_LIMITS.perFacets) return
  if (!out.includes(parsed.raw)) out.push(parsed.raw)
}

/** 禁止子串互配：字符相邻但语义不同的标签对（如 租车 ⊂ 出租车）
 *  从 server/config/path-substring-rules.json 加载；文件缺失时回退到内置默认 */
const DEFAULT_DISTINCT_SUBSTRING_PAIRS: [string, string][] = [['租车', '出租车']]

function loadDistinctSubstringPairs(): Set<string> {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url))
    const cfgPath = path.resolve(here, '../../config/path-substring-rules.json')
    const raw = readFileSync(cfgPath, 'utf8')
    const cfg = JSON.parse(raw) as { distinctSubstringPairs?: [string, string][] }
    const pairs = Array.isArray(cfg.distinctSubstringPairs) ? cfg.distinctSubstringPairs : []
    const set = new Set<string>()
    for (const p of pairs) {
      if (Array.isArray(p) && p.length === 2) {
        // 归一化为 shorter|longer（按长度，等长保序），与所有消费方约定一致
        const [a, b] = p as [string, string]
        const ordered: [string, string] = a.length <= b.length ? [a, b] : [b, a]
        set.add(`${ordered[0]}|${ordered[1]}`)
      }
    }
    // 回退兜底：确保 租车|出租车 始终在
    for (const fb of DEFAULT_DISTINCT_SUBSTRING_PAIRS) set.add(`${fb[0]}|${fb[1]}`)
    return set
  } catch {
    return new Set(DEFAULT_DISTINCT_SUBSTRING_PAIRS.map((p) => `${p[0]}|${p[1]}`))
  }
}

const DISTINCT_SUBSTRING_PAIRS = loadDistinctSubstringPairs()

function suppressDistinctSubsegments(segments: string[]): string[] {
  const set = new Set(segments)
  const drop = new Set<string>()
  for (const pair of DISTINCT_SUBSTRING_PAIRS) {
    const [shorter, longer] = pair.split('|') as [string, string]
    if (set.has(shorter) && set.has(longer)) drop.add(shorter)
  }
  if (drop.size === 0) return segments
  return segments.filter((s) => !drop.has(s))
}

/** 从文本拆出可匹配片段（jieba 分词，无 n-gram 垃圾碎片） */
export function segmentInputText(text: string): string[] {
  const segments: string[] = []
  const trimmed = text.trim()
  if (!trimmed) return segments

  const parts = trimmed.split(/[\s,，;；.。·!！?？、]+/).filter(Boolean)

  for (const part of parts) {
    if (/^\d+$/.test(part)) continue

    if (part.includes(':')) {
      segments.push(part)
      continue
    }

    if (/[\u4e00-\u9fa5]/.test(part)) {
      if (part.length >= 2 && !STOP_SEGMENTS.has(part)) {
        segments.push(part)
      }
      for (const word of cutForSearch(part)) {
        const w = word.trim()
        if (w.length >= 2 && !/^\d+$/.test(w) && !STOP_SEGMENTS.has(w)) {
          segments.push(w)
        }
      }
    }

    const englishRuns = part.match(/[a-zA-Z][a-zA-Z0-9_-]*/g) ?? []
    for (const run of englishRuns) {
      if (run.length >= 2) segments.push(run.toLowerCase())
    }
  }

  const collapsed = trimmed.replace(/\d+/g, '').replace(/\s+/g, '')
  if (collapsed.length >= 2 && !segments.includes(collapsed)) {
    segments.push(collapsed)
  }

  return suppressDistinctSubsegments(dedupeStable(segments))
}

function isEmbeddedDistinctConflict(segment: string, pathValue: string): boolean {
  for (const pair of DISTINCT_SUBSTRING_PAIRS) {
    const [shorter, longer] = pair.split('|') as [string, string]
    if (pathValue !== shorter) continue
    if (segment.includes(longer)) return true
  }
  return false
}

function isBlockedSubstringMatch(segment: string, pathValue: string): boolean {
  if (segment === pathValue) return false
  const a = normalizeValue(segment)
  const b = normalizeValue(pathValue)
  if (!a || !b || a === b) return false
  const shorter = a.length <= b.length ? a : b
  const longer = a.length > b.length ? a : b
  if (!longer.includes(shorter)) return false
  return DISTINCT_SUBSTRING_PAIRS.has(`${shorter}|${longer}`)
}

function scoreSegmentAgainstPath(segment: string, pathValue: string): number {
  const seg = normalizeValue(segment)
  const val = pathValue
  if (!seg || !val) return 0
  if (isBlockedSubstringMatch(seg, val)) return 0
  if (seg === val) return 1000 + val.length
  if (val.includes(seg)) return 500 + seg.length
  if (seg.includes(val) && val.length >= 2) {
    if (isEmbeddedDistinctConflict(seg, val)) return 0
    return 400 + val.length
  }
  return 0
}

/** 片段及其同义词变体 */
function expandSegmentVariants(segment: string): string[] {
  const norm = normalizeValue(segment)
  const variants = [segment]
  const syns = SCORING_SYNONYMS[norm]
  if (syns) variants.push(...syns)
  return dedupeStable(variants)
}

function segmentMatchesPathValue(segment: string, pathValue: string): boolean {
  return expandSegmentVariants(segment).some((v) => scoreSegmentAgainstPath(v, pathValue) > 0)
}

function suppressKwForRegionLabels(paths: string[], regionLabels: Set<string>): string[] {
  if (regionLabels.size === 0) return paths
  return paths.filter((raw) => {
    const p = parsePath(raw)
    if (!p || p.type !== 'kw') return true
    return !regionLabels.has(p.value) && !isRegionKwValue(p.value)
  })
}

/** 用户原词拆段（空格/标点分隔，不含 n-gram 碎片的内部扩展） */
export function primaryQuerySegments(input: string): string[] {
  return dedupeStable(
    input
      .trim()
      .split(/[\s,，;；.。·!！?？、]+/)
      .map((s) => s.trim())
      .filter((s) => s && !/^\d+$/.test(s) && !STOP_SEGMENTS.has(s) && s.length >= 2),
  )
}

function scoreIntentPath(segment: string, entry: PathVocabEntry): number {
  const base = scoreSegmentAgainstPath(segment, entry.value)
  if (base === 0) return 0
  let score = base
  // 标题级长 kw 不应因短片段（如「荣耀」）成为意图路径
  if (entry.type === 'kw' && entry.value.length > segment.length * 2.5) {
    score *= 0.25
  }
  const typeBonus: Partial<Record<PathType, number>> = {
    tag: 80,
    cat: 40,
    tx: 30,
    kw: 15,
  }
  score += typeBonus[entry.type] ?? 0
  score -= Math.min(entry.demandCount, 80) * 0.15
  return score
}

/** 游戏/服务类动作后缀：复合词「王者荣耀代练」拆前缀(王者荣耀)+后缀(代练) */
const ACTION_SUFFIXES = [
  '代练陪玩',
  '陪玩',
  '代打',
  '代肝',
  '带练',
  '带飞',
  '上分',
  '代练',
]

/**
 * 复合意图：4+ 纯中文长片段（如「王者荣耀代练」）按动作后缀拆出
 * 前缀 + 后缀，各取池内 tag/kw 作为意图路径（上限 2 条，受 PATH_LIMITS 约束）。
 */
function tryResolveCompoundIntent(segment: string, vocabulary: PathVocabEntry[]): string[] {
  const norm = normalizeValue(segment)
  const typeByValue = new Map<string, PathType>()
  for (const e of vocabulary) {
    if (e.type === 'tag' || e.type === 'kw') typeByValue.set(e.value, e.type)
  }
  for (const suffix of ACTION_SUFFIXES) {
    const ns = normalizeValue(suffix)
    if (ns.length === 0 || !norm.endsWith(ns)) continue
    const prefix = norm.slice(0, norm.length - ns.length)
    if (prefix.length < 2) continue
    const found: string[] = []
    const tryAdd = (val: string) => {
      const v = normalizeValue(val)
      const type = typeByValue.get(v)
      if (type && !found.includes(`${type}:${v}`)) found.push(`${type}:${v}`)
    }
    tryAdd(prefix)
    tryAdd(suffix)
    if (found.length < 2) {
      for (const w of cutForSearch(prefix)) {
        if (w.length >= 2) tryAdd(w)
        if (found.length >= 2) break
      }
    }
    if (found.length >= 1) return dedupeStable(found).slice(0, 2)
  }
  return []
}

/** 每个原词拆段在池内选一条最能代表用户意图的计分路径 */
export function resolveIntentPaths(
  input: string,
  vocabulary: PathVocabEntry[],
  regionLabels: Set<string> = new Set(),
): string[] {
  const out: string[] = []
  const vocabTagValues = new Set<string>()
  for (const e of vocabulary) {
    if (e.type === 'tag') vocabTagValues.add(e.value)
  }
  for (const segment of primaryQuerySegments(input)) {
    if (segment.includes(':')) {
      const p = parsePath(segment)
      if (p && SCORING_PATH_TYPES.has(p.type) && !out.includes(p.raw)) out.push(p.raw)
      continue
    }
    // 复合意图：长中文片段按动作后缀拆前缀+后缀（如 王者荣耀代练）
    if (/^[一-龥]{4,}$/.test(segment)) {
      const compound = tryResolveCompoundIntent(segment, vocabulary)
      if (compound.length > 0) {
        for (const raw of compound) {
          if (!out.includes(raw)) out.push(raw)
        }
        continue
      }
    }
    if (regionIdForAlias(segment) != null) continue
    // 受控扩展：打车 的意图即 网约车/叫车（最强意图信号，优先入 intent）
    const rule = matchExpansionRule(segment)
    if (rule) {
      for (const tag of rule.expandTags) {
        const norm = normalizeValue(tag)
        if (vocabTagValues.has(norm)) {
          const raw = `tag:${norm}`
          if (!out.includes(raw)) out.push(raw)
        }
      }
    }
    let best: { raw: string; score: number } | null = null
    for (const variant of expandSegmentVariants(segment)) {
      for (const entry of vocabulary) {
        if (!isScoringVocabEntry(entry)) continue
        if (entry.type === 'kw' && (regionLabels.has(entry.value) || isRegionKwValue(entry.value))) {
          continue
        }
        const score = scoreIntentPath(variant, entry)
        if (score <= 0) continue
        if (!best || score > best.score) best = { raw: entry.raw, score }
      }
    }
    if (best && !out.includes(best.raw)) out.push(best.raw)
  }
  return out
}

/** 解析状态：hit=全部命中 / partial=部分片段未挂路径 / miss=零命中 */
export type ResolveStatus = 'hit' | 'partial' | 'miss'

export interface ResolveInputResult {
  paths: string[]
  facets: string[]
  primarySegments: string[]
  intentPaths: string[]
  unresolvedSegments: string[]
  /** 受控扩展产生的排除路径（如 打车 排除 tag:出租车），检索层 NOT (paths && exclude) */
  excludePaths: string[]
  /** miss/partial 时从池内词汇表推荐的近似路径 */
  suggestions: string[]
  status: ResolveStatus
}

/** 从输入解析筛选条件（attr/bkt/rgn），不参与 hitCount */
export function resolveInputFacets(
  input: string,
  vocabulary: PathVocabEntry[],
): string[] {
  const out: string[] = []
  const vocabRgn = new Set(
    vocabulary.filter((e) => e.type === 'rgn').map((e) => e.raw),
  )

  const tryRegionFacet = (token: string) => {
    const id = regionIdForAlias(token)
    if (id == null) return
    const raw = regionFacetRaw(id)
    if (vocabRgn.size > 0 && !vocabRgn.has(raw)) return
    pushFacet(out, raw)
  }

  for (const token of input.split(/[\s,，;；]+/).map((s) => s.trim()).filter(Boolean)) {
    const attr = ATTR_ALIASES[token] ?? ATTR_ALIASES[token.toLowerCase()]
    if (attr) {
      pushFacet(out, attr)
      continue
    }
    const explicit = parsePath(token)
    if (explicit && FACET_PATH_TYPES.has(explicit.type)) {
      pushFacet(out, explicit.raw)
      continue
    }
    const bkt = priceFacetFromText(token)
    if (bkt) {
      pushFacet(out, bkt)
      continue
    }
    tryRegionFacet(token)
  }

  const segments = segmentInputText(input)
  for (const segment of segments) {
    const attr = ATTR_ALIASES[segment] ?? ATTR_ALIASES[segment.toLowerCase()]
    if (attr) {
      pushFacet(out, attr)
      continue
    }
    if (segment.includes(':')) {
      const p = parsePath(segment)
      if (p && FACET_PATH_TYPES.has(p.type)) pushFacet(out, p.raw)
      continue
    }
    const bkt = priceFacetFromText(segment)
    if (bkt) {
      pushFacet(out, bkt)
      continue
    }
    tryRegionFacet(segment)
    for (const entry of vocabulary) {
      if (!FACET_PATH_TYPES.has(entry.type)) continue
      if (entry.type === 'rgn') continue
      if (entry.type === 'bkt') continue // bkt 仅来自预算短语解析，避免数字误挂错桶
      if (entry.type === 'attr' && !ATTR_ALIASES[segment]) continue
      const score = scoreSegmentAgainstPath(segment, entry.value)
      if (score > 0) pushFacet(out, entry.raw)
    }
  }

  return dedupeStable(out)
}

/**
 * 将用户输入映射到池内已有路径（顺藤摸瓜）
 */
export function resolveInputFull(input: string, vocabulary: PathVocabEntry[]): ResolveInputResult {
  const primarySegments = primaryQuerySegments(input)
  const facets = resolveInputFacets(input, vocabulary)
  const segments = segmentInputText(input)
  const regionLabels = regionLabelsFromSegments([...primarySegments, ...segments])
  const rawPaths = resolveInputToPaths(input, vocabulary, regionLabels)
  const paths = suppressKwForRegionLabels(rawPaths, regionLabels)
  const intentPaths = resolveIntentPaths(input, vocabulary, regionLabels).filter((p) =>
    paths.includes(p),
  )
  const unresolvedSegments = computeUnresolvedSegments(
    primarySegments,
    paths,
    facets,
    vocabulary,
  )

  // 受控扩展产生的排除路径（打车→排除 出租车/包车/租车）；不排除正在检索的路径
  const poolTagValues = vocabulary.filter((e) => e.type === 'tag').map((e) => e.value)
  const { excludePaths: rawExclude } = applyQueryExpansions(segments, poolTagValues)
  const pathSet = new Set(paths)
  const excludePaths = rawExclude.filter((p) => !pathSet.has(p))

  // miss/partial 时从池内词汇表推荐近似路径
  const suggestions = computeSuggestions(unresolvedSegments, pathSet, vocabulary)

  const status: ResolveStatus =
    paths.length === 0 ? 'miss' : unresolvedSegments.length > 0 ? 'partial' : 'hit'

  return { paths, facets, primarySegments, intentPaths, unresolvedSegments, excludePaths, suggestions, status }
}

/** miss/partial 时为未挂路径的片段推荐池内近似路径（受控，仅计分型） */
function computeSuggestions(
  unresolvedSegments: string[],
  pathSet: Set<string>,
  vocabulary: PathVocabEntry[],
): string[] {
  const out: string[] = []
  for (const seg of unresolvedSegments) {
    const scored: { raw: string; score: number }[] = []
    for (const entry of vocabulary) {
      if (!isScoringVocabEntry(entry)) continue
      if (pathSet.has(entry.raw)) continue
      const score = scoreSegmentAgainstPath(seg, entry.value)
      if (score > 0) scored.push({ raw: entry.raw, score })
    }
    scored.sort((a, b) => b.score - a.score || a.raw.localeCompare(b.raw))
    for (const x of scored.slice(0, 3)) {
      if (!out.includes(x.raw)) out.push(x.raw)
    }
  }
  return out.slice(0, 5)
}

export function resolveInputToPaths(
  input: string,
  vocabulary: PathVocabEntry[],
  regionLabels: Set<string> = new Set(),
): string[] {
  const out: string[] = []
  const typeCounts = new Map<PathType, number>()
  const candidates: { raw: string; score: number }[] = []

  for (const token of input.split(/[\s,，;；]+/).map((s) => s.trim()).filter(Boolean)) {
    const explicit = parsePath(token)
    if (explicit && SCORING_PATH_TYPES.has(explicit.type)) {
      if (explicit.type === 'kw' && (regionLabels.has(explicit.value) || isRegionKwValue(explicit.value))) {
        continue
      }
      pushScoringPath(out, explicit.raw, typeCounts)
    }
  }

  const segments = segmentInputText(input)
  // 池内 tag 值集合，供受控扩展判定是否挂载
  const vocabTagValues = new Set<string>()
  for (const e of vocabulary) {
    if (e.type === 'tag') vocabTagValues.add(e.value)
  }
  for (const segment of segments) {
    // 受控扩展（白名单）：打车→网约车/叫车、外包→财务/客服/人事外包
    // 仅追加池内存在的 tag，不跳过下方模糊计分（保留 tag:打车 等同词命中）
    const rule = matchExpansionRule(segment)
    if (rule) {
      for (const tag of rule.expandTags) {
        const norm = normalizeValue(tag)
        if (vocabTagValues.has(norm)) pushScoringPath(out, `tag:${norm}`, typeCounts)
      }
    }
    if (regionIdForAlias(segment) != null) continue
    for (const variant of expandSegmentVariants(segment)) {
      for (const entry of vocabulary) {
        if (!isScoringVocabEntry(entry)) continue
        if (entry.type === 'kw' && (regionLabels.has(entry.value) || isRegionKwValue(entry.value))) {
          continue
        }
        const score = scoreSegmentAgainstPath(variant, entry.value)
        if (score > 0) {
          candidates.push({ raw: entry.raw, score: score + Math.min(entry.demandCount, 50) })
        }
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.raw.localeCompare(b.raw))
  for (const c of candidates) {
    if (out.length >= PATH_LIMITS.perQuery) break
    pushScoringPath(out, c.raw, typeCounts)
  }

  return dedupeStable(out)
}

/** 原词拆段中未能挂上路径或筛选的片段 */
export function computeUnresolvedSegments(
  primarySegments: string[],
  paths: string[],
  facets: string[],
  vocabulary: PathVocabEntry[],
): string[] {
  const unresolved: string[] = []
  for (const seg of primarySegments) {
    if (seg.includes(':')) continue
    if (ATTR_ALIASES[seg] ?? ATTR_ALIASES[seg.toLowerCase()]) continue
    if (regionIdForAlias(seg) != null) {
      const id = regionIdForAlias(seg)!
      if (facets.includes(regionFacetRaw(id))) continue
    }
    // 受控扩展：打车 已由扩展挂到 网约车/叫车，视作已解析（避免误判 partial）
    const rule = matchExpansionRule(seg)
    if (rule) {
      const anyExpandInPool = rule.expandTags.some((tag) =>
        vocabulary.some((e) => e.type === 'tag' && e.value === normalizeValue(tag)),
      )
      if (anyExpandInPool) continue
    }
    let matched = false
    for (const raw of [...paths, ...facets]) {
      const p = parsePath(raw)
      if (!p) continue
      if (segmentMatchesPathValue(seg, p.value)) {
        matched = true
        break
      }
    }
    if (!matched) {
      for (const entry of vocabulary) {
        if (segmentMatchesPathValue(seg, entry.value)) {
          matched = true
          break
        }
      }
    }
    if (!matched) unresolved.push(seg)
  }
  return unresolved
}

/** 去掉被更长词包含的短碎片（王者荣耀 已含 王者/荣耀） */
function maximalChineseTokens(words: string[]): string[] {
  const unique = [...new Set(words)].sort((a, b) => b.length - a.length)
  const out: string[] = []
  for (const w of unique) {
    if (out.some((x) => x.includes(w))) continue
    out.push(w)
  }
  return out
}

/** 从标题/描述提取 kw 路径，供发布时挂到需求节点上 */
export function extractKwPathsFromText(text: string, max = 3): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const seen = new Set<string>()
  const out: string[] = []

  const pushKw = (seg: string) => {
    if (seg.includes(':') || /^\d+$/.test(seg) || seg.length < 2) return
    if (STOP_SEGMENTS.has(seg)) return
    if (isRegionKwValue(seg)) return
    const p = parsePath(`kw:${seg}`)
    if (!p || seen.has(p.raw)) return
    seen.add(p.raw)
    out.push(p.raw)
  }

  const searchWords = maximalChineseTokens(cutForSearch(trimmed))
  for (const word of searchWords) {
    pushKw(word)
    if (out.length >= max) return out.slice(0, max)
  }

  for (const kw of extractKeywords(trimmed, max * 2)) {
    pushKw(kw)
    if (out.length >= max) break
  }

  return out.slice(0, max)
}
