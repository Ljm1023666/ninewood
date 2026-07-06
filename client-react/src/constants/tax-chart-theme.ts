/** Recharts 图表主题（随全局 data-appearance 深/浅色） */
import { type CSSProperties, type ReactNode } from 'react'
import { useThemeStore } from '@/stores/theme'

export const TAX_CHART_DARK = {
  grid: 'rgba(255, 255, 255, 0.07)',
  axis: 'rgba(255, 255, 255, 0.45)',
  tick: { fill: 'rgba(255, 255, 255, 0.55)', fontSize: 12 },
  tooltipBg: 'rgba(8, 12, 20, 0.96)',
  tooltipBorder: 'rgba(212, 175, 55, 0.22)',
  tooltipLabel: '#f5f5f5',
  tooltipItem: '#e2e8f0',
  cursor: 'rgba(255, 255, 255, 0.04)',
} as const

export const TAX_CHART_LIGHT = {
  grid: 'rgba(0, 0, 0, 0.1)',
  axis: 'rgba(0, 0, 0, 0.55)',
  tick: { fill: 'rgba(0, 0, 0, 0.72)', fontSize: 13 },
  tooltipBg: 'rgba(255, 255, 255, 0.98)',
  tooltipBorder: 'rgba(180, 83, 9, 0.28)',
  tooltipLabel: '#0f0f0f',
  tooltipItem: '#1f1f1f',
  cursor: 'rgba(0, 0, 0, 0.04)',
} as const

/** @deprecated 请用 useTaxChartTheme */
export const TAX_CHART = TAX_CHART_DARK

export function useTaxChartTheme() {
  const isDark = useThemeStore((s) => s.current.dark)
  const chart = isDark ? TAX_CHART_DARK : TAX_CHART_LIGHT

  const tooltipStyle: CSSProperties = {
    background: chart.tooltipBg,
    border: `1px solid ${chart.tooltipBorder}`,
    borderRadius: 12,
    fontSize: 13,
    padding: '10px 12px',
    boxShadow: isDark
      ? '0 12px 32px rgba(0, 0, 0, 0.45)'
      : '0 8px 24px rgba(0, 0, 0, 0.1)',
  }

  const tooltipLabelStyle: CSSProperties = {
    color: chart.tooltipLabel,
    fontWeight: 600,
    marginBottom: 6,
  }

  const tooltipItemStyle: CSSProperties = {
    color: chart.tooltipItem,
    fontSize: isDark ? 12 : 13,
    padding: '2px 0',
  }

  return { chart, tooltipStyle, tooltipLabelStyle, tooltipItemStyle, isDark }
}

export const taxChartTooltipStyle: CSSProperties = {
  background: TAX_CHART_DARK.tooltipBg,
  border: `1px solid ${TAX_CHART_DARK.tooltipBorder}`,
  borderRadius: 12,
  fontSize: 13,
  padding: '10px 12px',
  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
}

export const taxChartTooltipLabelStyle: CSSProperties = {
  color: TAX_CHART_DARK.tooltipLabel,
  fontWeight: 600,
  marginBottom: 6,
}

export const taxChartTooltipItemStyle: CSSProperties = {
  color: TAX_CHART_DARK.tooltipItem,
  fontSize: 12,
  padding: '2px 0',
}

export function taxChartValueFmt(value: number, name: string): [ReactNode, string] {
  return [
    `¥${Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`,
    name,
  ]
}
