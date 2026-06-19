import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { MsIcon } from '@/components/ui/ms-icon'

interface BackButtonProps {
  /** 自定义返回逻辑，默认返回路由上级 */
  onBack?: () => void
  label?: string
  /** 仅图标，供 PageHeader 等顶栏使用 */
  compact?: boolean
}

export function BackButton({
  onBack,
  label = '返回',
  compact = false,
}: BackButtonProps) {
  const navigate = useNavigate()
  const handleClick = onBack ?? (() => navigate(-1))

  if (compact) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleClick}
        aria-label={label}
        className="size-9 shrink-0 rounded-md text-text-secondary hover:text-text-primary"
      >
        <MsIcon name="chevron_left" size={24} className="opacity-80" />
      </Button>
    )
  }

  return (
    <Button variant="link" onClick={handleClick} aria-label={label}>
      <MsIcon name="chevron_left" size={16} className="me-1 opacity-60" />
      {label}
    </Button>
  )
}
