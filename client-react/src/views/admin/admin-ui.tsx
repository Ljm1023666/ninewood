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
  '#2563EB',
  '#111113',
  '#4B5563',
  '#9CA3AF',
  '#D1D5DB',
  '#E5E7EB',
]

export const adminChartGrid = { stroke: 'var(--admin-hairline)', strokeDasharray: '3 3' }

export const adminChartAxis = {
  tick: { fill: '#6B7280', fontSize: 11, fontFamily: 'var(--admin-mono)' },
  axisLine: false as const,
  tickLine: false as const,
}

export const adminChartTooltipStyle = {
  background: '#fff',
  border: '1px solid var(--admin-hairline)',
  borderRadius: 'var(--admin-radius-sm)',
  fontSize: 12,
  fontFamily: 'var(--admin-mono)',
  boxShadow: 'var(--admin-shadow-md)',
}

/* ── 指标网格（卡片间隙布局） ── */

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
        'grid gap-4',
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
    <div className="group relative min-h-24 overflow-hidden rounded-[var(--admin-radius-sm)] border border-[var(--admin-hairline)] bg-[var(--admin-card-bg)] px-[18px] py-5 shadow-[var(--admin-shadow-sm)] transition-[box-shadow,transform,border-color] duration-[var(--admin-duration)] hover:border-[var(--admin-border)] hover:shadow-[var(--admin-shadow-md)] hover:-translate-y-0.5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--admin-accent)] to-transparent opacity-0 transition-opacity duration-[var(--admin-duration)] group-hover:opacity-100" />
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
      <div className="overflow-hidden rounded-[var(--admin-radius)] border border-[var(--admin-hairline)] bg-[var(--admin-card-bg)] shadow-[var(--admin-shadow-sm)] transition-shadow duration-[var(--admin-duration)] hover:shadow-[var(--admin-shadow-md)]">
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

/* ── 图表网格（卡片间隙布局） ── */

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
        'grid grid-cols-3 gap-4',
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
        'min-h-[280px] overflow-hidden rounded-[var(--admin-radius)] border border-[var(--admin-hairline)] bg-[var(--admin-card-bg)] p-5 shadow-[var(--admin-shadow-sm)] transition-[box-shadow,transform] duration-[var(--admin-duration)] hover:shadow-[var(--admin-shadow-md)] hover:-translate-y-0.5',
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
      ? 'text-[var(--admin-accent-green)] bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.18)]'
      : status === 'WAITING_REVIEW' || status === 'PENDING'
        ? 'text-[var(--admin-accent)] bg-[rgba(37,99,235,0.08)] border-[rgba(37,99,235,0.18)]'
        : ''
  return (
    <span
      className={cn(
        'inline-flex rounded-full border border-[var(--admin-hairline)] px-2.5 py-1 font-[family-name:var(--admin-mono)] text-[10px] tracking-[0.04em] text-[var(--admin-text-secondary)] transition-colors duration-[var(--admin-duration)]',
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
    <div className="grid min-h-12 grid-cols-[40px_1fr_auto_auto] items-center gap-4 border-b border-[var(--admin-hairline)] px-4 py-3 transition-colors duration-[var(--admin-duration)] last:rounded-b-[var(--admin-radius)] last:border-b-0 hover:bg-black/[0.02]">
      <div className="flex size-8 items-center justify-center rounded-[var(--admin-radius-xs)] border border-[var(--admin-hairline)] text-[var(--admin-text-muted)] transition-colors duration-[var(--admin-duration)] group-hover:border-[var(--admin-border)]">
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
    <div className="overflow-hidden rounded-b-[var(--admin-radius)] border border-[var(--admin-hairline)] border-t-0 bg-[var(--admin-card-bg)]">
      {children}
    </div>
  )
}

/* ── 搜索框 ── */

export function AdminSearchInput({
  placeholder = '搜索…',
  className,
  ...inputProps
}: {
  placeholder?: string
  className?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      className={cn(
        'w-full max-w-[360px] rounded-[var(--admin-radius-xs)] border border-[var(--admin-hairline)] bg-[var(--admin-card-bg)] px-3.5 py-2.5 text-sm text-[var(--admin-text)] outline-none shadow-[var(--admin-shadow-sm)] transition-[border-color,box-shadow] duration-[var(--admin-duration)] placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]',
        className,
      )}
      {...inputProps}
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
      <div className="w-full max-w-sm overflow-hidden rounded-[var(--admin-radius)] border border-[var(--admin-hairline)] bg-[var(--admin-card-bg)] px-8 py-12 text-center shadow-[var(--admin-shadow-md)]">
        <p className="mb-4 text-sm text-[var(--admin-text-secondary)]">
          {message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-[var(--admin-radius-xs)] border border-[var(--admin-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--admin-text)] shadow-[var(--admin-shadow-sm)] transition-all duration-[var(--admin-duration)] hover:bg-black/[0.02] hover:shadow-[var(--admin-shadow-md)] hover:-translate-y-0.5 active:translate-y-0"
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
        'grid gap-4',
        colClass,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse min-h-24 overflow-hidden rounded-[var(--admin-radius-sm)] border border-[var(--admin-hairline)] bg-[var(--admin-card-bg)] px-[18px] py-5 shadow-[var(--admin-shadow-sm)]"
        >
          <div className="mb-3 h-2.5 w-16 rounded bg-zinc-200" />
          <div className="h-8 w-20 rounded bg-zinc-200" />
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
        'animate-pulse overflow-hidden rounded-[var(--admin-radius)] border border-[var(--admin-hairline)] bg-[var(--admin-card-bg)] p-5 shadow-[var(--admin-shadow-sm)]',
        height,
      )}
    >
      <div className="mb-4 h-4 w-28 rounded bg-zinc-200" />
      <div className="h-[calc(100%-2rem)] rounded bg-zinc-100" />
    </div>
  )
}
