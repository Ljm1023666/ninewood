import { Router, Request, Response } from 'express'
import { optionalAuthMiddleware } from '../middleware/auth.js'
import { success, fail } from '../utils/response.js'
import {
  computePathCoverage,
  searchByPaths,
  resolveQueryToPaths,
  loadPathVocabulary,
} from '../services/path-search.js'
import { resolveIntentPaths } from '../services/path-resolver.js'
import { PathCodecError, splitQueryInputs, validateFacets, validateScoringPaths } from '../services/path-codec.js'
import { parseSearchQuery } from '../services/path-search-query.js'

export const pathSearchRouter = Router()

const qstr = (v: unknown): string | undefined => {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

function parsePathsParam(raw?: string): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** 合并 paths + facets 参数，并从 paths 中剥离 facet 类型（兼容旧 URL） */
function parseSearchPathInputs(pathsRaw?: string, facetsRaw?: string) {
  const merged = [...parsePathsParam(pathsRaw), ...parsePathsParam(facetsRaw)]
  const split = splitQueryInputs(merged)
  return {
    scoringPaths: validateScoringPaths(split.scoringPaths),
    facets: validateFacets(split.facets),
  }
}

function handlePathError(res: Response, e: unknown) {
  if (e instanceof PathCodecError) {
    return fail(res, e.message, e.status, { code: e.code })
  }
  const err = e as { status?: number; message?: string; code?: string }
  if (err.status) {
    return fail(res, err.message || '请求失败', err.status)
  }
  console.error('[path-search]', e)
  return fail(res, '路径检索失败，请稍后重试', 500)
}

// GET /api/path-search/resolve?q=家政
pathSearchRouter.get('/resolve', async (req: Request, res: Response) => {
  try {
    const q = qstr(req.query.q)
    if (!q?.trim()) {
      return fail(res, '缺少检索词 q', 400)
    }
    const result = await resolveQueryToPaths(q)
    success(res, result)
  } catch (e) {
    handlePathError(res, e)
  }
})

// GET /api/path-search?paths=tx:a,tag:react
pathSearchRouter.get('/', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { scoringPaths, facets } = parseSearchPathInputs(
      qstr(req.query.paths),
      qstr(req.query.facets),
    )
    const stage = qstr(req.query.stage) === 'completed' ? 'completed' : 'active'
    const page = req.query.page ? Number(req.query.page) : 1
    const limit = req.query.limit ? Number(req.query.limit) : 20
    const viewerUserId = (req as { user?: { userId: string } }).user?.userId
    const q = qstr(req.query.q)

    const query = parseSearchQuery({
      match: qstr(req.query.match),
      minHit: qstr(req.query.minHit),
      intentMatch: qstr(req.query.intentMatch),
      sort: qstr(req.query.sort),
      q,
      pathCount: scoringPaths.length,
    })

    let intentPaths: string[] = []
    if (q?.trim()) {
      const vocabulary = await loadPathVocabulary()
      intentPaths = resolveIntentPaths(q, vocabulary).filter((p) =>
        scoringPaths.includes(p),
      )
    }

    const result = await searchByPaths({
      paths: scoringPaths,
      facets,
      stage,
      page,
      limit,
      viewerUserId,
      intentPaths,
      excludePaths: parsePathsParam(qstr(req.query.excludePaths)),
      query,
    })
    success(res, result)
  } catch (e) {
    handlePathError(res, e)
  }
})

// GET /api/path-search/coverage?paths=...
pathSearchRouter.get('/coverage', async (req: Request, res: Response) => {
  try {
    const { scoringPaths, facets } = parseSearchPathInputs(
      qstr(req.query.paths),
      qstr(req.query.facets),
    )
    const stage = qstr(req.query.stage) === 'completed' ? 'completed' : 'active'
    const coverage = await computePathCoverage([...scoringPaths, ...facets], stage)
    success(res, { coverage })
  } catch (e) {
    handlePathError(res, e)
  }
})
