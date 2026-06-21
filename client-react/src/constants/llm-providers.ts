import type { AgentProvider, LlmProviderId } from '@/api/agent'

/** 提供商显示名 */
export const LLM_PROVIDER_LABELS: Record<LlmProviderId, string> = {
  minimax: 'MiniMax',
  deepseek: 'DeepSeek',
  qwen: '通义千问',
}

export interface ComposerModelOption {
  id: string
  name: string
  short: string
  provider: LlmProviderId
}

const MODEL_META: Record<
  string,
  { name: string; short: string; provider: LlmProviderId }
> = {
  'MiniMax-M2.5': { name: 'MiniMax M2.5', short: 'M2.5', provider: 'minimax' },
  'MiniMax-M2.7-highspeed': {
    name: 'MiniMax M2.7',
    short: 'M2.7',
    provider: 'minimax',
  },
  'deepseek-chat': {
    name: 'DeepSeek Chat',
    short: 'Chat',
    provider: 'deepseek',
  },
  'deepseek-v4-pro': {
    name: 'DeepSeek V4 Pro',
    short: 'V4 Pro',
    provider: 'deepseek',
  },
  'deepseek-v4-flash': {
    name: 'DeepSeek V4 Flash',
    short: 'V4 Flash',
    provider: 'deepseek',
  },
  'qwen3.7-plus': {
    name: 'Qwen 3.7 Plus',
    short: '3.7 Plus',
    provider: 'qwen',
  },
}

/** 无 API 时的兜底列表（开发离线） */
export const FALLBACK_COMPOSER_MODELS: ComposerModelOption[] = [
  { id: 'qwen3.7-plus', name: 'Qwen 3.7 Plus', short: '3.7 Plus', provider: 'qwen' },
  { id: 'MiniMax-M2.5', name: 'MiniMax M2.5', short: 'M2.5', provider: 'minimax' },
  { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', short: 'V4 Flash', provider: 'deepseek' },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', short: 'V4 Pro', provider: 'deepseek' },
]

function metaFor(modelId: string, provider: LlmProviderId): Omit<ComposerModelOption, 'id'> {
  const known = MODEL_META[modelId]
  if (known) return known
  const short =
    modelId.length > 14 ? `${modelId.slice(0, 12)}…` : modelId
  return { name: modelId, short, provider }
}

/** 从 /api/agent/provider 构建 Composer 模型列表（仅已配置 Key 的提供商） */
export function inferProviderFromModelId(modelId: string): LlmProviderId {
  const known = MODEL_META[modelId]
  if (known) return known.provider
  const m = modelId.toLowerCase()
  if (m.startsWith('deepseek')) return 'deepseek'
  if (m.startsWith('qwen')) return 'qwen'
  return 'minimax'
}

/** 与 Composer 列表对齐的默认模型（避免 AI_PROVIDER 与 AI_MODEL 错配） */
export function resolveDefaultComposerModelId(
  info: AgentProvider,
  models: ComposerModelOption[],
): string {
  if (!models.length) return info.model
  const fromProvider = info.providers[info.provider]?.defaultModel
  if (fromProvider && models.some((m) => m.id === fromProvider)) {
    return fromProvider
  }
  if (models.some((m) => m.id === info.model)) {
    return info.model
  }
  return models[0]!.id
}

export function formatComposerModelLabel(model: ComposerModelOption): string {
  return `${LLM_PROVIDER_LABELS[model.provider]} · ${model.name}`
}

export function buildComposerModels(info: AgentProvider): ComposerModelOption[] {
  const providerOrder: LlmProviderId[] = [
    info.provider,
    'minimax',
    'deepseek',
    'qwen',
  ].filter((id, i, arr) => arr.indexOf(id) === i) as LlmProviderId[]

  const seen = new Set<string>()
  const result: ComposerModelOption[] = []

  for (const pid of providerOrder) {
    const p = info.providers[pid]
    if (!p?.configured) continue
    for (const modelId of [p.defaultModel, p.thinkModel, p.fastModel]) {
      if (!modelId || seen.has(modelId)) continue
      seen.add(modelId)
      result.push({ id: modelId, ...metaFor(modelId, pid) })
    }
  }

  if (result.length === 0 && info.model) {
    result.push({
      id: info.model,
      ...metaFor(info.model, info.provider),
    })
  }

  return result
}

export function formatActiveLlmLabel(
  info: AgentProvider,
  modelId?: string,
): string {
  const models = buildComposerModels(info)
  const id = modelId ?? resolveDefaultComposerModelId(info, models)
  const fromList = models.find((m) => m.id === id)
  if (fromList) return formatComposerModelLabel(fromList)
  const meta = MODEL_META[id]
  if (meta) {
    return `${LLM_PROVIDER_LABELS[meta.provider]} · ${meta.name}`
  }
  const provider = inferProviderFromModelId(id)
  return `${LLM_PROVIDER_LABELS[provider]} · ${id}`
}
