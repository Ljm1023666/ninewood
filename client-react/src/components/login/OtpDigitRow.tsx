import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

const digitBoxClass =
  'h-14 w-12 rounded-xl border border-white/[0.08] bg-white/[0.05] text-center text-xl text-white outline-none transition-[border-color,background-color] duration-200 focus:border-[#3388FF] focus:bg-white/[0.02] disabled:opacity-50'

export function OtpDigitRow({
  length,
  code,
  onChange,
  onKeyDown,
  disabled,
}: {
  length: number
  code: string[]
  onChange: (index: number, value: string) => void
  onKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void
  disabled: boolean
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const t = setTimeout(() => refs.current[0]?.focus(), 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex items-center justify-center gap-2">
      {code.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          data-sms-index={i}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => onChange(i, e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => onKeyDown(i, e)}
          className={cn(digitBoxClass, digit && 'border-[#3388FF]/40')}
          style={{ caretColor: 'transparent' }}
          aria-label={`验证码第 ${i + 1} 位`}
        />
      ))}
    </div>
  )
}
