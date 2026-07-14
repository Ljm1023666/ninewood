/** AI 需求分析结果（对齐 analyze-demand / analyze-demand-stream 契约） */
export interface DemandAnalyzeResult {
  title?: string | null
  summary?: string
  missingInfo?: string[]
  confidence?: string
  readyToPublish?: boolean
  suggestedKeywords?: string[]
  scopeLabels?: string[] | null
  serviceType?: string | null
  budget?: string | null
  schedule?: string | null
  category?: string | null
  taxonomyLeafId?: string | null
  regionId?: number | null
  expectedOutcome?: string | null
  aiTags?: string[]
}

function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null
  return v.filter((item): item is string => typeof item === 'string')
}

/** 统一 scopePath / scopeLabels 等字段漂移 */
export function normalizeAnalyzePayload(
  raw: Record<string, unknown>,
): DemandAnalyzeResult {
  const scopeRaw = raw.scopeLabels ?? raw.scopePath
  const regionRaw = raw.regionId
  const regionId =
    regionRaw == null || regionRaw === ''
      ? null
      : Number.isFinite(Number(regionRaw))
        ? Number(regionRaw)
        : null

  return {
    title: typeof raw.title === 'string' ? raw.title : null,
    summary: typeof raw.summary === 'string' ? raw.summary : undefined,
    missingInfo: asStringArray(raw.missingInfo) ?? undefined,
    confidence: typeof raw.confidence === 'string' ? raw.confidence : undefined,
    readyToPublish:
      typeof raw.readyToPublish === 'boolean' ? raw.readyToPublish : undefined,
    suggestedKeywords: asStringArray(raw.suggestedKeywords) ?? undefined,
    scopeLabels: asStringArray(scopeRaw),
    serviceType:
      typeof raw.serviceType === 'string' ? raw.serviceType : null,
    budget: typeof raw.budget === 'string' ? raw.budget : null,
    schedule: typeof raw.schedule === 'string' ? raw.schedule : null,
    category: typeof raw.category === 'string' ? raw.category : null,
    taxonomyLeafId:
      typeof raw.taxonomyLeafId === 'string' ? raw.taxonomyLeafId : null,
    regionId,
    expectedOutcome:
      typeof raw.expectedOutcome === 'string' ? raw.expectedOutcome : null,
    aiTags: asStringArray(raw.aiTags) ?? undefined,
  }
}
