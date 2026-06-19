import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/confirm-dialog'
import api from '@/api'
import {
  AdminSidebar,
  MAIN_NAV,
  getDefaultSectionId,
} from '@/components/ui/admin-sidebar'
import { scrollToAdminSection } from './admin/scroll-to-section'
import { AdminComingSoon, AdminErrorState } from './admin/admin-ui'
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

  return (
    <div
      className="admin-light admin-dashboard flex h-screen w-full overflow-hidden"
      style={{ fontFamily: 'var(--admin-font)' }}
    >
      <AdminSidebar
        activeTab={tab}
        activeItem={activeItem}
        onNavigate={handleNavigate}
        onBack={() => navigate('/')}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--admin-bg)]">
        {/* 顶栏 */}
        <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-[var(--admin-border)] bg-[var(--admin-card-bg)]/80 px-6 py-4 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-[var(--admin-text)]">
                监控中心
              </h1>
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                {TAB_LABELS[tab] || tab}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">
              平台运营数据与系统状态一览
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-xs text-[var(--admin-text-muted)] xl:flex">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-40" />
                <span className="relative inline-flex size-2 rounded-full bg-green-500" />
              </span>
              已同步 {syncLabel}
            </div>
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-3.5 py-2 text-sm font-medium text-[var(--admin-text-secondary)]',
                'transition-[background-color,border-color,color] duration-200 hover:border-zinc-300 hover:text-[var(--admin-text)]',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              <RefreshCw
                className={cn('size-3.5', loading && 'animate-spin')}
              />
              刷新数据
            </button>
          </div>
        </header>

        {/* 主内容 */}
        <div
          ref={mainRef}
          className="admin-dashboard-content min-h-0 flex-1 overflow-y-auto px-6 py-6"
        >
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
