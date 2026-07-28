import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppBentoSidebar } from './AppBentoSidebar'
import { BackButton } from '@/components/ui/back-button'
import { ToastContainer } from '@/components/ui/confirm-dialog'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { useKeyboard } from '@/hooks/useKeyboard'
import { getSubpageExitPath, navigateSubpageExit } from '@/utils/subpage-nav'
import { toPreferThumbCoverUrl } from '@/utils/user-cover-presets'
import '@/styles/circle-detail-bento.css'

/**
 * 圈子详情专用壳层：Stitch 侧栏 + 封面背景 + Bento 内容区。
 * 仅路由 `/circles/:id` 使用，其它页面走 Layout。
 */

type BentoShellContext = {
  /** 鐎涙劙銆夐棃銏ｇ殶閻㈩煉绱濇导鐘插弳 coverUrl 閸楀啿褰茬憰鍡欐磰閼冲本娅欑仦鍌︾幢娴?null 閸ョ偤鈧偓閸?fallback */
  setAmbientCoverUrl: (url: string | null) => void
}

const Ctx = createContext<BentoShellContext | null>(null)

export function useBentoShell(): BentoShellContext {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error('useBentoShell must be used within <BentoAppShell>')
  }
  return ctx
}

export function BentoAppShell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const logout = useUserStore((s) => s.logout)
  const fetchUnreadCount = useChatStore((s) => s.fetchUnreadCount)
  const [ambientCoverUrl, setAmbientCoverUrlState] = useState<string | null>(null)

  const setAmbientCoverUrl = useCallback((url: string | null) => {
    setAmbientCoverUrlState(url ? toPreferThumbCoverUrl(url) : null)
  }, [])

  useEffect(() => {
    void fetchUnreadCount()
    const timer = setInterval(() => void fetchUnreadCount(), 30000)
    return () => clearInterval(timer)
  }, [fetchUnreadCount])

  useEffect(() => {
    document.documentElement.dataset.layoutAmbient = 'on'
    return () => {
      delete document.documentElement.dataset.layoutAmbient
    }
  }, [])

  useKeyboard([
    { key: 'k', ctrl: true, handler: () => navigate('/') },
    {
      key: 'Escape',
      handler: () =>
        navigate(getSubpageExitPath(pathname) ?? '/circles'),
    },
  ])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <Ctx.Provider value={{ setAmbientCoverUrl }}>
      <div className="circle-detail-bento bento-app-shell relative z-[1] h-full min-h-0 w-full min-w-0 overflow-y-auto thin-scroll">
        <div className="cdb-bg-layer" aria-hidden>
          {ambientCoverUrl ? (
            <div
              className="cdb-bg-image"
              style={{ backgroundImage: `url(${ambientCoverUrl})` }}
            />
          ) : (
            <div className="cdb-bg-fallback" />
          )}
          <div className="cdb-bg-overlay" />
        </div>

        <div className="cdb-page cdb-shell">
          <AppBentoSidebar onLogout={handleLogout} />
          <main className="cdb-main">
            <div className="cdb-hub-back">
              <BackButton
                compact
                label="返回圈子列表"
                onBack={() => navigateSubpageExit(navigate, pathname)}
                className="text-[var(--cdb-on-surface-variant)] hover:bg-[var(--cdb-surface-tint)] hover:text-[var(--cdb-on-surface)]"
              />
            </div>
            <Outlet />
          </main>
        </div>
        <ToastContainer />
      </div>
    </Ctx.Provider>
  )
}