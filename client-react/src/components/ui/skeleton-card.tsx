import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/theme'

interface SkeletonCardProps {
  count?: number
  className?: string
}

export function SkeletonCard({ count = 3, className }: SkeletonCardProps) {
  const isDark = useThemeStore((s) => s.current.dark)
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-xl border p-5 space-y-3 animate-pulse',
            isDark ? 'border-white/10 bg-white/[0.03]' : 'border-black/[0.06] bg-black/[0.02]',
          )}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className={cn('h-4 rounded w-3/4', isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]')} />
          <div className={cn('h-3 rounded w-1/2', isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]')} />
          <div className="flex gap-3 mt-3">
            <div className={cn('h-3 rounded w-16', isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]')} />
            <div className={cn('h-3 rounded w-20', isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]')} />
          </div>
        </div>
      ))}
    </div>
  )
}
