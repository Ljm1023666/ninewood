import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import Sidebar from './Sidebar'
import PageTransition from './PageTransition'
import { useChatStore } from '@/stores/chat'
import { useKeyboard } from '@/hooks/useKeyboard'
import { ToastContainer } from '@/components/ui/confirm-dialog'
import { GlassFilter } from '@/components/ui/liquid-glass'
import { UserCoverAmbientBg } from '@/components/ui/user-cover-ambient'
import { useUserStore } from '@/stores/user'
import {
  isDemandDetailRoute,
  suppressLayoutAmbient,
} from '@/utils/user-cover-presets'
import { userApi } from '@/api/user'
import { ChevronLeft } from 'lucide-react'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const me = useUserStore((s) => s.user)
  const fetchUnreadCount = useChatStore((s) => s.fetchUnreadCount)

  const layoutAmbientUserId = useMemo(() => {
    const p = location.pathname
    if (isDemandDetailRoute(p)) return null
    if (suppressLayoutAmbient(p)) return null
    const m = p.match(/^\/profile\/([^/]+)\/?$/)
    if (m) return m[1]
    return me?.id
  }, [location.pathname, me?.id])

  /** 他人主页：拉取封面供 Layout 氛围层使用（自己用 store 即可） */
  const [profileOtherCoverUrl, setProfileOtherCoverUrl] = useState<
    string | null | undefined
  >(undefined)

  useEffect(() => {
    if (layoutAmbientUserId === null) {
      setProfileOtherCoverUrl(undefined)
      return
    }
    if (layoutAmbientUserId === me?.id) {
      setProfileOtherCoverUrl(undefined)
      return
    }
    setProfileOtherCoverUrl(undefined)
    if (typeof layoutAmbientUserId !== 'string') return
    let cancelled = false
    userApi
      .get(layoutAmbientUserId)
      .then((r) => {
        if (cancelled) return
        const u = r.data.data as { coverUrl?: string | null }
        setProfileOtherCoverUrl(u?.coverUrl ?? null)
      })
      .catch(() => {
        if (!cancelled) setProfileOtherCoverUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [layoutAmbientUserId, me?.id])

  const ambientCoverUrl =
    layoutAmbientUserId === me?.id ? me?.coverUrl : profileOtherCoverUrl

  useEffect(() => {
    fetchUnreadCount()
    const timer = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(timer)
  }, [fetchUnreadCount])

  useKeyboard([
    { key: 'k', ctrl: true, handler: () => navigate('/') },
    { key: 'Escape', handler: () => navigate(-1) },
  ])

  const p = location.pathname
  const electronAPI =
    typeof window !== 'undefined' ? window.electronAPI : undefined
  const isElectronDesktop = Boolean(electronAPI?.isElectron)
  // Tab 根路由不显示全局返回（避免挡标题）；聊天会话 /messages/:id 也不显示（顶栏已有返回）
  const hideGlobalBack =
    p === '/' ||
    p === '/card-pool' ||
    p.startsWith('/card-pool/') ||
    p === '/demands/create' ||
    p === '/circles' ||
    p === '/search' ||
    p === '/messages' ||
    p.startsWith('/messages/') ||
    p === '/profile' ||
    p === '/profile/' ||
    p.startsWith('/follows/') ||
    p === '/settings'
  const showBack = !hideGlobalBack
  /** 需求详情页 3D 翻面会略超出卡片盒模型；全站 main 的 overflow-hidden 会裁掉透视溢出，仅在此路由放宽 */
  const demandDetail3dOverflow = isDemandDetailRoute(p)

  return (
    <div
      className={
        demandDetail3dOverflow
          ? 'flex h-screen w-full min-w-0 overflow-visible'
          : 'flex h-screen w-full min-w-0 overflow-hidden'
      }
    >
      <ToastContainer />
      <Sidebar />

      <main
        className={
          demandDetail3dOverflow
            ? 'relative isolate flex min-h-0 min-w-0 flex-1 flex-col overflow-visible bg-background'
            : 'relative isolate flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background'
        }
      >
        {layoutAmbientUserId !== null && (
          <UserCoverAmbientBg
            userId={layoutAmbientUserId ?? undefined}
            coverUrl={ambientCoverUrl}
          />
        )}

        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="fixed left-[calc(var(--sidebar-w)+14px)] top-4 z-[var(--z-sticky)] flex h-9 w-9 items-center justify-center rounded-default
              border border-border bg-card/90 text-text-secondary shadow-sm
              transition-[border-color,color,transform] duration-200 hover:border-accent hover:text-text-primary active:scale-95"
            aria-label="返回"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* 主栏内容区：PageTransition 包裹路由过渡动画 */}
        <div className="relative z-[1] box-border flex min-h-0 min-w-0 w-full flex-1 flex-col">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </main>
    </div>
  )
}
