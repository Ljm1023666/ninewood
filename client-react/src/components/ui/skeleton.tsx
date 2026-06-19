import * as React from 'react'

import { cn } from '@/lib/utils'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md',
        'before:absolute before:inset-0',
        'before:bg-linear-90 before:from-white/4 before:via-white/10 before:to-white/4',
        'before:bg-[length:200%_100%]',
        'before:animate-shimmer',
        'motion-reduce:before:animate-none motion-reduce:before:bg-muted',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
