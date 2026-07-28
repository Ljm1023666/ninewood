/**
 * 到手 / 税负 / 扣除 堆叠分解
 * 窄柱 + 透明画布,避免「大白块」
 */
import { useId, useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  useTaxChartTheme,
  taxChartValueFmt,
} from '@/constants/tax-chart-theme'

export interface StackDatum {
  name: string
  takeHome: number
  tax: number
  deductions: number
}

interface TakeHomeStackBarProps {
  data: StackDatum[]
  height?: number
}

const fmt = (v: number) =>
  v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v.toLocaleString('zh-CN')

export function TakeHomeStackBar({ data, height = 260 }: TakeHomeStackBarProps) {
  const uid = useId().replace(/:/g, '')
  const { chart, tooltipStyle, tooltipLabelStyle, tooltipItemStyle } = useTaxChartTheme()
  const colored = useMemo(
    () => data.map((d) => ({ ...d, total: d.takeHome + d.tax + d.deductions })),
    [data],
  )

  return (
    <div className="tax-viz-chart tax-viz-chart--stack" style={{ width: '100%', height }}>
      <ResponsiveContainer minWidth={0} initialDimension={{ width: 800, height }}>
        <BarChart
          data={colored}
          margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
          barCategoryGap="42%"
          barGap={4}
        >
          <defs>
            <linearGradient id={`${uid}-take`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f2ca50" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
            </linearGradient>
            <linearGradient id={`${uid}-tax`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#be123c" stopOpacity={0.9} />
            </linearGradient>
            <linearGradient id={`${uid}-ded`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.75} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke={chart.grid}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={chart.tick}
          />
          <YAxis
            tickFormatter={fmt}
            axisLine={false}
            tickLine={false}
            tick={chart.tick}
            width={48}
          />
          <Tooltip
            cursor={{ fill: chart.cursor }}
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            formatter={taxChartValueFmt}
          />
          <Bar
            dataKey="deductions"
            stackId="a"
            fill={`url(#${uid}-ded)`}
            name="扣除"
            maxBarSize={88}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="tax"
            stackId="a"
            fill={`url(#${uid}-tax)`}
            name="税款"
            maxBarSize={88}
          />
          <Bar
            dataKey="takeHome"
            stackId="a"
            fill={`url(#${uid}-take)`}
            name="到手"
            maxBarSize={88}
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="tax-viz-chart-legend" aria-hidden>
        <span className="tax-viz-chart-legend__item">
          <i className="tax-viz-chart-legend__dot tax-viz-chart-legend__dot--take" />
          到手
        </span>
        <span className="tax-viz-chart-legend__item">
          <i className="tax-viz-chart-legend__dot tax-viz-chart-legend__dot--tax" />
          税款
        </span>
        <span className="tax-viz-chart-legend__item">
          <i className="tax-viz-chart-legend__dot tax-viz-chart-legend__dot--ded" />
          扣除
        </span>
      </div>
    </div>
  )
}
