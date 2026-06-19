import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/confirm-dialog'
import api from '@/api'
import {
  AdminSidebar,
  MAIN_NAV,
  sidebarConfigs,
  getDefaultSectionId,
} from '@/components/ui/admin-sidebar'
import { scrollToAdminSection } from './admin/scroll-to-section'
import { AdminComingSoon, AdminErrorState, AdminSubNav } from './admin/admin-ui'
import AdminOverviewTab from './admin/AdminOverviewTab'
import AdminAnalyticsTab from './admin/AdminAnalyticsTab'
import AdminUsersTab from './admin/AdminUsersTab'
import AdminSystemTab from './admin/AdminSystemTab'
import AdminOrdersTab from './admin/AdminOrdersTab'
import type { DashboardData } from './admin/use-admin-data'

const TAB_LABELS: Record<string, string> = Object.fromEntries(
  MAIN_NAV.map((t) => [t.id, t.label]),
)

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [activeItem, setActiveItem] = useState('stats')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [scrollTick, setScrollTick] = useState(0)
  const mainRef = useRef<HTMLDivElement>(null)
  const pendingScrollRef = useRef<string | null>(null)

  const handleNavigate = useCallback((tabId: string, itemId: string) => {
    const sectionId = itemId || getDefaultSectionId(tabId)
    pendingScrollRef.current = sectionId || null
    setTab(tabId)
    if (sectionId) setActiveItem(sectionId)
    // 即使 activeItem 未变也触发滚动（例如重复点击同一锚点）
    setScrollTick((n) => n + 1)
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/admin/dashboard')
      setData(res.data.data)
      setLastSync(new Date())
    } catch (err: unknown) {
      const msg =
        (
          err as {
            response?: { data?: { message?: string } }
            message?: string
          }
        )?.response?.data?.message ||
        (err as Error)?.message ||
        '加载失败'
      setError(msg)
      toast('加载仪表盘数据失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const sectionId = pendingScrollRef.current ?? activeItem
    if (!sectionId || scrollTick === 0) return

    const container = mainRef.current
    // 双 rAF：等 React 提交 DOM（尤其切换 Tab 后）
    let cancelled = false
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return
        if (scrollToAdminSection(sectionId, container)) {
          pendingScrollRef.current = null
        }
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf1)
    }
  }, [activeItem, tab, scrollTick, loading])

  const renderContent = () => {
    if (error && !data) {
      return <AdminErrorState message={error} onRetry={fetchData} />
    }

    const tabProps = { data, loading, activeItem }
    switch (tab) {
      case 'overview':
        return <AdminOverviewTab {...tabProps} />
      case 'analytics':
        return <AdminAnalyticsTab {...tabProps} />
      case 'users':
        return <AdminUsersTab {...tabProps} />
      case 'orders':
        return <AdminOrdersTab {...tabProps} />
      case 'monitoring':
        return <AdminSystemTab {...tabProps} />
      default:
        return <AdminComingSoon />
    }
  }

  const syncLabel = lastSync
    ? lastSync.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—'

  const subNavItems =
    sidebarConfigs[tab]?.flatMap((section) =>
      section.items.map((item) => ({ id: item.id, label: item.label })),
    ) ?? []

  const handleSubNav = useCallback((itemId: string) => {
    pendingScrollRef.current = itemId
    setActiveItem(itemId)
    setScrollTick((n) => n + 1)
  }, [])

  return (
    <div className="admin-light admin-dashboard flex h-screen w-full overflow-hidden">
      <AdminSidebar
        activeTab={tab}
        activeItem={activeItem}
        onNavigate={handleNavigate}
        onBack={() => navigate('/')}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--admin-bg)]">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-topbar__title">
              监控中心
              <span className="admin-topbar__badge">{TAB_LABELS[tab] || tab}</span>
            </h1>
            <p className="admin-topbar__sub">平台运营数据与系统状态一览</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="admin-topbar__sync hidden xl:flex">
              <span className="size-1.5 rounded-full bg-[var(--admin-accent-green)] shadow-[0_0_0_2px_rgba(34,197,94,0.2)]" />
              已同步 {syncLabel}
            </div>
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="admin-topbar__refresh inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
              刷新数据
            </button>
          </div>
        </header>

        <AdminSubNav
          items={subNavItems}
          activeId={activeItem}
          onSelect={handleSubNav}
        />

        <div
          ref={mainRef}
          className="admin-dashboard-content min-h-0 flex-1 overflow-y-auto"
        >
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
