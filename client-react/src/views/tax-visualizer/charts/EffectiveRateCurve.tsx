/**
 * 有效税率曲线
 */
import { useId, useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  useTaxChartTheme,
} from '@/constants/tax-chart-theme'

export interface CurvePoint {
  x: number
  y: number
  label?: string
}

interface EffectiveRateCurveProps {
  data: CurvePoint[]
  current?: { x: number; y: number }
  yFormat?: 'percent' | 'currency'
  xLabel?: string
  yLabel?: string
  height?: number
  yMax?: number
  dashed?: boolean
}

const fmtPercent = (v: number) => `${(v * 100).toFixed(1)}%`
const fmtYuan = (v: number) =>
  v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v.toString()
const fmtX = (v: number) =>
  v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v.toString()

export function EffectiveRateCurve({
  data,
  current,
  yFormat = 'percent',
  xLabel,
  yLabel,
  height = 280,
  yMax,
  dashed = false,
}: EffectiveRateCurveProps) {
  const gradId = useId().replace(/:/g, '')
  const yFormatter = yFormat === 'percent' ? fmtPercent : fmtYuan

  const tickFormatterY = useMemo(() => {
    if (yFormat === 'percent') {  return (v: number) => `${(v * 100).toFixed(0)}%`
    }
    return fmtYuan
  }, [yFormat])

  const axisLabel = (value: string, fill: string) => ({
    value,
    fill,
    fontSize: 11,
  })

  const { chart, tooltipStyle, tooltipLabelStyle, tooltipItemStyle, isDark } =
    useTaxChartTheme()

  const xMax = useMemo(() => {
    const dataMax = data[data.length - 1]?.x ?? 0
    const cur = current?.x ?? 0
    return Math.max(dataMax, cur, 1) * 1.04
  }, [current, data])

  return (
    <div className="tax-viz-chart" style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3388FF" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#3388FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, xMax]}
            scale="linear"
            allowDataOverflow
            tickFormatter={fmtX}
            axisLine={false}
            tickLine={false}
            tick={chart.tick}
            label={
              xLabel
                ? {
                    ...axisLabel(xLabel, chart.axis),
                    position: 'insideBottom',
                    offset: -4,
                  }
                : undefined
            }
          />
          <YAxis
            type="number"
            scale="linear"
            allowDataOverflow
            tickFormatter={tickFormatterY}
            axisLine={false}
            tickLine={false}
            tick={chart.tick}
            width={44}
            domain={[0, yMax ?? (yFormat === 'percent' ? 1 : 'auto')]}
            label={
              yLabel
                ? { ...axisLabel(yLabel, chart.axis), angle: -90, position: 'insideLeft' }
                : undefined
            }
          />
          <Tooltip
            cursor={{ stroke: chart.grid, strokeWidth: 1 }}
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            labelFormatter={(v: number) => `输入 ¥${v.toLocaleString('zh-CN')}`}
            formatter={(value: number) => [yFormatter(value), yLabel ?? '比率']}
          />
          <Area
            type="monotone"
            dataKey="y"
            fill={`url(#${gradId})`}
            stroke="none"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke="#3388FF"
            strokeWidth={2.5}
            strokeDasharray={dashed ? '5 4' : undefined}
            dot={false}
            activeDot={{ r: 5, fill: '#fff', stroke: '#3388FF', strokeWidth: 2 }}
            isAnimationActive={false}
          />
          {current && (
            <ReferenceDot
              x={current.x}
              y={current.y}
              r={8}
              fill="#f2ca50"
              stroke={isDark ? '#0a0e17' : '#f3f2ee'}
              strokeWidth={2}
              isFront
              ifOverflow="extendDomain"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
