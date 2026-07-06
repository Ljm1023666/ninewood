/**
 * 累进阶梯曲线图
 */
import { useId, useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Bracket } from '@/data/tax-rules/personal-income'
import { calcProgressiveTax } from '@/data/tax-rules/personal-income'
import {
  useTaxChartTheme,
} from '@/constants/tax-chart-theme'

interface ProgressiveBracketsChartProps {
  brackets: Bracket[]
  currentTaxable?: number
  currentTax?: number
  height?: number
}

interface ChartPoint {
  x: number
  y: number
  label?: string
  isBreakpoint?: boolean
}

const formatY = (v: number) => {
  if (v >= 10000) return `${(v / 10000).toFixed(0)}万`
  return v.toString()
}

const formatX = (v: number) => {
  if (v >= 10000) return `${(v / 10000).toFixed(0)}万`
  return v.toString()
}

const axisLabel = (value: string, fill: string) => ({
  value,
  fill,
  fontSize: 11,
})

export function ProgressiveBracketsChart({
  brackets,
  currentTaxable,
  currentTax,
  height = 320,
}: ProgressiveBracketsChartProps) {
  const gradId = useId().replace(/:/g, '')
  const { chart, tooltipStyle, tooltipLabelStyle, tooltipItemStyle } = useTaxChartTheme()

  const data = useMemo<ChartPoint[]>(() => {
    const points: ChartPoint[] = [{ x: 0, y: 0, isBreakpoint: false }]
    for (let i = 0; i < brackets.length; i++) {
      const b = brackets[i]
      const nextThreshold = brackets[i + 1]?.threshold ?? b.threshold + 100000
      const upper = nextThreshold
      const taxAtUpper = Math.max(0, upper * b.rate - b.quickDeduction)
      points.push({ x: upper, y: taxAtUpper, label: b.label, isBreakpoint: true })
    }
    return points
  }, [brackets])

  const currentPoint = useMemo(() => {
    if (currentTaxable === undefined || currentTaxable < 0) return null
    const taxOnCurve =
      currentTax ?? calcProgressiveTax(currentTaxable, brackets).tax
    return { x: currentTaxable, y: taxOnCurve }
  }, [brackets, currentTax, currentTaxable])

  const xMax = useMemo(() => {
    const dataMax = data[data.length - 1]?.x ?? 0
    const cur = currentPoint?.x ?? 0
    return Math.max(dataMax, cur, 1) * 1.04
  }, [currentPoint, data])

  const yMax = useMemo(() => {
    const dataMax = data[data.length - 1]?.y ?? 0
    const cur = currentPoint?.y ?? 0
    return Math.max(dataMax, cur, 1) * 1.08
  }, [currentPoint, data])

  const markerData = currentPoint ? [currentPoint] : []

  return (
    <div className="tax-viz-chart" style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 20, left: 4, bottom: 8 }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3388FF" stopOpacity={0.28} />
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
            tickFormatter={formatX}
            axisLine={false}
            tickLine={false}
            tick={chart.tick}
            label={{
              ...axisLabel('应纳税所得额 (元)', chart.axis),
              position: 'insideBottom',
              offset: -4,
            }}
          />
          <YAxis
            type="number"
            domain={[0, yMax]}
            scale="linear"
            allowDataOverflow
            tickFormatter={formatY}
            axisLine={false}
            tickLine={false}
            tick={chart.tick}
            width={44}
            label={{
              ...axisLabel('累计税额 (元)', chart.axis),
              angle: -90,
              position: 'insideLeft',
            }}
          />
          <Tooltip
            cursor={{ stroke: chart.grid, strokeWidth: 1 }}
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            labelFormatter={(v: number) => `收入 ¥${v.toLocaleString('zh-CN')}`}
            formatter={(value: number, _name: string, item: { payload?: ChartPoint }) => [
              `税额 ¥${Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`,
              item.payload?.label ?? '税额',
            ]}
          />
          <Area
            type="linear"
            dataKey="y"
            fill={`url(#${gradId})`}
            stroke="none"
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="y"
            stroke="#3388FF"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#3388FF', stroke: '#0a0e17', strokeWidth: 1.5 }}
            activeDot={{ r: 6, fill: '#fff', stroke: '#3388FF', strokeWidth: 2 }}
            isAnimationActive={false}
          />
          {currentPoint && (
            <>
              <ReferenceArea
                x1={0}
                x2={currentPoint.x}
                y1={0}
                y2={yMax}
                fill="#f2ca50"
                fillOpacity={0.1}
                strokeOpacity={0}
                ifOverflow="extendDomain"
              />
              <ReferenceLine
                x={currentPoint.x}
                stroke="#f2ca50"
                strokeDasharray="4 3"
                strokeWidth={2}
                ifOverflow="extendDomain"
                label={{
                  value: '当前',
                  position: 'top',
                  fill: '#f2ca50',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
              <ReferenceDot
                x={currentPoint.x}
                y={currentPoint.y}
                r={8}
                fill="#f2ca50"
                stroke="#0a0e17"
                strokeWidth={2}
                ifOverflow="extendDomain"
                isFront
              />
              <Scatter
                data={markerData}
                dataKey="y"
                fill="#f2ca50"
                isAnimationActive={false}
                legendType="none"
                shape="circle"
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
