import type React from 'react'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

/** 登录主 CTA：保留原生表单能力，视觉统一由 LiquidMetalButton 负责。 */
export function AuthPrimaryButton({
  children,
  disabled,
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <LiquidMetalButton
      type={type}
      variant="primary"
      disabled={disabled}
      active={!disabled}
      fullWidth
      {...props}
    >
      {children}
    </LiquidMetalButton>
  )
}
