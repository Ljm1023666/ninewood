import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Aceternity 风格：卡片容器，用于按钮展示/点击复制 */
export function ButtonsCard({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'group/card flex min-h-[11rem] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-border bg-card/80 p-6 shadow-sm transition hover:border-[var(--primary-start)]/35 hover:shadow-md',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
