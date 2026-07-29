import { useCallback, useEffect, useMemo, useState } from 'react'
import '@/styles/my-loops.css'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Activity,
  ArrowDownUp,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Columns3,
  GitBranch,
  List,
  RefreshCw,
  Users,
} from 'lucide-react'
import { loopApi, type LoopKind, type MyLoopItem, type MyLoopSummary, type HeavenCapabilityItem } from '@/api/loop'
import { LiquidMetalButton, type LiquidMetalButtonProps } from '@/components/ui/liquid-metal-button'

/** 运行中心统一硬朗直角，不用默认胶囊圆角 */
function LoopRectButton(props: LiquidMetalButtonProps) {
  return <LiquidMetalButton shape="rect" radius={0} {...props} />
}

const COLLAPSE_STORAGE_KEY = 'my-loops-section-collapsed'

type SectionKey = 'top' | 'heaven' | 'ratio' | LoopKind

function readCollapsedMap(): Partial<Record<SectionKey, boolean>> {
  try {
    const raw = localStorage.getItem(COLLAPSE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<Record<SectionKey, boolean>>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function SectionCollapseButton({
  collapsed,
  onToggle,
  label,
}: {
  collapsed: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <LoopRectButton
      type="button"
      className="my-loops-collapse"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-label={collapsed ? `展开${label}` : `收纳${label}`}
      title={collapsed ? '展开' : '收纳'}
    >
      {collapsed ? <ChevronDown size={16} aria-hidden /> : <ChevronUp size={16} aria-hidden />}
      <span>{collapsed ? '展开' : '收纳'}</span>
    </LoopRectButton>
  )
}

type DisplayMode = 'single' | 'split'
type SplitDirection = 'horizontal' | 'vertical'
type SortMode = 'recent' | 'completion' | 'success'

const ALL_KINDS: LoopKind[] = ['HUMAN', 'EARTH', 'HEAVEN']

const KIND_META: Record<LoopKind, { label: string; short: string; icon: typeof Users }> = {
  HUMAN: { label: '人回', short: '人与人协作', icon: Users },
  EARTH: { label: '地回', short: '人与接口协作', icon: GitBranch },
  HEAVEN: { label: '天回', short: '接口自动运行', icon: Bot },
}

const STATUS_LABEL: Record<string, string> = {
  TRIGGERED: '已触发',
  MATCHING: '匹配中',
  EXECUTING: '运行中',
  WAITING_HUMAN: '等待你处理',
  VERIFYING: '核验中',
  SUCCEEDED: '已成功',
  FAILED: '失败',
  INCONCLUSIVE: '待确认',
  COMPENSATING: '补偿中',
  CLOSED: '已结束',
}

const EMPTY_SUMMARY: MyLoopSummary = {
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
}

function formatTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatRate(value: number | null) {
  return value == null ? '—' : `${Math.round(value * 100)}%`
}

function parseKinds(raw: string | null): LoopKind[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is LoopKind => (ALL_KINDS as string[]).includes(s))
}

export default function MyLoopsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // 从 URL 读取初始视图状态；刷新/分享后仍可还原。
  const initialMode: DisplayMode = searchParams.get('mode') === 'single' ? 'single' : 'split'
  const initialKinds = parseKinds(searchParams.get('kinds'))
  const initialDir: SplitDirection = searchParams.get('dir') === 'vertical' ? 'vertical' : 'horizontal'
  const initialSort: SortMode = (searchParams.get('sort') as SortMode) || 'recent'
  const rawTotal = Number(searchParams.get('total'))
  const initialTotalSize = Number.isFinite(rawTotal) && rawTotal >= 50 && rawTotal <= 150 ? rawTotal : 100

  const [displayMode, setDisplayMode] = useState<DisplayMode>(initialMode)
  const [direction, setDirection] = useState<SplitDirection>(initialDir)
  const [selectedKinds, setSelectedKinds] = useState<LoopKind[]>(
    initialKinds.length ? initialKinds : ALL_KINDS,
  )
  const [sort, setSort] = useState<SortMode>(initialSort)
  const [items, setItems] = useState<MyLoopItem[]>([])
  const [summary, setSummary] = useState<MyLoopSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ratios, setRatios] = useState<Record<LoopKind, number>>({
    HUMAN: 33,
    EARTH: 34,
    HEAVEN: 33,
  })
  // 总尺寸工具：纵向控制整体高度、横向控制整体宽度，默认 100% 铺满。
  const [totalSize, setTotalSize] = useState<number>(initialTotalSize)

  // 天回（系统自动）能力看板
  const [heavenCaps, setHeavenCaps] = useState<HeavenCapabilityItem[]>([])
  const [heavenLoading, setHeavenLoading] = useState(true)
  const [heavenError, setHeavenError] = useState<string | null>(null)
  const [heavenSort, setHeavenSort] = useState<'recent' | 'success' | 'status'>('recent')
  const [collapsed, setCollapsed] = useState<Partial<Record<SectionKey, boolean>>>(readCollapsedMap)

  const isCollapsed = useCallback(
    (key: SectionKey) => Boolean(collapsed[key]),
    [collapsed],
  )

  const toggleCollapsed = useCallback((key: SectionKey) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore quota */
      }
      return next
    })
  }, [])

  // 将当前视图状态写回 URL（replace，不新增历史）。
  useEffect(() => {
    const next = new URLSearchParams()
    next.set('mode', displayMode)
    next.set('kinds', selectedKinds.join(','))
    next.set('dir', direction)
    next.set('sort', sort)
    next.set('total', String(totalSize))
    setSearchParams(next, { replace: true })
  }, [displayMode, selectedKinds, direction, sort, totalSize, setSearchParams])

  // 单区模式下 selectedKinds 只能保留一个；切换到单区时若多个则保留第一个。
  useEffect(() => {
    if (displayMode === 'single' && selectedKinds.length > 1) {
      setSelectedKinds([selectedKinds[0]])
    }
  }, [displayMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // 加载「我的回」：单区只请求当前 kind，并列请求 kinds 数组。
  const load = useCallback(
    async (quiet = false) => {
      if (selectedKinds.length === 0) {
        setItems([])
        setSummary(EMPTY_SUMMARY)
        setLoading(false)
        return
      }
      if (quiet) setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        const result =
          displayMode === 'single'
            ? await loopApi.listMyRuns({ kind: selectedKinds[0], sort, limit: 100 })
            : await loopApi.listMyRuns({ kinds: selectedKinds, sort, limit: 100 })
        setItems(result.items)
        setSummary(result.summary)
      } catch (err: any) {
        setError(err?.response?.data?.message || '回状态加载失败')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [displayMode, selectedKinds, sort],
  )

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const timer = window.setInterval(() => void load(true), 15000)
    return () => window.clearInterval(timer)
  }, [load])

  const loadHeaven = useCallback(async () => {
    setHeavenLoading(true)
    setHeavenError(null)
    try {
      const caps = await loopApi.listHeavenCapabilities()
      setHeavenCaps(caps)
    } catch (err: any) {
      setHeavenError(err?.response?.data?.message || '天回能力加载失败')
    } finally {
      setHeavenLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHeaven()
    const timer = window.setInterval(() => void loadHeaven(), 15000)
    return () => window.clearInterval(timer)
  }, [loadHeaven])

  const visibleKinds = selectedKinds

  // 当可见分区变化时，将当前 ratios 归一化到 100%，保证 flexBasis 总和正确。
  useEffect(() => {
    if (visibleKinds.length <= 1) return
    const currentTotal = visibleKinds.reduce((sum, k) => sum + ratios[k], 0)
    if (currentTotal === 0 || currentTotal === 100) return
    setRatios((current) => {
      const next = { ...current }
      visibleKinds.forEach((k) => {
        next[k] = Math.max(20, Math.round((current[k] / currentTotal) * 100))
      })
      // 修正四舍五入误差
      const actualTotal = visibleKinds.reduce((sum, k) => sum + next[k], 0)
      if (actualTotal !== 100) {
        const last = visibleKinds[visibleKinds.length - 1]
        next[last] = Math.max(
          20,
          Math.min(
            100 - 20 * (visibleKinds.length - 1),
            next[last] + (100 - actualTotal),
          ),
        )
      }
      return next
    })
  }, [visibleKinds]) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleItems = useMemo(
    () =>
      new Map<LoopKind, MyLoopItem[]>([
        ['HUMAN', items.filter((item) => item.kind === 'HUMAN')],
        ['EARTH', items.filter((item) => item.kind === 'EARTH')],
        ['HEAVEN', items.filter((item) => item.kind === 'HEAVEN')],
      ]),
    [items],
  )

  // 单区：点击 kind 即切换为唯一选中；并列：点击 kind 切换多选。
  function pickKind(kind: LoopKind) {
    if (displayMode === 'single') {
      setSelectedKinds([kind])
    } else {
      setSelectedKinds((current) => {
        if (current.includes(kind)) {
          return current.length === 1 ? current : current.filter((item) => item !== kind)
        }
        return [...current, kind]
      })
    }
  }

  function setMode(next: DisplayMode) {
    setDisplayMode(next)
  }

  // 相邻交换：拖动某滑块时，只与它直接相邻的 pane 交换空间。
  // 拖两端 → 仅影响唯一的相邻 pane；拖中间 → 同时影响左右两个相邻 pane。
  // 始终保持总和 100%、每个 pane ≥ 20%（用小数计算，避免舍入破坏总和）。
  function updateRatio(changedKind: LoopKind, rawValue: number) {
    const idx = visibleKinds.indexOf(changedKind)
    if (idx < 0) return
    const neighbors: LoopKind[] = []
    if (idx > 0) neighbors.push(visibleKinds[idx - 1])
    if (idx < visibleKinds.length - 1) neighbors.push(visibleKinds[idx + 1])
    if (neighbors.length === 0) return

    const MIN = 20
    const oldValue = ratios[changedKind]
    const maxIncrease = neighbors.reduce((sum, k) => sum + (ratios[k] - MIN), 0)
    const maxDecrease = oldValue - MIN
    const delta = Math.max(-maxDecrease, Math.min(maxIncrease, rawValue - oldValue))
    if (delta === 0) return

    const value = oldValue + delta
    const neighborSum = neighbors.reduce((sum, k) => sum + ratios[k], 0)

    setRatios((current) => {
      const next = { ...current, [changedKind]: value }
      if (delta > 0) {
        neighbors.forEach((k) => {
          const take = neighborSum > 0 ? (delta * current[k]) / neighborSum : delta / neighbors.length
          next[k] = current[k] - take
        })
      } else {
        const give = -delta
        neighbors.forEach((k) => {
          const add = neighborSum > 0 ? (give * current[k]) / neighborSum : give / neighbors.length
          next[k] = current[k] + add
        })
      }
      return next
    })
  }

  const sortedHeavenCaps = useMemo(() => {
    const list = [...heavenCaps]
    if (heavenSort === 'recent') {
      list.sort((a, b) => (b.lastRunAt ?? '').localeCompare(a.lastRunAt ?? ''))
    } else if (heavenSort === 'success') {
      const rate = (c: HeavenCapabilityItem) => (c.runCount ? c.successCount / c.runCount : 0)
      list.sort((a, b) => rate(b) - rate(a))
    } else {
      const rank = (s: string) =>
        s === 'FAILED' ? 0 : s === 'INCONCLUSIVE' ? 1 : s === 'IDLE' ? 3 : 2
      list.sort((a, b) => rank(a.status) - rank(b.status))
    }
    return list
  }, [heavenCaps, heavenSort])

  // 仅当用户选中了天回，才展示天回能力看板。
  const showHeaven = selectedKinds.includes('HEAVEN')

  // 布局类：单区直接 block；并列下 horizontal=轨在上/panes横排，vertical=轨在左/panes竖排。
  const boardLayout: 'single' | 'horizontal' | 'vertical' =
    displayMode === 'single' ? 'single' : direction

  return (
    <div className="my-loops-page">
      <div className="my-loops-shell">
      <div className={`my-loops-top${isCollapsed('top') ? ' is-collapsed' : ''}`}>
      <header className="my-loops-head">
        <div>
          <p className="my-loops-kicker">运行中心</p>
          <h1>回</h1>
          <p className="my-loops-subtitle">人回 · 地回 · 天回</p>
        </div>
        <div className="my-loops-head__actions">
          <SectionCollapseButton
            collapsed={isCollapsed('top')}
            onToggle={() => toggleCollapsed('top')}
            label="运行中心"
          />
          <LoopRectButton
            type="button"
            className="my-loops-refresh"
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'my-loops-spin' : undefined} />
            {refreshing ? '刷新中' : '刷新状态'}
          </LoopRectButton>
        </div>
      </header>

      {!isCollapsed('top') && (
        <>
      <section className="my-loops-summary" aria-label="我的回运行统计">
        <div className="my-loops-summary__all">
          <span>我的运行</span>
          <strong>{summary.total}</strong>
          <small>{summary.active} 条正在运行</small>
        </div>
        {ALL_KINDS.map((kind) => {
          const meta = KIND_META[kind]
          const Icon = meta.icon
          const bucket = summary.byKind[kind]
          const active = selectedKinds.includes(kind)
          return (
            <LoopRectButton
              type="button"
              key={kind}
              className={`my-loops-summary__kind my-loops-summary__kind--${kind.toLowerCase()} ${
                active ? 'is-active' : ''
              }`}
              onClick={() => pickKind(kind)}
              aria-pressed={active}
            >
              <span className="my-loops-summary__kind-head">
                <Icon size={18} aria-hidden />
                <span className="my-loops-summary__kind-label">{meta.label}</span>
              </span>
              <strong>{bucket.total}</strong>
              <small>{formatRate(bucket.successRate)} 成功率</small>
            </LoopRectButton>
          )
        })}
        <div className="my-loops-summary__success">
          <span>整体成功</span>
          <strong>{summary.succeeded}</strong>
          <small>{formatRate(summary.successRate)}</small>
        </div>
      </section>

      <section className="my-loops-toolbar" aria-label="视图与排序">
        <div className="my-loops-kind-picker" role="group" aria-label="选择回类型">
          {ALL_KINDS.map((kind) => {
            const checked = selectedKinds.includes(kind)
            return (
              <label
                key={kind}
                className={checked ? 'is-checked' : undefined}
                title={
                  displayMode === 'single'
                    ? '单区模式：只显示一个回类型'
                    : '并列模式：可同时显示多个回类型'
                }
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => pickKind(kind)}
                />
                <span className="my-loops-kind-picker__check">
                  {checked && <Check size={12} strokeWidth={3} />}
                </span>
                {KIND_META[kind].label}
              </label>
            )
          })}
        </div>

        <label className="my-loops-sort">
          <ArrowDownUp size={15} />
          排序
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
            <option value="recent">最近活动</option>
            <option value="completion">完成度</option>
            <option value="success">成功优先</option>
          </select>
        </label>

        <details className="my-loops-display-menu">
          <summary>显示</summary>
          <div className="my-loops-display-menu__body">
            <div className="my-loops-segment">
              <LoopRectButton
                type="button"
                className={displayMode === 'single' ? 'is-active' : undefined}
                onClick={() => setMode('single')}
                aria-pressed={displayMode === 'single'}
              >
                <List size={16} /> 单区
              </LoopRectButton>
              <LoopRectButton
                type="button"
                className={displayMode === 'split' ? 'is-active' : undefined}
                onClick={() => setMode('split')}
                aria-pressed={displayMode === 'split'}
              >
                <Columns3 size={16} /> 并列
              </LoopRectButton>
            </div>

            {displayMode === 'split' && (
              <div className="my-loops-segment">
                <LoopRectButton
                  type="button"
                  className={direction === 'horizontal' ? 'is-active' : undefined}
                  onClick={() => setDirection('horizontal')}
                  aria-pressed={direction === 'horizontal'}
                >
                  横向
                </LoopRectButton>
                <LoopRectButton
                  type="button"
                  className={direction === 'vertical' ? 'is-active' : undefined}
                  onClick={() => setDirection('vertical')}
                  aria-pressed={direction === 'vertical'}
                >
                  纵向
                </LoopRectButton>
              </div>
            )}

            <label className="my-loops-total-size" title="调节页面整体的高度或宽度，与分区占比互不干扰">
              <ArrowDownUp size={15} />
              {direction === 'horizontal' ? '总宽度' : '总高度'}
              <input
                type="range"
                min={60}
                max={120}
                value={totalSize}
                onChange={(event) => setTotalSize(Number(event.target.value))}
                aria-label="整体尺寸"
              />
              {totalSize}%
            </label>
          </div>
        </details>
      </section>
        </>
      )}
      </div>

      {error && (
        <div className="my-loops-state my-loops-state--error">
          <p>{error}</p>
          <LoopRectButton type="button" onClick={() => void load()}>
            重新加载
          </LoopRectButton>
        </div>
      )}

      {selectedKinds.length === 0 && (
        <div className="my-loops-state my-loops-state--empty">
          <Activity size={28} />
          <h2>请选择要查看的回类型</h2>
          <p>在上方勾选“人回 / 地回 / 天回”中的至少一项，对应的运行记录会出现在这里。</p>
        </div>
      )}

      {/* 平台天回能力：全站口径，勿与「我的运行」混读 */}
      {showHeaven && (
        <section
          className={`my-loops-heaven${isCollapsed('heaven') ? ' is-collapsed' : ''}`}
          aria-label="平台自动能力"
        >
          <div className="my-loops-heaven__head">
            <div>
              <h2>平台自动能力</h2>
              <p className="my-loops-subtitle">全站内置任务 · 点击查看详情</p>
            </div>
            <div className="my-loops-section-actions">
              {!isCollapsed('heaven') && (
                <label className="my-loops-sort">
                  <ArrowDownUp size={15} />
                  <select
                    value={heavenSort}
                    onChange={(event) =>
                      setHeavenSort(event.target.value as 'recent' | 'success' | 'status')
                    }
                    aria-label="排序"
                  >
                    <option value="recent">最近运行</option>
                    <option value="success">成功率优先</option>
                    <option value="status">异常优先</option>
                  </select>
                </label>
              )}
              <SectionCollapseButton
                collapsed={isCollapsed('heaven')}
                onToggle={() => toggleCollapsed('heaven')}
                label="平台自动能力"
              />
            </div>
          </div>

          {!isCollapsed('heaven') && (
            <>
              {heavenError && (
                <div className="my-loops-state my-loops-state--error">
                  <p>{heavenError}</p>
                  <LoopRectButton type="button" onClick={() => void loadHeaven()}>
                    重新加载
                  </LoopRectButton>
                </div>
              )}
              {heavenLoading && !heavenError && <div className="my-loops-state">正在读取…</div>}
              {!heavenLoading && !heavenError && heavenCaps.length === 0 && (
                <div className="my-loops-state my-loops-state--empty">
                  <Bot size={28} />
                  <h2>暂无自动能力</h2>
                  <p>种子写入后会出现在这里。</p>
                </div>
              )}
              {!heavenLoading && !heavenError && heavenCaps.length > 0 && (
                <div className="my-loops-heaven__grid">
                  {sortedHeavenCaps.map((cap) => (
                    <HeavenCapabilityCard
                      key={cap.id}
                      cap={cap}
                      onClick={() => navigate(`/loops/offerings/${cap.id}`)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {selectedKinds.length > 0 && loading && (
        <div className="my-loops-state">正在读取与你有关的回…</div>
      )}
      {selectedKinds.length > 0 && !loading && !error && summary.total === 0 && (
        <div className="my-loops-state my-loops-state--empty">
          <Activity size={28} />
          <h2>还没有可显示的回</h2>
          <p>当你发布需求、接单，或运行一个平台能力后，运行状态会出现在这里。</p>
        </div>
      )}

      {selectedKinds.length > 0 && !loading && !error && summary.total > 0 && (
        <div className={`my-loops-board my-loops-board--${boardLayout}`}>
          {displayMode === 'split' && visibleKinds.length > 1 && (
            <div
              className={`my-loops-ratio-rail my-loops-ratio-rail--${direction}${
                isCollapsed('ratio') ? ' is-collapsed' : ''
              }`}
              aria-label="显示比例"
            >
              <div className="my-loops-ratio-rail__head">
                <span className="my-loops-ratio-rail__title">显示比例</span>
                <SectionCollapseButton
                  collapsed={isCollapsed('ratio')}
                  onToggle={() => toggleCollapsed('ratio')}
                  label="显示比例"
                />
              </div>
              {!isCollapsed('ratio') &&
                visibleKinds.map((kind) => (
                  <div
                    key={kind}
                    className={`my-loops-ratio-rail__item my-loops-ratio-rail__item--${kind.toLowerCase()}`}
                  >
                    <span className="my-loops-ratio-rail__label">{KIND_META[kind].label}</span>
                    <input
                      type="range"
                      className="my-loops-ratio-input"
                      min={20}
                      max={100 - 20 * (visibleKinds.length - 1)}
                      value={ratios[kind]}
                      onChange={(event) => updateRatio(kind, Number(event.target.value))}
                      aria-label={`${KIND_META[kind].label}显示比例`}
                    />
                    <span className="my-loops-ratio-rail__pct">{Math.round(ratios[kind])}%</span>
                  </div>
                ))}
            </div>
          )}
          <div
            className="my-loops-panes"
            style={
              displayMode === 'split' && visibleKinds.length > 1
                ? direction === 'horizontal'
                  ? { width: `${totalSize}%` }
                  : { height: `${Math.round((620 * totalSize) / 100)}px` }
                : undefined
            }
          >
            {visibleKinds.map((kind) => {
              const paneCollapsed = isCollapsed(kind)
              return (
              <section
                key={kind}
                className={`my-loops-pane my-loops-pane--${kind.toLowerCase()}${
                  paneCollapsed ? ' is-collapsed' : ''
                }`}
                style={
                  displayMode === 'split' && visibleKinds.length > 1 && !paneCollapsed
                    ? {
                        flexGrow: 0,
                        flexShrink: 0,
                        flexBasis: `calc((100% - ${(visibleKinds.length - 1) * 16}px) * ${ratios[kind]} / 100)`,
                        minWidth: 0,
                        minHeight: 0,
                      }
                    : displayMode === 'split' && visibleKinds.length > 1 && paneCollapsed
                      ? {
                          flexGrow: 0,
                          flexShrink: 0,
                          flexBasis: 'auto',
                          minWidth: 0,
                          minHeight: 0,
                        }
                    : undefined
                }
              >
                <div className="my-loops-pane__head">
                  <div>
                    <span className="my-loops-pane__eyebrow">{KIND_META[kind].short}</span>
                    <h2>{KIND_META[kind].label}</h2>
                  </div>
                  <div className="my-loops-section-actions">
                    <span className="my-loops-pane__count">{visibleItems.get(kind)?.length ?? 0}</span>
                    <SectionCollapseButton
                      collapsed={paneCollapsed}
                      onToggle={() => toggleCollapsed(kind)}
                      label={KIND_META[kind].label}
                    />
                  </div>
                </div>
                {!paneCollapsed && (
                <div className="my-loops-list">
                  {(visibleItems.get(kind) ?? []).map((item) => (
                    <LoopRunCard key={item.id} item={item} onClick={() => navigate(`/loops/runs/${item.id}`)} />
                  ))}
                  {(visibleItems.get(kind) ?? []).length === 0 && (
                    <div className="my-loops-pane__empty">这个分区暂时没有运行记录。</div>
                  )}
                </div>
                )}
              </section>
              )
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

function LoopRunCard({ item, onClick }: { item: MyLoopItem; onClick: () => void }) {
  const meta = KIND_META[item.kind]
  const Icon = meta.icon
  const status = STATUS_LABEL[item.status] ?? item.status
  return (
    <article
      className="my-loops-card"
      role="link"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onClick() }}
    >
      <div className="my-loops-card__top">
        <span className="my-loops-card__icon">
          <Icon size={16} aria-hidden />
        </span>
        <div className="my-loops-card__title">
          <strong>{item.offering?.title || item.definition.name}</strong>
        </div>
        <span className={`my-loops-status my-loops-status--${item.status.toLowerCase()}`}>
          {status}
        </span>
      </div>
      <div className="my-loops-card__progress" aria-label={`完成度 ${item.progress}%`}>
        <span style={{ width: `${item.progress}%` }} />
      </div>
      <div className="my-loops-card__meta">
        <span>{item.progress}%</span>
        <span>{formatTime(item.latestEvent?.createdAt ?? item.createdAt)}</span>
      </div>
    </article>
  )
}

function HeavenCapabilityCard({
  cap,
  onClick,
}: {
  cap: HeavenCapabilityItem
  onClick: () => void
}) {
  const statusClass =
    cap.status === 'FAILED'
      ? 'failed'
      : cap.status === 'INCONCLUSIVE' || cap.status === 'IDLE'
        ? 'inconclusive'
        : cap.status === 'EXECUTING' ||
            cap.status === 'MATCHING' ||
            cap.status === 'VERIFYING' ||
            cap.status === 'WAITING_HUMAN'
          ? 'executing'
          : 'succeeded'
  return (
    <button
      type="button"
      className="my-loops-card my-loops-heaven__card"
      onClick={onClick}
    >
      <div className="my-loops-card__top">
        <span className="my-loops-card__icon">
          <Bot size={16} aria-hidden />
        </span>
        <div className="my-loops-card__title">
          <strong>{cap.title}</strong>
        </div>
        <span className={`my-loops-status my-loops-status--${statusClass}`}>{cap.stage}</span>
      </div>
      <div className="my-loops-card__meta">
        <span>{formatTime(cap.lastRunAt)}</span>
      </div>
    </button>
  )
}
