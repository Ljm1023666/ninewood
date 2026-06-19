import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BackButtonProps {
  /** 自定义返回逻辑，默认返回路由上级 */
  onBack?: () => void
  label?: string
}

export function BackButton({ onBack, label = '返回' }: BackButtonProps) {
  const navigate = useNavigate()
  const handleClick = onBack ?? (() => navigate(-1))

  return (
    <Button variant="link" onClick={handleClick} aria-label={label}>
      <ChevronLeft className="me-1 opacity-60 size-4" aria-hidden="true" />
      {label}
    </Button>
  )
}
