import { type ReactNode, type KeyboardEvent, type RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { BackButton } from '@/components/ui/back-button'
import { MsIcon } from '@/components/ui/ms-icon'
import { ListItemCard } from '@/components/ui/list-item-card'
import { useUserStore } from '@/stores/user'

/** 内部页统一宽度（对齐 Stitch max-w-4xl = 896px） */
const WIDTH_CLASS = {
  narrow: 'max-w-[672px]',
  medium: 'max-w-[896px]',
  wide: 'max-w-[896px]',
  full: 'max-w-[1152px]',
  /** A 类设置页 Stitch PRO Settings */
  settings: 'max-w-[1000px]',
  /** G 类个人主页：桌面宽栏 */
  profile: 'max-w-[1000px] w-full',
  /** Help 页面跳转 Navigation Matrix（Stitch 1440） */
  matrix: 'max-w-[1440px] w-full mx-auto',
} as const

export type InternalWidth = keyof typeof WIDTH_CLASS

/** Achromatic 内部页滚动壳层 */
export function InternalPageShell({
  children,
  width = 'medium',
  className,
  contentClassName,
  flush,
  containerRef,
}: {
  children: ReactNode
  width?: InternalWidth
  className?: string
  contentClassName?: string
  /** 无水平内边距（双栏/全幅页自用） */
  flush?: boolean
  /** 滚动容器 ref（无限列表等需要 scroll root 时使用） */
  containerRef?: RefObject<HTMLDivElement | null>
}) {
  return (
    <div
      ref={containerRef}
      className={cn(
        'internal-shell relative flex h-full min-h-full w-full min-w-0 flex-col items-center overflow-y-auto thin-scroll',
        className,
      )}
    >
      <div
        className={cn(
          'internal-shell__column relative z-10 flex w-full flex-col',
          WIDTH_CLASS[width],
          flush ? 'px-0 py-0' : 'internal-shell__column',
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** 主内容区内 48px 节奏分区（筛选 / 列表等） */
export function InternalContentBlock({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex w-full flex-col gap-[var(--internal-rhythm)]', className)}>
      {children}
    </div>
  )
}

/** 10px mono 分区标签 */
export function SectionLabel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        'mb-2 font-mono text-xs font-medium uppercase tracking-[0.12em] text-text-muted',
        className,
      )}
    >
      {children}
    </p>
  )
}

/** inset 分组容器 */
export function GroupedSection({
  label,
  children,
  className,
}: {
  label?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('mb-6', className)}>
      {label ? <SectionLabel>{label}</SectionLabel> : null}
      <div className="internal-group overflow-hidden rounded-[var(--internal-radius)] border border-[var(--internal-border)] bg-[var(--internal-card)]">
        {children}
      </div>
    </section>
  )
}

/** 分组行：48px 韵律，发丝线分隔 */
export function GroupedRow({
  children,
  onClick,
  className,
  showChevron,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  showChevron?: boolean
}) {
  const interactive = !!onClick
  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={cn(
        'internal-group__row flex min-h-12 items-center gap-3 border-b border-white/[0.06] px-4 py-3 last:border-b-0',
        interactive &&
          'cursor-pointer transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]',
        className,
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {showChevron ? (
        <MsIcon
          name="chevron_right"
          size={16}
          className="shrink-0 text-text-muted opacity-60"
        />
      ) : null}
    </div>
  )
}

export type SegmentedOption<T extends string> = { value: T; label: string }

/** 矩形分段筛选（Orders / MyDemands 等） */
export function SegmentedFilter<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div
      className={cn('internal-segmented', className)}
      role="tablist"
    >
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'internal-segmented__tab',
              active && 'internal-segmented__tab--active',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: '待确认',
  IN_PROGRESS: '服务中',
  WAITING_REVIEW: '待验收',
  COMPLETED: '已完成',
  DISPUTED: '争议中',
  ACTIVE: '发布中',
  FROZEN: '已冻结',
  CLOSED: '已关闭',
  WITHDRAWN: '已撤回',
  ACCEPTED: '已通过',
  REJECTED: '已拒绝',
}

const ORDER_STATUS_CLASS: Record<string, string> = {
  COMPLETED:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
  DISPUTED: 'border-error/30 bg-error/10 text-error',
  IN_PROGRESS:
    'border-amber-500/30 bg-amber-500/10 text-amber-600',
  WAITING_REVIEW:
    'border-amber-500/25 bg-amber-500/10 text-amber-600',
  PENDING:
    'border-[var(--internal-accent)]/30 bg-[var(--internal-accent)]/10 text-[var(--internal-accent)]',
  ACTIVE:
    'border-[var(--internal-accent)]/30 bg-[var(--internal-accent)]/10 text-[var(--internal-accent)]',
  FROZEN: 'border-error/30 bg-error/10 text-error',
  CLOSED:
    'border-[var(--internal-hairline)] bg-[var(--internal-hover)] text-text-muted',
  WITHDRAWN:
    'border-[var(--internal-hairline)] bg-[var(--internal-hover)] text-text-muted',
  ACCEPTED:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
  REJECTED: 'border-error/30 bg-error/10 text-error',
}

/** 语义状态徽章（边框矩形，非药丸） */
export function StatusChip({
  label,
  status,
  className,
}: {
  label?: string
  /** 订单状态码；与 label 二选一 */
  status?: string
  className?: string
}) {
  const text =
    label ?? (status ? ORDER_STATUS_LABEL[status] : '') ?? status ?? ''
  const theme =
    (status && ORDER_STATUS_CLASS[status]) ||
    'border-border text-text-muted bg-bg-secondary/50'

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-[6px] border px-2 py-1 font-mono text-xs font-medium',
        theme,
        className,
      )}
    >
      {text}
    </span>
  )
}

/** 法律/静态文档排版 */
export function ProseDocument({
  title,
  updated,
  children,
  showBack = true,
}: {
  title: string
  updated?: string
  children: ReactNode
  showBack?: boolean
}) {
  return (
    <article className="internal-prose">
      {showBack ? (
        <div className="mb-4">
          <BackButton compact />
        </div>
      ) : null}
      <header className="mb-8 border-b border-[var(--internal-hairline)] pb-6">
        <SectionLabel>法律文档</SectionLabel>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {title}
        </h1>
        {updated ? (
          <p className="mt-2 font-mono text-xs text-text-muted">{updated}</p>
        ) : null}
      </header>
      <div className="internal-prose__body space-y-5 text-base leading-relaxed text-text-secondary">
        {children}
      </div>
    </article>
  )
}

/** 内部页搜索框 */
export function InternalSearchField({
  value,
  onChange,
  onSubmit,
  placeholder,
  trailing,
  className,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit?: () => void
  placeholder?: string
  trailing?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
        placeholder={placeholder}
        className="internal-search h-11 min-w-0 flex-1 rounded-lg border border-[var(--internal-hairline)] bg-transparent px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-[var(--internal-accent)] focus:bg-white/[0.03]"
      />
      {trailing}
    </div>
  )
}

export function orderStatusLabel(status: string) {
  return ORDER_STATUS_LABEL[status] || status
}

/** Stitch 分区标题（ACCOUNT / APPEARANCE） */
export function InternalSection({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('internal-settings-section', className)}>
      <h2 className="internal-settings-section__label">{label}</h2>
      {children}
    </section>
  )
}

/** A 类：发丝线面板容器 */
export function SettingsPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('settings-panel', className)}>{children}</div>
}

/** A 类：设置行（标题 + 描述 + 右侧控件） */
export function SettingsRow({
  label,
  description,
  children,
  className,
  last,
}: {
  label: string
  description?: string
  children?: ReactNode
  className?: string
  /** 最后一行无底部分隔线 */
  last?: boolean
}) {
  return (
    <div
      className={cn('settings-row', last && 'settings-row--last', className)}
    >
      <div className="settings-row__meta">
        <p className="settings-row__label">{label}</p>
        {description ? (
          <p className="settings-row__desc">{description}</p>
        ) : null}
      </div>
      {children ? (
        <div className="settings-row__control">{children}</div>
      ) : null}
    </div>
  )
}

/** A 类：可点击导航行 */
export function SettingsLinkRow({
  label,
  description,
  onClick,
  last,
}: {
  label: string
  description?: string
  onClick: () => void
  last?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'settings-row settings-row--interactive',
        last && 'settings-row--last',
      )}
    >
      <div className="settings-row__meta">
        <p className="settings-row__label">{label}</p>
        {description ? (
          <p className="settings-row__desc">{description}</p>
        ) : null}
      </div>
      <MsIcon name="chevron_right" size={16} className="shrink-0 text-[#5A5A5A]" />
    </button>
  )
}

/** A 类：14px 方形开关（Stitch NOTIFICATIONS） */
export function SettingsToggle({
  label,
  description,
  checked,
  onChange,
  last,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  last?: boolean
}) {
  return (
    <label
      className={cn(
        'settings-row settings-row--interactive cursor-pointer',
        last && 'settings-row--last',
      )}
    >
      <div className="settings-row__meta">
        <p className="settings-row__label">{label}</p>
        {description ? (
          <p className="settings-row__desc">{description}</p>
        ) : null}
      </div>
      <div
        className={cn(
          'settings-toggle',
          checked && 'settings-toggle--on',
        )}
      >
        <input
          type="checkbox"
          className="settings-toggle__input"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        {checked ? (
          <MsIcon name="check" size={10} className="text-white" />
        ) : null}
      </div>
    </label>
  )
}

/** A 类：外观分段（OLED / 浅色，Stitch APPEARANCE 风格） */
export function AppearanceSegment<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="settings-appearance-segment" role="group">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'settings-appearance-segment__btn',
              active && 'settings-appearance-segment__btn--active',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/** A 类：面板内输入框 */
export function SettingsInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className,
}: {
  value: string
  onChange: (v: string) => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={cn('settings-input', className)}
    />
  )
}

export type SettingsProSection =
  | 'account'
  | 'appearance'
  | 'notifications'
  | 'tags'

const SETTINGS_PRO_NAV: {
  id: SettingsProSection
  label: string
  path: string
  icon: string
}[] = [
  { id: 'account', label: '账户', path: '/settings', icon: 'person' },
  { id: 'appearance', label: '外观', path: '/settings', icon: 'contrast' },
  { id: 'notifications', label: '通知', path: '/push-settings', icon: 'notifications' },
  { id: 'tags', label: '标签', path: '/my-tags-manage', icon: 'sell' },
]

/** Stitch PRO Settings：200px 侧栏 + 主内容区 */
export function SettingsProShell({
  children,
  active,
  className,
  title,
}: {
  children: ReactNode
  active: SettingsProSection
  className?: string
  /** 主区顶栏标题；默认「设置」 */
  title?: string
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useUserStore((s) => s.user)

  return (
    <div className={cn('settings-pro internal-shell', className)}>
      <aside className="settings-pro-sidebar" aria-label="设置导航">
        <div className="settings-pro-sidebar__brand">
          <h1 className="settings-pro-sidebar__title">NINEWOOD</h1>
          <p className="settings-pro-sidebar__subtitle">PRO SETTINGS</p>
        </div>

        <ul className="settings-pro-sidebar__nav">
          {SETTINGS_PRO_NAV.map((item) => {
            const isActive =
              item.id === active ||
              (item.path === location.pathname &&
                item.id === 'account' &&
                active === 'account')
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'settings-pro-sidebar__link',
                    isActive && 'settings-pro-sidebar__link--active',
                  )}
                >
                  <MsIcon name={item.icon} size={16} className="shrink-0" />
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="settings-pro-sidebar__profile">
          <div className="settings-pro-sidebar__avatar">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" />
            ) : (
              <span>{(user?.nickname || '?')[0]}</span>
            )}
          </div>
        </div>
      </aside>

      <div className="settings-pro-main thin-scroll">
        <div className="settings-pro-main__inner">
          <header className="settings-pro-main__header internal-page-header">
            <BackButton onBack={() => navigate(-1)} compact />
            <h1 className="internal-display-title ml-4">{title ?? '设置'}</h1>
          </header>
          {children}
        </div>
      </div>
    </div>
  )
}

/** Stitch 账户区左侧说明列 */
export function SettingsSectionIntro({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="settings-section-intro">
      <p className="settings-section-intro__title">{title}</p>
      {description ? (
        <p className="settings-section-intro__desc">{description}</p>
      ) : null}
    </div>
  )
}

/** Stitch 账户卡片（头像 + 凭证 + 操作） */
export function SettingsAccountCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('settings-account-card', className)}>{children}</div>
  )
}

/** A 类：mono 边框按钮 */
export function SettingsActionButton({
  children,
  onClick,
  variant = 'default',
  disabled,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'default' | 'danger' | 'primary'
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'settings-action-btn',
        variant === 'danger' && 'settings-action-btn--danger',
        variant === 'primary' && 'settings-action-btn--primary',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Stitch stat-card：指标/摘要卡片 */
export function InternalStatCard({
  icon,
  title,
  description,
  label,
  value,
  hint,
  className,
}: {
  icon?: ReactNode
  title?: string
  description?: string
  label?: string
  value?: ReactNode
  hint?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'border border-[var(--internal-hairline)] bg-[var(--internal-panel-bg)] p-5',
        className,
      )}
    >
      {icon ? <div className="text-[var(--internal-accent)]">{icon}</div> : null}
      {label ? (
        <p className="font-mono text-xs text-text-muted">{label}</p>
      ) : null}
      {title ? (
        <h3 className="mt-3 font-semibold text-text-primary">{title}</h3>
      ) : null}
      {value ? (
        <p className="mt-2 text-2xl font-semibold tabular-nums text-text-primary">
          {value}
        </p>
      ) : null}
      {description ? (
        <p className="mt-2 text-sm text-text-muted">{description}</p>
      ) : null}
      {hint ? (
        <p className="mt-2 text-xs text-[var(--internal-accent)]">{hint}</p>
      ) : null}
    </div>
  )
}

/** 搜索/服务者列表行 — 对齐 Stitch list-card */
export function SearchResultRow({
  title,
  meta,
  badge,
  avatar,
  avatarFallback,
  onClick,
  className,
}: {
  title: string
  meta?: string
  badge?: string
  avatar?: ReactNode
  avatarFallback?: string
  onClick?: () => void
  className?: string
}) {
  return (
    <ListItemCard
      variant="internal"
      onClick={onClick}
      className={cn('p-4', className)}
    >
      <div className="relative z-[1] flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden border border-[var(--internal-hairline)] bg-[var(--internal-surface)] font-mono text-sm text-text-primary">
          {avatar ?? avatarFallback?.charAt(0) ?? '?'}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-text-primary">{title}</h3>
          {meta ? (
            <p className="mt-1 font-mono text-xs text-text-muted">{meta}</p>
          ) : null}
        </div>
        {badge ? (
          <StatusChip
            label={badge}
            className="border-[var(--internal-hairline)] bg-white/[0.03] text-text-muted uppercase"
          />
        ) : null}
      </div>
    </ListItemCard>
  )
}

/** B 类交易列表行 — 像素对齐 Stitch Orders */
export function TransactionListItem({
  title,
  status,
  date,
  price,
  onClick,
  completed = false,
}: {
  title: string
  status?: string
  date?: string
  price: string | number
  onClick?: () => void
  /** 已完成等弱化态 */
  completed?: boolean
}) {
  const priceText =
    typeof price === 'number' ? price.toLocaleString('zh-CN') : price

  return (
    <ListItemCard variant="internal" onClick={onClick} className="p-4">
      <div className="relative z-[1] flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <h2
            className={cn(
              'min-w-0 flex-1 text-lg font-semibold leading-snug tracking-wide text-text-primary',
              completed && 'opacity-80',
            )}
          >
            {title}
          </h2>
          {status ? (
            <StatusChip status={status} className="mt-0.5 shrink-0" />
          ) : null}
        </div>
        <div
          className={cn(
            'flex items-center justify-between gap-4',
            completed && 'opacity-80',
          )}
        >
          {date ? (
            <span className="flex items-center gap-1 text-sm text-text-secondary">
              <MsIcon name="calendar_today" size={16} className="opacity-70" />
              {date}
            </span>
          ) : (
            <span />
          )}
          <span
            className={cn(
              'font-mono text-lg font-semibold',
              completed ? 'text-text-primary' : 'text-[var(--internal-accent)]',
            )}
          >
            ¥{priceText}
          </span>
        </div>
      </div>
    </ListItemCard>
  )
}
