import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  /** 返回行为：未传 = 不显示返回；传 'back' = navigate(-1)；传函数 = 自定义 */
  onBack?: 'back' | (() => void)
  /** 右侧操作槽（按钮等） */
  actions?: ReactNode
  /** 底部分隔线：默认显示 */
  divider?: boolean
  className?: string
}

/** 全站统一的页面顶部：返回 + 标题 + 副标题 + 右侧操作槽
 *  避免 Discover / Settings / MyDemands / Orders 等页面各自重复粘贴样式 */
export function PageHeader({
  title,
  subtitle,
  onBack,
  actions,
  divider = true,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate()
  const handleBack =
    onBack === 'back' ? () => navigate(-1) : typeof onBack === 'function' ? onBack : undefined

  return (
    <header
      className={cn(
        'flex items-center gap-3',
        divider && 'border-b border-border pb-3',
        'mb-4',
        className,
      )}
    >
      {handleBack && (
        <button
          type="button"
          onClick={handleBack}
          aria-label="返回"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card/60 text-text-secondary transition-[border-color,color] duration-200 hover:border-accent hover:text-text-primary"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold tracking-tight text-text-primary">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-text-muted">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
