import { forwardRef } from 'react'
import {
  LiquidMetalButton,
  type LiquidMetalButtonProps,
} from '@/components/ui/liquid-metal-button'

export interface LiquidButtonProps extends LiquidMetalButtonProps {
  /** 兼容旧调用，金标准组件会按当前主题自动选择表面。 */
  glassSurface?: 'dark' | 'light'
  asChild?: boolean
}

export const LiquidButton = forwardRef<HTMLButtonElement, LiquidButtonProps>(
  ({ glassSurface, asChild, ...props }, ref) => {
    void glassSurface
    void asChild
    return <LiquidMetalButton ref={ref} {...props} />
  },
)
LiquidButton.displayName = 'LiquidButton'

export interface GlassButtonProps extends LiquidMetalButtonProps {
  contentClassName?: string
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ contentClassName, children, ...props }, ref) => (
    <LiquidMetalButton ref={ref} {...props}>
      <span className={contentClassName}>{children}</span>
    </LiquidMetalButton>
  ),
)
GlassButton.displayName = 'GlassButton'
