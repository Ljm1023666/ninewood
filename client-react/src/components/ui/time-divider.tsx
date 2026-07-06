import { formatChatTime } from '@/utils/time'
import { cn } from '@/lib/utils'

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
  if (!timestamp) return null
  const prev = prevTimestamp ? new Date(prevTimestamp).getTime() : 0
  const curr = new Date(timestamp).getTime()
  if (isNaN(curr)) return null
  if (prev && curr - prev < 5 * 60 * 1000) return null

  return (
    <div className={cn('msg-time-divider', className)}>
      <span className="msg-time-divider__text">
        {formatChatTime(timestamp)}
      </span>
    </div>
  )
}
