import { cva } from 'class-variance-authority'
import {
  LiquidMetalButton,
  type LiquidMetalButtonProps,
} from '@/components/ui/liquid-metal-button'

/**
 * 兼容非按钮链接的轻量样式工具。真实按钮统一由 LiquidMetalButton 渲染。
 */
const buttonVariants = cva(
  'inline-flex min-h-9 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary,#2fbbe0)]',
  {
    variants: {
      variant: {
        default: '',
        destructive: 'text-[var(--error-color,var(--destructive,#ef4444))]',
        outline: '',
        secondary: '',
        ghost: 'hover:bg-accent-ghost',
        link: 'underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 px-3',
        lg: 'h-10 px-6',
        icon: 'size-9 px-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

type ButtonProps = LiquidMetalButtonProps

const Button = LiquidMetalButton

export { Button, buttonVariants, type ButtonProps }
