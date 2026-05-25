import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import PageTransition from './PageTransition'
import { useChatStore } from '@/stores/chat'
import { useKeyboard } from '@/hooks/useKeyboard'
import { ToastContainer } from '@/components/ui/confirm-dialog'
import { UserCoverAmbientBg } from '@/components/ui/user-cover-ambient'
import { useUserStore } from '@/stores/user'
import {
  isDemandDetailRoute,
  suppressLayoutAmbient,
} from '@/utils/user-cover-presets'
import { userApi } from '@/api/user'

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
