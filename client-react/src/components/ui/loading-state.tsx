import { Skeleton } from '@/components/ui/skeleton'

interface LoadingStateProps {
  lines?: number
  className?: string
}

export function LoadingState({ lines = 3, className }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 ${className ?? ''}`}>
      <div className="w-64 space-y-3">
        <Skeleton className="h-12 w-full rounded-lg" />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-8 rounded"
            style={{ width: `${100 - (i + 1) * 18}%` }}
          />
        ))}
      </div>
    </div>
  )
}
