import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { AppBentoSidebar } from './AppBentoSidebar'
import { ToastContainer } from '@/components/ui/confirm-dialog'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { useKeyboard } from '@/hooks/useKeyboard'

/**
 * BentoAppShell 閳?Productivity Hub 閻ㄥ嫮绮烘稉鈧竟鍐茬湴
 *
 * 閸欐牔鍞崢鐔告降 CircleDetail.tsx 闁插瞼娈戦崘鍛颁粓 BentoShell + CircleDetailBentoSidebar
 * 鐠愮喕鐭楅敍? *  - 閸忋劌鐪懗灞炬珯鐏炲偊绱檉ixed inset-0 + --cdb-overlay閿涘绱濈悮顐㈢摍妞ょ敻娼伴柅姘崇箖 setAmbientCoverUrl 鐟曞棛娲? *  - 280px 娓氀勭埉閿涘湏ppBentoSidebar閿涙矘ctive 閻㈣精鐭鹃悽杈吀缁犳绱? *  - <Outlet /> 濞撳弶鐓嬬€涙劙銆夐棃? *  - ToastContainer閿涘牅绗岄弮?Layout 閹镐礁閽╅敍宀勪缉閸忓秴鐡欐い鍏告丢 toast閿? *  - 閸忋劌鐪箛顐ｅ祹闁款噯绱機trl+K 閳?/閿涙宝sc 閳?閸氬酣鈧偓閿? *
 * 鐠侯垳鏁遍崚鍡欑矋鐟?`client-react/src/router/index.tsx`閿? *  AuthGuard 閳?BentoAppShell 閳?{circles, circles/:id, card-pool*, tag-stats, circles-list, help*}
 *  娑撳秴婀張顒€锛撻崘鍛畱鐠侯垳鏁辨禒宥堣泲閺?Layout閿涘潰essages / orders / profile / dashboard / ...閿? */

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
  const logout = useUserStore((s) => s.logout)
  const fetchUnreadCount = useChatStore((s) => s.fetchUnreadCount)
  const [ambientCoverUrl, setAmbientCoverUrlState] = useState<string | null>(null)

  const setAmbientCoverUrl = useCallback((url: string | null) => {
    setAmbientCoverUrlState(url)
  }, [])

  useEffect(() => {
    void fetchUnreadCount()
    const timer = setInterval(() => void fetchUnreadCount(), 30000)
    return () => clearInterval(timer)
  }, [fetchUnreadCount])

  useKeyboard([
    { key: 'k', ctrl: true, handler: () => navigate('/') },
    { key: 'Escape', handler: () => navigate(-1) },
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
            <Outlet />
          </main>
        </div>
        <ToastContainer />
      </div>
    </Ctx.Provider>
  )
}