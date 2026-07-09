/**
 * TASK-11 · 路径编解码（纯函数，无 IO）
 * 路径格式: <type>:<value>，全小写 NFC，值内空格转下划线
 */
export type PathType = 'tx' | 'cat' | 'tag' | 'attr' | 'bkt' | 'rgn' | 'kw'

export interface ParsedPath {
  type: PathType
  value: string
  raw: string
}

export const PRICE_BUCKETS = [
  { max: 100, key: '0_100' },
  { max: 500, key: '100_500' },
  { max: 1000, key: '500_1000' },
  { max: 5000, key: '1000_5000' },
  { max: 20000, key: '5000_20000' },
  { max: Infinity, key: '20000_plus' },
] as const

export const PATH_LIMITS = {
  perDemand: 12,
  perQuery: 8,
  perFacets: 6,
  perType: { tag: 6, kw: 3 } as Partial<Record<PathType, number>>,
} as const

/** 参与 OR 交叉计分的路径类型 */
export const SCORING_PATH_TYPES = new Set<PathType>(['tx', 'cat', 'tag', 'kw'])
/** 硬 AND 筛选条件（不进 hitCount） */
export const FACET_PATH_TYPES = new Set<PathType>(['attr', 'bkt', 'rgn'])

const PATH_TYPES = new Set<PathType>(['tx', 'cat', 'tag', 'attr', 'bkt', 'rgn', 'kw'])

/** 路径值字符集：小写字母、数字、中文、下划线、等号、连字符 */
const PATH_VALUE_RE = /^[a-z0-9\u4e00-\u9fa5_=\-]{1,40}$/

export type PathCodecErrorCode = 'PATH_INVALID' | 'PATH_LIMIT' | 'QUERY_INVALID'

export class PathCodecError extends Error {
  readonly status = 400

  constructor(
    readonly code: PathCodecErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'PathCodecError'
  }
}

/** 规范化路径值：trim → NFC → 小写 → 空格转下划线 */
export function normalizeValue(v: string): string {
  return v
    .trim()
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, '_')
}

/** 校验并解析单条路径；非法返回 null */
export function parsePath(raw: string): ParsedPath | null {
  const trimmed = raw.trim()
  const colon = trimmed.indexOf(':')
  if (colon <= 0) return null

  const typeRaw = trimmed.slice(0, colon)
  const type = typeRaw.toLowerCase() as PathType
  if (!PATH_TYPES.has(type)) return null

  const value = normalizeValue(trimmed.slice(colon + 1))
  if (!value || !PATH_VALUE_RE.test(value)) return null

  return { type, value, raw: `${type}:${value}` }
}

/** 价格分桶（确定性） */
export function priceToBucket(minPrice: number): string {
  const p = Math.max(0, Number(minPrice) || 0)
  for (const b of PRICE_BUCKETS) {
    if (p <= b.max) return b.key
  }
  return '20000_plus'
}

export interface DerivePathsInput {
  category: string
  taxonomyLeafId?: string | null
  serviceType: 'ONLINE' | 'OFFLINE'
  minPrice: number
  regionId?: number | null
  isCertifiedOnly: boolean
  tags: string[]
  tagsConfirmed: boolean
}

/** 从 Demand 结构化字段派生自动路径（确定性，无 LLM） */
export function derivePaths(d: DerivePathsInput): string[] {
  const out: string[] = []

  if (d.taxonomyLeafId?.trim()) {
    const p = parsePath(`tx:${normalizeValue(d.taxonomyLeafId)}`)
    if (p) out.push(p.raw)
  }

  if (d.category?.trim()) {
    const p = parsePath(`cat:${normalizeValue(d.category)}`)
    if (p) out.push(p.raw)
  }

  const st = d.serviceType === 'ONLINE' ? 'online' : 'offline'
  out.push(`attr:servicetype=${st}`)

  if (d.isCertifiedOnly) {
    out.push('attr:certonly=true')
  }

  out.push(`bkt:price=${priceToBucket(d.minPrice)}`)

  if (d.regionId != null && d.regionId > 0) {
    const p = parsePath(`rgn:${String(d.regionId)}`)
    if (p) out.push(p.raw)
  }

  if (d.tagsConfirmed && d.tags.length > 0) {
    const tagPaths = d.tags
      .map((t) => parsePath(`tag:${t}`))
      .filter((p): p is ParsedPath => p != null)
      .map((p) => p.raw)
      .sort()
    out.push(...tagPaths)
  }

  return dedupeStable(out)
}

/** 去重并保持首次出现顺序 */
export function dedupeStable(paths: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of paths) {
    if (seen.has(p)) continue
    seen.add(p)
    out.push(p)
  }
  return out
}

/** 校验路径集合并返回规范化列表；非法抛 PathCodecError */
export function validatePaths(
  paths: string[],
  opts: { maxCount: number; label?: string },
): string[] {
  const label = opts.label ?? 'paths'
  const normalized: string[] = []

  for (const raw of paths) {
    const p = parsePath(raw)
    if (!p) {
      throw new PathCodecError('PATH_INVALID', `${label} 含非法路径: ${raw}`)
    }
    normalized.push(p.raw)
  }

  const deduped = dedupeStable(normalized)

  if (deduped.length > opts.maxCount) {
    throw new PathCodecError(
      'PATH_LIMIT',
      `${label} 超过上限 ${opts.maxCount} 条（当前 ${deduped.length}）`,
    )
  }

  const typeCounts = new Map<PathType, number>()
  for (const raw of deduped) {
    const p = parsePath(raw)!
    const limit = PATH_LIMITS.perType[p.type]
    if (limit != null) {
      const n = (typeCounts.get(p.type) ?? 0) + 1
      if (n > limit) {
        throw new PathCodecError(
          'PATH_LIMIT',
          `${label} 中 type=${p.type} 超过上限 ${limit} 条`,
        )
      }
      typeCounts.set(p.type, n)
    }
  }

  return deduped
}

/** 需求路径超限时按类型优先级裁剪（先丢 kw，保留 cat/tx/rgn 等） */
export function trimPathsToDemandLimit(paths: string[]): string[] {
  const priority: Record<PathType, number> = {
    tx: 0,
    cat: 1,
    attr: 2,
    bkt: 3,
    rgn: 4,
    tag: 5,
    kw: 6,
  }
  const parsed = dedupeStable(paths)
    .map((raw) => parsePath(raw))
    .filter((p): p is ParsedPath => p != null)
    .sort((a, b) => priority[a.type] - priority[b.type] || a.raw.localeCompare(b.raw))

  const out: string[] = []
  const typeCounts = new Map<PathType, number>()
  for (const p of parsed) {
    if (out.length >= PATH_LIMITS.perDemand) break
    const limit = PATH_LIMITS.perType[p.type]
    const n = typeCounts.get(p.type) ?? 0
    if (limit != null && n >= limit) continue
    out.push(p.raw)
    typeCounts.set(p.type, n + 1)
  }
  return out
}

/**
 * 合并自动路径与用户编辑路径
 * userEdited 非空时视为全量替换（仍做格式/数量校验）
 */
export function mergePaths(auto: string[], userEdited: string[]): string[] {
  if (userEdited.length === 0) {
    return validatePaths(trimPathsToDemandLimit(auto), {
      maxCount: PATH_LIMITS.perDemand,
      label: '需求路径',
    })
  }
  return validatePaths(userEdited, { maxCount: PATH_LIMITS.perDemand, label: '需求路径' })
}

export function isScoringPath(raw: string): boolean {
  const p = parsePath(raw)
  return p != null && SCORING_PATH_TYPES.has(p.type)
}

export function isFacetPath(raw: string): boolean {
  const p = parsePath(raw)
  return p != null && FACET_PATH_TYPES.has(p.type)
}

/** 将混合输入拆分为计分路径与筛选条件 */
export function splitQueryInputs(paths: string[]): {
  scoringPaths: string[]
  facets: string[]
} {
  const scoringPaths: string[] = []
  const facets: string[] = []
  for (const raw of paths) {
    const p = parsePath(raw)
    if (!p) continue
    if (SCORING_PATH_TYPES.has(p.type)) scoringPaths.push(p.raw)
    else if (FACET_PATH_TYPES.has(p.type)) facets.push(p.raw)
  }
  return {
    scoringPaths: dedupeStable(scoringPaths),
    facets: dedupeStable(facets),
  }
}

function validatePathsOfTypes(
  paths: string[],
  allowed: Set<PathType>,
  opts: { maxCount: number; label: string; perType?: Partial<Record<PathType, number>> },
): string[] {
  const normalized: string[] = []
  for (const raw of paths) {
    const p = parsePath(raw)
    if (!p) {
      throw new PathCodecError('PATH_INVALID', `${opts.label} 含非法路径: ${raw}`)
    }
    if (!allowed.has(p.type)) {
      throw new PathCodecError(
        'PATH_INVALID',
        `${opts.label} 不允许 type=${p.type}: ${raw}`,
      )
    }
    normalized.push(p.raw)
  }
  const deduped = dedupeStable(normalized)
  if (deduped.length > opts.maxCount) {
    throw new PathCodecError(
      'PATH_LIMIT',
      `${opts.label} 超过上限 ${opts.maxCount} 条（当前 ${deduped.length}）`,
    )
  }
  if (opts.perType) {
    const typeCounts = new Map<PathType, number>()
    for (const raw of deduped) {
      const p = parsePath(raw)!
      const limit = opts.perType[p.type]
      if (limit != null) {
        const n = (typeCounts.get(p.type) ?? 0) + 1
        if (n > limit) {
          throw new PathCodecError(
            'PATH_LIMIT',
            `${opts.label} 中 type=${p.type} 超过上限 ${limit} 条`,
          )
        }
        typeCounts.set(p.type, n)
      }
    }
  }
  return deduped
}

/** 检索侧计分路径校验（仅 tx/cat/tag/kw） */
export function validateScoringPaths(paths: string[]): string[] {
  return validatePathsOfTypes(paths, SCORING_PATH_TYPES, {
    maxCount: PATH_LIMITS.perQuery,
    label: '检索路径',
    perType: PATH_LIMITS.perType,
  })
}

/** 检索侧筛选条件校验（仅 attr/bkt/rgn） */
export function validateFacets(facets: string[]): string[] {
  return validatePathsOfTypes(facets, FACET_PATH_TYPES, {
    maxCount: PATH_LIMITS.perFacets,
    label: '筛选条件',
  })
}

/** @deprecated 使用 validateScoringPaths；保留兼容旧调用 */
export function validateQueryPaths(paths: string[]): string[] {
  return validateScoringPaths(paths)
}

/** 命中路径数（查询集合 ∩ 需求路径） */
export function countPathHits(queryPaths: string[], demandPaths: string[]): number {
  const q = new Set(queryPaths)
  let n = 0
  for (const p of demandPaths) {
    if (q.has(p)) n++
  }
  return n
}

/** 命中的路径列表（稳定：按 query 顺序） */
export function matchedPaths(queryPaths: string[], demandPaths: string[]): string[] {
  const d = new Set(demandPaths)
  return queryPaths.filter((p) => d.has(p))
}
