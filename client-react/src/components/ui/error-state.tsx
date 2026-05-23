import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  /** 具体错误消息，格式: "失败操作 — 原因" */
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center justify-center py-16">
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
