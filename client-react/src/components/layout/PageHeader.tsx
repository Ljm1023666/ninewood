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

/** 全站统一的页面顶部：返回左固定 + 标题居中 + 右操作槽
 *  避免按钮与文字重叠，标题不因两侧内容挤压而截断 */
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
    onBack === 'back'
      ? () => navigate(-1)
      : typeof onBack === 'function'
        ? onBack
        : undefined

  const showLeft = !!handleBack
  const showRight = !!actions

  return (
    <header
      className={cn(
        'relative flex items-center justify-center',
        divider && 'border-b border-border pb-3',
        'mb-4 min-h-[44px]',
        className,
      )}
    >
      {/* 左侧：返回按钮（绝对定位） */}
      {handleBack && (
        <button
          type="button"
          onClick={handleBack}
          aria-label="返回"
          className="absolute left-0 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-lg border border-border bg-card/60 text-text-secondary transition-[border-color,color] duration-200 hover:border-accent hover:text-text-primary"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      {/* 标题区：居中，左右由按钮/操作槽宽度撑开间距 */}
      <div
        className={cn(
          'flex flex-col items-center justify-center text-center min-w-0',
          showLeft && 'ml-11',
          showRight && 'mr-11',
        )}
      >
        <h1 className="max-w-[60vw] truncate text-lg font-bold tracking-tight text-text-primary">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 max-w-[60vw] truncate text-sm text-text-muted">
            {subtitle}
          </p>
        )}
      </div>

      {/* 右侧：操作槽（绝对定位） */}
      {actions && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex shrink-0 items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  )
}
