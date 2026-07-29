/**
 * 企业所得税场景页 · 方案 B 分析分栏
 */
import { useMemo } from 'react'
import { BarChart3, SlidersHorizontal } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { TaxSlider } from '@/components/tax-ui/TaxSlider'
import { TaxAmountDisplay } from '@/components/tax-ui/TaxAmountDisplay'
import { FundFlowRatioBar } from '@/components/tax-ui/FundFlowRatioBar'
import { TaxFormulaTimeline } from '../panels/TaxFormulaTimeline'
import { EffectiveRateCurve } from '../charts/EffectiveRateCurve'
import { useTaxVisualizerStore } from '@/stores/tax-visualizer'
import {
  calcCorporateTax,
  SMALL_MICRO_BRACKETS_2026,
  STANDARD_RATE,
} from '@/data/tax-rules/corporate-income'
import { cn } from '@/lib/utils'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

interface CorporateIncomeTaxProps {
  surface?: 'controls' | 'analysis' | 'all'
}

export default function CorporateIncomeTax({
  surface = 'all',
}: CorporateIncomeTaxProps) {
  const inputs = useTaxVisualizerStore((s) => s.inputs)
  const setInput = useTaxVisualizerStore((s) => s.setInput)

  const result = useMemo(() => {
    return calcCorporateTax(inputs.corporateTaxable, inputs.corporateRegime)
  }, [inputs.corporateTaxable, inputs.corporateRegime])

  const stackData = useMemo(
    () => [
      {
        name: '企业所得税',
        takeHome: Math.max(0, inputs.corporateTaxable - result.tax),
        tax: result.tax,
        deductions: 0,
      },
    ],
    [inputs.corporateTaxable, result.tax],
  )

  const curveData = useMemo(() => {
    const max = 10000000
    const steps = 50
    return Array.from({ length: steps + 1 }, (_, i) => {
      const income = (max * i) / steps
      const r = calcCorporateTax(income, inputs.corporateRegime)
      return { x: income, y: r.effectiveRate }
    })
  }, [inputs.corporateRegime])

  const regimeLabel = {
    standard: '标准税率',
    smallMicro: '小型微利',
    highTech: '高新技术',
  } as const

  const timelineSteps = useMemo(
    () => [
      {
        title: '确认应纳税所得额',
        value: inputs.corporateTaxable.toLocaleString('zh-CN'),
        hint: result.description,
      },
      {
        title: '适用税率',
        value: `${(result.rate * 100).toFixed(0)}%`,
        hint: result.bracketLabel ?? `标准 ${STANDARD_RATE * 100}%`,
      },
      {
        title: '应纳所得税',
        value: result.tax.toLocaleString('zh-CN'),
        active: true,
        footer: `税后净利润 ¥${Math.max(0, inputs.corporateTaxable - result.tax).toLocaleString('zh-CN')}`,
      },
    ],
    [inputs.corporateTaxable, result],
  )

  const controls = (
    <div className="tax-viz-param-card">
      <div className="tax-viz-param-card__head">
        <SlidersHorizontal className="tax-viz-param-card__head-icon size-[18px]" />
        参数配置
      </div>
      <div className="tax-viz-param-card__body">
        <div className="tax-viz-param-tabs">
          {(['standard', 'smallMicro', 'highTech'] as const).map((r) => (
            <LiquidMetalButton
              key={r}
              type="button"
              onClick={() => setInput('corporateRegime', r)}
              className={cn(
                'tax-viz-param-tabs__btn',
                inputs.corporateRegime === r && 'tax-viz-param-tabs__btn--active',
              )}
            >
              {regimeLabel[r]}
            </LiquidMetalButton>
          ))}
        </div>

        <TaxSlider
          label="应纳税所得额(元/年)"
          value={inputs.corporateTaxable}
          min={0}
          max={10000000}
          step={10000}
          onChange={(v) => setInput('corporateTaxable', v)}
          markers={
            inputs.corporateRegime === 'smallMicro'
              ? [
                  { value: 1000000, label: '100 万', color: 'bg-amber-500' },
                  { value: 3000000, label: '300 万', color: 'bg-amber-500' },
                ]
              : []
          }
          hint="收入 - 不征税 - 免税 - 各项扣除 - 弥补亏损"
        />

        {inputs.corporateRegime === 'smallMicro' && (
          <div className="space-y-2">
            {SMALL_MICRO_BRACKETS_2026.map((b, i) => {
              const isHit =
                inputs.corporateTaxable > 0 &&
                (i === SMALL_MICRO_BRACKETS_2026.length - 1
                  ? inputs.corporateTaxable >= SMALL_MICRO_BRACKETS_2026[i - 1].upper
                  : inputs.corporateTaxable <= b.upper)
              return (
                <div
                  key={b.label}
                  className={cn(
                    'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
                    isHit
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-white/8',
                  )}
                >
                  <span>{b.label}</span>
                  <span
                    className={cn(
                      'font-mono font-semibold',
                      isHit ? 'text-emerald-400' : 'text-muted-foreground',
                    )}
                  >
                    {(b.effectiveRate * 100).toFixed(0)}%
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  const analysis = (
    <>
      <div className="tax-viz-analysis__head">
        <h2 className="tax-viz-analysis__title">
          <BarChart3 className="tax-viz-analysis__title-icon size-5" />
          数据分析
        </h2>
        <TaxAmountDisplay
          variant="hero"
          label="预估年度应纳企税"
          amount={result.tax}
          tone="tax"
          caption={`实际税负 ${(result.effectiveRate * 100).toFixed(2)}%`}
        />
      </div>

      <Card>
        <CardContent className="tax-viz-analysis__chart-card">
          <div className="tax-viz-analysis__chart-head">
            <div className="tax-viz-analysis__chart-title">实际税负率曲线图</div>
            <span className="tax-viz-analysis__chart-badge">
              {regimeLabel[inputs.corporateRegime]}
            </span>
          </div>
          <EffectiveRateCurve
            data={curveData}
            current={{ x: inputs.corporateTaxable, y: result.effectiveRate }}
            yFormat="percent"
            xLabel="应纳税所得额 (元/年)"
            yLabel="实际税负率"
            yMax={0.3}
            height={280}
          />
        </CardContent>
      </Card>

      <div className="tax-viz-analysis__bottom">
        <Card className="h-full">
          <CardContent className="h-full p-0">
            <FundFlowRatioBar data={stackData} />
          </CardContent>
        </Card>
        <TaxFormulaTimeline steps={timelineSteps} />
      </div>
    </>
  )

  if (surface === 'controls') return controls
  if (surface === 'analysis') return analysis

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-3">{controls}</div>
      <div className="col-span-12 lg:col-span-9">{analysis}</div>
    </div>
  )
}
