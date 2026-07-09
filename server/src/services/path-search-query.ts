import { PathCodecError } from './path-codec.js'

export type PathMatchMode = 'any' | 'majority' | 'all' | 'custom'
export type IntentMatchMode = 'off' | 'any' | 'all'
export type PathSortMode =
  | 'cross_hit'
  | 'intent_first'
  | 'hit_rate'
  | 'credit'
  | 'newest'
  | 'price_asc'
  | 'price_desc'

const MATCH_MODES = new Set<PathMatchMode>(['any', 'majority', 'all', 'custom'])
const INTENT_MATCH_MODES = new Set<IntentMatchMode>(['off', 'any', 'all'])
const SORT_MODES = new Set<PathSortMode>([
  'cross_hit',
  'intent_first',
  'hit_rate',
  'credit',
  'newest',
  'price_asc',
  'price_desc',
])

export interface ParsedSearchQuery {
  match: PathMatchMode
  minHit: number
  intentMatch: IntentMatchMode
  sort: PathSortMode
}

/** 根据 match 模式计算最少命中条数 */
export function computeMinHitRequired(
  match: PathMatchMode,
  minHit: number,
  pathCount: number,
): number {
  switch (match) {
    case 'any':
      return 1
    case 'majority':
      return Math.ceil(pathCount / 2)
    case 'all':
      return pathCount
    case 'custom':
      return minHit
  }
}

export function parseSearchQuery(raw: {
  match?: string
  minHit?: number | string
  intentMatch?: string
  sort?: string
  q?: string
  pathCount: number
}): ParsedSearchQuery {
  const pathCount = raw.pathCount
  if (pathCount < 1) {
    throw new PathCodecError('PATH_INVALID', '至少提供 1 条检索路径')
  }

  const match = (raw.match ?? 'any') as PathMatchMode
  if (!MATCH_MODES.has(match)) {
    throw new PathCodecError('QUERY_INVALID', `非法 match 参数: ${raw.match}`)
  }

  let intentMatch = (raw.intentMatch ?? 'off') as IntentMatchMode
  if (!INTENT_MATCH_MODES.has(intentMatch)) {
    throw new PathCodecError('QUERY_INVALID', `非法 intentMatch 参数: ${raw.intentMatch}`)
  }

  const sort = (raw.sort ?? 'cross_hit') as PathSortMode
  if (!SORT_MODES.has(sort)) {
    throw new PathCodecError('QUERY_INVALID', `非法 sort 参数: ${raw.sort}`)
  }

  const q = raw.q?.trim() ?? ''
  // 无检索词时意图过滤无意义 → 静默降级为 off（不报错）
  if (intentMatch !== 'off' && !q) {
    intentMatch = 'off'
  }

  let minHit = 1
  if (match === 'custom') {
    const rawMin = raw.minHit
    if (rawMin === undefined || rawMin === '') {
      throw new PathCodecError('QUERY_INVALID', 'match=custom 需要 minHit 参数')
    }
    minHit = typeof rawMin === 'string' ? Number(rawMin) : rawMin
    if (!Number.isFinite(minHit) || minHit < 1 || minHit > pathCount) {
      throw new PathCodecError(
        'QUERY_INVALID',
        `minHit 须在 1 到 ${pathCount} 之间`,
      )
    }
    minHit = Math.floor(minHit)
  }

  return { match, minHit, intentMatch, sort }
}

/** intentMatch=all 且无意图路径时抛错 */
export function assertIntentPathsForFilter(
  intentMatch: IntentMatchMode,
  intentPathCount: number,
): void {
  if (intentMatch !== 'off' && intentPathCount === 0) {
    throw new PathCodecError('QUERY_INVALID', '当前检索条件下无可用意图路径')
  }
}
