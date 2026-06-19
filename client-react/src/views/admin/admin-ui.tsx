import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

/* ── 工具函数 ── */

export function formatMonthLabel(key: string) {
  const parts = key.split('-')
  if (parts.length >= 2) return `${Number(parts[1])}月`
  return key
}

export function formatCurrency(value: number) {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
}

export function formatCompact(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return value.toLocaleString('zh-CN')
}

/* ── 图表主题（克制配色） ── */

export const ADMIN_CHART_COLORS = [
  '#3388FF',
  '#111111',
  '#71717A',
  '#A1A1AA',
  '#D4D4D8',
  '#E4E4E7',
]

export const adminChartGrid = { stroke: 'var(--admin-hairline)', strokeDasharray: '3 3' }

export const adminChartAxis = {
  tick: { fill: '#9A9A9A', fontSize: 11, fontFamily: 'var(--admin-mono)' },
  axisLine: false as const,
  tickLine: false as const,
}

export const adminChartTooltipStyle = {
  background: '#fff',
  border: '1px solid var(--admin-hairline)',
  borderRadius: 4,
  fontSize: 12,
  fontFamily: 'var(--admin-mono)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
}

/* ── 指标网格（发丝线连接） ── */

export function AdminMetricGrid({
  children,
  cols = 6,
  className,
}: {
  children: React.ReactNode
  cols?: 3 | 4 | 6
  className?: string
}) {
  const colClass =
    cols === 6
      ? 'grid-cols-6'
      : cols === 4
        ? 'grid-cols-4'
        : 'grid-cols-3'
  return (
    <div
      className={cn(
        'grid gap-px border border-[var(--admin-hairline)] bg-[var(--admin-hairline)]',
        colClass,
        className,
      )}
    >
      {children}
    </div>
  )
}

interface MetricTileProps {
  label: string
  value: number | string
  hint?: string
  delta?: string
}

export function AdminMetricTile({ label, value, hint, delta }: MetricTileProps) {
  return (
    <div className="min-h-24 bg-[var(--admin-card-bg)] px-[18px] py-5">
      <p className="font-[family-name:var(--admin-mono)] text-[10px] uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-[28px] font-medium leading-none tracking-[-0.03em] tabular-nums text-[var(--admin-text)]">
        {typeof value === 'number' ? value.toLocaleString('zh-CN') : value}
      </p>
      {(hint || delta) && (
        <p className="mt-2 font-[family-name:var(--admin-mono)] text-[10px] text-[var(--admin-text-muted)]">
          {delta && <span className="text-[var(--admin-accent)]">{delta}</span>}
          {delta && hint && ' · '}
          {hint}
        </p>
      )}
    </div>
  )
}

/** 兼容旧调用，内部使用 AdminMetricTile */
export function AdminMetricCard({
  label,
  value,
  hint,
}: {
  icon?: LucideIcon
  label: string
  value: number | string
  hint?: string
  accent?: string
  className?: string
}) {
  return <AdminMetricTile label={label} value={value} hint={hint} />
}

/* ── 面板容器 ── */

interface PanelProps {
  id?: string
  title: string
  description?: string
  sectionLabel?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  noPadding?: boolean
}

export function AdminPanel({
  id,
  title,
  description,
  sectionLabel,
  action,
  children,
  className,
  bodyClassName,
  noPadding,
}: PanelProps) {
  return (
    <section id={id} className={cn('bg-[var(--admin-card-bg)]', className)}>
      {sectionLabel && (
        <p className="mb-4 font-[family-name:var(--admin-mono)] text-[10px] uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
          {sectionLabel}
        </p>
      )}
      <div className="border border-[var(--admin-hairline)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--admin-hairline)] px-5 py-4">
          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--admin-text)]">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">
                {description}
              </p>
            )}
          </div>
          {action}
        </div>
        <div className={cn(!noPadding && 'p-5', bodyClassName)}>{children}</div>
      </div>
    </section>
  )
}

/* ── 图表网格（2fr + 1fr） ── */

export function AdminChartGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-px border border-[var(--admin-hairline)] bg-[var(--admin-hairline)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function AdminChartCell({
  children,
  className,
  span = 1,
  id,
}: {
  children: React.ReactNode
  className?: string
  span?: 1 | 2 | 3
  id?: string
}) {
  const spanClass =
    span === 2 ? 'col-span-2' : span === 3 ? 'col-span-3' : 'col-span-1'
  return (
    <div
      id={id}
      className={cn(
        'min-h-[280px] bg-[var(--admin-card-bg)] p-5',
        spanClass,
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ── 子导航 ── */

export function AdminSubNav({
  items,
  activeId,
  onSelect,
}: {
  items: { id: string; label: string }[]
  activeId: string
  onSelect: (id: string) => void
}) {
  if (items.length === 0) return null
  return (
    <nav className="admin-subnav">
      {items.map((item) => {
        const active = activeId === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn('admin-subnav__btn', active && 'is-active')}
          >
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

/* ── 状态标签（Mono） ── */

export function AdminStatusBadge({
  label,
  status,
}: {
  label: string
  status?: string
}) {
  const accent =
    status === 'COMPLETED'
      ? 'text-[var(--admin-accent-green)]'
      : status === 'WAITING_REVIEW' || status === 'PENDING'
        ? 'text-[var(--admin-accent)]'
        : ''
  return (
    <span
      className={cn(
        'inline-flex border border-[var(--admin-hairline)] px-2 py-0.5 font-[family-name:var(--admin-mono)] text-[10px] tracking-[0.04em] text-[var(--admin-text-secondary)]',
        accent,
      )}
    >
      {label}
    </span>
  )
}

/* ── 列表行 ── */

export function AdminListRow({
  icon: Icon,
  title,
  meta,
  trailing,
  badge,
}: {
  icon?: LucideIcon
  title: string
  meta?: string
  trailing?: React.ReactNode
  badge?: React.ReactNode
}) {
  return (
    <div className="grid min-h-12 grid-cols-[40px_1fr_auto_auto] items-center gap-4 border-b border-[var(--admin-hairline)] px-4 py-3 transition-colors duration-150 last:border-b-0 hover:bg-black/[0.02]">
      <div className="flex size-8 items-center justify-center border border-[var(--admin-hairline)] text-[var(--admin-text-muted)]">
        {Icon && <Icon className="size-3.5" strokeWidth={1.75} />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--admin-text)]">
          {title}
        </p>
        {meta && (
          <p className="mt-0.5 truncate text-xs text-[var(--admin-text-muted)]">
            {meta}
          </p>
        )}
      </div>
      {trailing && (
        <span className="font-[family-name:var(--admin-mono)] text-[13px] tabular-nums text-[var(--admin-text)]">
          {trailing}
        </span>
      )}
      {badge}
    </div>
  )
}

export function AdminList({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-[var(--admin-hairline)] bg-[var(--admin-card-bg)]">
      {children}
    </div>
  )
}

/* ── 搜索框 ── */

export function AdminSearchInput({
  placeholder = '搜索…',
  className,
}: {
  placeholder?: string
  className?: string
}) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      className={cn(
        'w-full max-w-[360px] border border-[var(--admin-hairline)] bg-[var(--admin-card-bg)] px-3.5 py-2.5 text-sm text-[var(--admin-text)] outline-none transition-[border-color] duration-150 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]',
        className,
      )}
    />
  )
}

/* ── 空态 / 错误态 ── */

export function AdminEmpty({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-medium text-[var(--admin-text)]">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
          {description}
        </p>
      )}
    </div>
  )
}

export function AdminComingSoon() {
  return (
    <AdminEmpty title="功能开发中" description="该模块正在建设，敬请期待" />
  )
}

export function AdminErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex h-full min-h-[480px] items-center justify-center">
      <div className="w-full max-w-sm border border-[var(--admin-hairline)] bg-[var(--admin-card-bg)] px-8 py-12 text-center">
        <p className="mb-4 text-sm text-[var(--admin-text-secondary)]">
          {message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="border border-[var(--admin-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--admin-text)] transition-colors duration-150 hover:bg-black/[0.02]"
        >
          重试
        </button>
      </div>
    </div>
  )
}

/* ── 骨架屏 ── */

export function AdminMetricSkeleton({ count = 4 }: { count?: number }) {
  const colClass =
    count === 6 ? 'grid-cols-6' : count === 3 ? 'grid-cols-3' : 'grid-cols-4'
  return (
    <div
      className={cn(
        'grid gap-px border border-[var(--admin-hairline)] bg-[var(--admin-hairline)]',
        colClass,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse min-h-24 bg-[var(--admin-card-bg)] px-[18px] py-5"
        >
          <div className="mb-3 h-2.5 w-16 bg-zinc-200" />
          <div className="h-8 w-20 bg-zinc-200" />
        </div>
      ))}
    </div>
  )
}

export function AdminPanelSkeleton({
  height = 'h-[280px]',
}: {
  height?: string
}) {
  return (
    <div
      className={cn(
        'animate-pulse border border-[var(--admin-hairline)] bg-[var(--admin-card-bg)] p-5',
        height,
      )}
    >
      <div className="mb-4 h-4 w-28 bg-zinc-200" />
      <div className="h-[calc(100%-2rem)] bg-zinc-100" />
    </div>
  )
}
