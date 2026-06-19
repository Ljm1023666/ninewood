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
  ChevronLeft,
  Radio,
} from 'lucide-react'
import { useState } from 'react'

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
  const [collapsed, setCollapsed] = useState(false)
  const user = useUserStore((s) => s.user)

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col self-stretch border-r border-white/[0.06] bg-[var(--admin-sidebar-bg)] text-white transition-[width] duration-200',
        collapsed ? 'w-[68px]' : 'w-[248px]',
      )}
    >
      {/* 品牌区 */}
      <div className="flex h-14 items-center gap-2 border-b border-white/[0.06] px-4">
        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-white/10">
              <Radio className="size-3.5 text-orange-400" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium tracking-tight text-zinc-100">
                九木监控
              </p>
              <p className="truncate text-[10px] text-zinc-500">
                Control Center
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto rounded-md p-1.5 text-zinc-500 transition-colors duration-200 hover:bg-white/10 hover:text-zinc-300"
          aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          <ChevronLeft
            className={cn(
              'size-3.5 transition-transform duration-200',
              collapsed && 'rotate-180',
            )}
          />
        </button>
      </div>

      {/* 一级导航 */}
      <nav className="flex-1 space-y-1 px-3 py-3 border-t border-white/[0.06]">
        {MAIN_NAV.map((item) => {
          const active = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              title={collapsed ? item.label : undefined}
              onClick={() => onNavigate(item.id, getDefaultSectionId(item.id))}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200',
                active
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
              )}
            >
              <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* 底部 */}
      <div className="mt-auto space-y-2 border-t border-white/[0.06] p-3">
        {onBack && !collapsed && (
          <button
            type="button"
            onClick={onBack}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-zinc-500 transition-colors duration-200 hover:bg-white/5 hover:text-zinc-300"
          >
            <ChevronLeft className="size-3.5" />
            返回应用
          </button>
        )}
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg bg-white/[0.04] p-2.5',
            collapsed && 'justify-center',
          )}
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              className="size-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[11px] font-medium">
              {user?.nickname?.charAt(0) || 'A'}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-tight text-zinc-200">
                {user?.nickname || '用户'}
              </p>
              <p className="truncate text-[11px] text-zinc-500">
                {user?.phone || '—'}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
