import { cn } from '@/lib/utils'

interface LoadingStateProps {
  text?: string
  className?: string
}

export function LoadingState({
  text = '加载中...',
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16',
        className,
      )}
    >
      <div className="loader mb-4" />
      <p className="text-sm text-neutral-500">{text}</p>
    </div>
  )
}
