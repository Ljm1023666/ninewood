import { cn } from '@/lib/utils'
import { glassCardClass } from './login-styles'

export function LoginGlassCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn(glassCardClass, className)}>{children}</div>
}
