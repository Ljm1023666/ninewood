import { Search } from 'lucide-react'
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DashboardData } from './use-admin-data'
import {
  AdminMetricGrid,
  AdminMetricTile,
  AdminPanel,
  AdminEmpty,
  AdminMetricSkeleton,
  AdminPanelSkeleton,
  AdminSearchInput,
  ADMIN_CHART_COLORS,
  adminChartTooltipStyle,
} from './admin-ui'

export interface AdminUsersTabProps {
  data: DashboardData | null
  loading: boolean
  activeItem?: string
}

interface AdminUser {
  id: string
  phone: string
  nickname: string
  avatarUrl?: string | null
  certificationLevel: string
  role: string
  isBusy: boolean
  points: number
  createdAt: string
}

export default function AdminUsersTab({ data, loading }: AdminUsersTabProps) {
  const [q, setQ] = useState('')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL')

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const params: any = {}
      if (q.trim()) params.q = q.trim()
      if (roleFilter !== 'ALL') params.role = roleFilter
      const r = await api.get('/admin/users', { params })
      setUsers((r.data as any)?.data?.items || [])
    } catch (e: any) {
      toast(e?.response?.data?.message || '加载用户失败', 'error')
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [roleFilter])
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-10 w-72 bg-zinc-200" />
        <AdminMetricSkeleton count={3} />
        <AdminPanelSkeleton />
      </div>
    )
  }

  if (!data) return null

  const { overview, userGrowthTrend } = data
  const demanders = Math.max(overview.userCount - overview.providerCount, 0)
  const roleData = [
    { name: '服务者', value: overview.providerCount },
    { name: '需求者', value: demanders },
  ].filter((d) => d.value > 0)

  const growthSpark = (userGrowthTrend || []).slice(-6).map((r, i) => ({
    idx: i + 1,
    users: r.users,
    newUsers: r.newUsers,
  }))

  return (
    <div className="space-y-6">
      <p className="font-[family-name:var(--admin-mono)] text-[10px] uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
        用户管理
      </p>

      <div className="flex items-center gap-3 max-w-[600px]">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--admin-text-muted)]" />
          <AdminSearchInput
            placeholder="搜索用户（nickname / phone）"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as any)}
          className="border border-[var(--admin-hairline)] bg-[var(--admin-card-bg)] px-3 py-2.5 text-sm text-[var(--admin-text)] outline-none"
        >
          <option value="ALL">全部角色</option>
          <option value="USER">普通用户</option>
          <option value="ADMIN">管理员</option>
        </select>
        <button
          type="button"
          onClick={loadUsers}
          disabled={usersLoading}
          className="border border-[var(--admin-hairline)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--admin-text)] transition-colors hover:bg-black/[0.02] disabled:opacity-50"
        >
          {usersLoading ? '加载中' : '查询'}
        </button>
      </div>

      <AdminMetricGrid cols={3}>
        <AdminMetricTile label="总用户数" value={overview.userCount} />
        <AdminMetricTile label="活跃服务者" value={overview.providerCount} />
        <AdminMetricTile label="需求者估算" value={demanders} />
      </AdminMetricGrid>

      <div className="grid grid-cols-2 gap-px border border-[var(--admin-hairline)] bg-[var(--admin-hairline)]">
        <div id="admin-section-all-users" className="min-h-[260px] bg-[var(--admin-card-bg)] p-5">
          <h3 className="mb-4 text-[13px] font-semibold text-[var(--admin-text)]">
            用户角色分布
          </h3>
          <div className="h-[180px]">
            {roleData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={78}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {roleData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={ADMIN_CHART_COLORS[i % ADMIN_CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={adminChartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmpty title="暂无用户数据" />
            )}
          </div>
          <div className="mt-3 flex justify-center gap-6 font-[family-name:var(--admin-mono)] text-[10px] text-[var(--admin-text-secondary)]">
            {roleData.map((r, i) => (
              <span key={r.name} className="flex items-center gap-1.5">
                <span
                  className="size-2"
                  style={{ background: ADMIN_CHART_COLORS[i] }}
                />
                {r.name} {r.value}
              </span>
            ))}
          </div>
        </div>

        <div id="admin-section-demanders" className="min-h-[260px] bg-[var(--admin-card-bg)] p-5">
          <h3 className="mb-4 text-[13px] font-semibold text-[var(--admin-text)]">
            需求者分布
          </h3>
          <div className="flex h-[180px] flex-col items-center justify-center font-mono text-sm text-[var(--admin-text-muted)]">
            <span className="text-2xl text-[var(--admin-text)] tabular-nums">{demanders.toLocaleString('zh-CN')}</span>
            <span className="mt-2 text-xs">需求者估算（总用户 - 服务者）</span>
          </div>
        </div>

        <div id="admin-section-admins" className="min-h-[260px] bg-[var(--admin-card-bg)] p-5">
          <h3 className="mb-4 text-[13px] font-semibold text-[var(--admin-text)]">
            用户增长曲线
          </h3>
          <div className="h-[200px]">
            {growthSpark.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthSpark} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3388FF" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3388FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip contentStyle={adminChartTooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#3388FF"
                    strokeWidth={2}
                    fill="url(#userGrowthGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmpty title="暂无增长数据" />
            )}
          </div>
        </div>
      </div>

      <AdminPanel
        title="用户列表"
        description={`共 ${users.length} 个结果（${roleFilter === 'ALL' ? '全部角色' : roleFilter}）`}
        noPadding
        bodyClassName="p-0"
      >
        {users.length === 0 ? (
          <div className="p-5">
            <AdminEmpty title="暂无匹配用户" description={q ? `关键字：${q}` : '请调整查询条件'} />
          </div>
        ) : (
          <div className="divide-y divide-[var(--admin-hairline)]">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex size-8 shrink-0 items-center justify-center border border-[var(--admin-hairline)] bg-[var(--admin-card-bg)] font-mono text-xs">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" className="size-full object-cover" />
                  ) : (
                    u.nickname?.charAt(0) || '?'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--admin-text)]">
                    {u.nickname}
                    {u.role === 'ADMIN' && (
                      <span className="ml-2 border border-amber-300 px-1.5 py-0.5 font-mono text-[10px] text-amber-600">ADMIN</span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--admin-text-muted)]">
                    {u.phone} · {u.certificationLevel} · 点数 {u.points.toLocaleString('zh-CN')}
                  </p>
                </div>
                <span className="font-mono text-[10px] text-[var(--admin-text-muted)]">
                  {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
