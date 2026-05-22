import * as React from 'react'
import { cn } from '@/lib/utils'

/** Material UI Chip 简化版：圆角胶囊、可选中态，用于快捷筛选/标签 */
export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  variant?: 'filled' | 'outlined'
}

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  (
    {
      className,
      selected = false,
      variant = 'outlined',
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex h-8 max-w-full shrink-0 items-center justify-center gap-1 rounded-full border px-3 text-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        variant === 'outlined' &&
          (selected
            ? 'border-accent bg-accent/15 text-text-primary shadow-sm'
            : 'border-border bg-transparent text-muted-foreground hover:border-accent/40 hover:bg-muted/40 hover:text-foreground'),
        variant === 'filled' &&
          'border-transparent bg-primary text-primary-foreground shadow-sm hover:opacity-90',
        className,
      )}
      {...props}
    />
  ),
)
Chip.displayName = 'Chip'

export { Chip }
