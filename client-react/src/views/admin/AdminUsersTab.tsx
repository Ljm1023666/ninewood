import { Search, Users, Shield, Eye } from 'lucide-react'
import type { DashboardData } from './use-admin-data'
import {
  AdminMetricCard,
  AdminPanel,
  AdminEmpty,
  AdminMetricSkeleton,
} from './admin-ui'

export interface AdminUsersTabProps {
  data: DashboardData | null
  loading: boolean
  activeItem?: string
}

export default function AdminUsersTab({ data, loading }: AdminUsersTabProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-10 w-72 rounded-lg bg-zinc-200" />
        <AdminMetricSkeleton count={3} />
        <div className="animate-pulse h-64 rounded-xl border border-[var(--admin-border)] bg-white" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--admin-text-muted)]" />
        <input
          type="text"
          placeholder="搜索用户..."
          className="w-full rounded-lg border border-[var(--admin-border)] bg-white py-2.5 pl-10 pr-4 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <AdminMetricCard
          icon={Users}
          label="总用户数"
          value={data.overview.userCount}
          accent="blue"
        />
        <AdminMetricCard
          icon={Shield}
          label="活跃服务者"
          value={data.overview.providerCount}
          accent="teal"
        />
        <AdminMetricCard
          icon={Eye}
          label="需求总数"
          value={data.overview.demandCount}
          accent="orange"
        />
      </div>

      <AdminPanel title="用户列表" description="完整用户管理功能即将上线">
        <AdminEmpty
          title="用户管理功能开发中"
          description="当前可查看上方汇总指标，详细列表敬请期待"
        />
      </AdminPanel>
    </div>
  )
}
