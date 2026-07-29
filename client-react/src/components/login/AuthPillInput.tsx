import { cn } from '@/lib/utils'
import { pillInputClass } from './login-styles'
import { MsIcon } from '@/components/ui/ms-icon'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

type AuthPillInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'className'
> & {
  className?: string
  /** 左侧 +86 区号 */
  phonePrefix?: boolean
  /** Material icon 名称（左侧） */
  leadingIcon?: string
  /** 密码可见切换 */
  showPasswordToggle?: boolean
  passwordVisible?: boolean
  onTogglePassword?: () => void
}

export function AuthPillInput({
  className,
  phonePrefix,
  leadingIcon,
  showPasswordToggle,
  passwordVisible,
  onTogglePassword,
  type,
  ...props
}: AuthPillInputProps) {
  const leftPad = phonePrefix ? 'pl-14' : leadingIcon ? 'pl-12' : 'pl-4'
  const rightPad = showPasswordToggle ? 'pr-12' : 'pr-4'

  return (
    <div className="relative flex items-center">
      {phonePrefix && (
        <span className="pointer-events-none absolute left-4 text-sm text-white/50">
          +86
        </span>
      )}
      {leadingIcon && !phonePrefix && (
        <MsIcon
          name={leadingIcon}
          size={20}
          className="pointer-events-none absolute left-4 text-white/50"
        />
      )}
      <input
        type={showPasswordToggle ? (passwordVisible ? 'text' : 'password') : type}
        className={cn(pillInputClass, leftPad, rightPad, className)}
        {...props}
      />
      {showPasswordToggle && (
        <LiquidMetalButton
          type="button"
          onClick={onTogglePassword}
          className="absolute right-4 flex items-center justify-center text-white/50 transition-colors duration-200 hover:text-white"
          aria-label={passwordVisible ? '隐藏密码' : '显示密码'}
        >
          <MsIcon
            name={passwordVisible ? 'visibility' : 'visibility_off'}
            size={20}
          />
        </LiquidMetalButton>
      )}
    </div>
  )
}
