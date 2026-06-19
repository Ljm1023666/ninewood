import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/** shadcn/ui 风格 Badge：小标签、描边/填充变体，用于列表元信息 */
const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-sm font-semibold leading-none transition-[color,background-color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/10 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline:
          'border-border bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        destructive:
          'border-transparent bg-error text-white shadow-sm hover:opacity-90',
        success:
          'border-transparent bg-success text-white shadow-sm hover:opacity-90',
        warning:
          'border-transparent bg-warning text-white shadow-sm hover:opacity-90',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
