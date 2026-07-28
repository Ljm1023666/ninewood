/**
 * 双主体对比柱图
 */
import { useId } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  useTaxChartTheme,
  taxChartValueFmt,
} from '@/constants/tax-chart-theme'

export interface CompareRow {
  metric: string
  left: number
  right: number
  diff?: number
}

interface CompareSideBySideProps {
  data: CompareRow[]
  leftLabel: string
  rightLabel: string
  leftColor?: string
  rightColor?: string
  height?: number
}

const fmt = (v: number) =>
  v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v.toLocaleString('zh-CN')

export function CompareSideBySide({
  data,
  leftLabel,
  rightLabel,
  leftColor = '#3388FF',
  rightColor = '#10b981',
  height = 260,
}: CompareSideBySideProps) {
  const uid = useId().replace(/:/g, '')
  const { chart, tooltipStyle, tooltipLabelStyle, tooltipItemStyle } = useTaxChartTheme()
  const leftGrad = `${uid}-left`
  const rightGrad = `${uid}-right`

  return (
    <div className="tax-viz-chart" style={{ width: '100%', height }}>
      <ResponsiveContainer minWidth={0} initialDimension={{ width: 800, height }}>
        <BarChart
          data={data}
          margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
          barCategoryGap="24%"
          barGap={8}
        >
          <defs>
            <linearGradient id={leftGrad} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={leftColor} stopOpacity={1} />
              <stop offset="100%" stopColor={leftColor} stopOpacity={0.55} />
            </linearGradient>
            <linearGradient id={rightGrad} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={rightColor} stopOpacity={1} />
              <stop offset="100%" stopColor={rightColor} stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="metric"
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
          <Legend
            wrapperStyle={{
              fontSize: 12,
              paddingTop: 8,
              color: chart.tooltipItem,
            }}
          />
          <Bar
            dataKey="left"
            name={leftLabel}
            fill={`url(#${leftGrad})`}
            radius={[8, 8, 0, 0]}
            maxBarSize={56}
          />
          <Bar
            dataKey="right"
            name={rightLabel}
            fill={`url(#${rightGrad})`}
            radius={[8, 8, 0, 0]}
            maxBarSize={56}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
