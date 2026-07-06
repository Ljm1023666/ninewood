/**
 * 个税场景页 · 方案 B 分析分栏
 */
import { useMemo } from 'react'
import { BarChart3, SlidersHorizontal } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { TaxSlider } from '@/components/tax-ui/TaxSlider'
import { TaxAmountDisplay } from '@/components/tax-ui/TaxAmountDisplay'
import { FundFlowRatioBar } from '@/components/tax-ui/FundFlowRatioBar'
import { TaxFormulaTimeline } from '../panels/TaxFormulaTimeline'
import { ProgressiveBracketsChart } from '../charts/ProgressiveBracketsChart'
import { useTaxVisualizerStore } from '@/stores/tax-visualizer'
import {
  calcComprehensiveAnnualTax,
  calcBusinessAnnualTax,
  calcMonthlySalaryWithholding,
  COMPREHENSIVE_BRACKETS_2026,
  BUSINESS_BRACKETS_2026,
  COMPREHENSIVE_BASIC_DEDUCTION_YEAR,
} from '@/data/tax-rules/personal-income'
import {
  PERSONAL_INCOME_MODE_LABEL,
  type PersonalIncomeMode,
} from '@/constants/tax-visualizer'
import { cn } from '@/lib/utils'

interface PersonalIncomeTaxProps {
  surface?: 'controls' | 'analysis' | 'all'
}

export default function PersonalIncomeTax({ surface = 'all' }: PersonalIncomeTaxProps) {
  const inputs = useTaxVisualizerStore((s) => s.inputs)
  const setInput = useTaxVisualizerStore((s) => s.setInput)
  const mode = useTaxVisualizerStore((s) => s.personalIncomeMode)
  const setMode = useTaxVisualizerStore((s) => s.setPersonalIncomeMode)

  const result = useMemo(() => {
    if (mode === 'salary') {
      return calcMonthlySalaryWithholding(
        inputs.monthlySalary,
        inputs.monthlySocialInsurance,
        inputs.monthlySpecialDeduction,
      )
    }
    if (mode === 'business') {
      return calcBusinessAnnualTax(
        inputs.businessIncome,
        inputs.businessCost,
        inputs.businessLossLoss,
      )
    }
    return calcComprehensiveAnnualTax(
      inputs.totalIncome,
      inputs.socialInsurance,
      inputs.specialDeduction,
      inputs.otherDeduction,
    )
  }, [mode, inputs])

  const stackData = useMemo(() => {
    if (mode === 'salary') {
      return [
        {
          name: '工资薪金',
          takeHome: (result as ReturnType<typeof calcMonthlySalaryWithholding>).monthlyTakeHome,
          tax: (result as ReturnType<typeof calcMonthlySalaryWithholding>).tax,
          deductions: inputs.monthlySocialInsurance,
        },
      ]
    }
    if (mode === 'business') {
      return [
        {
          name: '经营所得',
          takeHome:
            inputs.businessIncome -
            inputs.businessCost -
            (result as ReturnType<typeof calcBusinessAnnualTax>).tax,
          tax: (result as ReturnType<typeof calcBusinessAnnualTax>).tax,
          deductions: inputs.businessCost,
        },
      ]
    }
    return [
      {
        name: '综合所得',
        takeHome:
          inputs.totalIncome -
          (result as ReturnType<typeof calcComprehensiveAnnualTax>).tax,
        tax: (result as ReturnType<typeof calcComprehensiveAnnualTax>).tax,
        deductions:
          COMPREHENSIVE_BASIC_DEDUCTION_YEAR +
          inputs.socialInsurance +
          inputs.specialDeduction +
          inputs.otherDeduction,
      },
    ]
  }, [mode, result, inputs])

  const bracketList =
    mode === 'business' ? BUSINESS_BRACKETS_2026 : COMPREHENSIVE_BRACKETS_2026
  const currentTaxable =
    mode === 'salary'
      ? (result as ReturnType<typeof calcMonthlySalaryWithholding>).monthlyTaxable * 12
      : (result as { taxable: number }).taxable
  /** 图表 Y 轴为年度累计税额,工资模式需年化 */
  const chartCurrentTax = mode === 'salary' ? result.tax * 12 : result.tax
  const incomeLabel =
    mode === 'salary'
      ? '月薪 (元)'
      : mode === 'business'
        ? '经营收入 (元/年)'
        : '年度总收入 (¥)'

  const incomeValue =
    mode === 'salary'
      ? inputs.monthlySalary
      : mode === 'business'
        ? inputs.businessIncome
        : inputs.totalIncome

  const incomeMax =
    mode === 'salary' ? 100000 : mode === 'business' ? 3000000 : 2000000

  const onIncomeChange = (v: number) => {
    if (mode === 'salary') setInput('monthlySalary', v)
    else if (mode === 'business') setInput('businessIncome', v)
    else setInput('totalIncome', v)
  }

  const timelineSteps = useMemo(() => {
    if (mode === 'business') {
      return [
        {
          title: '确认收入额',
          value: inputs.businessIncome.toLocaleString('zh-CN'),
          hint: '经营所得按收入减成本',
        },
        {
          title: '减除成本费用',
          value: `-${inputs.businessCost.toLocaleString('zh-CN')}`,
        },
        {
          title: '应纳税所得额',
          value: currentTaxable.toLocaleString('zh-CN'),
          active: true,
          footer: `结果: ${currentTaxable.toLocaleString('zh-CN')} × ${(result.marginalRate * 100).toFixed(0)}% - ${result.bracketHit.quickDeduction.toLocaleString('zh-CN')} = ¥${result.tax.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`,
        },
      ]
    }
    if (mode === 'salary') {
      return [
        {
          title: '确认月收入',
          value: inputs.monthlySalary.toLocaleString('zh-CN'),
          hint: '累计预扣预缴估算',
        },
        {
          title: '减除社保与专项',
          value: `-${(inputs.monthlySocialInsurance + inputs.monthlySpecialDeduction).toLocaleString('zh-CN')}`,
        },
        {
          title: '应纳税所得额',
          value: currentTaxable.toLocaleString('zh-CN'),
          active: true,
          footer: `月应纳税 ≈ ¥${result.tax.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`,
        },
      ]
    }
    return [
      {
        title: '确认收入额',
        value: inputs.totalIncome.toLocaleString('zh-CN'),
        hint: '综合所得合并计税',
      },
      {
        title: '减除费用及扣除',
        value: `-${(
          COMPREHENSIVE_BASIC_DEDUCTION_YEAR +
          inputs.socialInsurance +
          inputs.specialDeduction +
          inputs.otherDeduction
        ).toLocaleString('zh-CN')}`,
      },
      {
        title: '应纳税所得额',
        value: currentTaxable.toLocaleString('zh-CN'),
        active: true,
        footer: `结果: ${currentTaxable.toLocaleString('zh-CN')} × ${(result.marginalRate * 100).toFixed(0)}% - ${result.bracketHit.quickDeduction.toLocaleString('zh-CN')} = ¥${result.tax.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`,
      },
    ]
  }, [mode, inputs, currentTaxable, result])

  const controls = (
    <div className="tax-viz-param-card">
      <div className="tax-viz-param-card__head">
        <SlidersHorizontal className="tax-viz-param-card__head-icon size-[18px]" />
        参数配置
      </div>
      <div className="tax-viz-param-card__body">
        <div className="tax-viz-param-tabs">
          {(['comprehensive', 'salary', 'business'] as PersonalIncomeMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'tax-viz-param-tabs__btn',
                mode === m && 'tax-viz-param-tabs__btn--active',
              )}
            >
              {PERSONAL_INCOME_MODE_LABEL[m]}
            </button>
          ))}
        </div>

        <TaxSlider
          label={incomeLabel}
          value={incomeValue}
          min={0}
          max={incomeMax}
          step={mode === 'salary' ? 500 : mode === 'business' ? 10000 : 5000}
          onChange={onIncomeChange}
          hint={
            mode === 'comprehensive'
              ? '年综合所得(工资+劳务+稿酬等)'
              : undefined
          }
        />

        {mode === 'comprehensive' && (
          <>
            <TaxSlider
              label="年社保公积金"
              value={inputs.socialInsurance}
              min={0}
              max={100000}
              step={1000}
              onChange={(v) => setInput('socialInsurance', v)}
              hint="个人部分,全额扣除"
            />
            <TaxSlider
              label="年专项附加扣除"
              value={inputs.specialDeduction}
              min={0}
              max={200000}
              step={1000}
              onChange={(v) => setInput('specialDeduction', v)}
              hint={`当前 ¥${inputs.specialDeduction.toLocaleString('zh-CN')}`}
            />
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400">
              免税额 ¥{COMPREHENSIVE_BASIC_DEDUCTION_YEAR.toLocaleString('zh-CN')}
              (5000 × 12)已自动扣除
            </div>
          </>
        )}

        {mode === 'salary' && (
          <>
            <TaxSlider
              label="月社保公积金"
              value={inputs.monthlySocialInsurance}
              min={0}
              max={10000}
              step={100}
              onChange={(v) => setInput('monthlySocialInsurance', v)}
            />
            <TaxSlider
              label="月专项附加"
              value={inputs.monthlySpecialDeduction}
              min={0}
              max={10000}
              step={500}
              onChange={(v) => setInput('monthlySpecialDeduction', v)}
            />
          </>
        )}

        {mode === 'business' && (
          <TaxSlider
            label="年经营成本"
            value={inputs.businessCost}
            min={0}
            max={2000000}
            step={10000}
            onChange={(v) => setInput('businessCost', v)}
            hint="材料/工具/场地/雇工等支出"
          />
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
          label="预估年度应缴个税"
          amount={result.tax}
          tone="tax"
          caption={`有效税率 ${(result.effectiveRate * 100).toFixed(2)}%`}
        />
      </div>

      <Card>
        <CardContent className="tax-viz-analysis__chart-card">
          <div className="tax-viz-analysis__chart-head">
            <div className="tax-viz-analysis__chart-title">边际税率曲线图</div>
            <span className="tax-viz-analysis__chart-badge">
              当前应纳税所得{' '}
              {currentTaxable >= 10000
                ? `${(currentTaxable / 10000).toFixed(1)}万`
                : currentTaxable.toLocaleString('zh-CN')}
              {' · '}
              税额 ¥{chartCurrentTax.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <ProgressiveBracketsChart
            brackets={bracketList}
            currentTaxable={currentTaxable}
            currentTax={chartCurrentTax}
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
