import { CapabilityHealth, LoopKind, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { dedupeStable, splitQueryInputs, validateFacets, validateScoringPaths } from '../path-codec.js'
import { resolveQueryToPaths } from '../path-search.js'
import { getLoopExecutor } from './executors/index.js'
import { toPublicOffering } from './offering.service.js'
import { getRecipe } from './composition.service.js'

export interface RecommendLoopsParams {
  q?: string
  paths?: string[]
  facets?: string[]
  limit?: number
}

export async function recommendLoops(params: RecommendLoopsParams) {
  const q = params.q?.trim() ?? ''
  const explicit = splitQueryInputs([...(params.paths ?? []), ...(params.facets ?? [])])
  const resolved = q
    ? await resolveQueryToPaths(q)
    : {
        paths: [] as string[],
        facets: [] as string[],
        segments: [] as string[],
        primarySegments: [] as string[],
        intentPaths: [] as string[],
        unresolvedSegments: [] as string[],
        excludePaths: [] as string[],
        suggestions: [] as string[],
        status: 'miss' as const,
      }
  const paths = dedupeStable([
    ...resolved.paths,
    ...validateScoringPaths(explicit.scoringPaths),
  ])
  const facets = dedupeStable([
    ...resolved.facets,
    ...validateFacets(explicit.facets),
  ])
  const allPaths = [...paths, ...facets]

  const where: Prisma.LoopOfferingWhereInput = {
    status: 'ACTIVE',
    definition: { loopKind: LoopKind.EARTH },
    endpoint: { healthStatus: CapabilityHealth.ONLINE },
    verificationContracts: { some: { isRequired: true } },
  }

  const rows = await prisma.loopOffering.findMany({
    where,
    include: {
      endpoint: {
        select: { healthStatus: true, hostMode: true, successRatePublic: true, capacityJson: true },
      },
      definition: {
        select: {
          loopKind: true,
          code: true,
          name: true,
          description: true,
          executionMode: true,
          inputSchema: true,
          outcomeSchema: true,
        },
      },
      verificationContracts: {
        include: { verifierEndpoint: { select: { id: true, code: true, name: true } } },
      },
    },
    take: 100,
  })

  const queryLower = q.toLocaleLowerCase('zh-CN')
  const ngrams = (value: string) => {
    const compact = value.toLocaleLowerCase('zh-CN').replace(/[\s，。！？、,.;:：；!?_-]+/g, '')
    const grams = new Set<string>()
    for (let index = 0; index < compact.length - 1; index++) grams.add(compact.slice(index, index + 2))
    return grams
  }
  const queryGrams = ngrams(queryLower)
  const ranked = rows
    .filter((row) => {
      if (getLoopExecutor(row.definition.code) || getRecipe(row.definition.code)) return true
      // 用户 EXTERNAL_API：有 URL 即可进入候选
      const url = (row.endpoint as { capacityJson?: { url?: string } } | null)?.capacityJson?.url
      return Boolean(url)
    })
    .map((row) => {
      const matchedPaths = row.paths.filter((path) => allPaths.includes(path))
      const haystack = `${row.title} ${row.summary ?? ''}`.toLocaleLowerCase('zh-CN')
      const textIntentScore = queryLower
        ? Array.from(ngrams(haystack)).filter((gram) => queryGrams.has(gram)).length
        : 0
      const textMatched = textIntentScore > 0
      return {
        row,
        matchedPaths,
        textMatched,
        textIntentScore,
        publicSuccessRate: row.endpoint?.successRatePublic ? (row.internalSuccessRate ?? -1) : -1,
      }
    })
    .filter((item) => item.matchedPaths.length > 0 || item.textMatched)
    .sort((a, b) =>
      b.matchedPaths.length - a.matchedPaths.length ||
      b.textIntentScore - a.textIntentScore ||
      b.publicSuccessRate - a.publicSuccessRate ||
      (b.row.dealRate ?? -1) - (a.row.dealRate ?? -1) ||
      (a.row.avgDurationMs ?? Number.MAX_SAFE_INTEGER) - (b.row.avgDurationMs ?? Number.MAX_SAFE_INTEGER) ||
      b.row.createdAt.getTime() - a.row.createdAt.getTime(),
    )
    .slice(0, Math.min(Math.max(params.limit ?? 20, 1), 50))

  const items = ranked.map(({ row, matchedPaths, textMatched }) => ({
    ...toPublicOffering(row),
    executionMode: row.definition.executionMode,
    match: {
      matchedPaths,
      textMatched,
      reasons: [
        ...matchedPaths.map((path) => `匹配路径 ${path}`),
        ...(textMatched ? ['标题或说明与需求一致'] : []),
      ],
    },
  }))

  return {
    query: q,
    resolved: { ...resolved, paths, facets },
    items,
    humanFallback: items.length === 0
      ? {
          kind: LoopKind.HUMAN,
          title: q ? `发布人回：${q.slice(0, 40)}` : '发布一个人回',
          description: q,
          paths,
          facets,
          requiresConfirmation: true,
        }
      : null,
  }
}
