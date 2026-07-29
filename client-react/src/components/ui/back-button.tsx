import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { useLocation, useNavigate } from 'react-router-dom'
import { navigateSubpageExit } from '@/utils/subpage-nav'
import { MsIcon } from '@/components/ui/ms-icon'
import { cn } from '@/lib/utils'

interface BackButtonProps {
  /** 自定义返回逻辑，默认返回路由上级 */
  onBack?: () => void
  label?: string
  /** 仅图标，供 PageHeader 等顶栏使用 */
  compact?: boolean
  className?: string
}

export function BackButton({
  onBack,
  label = '返回',
  compact = false,
  className,
}: BackButtonProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const handleClick =
    onBack ?? (() => navigateSubpageExit(navigate, pathname))

  if (compact) {
    return (
      <LiquidMetalButton
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleClick}
        aria-label={label}
        className={cn(
          'size-9 shrink-0 rounded-md text-text-secondary hover:text-text-primary',
          className,
        )}
      >
        <MsIcon name="chevron_left" size={24} className="opacity-80" />
      </LiquidMetalButton>
    )
  }

  return (
    <LiquidMetalButton variant="link" onClick={handleClick} aria-label={label}>
      <MsIcon name="chevron_left" size={16} className="me-1 opacity-60" />
      {label}
    </LiquidMetalButton>
  )
}
