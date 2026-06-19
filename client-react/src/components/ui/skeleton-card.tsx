import { cn } from '@/lib/utils'

interface SkeletonCardProps {
  count?: number
  className?: string
}

export function SkeletonCard({ count = 3, className }: SkeletonCardProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3 animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="h-4 bg-white/[0.06] rounded w-3/4 shimmer" />
          <div className="h-3 bg-white/[0.04] rounded w-1/2 shimmer" />
          <div className="flex gap-3 mt-3">
            <div className="h-3 bg-white/[0.04] rounded w-16 shimmer" />
            <div className="h-3 bg-white/[0.04] rounded w-20 shimmer" />
          </div>
        </div>
      ))}
    </div>
  )
}
