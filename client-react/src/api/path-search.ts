import api from './index'
import type {
  IntentMatchMode,
  PathMatchMode,
  PathSortMode,
  ResolveStatus,
} from '@/constants/path-search'

export type PathSearchItem = {
  id: string
  title: string
  minPrice: number
  category: string
  tagName: string | null
  serviceType: string
  applicantCount: number
  createdAt: string
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

export type PathSearchMeta = {
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

export type PathSearchResult = {
  items: PathSearchItem[]
  total: number
  page: number
  limit: number
  totalPages: number
  coverage: Record<string, number>
  meta: PathSearchMeta
}

export type PathResolveResult = {
  paths: string[]
  facets: string[]
  segments: string[]
  primarySegments: string[]
  intentPaths: string[]
  unresolvedSegments: string[]
  /** 受控扩展产生的排除路径（如 打车 排除 出租车/包车） */
  excludePaths: string[]
  /** miss/partial 时推荐的近似路径 */
  suggestions: string[]
  status: ResolveStatus
}

export const pathSearchApi = {
  resolve(q: string) {
    return api.get<{ data: PathResolveResult }>('/path-search/resolve', {
      params: { q },
    })
  },
  search(params: {
    paths: string[]
    facets?: string[]
    q?: string
    page?: number
    limit?: number
    stage?: 'active' | 'completed'
    match?: PathMatchMode
    minHit?: number
    intentMatch?: IntentMatchMode
    sort?: PathSortMode
    excludePaths?: string[]
  }) {
    return api.get<{ data: PathSearchResult }>('/path-search', {
      params: {
        paths: params.paths.join(','),
        facets: params.facets?.length ? params.facets.join(',') : undefined,
        q: params.q,
        page: params.page,
        limit: params.limit,
        stage: params.stage,
        match: params.match,
        minHit: params.match === 'custom' ? params.minHit : undefined,
        intentMatch: params.intentMatch,
        sort: params.sort,
        excludePaths: params.excludePaths?.length ? params.excludePaths.join(',') : undefined,
      },
    })
  },
  coverage(paths: string[], stage?: 'active' | 'completed', facets?: string[]) {
    return api.get<{ data: { coverage: Record<string, number> } }>('/path-search/coverage', {
      params: {
        paths: paths.join(','),
        facets: facets?.length ? facets.join(',') : undefined,
        stage,
      },
    })
  },
  getDemandPaths(demandId: string) {
    return api.get<{
      data: {
        demandId: string
        paths: string[]
        autoPaths: string[]
        pathsEditedAt: string | null
      }
    }>(`/demands/${demandId}/paths`)
  },
  updateDemandPaths(demandId: string, paths: string[]) {
    return api.put<{ data: { id: string; paths: string[]; pathsEditedAt: string } }>(
      `/demands/${demandId}/paths`,
      { paths },
    )
  },
}
