import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { BackButton } from '@/components/ui/back-button'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  onBack?: 'back' | (() => void)
  actions?: ReactNode
  divider?: boolean
  className?: string
  variant?: 'display' | 'centered'
}

/** 内部页顶栏：Stitch h-48 + hairline-bottom + mb-16 */
export function PageHeader({
  title,
  subtitle,
  onBack,
  actions,
  divider = true,
  className,
  variant = 'display',
}: PageHeaderProps) {
  const navigate = useNavigate()
  const handleBack =
    onBack === 'back'
      ? () => navigate(-1)
      : typeof onBack === 'function'
        ? onBack
        : undefined

  if (variant === 'centered') {
    const showLeft = !!handleBack
    const showRight = !!actions
    return (
      <header
        className={cn(
          'relative flex min-h-[44px] items-center justify-center',
          divider && 'mb-4 border-b border-border pb-3',
          !divider && 'mb-4',
          className,
        )}
      >
        {handleBack && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <BackButton onBack={handleBack} compact />
          </div>
        )}
        <div
          className={cn(
            'flex min-w-0 flex-col items-center justify-center text-center',
            showLeft && 'ml-11',
            showRight && 'mr-11',
          )}
        >
          <h1 className="max-w-[60vw] truncate text-xl font-bold tracking-tight text-text-primary">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 max-w-[60vw] truncate text-sm text-text-muted">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="absolute right-0 top-1/2 flex shrink-0 -translate-y-1/2 items-center gap-2">
            {actions}
          </div>
        )}
      </header>
    )
  }

  const hasSubtitle = !!subtitle

  return (
    <header
      className={cn(
        'internal-page-header relative z-10',
        !divider && 'mb-4 border-b-0',
        hasSubtitle && 'h-auto min-h-12 py-2',
        className,
      )}
    >
      {handleBack ? <BackButton onBack={handleBack} compact /> : null}
      <div className="ml-4 min-w-0 flex-1">
        <h1 className="internal-display-title">{title}</h1>
        {subtitle ? (
          <p className="mt-0.5 truncate font-mono text-xs text-text-muted">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="ml-4 flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  )
}
