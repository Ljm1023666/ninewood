import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import Sidebar from './Sidebar'
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
  // Tab 根路由不显示全局返回（避免挡标题）；聊天会话 /messages/:id 也不显示（顶栏已有返回）
  const hideGlobalBack =
    p === '/' ||
    p === '/discover' ||
    p === '/ui/tailwind-buttons' ||
    p === '/demands/create' ||
    p === '/shorts' ||
    p === '/circles' ||
    p === '/search' ||
    p === '/messages' ||
    p.startsWith('/messages/') ||
    p === '/profile' ||
    p === '/profile/'
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
      <GlassFilter />
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
            className="fixed left-[86px] top-3.5 z-[999] flex h-9 w-9 items-center justify-center rounded-xl
              border border-border bg-card/80 text-text-secondary shadow-md backdrop-blur-md
              transition-all duration-200 hover:border-accent hover:text-text-primary"
            aria-label="返回"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* 主栏内容区：横向铺满 flex-1 区域，不在此层做 max-w 封顶（否则超宽屏右侧整段空白）；单页可读宽度由各路由内 max-w-* 自控 */}
        <div className="relative z-[1] box-border flex min-h-0 min-w-0 w-full flex-1 flex-col [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
