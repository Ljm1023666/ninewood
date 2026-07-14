import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MsIcon } from '@/components/ui/ms-icon'
import { pathSearchApi, type PathSearchItem, type PathSearchMeta, type PathResolveResult } from '@/api/path-search'
import {
  PATH_QUERY_MAX,
  DEFAULT_INTENT_MATCH,
  DEFAULT_PATH_MATCH,
  DEFAULT_PATH_SORT,
  clampMatchForPathCount,
  formatPathDisplay,
  parseExcludePathsParam,
  parseIntentMatchParam,
  parseMatchParam,
  parseMinHitParam,
  parseSearchUrlInputs,
  parseSortParam,
  RESOLVE_STATUS_HINT,
  RESOLVE_STATUS_LABEL,
  serializeExcludePathsParam,
  serializeFacetsParam,
  serializePathsParam,
  type IntentMatchMode,
  type PathMatchMode,
  type PathSortMode,
  type ResolveStatus,
} from '@/constants/path-search'
import { cn } from '@/lib/utils'
import { pathFromUserKeyword } from '@/utils/extract-query-paths'
import { dedupeStable, isFacetPath, normalizeValue, parsePath } from '@/utils/path-codec'
import { toast } from '@/components/ui/confirm-dialog'
import { AuroraBackdrop } from './AuroraBackdrop'
import { PathSearchControls } from './PathSearchControls'
import { PathSearchResultCard } from './PathSearchResultCard'
import { PathDualLabel } from './PathDualLabel'
import {
  entryHasIntent,
  groupPathsForDisplay,
  pathType,
  pathValue,
} from '@/utils/path-display'

function chipDotTitle(entry: { dualKwTag: boolean; paths: string[] }, intent: boolean): string {
  if (entry.dualKwTag) return '关键词 · 标签（同值双路径）'
  if (intent) return '意图路径'
  const t = pathType(entry.paths[0])
  if (t === 'cat' || t === 'tx') return '分类路径'
  return '语义路径（标签 / 关键词）'
}

function tagHitTitle(entry: { dualKwTag: boolean }, intent: boolean): string {
  if (entry.dualKwTag) return '双态命中：关键词与标签同时命中'
  if (intent) return '意图命中'
  return '普通命中'
}

function chipColor(p: string, intent: boolean, dualKwTag?: boolean): string {
  if (dualKwTag) return 'linear-gradient(135deg, #c4c8d4 50%, var(--gold) 50%)'
  if (intent) return 'var(--gold)'
  const t = p.slice(0, Math.max(0, p.indexOf(':')))
  if (t === 'tx' || t === 'cat') return 'var(--cyan)'
  return 'var(--violet-soft)'
}

const DUAL_SWATCH = 'linear-gradient(to bottom right, #c8ccd8 0 50%, var(--gold) 50% 100%)'

const LEGEND_DOTS: { swatch: string; title: string; desc: string }[] = [
  { swatch: 'var(--gold)', title: '意图路径', desc: '来自你搜索词的核心意图，优先级最高' },
  { swatch: 'var(--cyan)', title: '分类路径', desc: '品类 / 分类树（cat、tx）' },
  { swatch: 'var(--violet-soft)', title: '语义路径', desc: '标签与关键词（tag、kw）' },
  { swatch: 'var(--muted-border)', title: '筛选条件', desc: '属性 / 预算 / 地区（attr、bkt、rgn），不参与命中计分' },
  { swatch: DUAL_SWATCH, title: '关键词 + 标签', desc: '同一个词既是关键词又是标签（左银·关键词，右金·标签）' },
]

const LEGEND_ICONS: { icon: string; icClass: string; title: string; desc: string }[] = [
  { icon: 'bolt', icClass: 'psa-legend__ic--gold', title: '意图命中', desc: '命中了，且属于你的意图路径' },
  { icon: 'check_circle', icClass: 'psa-legend__ic--cyan', title: '普通命中', desc: '命中了，但不是意图路径' },
  { icon: 'style', icClass: 'psa-tag__icon--kw-tag', title: '双态命中', desc: '关键词与标签同时命中（金银卡片）' },
  { icon: 'remove_circle_outline', icClass: 'psa-legend__ic--mute', title: '意图未命中', desc: '属于意图路径，但这条需求没挂上' },
]

function LegendSwatch({ swatch }: { swatch: string }) {
  return <span className="psa-legend__dot" style={{ background: swatch }} />
}

function LegendIcon({ icon, icClass }: { icon: string; icClass: string }) {
  return <MsIcon name={icon} size={16} className={cn('psa-legend__ic', icClass)} />
}

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    const dur = 900
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <b>{display}</b>
}

type SearchOpts = {
  q: string
  paths: string[]
  facets: string[]
  excludePaths: string[]
  match: PathMatchMode
  minHit: number
  intentMatch: IntentMatchMode
  sort: PathSortMode
  page: number
}

function buildSearchParams(opts: SearchOpts): URLSearchParams {
  const next = new URLSearchParams()
  if (opts.q.trim()) next.set('q', opts.q.trim())
  if (opts.paths.length > 0) next.set('paths', serializePathsParam(opts.paths))
  if (opts.facets.length > 0) next.set('facets', serializeFacetsParam(opts.facets))
  const exc = serializeExcludePathsParam(opts.excludePaths)
  if (exc) next.set('excludePaths', exc)
  if (opts.match !== DEFAULT_PATH_MATCH) next.set('match', opts.match)
  if (opts.match === 'custom') next.set('minHit', String(opts.minHit))
  if (opts.intentMatch !== DEFAULT_INTENT_MATCH) next.set('intentMatch', opts.intentMatch)
  if (opts.sort !== DEFAULT_PATH_SORT) next.set('sort', opts.sort)
  if (opts.page > 1) next.set('page', String(opts.page))
  return next
}

export default function PathSearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const qParam = searchParams.get('q') ?? ''
  const { scoringPaths: queryPaths, facets: queryFacets } = useMemo(
    () => parseSearchUrlInputs(searchParams.get('paths'), searchParams.get('facets')),
    [searchParams],
  )
  const matchParam = parseMatchParam(searchParams.get('match'))
  const minHitParam = parseMinHitParam(searchParams.get('minHit'), queryPaths.length || 8)
  const intentMatchParam = parseIntentMatchParam(searchParams.get('intentMatch'))
  const sortParam = parseSortParam(searchParams.get('sort'))
  const pageParam = Math.max(1, Number(searchParams.get('page')) || 1)
  const excludeParam = useMemo(() => parseExcludePathsParam(searchParams.get('excludePaths')), [searchParams])

  const [query, setQuery] = useState(qParam)
  const [addKw, setAddKw] = useState('')
  const [items, setItems] = useState<PathSearchItem[]>([])
  const [meta, setMeta] = useState<PathSearchMeta | null>(null)
  const [coverage, setCoverage] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [addingKw, setAddingKw] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)
  const legendRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(queryPaths.length > 0)
  /** 最近一次解析的状态/建议（仅 handleSearch 设置，URL 驱动重载时为 null） */
  const [resolveStatus, setResolveStatus] = useState<ResolveStatus | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const gridRef = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(false)

  const intentPaths = useMemo(() => meta?.intentPaths ?? [], [meta?.intentPaths])
  const intentSet = useMemo(() => new Set(intentPaths), [intentPaths])
  const queryPathGroups = useMemo(() => groupPathsForDisplay(queryPaths), [queryPaths])
  const intentPathGroups = useMemo(() => groupPathsForDisplay(intentPaths), [intentPaths])
  const maxIntent = useMemo(
    () => (items.length ? Math.max(...items.map((i) => i.intentHitCount)) : 0),
    [items],
  )

  const syncUrl = useCallback(
    (opts: Partial<SearchOpts> & { paths?: string[]; facets?: string[]; q?: string; excludePaths?: string[] }, resetPage = false) => {
      const paths = opts.paths ?? queryPaths
      const facets = opts.facets ?? queryFacets
      const excludePaths = opts.excludePaths ?? excludeParam
      const clamped = clampMatchForPathCount(
        opts.match ?? matchParam,
        opts.minHit ?? minHitParam,
        paths.length,
      )
      const next = buildSearchParams({
        q: opts.q ?? qParam,
        paths,
        facets,
        excludePaths,
        match: clamped.match,
        minHit: clamped.minHit,
        intentMatch: opts.intentMatch ?? intentMatchParam,
        sort: opts.sort ?? sortParam,
        page: resetPage ? 1 : (opts.page ?? pageParam),
      })
      setSearchParams(next, { replace: true })
    },
    [queryPaths, queryFacets, excludeParam, matchParam, minHitParam, intentMatchParam, sortParam, pageParam, qParam, setSearchParams],
  )

  const runSearch = useCallback(async () => {
    if (queryPaths.length === 0) {
      setItems([])
      setMeta(null)
      setCoverage({})
      setTotal(0)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await pathSearchApi.search({
        paths: queryPaths,
        facets: queryFacets,
        excludePaths: excludeParam,
        q: qParam || undefined,
        page: pageParam,
        limit: 20,
        match: matchParam,
        minHit: minHitParam,
        intentMatch: intentMatchParam,
        sort: sortParam,
      })
      const data = res.data?.data
      if (!data || !Array.isArray(data.items) || !data.meta) {
        throw new Error('检索服务返回的数据不完整')
      }
      setItems(data.items)
      setMeta(data.meta)
      setCoverage(data.coverage ?? {})
      setTotal(Number.isFinite(data.total) ? data.total : data.items.length)
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } }; code?: string; message?: string }
      const msg =
        ax.response?.data?.message ??
        (ax.code === 'ECONNABORTED' || ax.message?.includes('Network Error')
          ? '无法连接后端，请确认已运行 npm run dev'
          : '检索失败')
      setError(msg)
      setItems([])
      setMeta(null)
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [queryPaths, queryFacets, excludeParam, qParam, pageParam, matchParam, minHitParam, intentMatchParam, sortParam])

  useEffect(() => {
    setQuery(qParam)
  }, [qParam])

  useEffect(() => {
    if (!legendOpen) return
    const onDown = (e: MouseEvent) => {
      if (legendRef.current && !legendRef.current.contains(e.target as Node)) {
        setLegendOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLegendOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [legendOpen])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void runSearch()
    }, 200)
    return () => window.clearTimeout(t)
  }, [runSearch])

  // 空间不足（窄栏）时进入 compact：侧栏默认收纳、展开互斥
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    if (typeof ResizeObserver === 'undefined') {
      const updateCompact = () => setCompact(window.innerWidth < 900)
      updateCompact()
      window.addEventListener('resize', updateCompact)
      return () => window.removeEventListener('resize', updateCompact)
    }
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      setCompact(w > 0 && w < 900)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [searched, queryPaths.length])

  useEffect(() => {
    if (compact) {
      setLeftOpen(false)
      setRightOpen(false)
    } else {
      setLeftOpen(true)
    }
  }, [compact])

  const toggleLeft = useCallback(() => {
    const next = !leftOpen
    setLeftOpen(next)
    if (compact && next) setRightOpen(false)
  }, [compact, leftOpen])

  const toggleRight = useCallback(() => {
    const next = !rightOpen
    setRightOpen(next)
    if (compact && next) setLeftOpen(false)
  }, [compact, rightOpen])

  const handleSearch = async (overrideQ?: string) => {
    const q = (overrideQ ?? query).trim()
    if (!q) return
    if (overrideQ) setQuery(overrideQ)
    setResolving(true)
    setError(null)
    try {
      const res = await pathSearchApi.resolve(q)
      const data: PathResolveResult = res.data.data
      const { paths, facets, unresolvedSegments, excludePaths, suggestions, status } = data
      setResolveStatus(status)
      setSuggestions(suggestions ?? [])
      if (paths.length === 0) {
        const hint =
          unresolvedSegments?.length > 0
            ? `「${unresolvedSegments.join('」「')}」未在池中找到路径`
            : '未在需求池中找到可匹配路径'
        toast(`${hint}，可换词或手动补充关键词`, 'error')
        syncUrl({ q, paths: [], facets: facets ?? [], excludePaths: excludePaths ?? [] }, true)
        setSearched(false)
        return
      }
      if (unresolvedSegments?.length > 0) {
        toast(`「${unresolvedSegments.join('」「')}」未挂上路径，已按其余条件检索`, 'info')
      }
      setSearched(true)
      syncUrl(
        {
          q,
          paths,
          facets: facets ?? [],
          excludePaths: excludePaths ?? [],
          match: DEFAULT_PATH_MATCH,
          minHit: 1,
          intentMatch: DEFAULT_INTENT_MATCH,
          sort: DEFAULT_PATH_SORT,
          page: 1,
        },
        true,
      )
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } }
      toast(ax.response?.data?.message ?? '路径解析失败', 'error')
    } finally {
      setResolving(false)
    }
  }

  const handleClear = () => {
    setQuery('')
    setAddKw('')
    setSearched(false)
    setResolveStatus(null)
    setSuggestions([])
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const removePath = (pathsToRemove: string[]) => {
    const drop = new Set(pathsToRemove)
    syncUrl({ paths: queryPaths.filter((x) => !drop.has(x)), q: query }, true)
  }

  const commitExtraPaths = (rawPaths: string[]) => {
    const additions = dedupeStable(rawPaths).filter((p) => !queryPaths.includes(p))
    if (additions.length === 0) {
      setAddKw('')
      return
    }
    const room = PATH_QUERY_MAX - queryPaths.length
    if (room <= 0) {
      toast(`最多 ${PATH_QUERY_MAX} 条路径`, 'error')
      return
    }
    const finalAdd = additions.slice(0, room)
    setSearched(true)
    syncUrl({ paths: [...queryPaths, ...finalAdd], q: query }, true)
    setAddKw('')
  }

  const addExtraPath = async () => {
    const kw = addKw.trim()
    if (!kw) return
    if (queryPaths.length >= PATH_QUERY_MAX) {
      toast(`最多 ${PATH_QUERY_MAX} 条路径`, 'error')
      return
    }

    // 显式前缀（如 tag:react、cat:设计）：尊重用户意图，直接按该类型加入
    const explicit = parsePath(kw)
    if (explicit) {
      if (isFacetPath(explicit.raw)) {
        toast('属性 / 预算 / 地区请在右侧「筛选条件」中设置', 'error')
        return
      }
      commitExtraPaths([explicit.raw])
      return
    }

    // 裸词：走池内词表解析，由后端判定为关键词 / 标签 / 两者兼有（金银分割态）
    setAddingKw(true)
    try {
      const res = await pathSearchApi.resolve(kw)
      const target = normalizeValue(kw)
      const exact = res.data.data.paths.filter(
        (p) =>
          pathValue(p) === target && (pathType(p) === 'kw' || pathType(p) === 'tag'),
      )
      if (exact.length > 0) {
        commitExtraPaths(exact)
        return
      }
    } catch {
      // 解析失败时回退为本地关键词
    } finally {
      setAddingKw(false)
    }

    // 池内无对应标签/关键词或解析失败：回退为关键词（银色）
    const fallback = pathFromUserKeyword(kw)
    if (!fallback) {
      toast('关键词无效', 'error')
      return
    }
    commitExtraPaths([fallback])
  }

  const relaxFilters = () => {
    syncUrl(
      {
        match: 'any',
        minHit: 1,
        intentMatch: 'off',
        facets: [],
        page: 1,
      },
      true,
    )
  }

  const busy = loading || resolving
  const hasResults = searched && queryPaths.length > 0
  const filterStrict =
    matchParam !== 'any' ||
    intentMatchParam !== 'off' ||
    sortParam !== DEFAULT_PATH_SORT ||
    queryFacets.length > 0
  const facetGroups = useMemo(() => queryFacets.map((f) => ({ raw: f, label: formatPathDisplay(f) })), [queryFacets])

  return (
    <div className="psa-root thin-scroll">
      <AuroraBackdrop />

      <div className="psa-shell">
        <div className="psa-hero">
          <div className="psa-kicker psa-mono psa-rise psa-d2">
            路径解析 · 交叉命中 · 可筛选排序
          </div>
          <h1 className="psa-title psa-rise psa-d2">路径检索</h1>
          <div className="psa-subtitle psa-mono psa-rise psa-d3">
            输入即搜 · 顺藤摸瓜匹配池内真实路径 · 支持缩小结果集与切换排序
          </div>

          <div className="psa-legend-entry psa-rise psa-d3">
            <button
              type="button"
              className="psa-legend-btn"
              onClick={() => setLegendOpen(true)}
              aria-haspopup="dialog"
            >
              <MsIcon name="info" size={16} />
              颜色与图标说明
            </button>
          </div>

          <div className="psa-searchwrap psa-rise psa-d3">
            <div className="psa-search">
              <MsIcon name="search" size={24} className="psa-search__lead" />
              <input
                className="psa-search__input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
                placeholder="输入需求关键词，如 家政、技术开发、线上"
                spellCheck={false}
              />
              {searched ? (
                <button
                  type="button"
                  className="psa-search__clear"
                  onClick={handleClear}
                  aria-label="清空"
                >
                  <MsIcon name="close" size={18} />
                </button>
              ) : null}
              <button
                type="button"
                className="psa-search__go"
                onClick={() => void handleSearch()}
                disabled={busy || !query.trim()}
                aria-label="搜索"
              >
                <MsIcon name={busy ? 'progress_activity' : 'arrow_forward'} size={22} />
              </button>
            </div>
          </div>
        </div>

        {hasResults ? (
          <div className="psa-statline psa-mono psa-rise psa-d4">
            解析出 <b>{queryPaths.length}</b> 条真实路径 · 筛选后 <CountUp value={total} /> 条需求
            {intentPathGroups.length > 0 ? (
              <>
                {' · '}意图路径{' '}
                {intentPathGroups.map((entry, i) => (
                  <span key={entry.paths.join('|')}>
                    {i > 0 ? ' › ' : null}
                    <PathDualLabel value={entry.value} dualKwTag={entry.dualKwTag} />
                  </span>
                ))}
              </>
            ) : null}
            {meta ? (
              <>
                {' · '}最少命中 <b>{meta.minHitRequired}</b> 条
              </>
            ) : null}
            {queryFacets.length > 0 ? (
              <>
                {' · '}
                <b>{queryFacets.length}</b> 条硬筛选
              </>
            ) : null}
          </div>
        ) : null}

        {hasResults && (excludeParam.length > 0 || (resolveStatus === 'partial' && suggestions.length > 0)) ? (
          <div className="psa-hintbar psa-rise psa-d4">
            {excludeParam.length > 0 ? (
              <div className="psa-hintbar__row">
                <MsIcon name="filter_alt" size={15} className="psa-hintbar__ic" />
                <span>
                  已按意图排除供给类型：
                  {excludeParam.map((p, i) => (
                    <span key={p} className="psa-hintbar__chip">
                      {i > 0 ? ' · ' : null}
                      {p.slice(p.indexOf(':') + 1)}
                    </span>
                  ))}
                  （如「打车」排除 出租车/包车/租车，避免跨品类混入）
                </span>
              </div>
            ) : null}
            {resolveStatus === 'partial' && suggestions.length > 0 ? (
              <div className="psa-hintbar__row">
                <MsIcon name="lightbulb" size={15} className="psa-hintbar__ic" />
                <span>部分词未挂路径，可试试：</span>
                {suggestions.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="psa-hintbar__suggest"
                    onClick={() => void handleSearch(p.slice(p.indexOf(':') + 1))}
                  >
                    {p.slice(p.indexOf(':') + 1)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {hasResults ? (
          <div className="psa-grid" ref={gridRef} data-compact={compact || undefined}>
            <div
              className={cn('psa-slot', 'psa-slot--left', !leftOpen && 'psa-slot--rail')}
            >
              <aside
                className="psa-panel psa-slot__panel"
                aria-hidden={!leftOpen}
                inert={!leftOpen ? true : undefined}
              >
                <div className="psa-panel__pad">
                  <div className="psa-phead">
                    <MsIcon name="account_tree" size={18} className="psa-phead__icon" />
                    <h2>检索依据</h2>
                    <button
                      type="button"
                      className="psa-phead__help"
                      onClick={() => setLegendOpen(true)}
                      aria-label="查看颜色与图标说明"
                      title="颜色与图标说明"
                    >
                      <MsIcon name="help_outline" size={16} />
                    </button>
                    <button
                      type="button"
                      className="psa-phead__collapse"
                      onClick={toggleLeft}
                      aria-label="收纳检索依据"
                      title="收纳到左侧边缘"
                    >
                      <MsIcon name="chevron_left" size={18} />
                    </button>
                  </div>

                  <div className="psa-subhead psa-mono">检索路径</div>
                <div className="psa-chipcol">
                  {queryPathGroups.map((entry) => {
                    const intent = entryHasIntent(entry, intentSet)
                    return (
                      <div className="psa-chip" key={entry.paths.join('|')}>
                        <span className="psa-chip__left">
                          <span
                            className={cn('psa-chip__dot', entry.dualKwTag && 'psa-chip__dot--kw-tag')}
                            title={chipDotTitle(entry, intent)}
                            style={
                              entry.dualKwTag
                                ? undefined
                                : { background: chipColor(entry.paths[0], intent) }
                            }
                          />
                          <PathDualLabel
                            value={entry.value}
                            dualKwTag={entry.dualKwTag}
                            className="psa-chip__label"
                          />
                          {!entry.dualKwTag && coverage[entry.paths[0]] !== undefined ? (
                            <span className="psa-chip__cnt psa-mono">·{coverage[entry.paths[0]]}</span>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          className="psa-chip__x"
                          onClick={() => removePath(entry.paths)}
                          aria-label={`移除 ${entry.value}`}
                        >
                          <MsIcon name="close" size={14} />
                        </button>
                      </div>
                    )
                  })}
                  {queryPaths.length < PATH_QUERY_MAX ? (
                    <div className="psa-addchip">
                      <MsIcon
                        name={addingKw ? 'progress_activity' : 'add'}
                        size={16}
                        className={cn('psa-addchip__icon', addingKw && 'animate-spin')}
                      />
                      <input
                        value={addKw}
                        onChange={(e) => setAddKw(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && void addExtraPath()}
                        disabled={addingKw}
                        placeholder="补充依据，自动识别关键词/标签，如 对抗路、cat:设计"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="psa-subhead psa-mono">
                  筛选条件
                  <span className="psa-subhead__hint">不参与命中计分</span>
                </div>
                {facetGroups.length > 0 ? (
                  <div className="psa-chipcol psa-chipcol--facets">
                    {facetGroups.map(({ raw, label }) => (
                      <div className="psa-chip psa-chip--facet" key={raw}>
                        <span className="psa-chip__left">
                          <MsIcon name="lock" size={12} className="psa-chip__facetlock" />
                          <span className="psa-chip__label">{label}</span>
                        </span>
                        <button
                          type="button"
                          className="psa-chip__x"
                          onClick={() =>
                            syncUrl({ facets: queryFacets.filter((x) => x !== raw), q: query }, true)
                          }
                          aria-label={`移除筛选 ${label}`}
                        >
                          <MsIcon name="close" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="psa-facetempty psa-mono">在右侧设置服务方式或价格档</p>
                )}
                </div>
              </aside>
              <button
                type="button"
                className="psa-rail psa-rail--left psa-slot__rail"
                onClick={toggleLeft}
                aria-label="展开检索依据"
                title="展开检索依据"
                aria-hidden={leftOpen}
                tabIndex={leftOpen ? -1 : 0}
              >
                <MsIcon name="account_tree" size={18} className="psa-rail__icon" />
                <span className="psa-rail__text">检索依据</span>
                <MsIcon name="chevron_right" size={18} className="psa-rail__arrow" />
              </button>
            </div>

            <section className="psa-results">
              <div className="psa-rhead psa-rise psa-d4">
                <div className="psa-rhead__cap psa-mono">
                  已筛选 · 显示 <b>{items.length}</b> / {total} 条
                </div>
              </div>

              {busy && items.length === 0 ? (
                <>
                  <div className="psa-skeleton" />
                  <div className="psa-skeleton" />
                  <div className="psa-skeleton" />
                </>
              ) : null}

              {error ? (
                <div className="psa-state psa-state--error">
                  <div className="psa-state__title">连接异常</div>
                  <div className="psa-state__desc">{error}</div>
                </div>
              ) : null}

              {!busy && !error && items.length === 0 ? (
                <div className="psa-state">
                  <MsIcon name="search_off" size={40} className="psa-state__icon" />
                  <div className="psa-state__title">
                    {filterStrict ? '当前筛选条件下无匹配需求' : '无匹配需求'}
                  </div>
                  <div className="psa-state__desc">
                    {filterStrict
                      ? '可放宽命中或意图要求，或补充/删除左侧路径关键词。'
                      : '路径已挂上但暂无交叉命中的需求，可补充关键词或放宽路径。'}
                  </div>
                  {filterStrict ? (
                    <button type="button" className="psa-relaxbtn" onClick={relaxFilters}>
                      放宽为任意命中
                    </button>
                  ) : null}
                </div>
              ) : null}

              {!busy && !error && items.length > 0 ? (
                <div className="psa-timeline">
                  <div className="psa-timeline__track" aria-hidden />
                  {items.map((d, idx) => {
                    const isTop =
                      idx === 0 &&
                      intentPaths.length > 0 &&
                      d.intentHitCount === maxIntent &&
                      maxIntent > 0
                    const isDim = intentPaths.length > 0 && d.intentHitCount < maxIntent
                    return (
                      <PathSearchResultCard
                        key={d.id}
                        item={d}
                        index={idx}
                        queryPathCount={queryPaths.length}
                        intentPaths={intentPaths}
                        intentSet={intentSet}
                        isTop={isTop}
                        isDim={isDim}
                        onOpen={() => navigate(`/demands/${d.id}`)}
                        tagHitTitle={tagHitTitle}
                      />
                    )
                  })}
                </div>
              ) : null}
            </section>

            <div
              className={cn('psa-slot', 'psa-slot--right', !rightOpen && 'psa-slot--rail')}
            >
              <aside
                className="psa-siderail psa-slot__panel"
                aria-hidden={!rightOpen}
                inert={!rightOpen ? true : undefined}
              >
                <PathSearchControls
                  match={matchParam}
                  minHit={minHitParam}
                  intentMatch={intentMatchParam}
                  sort={sortParam}
                  pathCount={queryPaths.length}
                  hasQuery={!!qParam.trim()}
                  facets={queryFacets}
                  onMatchChange={(match) => syncUrl({ match, page: 1 }, true)}
                  onMinHitChange={(minHit) => syncUrl({ match: 'custom', minHit, page: 1 }, true)}
                  onIntentMatchChange={(intentMatch) => syncUrl({ intentMatch, page: 1 }, true)}
                  onSortChange={(sort) => syncUrl({ sort, page: 1 }, true)}
                  onFacetsChange={(facets) => syncUrl({ facets, page: 1 }, true)}
                  onCollapse={toggleRight}
                />
              </aside>
              <button
                type="button"
                className="psa-rail psa-rail--right psa-slot__rail"
                onClick={toggleRight}
                aria-label="展开筛选与排序"
                title="展开筛选与排序"
                aria-hidden={rightOpen}
                tabIndex={rightOpen ? -1 : 0}
              >
                <MsIcon name="chevron_left" size={18} className="psa-rail__arrow" />
                <MsIcon name="tune" size={18} className="psa-rail__icon" />
                <span className="psa-rail__text">筛选与排序</span>
              </button>
            </div>
          </div>
        ) : resolveStatus === 'miss' ? (
          <div className="psa-state psa-state--bare psa-rise psa-d4">
            <MsIcon name="search_off" size={40} className="psa-state__icon" />
            <div className="psa-state__title">
              {RESOLVE_STATUS_LABEL.miss} · {RESOLVE_STATUS_HINT.miss}
            </div>
            {suggestions.length > 0 ? (
              <div className="psa-suggest-panel">
                <div className="psa-suggest-panel__cap psa-mono">池内相近路径</div>
                <div className="psa-suggest-panel__chips">
                  {suggestions.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="psa-suggest-chip"
                      onClick={() => void handleSearch(p.slice(p.indexOf(':') + 1))}
                    >
                      {formatPathDisplay(p)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="psa-state psa-state--bare psa-rise psa-d4">
            <MsIcon name="travel_explore" size={40} className="psa-state__icon" />
            <div className="psa-state__title">输入关键词开始检索</div>
          </div>
        )}
        {legendOpen ? (
          <div
            className="psa-legend-overlay"
            role="presentation"
            onClick={() => setLegendOpen(false)}
          >
            <div
              className="psa-legend-pop"
              ref={legendRef}
              role="dialog"
              aria-label="路径检索颜色与图标说明"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="psa-legend-pop__head">
                <span>读图指南</span>
                <button
                  type="button"
                  className="psa-legend-pop__close"
                  onClick={() => setLegendOpen(false)}
                  aria-label="关闭"
                >
                  <MsIcon name="close" size={16} />
                </button>
              </div>
              <p className="psa-legend-pop__lead">
                左侧圆点表示<strong>路径类型</strong>；结果卡片图标表示
                <strong>在这条需求上的命中角色</strong>。两套颜色不要混读。
              </p>
              <div className="psa-legend-pop__sec">
                <div className="psa-legend-pop__cap">左侧 · 检索依据圆点</div>
                <ul className="psa-legend-pop__list">
                  {LEGEND_DOTS.map((row) => (
                    <li key={row.title}>
                      <LegendSwatch swatch={row.swatch} />
                      <span>
                        <b>{row.title}</b>
                        <small>{row.desc}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="psa-legend-pop__sec">
                <div className="psa-legend-pop__cap">结果卡片 · 路径图标</div>
                <ul className="psa-legend-pop__list">
                  {LEGEND_ICONS.map((row) => (
                    <li key={row.title}>
                      <LegendIcon icon={row.icon} icClass={row.icClass} />
                      <span>
                        <b>{row.title}</b>
                        <small>{row.desc}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="psa-legend-pop__foot">
                补充框可自动识别关键词 / 标签；同值双命中显示为金银分割。右侧环形图：外圈为总命中，金色圈为意图命中。
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
