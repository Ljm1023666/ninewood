import { cn } from '@/lib/utils'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import type { ReactNode } from 'react'

function labelFromChildren(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children)
  }
  if (Array.isArray(children)) {
    return children.map(labelFromChildren).join('')
  }
  if (children && typeof children === 'object' && 'props' in children) {
    return labelFromChildren(
      (children.props as { children?: ReactNode }).children,
    )
  }
  return ''
}

/** 登录主 CTA：可提交（非 disabled）时金属描边；空闲无金属边 */
export function AuthPrimaryButton({
  children,
  className,
  onClick,
  disabled,
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const label = labelFromChildren(children).replace(/\s+/g, ' ').trim() || '继续'
  return (
    <LiquidMetalButton
      label={label}
      disabled={disabled}
      active={!disabled}
      fullWidth
      className={cn(className)}
      onClick={() => onClick?.({} as React.MouseEvent<HTMLButtonElement>)}
    />
  )
}
