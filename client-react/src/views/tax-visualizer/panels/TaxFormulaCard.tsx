/**
 * 当前档位公式卡 · 步骤时间线
 */
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TaxFormulaCardProps {
  title: string
  formula: string
  steps?: string[]
  conclusion?: string
  className?: string
  emphasis?: 'normal' | 'tax' | 'saving' | 'warning'
}

const EMPHASIS_STYLES = {
  normal: 'border-white/8',
  tax: 'border-rose-500/30',
  saving: 'border-emerald-500/30',
  warning: 'border-amber-500/30',
} as const

const EMPHASIS_TITLE = {
  normal: 'text-foreground',
  tax: 'text-rose-400',
  saving: 'text-emerald-400',
  warning: 'text-amber-400',
} as const

export function TaxFormulaCard({
  title,
  formula,
  steps,
  conclusion,
  className,
  emphasis = 'normal',
}: TaxFormulaCardProps) {
  return (
    <Card
      className={cn(
        'tax-viz-formula gap-0 border py-0',
        EMPHASIS_STYLES[emphasis],
        className,
      )}
    >
      <CardContent className="px-5 py-4">
        <div
          className={cn(
            'text-xs font-semibold tracking-wide uppercase',
            EMPHASIS_TITLE[emphasis],
          )}
        >
          {title}
        </div>
        <div className="mt-2 font-mono text-base leading-relaxed text-foreground">
          {formula}
        </div>
        {steps && steps.length > 0 && (
          <ol className="tax-viz-formula__steps mt-4 space-y-2.5 border-t border-white/8 pt-4">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="tax-viz-formula__step-num shrink-0">{i + 1}</span>
                <span className="font-mono text-xs leading-relaxed text-foreground/85">{s}</span>
              </li>
            ))}
          </ol>
        )}
        {conclusion && (
          <div className="mt-4 border-t border-white/8 pt-3 text-sm font-medium text-foreground/90">
            {conclusion}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
