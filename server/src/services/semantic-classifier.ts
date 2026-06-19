/**
 * 语义分类器客户端
 * 调用本地的 Python FastAPI 分类服务
 */
import { getCache, setCache } from '../lib/redis.js'

const CLASSIFIER_URL = 'http://127.0.0.1:8001/classify'
const TIMEOUT_MS = 500
const REQUEST_TIMEOUT_MS = 2000

export interface SemanticMatch {
  category_id: string
  name: string
  path: string
  similarity: number
  depth: number
}

export interface SemanticClassifyResult {
  source: 'local'
  results: SemanticMatch[]
}

export interface NavigateMatch {
  name: string
  path: string
  title: string
  similarity: number
}

export interface NavigateResponse {
  source: 'local'
  match: NavigateMatch | null
  candidates: NavigateMatch[]
}

/** 调用本地语义分类器 /navigate 端点，识别页面导航意图 */
export async function semanticNavigate(text: string, threshold = 0.25): Promise<NavigateMatch | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1500)
    const res = await fetch('http://127.0.0.1:8001/navigate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, threshold }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    const data: NavigateResponse = await res.json()
    return data.match
  } catch {
    return null
  }
}

/**
 * 调用本地 GPU 语义分类器
 * 超时 500ms，超时返回空结果（自动降级）
 */
export async function semanticClassify(
  text: string,
  topK = 5,
  threshold = 0.15,
): Promise<SemanticMatch[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(CLASSIFIER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, top_k: topK, threshold }),
      signal: controller.signal,
    })
    if (!res.ok) return []
    const data: SemanticClassifyResult = await res.json()
    return data.results || []
  } catch {
    // 超时或连接失败 → 静默降级
    return []
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * 三阶段路由：GPU 语义（主） → 规则分类（备） → 关键词降级（兜底）
 */
export async function routeClassify(
  keywords: string[],
): Promise<{
  method: 'semantic' | 'rules' | 'fuzzy'
  nodeIds: string[]
  labels: string[]
}> {
  const text = keywords.join(' ')

  const cacheKey = `classify:${text}`
  const cached = await getCache<{ method: string; nodeIds: string[]; labels: string[] }>(cacheKey)
  if (cached) {
    return cached as { method: 'semantic' | 'rules' | 'fuzzy'; nodeIds: string[]; labels: string[] }
  }

  // 阶段1：GPU 语义分类（高精度，优先）
  const semanticResults = await semanticClassify(text, 10, 0.2)

  // 过滤：只保留与 AI 关键词匹配的分类（首个关键词必须匹配，其余可选）
  const filtered = semanticResults.filter(r => {
    if (keywords.length === 0) return true
    const matchTarget = (r.path + '/' + r.name).toLowerCase()
    // 首个关键词（最核心）必须匹配
    const primaryMatch = keywords[0] && matchTarget.includes(keywords[0].toLowerCase())
    if (!primaryMatch) return false
    // 其余关键词至少匹配一个
    if (keywords.length <= 1) return true
    return keywords.slice(1).some(kw => matchTarget.includes(kw.toLowerCase()))
  })

  let result: { method: 'semantic' | 'rules' | 'fuzzy'; nodeIds: string[]; labels: string[] }

  if (filtered.length >= 2) {
    const nodeIds = filtered.map(r => r.category_id)
    const labels = filtered.map(r => r.name)
    result = { method: 'semantic', nodeIds, labels }
  } else if (semanticResults.length >= 2) {
    const nodeIds = semanticResults.map(r => r.category_id)
    const labels = semanticResults.map(r => r.name)
    result = { method: 'semantic', nodeIds, labels }
  } else {
    // 阶段2：规则分类（关键词匹配）
    let rulesResult: { method: 'semantic' | 'rules' | 'fuzzy'; nodeIds: string[]; labels: string[] } | null = null
    try {
      const { classifyForSearch } = await import('../classifier.js')
      const r = classifyForSearch(keywords)
      if (r.nodeIds.length > 0) {
        rulesResult = { method: 'rules', nodeIds: r.nodeIds, labels: r.labels }
      }
    } catch {
      // 静默失败
    }
    // 阶段3：降级到 keywords 模糊搜索
    result = rulesResult || { method: 'fuzzy', nodeIds: [], labels: keywords }
  }

  setCache(cacheKey, result, 300).catch(() => {})
  return result
}
