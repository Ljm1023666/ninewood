import { cn } from '@/lib/utils'
import { useUserStore } from '@/stores/user'
import {
  LayoutDashboard,
  BarChart3,
  Users,
  ShoppingCart,
  Activity,
  FileText,
  Settings,
  TrendingUp,
  Shield,
  Tag,
  Eye,
  Gauge,
  Server,
} from 'lucide-react'

export interface NavSection {
  label: string
  items: { id: string; label: string; icon: React.ElementType }[]
}

/** 一级导航 */
export const MAIN_NAV = [
  { id: 'overview', label: '总览', icon: LayoutDashboard },
  { id: 'analytics', label: '分析', icon: BarChart3 },
  { id: 'users', label: '用户', icon: Users },
  { id: 'orders', label: '订单', icon: ShoppingCart },
  { id: 'monitoring', label: '监控', icon: Activity },
] as const

export const sidebarConfigs: Record<string, NavSection[]> = {
  overview: [
    {
      label: '数据看板',
      items: [
        { id: 'stats', label: '核心指标', icon: LayoutDashboard },
        { id: 'revenue', label: '营收趋势', icon: TrendingUp },
        { id: 'demands', label: '需求分布', icon: FileText },
        { id: 'orders', label: '最新订单', icon: ShoppingCart },
      ],
    },
  ],
  analytics: [
    {
      label: '分析维度',
      items: [
        { id: 'revenue', label: '营收分析', icon: TrendingUp },
        { id: 'demands', label: '需求分析', icon: FileText },
        { id: 'users', label: '用户增长', icon: Users },
        { id: 'tags', label: '标签热度', icon: Tag },
      ],
    },
  ],
  users: [
    {
      label: '用户管理',
      items: [
        { id: 'all-users', label: '全部用户', icon: Users },
        { id: 'providers', label: '服务者', icon: Settings },
        { id: 'demanders', label: '需求者', icon: Eye },
        { id: 'admins', label: '管理员', icon: Shield },
      ],
    },
  ],
  orders: [
    {
      label: '订单筛选',
      items: [
        { id: 'all-orders', label: '全部订单', icon: ShoppingCart },
        { id: 'pending', label: '待处理', icon: Eye },
        { id: 'in-progress', label: '进行中', icon: Activity },
        { id: 'completed', label: '已完成', icon: FileText },
        { id: 'disputes', label: '争议中', icon: Shield },
      ],
    },
  ],
  monitoring: [
    {
      label: '系统状态',
      items: [
        { id: 'service-status', label: '服务状态', icon: Server },
        { id: 'performance', label: '性能指标', icon: Gauge },
        { id: 'logs', label: '操作日志', icon: FileText },
      ],
    },
  ],
}

/** 某 Tab 下第一个可滚动锚点 */
export function getDefaultSectionId(tabId: string) {
  return sidebarConfigs[tabId]?.[0]?.items[0]?.id ?? ''
}

interface AdminSidebarProps {
  activeTab: string
  activeItem: string
  onNavigate: (tabId: string, itemId: string) => void
  onBack?: () => void
}

export function AdminSidebar({
  activeTab,
  onNavigate,
  onBack,
}: Omit<AdminSidebarProps, 'activeItem'> & { activeItem?: string }) {
  const user = useUserStore((s) => s.user)

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <div className="admin-sidebar__brand-icon">◎</div>
        <div className="min-w-0">
          <p className="admin-sidebar__brand-title">九木监控</p>
          <p className="admin-sidebar__brand-sub">Control Center</p>
        </div>
      </div>

      <nav className="admin-sidebar__nav">
        {MAIN_NAV.map((item) => {
          const active = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id, getDefaultSectionId(item.id))}
              className={cn(
                'admin-sidebar__nav-btn',
                active && 'is-active',
              )}
            >
              <item.icon strokeWidth={1.75} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="admin-sidebar__foot">
        {onBack && (
          <button type="button" onClick={onBack} className="admin-sidebar__back">
            <span aria-hidden>←</span>
            返回应用
          </button>
        )}
        <div className="admin-sidebar__user">
          {user?.avatarUrl ? (
            <div className="admin-sidebar__avatar">
              <img src={user.avatarUrl} alt="" />
            </div>
          ) : (
            <div className="admin-sidebar__avatar">
              {user?.nickname?.charAt(0) || 'A'}
            </div>
          )}
          <div className="min-w-0">
            <p className="admin-sidebar__user-name">
              {user?.nickname || '用户'}
            </p>
            <p className="admin-sidebar__user-phone">
              {user?.phone || '—'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
