/**
 * 增值税场景页 · 方案 B 分析分栏
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
  calcVat,
  calcVatSurcharges,
  GENERAL_VAT_RATES,
  SMALL_VAT_RATES,
  SMALL_MONTHLY_EXEMPTION,
} from '@/data/tax-rules/vat'
import { cn } from '@/lib/utils'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

interface VatTaxProps {
  surface?: 'controls' | 'analysis' | 'all'
}

export default function VatTax({ surface = 'all' }: VatTaxProps) {
  const inputs = useTaxVisualizerStore((s) => s.inputs)
  const setInput = useTaxVisualizerStore((s) => s.setInput)

  const result = useMemo(() => {
    return calcVat(
      inputs.vatSales,
      inputs.vatInput,
      inputs.vatTaxpayer,
      inputs.vatRateId,
    )
  }, [inputs.vatSales, inputs.vatInput, inputs.vatTaxpayer, inputs.vatRateId])

  const surcharges = useMemo(
    () => calcVatSurcharges(result.payable),
    [result.payable],
  )

  const totalBurden = result.payable + surcharges.total

  const stackData = useMemo(
    () => [
      {
        name: '增值税',
        takeHome: Math.max(0, inputs.vatSales - totalBurden),
        tax: totalBurden,
        deductions: result.inputTax,
      },
    ],
    [inputs.vatSales, totalBurden, result.inputTax],
  )

  const curveData = useMemo(() => {
    const max = Math.max(inputs.vatSales * 2, 200000)
    const steps = 40
    return Array.from({ length: steps + 1 }, (_, i) => {
      const sales = (max * i) / steps
      const r = calcVat(sales, inputs.vatInput, inputs.vatTaxpayer, inputs.vatRateId)
      return { x: sales, y: r.effectiveBurdenRate }
    })
  }, [inputs.vatSales, inputs.vatInput, inputs.vatTaxpayer, inputs.vatRateId])

  const rates =
    inputs.vatTaxpayer === 'general' ? GENERAL_VAT_RATES : SMALL_VAT_RATES
  const activeRateId = rates.some((r) => r.id === inputs.vatRateId)
    ? inputs.vatRateId
    : rates[0]!.id

  const timelineSteps = useMemo(() => {
    if (inputs.vatTaxpayer === 'general') {
      return [
        {
          title: '确认销售额',
          value: inputs.vatSales.toLocaleString('zh-CN'),
          hint: `销项 = 销售额 × ${(result.rate * 100).toFixed(0)}%`,
        },
        {
          title: '减除进项税额',
          value: `-${result.inputTax.toLocaleString('zh-CN')}`,
        },
        {
          title: '应纳增值税',
          value: result.payable.toLocaleString('zh-CN'),
          active: true,
          footer: `附加税 ¥${surcharges.total.toLocaleString('zh-CN')} · 税负合计 ¥${totalBurden.toLocaleString('zh-CN')}`,
        },
      ]
    }
    return [
      {
        title: '确认月销售额',
        value: inputs.vatSales.toLocaleString('zh-CN'),
        hint: result.isExempt ? result.exemptReason : `征收率 ${(result.rate * 100).toFixed(0)}%`,
      },
      {
        title: '简易计税',
        value: `× ${(result.rate * 100).toFixed(0)}%`,
      },
      {
        title: '应纳增值税',
        value: result.payable.toLocaleString('zh-CN'),
        active: true,
        footer: result.isExempt ? '当前处于免税区间' : `附加税 ¥${surcharges.total.toLocaleString('zh-CN')}`,
      },
    ]
  }, [inputs, result, surcharges.total, totalBurden])

  const controls = (
    <div className="tax-viz-param-card">
      <div className="tax-viz-param-card__head">
        <SlidersHorizontal className="tax-viz-param-card__head-icon size-[18px]" />
        参数配置
      </div>
      <div className="tax-viz-param-card__body">
        <div className="tax-viz-param-tabs">
          {(['small', 'general'] as const).map((t) => (
            <LiquidMetalButton
              key={t}
              type="button"
              onClick={() => setInput('vatTaxpayer', t)}
              className={cn(
                'tax-viz-param-tabs__btn',
                inputs.vatTaxpayer === t && 'tax-viz-param-tabs__btn--active',
              )}
            >
              {t === 'small' ? '小规模' : '一般纳税人'}
            </LiquidMetalButton>
          ))}
        </div>

        <TaxSlider
          label="销售额(不含税,元/月)"
          value={inputs.vatSales}
          min={0}
          max={2000000}
          step={1000}
          onChange={(v) => setInput('vatSales', v)}
          markers={
            inputs.vatTaxpayer === 'small'
              ? [
                  {
                    value: SMALL_MONTHLY_EXEMPTION,
                    label: '免税线',
                    color: 'bg-emerald-500',
                    pulseWhenAtOrBelow: true,
                  },
                ]
              : []
          }
        />

        {inputs.vatTaxpayer === 'general' && (
          <TaxSlider
            label="可抵扣进项税额(元/月)"
            value={inputs.vatInput}
            min={0}
            max={500000}
            step={100}
            onChange={(v) => setInput('vatInput', v)}
            hint="取得增值税专用发票上的金额"
          />
        )}

        <div>
          <div className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            适用税率
          </div>
          <div className="tax-viz-param-tabs">
            {rates.map((r) => (
              <LiquidMetalButton
                key={r.id}
                type="button"
                onClick={() => setInput('vatRateId', r.id)}
                className={cn(
                  'tax-viz-param-tabs__btn',
                  activeRateId === r.id && 'tax-viz-param-tabs__btn--active',
                )}
              >
                {r.label}
              </LiquidMetalButton>
            ))}
          </div>
          <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {rates.find((r) => r.id === activeRateId)?.applicableTo}
          </div>
        </div>
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
          label="预估月度应纳增值税"
          amount={result.payable}
          tone={result.isExempt ? 'saving' : 'tax'}
          caption={`有效税负 ${(result.effectiveBurdenRate * 100).toFixed(2)}%`}
        />
      </div>

      <Card>
        <CardContent className="tax-viz-analysis__chart-card">
          <div className="tax-viz-analysis__chart-head">
            <div className="tax-viz-analysis__chart-title">有效税负率曲线图</div>
            <span className="tax-viz-analysis__chart-badge">
              当前 {(result.effectiveBurdenRate * 100).toFixed(2)}%
            </span>
          </div>
          <EffectiveRateCurve
            data={curveData}
            current={{ x: inputs.vatSales, y: result.effectiveBurdenRate }}
            yFormat="percent"
            xLabel="销售额 (元/月)"
            yLabel="有效税负率"
            yMax={0.15}
            height={280}
          />
          {result.isExempt && result.exemptReason && (
            <div className="tax-viz-exempt-banner mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {result.exemptReason}
            </div>
          )}
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
