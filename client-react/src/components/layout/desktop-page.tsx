import { type ReactNode, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton } from '@/components/ui/back-button'
import { MsIcon } from '@/components/ui/ms-icon'
import { cn } from '@/lib/utils'

/** Stitch 奢华桌面页壳层：深色固定暗金 palette，浅色跟随全局 theme 变量 */
export function DesktopPageShell({
  title,
  subtitle,
  onBack,
  actions,
  children,
  flush,
  density = 'comfortable',
  className,
  innerClassName,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  actions?: ReactNode
  children: ReactNode
  flush?: boolean
  /** comfortable 稀疏内容大字；compact 表格/仪表盘小字 */
  density?: 'comfortable' | 'compact'
  className?: string
  innerClassName?: string
}) {
  const navigate = useNavigate()

  return (
    <div
      className={cn(
        'dlp-page thin-scroll',
        density === 'compact' && 'dlp-density-compact',
        className,
      )}
    >
      <div className="dlp-page__ambient" aria-hidden />
      <div className={cn('dlp-page__inner', flush && 'dlp-page__inner--flush', innerClassName)}>
        <header className="dlp-cmdbar">
          <div className="dlp-cmdbar__left">
            <BackButton onBack={onBack ?? (() => navigate(-1))} compact />
            <div className="dlp-cmdbar__titles">
              <h1 className="dlp-title">{title}</h1>
              {subtitle ? <p className="dlp-subtitle">{subtitle}</p> : null}
            </div>
          </div>
          {actions ? <div className="dlp-cmdbar__actions">{actions}</div> : null}
        </header>
        <div className="dlp-page__content">{children}</div>
      </div>
    </div>
  )
}

export function DlpGlass({
  children,
  className,
  gold,
}: {
  children: ReactNode
  className?: string
  gold?: boolean
}) {
  return (
    <div className={cn('dlp-glass', gold && 'dlp-glass--gold', className)}>{children}</div>
  )
}

export function DlpStat({
  label,
  value,
  prefix,
  suffix,
  icon,
  gold,
}: {
  label: string
  value: ReactNode
  prefix?: string
  suffix?: string
  icon?: ReactNode
  gold?: boolean
}) {
  return (
    <div className={cn('dlp-stat', gold && 'dlp-stat--gold')}>
      {icon ? <div className="dlp-stat__icon">{icon}</div> : null}
      <p className="dlp-stat__label">{label}</p>
      <div className="dlp-stat__value">
        {prefix ? <span className="dlp-stat__prefix">{prefix}</span> : null}
        <span className="dlp-stat__num">{value}</span>
        {suffix ? <span className="dlp-stat__suffix">{suffix}</span> : null}
      </div>
    </div>
  )
}

export function DlpBtnPrimary({
  children,
  onClick,
  disabled,
  className,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn('dlp-btn-primary', className)}
    >
      {children}
    </button>
  )
}

export function DlpBtnGhost({
  children,
  onClick,
  disabled,
  className,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn('dlp-btn-ghost', className)}
    >
      {children}
    </button>
  )
}

export function DlpBadge({
  children,
  tone = 'default',
  rect,
}: {
  children: ReactNode
  tone?: 'default' | 'gold' | 'success' | 'warn' | 'muted'
  /** 直角徽标，用于列表行等专业场景 */
  rect?: boolean
}) {
  return (
    <span className={cn('dlp-badge', `dlp-badge--${tone}`, rect && 'dlp-badge--rect')}>
      {children}
    </span>
  )
}

export function DlpEmpty({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="dlp-empty">
      {icon ? <div className="dlp-empty__icon">{icon}</div> : null}
      <p className="dlp-empty__title">{title}</p>
      {description ? <p className="dlp-empty__desc">{description}</p> : null}
      {action ? <div className="dlp-empty__action">{action}</div> : null}
    </div>
  )
}

export function DlpGlassHead({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div className="dlp-glass__head">
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  )
}

export function DlpGlassBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('dlp-glass__body', className)}>{children}</div>
}

export function DlpSearchBar({
  value,
  onChange,
  onSearch,
  onClear,
  loading,
  placeholder = '搜索用户、手机号、标签',
}: {
  value: string
  onChange: (v: string) => void
  onSearch: () => void
  onClear?: () => void
  loading?: boolean
  placeholder?: string
}) {
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') onSearch()
  }

  return (
    <div className="dlp-search-bar">
      <MsIcon name="search" size={20} className="dlp-search-bar__icon" />
      <input
        className="dlp-search-bar__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {value && onClear ? (
        <button type="button" className="dlp-search-bar__clear" onClick={onClear} aria-label="清空">
          <MsIcon name="close" size={16} />
        </button>
      ) : null}
      <button
        type="button"
        className="dlp-search-bar__submit"
        onClick={onSearch}
        disabled={loading || !value.trim()}
      >
        {loading ? '搜索中…' : '搜索'}
      </button>
    </div>
  )
}

export function DlpLevelHero({
  levelLabel,
  statusLabel,
  subtitle,
  icon,
  stats,
}: {
  levelLabel: string
  statusLabel?: string
  subtitle?: string
  icon?: ReactNode
  stats?: { label: string; value: ReactNode; suffix?: string }[]
}) {
  return (
    <div className="dlp-level-hero">
      {icon ? <div className="dlp-level-hero__icon">{icon}</div> : null}
      {statusLabel ? <div className="dlp-level-hero__badge">{statusLabel}</div> : null}
      <h2 className="dlp-level-hero__title">{levelLabel}</h2>
      {subtitle ? <p className="dlp-level-hero__subtitle">{subtitle}</p> : null}
      {stats && stats.length > 0 ? (
        <div className="dlp-level-hero__stats">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="dlp-level-hero__stat-label">{s.label}</p>
              <p className="dlp-level-hero__stat-value">
                {s.value}
                {s.suffix ? <span className="text-base font-medium"> {s.suffix}</span> : null}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function DlpBenefitItem({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="dlp-benefit">
      <div className="dlp-benefit__icon">{icon}</div>
      <div>
        <p className="dlp-benefit__title">{title}</p>
        <p className="dlp-benefit__desc">{description}</p>
      </div>
    </div>
  )
}

export function DlpToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="dlp-toggle-row">
      <div>
        <p className="dlp-toggle-row__label">{label}</p>
        {description ? <p className="dlp-toggle-row__desc">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={cn('dlp-switch', checked && 'dlp-switch--on')}
        onClick={() => onChange(!checked)}
      >
        <span className="dlp-switch__thumb" />
      </button>
    </div>
  )
}
