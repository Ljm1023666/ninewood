import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { MsIcon } from '@/components/ui/ms-icon'
import {
  getBentoMainNav,
  getBentoFooterNav,
  getCommunityPath,
  BENTO_LOGOUT_NAV,
  HUB_SUBPAGE_NAV,
  isBentoActive,
  type BentoNavItem,
} from '@/constants/bento-nav'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

type AppBentoSidebarProps = {
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
    <LiquidMetalButton
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
    </LiquidMetalButton>
  )
}

export function AppBentoSidebar({ onLogout }: AppBentoSidebarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { id: circleId } = useParams<{ id: string }>()

  if (!circleId) return null

  const mainNav = getBentoMainNav(circleId)
  const footerNav = getBentoFooterNav(circleId)

  function go(item: BentoNavItem) {
    if (item.key === 'logout') {
      onLogout()
      return
    }
    navigate(item.path, HUB_SUBPAGE_NAV)
  }

  return (
    <aside className="cdb-sidebar" aria-label="主导航">
      <LiquidMetalButton
        type="button"
        className="cdb-sidebar-brand"
        onClick={() => navigate(getCommunityPath(circleId), HUB_SUBPAGE_NAV)}
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
      </LiquidMetalButton>

      <nav className="cdb-sidebar-nav" aria-label="主导航-主区">
        {mainNav.map((item) => (
          <NavButton
            key={item.key}
            item={item}
            active={isBentoActive(item, pathname)}
            onActivate={() => go(item)}
          />
        ))}
      </nav>

      <div className="cdb-sidebar-footer" aria-label="主导航-页脚">
        {footerNav.map((item) => (
          <LiquidMetalButton
            key={item.key}
            type="button"
            onClick={() => go(item)}
            data-bento-nav={item.key}
            data-active={isBentoActive(item, pathname)}
            className={
              isBentoActive(item, pathname)
                ? 'cdb-sidebar-footer-btn cdb-sidebar-footer-btn--active'
                : 'cdb-sidebar-footer-btn'
            }
          >
            <MsIcon name={item.icon} size={24} aria-hidden />
            <span>{item.label}</span>
          </LiquidMetalButton>
        ))}
        <LiquidMetalButton
          type="button"
          onClick={onLogout}
          data-bento-nav={BENTO_LOGOUT_NAV.key}
          className="cdb-sidebar-footer-btn"
        >
          <MsIcon name={BENTO_LOGOUT_NAV.icon} size={24} aria-hidden />
          <span>{BENTO_LOGOUT_NAV.label}</span>
        </LiquidMetalButton>
      </div>
    </aside>
  )
}
