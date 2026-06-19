import { formatChatTime } from '@/utils/time'
import { cn } from '@/lib/utils'

interface TimeDividerProps {
  timestamp: string
  prevTimestamp?: string | null
  className?: string
}

export function TimeDivider({ timestamp, prevTimestamp, className }: TimeDividerProps) {
  if (!timestamp) return null
  const prev = prevTimestamp ? new Date(prevTimestamp).getTime() : 0
  const curr = new Date(timestamp).getTime()
  if (isNaN(curr)) return null
  if (prev && curr - prev < 5 * 60 * 1000) return null

  return (
    <div className={cn('flex items-center justify-center py-3', className)}>
      <span className="text-xs text-neutral-500 bg-black/40 px-3 py-1 rounded-full border border-white/5">
        {formatChatTime(timestamp)}
      </span>
    </div>
  )
}
