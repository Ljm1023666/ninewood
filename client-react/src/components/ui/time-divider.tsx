import { formatChatTime } from '@/utils/time'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/theme'

interface TimeDividerProps {
  timestamp: string
  prevTimestamp?: string | null
  className?: string
}

export function TimeDivider({
  timestamp,
  prevTimestamp,
  className,
}: TimeDividerProps) {
  const isDark = useThemeStore((s) => s.current.dark)
  if (!timestamp) return null
  const prev = prevTimestamp ? new Date(prevTimestamp).getTime() : 0
  const curr = new Date(timestamp).getTime()
  if (isNaN(curr)) return null
  if (prev && curr - prev < 5 * 60 * 1000) return null

  return (
    <div className={cn('flex items-center justify-center py-3', className)}>
      <span
        className={cn(
          'text-xs px-3 py-1 rounded-full border',
          isDark
            ? 'text-neutral-500 bg-bg-secondary/75 border-white/5'
            : 'text-text-muted bg-bg-secondary/40 border-border/70',
        )}
      >
        {formatChatTime(timestamp)}
      </span>
    </div>
  )
}
