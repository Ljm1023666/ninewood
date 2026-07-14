import api from './index'

export type LoopKind = 'HUMAN' | 'EARTH' | 'HEAVEN'
export type LoopContract = Record<string, unknown>

export type LoopVerificationSummary = {
  status: 'VERIFIED' | 'UNAVAILABLE'
  verifierCount: number
  verifiers: Array<{ id: string; code: string; name: string }>
}

/** 后端统一响应信封（axios res.data） */
type ApiEnvelope<T> = { code: number; message: string; data: T }

export type LoopOfferingItem = {
  id: string
  title: string
  summary: string | null
  loopKind: LoopKind
  definitionCode: string
  definitionName: string
  definitionDescription: string | null
  paths: string[]
  inputSchema: LoopContract
  outcomeSchema: LoopContract
  metrics: {
    dealRate: number | null
    avgDurationMs: number | null
    publicSuccessRate: number | null
    sampleSize: number | null
    successRateStatus: 'PUBLIC' | 'ADAPTING'
  }
  requiresVerification: boolean
  verification: LoopVerificationSummary
  endpoint: { healthStatus: string | null; hostMode: string | null }
}

export type LoopOfferingDetail = LoopOfferingItem & {
  internalSuccessRate?: number | null
}

export type LoopRecommendation = LoopOfferingItem & {
  executionMode: string
  match: { matchedPaths: string[]; textMatched: boolean; reasons: string[] }
}

export type LoopRecommendationResult = {
  query: string
  resolved: {
    paths: string[]
    facets: string[]
    suggestions: string[]
    status: 'hit' | 'partial' | 'miss'
  }
  items: LoopRecommendation[]
  humanFallback: null | {
    kind: 'HUMAN'
    title: string
    description: string
    paths: string[]
    facets: string[]
    requiresConfirmation: true
  }
}

export type LoopLinkSummary = {
  id: string
  relation: string
  targetRun?: { id: string; status: string; definition: { code: string; name: string; loopKind: LoopKind } }
  sourceRun?: { id: string; status: string; definition: { code: string; name: string; loopKind: LoopKind } }
}

export type LoopRunDetail = {
  id: string
  loopKind: LoopKind
  status: string
  initiatorRef: string
  receiverRef: string | null
  inputJson: Record<string, unknown>
  expectedOutcome: Record<string, unknown>
  actualOutcome: Record<string, unknown> | null
  demandId: string | null
  orderId: string | null
  startedAt: string
  completedAt: string | null
  definition: { code: string; name: string; description: string | null; executionMode: string }
  offering: { id: string; title: string; summary: string | null } | null
  events: Array<{ id: string; type: string; actorRef: string; payload: Record<string, unknown>; createdAt: string }>
  verificationRuns: Array<{ id: string; status: string; resultJson: unknown; createdAt: string; verifier: { id: string; code: string; name: string } }>
  linksOut: LoopLinkSummary[]
  linksIn: LoopLinkSummary[]
}

export type MyLoopItem = {
  id: string
  kind: LoopKind
  status: string
  progress: number
  definition: {
    code: string
    name: string
    loopKind: LoopKind
    executionMode: string
  }
  offering: { id: string; title: string } | null
  demandId: string | null
  orderId: string | null
  initiatorRef: string
  receiverRef: string | null
  startedAt: string
  completedAt: string | null
  createdAt: string
  eventCount: number
  latestEvent: {
    type: string
    payload: Record<string, unknown>
    createdAt: string
  } | null
}

export type MyLoopSummary = {
  total: number
  active: number
  succeeded: number
  failed: number
  successRate: number | null
  byKind: Record<LoopKind, {
    total: number
    active: number
    succeeded: number
    successRate: number | null
  }>
}

/** 天回（系统自动）能力运行状态项 */
export type HeavenCapabilityItem = {
  id: string
  title: string
  summary: string | null
  definitionCode: string
  trigger: string
  stage: string
  status: string
  successCount: number
  failCount: number
  runCount: number
  lastRunAt: string | null
  lastResult: string | null
  endpointHealth: string | null
}

export const loopApi = {
  async recommend(params: { q?: string; paths?: string[]; facets?: string[]; limit?: number }): Promise<LoopRecommendationResult> {
    const res = await api.get<ApiEnvelope<LoopRecommendationResult>>('/loops/recommend', {
      params: {
        q: params.q || undefined,
        paths: params.paths?.join(',') || undefined,
        facets: params.facets?.join(',') || undefined,
        limit: params.limit,
      },
    })
    return res.data.data
  },
  /** 公开检索「可用方案」（offering）。绝不返回内部成功率。 */
  async listOfferings(params: {
    q?: string
    paths?: string[]
    loopKind?: LoopKind
    limit?: number
  } = {}): Promise<LoopOfferingItem[]> {
    const res = await api.get<ApiEnvelope<LoopOfferingItem[]>>('/loops/offerings', {
      params: {
        q: params.q || undefined,
        paths: params.paths?.length ? params.paths.join(',') : undefined,
        loopKind: params.loopKind || undefined,
        limit: params.limit,
      },
    })
    const rows = res.data?.data
    return Array.isArray(rows) ? rows : []
  },

  async getOffering(id: string): Promise<LoopOfferingDetail | null> {
    const res = await api.get<ApiEnvelope<LoopOfferingDetail>>(`/loops/offerings/${id}`)
    return res.data?.data ?? null
  },

  /** 用户侧「运行此能力」：对指定需求运行，或用自由输入试跑。返回真实执行结果。 */
  async runOffering(
    id: string,
    body: { demandId?: string; input?: Record<string, unknown> },
  ): Promise<{
    runId: string
    ran: boolean
    preview: boolean
    code: string
    status: string
    outcome: Record<string, unknown>
  } | null> {
    const res = await api.post<ApiEnvelope<any>>(`/loops/offerings/${id}/run`, body)
    return res.data?.data ?? null
  },

  async getRun(id: string): Promise<LoopRunDetail> {
    const res = await api.get<ApiEnvelope<LoopRunDetail>>(`/loops/runs/${id}`)
    return res.data.data
  },

  async retryVerification(id: string): Promise<{ runId: string; status: string; verification: string }> {
    const res = await api.post<ApiEnvelope<{ runId: string; status: string; verification: string }>>(
      `/loops/runs/${id}/retry-verification`,
    )
    return res.data.data
  },

  async listMyRuns(params: {
    kind?: LoopKind
    kinds?: LoopKind[]
    status?: string
    sort?: 'recent' | 'completion' | 'success'
    limit?: number
  } = {}): Promise<{ items: MyLoopItem[]; summary: MyLoopSummary }> {
    const res = await api.get<ApiEnvelope<{ items: MyLoopItem[]; summary: MyLoopSummary }>>(
      '/loops/runs/mine',
      {
        params: {
          kind: params.kind || undefined,
          kinds: params.kinds?.length ? params.kinds.join(',') : undefined,
          status: params.status || undefined,
          sort: params.sort || 'recent',
          limit: params.limit,
        },
      },
    )
    return res.data?.data ?? {
      items: [],
      summary: {
        total: 0,
        active: 0,
        succeeded: 0,
        failed: 0,
        successRate: null,
        byKind: {
          HUMAN: { total: 0, active: 0, succeeded: 0, successRate: null },
          EARTH: { total: 0, active: 0, succeeded: 0, successRate: null },
          HEAVEN: { total: 0, active: 0, succeeded: 0, successRate: null },
        },
      },
    }
  },

  /** 天回（系统自动）能力运行状态看板；公开只读。 */
  async listHeavenCapabilities(): Promise<HeavenCapabilityItem[]> {
    const res = await api.get<ApiEnvelope<HeavenCapabilityItem[]>>('/loops/capabilities')
    const rows = res.data?.data
    return Array.isArray(rows) ? rows : []
  },
}
