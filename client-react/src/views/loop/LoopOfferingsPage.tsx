import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loopApi, type LoopKind, type LoopOfferingItem } from '@/api/loop'
import { MsIcon } from '@/components/ui/ms-icon'
import { cn } from '@/lib/utils'

/** 大众分区文案；禁止暴露 EARTH/HEAVEN/HUMAN */
const KIND_SECTION: Record<LoopKind, { key: LoopKind; label: string; order: number }> = {
  EARTH: { key: 'EARTH', label: '立即使用', order: 0 },
  HEAVEN: { key: 'HEAVEN', label: '系统自动', order: 1 },
  HUMAN: { key: 'HUMAN', label: '找人帮忙', order: 2 },
}

const HEALTH_LABEL: Record<string, string> = {
  ONLINE: '在线',
  DEGRADED: '降级',
  OFFLINE: '离线',
  UNKNOWN: '未知',
}

/** 行内能力链后缀：展示闭环位置，不是商品简介 */
function chainSuffix(code: string, summary: string | null): string {
  if (code.includes('demand.structure') || code.includes('structure')) return '口语 → 字段 → paths'
  if (code.includes('demand.paths') || (code.includes('.paths') && !code.includes('validate')))
    return '字段 → 检索路径 → 曝光'
  if (code.includes('card_cover')) return '需求 → 封面 → 展示'
  if (code.includes('media.normalize')) return '附件 → 标准化 → 审核'
  if (code.includes('validate.demand_fields')) return '字段 → 合规校验 → 结论'
  if (code.includes('validate.paths')) return 'paths → codec 校验 → 结论'
  if (code.includes('attachment_safety')) return '附件 → 安全扫描 → 结论'
  if (code.includes('order_wallet')) return '订单 → 钱包对账 → 结论'
  if (code.includes('endpoint_ping') || code.includes('health')) return '接口 → ping → 健康'
  if (summary) return summary.length > 42 ? `${summary.slice(0, 42)}…` : summary
  return '触发 → 执行 → 闭环'
}

function iconFor(code: string): string {
  if (code.includes('structure')) return 'schema'
  if (code.includes('paths') && !code.includes('validate')) return 'route'
  if (code.includes('cover')) return 'image'
  if (code.includes('media') || code.includes('attachment')) return 'attach_file'
  if (code.includes('validate') || code.includes('wallet')) return 'verified'
  if (code.includes('health') || code.includes('ping')) return 'monitor_heart'
  return 'memory'
}

function statusClass(health: string | null | undefined): string {
  if (health === 'DEGRADED') return 'is-degraded'
  if (health === 'OFFLINE') return 'is-offline'
  return ''
}

type FilterKind = '' | LoopKind

const FILTERS: { value: FilterKind; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'EARTH', label: '立即使用' },
  { value: 'HEAVEN', label: '系统自动' },
  { value: 'HUMAN', label: '找人帮忙' },
]

function ServiceRow({
  item,
  onOpen,
}: {
  item: LoopOfferingItem
  onOpen: () => void
}) {
  const healthKey = item.endpoint?.healthStatus ?? 'UNKNOWN'
  const healthText = HEALTH_LABEL[healthKey] ?? HEALTH_LABEL.UNKNOWN
  const dealPct =
    item.dealRate != null ? `${Math.round(item.dealRate * 100)}%` : '—'
  const successPct =
    item.recentTotalN > 0
      ? `${Math.round((item.recentSuccessN / item.recentTotalN) * 100)}%`
      : '—'
  const duration =
    item.avgDurationMs == null
      ? '—'
      : item.avgDurationMs < 1000
        ? `${item.avgDurationMs}ms`
        : `${(item.avgDurationMs / 1000).toFixed(1)}s`

  return (
    <button type="button" className="loop-svc-row" onClick={onOpen}>
      <span className="loop-svc-row__icon" aria-hidden>
        <MsIcon name={iconFor(item.definitionCode)} />
      </span>
      <span className="loop-svc-row__main">
        <span className="loop-svc-row__title">{item.title}</span>
        <span className="loop-svc-row__chain">{chainSuffix(item.definitionCode, item.summary)}</span>
      </span>
      <span className="loop-svc-row__metrics" aria-label="指标">
        <span className="loop-svc-metric">
          <span className="loop-svc-metric__k">成交率</span>
          <span className="loop-svc-metric__v">{dealPct}</span>
        </span>
        <span className="loop-svc-metric">
          <span className="loop-svc-metric__k">成功率</span>
          <span className="loop-svc-metric__v">{successPct}</span>
        </span>
        <span className="loop-svc-metric">
          <span className="loop-svc-metric__k">耗时</span>
          <span className="loop-svc-metric__v">{duration}</span>
        </span>
        <span className="loop-svc-metric">
          <span className="loop-svc-metric__k">样本</span>
          <span className="loop-svc-metric__v">{item.recentTotalN || '—'}</span>
        </span>
      </span>
      <span className={cn('loop-svc-row__status', statusClass(healthKey))}>
        <span className="loop-svc-dot" />
        {healthText}
      </span>
      <span className="loop-svc-row__go">进入 →</span>
    </button>
  )
}

export default function LoopOfferingsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<LoopOfferingItem[]>([])
  const [q, setQ] = useState('')
  const [loopKind, setLoopKind] = useState<FilterKind>('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await loopApi.listOfferings({
        q: q || undefined,
        loopKind: (loopKind || undefined) as LoopKind | undefined,
        limit: 60,
      })
      setItems(rows)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [q, loopKind])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  const groups = useMemo(() => {
    const map = new Map<LoopKind, LoopOfferingItem[]>()
    for (const it of items) {
      const list = map.get(it.loopKind) ?? []
      list.push(it)
      map.set(it.loopKind, list)
    }
    return Array.from(map.entries())
      .map(([kind, rows]) => ({
        ...KIND_SECTION[kind],
        rows,
      }))
      .sort((a, b) => a.order - b.order)
  }, [items])

  const emptyHint = q.trim().length > 0

  return (
    <div className="loop-svc-root">
      <main className="loop-svc-shell">
        <header className="loop-svc-list-head">
          <h1>找服务</h1>
          <p>平台内置能力；用于需求结构化、路径生成与合规校验。</p>
        </header>

        <div className="loop-svc-toolbar">
          <div className="loop-svc-search">
            <MsIcon name="search" className="loop-svc-search__icon" />
            <input
              className="loop-svc-search__input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') load()
              }}
              placeholder="搜索能力，如 路径、结构化、校验…"
              aria-label="搜索能力"
            />
          </div>
          <div className="loop-svc-segs" role="tablist" aria-label="类型筛选">
            {FILTERS.map((f) => (
              <button
                key={f.value || 'all'}
                type="button"
                role="tab"
                aria-selected={loopKind === f.value}
                className={cn('loop-svc-seg', loopKind === f.value && 'is-active')}
                onClick={() => setLoopKind(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loop-svc-empty">加载中…</div>
        ) : items.length === 0 ? (
          <div className="loop-svc-empty-panel">
            <p className="loop-svc-empty-panel__title">
              {emptyHint ? '没有匹配的平台能力' : '暂无可用方案'}
            </p>
            <p className="loop-svc-empty-panel__body">
              {emptyHint
                ? `「${q.trim()}」通常是业务需求关键词，不是内置工具名。可以去路径检索找人或需求，或直接发布一条需求。`
                : '管理员可执行 seed-builtins 写入内置能力。'}
            </p>
            {emptyHint && (
              <div className="loop-svc-empty-panel__actions">
                <button type="button" onClick={() => navigate('/path-search')}>
                  路径检索
                </button>
                <button type="button" onClick={() => navigate('/demands/create')}>
                  发布需求
                </button>
              </div>
            )}
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.key} className="loop-svc-group">
              <h2 className="loop-svc-group__label">{g.label}</h2>
              <div className="loop-svc-rows">
                {g.rows.map((it) => (
                  <ServiceRow
                    key={it.id}
                    item={it}
                    onOpen={() => navigate(`/services/${it.id}`)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <div className="loop-svc-foot">
        <span className="loop-svc-foot__id">
          CAPABILITY_DOCK / {items.length} OFFERINGS
        </span>
      </div>
    </div>
  )
}
