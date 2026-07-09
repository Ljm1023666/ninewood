import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { MsIcon } from '@/components/ui/ms-icon'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { cn } from '@/lib/utils'
import {
  useCertIntroScrollSpy,
  type CertIntroSection,
} from '@/components/cert/use-cert-intro-scroll-spy'
import {
  CERT_WORKSPACE_FOOTER_NAV,
  CERT_WORKSPACE_NAV,
  type CertWorkspacePanel,
} from '@/components/cert/cert-workspace-types'

const INTRO_TOP_NAV: { id: CertIntroSection; label: string }[] = [
  { id: 'cert-benefits', label: '核心权益' },
  { id: 'cert-tiers', label: '等级体系' },
  { id: 'cert-path', label: '认证路径' },
  { id: 'cert-ecosystem', label: '开发者生态' },
]

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function userAvatarUrl(avatarUrl: string | null | undefined) {
  if (avatarUrl) return avatarUrl
  return 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRuMtmLpsqydaTbZwkJVIDJFoDrOzU-g9rUJKskZyFx7Ga4nGDZ5ZXZCpNeszGON4ZjtyeehP2IdnBuO9YmF-_IBv_H_ZGB1KYJkva-t6vy2ZitNlr2UhCqsWWmodic58ZqfQBNU-_qBfzozK2iixHGlw9rgT1C5deoh6olgiPzsIf24GNzGpHZoOlABnGbiDlODG42Xt_h46VeE-qnFEhF2oCMUUYBVoC3HxCbzZkDiNlSy8BLDanzvRg7rQLfkIA2q6QMuCPMes'
}

export function CertWorkspaceShell({
  children,
  panel,
  onPanelChange,
  onCertify,
  onUpgrade,
  upgradeDisabled,
  upgrading,
  upgradeHint,
  showIntroTopNav = false,
}: {
  children: ReactNode
  panel: CertWorkspacePanel
  onPanelChange: (panel: CertWorkspacePanel) => void
  onCertify: () => void
  onUpgrade?: () => void
  upgradeDisabled?: boolean
  upgrading?: boolean
  upgradeHint?: string
  showIntroTopNav?: boolean
}) {
  const navigate = useNavigate()
  const user = useUserStore((s) => s.user)
  const logout = useUserStore((s) => s.logout)
  const toggleDarkMode = useThemeStore((s) => s.toggleDarkMode)
  const isDark = useThemeStore((s) => s.current.dark)
  const activeSection = useCertIntroScrollSpy()

  const handleCertify = () => {
    onPanelChange('center')
    onCertify()
  }

  return (
    <div className="cert-stitch cert-stitch--radial cert-stitch__scroll cert-stitch__scroll--thin">
      <header className="cert-stitch-intro-header">
        <div className="cert-stitch-intro-header__inner">
          <div className="cert-stitch-intro-header__brand">
            <button
              type="button"
              className="cert-stitch-intro-header__logo"
              onClick={() => onPanelChange('center')}
            >
              Ninewood
            </button>
            {showIntroTopNav && panel === 'center' ? (
              <nav className="cert-stitch-intro-header__nav">
                {INTRO_TOP_NAV.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(activeSection === item.id && 'is-active')}
                    onClick={() => scrollToSection(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            ) : null}
          </div>
          <div className="cert-stitch-intro-header__actions">
            <div className="cert-stitch-intro-header__icons">
              <button type="button" aria-label="主题" onClick={toggleDarkMode}>
                <MsIcon name={isDark ? 'light_mode' : 'dark_mode'} size={22} />
              </button>
            </div>
            <button type="button" className="cert-stitch-btn-pill" onClick={handleCertify}>
              立即认证
            </button>
          </div>
        </div>
      </header>

      <aside className="cert-stitch-intro-aside">
        <div className="cert-stitch-intro-aside__profile">
          <div className="cert-stitch-intro-aside__profile-row">
            <div className="cert-stitch-intro-aside__avatar">
              <img src={userAvatarUrl(user?.avatarUrl)} alt="" />
            </div>
            <div>
              <p className="cert-stitch-intro-aside__name">{user?.nickname || '精英开发者'}</p>
              <p className="cert-stitch-intro-aside__role">Ninewood 会员</p>
            </div>
          </div>
        </div>
        <nav className="cert-stitch-intro-aside__nav">
          {CERT_WORKSPACE_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'cert-stitch-intro-aside__link',
                panel === item.id && 'is-active',
              )}
              onClick={() => onPanelChange(item.id)}
            >
              <MsIcon name={item.icon} size={20} filled={panel === item.id} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="cert-stitch-intro-aside__footer">
          <button
            type="button"
            className="cert-stitch-intro-aside__upgrade"
            onClick={onUpgrade ?? handleCertify}
            disabled={upgrading}
            title={upgradeHint}
          >
            {upgrading ? '提交中…' : '提升等级'}
          </button>
          {CERT_WORKSPACE_FOOTER_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'cert-stitch-intro-aside__link',
                panel === item.id && 'is-active',
              )}
              onClick={() => onPanelChange(item.id)}
            >
              <MsIcon name={item.icon} size={20} />
              {item.label}
            </button>
          ))}
          <button
            type="button"
            className="cert-stitch-intro-aside__link"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            <MsIcon name="logout" size={20} />
            注销
          </button>
        </div>
      </aside>

      <main className="cert-stitch-intro-main">
        <div className="cert-stitch-intro-main__inner">{children}</div>
      </main>
    </div>
  )
}
