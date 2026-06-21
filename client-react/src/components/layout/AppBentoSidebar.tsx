import { useLocation, useNavigate } from 'react-router-dom'
import { MsIcon } from '@/components/ui/ms-icon'
import {
  BENTO_MAIN_NAV,
  BENTO_FOOTER_NAV,
  BENTO_LOGOUT_NAV,
  isBentoActive,
  type BentoNavItem,
} from '@/constants/bento-nav'

type AppBentoSidebarProps = {
  /** 由宿主（通常是 BentoAppShell）注入的登出处理 */
  onLogout: () => void
}

function NavButton({
  item,
  active,
  onActivate,
}: {
  item: BentoNavItem
  active: boolean
  onActivate: () => void
}) {
  return (
    <button
      type="button"
      onClick={onActivate}
      data-bento-nav={item.key}
      data-active={active}
      aria-current={active ? 'page' : undefined}
      className={
        active
          ? 'cdb-sidebar-nav-btn cdb-sidebar-nav-btn--active'
          : 'cdb-sidebar-nav-btn cdb-sidebar-nav-btn--idle group'
      }
    >
      <MsIcon
        name={item.icon}
        size={24}
        className={active ? '' : 'transition-transform group-hover:scale-110'}
        aria-hidden
      />
      <span>{item.label}</span>
    </button>
  )
}

export function AppBentoSidebar({ onLogout }: AppBentoSidebarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  function go(item: BentoNavItem) {
    if (item.key === 'logout') {
      onLogout()
      return
    }
    navigate(item.path)
  }

  return (
    <aside className="cdb-sidebar" aria-label="主导航">
      <button
        type="button"
        className="cdb-sidebar-brand"
        onClick={() => navigate('/circles')}
        aria-label="前往圈子社区"
        data-bento-nav="brand"
      >
        <div className="cdb-sidebar-brand-icon">
          <MsIcon name="grid_view" size={24} aria-hidden />
        </div>
        <div>
          <h3 className="cdb-sidebar-brand-title">Ninewood</h3>
          <p className="cdb-sidebar-brand-sub">Productivity Hub</p>
        </div>
      </button>

      <nav className="cdb-sidebar-nav" aria-label="主导航-主区">
        {BENTO_MAIN_NAV.map((item) => (
          <NavButton
            key={item.key}
            item={item}
            active={isBentoActive(item, pathname)}
            onActivate={() => go(item)}
          />
        ))}
      </nav>

      <div className="cdb-sidebar-footer" aria-label="主导航-页脚">
        {BENTO_FOOTER_NAV.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => go(item)}
            data-bento-nav={item.key}
            data-active={isBentoActive(item, pathname)}
            className="cdb-sidebar-footer-btn"
          >
            <MsIcon name={item.icon} size={24} aria-hidden />
            <span>{item.label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={onLogout}
          data-bento-nav={BENTO_LOGOUT_NAV.key}
          className="cdb-sidebar-footer-btn"
        >
          <MsIcon name={BENTO_LOGOUT_NAV.icon} size={24} aria-hidden />
          <span>{BENTO_LOGOUT_NAV.label}</span>
        </button>
      </div>
    </aside>
  )
}