/**
 * 双主体对比模式 · VS 舞台
 */
import { useMemo } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { TaxAmountDisplay } from '@/components/tax-ui/TaxAmountDisplay'
import { TaxFormulaCard } from '../panels/TaxFormulaCard'
import { CompareSideBySide } from '../charts/CompareSideBySide'
import { useTaxVisualizerStore } from '@/stores/tax-visualizer'
import { subjectVisualHex } from '@/constants/tax-visualizer'
import { SUBJECT_BY_ID, type SubjectId } from '@/data/tax-rules/subjects'
import {
  calcComprehensiveAnnualTax,
  calcMonthlySalaryWithholding,
  calcBusinessAnnualTax,
} from '@/data/tax-rules/personal-income'
import { calcVat, calcVatSurcharges } from '@/data/tax-rules/vat'
import { calcCorporateTax } from '@/data/tax-rules/corporate-income'
import { cn } from '@/lib/utils'

const fmt = (v: number) => Math.round(v).toLocaleString('zh-CN')

interface SubjectCalcResult {
  tax: number
  totalBurden: number
  base: number
  description: string
}

function calcForSubject(
  subjectId: SubjectId,
  inputs: ReturnType<typeof useTaxVisualizerStore.getState>['inputs'],
  taxType: string,
): SubjectCalcResult {
  if (taxType === 'personal-income') {
    const s = SUBJECT_BY_ID[subjectId]
    if (s.id === 'individual-salary') {
      const r = calcMonthlySalaryWithholding(
        inputs.monthlySalary,
        inputs.monthlySocialInsurance,
        inputs.monthlySpecialDeduction,
      )
      return {
        tax: r.tax,
        totalBurden: r.tax,
        base: r.monthlyTaxable,
        description: '工资薪金(月度)',
      }
    }
    if (s.id === 'individual-labor' || s.id === 'small-business') {
      const r = calcBusinessAnnualTax(
        inputs.businessIncome,
        inputs.businessCost,
        inputs.businessLossLoss,
      )
      return {
        tax: r.tax,
        totalBurden: r.tax,
        base: r.taxable,
        description: '经营所得(年度)',
      }
    }
    const r = calcComprehensiveAnnualTax(
      inputs.totalIncome,
      inputs.socialInsurance,
      inputs.specialDeduction,
      inputs.otherDeduction,
    )
    return {
      tax: r.tax,
      totalBurden: r.tax,
      base: r.taxable,
      description: '综合所得(年度)',
    }
  }

  if (taxType === 'vat') {
    const s = SUBJECT_BY_ID[subjectId]
    const taxpayer = s.id === 'small-business' ? 'small' : 'general'
    const rateId = taxpayer === 'small' ? '3' : '13'
    const r = calcVat(inputs.vatSales, inputs.vatInput, taxpayer, rateId)
    const sur = calcVatSurcharges(r.payable)
    return {
      tax: r.payable,
      totalBurden: r.payable + sur.total,
      base: inputs.vatSales,
      description: taxpayer === 'small' ? '小规模(3% 征收率)' : '一般纳税人(13%)',
    }
  }

  const s = SUBJECT_BY_ID[subjectId]
  const regime =
    s.id === 'small-business' ? 'smallMicro' : 'standard'
  const r = calcCorporateTax(inputs.corporateTaxable, regime)
  return {
    tax: r.tax,
    totalBurden: r.tax,
    base: inputs.corporateTaxable,
    description: regime === 'smallMicro' ? '小型微利优惠' : '标准 25%',
  }
}

export default function CompareMode() {
  const taxType = useTaxVisualizerStore((s) => s.taxType)
  const leftId = useTaxVisualizerStore((s) => s.currentSubject)
  const rightId = useTaxVisualizerStore((s) => s.compareSubject)
  const inputs = useTaxVisualizerStore((s) => s.inputs)

  const left = useMemo(
    () => (rightId ? calcForSubject(leftId, inputs, taxType) : null),
    [leftId, rightId, inputs, taxType],
  )
  const right = useMemo(
    () => (rightId ? calcForSubject(rightId, inputs, taxType) : null),
    [rightId, inputs, taxType],
  )

  if (!rightId || !left || !right) {
    return (
      <div className="rounded-xl border border-border bg-bg-secondary/50 px-4 py-10 text-center text-sm text-muted-foreground">
        请在主体选择器中勾选第二个主体,开启 VS 对比
      </div>
    )
  }

  const leftSubject = SUBJECT_BY_ID[leftId]
  const rightSubject = SUBJECT_BY_ID[rightId]
  const leftHex = subjectVisualHex(leftSubject.color)
  const rightHex = subjectVisualHex(rightSubject.color)
  const diff = left.tax - right.tax
  const taxTypeLabel =
    taxType === 'personal-income'
      ? '个人所得税'
      : taxType === 'vat'
        ? '增值税'
        : '企业所得税'

  return (
    <div className="flex flex-col gap-4">
      <div className="tax-viz-vs tax-viz-vs--enter p-5">
        <div className="tax-viz-vs__bg" aria-hidden>
          <div
            className="tax-viz-vs__bg-left"
            style={{
              background: `radial-gradient(circle at 0% 50%, ${leftHex}33 0%, transparent 70%)`,
            }}
          />
          <div
            className="tax-viz-vs__bg-right"
            style={{
              background: `radial-gradient(circle at 100% 50%, ${rightHex}33 0%, transparent 70%)`,
            }}
          />
        </div>

        <div className="relative z-[1]">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">
              {taxTypeLabel} · 双主体对比
            </div>
            <div
              className={cn(
                'tax-viz-vs__diff flex items-center gap-1',
                diff > 0 ? 'text-rose-400' : diff < 0 ? 'text-emerald-400' : 'text-muted-foreground',
              )}
            >
              {diff > 0 ? (
                <ArrowUp className="size-4" aria-hidden />
              ) : diff < 0 ? (
                <ArrowDown className="size-4" aria-hidden />
              ) : null}
              {diff > 0 ? '+' : ''}¥{fmt(diff)}
            </div>
          </div>

          <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="text-center">
              <div
                className="mx-auto mb-2 size-2.5 rounded-full"
                style={{ backgroundColor: leftHex, boxShadow: `0 0 12px ${leftHex}` }}
              />
              <div className="text-xs font-semibold text-foreground">{leftSubject.name}</div>
              <div className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
                ¥{fmt(left.tax)}
              </div>
            </div>
            <div className="tax-viz-vs__badge">VS</div>
            <div className="text-center">
              <div
                className="mx-auto mb-2 size-2.5 rounded-full"
                style={{ backgroundColor: rightHex, boxShadow: `0 0 12px ${rightHex}` }}
              />
              <div className="text-xs font-semibold text-foreground">{rightSubject.name}</div>
              <div className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
                ¥{fmt(right.tax)}
              </div>
            </div>
          </div>

          <CompareSideBySide
            data={[
              { metric: '税基', left: left.base, right: right.base },
              { metric: '税额', left: left.tax, right: right.tax },
              { metric: '税负总额', left: left.totalBurden, right: right.totalBurden },
            ]}
            leftLabel={leftSubject.name}
            rightLabel={rightSubject.name}
            leftColor={leftHex}
            rightColor={rightHex}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[leftSubject, rightSubject].map((subject, i) => {
          const data = i === 0 ? left : right
          const hex = subjectVisualHex(subject.color)
          return (
            <Card key={subject.id}>
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-center gap-2">
                  <div
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: hex, boxShadow: `0 0 8px ${hex}` }}
                  />
                  <div className="text-sm font-semibold text-foreground">{subject.name}</div>
                </div>
                <TaxAmountDisplay label="税额" amount={data.tax} tone="tax" />
                <div className="text-xs text-muted-foreground">{data.description}</div>
                <TaxFormulaCard
                  title="计算"
                  formula={`税额 ≈ ¥${fmt(data.tax)}`}
                  steps={[`税基 ¥${fmt(data.base)}`]}
                  emphasis="tax"
                />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
