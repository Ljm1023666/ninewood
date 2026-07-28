import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  lines?: number
  className?: string
  variant?: 'default' | 'internal'
  /** 延迟显示，避免快请求刷新时闪骨架灰条；默认 200ms */
  deferMs?: number
}

/**
 * 列表加载占位。不要用 internal-list-card：氛围玻璃会把它渲成左侧横条灰块并在刷新时闪一下。
 */
export function LoadingState({
  lines = 3,
  className,
  variant = 'default',
  deferMs = 200,
}: LoadingStateProps) {
  const [visible, setVisible] = useState(deferMs <= 0)

  useEffect(() => {
    if (deferMs <= 0) {
      setVisible(true)
      return
    }
    const id = window.setTimeout(() => setVisible(true), deferMs)
    return () => window.clearTimeout(id)
  }, [deferMs])

  if (!visible) {
    return (
      <div
        className={cn('min-h-[120px]', className)}
        role="status"
        aria-busy="true"
        aria-label="加载中"
      />
    )
  }

  if (variant === 'internal') {
    return (
      <div
        className={cn(
          'flex flex-col items-stretch gap-3 py-2',
          className,
        )}
        role="status"
        aria-busy="true"
        aria-label="加载中"
      >
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-1"
            style={{ opacity: 1 - i * 0.12 }}
          >
            <div
              className="internal-skeleton h-9 w-9 shrink-0 rounded-xl !bg-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                animation: 'none',
              }}
              aria-hidden
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div
                className="h-2.5 max-w-[11rem] rounded-full"
                style={{
                  width: `${46 - i * 4}%`,
                  background: 'rgba(255,255,255,0.08)',
                }}
                aria-hidden
              />
              <div
                className="h-2 max-w-md rounded-full"
                style={{
                  width: `${72 - i * 8}%`,
                  background: 'rgba(255,255,255,0.05)',
                }}
                aria-hidden
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16',
        className,
      )}
      role="status"
      aria-busy="true"
      aria-label="加载中"
    >
      <span className="loader" />
    </div>
  )
}
