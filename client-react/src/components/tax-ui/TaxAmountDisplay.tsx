/**
 * 金额展示组件
 * 大字号 + 节税/超额色环 + 数字滚动动画
 */
import { TrendingDown, Receipt, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAnimatedNumber } from './useAnimatedNumber'

interface TaxAmountDisplayProps {
  label: string
  amount: number
  /** 状态语义 */
  tone?: 'default' | 'tax' | 'saving' | 'warning'
  /** 副标题(用于"基于 18 万收入"之类) */
  caption?: string
  className?: string
  /** 货币格式化 */
  formatValue?: (v: number) => string
  /** 关闭数字动画 */
  animate?: boolean
  /** hero: 方案 B 右上角大金额 */
  variant?: 'default' | 'hero'
  /** hero 模式下的节税提示文案 */
  savingsHint?: string
}

const TONE_STYLES = {
  default: 'text-foreground',
  tax: 'text-rose-400',
  saving: 'tax-viz-amount--gold',
  warning: 'text-amber-400',
} as const

const TONE_BADGE = {
  default: null,
  tax: {
    text: '应缴税款',
    cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    icon: Receipt,
  },
  saving: {
    text: '节税 / 免税',
    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: TrendingDown,
  },
  warning: {
    text: '超额预警',
    cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: AlertTriangle,
  },
} as const

const defaultFormat = (v: number) =>
  `¥${v.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`

function formatHeroAmount(v: number) {
  const fixed = v.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const [intPart, decPart] = fixed.split('.')
  return { intPart, decPart: decPart ?? '00' }
}

export function TaxAmountDisplay({
  label,
  amount,
  tone = 'default',
  caption,
  className,
  formatValue = defaultFormat,
  animate: animateNumbers = true,
  variant = 'default',
  savingsHint,
}: TaxAmountDisplayProps) {
  const animated = useAnimatedNumber(amount, 0.38)
  const shown = animateNumbers ? animated : amount
  const badge = TONE_BADGE[tone]
  const BadgeIcon = badge?.icon

  if (variant === 'hero') {
    const { intPart, decPart } = formatHeroAmount(shown)
    return (
      <div className={cn('tax-viz-hero-amount', className)}>
        <div className="tax-viz-hero-amount__label">{label}</div>
        <div className="tax-viz-hero-amount__value">
          <span className="tax-viz-hero-amount__currency">¥</span>
          {intPart}
          <span className="tax-viz-hero-amount__decimals">.{decPart}</span>
        </div>
        {savingsHint && (
          <div className="tax-viz-hero-amount__savings">
            <TrendingDown className="size-3.5" aria-hidden />
            {savingsHint}
          </div>
        )}
        {!savingsHint && caption && (
          <div className="tax-viz-hero-amount__caption">{caption}</div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('tax-viz-kpi-card flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </div>
        {badge && BadgeIcon && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
              badge.cls,
            )}
          >
            <BadgeIcon className="size-3" aria-hidden />
            {badge.text}
          </span>
        )}
      </div>
      <div
        className={cn('tax-viz-amount', TONE_STYLES[tone])}
      >
        {formatValue(shown)}
      </div>
      {caption && (
        <div className="text-xs text-muted-foreground">{caption}</div>
      )}
    </div>
  )
}
