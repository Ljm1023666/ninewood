import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  /** 具体错误消息，格式: "失败操作 — 原因" */
  message?: string
  onRetry?: () => void
  variant?: 'default' | 'internal'
  className?: string
}

export function ErrorState({
  message,
  onRetry,
  variant = 'default',
  className,
}: ErrorStateProps) {
  if (variant === 'internal') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-[var(--internal-radius)] border border-dashed border-[var(--internal-hairline)] bg-[var(--internal-surface)] py-12',
          className,
        )}
      >
        <AlertCircle className="mb-4 size-10 text-text-muted opacity-50" />
        <p className="font-medium text-text-secondary">加载失败</p>
        <p className="mt-1 max-w-sm text-center font-mono text-xs text-text-muted">
          {message || '请检查网络连接后重试'}
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 border border-[var(--internal-hairline)] px-4 py-2 font-mono text-xs uppercase tracking-wider text-text-secondary transition-colors hover:bg-white/[0.03]"
          >
            重试
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'mx-auto flex max-w-sm flex-col items-center justify-center py-16',
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-error/10">
        <AlertCircle className="size-6 text-error" />
      </div>
      <p className="mb-4 text-center text-sm text-text-secondary">
        {message || '加载失败 — 请检查网络连接后重试'}
      </p>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="text-accent-color hover:text-accent-hover"
        >
          重试
        </Button>
      )}
    </div>
  )
}
