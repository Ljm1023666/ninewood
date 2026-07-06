/**
 * 资金流向比例 · 方案 B 横向堆叠条
 */
import { cn } from '@/lib/utils'
import type { StackDatum } from '@/views/tax-visualizer/charts/TakeHomeStackBar'

interface FundFlowRatioBarProps {
  data: StackDatum[]
  className?: string
}

const fmt = (v: number) => v.toLocaleString('zh-CN', { maximumFractionDigits: 0 })

export function FundFlowRatioBar({ data, className }: FundFlowRatioBarProps) {
  const row = data[0]
  if (!row) return null

  const total = Math.max(row.takeHome + row.tax + row.deductions, 1)
  const takePct = Math.round((row.takeHome / total) * 100)
  const dedPct = Math.round((row.deductions / total) * 100)
  const taxPct = Math.max(0, 100 - takePct - dedPct)

  return (
    <div className={cn('tax-viz-flow-bar', className)}>
      <h3 className="tax-viz-flow-bar__title">资金流向比例</h3>
      <div className="tax-viz-flow-bar__track">
        {takePct > 0 && (
          <div
            className="tax-viz-flow-bar__seg tax-viz-flow-bar__seg--take"
            style={{ width: `${takePct}%`, transition: 'width 0.28s ease' }}
          >
            <span>税后收入 {takePct}%</span>
          </div>
        )}
        {dedPct > 0 && (
          <div
            className="tax-viz-flow-bar__seg tax-viz-flow-bar__seg--ded"
            style={{ width: `${dedPct}%`, transition: 'width 0.28s ease' }}
          >
            <span>免税/扣除 {dedPct}%</span>
          </div>
        )}
        {taxPct > 0 && (
          <div
            className="tax-viz-flow-bar__seg tax-viz-flow-bar__seg--tax"
            style={{ width: `${taxPct}%`, transition: 'width 0.28s ease' }}
          >
            <span>税额 {taxPct}%</span>
          </div>
        )}
      </div>
      <div className="tax-viz-flow-bar__legend">
        <div className="tax-viz-flow-bar__legend-item">
          <i className="tax-viz-flow-bar__dot tax-viz-flow-bar__dot--take" />
          <span>
            ¥{fmt(row.takeHome)} <span className="tax-viz-flow-bar__legend-hint">净收入</span>
          </span>
        </div>
        <div className="tax-viz-flow-bar__legend-item">
          <i className="tax-viz-flow-bar__dot tax-viz-flow-bar__dot--ded" />
          <span>
            ¥{fmt(row.deductions)} <span className="tax-viz-flow-bar__legend-hint">扣除项</span>
          </span>
        </div>
        <div className="tax-viz-flow-bar__legend-item">
          <i className="tax-viz-flow-bar__dot tax-viz-flow-bar__dot--tax" />
          <span>
            ¥{fmt(row.tax)} <span className="tax-viz-flow-bar__legend-hint">应缴税金</span>
          </span>
        </div>
      </div>
    </div>
  )
}
