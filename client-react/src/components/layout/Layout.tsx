import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo } from 'react'
import PageTransition from './PageTransition'
import Sidebar from './Sidebar'
import { useChatStore } from '@/stores/chat'
import { useKeyboard } from '@/hooks/useKeyboard'
import { ToastContainer } from '@/components/ui/confirm-dialog'
import { UserCoverAmbientBg } from '@/components/ui/user-cover-ambient'
import { useUserStore } from '@/stores/user'
import { isDemandDetailRoute } from '@/utils/user-cover-presets'
import { suppressLayoutAmbient } from '@/utils/internal-routes'
import { navigateSubpageExit } from '@/utils/subpage-nav'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const me = useUserStore((s) => s.user)
  const token = useUserStore((s) => s.token)
  const fetchUnreadCount = useChatStore((s) => s.fetchUnreadCount)
  const connectChat = useChatStore((s) => s.connect)
  const disconnectChat = useChatStore((s) => s.disconnect)

  /** 氛围开/关只看路由；图源固定为浅/深主题，不跟用户封面 */
  const layoutAmbientOn = useMemo(() => {
    const p = location.pathname
    if (suppressLayoutAmbient(p)) return false
    return true
  }, [location.pathname])

  useEffect(() => {
    document.documentElement.dataset.layoutAmbient = layoutAmbientOn
      ? 'on'
      : 'off'
    return () => {
      delete document.documentElement.dataset.layoutAmbient
    }
  }, [layoutAmbientOn])

  useEffect(() => {
    if (me) {
      connectChat(token || undefined)
    } else {
      disconnectChat()
    }
    return () => {
      disconnectChat()
    }
  }, [me, token, connectChat, disconnectChat])

  useEffect(() => {
    if (!me) return
    fetchUnreadCount()
    const timer = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(timer)
  }, [fetchUnreadCount, me])

  useKeyboard([
    { key: 'k', ctrl: true, handler: () => navigate('/search') },
    {
      key: 'Escape',
      handler: () => navigateSubpageExit(navigate, location.pathname),
    },
  ])

  const p = location.pathname
  /** 需求详情页 3D 翻面会略超出卡片盒模型；全站 main 的 overflow-hidden 会裁掉透视溢出，仅在此路由放宽 */
  const demandDetail3dOverflow = isDemandDetailRoute(p)

  return (
    <div
      data-layout-root=""
      className={
        demandDetail3dOverflow
          ? 'relative flex h-screen w-full min-w-0 overflow-visible bg-bg-primary'
          : 'relative flex h-screen w-full min-w-0 overflow-hidden bg-bg-primary'
      }
    >
      {/* 氛围：浅/深固定图，铺在整页（含侧栏后方） */}
      {layoutAmbientOn ? <UserCoverAmbientBg /> : null}
      <ToastContainer />
      <Sidebar />

      <main
        className={
          demandDetail3dOverflow
            ? 'relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col overflow-visible bg-transparent'
            : 'relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent'
        }
      >
        <div className="relative z-[1] box-border flex min-h-0 min-w-0 w-full flex-1 flex-col">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </main>
    </div>
  )
}
