import { cn } from '@/lib/utils'
import { primaryButtonClass } from './login-styles'

export function AuthPrimaryButton({
  children,
  className,
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={cn(primaryButtonClass, className)} {...props}>
      {children}
    </button>
  )
}
