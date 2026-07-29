import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { MsIcon } from '@/components/ui/ms-icon'
import { useCircleHub } from './circle-hub-context'
import { circleApi } from '@/api/circle'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

const ENGAGEMENT_FALLBACK = [
  { name: '发布需求', value: 1, color: '#abc7ff' },
  { name: '评论互动', value: 1, color: '#458fff' },
  { name: '浏览流水', value: 1, color: '#32353c' },
]

const chartTooltip = {
  contentStyle: {
    background: 'rgba(28, 32, 39, 0.9)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#e0e2ec',
    fontSize: 12,
  },
}

function formatDateLabel(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}

type AnalyticsDto = {
  range: { start: string; end: string }
  kpis: {
    memberCount: number
    memberGrowthPct: number | null
    activeRate: number
    activeRateDelta: number | null
    weekDemands: number
    weekDemandsDelta: number | null
    interactions: number
    interactionsDelta: number | null
  }
  memberGrowthSeries: Array<{ offsetDay: number; label: string; date: string; value: number }>
  weeklyDemandSeries: Array<{ weekday: string; count: number }>
  engagement: Array<{ name: string; value: number; color: string }>
}

export default function CircleHubAnalytics() {
  const { circle, memberCount, demands } = useCircleHub()
  const [analytics, setAnalytics] = useState<AnalyticsDto | null>(null)
  const [analyticsError, setAnalyticsError] = useState('')

  useEffect(() => {
    if (!circle) return
    let cancelled = false
    circleApi
      .getAnalytics(circle.id, '30d')
      .then((res) => {
        if (cancelled) return
        setAnalytics(res.data.data as AnalyticsDto)
      })
      .catch((err) => {
        if (cancelled) return
        setAnalyticsError((err as { response?: { data?: { message?: string } } }).response?.data?.message || '加载失败')
      })
    return () => {
      cancelled = true
    }
  }, [circle])

  const kpis = analytics?.kpis
  const memberGrowthData = analytics?.memberGrowthSeries || []
  const weeklyDemandData = analytics?.weeklyDemandSeries || []
  const engagement = analytics?.engagement && analytics.engagement.length > 0 ? analytics.engagement : ENGAGEMENT_FALLBACK

  const rangeStart = analytics?.range.start || formatDateLabel(new Date(Date.now() - 29 * 86400000))
  const rangeEnd = analytics?.range.end || formatDateLabel(new Date())
  const weekMonday = (() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const wd = today.getDay()
    const diff = wd === 0 ? -6 : 1 - wd
    const m = new Date(today)
    m.setDate(today.getDate() + diff)
    return formatDateLabel(m)
  })()

  if (!circle) return null

  const demandCount = demands.length
  const memberGrowth = kpis?.memberGrowthPct
  const activeRate = kpis?.activeRate ?? 0
  const activeRateDelta = kpis?.activeRateDelta
  const weekDemandsKpi = kpis?.weekDemands ?? demandCount
  const interactions = kpis?.interactions ?? 0
  const interactionsDelta = kpis?.interactionsDelta
  const rangeCaption = '过去 30 天 路 起始 ' + rangeStart
  const pickerCaption = '最近 30 天 路 ' + rangeStart + ' 起'
  const weekCaption = '本周 路 ' + weekMonday + ' 起'

  const growthSign = (memberGrowth == null) ? '—' : (memberGrowth >= 0 ? '+' : '') + memberGrowth + '%'
  const activeDeltaText = (activeRateDelta == null) ? '—' : (activeRateDelta >= 0 ? '+' : '') + activeRateDelta + '%'
  const weekDeltaText = (kpis?.weekDemandsDelta == null) ? '—' : String(kpis.weekDemandsDelta)
  const interDeltaText = (interactionsDelta == null) ? '—' : (interactionsDelta >= 0 ? '+' : '') + interactionsDelta

  return (
    <div className="cdb-main-inner cdb-hub-page">
      <div className="cdb-hub-analytics-head">
        <div>
          <h2 className="cdb-hub-page-title cdb-hub-analytics-title">
            <MsIcon name="insights" size={28} className="cdb-text-primary" aria-hidden />
            分析数据
          </h2>
          <p className="cdb-text-muted cdb-text-body-sm">
            {circle.name} - 社区数据速览
            {analyticsError ? <span style={{ color: '#e85a4f' }}> · {analyticsError}</span> : null}
          </p>
        </div>
      </div>

      <div className="cdb-hub-analytics-split">
        <div className="cdb-hub-analytics-main">
          <div className="cdb-hub-kpi-row">
            <div className="cdb-glass-card cdb-hub-kpi">
              <span className="cdb-label-caps">总成员数</span>
              <div className="cdb-hub-kpi-value">
                <span className="cdb-hub-stat-num">{kpis?.memberCount ?? memberCount ?? 1}</span>
                <span className="cdb-hub-stat-delta cdb-hub-stat-delta--up">
                  <MsIcon name="trending_up" size={14} aria-hidden />
                  {growthSign}
                </span>
              </div>
            </div>
            <div className="cdb-glass-card cdb-hub-kpi">
              <span className="cdb-label-caps">活跃度</span>
              <div className="cdb-hub-kpi-value">
                <span className="cdb-hub-stat-num">{activeRate}%</span>
                <span className="cdb-hub-stat-delta cdb-hub-stat-delta--up">
                  <MsIcon name="trending_up" size={14} aria-hidden />
                  {activeDeltaText}
                </span>
              </div>
            </div>
            <div className="cdb-glass-card cdb-hub-kpi">
              <span className="cdb-label-caps">本周需求</span>
              <div className="cdb-hub-kpi-value">
                <span className="cdb-hub-stat-num">{weekDemandsKpi}</span>
                <span className="cdb-hub-stat-delta cdb-hub-stat-delta--down">
                  <MsIcon name="trending_down" size={14} aria-hidden />
                  {weekDeltaText}
                </span>
              </div>
            </div>
            <div className="cdb-glass-card cdb-hub-kpi">
              <span className="cdb-label-caps">互动量</span>
              <div className="cdb-hub-kpi-value">
                <span className="cdb-hub-stat-num">{interactions}</span>
                <span className="cdb-hub-stat-delta cdb-hub-stat-delta--up">
                  <MsIcon name="trending_up" size={14} aria-hidden />
                  {interDeltaText}
                </span>
              </div>
            </div>
          </div>

          <section className="cdb-glass-card cdb-hub-chart-card cdb-hub-chart-card--line">
            <div className="cdb-hub-chart-card-head">
              <div>
                <h3 className="cdb-hub-card-title">成员成长趋势</h3>
                <p className="cdb-text-muted cdb-hub-chart-sub">{rangeCaption}</p>
                <p className="cdb-text-muted cdb-hub-chart-sub cdb-hub-chart-sub--dim">
                  截止 {rangeEnd}
                </p>
              </div>
              <LiquidMetalButton type="button" className="cdb-hub-icon-btn" aria-label="更多">
                <MsIcon name="more_horiz" size={18} aria-hidden />
              </LiquidMetalButton>
            </div>
            <div className="cdb-hub-chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={memberGrowthData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#c1c6d6', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis tick={{ fill: '#c1c6d6', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    {...chartTooltip}
                    labelFormatter={(_label: any, payload: any) => {
                      const row = payload && payload[0] && payload[0].payload
                      return row && row.date ? row.date + '（第 ' + row.label + '）' : String(_label)
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#abc7ff"
                    strokeWidth={3}
                    dot={{ fill: '#1c2027', stroke: '#abc7ff', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <div className="cdb-hub-analytics-side">
          <div className="cdb-glass-card cdb-hub-date-picker">
            <LiquidMetalButton type="button" className="cdb-hub-icon-btn" aria-label="上一段">
              <MsIcon name="chevron_left" size={18} aria-hidden />
            </LiquidMetalButton>
            <div className="cdb-hub-date-label">
              <MsIcon name="calendar_today" size={18} className="cdb-text-primary" aria-hidden />
              <span>{pickerCaption}</span>
            </div>
            <LiquidMetalButton type="button" className="cdb-hub-icon-btn" aria-label="下一段">
              <MsIcon name="chevron_right" size={18} aria-hidden />
            </LiquidMetalButton>
          </div>

          <section className="cdb-glass-card cdb-hub-chart-card">
            <div className="cdb-hub-chart-card-head">
              <div>
                <h3 className="cdb-hub-card-title">每周需求量</h3>
                <p className="cdb-text-muted cdb-hub-chart-sub">{weekCaption}</p>
              </div>
              <span className="cdb-hub-chip">分类</span>
            </div>
            <div className="cdb-hub-chart-area cdb-hub-chart-area--sm">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklyDemandData}
                  margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
                  barCategoryGap="18%"
                >
                  <XAxis
                    dataKey="weekday"
                    tick={{ fill: '#c1c6d6', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    padding={{ left: 12, right: 12 }}
                  />
                  <YAxis hide />
                  <Tooltip {...chartTooltip} />
                  <Bar dataKey="count" fill="#458fff" radius={[4, 4, 0, 0]} maxBarSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="cdb-glass-card cdb-hub-chart-card cdb-hub-donut-card">
            <div className="cdb-hub-chart-card-head">
              <h3 className="cdb-hub-card-title">参与度分布</h3>
              <MsIcon name="pie_chart" size={18} className="cdb-text-muted" aria-hidden />
            </div>
            <div className="cdb-hub-donut-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={engagement}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={82}
                    paddingAngle={2}
                    stroke="#1c2027"
                    strokeWidth={2}
                  >
                    {engagement.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltip} />
                </PieChart>
              </ResponsiveContainer>
              <div className="cdb-hub-donut-center">
                <span className="cdb-hub-stat-num">{activeRate || 85}%</span>
                <span className="cdb-label-caps">活跃用户</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
