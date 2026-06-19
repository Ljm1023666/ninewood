/** 首屏/发现页：精确「全部 / 线上 / 线下」走服务类型；其它文案走标题/描述关键词 */
export function parseHeroSearch(trimmed: string): {
  serviceType: 'ALL' | 'ONLINE' | 'OFFLINE'
  keyword: string
} {
  if (trimmed === '全部') return { serviceType: 'ALL', keyword: '' }
  if (trimmed === '线上') return { serviceType: 'ONLINE', keyword: '' }
  if (trimmed === '线下') return { serviceType: 'OFFLINE', keyword: '' }
  return { serviceType: 'ALL', keyword: trimmed }
}

/** 生成 `/discover` 的查询串（不含 `?`） */
export function buildDiscoverSearchQuery(trimmed: string): string {
  const p = parseHeroSearch(trimmed)
  const params = new URLSearchParams()
  if (p.keyword) params.set('q', p.keyword)
  if (p.serviceType !== 'ALL') params.set('type', p.serviceType)
  return params.toString()
}

/** 从 `/discover` 的 query 还原列表请求参数（q 走与首屏相同的「全部/线上/线下」语义） */
export function parseDiscoverUrlParams(searchParams: URLSearchParams): {
  serviceType: 'ALL' | 'ONLINE' | 'OFFLINE'
  keyword: string
  tags: string[]
  taxonomyLeafIds?: string
  exact?: boolean
} {
  const q = (searchParams.get('q') ?? '').trim()
  const t = searchParams.get('type')
  const tagsRaw = (searchParams.get('tags') ?? '').trim()
  const tags = tagsRaw
    ? tagsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []
  const leafIds = searchParams.get('leafIds') ?? undefined
  const exact = searchParams.get('exact') === 'true'
  const fromQ = parseHeroSearch(q)

  if (t === 'ONLINE' || t === 'OFFLINE') {
    return {
      serviceType: t,
      keyword: fromQ.keyword,
      tags,
      taxonomyLeafIds: leafIds,
      exact,
    }
  }
  return { ...fromQ, tags, taxonomyLeafIds: leafIds, exact }
}

export function formatDiscoverFilterHint(
  keyword: string,
  serviceType: 'ALL' | 'ONLINE' | 'OFFLINE',
  exact?: boolean,
): string {
  const mode = exact !== false ? '精确' : '模糊'
  if (serviceType === 'ALL' && !keyword) return `全部 · ${mode}`
  if (serviceType === 'ONLINE') return `线上 · ${mode}`
  if (serviceType === 'OFFLINE') return `线下 · ${mode}`
  return `关键词「${keyword}」· ${mode}`
}
