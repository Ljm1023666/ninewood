/**
 * 计算逻辑推演 · 方案 B 时间线样式
 */
import { Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface FormulaTimelineStep {
  title: string
  value: string
  hint?: string
  active?: boolean
  footer?: string
}

interface TaxFormulaTimelineProps {
  title?: string
  steps: FormulaTimelineStep[]
  className?: string
}

export function TaxFormulaTimeline({
  title = '计算逻辑推演',
  steps,
  className,
}: TaxFormulaTimelineProps) {
  return (
    <Card className={cn('tax-viz-formula-timeline gap-0 border py-0', className)}>
      <CardContent className="overflow-y-auto px-6 py-6">
        <h3 className="tax-viz-formula-timeline__title">{title}</h3>
        <div className="tax-viz-formula-timeline__track">
          {steps.map((step, i) => (
            <div
              key={`${step.title}-${i}`}
              className={cn(
                'tax-viz-formula-timeline__step',
                step.active && 'tax-viz-formula-timeline__step--active',
                i === steps.length - 1 && 'tax-viz-formula-timeline__step--final',
              )}
            >
              <div
                className={cn(
                  'tax-viz-formula-timeline__dot',
                  step.active && 'tax-viz-formula-timeline__dot--active',
                )}
              >
                {step.active && <Check className="size-2.5" strokeWidth={3} />}
              </div>
              <div className="tax-viz-formula-timeline__body">
                <div className="tax-viz-formula-timeline__row">
                  <div
                    className={cn(
                      'tax-viz-formula-timeline__step-title',
                      step.active && 'text-[#f2ca50]',
                    )}
                  >
                    {step.title}
                  </div>
                  <div className="tax-viz-formula-timeline__step-value">{step.value}</div>
                </div>
                {step.hint && (
                  <div className="tax-viz-formula-timeline__hint">{step.hint}</div>
                )}
                {step.footer && (
                  <div className="tax-viz-formula-timeline__footer">{step.footer}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
