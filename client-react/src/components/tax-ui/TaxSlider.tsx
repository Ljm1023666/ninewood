/**
 * 税务可视化专用 Slider
 * 渐变轨道 + marker 脉冲 + 数值滚动
 */
import { type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useAnimatedNumber } from './useAnimatedNumber'

export interface TaxSliderMarker {
  value: number
  label: string
  color?: string
  /** 数值 ≤ marker 时 marker 脉冲(用于免税线) */
  pulseWhenAtOrBelow?: boolean
}

interface TaxSliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  formatValue?: (v: number) => string
  hint?: ReactNode
  markers?: TaxSliderMarker[]
  className?: string
}

const defaultFormat = (v: number) =>
  `¥${v.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`

export function TaxSlider({
  label,
  value,
  min,
  max,
  step = 100,
  onChange,
  formatValue = defaultFormat,
  hint,
  markers = [],
  className,
}: TaxSliderProps) {
  const ratio = max > min ? (value - min) / (max - min) : 0
  const animatedValue = useAnimatedNumber(value, 0.28)
  const inExemptZone = markers.some(
    (m) => m.pulseWhenAtOrBelow && value > 0 && value <= m.value,
  )

  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        inExemptZone && 'tax-viz-slider--exempt',
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground">{label}</div>
          {hint && (
            <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
          )}
        </div>
        <div
          className={cn(
            'shrink-0 font-mono text-base font-semibold tabular-nums transition-colors duration-200',
            inExemptZone ? 'text-emerald-400' : 'text-foreground',
          )}
        >
          {formatValue(animatedValue)}
        </div>
      </div>

      <div className="relative pt-3 pb-5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="tax-slider w-full cursor-pointer appearance-none bg-transparent"
          style={{ '--fill': `${ratio * 100}%` } as CSSProperties}
        />
        {markers.map((m) => {
          const left = max > min ? ((m.value - min) / (max - min)) * 100 : 0
          const isPulsing =
            m.pulseWhenAtOrBelow && value > 0 && value <= m.value
          return (
            <div
              key={m.value}
              className="pointer-events-none absolute top-0 bottom-0 z-10"
              style={{ left: `${left}%` }}
            >
              <div
                className={cn(
                  'tax-viz-marker-line h-4 w-0.5 -translate-x-1/2',
                  m.color ?? 'bg-amber-500/80',
                  isPulsing && 'tax-viz-marker-line--pulse',
                )}
                aria-hidden
              />
              <div
                className={cn(
                  'absolute left-0 mt-1 -translate-x-1/2 text-[11px] font-medium whitespace-nowrap',
                  isPulsing ? 'text-emerald-400' : 'text-amber-400/90',
                )}
              >
                {m.label}
              </div>
            </div>
          )
        })}
      </div>

      {inExemptZone && (
        <div className="tax-viz-exempt-hint text-xs text-emerald-400/90">
          当前处于免税区间内
        </div>
      )}
    </div>
  )
}
