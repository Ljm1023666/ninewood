/**
 * TASK-11 · 路径编解码（与 server/src/services/path-codec.ts 保持同步）
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
const PATH_VALUE_RE = /^[a-z0-9\u4e00-\u9fa5_=-]{1,40}$/

export function normalizeValue(v: string): string {
  return v.trim().normalize('NFC').toLowerCase().replace(/\s+/g, '_')
}

export function parsePath(raw: string): ParsedPath | null {
  const trimmed = raw.trim()
  const colon = trimmed.indexOf(':')
  if (colon <= 0) return null
  const type = trimmed.slice(0, colon).toLowerCase() as PathType
  if (!PATH_TYPES.has(type)) return null
  const value = normalizeValue(trimmed.slice(colon + 1))
  if (!value || !PATH_VALUE_RE.test(value)) return null
  return { type, value, raw: `${type}:${value}` }
}

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
  serviceType: 'ONLINE' | 'OFFLINE' | null
  minPrice: number
  regionId?: number | null
  isCertifiedOnly: boolean
  tags: string[]
  tagsConfirmed: boolean
}

export function derivePaths(d: DerivePathsInput): string[] {
  if (!d.serviceType) return []
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
  if (d.isCertifiedOnly) out.push('attr:certonly=true')
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

export function isScoringPath(raw: string): boolean {
  const p = parsePath(raw)
  return p != null && SCORING_PATH_TYPES.has(p.type)
}

export function isFacetPath(raw: string): boolean {
  const p = parsePath(raw)
  return p != null && FACET_PATH_TYPES.has(p.type)
}

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

export function derivePathsFromWorkspaceFields(fields: {
  category: string
  taxonomyLeafId: string | null
  serviceType: 'ONLINE' | 'OFFLINE' | null
  budget: string
  regionId?: number
  isCertifiedOnly: boolean
  tags: string[]
  tagsConfirmed: boolean
}): string[] {
  const nums = fields.budget.match(/\d+/g)
  const minPrice =
    nums && nums.length > 0 ? Math.min(...nums.map(Number)) : 1
  return derivePaths({
    category: fields.category,
    taxonomyLeafId: fields.taxonomyLeafId,
    serviceType: fields.serviceType,
    minPrice,
    regionId: fields.regionId ?? null,
    isCertifiedOnly: fields.isCertifiedOnly,
    tags: fields.tags,
    tagsConfirmed: fields.tagsConfirmed,
  })
}
