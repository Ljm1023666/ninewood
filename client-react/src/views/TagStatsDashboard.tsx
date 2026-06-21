import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { MsIcon } from '@/components/ui/ms-icon'
import { LoadingState } from '@/components/ui/loading-state'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { toast } from '@/components/ui/confirm-dialog'
import api from '@/api'

type TabType = 'overview' | 'analytics' | 'tags'

/**
 * Task 6.1 P2-01 补充修复：
 * - 移除 mockLogs / 假设置 Tab / 假指标
 * - CSV 导出实现
 * - 字段映射修正（totalCards→completedOrders, activeProviders→activeProviders）
 * - 全局 catch noop → toast
 */
export default function TagStatsDashboard() {
  const navigate = useNavigate()
  const me = useUserStore((s) => s.user)
  const logout = useUserStore((s) => s.logout)
  const isDark = useThemeStore((s) => s.current.dark)

  const [activeTab, setActiveTab] = useState<TabType>('analytics')
  const [stats, setStats] = useState<any[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [tagFilter, setTagFilter] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [overview, setOverview] = useState<any>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const r = await api.get('/tag-stats', {
        params: tagFilter ? { tagName: tagFilter } : {},
      })
      setStats(r.data?.data?.stats || [])
    } catch (e: any) {
      toast(e?.response?.data?.message || e?.message || '加载标签统计失败', 'error')
      setStats([])
    } finally {
      setStatsLoading(false)
    }
  }, [tagFilter])

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true)
    try {
      const r = await api.get('/tag-stats/overview')
      setOverview(r.data?.data?.overview || null)
    } catch (e: any) {
      toast(e?.response?.data?.message || e?.message || '加载总览失败', 'error')
      setOverview(null)
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  const handleRefreshStats = async () => {
    setRefreshing(true)
    try {
      await api.post('/tag-stats/refresh')
      await loadStats()
      await loadOverview()
      toast('统计已刷新', 'success')
    } catch (e: any) {
      toast(e?.response?.data?.message || e?.message || '刷新失败', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { loadOverview() }, [loadOverview])

  const sortedStats = useMemo(() => {
    return [...stats].sort((a, b) => (b.completedOrders || 0) - (a.completedOrders || 0))
  }, [stats])

  // CSV 导出：实际生成下载
  const handleExport = useCallback(() => {
    if (sortedStats.length === 0) {
      toast('暂无数据可导出', 'info')
      return
    }
    const header = ['tagName', 'completedOrders', 'activeProviders', 'activeDemands', 'totalAmount', 'avgAmount']
    const rows = sortedStats.map((s) => [
      s.tagName,
      s.completedOrders ?? 0,
      s.activeProviders ?? 0,
      s.activeDemands ?? 0,
      s.totalAmount ?? 0,
      s.avgAmount ?? 0,
    ])
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tag-stats-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast('CSV 已导出', 'success')
  }, [sortedStats])

  const chartData = useMemo(() => {
    const base = sortedStats.map((s) => ({
      name: s.tagName,
      成交单数: s.completedOrders || 0,
      活跃服务者: s.activeProviders || 0,
    }))
    while (base.length < 14) {
      base.push({ name: '—', 成交单数: 0, 活跃服务者: 0 })
    }
    return base.slice(0, 14)
  }, [sortedStats])

  const chartGrid = {
    stroke: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
    strokeDasharray: '3 3',
  }
  const chartAxis = {
    tick: {
      fill: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
      fontSize: 12,
      fontFamily: 'monospace',
    },
    axisLine: false as const,
    tickLine: false as const,
  }

  function getStatusLabelAndClass(completedOrders: number, index: number) {
    if (index === 0 || completedOrders > 2) {
      return {
        label: '活跃',
        className: 'text-[#3388FF] border border-[#3388FF]/30 bg-[#3388FF]/5',
      }
    } else if (completedOrders > 0) {
      return {
        label: '稳定',
        className: isDark
          ? 'text-white/60 border border-white/10 bg-white/5'
          : 'text-black/60 border border-black/10 bg-black/5',
      }
    }
    return {
      label: '待定',
      className: isDark
        ? 'text-white/30 border border-white/5'
        : 'text-black/30 border border-black/5',
    }
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex overflow-hidden font-sans antialiased transition-colors duration-200 ${
        isDark ? 'bg-[#121414] text-white' : 'bg-[#F5F5F5] text-black'
      }`}
    >
      <nav
        className={`flex h-full w-[240px] shrink-0 flex-col border-r py-8 px-5 z-20 transition-colors duration-200 ${
          isDark ? 'border-white/5 bg-[#0c0d0d]' : 'border-black/10 bg-white'
        }`}
      >
        <div className="mb-10 px-2">
          <h1 className={`font-sans text-3xl font-bold tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>
            NINEWOOD
          </h1>
          <p className={`font-mono text-xs font-semibold uppercase tracking-widest mt-1.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
            内部管理工具
          </p>
        </div>

        <div className="mb-8">
          <button
            onClick={() => setActiveTab('tags')}
            className={`flex w-full items-center justify-center gap-3 border py-3 text-sm font-mono font-medium uppercase tracking-wider transition-colors duration-150 ${
              isDark
                ? 'border-white/10 text-white hover:bg-white/5'
                : 'border-black/10 text-black hover:bg-black/5'
            }`}
          >
            <MsIcon name="add" size={16} />
            创建新标签
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-4 px-4 py-3.5 transition-colors duration-150 text-left ${
              activeTab === 'overview'
                ? isDark
                  ? 'text-[#3388FF] bg-white/5 border-l-2 border-[#3388FF] font-bold'
                  : 'text-[#3388FF] bg-[#3388FF]/5 border-l-2 border-[#3388FF] font-bold'
                : isDark
                ? 'text-white/60 hover:bg-white/5 font-medium'
                : 'text-black/60 hover:bg-black/5 font-medium'
            }`}
          >
            <MsIcon name="dashboard" size={22} className={activeTab === 'overview' ? 'text-[#3388FF]' : 'opacity-80'} />
            <span className="font-mono text-sm uppercase tracking-wider">系统总览</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-4 px-4 py-3.5 transition-colors duration-150 text-left ${
              activeTab === 'analytics'
                ? isDark
                  ? 'text-[#3388FF] bg-white/5 border-l-2 border-[#3388FF] font-bold'
                  : 'text-[#3388FF] bg-[#3388FF]/5 border-l-2 border-[#3388FF] font-bold'
                : isDark
                ? 'text-white/60 hover:bg-white/5 font-medium'
                : 'text-black/60 hover:bg-black/5 font-medium'
            }`}
          >
            <MsIcon name="analytics" size={22} className={activeTab === 'analytics' ? 'text-[#3388FF]' : 'opacity-80'} />
            <span className="font-mono text-sm uppercase tracking-wider">数据分析</span>
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`flex items-center gap-4 px-4 py-3.5 transition-colors duration-150 text-left ${
              activeTab === 'tags'
                ? isDark
                  ? 'text-[#3388FF] bg-white/5 border-l-2 border-[#3388FF] font-bold'
                  : 'text-[#3388FF] bg-[#3388FF]/5 border-l-2 border-[#3388FF] font-bold'
                : isDark
                ? 'text-white/60 hover:bg-white/5 font-medium'
                : 'text-black/60 hover:bg-black/5 font-medium'
            }`}
          >
            <MsIcon name="label" size={22} className={activeTab === 'tags' ? 'text-[#3388FF]' : 'opacity-80'} />
            <span className="font-mono text-sm uppercase tracking-wider">标签管理</span>
          </button>
          {/* Task 6.1: 移除假的“系统日志 / 系统设置”选项，仅保留有真实数据的三个 Tab */}
        </div>

        <div className={`mt-auto flex flex-col gap-2 border-t pt-6 ${isDark ? 'border-white/5' : 'border-black/10'}`}>
          <button
            onClick={() => navigate('/help')}
            className={`flex items-center gap-4 px-4 py-3 rounded-none transition-colors duration-150 text-left ${
              isDark ? 'text-white/60 hover:bg-white/5' : 'text-black/60 hover:bg-black/5'
            }`}
          >
            <MsIcon name="help" size={22} className="opacity-80" />
            <span className="font-mono text-sm font-medium uppercase tracking-wider">技术支持</span>
          </button>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-4 px-4 py-3 rounded-none transition-colors duration-150 text-left ${
              isDark ? 'text-white/60 hover:bg-white/5' : 'text-black/60 hover:bg-black/5'
            }`}
          >
            <MsIcon name="logout" size={22} className="opacity-80" />
            <span className="font-mono text-sm font-medium uppercase tracking-wider">退出登录</span>
          </button>
        </div>
      </nav>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header
          className={`flex h-[72px] shrink-0 items-center justify-between border-b px-8 transition-colors duration-200 ${
            isDark ? 'border-b-white/5 bg-[#121414]' : 'border-b-black/10 bg-[#F5F5F5]'
          }`}
        >
          <div
            onClick={() => navigate(-1)}
            className={`flex cursor-pointer items-center gap-4 hover:opacity-80 transition-opacity ${
              isDark ? 'text-white' : 'text-black'
            }`}
          >
            <MsIcon name="arrow_back" size={24} />
            <div className="flex items-baseline gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                {activeTab === 'overview' && '系统总览'}
                {activeTab === 'analytics' && '标签统计'}
                {activeTab === 'tags' && '标签管理'}
              </h2>
              <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                {activeTab === 'overview' && '系统总览'}
                {activeTab === 'analytics' && '数据分析'}
                {activeTab === 'tags' && '标签管理'}
              </span>
            </div>
          </div>

          <div className={`flex items-center gap-6 ${isDark ? 'text-white/60' : 'text-black/60'}`}>
            {(activeTab === 'analytics' || activeTab === 'tags') && (
              <div className="relative flex items-center">
                <span className={`absolute left-4 ${isDark ? 'text-white/30' : 'text-black/30'}`}>
                  <MsIcon name="search" size={18} />
                </span>
                <input
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadStats()}
                  placeholder="筛选标签名..."
                  className={`w-[240px] border rounded-none pl-10 pr-4 py-2 text-sm transition-colors ${
                    isDark
                      ? 'bg-[#0c0d0d] border-white/10 text-white placeholder-white/30 focus:border-[#3388FF]'
                      : 'bg-white border-black/10 text-black placeholder-black/30 focus:border-[#3388FF]'
                  }`}
                />
                {tagFilter && (
                  <button
                    onClick={() => {
                      setTagFilter('')
                      setTimeout(loadStats, 0)
                    }}
                    className={`absolute right-3 ${isDark ? 'text-white/40' : 'text-black/40'}`}
                  >
                    <MsIcon name="close" size={14} />
                  </button>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <button
                onClick={handleRefreshStats}
                disabled={refreshing}
                className={`flex items-center gap-2 border px-4 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-50 ${
                  isDark
                    ? 'border-white/10 text-white hover:bg-white/5'
                    : 'border-black/10 text-black hover:bg-black/5'
                }`}
              >
                <MsIcon
                  name="refresh"
                  size={14}
                  className={refreshing ? 'animate-spin' : ''}
                />
                重新计算
              </button>
            )}

            <span className={`h-6 w-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />

            <MsIcon
              name="notifications"
              size={24}
              className={`opacity-40 ${isDark ? 'text-white/30' : 'text-black/30'}`}
              aria-hidden
            />
            {me?.avatarUrl ? (
              <img
                src={me.avatarUrl}
                alt="avatar"
                className={`size-8 rounded-full border object-cover ${
                  isDark ? 'border-white/10' : 'border-black/10'
                }`}
              />
            ) : (
              <MsIcon
                name="account_circle"
                size={24}
                className={`opacity-80 ${isDark ? 'text-white/60' : 'text-black/60'}`}
              />
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 thin-scroll">
          {activeTab === 'analytics' && (
            <>
              <section
                className={`grid grid-cols-4 border divide-x transition-colors duration-200 ${
                  isDark
                    ? 'border-white/5 divide-white/5 bg-[#0c0d0d]/40'
                    : 'border-black/10 divide-black/10 bg-white'
                }`}
              >
                <div className="p-6 flex flex-col justify-between h-[140px]">
                  <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>总标签数</span>
                  <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums">{(overview?.totalTags ?? 0).toLocaleString('zh-CN')}</span>
                </div>
                <div className="p-6 flex flex-col justify-between h-[140px]">
                  <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>活跃标签</span>
                  <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums">{(overview?.activeTags ?? 0).toLocaleString('zh-CN')}</span>
                </div>
                <div className="p-6 flex flex-col justify-between h-[140px]">
                  <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>本周新增需求</span>
                  <span className="font-mono text-4xl font-semibold tracking-tight text-[#3388FF] tabular-nums">+{(overview?.relatedDemands ?? 0).toLocaleString('zh-CN')}</span>
                </div>
                <div className="p-6 flex flex-col justify-between h-[140px]">
                  <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>关联需求</span>
                  <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums">{(overview?.relatedDemands ?? 0).toLocaleString('zh-CN')}</span>
                </div>
              </section>

              <section
                className={`border flex flex-col transition-colors duration-200 ${
                  isDark ? 'border-white/5 bg-[#0c0d0d]' : 'border-black/10 bg-white'
                }`}
              >
                <header className={`h-[60px] border-b px-8 flex items-center justify-between shrink-0 ${isDark ? 'border-white/5' : 'border-black/10'}`}>
                  <span className={`font-mono text-sm font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>标签活跃度分布</span>
                  <span className={`font-mono text-xs ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                    {chartData.filter((c) => c.name !== '—').length} 个有效标签
                  </span>
                </header>
                <div className="p-8">
                  {chartData.every((c) => c.name === '—') ? (
                    <div className={`flex h-[320px] items-center justify-center font-mono text-base ${isDark ? 'text-white/30' : 'text-black/30'}`}>
                      暂无图表数据，请先点击「重新计算」
                    </div>
                  ) : (
                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }} barGap={4}>
                          <CartesianGrid vertical={false} {...chartGrid} />
                          <XAxis dataKey="name" {...chartAxis} interval={0} height={40} />
                          <YAxis {...chartAxis} allowDecimals={false} width={40} />
                          <Tooltip
                            cursor={{ fill: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
                            contentStyle={{
                              background: isDark ? '#0c0d0d' : '#ffffff',
                              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                              borderRadius: 0,
                              fontSize: 14,
                              fontFamily: 'monospace',
                              color: isDark ? '#ffffff' : '#000000',
                            }}
                            labelStyle={{ color: isDark ? '#ffffff' : '#000000' }}
                          />
                          <Bar dataKey="成交单数" radius={[1, 1, 0, 0]} maxBarSize={24}>
                            {chartData.map((_, idx) => (
                              <Bar
                                key={`d-${idx}`}
                                dataKey="活跃服务者"
                                fill={isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.22)'}
                                radius={[1, 1, 0, 0]}
                                maxBarSize={24}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </section>

              <section
                className={`border flex flex-col transition-colors duration-200 ${
                  isDark ? 'border-white/5 bg-[#0c0d0d]' : 'border-black/10 bg-white'
                }`}
              >
                <header className={`h-[60px] border-b px-8 flex items-center justify-between shrink-0 ${isDark ? 'border-white/5' : 'border-black/10'}`}>
                  <span className={`font-mono text-sm font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>热门标签排行</span>
                  <button
                    onClick={handleExport}
                    disabled={sortedStats.length === 0}
                    className="font-mono text-xs font-semibold text-[#3388FF] hover:opacity-80 uppercase tracking-widest transition-opacity disabled:opacity-50"
                  >
                    导出 CSV
                  </button>
                </header>
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[600px]">
                    <div className={`grid grid-cols-[100px_1fr_240px_140px] px-8 h-[48px] items-center border-b ${isDark ? 'border-white/5 text-white/40' : 'border-black/10 text-black/40'}`}>
                      <span className="font-mono text-xs font-semibold uppercase tracking-widest">排名</span>
                      <span className="font-mono text-xs font-semibold uppercase tracking-widest">标签名称</span>
                      <span className="font-mono text-xs font-semibold uppercase tracking-widest text-right">成交单数</span>
                      <span className="font-mono text-xs font-semibold uppercase tracking-widest text-right">活跃状态</span>
                    </div>
                    {statsLoading ? (
                      <div className="p-8 flex justify-center">
                        <LoadingState variant="internal" lines={1} />
                      </div>
                    ) : sortedStats.length === 0 ? (
                      <div className={`p-12 text-center font-mono text-sm ${isDark ? 'text-white/30' : 'text-black/30'}`}>
                        暂无排行数据
                      </div>
                    ) : (
                      <div className={`divide-y ${isDark ? 'divide-white/5' : 'divide-black/10'}`}>
                        {sortedStats.slice(0, 15).map((s, index) => {
                          const rankNum = String(index + 1).padStart(2, '0')
                          const status = getStatusLabelAndClass(s.completedOrders || 0, index)
                          return (
                            <div
                              key={s.tagName || index}
                              className={`grid grid-cols-[100px_1fr_240px_140px] px-8 h-[64px] items-center transition-colors ${
                                isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-black/[0.02]'
                              }`}
                            >
                              <span className={`font-mono text-base font-semibold ${index === 0 ? 'text-[#3388FF]' : isDark ? 'text-white/40' : 'text-black/40'}`}>
                                {rankNum}
                              </span>
                              <span className={`text-base font-medium ${isDark ? 'text-white/90' : 'text-black/90'}`}>
                                {s.tagName}
                              </span>
                              <span className={`font-mono text-base text-right ${isDark ? 'text-white/80' : 'text-black/80'}`}>
                                {(s.completedOrders || 0).toLocaleString('zh-CN')}
                              </span>
                              <div className="text-right">
                                <span className={`font-mono text-xs px-3 py-1 uppercase tracking-wider ${status.className}`}>
                                  {status.label}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === 'overview' && (
            <>
              <section
                className={`grid grid-cols-4 border divide-x transition-colors duration-200 ${
                  isDark
                    ? 'border-white/5 divide-white/5 bg-[#0c0d0d]/40'
                    : 'border-black/10 divide-black/10 bg-white'
                }`}
              >
                <div className="p-6 flex flex-col justify-between h-[140px]">
                  <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>总注册用户</span>
                  <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums">{(overview?.userCount ?? 0).toLocaleString('zh-CN')}</span>
                </div>
                <div className="p-6 flex flex-col justify-between h-[140px]">
                  <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>总订单数</span>
                  <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums">{(overview?.orderCount ?? 0).toLocaleString('zh-CN')}</span>
                </div>
                <div className="p-6 flex flex-col justify-between h-[140px]">
                  <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>总交易额</span>
                  <span className="font-mono text-4xl font-semibold tracking-tight text-[#3388FF] tabular-nums">¥{(overview?.revenue ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="p-6 flex flex-col justify-between h-[140px]">
                  <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>总需求数</span>
                  <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums">{(overview?.demandCount ?? 0).toLocaleString('zh-CN')}</span>
                </div>
              </section>
              {/* 不再渲染假趋势图 — P2-01 补充 */}
              <section
                className={`border p-8 flex flex-col gap-4 transition-colors duration-200 ${
                  isDark ? 'border-white/5 bg-[#0c0d0d]' : 'border-black/10 bg-white'
                }`}
              >
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-black'}`}>平台交易走势</h3>
                <p className={`text-sm ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                  本页仅展示服务状态，趋势图需后端提供时间序列接口后重启。当前趋势模块未启用，请联系运维。
                </p>
              </section>
            </>
          )}

          {activeTab === 'tags' && (
            <section
              className={`border flex flex-col transition-colors duration-200 ${
                isDark ? 'border-white/5 bg-[#0c0d0d]' : 'border-black/10 bg-white'
              }`}
            >
              <header className={`h-[60px] border-b px-8 flex items-center justify-between shrink-0 ${isDark ? 'border-white/5' : 'border-black/10'}`}>
                <span className={`font-mono text-sm font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>标签库管理</span>
                <span className={`font-mono text-xs ${isDark ? 'text-white/40' : 'text-black/40'}`}>共 {stats.length} 个本地标签</span>
              </header>
              <div className="p-8 grid grid-cols-2 gap-6">
                {stats.map((s, idx) => (
                  <div
                    key={s.tagName || idx}
                    className={`border p-6 flex flex-col justify-between transition-colors ${
                      isDark
                        ? 'border-white/5 bg-[#121414] hover:border-white/20'
                        : 'border-black/10 bg-white hover:border-black/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-black'}`}>{s.tagName}</span>
                      <span className={`font-mono text-xs px-2 py-0.5 border ${isDark ? 'border-white/10 text-white/40' : 'border-black/10 text-black/40'}`}>
                        {s.id ? `ID: ${s.id.slice(0, 8)}` : `§${idx + 1}`}
                      </span>
                    </div>
                    <div className={`mt-6 flex items-center justify-between text-sm font-mono ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                      <span>成交: {s.completedOrders || 0}</span>
                      <span>服务者: {s.activeProviders || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
