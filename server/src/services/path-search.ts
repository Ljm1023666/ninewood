import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import {
  derivePaths,
  mergePaths,
  validateScoringPaths,
  validateFacets,
  splitQueryInputs,
  PathCodecError,
  dedupeStable,
  parsePath,
} from './path-codec.js'
import {
  extractKwPathsFromText,
  resolveInputFull,
  resolveInputToPaths,
  segmentInputText,
  type PathVocabEntry,
} from './path-resolver.js'
import {
  assertIntentPathsForFilter,
  computeMinHitRequired,
  type IntentMatchMode,
  type PathMatchMode,
  type PathSortMode,
  type ParsedSearchQuery,
} from './path-search-query.js'

let vocabCache: { at: number; entries: PathVocabEntry[] } | null = null
const VOCAB_TTL_MS = 60_000

/** 从需求池加载当前在用的路径词汇表 */
export async function loadPathVocabulary(): Promise<PathVocabEntry[]> {
  const now = Date.now()
  if (vocabCache && now - vocabCache.at < VOCAB_TTL_MS) {
    return vocabCache.entries
  }

  const rows = await prisma.$queryRaw<Array<{ path: string; cnt: number }>>`
    SELECT p AS path, COUNT(*)::int AS cnt
    FROM "Demand" d, unnest(d."paths") p
    WHERE array_length(d."paths", 1) > 0
    GROUP BY p
    ORDER BY cnt DESC
  `

  const entries: PathVocabEntry[] = []
  for (const row of rows) {
    const parsed = parsePath(row.path)
    if (!parsed) continue
    entries.push({
      raw: parsed.raw,
      type: parsed.type,
      value: parsed.value,
      demandCount: row.cnt,
    })
  }

  vocabCache = { at: now, entries }
  return entries
}

/** 检索侧：将用户输入解析为池内真实路径（计分 paths + 筛选 facets 分离） */
export async function resolveQueryToPaths(query: string): Promise<{
  paths: string[]
  facets: string[]
  segments: string[]
  primarySegments: string[]
  intentPaths: string[]
  unresolvedSegments: string[]
  excludePaths: string[]
  suggestions: string[]
  status: 'hit' | 'partial' | 'miss'
}> {
  const vocabulary = await loadPathVocabulary()
  const {
    paths,
    facets,
    primarySegments,
    intentPaths,
    unresolvedSegments,
    excludePaths,
    suggestions,
    status,
  } = resolveInputFull(query, vocabulary)
  const segments = segmentInputText(query)
  return { paths, facets, segments, primarySegments, intentPaths, unresolvedSegments, excludePaths, suggestions, status }
}

export interface PathSearchItem {
  id: string
  title: string
  minPrice: number
  category: string
  tagName: string | null
  serviceType: string
  applicantCount: number
  createdAt: Date
  paths: string[]
  hitCount: number
  intentHitCount: number
  matchedPaths: string[]
  user: {
    id: string
    nickname: string
    avatarUrl: string | null
    certificationLevel: string
    creditScore: number
  }
}

function stageWhere(stage: 'active' | 'completed'): Prisma.Sql {
  if (stage === 'completed') {
    return Prisma.sql`d.stage = 'completed' AND d.status = 'COMPLETED'`
  }
  return Prisma.sql`d.stage = 'active' AND d.status NOT IN ('CLOSED', 'FROZEN', 'IN_PROGRESS')`
}

function visibilityWhere(viewerUserId?: string): Prisma.Sql {
  if (viewerUserId) {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000)
    return Prisma.sql`(
      d."isPublic" = true
      OR EXISTS (
        SELECT 1 FROM "CircleMember" cm
        WHERE cm."circleId" = d."circleId" AND cm."userId" = ${viewerUserId}
      )
      OR (d."isPublic" = false AND d."createdAt" < ${cutoff})
    )`
  }
  return Prisma.sql`d."isPublic" = true`
}

function applicantCapWhere(): Prisma.Sql {
  return Prisma.sql`(
    d.status NOT IN ('PENDING', 'ACTIVE')
    OR d."applicantCount" < COALESCE(d."maxApplicants", 10)
  )`
}

function baseMarketplaceWhere(stage: 'active' | 'completed', viewerUserId?: string): Prisma.Sql {
  return Prisma.join(
    [stageWhere(stage), visibilityWhere(viewerUserId), applicantCapWhere()],
    ' AND ',
  )
}

export interface PathSearchMeta {
  match: PathMatchMode
  minHit: number
  intentMatch: IntentMatchMode
  sort: PathSortMode
  queryPathCount: number
  intentPaths: string[]
  intentPathCount: number
  minHitRequired: number
  facetPaths: string[]
  facetPathCount: number
  excludePaths: string[]
}

function buildOrderBy(sort: PathSortMode): Prisma.Sql {
  switch (sort) {
    case 'intent_first':
      return Prisma.sql`"intentHitCount" DESC, "hitCount" DESC, "creditScore" DESC, "createdAt" DESC, id DESC`
    case 'hit_rate':
      return Prisma.sql`"hitRate" DESC, "hitCount" DESC, "intentHitCount" DESC, "creditScore" DESC, id DESC`
    case 'credit':
      return Prisma.sql`"creditScore" DESC, "hitCount" DESC, "intentHitCount" DESC, "createdAt" DESC, id DESC`
    case 'newest':
      return Prisma.sql`"createdAt" DESC, "hitCount" DESC, "intentHitCount" DESC, "creditScore" DESC, id DESC`
    case 'price_asc':
      return Prisma.sql`"minPrice" ASC, "hitCount" DESC, id DESC`
    case 'price_desc':
      return Prisma.sql`"minPrice" DESC, "hitCount" DESC, id DESC`
    case 'cross_hit':
    default:
      return Prisma.sql`"hitCount" DESC, "intentHitCount" DESC, "creditScore" DESC, "createdAt" DESC, id DESC`
  }
}

function buildIntentFilter(intentMatch: IntentMatchMode, intentPathCount: number): Prisma.Sql {
  if (intentMatch === 'off') {
    return Prisma.sql`TRUE`
  }
  if (intentMatch === 'any') {
    return Prisma.sql`"intentHitCount" >= 1`
  }
  return Prisma.sql`"intentHitCount" = ${intentPathCount}`
}

function buildFacetFilter(facets: string[]): Prisma.Sql {
  if (facets.length === 0) return Prisma.sql`TRUE`
  const parts = facets.map((f) => Prisma.sql`${f} = ANY(d.paths)`)
  return Prisma.join(parts, ' AND ')
}

export async function computePathCoverage(
  paths: string[],
  stage: 'active' | 'completed' = 'active',
): Promise<Record<string, number>> {
  // 合并计分路径与筛选条件（rgn/bkt/attr 同样参与覆盖统计）
  const split = splitQueryInputs(paths)
  const scoring = split.scoringPaths.length
    ? validateScoringPaths(split.scoringPaths)
    : []
  const facets = validateFacets(split.facets)
  const validated = dedupeStable([...scoring, ...facets])
  if (validated.length === 0) return {}

  const rows = await prisma.$queryRaw<Array<{ path: string; cnt: number }>>`
    SELECT p AS path, COUNT(*)::int AS cnt
    FROM "Demand" d, unnest(d."paths") p
    WHERE p = ANY(${validated}::text[])
      AND d."paths" && ${validated}::text[]
      AND ${baseMarketplaceWhere(stage)}
    GROUP BY p
  `

  const coverage: Record<string, number> = {}
  for (const p of validated) {
    coverage[p] = 0
  }
  for (const row of rows) {
    coverage[row.path] = row.cnt
  }
  return coverage
}

export async function searchByPaths(params: {
  paths: string[]
  facets?: string[]
  stage?: 'active' | 'completed'
  page?: number
  limit?: number
  viewerUserId?: string
  /** 原词意图路径，同分时优先命中更多者 */
  intentPaths?: string[]
  /** 受控排除路径：含任一 excludePath 的需求被过滤（如 打车 排除 出租车/包车） */
  excludePaths?: string[]
  query?: ParsedSearchQuery
}): Promise<{
  items: PathSearchItem[]
  total: number
  page: number
  limit: number
  totalPages: number
  coverage: Record<string, number>
  meta: PathSearchMeta
}> {
  const validated = validateScoringPaths(params.paths)
  if (validated.length === 0) {
    throw new PathCodecError('PATH_INVALID', '至少提供 1 条检索路径')
  }
  const validatedFacets = validateFacets(params.facets ?? [])

  // 排除路径：仅保留可解析的路径，去重，最多 20 条（不计入 perQuery 上限）
  const excludePaths = dedupeStable(
    (params.excludePaths ?? [])
      .map((p) => parsePath(p))
      .filter((p): p is NonNullable<typeof p> => p != null)
      .map((p) => p.raw),
  ).slice(0, 20)

  const stage = params.stage ?? 'active'
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(50, Math.max(1, params.limit ?? 20))
  const offset = (page - 1) * limit
  const viewerUserId = params.viewerUserId
  const intentPaths = (params.intentPaths ?? []).filter((p) => validated.includes(p))

  const query = params.query ?? {
    match: 'any' as const,
    minHit: 1,
    intentMatch: 'off' as const,
    sort: 'cross_hit' as const,
  }

  assertIntentPathsForFilter(query.intentMatch, intentPaths.length)

  const minHitRequired = computeMinHitRequired(query.match, query.minHit, validated.length)
  const scoringPathLen = validated.length
  const intentPathCount = intentPaths.length
  const whereBase = baseMarketplaceWhere(stage, viewerUserId)
  const intentFilter = buildIntentFilter(query.intentMatch, intentPathCount)
  const facetFilter = buildFacetFilter(validatedFacets)
  const orderBy = buildOrderBy(query.sort)
  // 排除条件：NOT (demand.paths && excludePaths)
  const excludeFilter =
    excludePaths.length > 0
      ? Prisma.sql`AND NOT (d.paths && ${excludePaths}::text[])`
      : Prisma.empty

  const countRows = await prisma.$queryRaw<Array<{ total: number }>>`
    WITH base AS (
      SELECT
        d.id,
        (
          SELECT COUNT(*)::int FROM unnest(d.paths) p
          WHERE p = ANY(${validated}::text[])
        ) AS "hitCount",
        (
          SELECT COUNT(*)::int FROM unnest(${intentPaths}::text[]) ip
          WHERE ip = ANY(d.paths)
        ) AS "intentHitCount"
      FROM "Demand" d
      WHERE d."paths" && ${validated}::text[]
        AND ${whereBase}
        AND ${facetFilter}
        ${excludeFilter}
    ),
    filtered AS (
      SELECT *
      FROM base
      WHERE "hitCount" >= ${minHitRequired}
        AND ${intentFilter}
    )
    SELECT COUNT(*)::int AS total FROM filtered
  `
  const total = countRows[0]?.total ?? 0

  const raw = await prisma.$queryRaw<
    Array<{
      id: string
      title: string
      minPrice: unknown
      category: string
      tagName: string | null
      serviceType: string
      applicantCount: number
      createdAt: Date
      paths: string[]
      hitCount: number
      intentHitCount: number
      hitRate: number
      matchedPaths: string[]
      nickname: string
      avatarUrl: string | null
      certificationLevel: string
      creditScore: number
      userId: string
    }>
  >`
    WITH base AS (
      SELECT
        d.id,
        d.title,
        d."minPrice",
        d.category,
        d."tagName",
        d."serviceType",
        d."applicantCount",
        d."createdAt",
        d.paths,
        d."userId",
        u.nickname,
        u."avatarUrl",
        u."certificationLevel",
        u."creditScore",
        (
          SELECT COUNT(*)::int FROM unnest(d.paths) p
          WHERE p = ANY(${validated}::text[])
        ) AS "hitCount",
        (
          SELECT COUNT(*)::int FROM unnest(${intentPaths}::text[]) ip
          WHERE ip = ANY(d.paths)
        ) AS "intentHitCount",
        ARRAY(
          SELECT p FROM unnest(d.paths) p
          WHERE p = ANY(${validated}::text[])
        ) AS "matchedPaths"
      FROM "Demand" d
      JOIN "User" u ON u.id = d."userId"
      WHERE d."paths" && ${validated}::text[]
        AND ${whereBase}
        AND ${facetFilter}
        ${excludeFilter}
    ),
    filtered AS (
      SELECT
        b.*,
        b."hitCount"::float / ${scoringPathLen}::float AS "hitRate"
      FROM base b
      WHERE b."hitCount" >= ${minHitRequired}
        AND ${intentFilter}
    )
    SELECT * FROM filtered
    ORDER BY ${orderBy}
    LIMIT ${limit} OFFSET ${offset}
  `

  const items: PathSearchItem[] = raw.map((d) => ({
    id: d.id,
    title: d.title,
    minPrice: Number(d.minPrice),
    category: d.category,
    tagName: d.tagName,
    serviceType: d.serviceType,
    applicantCount: d.applicantCount,
    createdAt: d.createdAt,
    paths: d.paths ?? [],
    hitCount: d.hitCount,
    intentHitCount: d.intentHitCount,
    matchedPaths: d.matchedPaths ?? [],
    user: {
      id: d.userId,
      nickname: d.nickname,
      avatarUrl: d.avatarUrl,
      certificationLevel: d.certificationLevel,
      creditScore: d.creditScore,
    },
  }))

  const coverage = await computePathCoverage(validated, stage)

  const meta: PathSearchMeta = {
    match: query.match,
    minHit: query.minHit,
    intentMatch: query.intentMatch,
    sort: query.sort,
    queryPathCount: validated.length,
    intentPaths,
    intentPathCount,
    minHitRequired,
    facetPaths: validatedFacets,
    facetPathCount: validatedFacets.length,
    excludePaths,
  }

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 0,
    coverage,
    meta,
  }
}

export async function getDemandPaths(demandId: string) {
  const demand = await prisma.demand.findUnique({
    where: { id: demandId },
    select: {
      id: true,
      title: true,
      description: true,
      paths: true,
      pathsEditedAt: true,
      category: true,
      taxonomyLeafId: true,
      serviceType: true,
      minPrice: true,
      regionId: true,
      isCertifiedOnly: true,
      tags: true,
      tagsConfirmed: true,
    },
  })
  if (!demand) {
    throw Object.assign(new Error('需求不存在'), { status: 404 })
  }

  const autoPaths = resolveDemandPaths({
    category: demand.category,
    taxonomyLeafId: demand.taxonomyLeafId,
    serviceType: demand.serviceType,
    minPrice: Number(demand.minPrice),
    regionId: demand.regionId,
    isCertifiedOnly: demand.isCertifiedOnly,
    tags: demand.tags,
    tagsConfirmed: demand.tagsConfirmed,
    title: demand.title,
    description: demand.description,
  })

  return {
    demandId: demand.id,
    paths: demand.paths,
    autoPaths,
    pathsEditedAt: demand.pathsEditedAt,
  }
}

export async function updateDemandPaths(
  demandId: string,
  userId: string,
  paths: string[],
) {
  const demand = await prisma.demand.findUnique({
    where: { id: demandId },
    select: { userId: true },
  })
  if (!demand) {
    throw Object.assign(new Error('需求不存在'), { status: 404 })
  }
  if (demand.userId !== userId) {
    throw Object.assign(new Error('仅发布者可编辑路径'), { status: 403 })
  }

  const validated = mergePaths([], paths)

  const updated = await prisma.demand.update({
    where: { id: demandId },
    data: {
      paths: validated,
      pathsEditedAt: new Date(),
    },
    select: {
      id: true,
      paths: true,
      pathsEditedAt: true,
    },
  })

  return updated
}

/** 发布时写入 paths（结构化字段 + 标题描述关键词） */
export function resolveDemandPaths(
  params: {
    category: string
    taxonomyLeafId?: string | null
    serviceType: 'ONLINE' | 'OFFLINE'
    minPrice: number
    regionId?: number | null
    isCertifiedOnly: boolean
    tags: string[]
    tagsConfirmed: boolean
    title?: string
    description?: string
  },
  userPaths?: string[],
): string[] {
  const auto = derivePaths({
    category: params.category,
    taxonomyLeafId: params.taxonomyLeafId,
    serviceType: params.serviceType,
    minPrice: params.minPrice,
    regionId: params.regionId,
    isCertifiedOnly: params.isCertifiedOnly,
    tags: params.tags,
    tagsConfirmed: params.tagsConfirmed,
  })
  const textKw = extractKwPathsFromText(
    `${params.title ?? ''} ${params.description ?? ''}`.trim(),
  )
  const combined = dedupeStable([...auto, ...textKw])
  return mergePaths(combined, userPaths ?? [])
}
