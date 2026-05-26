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

/* ── 指标卡片 ── */

const ACCENT_MAP = {
  orange: 'bg-[var(--admin-accent-orange)]',
  blue: 'bg-[var(--admin-accent-blue)]',
  green: 'bg-[var(--admin-accent-green)]',
  red: 'bg-[var(--admin-accent-red)]',
  teal: 'bg-[var(--admin-accent-teal)]',
  zinc: 'bg-zinc-400',
} as const

export type AccentKey = keyof typeof ACCENT_MAP

interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: number | string
  hint?: string
  accent?: AccentKey
  className?: string
}

export function AdminMetricCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'orange',
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-5',
        'transition-[border-color,box-shadow] duration-200 hover:border-zinc-300 hover:shadow-sm',
        className,
      )}
    >
      <div
        className={cn('absolute inset-x-0 top-0 h-0.5', ACCENT_MAP[accent])}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-[var(--admin-text-secondary)]">
            {label}
          </p>
          <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight text-[var(--admin-text)] tabular-nums">
            {typeof value === 'number' ? value.toLocaleString('zh-CN') : value}
          </p>
          {hint && (
            <p className="mt-2 text-xs text-[var(--admin-text-muted)]">
              {hint}
            </p>
          )}
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-zinc-500 transition-colors duration-200 group-hover:bg-zinc-100">
          <Icon className="size-[18px]" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  )
}

/* ── 面板容器 ── */

interface PanelProps {
  id?: string
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}

export function AdminPanel({
  id,
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: PanelProps) {
  return (
    <section
      id={id}
      className={cn(
        'rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--admin-border)] px-5 py-4">
        <div>
          <h3 className="text-[15px] font-medium text-[var(--admin-text)]">
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
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

/* ── 状态徽章 ── */

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-blue-50 text-blue-700 ring-blue-100',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 ring-blue-100',
  WAITING_REVIEW: 'bg-orange-50 text-orange-700 ring-orange-100',
  COMPLETED: 'bg-green-50 text-green-700 ring-green-100',
  CANCELLED: 'bg-zinc-100 text-zinc-500 ring-zinc-200',
}

export function AdminStatusBadge({
  label,
  status,
}: {
  label: string
  status?: string
}) {
  const style =
    (status && STATUS_STYLES[status]) ||
    'bg-zinc-100 text-zinc-500 ring-zinc-200'
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        style,
      )}
    >
      {label}
    </span>
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
      <div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-zinc-50">
        <svg
          className="size-6 text-zinc-300"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
          />
        </svg>
      </div>
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
      <div className="w-full max-w-sm rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-8 py-12 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-xl bg-red-50">
          <svg
            className="size-6 text-red-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
        </div>
        <p className="mb-4 text-sm text-[var(--admin-text-secondary)]">
          {message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-[var(--admin-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--admin-text)] transition-colors duration-200 hover:bg-zinc-50"
        >
          重试
        </button>
      </div>
    </div>
  )
}

/* ── 骨架屏 ── */

export function AdminMetricSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className={cn('grid gap-4', count === 6 ? 'grid-cols-6' : 'grid-cols-4')}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-5"
        >
          <div className="mb-3 h-3 w-16 rounded bg-zinc-200" />
          <div className="h-8 w-24 rounded bg-zinc-200" />
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
        'animate-pulse rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-5',
        height,
      )}
    >
      <div className="mb-4 h-4 w-28 rounded bg-zinc-200" />
      <div className="h-[calc(100%-2rem)] rounded-lg bg-zinc-100" />
    </div>
  )
}
