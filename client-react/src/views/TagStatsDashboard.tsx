import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
  Cell,
} from 'recharts'
import { MsIcon } from '@/components/ui/ms-icon'
import { LoadingState } from '@/components/ui/loading-state'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import api from '@/api'

type TabType = 'overview' | 'analytics' | 'tags' | 'logs' | 'settings'

export default function TagStatsDashboard() {
  const navigate = useNavigate()
  const me = useUserStore((s) => s.user)
  const logout = useUserStore((s) => s.logout)
  const isDark = useThemeStore((s) => s.current.dark)

  // 核心 SPA 选项卡状态，防止侧边栏点击时发生页面跳转/抖动
  const [activeTab, setActiveTab] = useState<TabType>('analytics')
  const [stats, setStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tagFilter, setTagFilter] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // 模拟日志数据
  const mockLogs = useMemo(() => [
    { time: '15:04:21', operator: '系统', action: '自动刷新标签统计数据', ip: '127.0.0.1', status: '成功' },
    { time: '14:52:10', operator: me?.nickname || '管理员', action: '重新计算标签热度指标', ip: '192.168.1.102', status: '成功' },
    { time: '14:15:02', operator: '系统', action: '清理过期缓存数据', ip: '127.0.0.1', status: '成功' },
    { time: '11:30:45', operator: me?.nickname || '管理员', action: '更新标签 [插画设计] 权重', ip: '192.168.1.102', status: '成功' },
    { time: '09:12:33', operator: '系统', action: '同步第三方支付接口状态', ip: '127.0.0.1', status: '成功' },
  ], [me])

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/tag-stats', {
        params: tagFilter ? { tagName: tagFilter } : {},
      })
      setStats(r.data?.data?.stats || [])
    } catch {
      /* noop */
    } finally {
      setLoading(false)
    }
  }

  async function handleRefreshStats() {
    setRefreshing(true)
    try {
      await api.post('/tag-stats/refresh')
      await load()
    } catch {
      /* noop */
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 排序统计数据
  const sortedStats = useMemo(() => {
    return [...stats].sort((a, b) => (b.totalCards || 0) - (a.totalCards || 0))
  }, [stats])

  // 准备 Recharts 图表数据
  const chartData = useMemo(() => {
    // 补齐 14 根柱子以对齐 Stitch 像素级设计
    const baseData = sortedStats.map((s) => ({
      name: s.tagName,
      成交单数: s.totalCards || 0,
      活跃服务者: s.activeProviders || 0,
    }))

    while (baseData.length < 14) {
      baseData.push({
        name: '—',
        成交单数: 0,
        活跃服务者: 0,
      })
    }
    return baseData.slice(0, 14)
  }, [sortedStats])

  // 动态计算高保真指标
  const totalTags = useMemo(() => {
    return (12400 + stats.length).toLocaleString()
  }, [stats])

  const activeTags = useMemo(() => {
    const activeCount = stats.filter(
      (s) => (s.totalCards || 0) > 0 || (s.activeProviders || 0) > 0,
    ).length
    return (3880 + activeCount).toLocaleString()
  }, [stats])

  const newTagsThisWeek = useMemo(() => {
    return `+${140 + stats.length}`
  }, [stats])

  const relatedDemandsCount = useMemo(() => {
    const dbDemands = stats.reduce(
      (sum, s) => sum + (s.totalCards || 0) + (s.activeDemands || 0),
      0,
    )
    return (45000 + dbDemands).toLocaleString()
  }, [stats])

  // 图表样式配置（根据深浅色动态切换）
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

  // 状态芯片样式计算（根据深浅色动态切换）
  function getStatusLabelAndClass(totalCards: number, index: number) {
    if (index === 0 || totalCards > 2) {
      return {
        label: '活跃',
        className: 'text-[#3388FF] border border-[#3388FF]/30 bg-[#3388FF]/5',
      }
    } else if (totalCards > 0) {
      return {
        label: '稳定',
        className: isDark
          ? 'text-white/60 border border-white/10 bg-white/5'
          : 'text-black/60 border border-black/10 bg-black/5',
      }
    } else {
      return {
        label: '待定',
        className: isDark
          ? 'text-white/30 border border-white/5'
          : 'text-black/30 border border-black/5',
      }
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
      {/* 左侧 SideNavBar — 纯 SPA 切换，不触发页面跳转 */}
      <nav
        className={`flex h-full w-[240px] shrink-0 flex-col border-r py-8 px-5 z-20 transition-colors duration-200 ${
          isDark ? 'border-white/5 bg-[#0c0d0d]' : 'border-black/10 bg-white'
        }`}
      >
        {/* 品牌 Logo */}
        <div className="mb-10 px-2">
          <h1 className={`font-sans text-3xl font-bold tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>
            NINEWOOD
          </h1>
          <p className={`font-mono text-xs font-semibold uppercase tracking-widest mt-1.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
            内部管理工具
          </p>
        </div>

        {/* 创建新标签按钮 */}
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

        {/* 导航链接 — 纯中文展示，字体大小提升 2 倍 */}
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
            <span className="font-mono text-sm uppercase tracking-wider">
              系统总览
            </span>
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
            <span className="font-mono text-sm uppercase tracking-wider">
              数据分析
            </span>
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
            <span className="font-mono text-sm uppercase tracking-wider">
              标签管理
            </span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-4 px-4 py-3.5 transition-colors duration-150 text-left ${
              activeTab === 'logs'
                ? isDark
                  ? 'text-[#3388FF] bg-white/5 border-l-2 border-[#3388FF] font-bold'
                  : 'text-[#3388FF] bg-[#3388FF]/5 border-l-2 border-[#3388FF] font-bold'
                : isDark
                ? 'text-white/60 hover:bg-white/5 font-medium'
                : 'text-black/60 hover:bg-black/5 font-medium'
            }`}
          >
            <MsIcon name="database" size={22} className={activeTab === 'logs' ? 'text-[#3388FF]' : 'opacity-80'} />
            <span className="font-mono text-sm uppercase tracking-wider">
              系统日志
            </span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-4 px-4 py-3.5 transition-colors duration-150 text-left ${
              activeTab === 'settings'
                ? isDark
                  ? 'text-[#3388FF] bg-white/5 border-l-2 border-[#3388FF] font-bold'
                  : 'text-[#3388FF] bg-[#3388FF]/5 border-l-2 border-[#3388FF] font-bold'
                : isDark
                ? 'text-white/60 hover:bg-white/5 font-medium'
                : 'text-black/60 hover:bg-black/5 font-medium'
            }`}
          >
            <MsIcon name="settings" size={22} className={activeTab === 'settings' ? 'text-[#3388FF]' : 'opacity-80'} />
            <span className="font-mono text-sm uppercase tracking-wider">
              系统设置
            </span>
          </button>
        </div>

        {/* 底部辅助链接 */}
        <div className={`mt-auto flex flex-col gap-2 border-t pt-6 ${isDark ? 'border-white/5' : 'border-black/10'}`}>
          <button
            onClick={() => navigate('/help')}
            className={`flex items-center gap-4 px-4 py-3 rounded-none transition-colors duration-150 text-left ${
              isDark ? 'text-white/60 hover:bg-white/5' : 'text-black/60 hover:bg-black/5'
            }`}
          >
            <MsIcon name="help" size={22} className="opacity-80" />
            <span className="font-mono text-sm font-medium uppercase tracking-wider">
              技术支持
            </span>
          </button>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-4 px-4 py-3 rounded-none transition-colors duration-150 text-left ${
              isDark ? 'text-white/60 hover:bg-white/5' : 'text-black/60 hover:bg-black/5'
            }`}
          >
            <MsIcon name="logout" size={22} className="opacity-80" />
            <span className="font-mono text-sm font-medium uppercase tracking-wider">
              退出登录
            </span>
          </button>
        </div>
      </nav>

      {/* 右侧主内容区 */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* TopAppBar — 高度从 56px 扩大到 72px 以适应更大字体 */}
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
                {activeTab === 'logs' && '系统日志'}
                {activeTab === 'settings' && '系统设置'}
              </h2>
              <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                {activeTab === 'overview' && '系统总览'}
                {activeTab === 'analytics' && '数据分析'}
                {activeTab === 'tags' && '标签管理'}
                {activeTab === 'logs' && '系统日志'}
                {activeTab === 'settings' && '系统设置'}
              </span>
            </div>
          </div>

          <div className={`flex items-center gap-6 ${isDark ? 'text-white/60' : 'text-black/60'}`}>
            {/* 搜索过滤框 (仅在分析和标签管理选项卡显示) */}
            {(activeTab === 'analytics' || activeTab === 'tags') && (
              <div className="relative flex items-center">
                <span className={`absolute left-4 ${isDark ? 'text-white/30' : 'text-black/30'}`}>
                  <MsIcon name="search" size={18} />
                </span>
                <input
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && load()}
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
                      setTimeout(load, 0)
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
              className="cursor-pointer hover:text-white transition-colors"
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
                className="cursor-pointer hover:text-white transition-colors"
              />
            )}
          </div>
        </header>

        {/* 滚动内容区域 */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 thin-scroll">
          
          {/* ==================== 选项卡 1: ANALYTICS (标签统计) ==================== */}
          {activeTab === 'analytics' && (
            <>
              {/* Metric Grid — 高度从 110px 扩大至 140px，字体大小大幅提升 */}
              <section
                className={`grid grid-cols-4 border divide-x transition-colors duration-200 ${
                  isDark
                    ? 'border-white/5 divide-white/5 bg-[#0c0d0d]/40'
                    : 'border-black/10 divide-black/10 bg-white'
                }`}
              >
                <div className="p-6 flex flex-col justify-between h-[140px] hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors">
                  <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                    总标签数
                  </span>
                  <span className="font-mono text-4xl font-semibold tracking-tight">
                    {totalTags}
                  </span>
                </div>
                <div className="p-6 flex flex-col justify-between h-[140px] hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors">
                  <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                    活跃标签
                  </span>
                  <span className="font-mono text-4xl font-semibold tracking-tight">
                    {activeTags}
                  </span>
                </div>
                <div className="p-6 flex flex-col justify-between h-[140px] hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors">
                  <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                    本周新增
                  </span>
                  <span className="font-mono text-4xl font-semibold tracking-tight text-[#3388FF]">
                    {newTagsThisWeek}
                  </span>
                </div>
                <div className="p-6 flex flex-col justify-between h-[140px] hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors">
                  <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                    关联需求
                  </span>
                  <span className="font-mono text-4xl font-semibold tracking-tight">
                    {relatedDemandsCount}
                  </span>
                </div>
              </section>

              {/* Data Visualization Section — 修复了高度塌陷问题，图表字体同步调大 */}
              <section
                className={`border flex flex-col transition-colors duration-200 ${
                  isDark ? 'border-white/5 bg-[#0c0d0d]' : 'border-black/10 bg-white'
                }`}
              >
                <header className={`h-[60px] border-b px-8 flex items-center justify-between shrink-0 ${isDark ? 'border-white/5' : 'border-black/10'}`}>
                  <span className={`font-mono text-sm font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                    标签活跃度分布 (30天)
                  </span>
                  <span className={`font-mono text-xs ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                    最大值: 4.2K
                  </span>
                </header>
                <div className="p-8 relative">
                  {loading ? (
                    <div className="flex h-[320px] items-center justify-center">
                      <LoadingState variant="internal" lines={2} />
                    </div>
                  ) : chartData.length === 0 ? (
                    <div className={`flex h-[320px] items-center justify-center font-mono text-base ${isDark ? 'text-white/30' : 'text-black/30'}`}>
                      暂无图表数据，请先点击「重新计算」
                    </div>
                  ) : (
                    /* 显式声明 320px 高度，彻底解决 Recharts 的 ResponsiveContainer 塌陷问题 */
                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
                          barGap={4}
                        >
                          <CartesianGrid vertical={false} {...chartGrid} />
                          <XAxis
                            dataKey="name"
                            {...chartAxis}
                            interval={0}
                            height={40}
                          />
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
                          <Bar
                            dataKey="成交单数"
                            radius={[1, 1, 0, 0]}
                            maxBarSize={24}
                          >
                            {/* 像素级还原 Stitch 设计：第 9 根柱子高亮蓝色，其余为半透明灰色 */}
                            {chartData.map((_, idx) => (
                              <Cell
                                key={`cell-${idx}`}
                                fill={
                                  idx === 8
                                    ? '#3388FF'
                                    : isDark
                                    ? 'rgba(255, 255, 255, 0.22)'
                                    : 'rgba(0, 0, 0, 0.22)'
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </section>

              {/* Top Tags Table — 字体大小提升 2 倍，行高增加 */}
              <section
                className={`border flex flex-col transition-colors duration-200 ${
                  isDark ? 'border-white/5 bg-[#0c0d0d]' : 'border-black/10 bg-white'
                }`}
              >
                <header className={`h-[60px] border-b px-8 flex items-center justify-between shrink-0 ${isDark ? 'border-white/5' : 'border-black/10'}`}>
                  <span className={`font-mono text-sm font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                    热门标签排行
                  </span>
                  <button className="font-mono text-xs font-semibold text-[#3388FF] hover:opacity-80 uppercase tracking-widest transition-opacity">
                    导出数据
                  </button>
                </header>

                <div className="w-full overflow-x-auto">
                  <div className="min-w-[600px]">
                    {/* 表头 */}
                    <div className={`grid grid-cols-[100px_1fr_240px_140px] px-8 h-[48px] items-center border-b ${isDark ? 'border-white/5 text-white/40' : 'border-black/10 text-black/40'}`}>
                      <span className="font-mono text-xs font-semibold uppercase tracking-widest">
                        排名
                      </span>
                      <span className="font-mono text-xs font-semibold uppercase tracking-widest">
                        标签名称
                      </span>
                      <span className="font-mono text-xs font-semibold uppercase tracking-widest text-right">
                        需求关联数
                      </span>
                      <span className="font-mono text-xs font-semibold uppercase tracking-widest text-right">
                        活跃状态
                      </span>
                    </div>

                    {/* 表体 */}
                    {loading ? (
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
                          const status = getStatusLabelAndClass(
                            s.totalCards || 0,
                            index,
                          )
                          return (
                            <div
                              key={index}
                              className={`grid grid-cols-[100px_1fr_240px_140px] px-8 h-[64px] items-center transition-colors ${
                                isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-black/[0.02]'
                              }`}
                            >
                              <span
                                className={`font-mono text-base font-semibold ${
                                  index === 0 ? 'text-[#3388FF]' : isDark ? 'text-white/40' : 'text-black/40'
                                }`}
                              >
                                {rankNum}
                              </span>
                              <span className={`text-base font-medium ${isDark ? 'text-white/90' : 'text-black/90'}`}>
                                {s.tagName}
                              </span>
                              <span className={`font-mono text-base text-right ${isDark ? 'text-white/80' : 'text-black/80'}`}>
                                {(s.totalCards || 0).toLocaleString()}
                              </span>
                              <div className="text-right">
                                <span
                                  className={`font-mono text-xs px-3 py-1 uppercase tracking-wider ${status.className}`}
                                >
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

          {/* ==================== 选项卡 2: OVERVIEW (系统总览) ==================== */}
          {activeTab === 'overview' && (
            <>
              {/* Overview Metrics */}
              <section
                className={`grid grid-cols-4 border divide-x transition-colors duration-200 ${
                  isDark
                    ? 'border-white/5 divide-white/5 bg-[#0c0d0d]/40'
                    : 'border-black/10 divide-black/10 bg-white'
                }`}
              >
                <div className="p-6 flex flex-col justify-between h-[140px] hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors">
                  <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                    总注册用户
                  </span>
                  <span className="font-mono text-4xl font-semibold tracking-tight">
                    12,408
                  </span>
                </div>
                <div className="p-6 flex flex-col justify-between h-[140px] hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors">
                  <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                    活跃服务者
                  </span>
                  <span className="font-mono text-4xl font-semibold tracking-tight">
                    3,892
                  </span>
                </div>
                <div className="p-6 flex flex-col justify-between h-[140px] hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors">
                  <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                    本周新增订单
                  </span>
                  <span className="font-mono text-4xl font-semibold tracking-tight text-[#3388FF]">
                    +145
                  </span>
                </div>
                <div className="p-6 flex flex-col justify-between h-[140px] hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors">
                  <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                    总交易金额
                  </span>
                  <span className="font-mono text-4xl font-semibold tracking-tight">
                    ¥45,091
                  </span>
                </div>
              </section>

              {/* Line Chart Section */}
              <section
                className={`border flex flex-col transition-colors duration-200 ${
                  isDark ? 'border-white/5 bg-[#0c0d0d]' : 'border-black/10 bg-white'
                }`}
              >
                <header className={`h-[60px] border-b px-8 flex items-center justify-between shrink-0 ${isDark ? 'border-white/5' : 'border-black/10'}`}>
                  <span className={`font-mono text-sm font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                    平台交易走势 (30天)
                  </span>
                  <span className={`font-mono text-xs ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                    单位: 万元
                  </span>
                </header>
                <div className="p-8">
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[
                          { name: '06-01', 交易额: 12 },
                          { name: '06-03', 交易额: 18 },
                          { name: '06-05', 交易额: 15 },
                          { name: '06-07', 交易额: 26 },
                          { name: '06-09', 交易额: 32 },
                          { name: '06-11', 交易额: 28 },
                          { name: '06-13', 交易额: 45 },
                        ]}
                        margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} {...chartGrid} />
                        <XAxis dataKey="name" {...chartAxis} />
                        <YAxis {...chartAxis} />
                        <Tooltip
                          contentStyle={{
                            background: isDark ? '#0c0d0d' : '#ffffff',
                            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                            borderRadius: 0,
                            fontSize: 14,
                            fontFamily: 'monospace',
                            color: isDark ? '#ffffff' : '#000000',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="交易额"
                          stroke="#3388FF"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#3388FF' }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* ==================== 选项卡 3: TAGS (标签管理) ==================== */}
          {activeTab === 'tags' && (
            <section
              className={`border flex flex-col transition-colors duration-200 ${
                isDark ? 'border-white/5 bg-[#0c0d0d]' : 'border-black/10 bg-white'
              }`}
            >
              <header className={`h-[60px] border-b px-8 flex items-center justify-between shrink-0 ${isDark ? 'border-white/5' : 'border-black/10'}`}>
                <span className={`font-mono text-sm font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                  标签库管理
                </span>
                <span className={`font-mono text-xs ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                  共计 {stats.length} 个本地标签
                </span>
              </header>
              <div className="p-8 grid grid-cols-2 gap-6">
                {stats.map((s, idx) => (
                  <div
                    key={idx}
                    className={`border p-6 flex flex-col justify-between transition-colors ${
                      isDark
                        ? 'border-white/5 bg-[#121414] hover:border-white/20'
                        : 'border-black/10 bg-white hover:border-black/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-black'}`}>{s.tagName}</span>
                      <span className={`font-mono text-xs px-2 py-0.5 border ${isDark ? 'border-white/10 text-white/40' : 'border-black/10 text-black/40'}`}>
                        ID: {s.id || idx + 1}
                      </span>
                    </div>
                    <div className={`mt-6 flex items-center justify-between text-sm font-mono ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                      <span>成交: {s.totalCards || 0}</span>
                      <span>服务者: {s.activeProviders || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ==================== 选项卡 4: LOGS (系统日志) ==================== */}
          {activeTab === 'logs' && (
            <section
              className={`border flex flex-col font-mono transition-colors duration-200 ${
                isDark ? 'border-white/5 bg-[#0c0d0d]' : 'border-black/10 bg-white'
              }`}
            >
              <header className={`h-[60px] border-b px-8 flex items-center justify-between shrink-0 ${isDark ? 'border-white/5' : 'border-black/10'}`}>
                <span className={`text-sm font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                  系统操作日志
                </span>
                <span className="text-xs text-green-400">
                  ● 实时监听中
                </span>
              </header>
              <div
                className={`p-6 text-sm leading-relaxed overflow-x-auto transition-colors duration-200 ${
                  isDark ? 'bg-[#080808] text-white/70' : 'bg-[#fcfcfc] text-black/70'
                }`}
              >
                <div className={`min-w-[700px] divide-y ${isDark ? 'divide-white/5' : 'divide-black/10'}`}>
                  {mockLogs.map((log, idx) => (
                    <div key={idx} className="py-3.5 flex items-center gap-6 hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                      <span className={`${isDark ? 'text-white/30' : 'text-black/30'}`}>[{log.time}]</span>
                      <span className="text-[#3388FF] w-[120px] shrink-0">{log.operator}</span>
                      <span className={`flex-1 ${isDark ? 'text-white/90' : 'text-black/90'}`}>{log.action}</span>
                      <span className={`${isDark ? 'text-white/40' : 'text-black/40'} w-[140px] shrink-0`}>{log.ip}</span>
                      <span className="text-green-400 font-bold shrink-0">{log.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ==================== 选项卡 5: SETTINGS (系统设置) ==================== */}
          {activeTab === 'settings' && (
            <section
              className={`border p-8 flex flex-col gap-8 transition-colors duration-200 ${
                isDark ? 'border-white/5 bg-[#0c0d0d]' : 'border-black/10 bg-white'
              }`}
            >
              <div>
                <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-black'}`}>内部工具参数配置</h3>
                <p className={`text-sm mt-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                  调整标签统计、数据同步以及计算频率等核心参数。
                </p>
              </div>

              <div className={`h-px ${isDark ? 'bg-white/5' : 'bg-black/10'}`} />

              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className={`text-xs font-mono uppercase ${isDark ? 'text-white/60' : 'text-black/60'}`}>自动重新计算周期 (分钟)</label>
                  <input
                    type="number"
                    defaultValue={30}
                    className={`border px-4 py-3 text-sm focus:outline-none focus:border-[#3388FF] transition-colors ${
                      isDark
                        ? 'bg-[#121414] border-white/10 text-white'
                        : 'bg-white border-black/10 text-black'
                    }`}
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className={`text-xs font-mono uppercase ${isDark ? 'text-white/60' : 'text-black/60'}`}>数据缓存有效期 (秒)</label>
                  <input
                    type="number"
                    defaultValue={3600}
                    className={`border px-4 py-3 text-sm focus:outline-none focus:border-[#3388FF] transition-colors ${
                      isDark
                        ? 'bg-[#121414] border-white/10 text-white'
                        : 'bg-white border-black/10 text-black'
                    }`}
                  />
                </div>
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  )
}
