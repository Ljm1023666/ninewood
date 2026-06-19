import { cn } from '@/lib/utils'

interface LoadingStateProps {
  lines?: number
  className?: string
  variant?: 'default' | 'internal'
}

export function LoadingState({
  lines = 3,
  className,
  variant = 'default',
}: LoadingStateProps) {
  if (variant === 'internal') {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="internal-list-card relative flex flex-col gap-4 rounded-[var(--internal-radius)] p-4"
          >
            <div className="flex items-center justify-between">
              <div className="internal-skeleton h-5 w-1/3 rounded" />
              <div className="internal-skeleton h-5 w-16 rounded-[6px]" />
            </div>
            <div className="flex items-center justify-between">
              <div className="internal-skeleton h-4 w-24 rounded" />
              <div className="internal-skeleton h-5 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col items-center justify-center py-16 ${className ?? ''}`}
    >
      <div className="w-64 space-y-3">
        <div className="internal-skeleton h-12 w-full rounded-lg" />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <div
            key={i}
            className="internal-skeleton h-8 rounded"
            style={{ width: `${100 - (i + 1) * 18}%` }}
          />
        ))}
      </div>
    </div>
  )
}
