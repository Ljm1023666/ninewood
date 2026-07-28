import { useEffect, useRef, type ReactNode } from 'react'
import { MsIcon } from '@/components/ui/ms-icon'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { useUserStore } from '@/stores/user'
import { cn } from '@/lib/utils'
import {
  certAsideTierModifier,
  certTierClass,
  isCertifiedLevel,
  levelDisplay,
} from '@/components/cert/cert-utils'
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

const PANEL_NAV = [...CERT_WORKSPACE_NAV, ...CERT_WORKSPACE_FOOTER_NAV]

function scrollToSection(id: string, root: HTMLElement | null) {
  const el = document.getElementById(id)
  if (!el) return
  if (root) {
    const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 24
    root.scrollTo({ top, behavior: 'smooth' })
    return
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
  certificationLevel,
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
  certificationLevel?: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const user = useUserStore((s) => s.user)
  const activeSection = useCertIntroScrollSpy(scrollRef)
  const level = certificationLevel ?? user?.certificationLevel
  const tierClass = certTierClass(level)
  const asideTier = certAsideTierModifier(level)
  const certified = isCertifiedLevel(level)
  const levelText = certified ? levelDisplay(level) : '未认证会员'

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [panel])

  const handleCertify = () => {
    onPanelChange('center')
    onCertify()
  }

  return (
    <div
      ref={scrollRef}
      className="cert-stitch cert-stitch--embedded cert-stitch--radial cert-workspace thin-scroll"
    >
      <div className="cert-workspace__inner">
        <header className="cert-workspace__header">
          <div className="min-w-0">
            <p className="cert-workspace__eyebrow">
              <span className="cert-workspace__eyebrow-dot" />
              认证工作台
            </p>
            <h1 className="cert-workspace__title">认证中心</h1>
            <p className="cert-workspace__sub">
              <span className={cn(tierClass, certified && 'cert-tier--highlight')}>{levelText}</span>
              <span className="cert-workspace__sub-sep" aria-hidden>
                ·
              </span>
              <span>{user?.nickname || '会员'}</span>
            </p>
          </div>
          <div className="cert-workspace__actions">
            {onUpgrade ? (
              <button
                type="button"
                className="cert-workspace__btn cert-workspace__btn--ghost"
                onClick={onUpgrade}
                disabled={upgradeDisabled || upgrading}
                title={upgradeHint}
              >
                {upgrading ? '提交中…' : '提升等级'}
              </button>
            ) : null}
            <LiquidMetalButton label="立即认证" onClick={handleCertify} />
          </div>
        </header>

        {showIntroTopNav && panel === 'center' ? (
          <nav className="cert-workspace__section-nav" aria-label="介绍章节">
            {INTRO_TOP_NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(activeSection === item.id && 'is-active')}
                onClick={() => scrollToSection(item.id, scrollRef.current)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ) : null}

        <div className="cert-workspace__body">
          <aside className={cn('cert-workspace__rail', asideTier)} aria-label="认证分区">
            <nav className="cert-workspace__rail-nav">
              {PANEL_NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn('cert-workspace__rail-link', panel === item.id && 'is-active')}
                  onClick={() => onPanelChange(item.id)}
                >
                  <MsIcon name={item.icon} size={18} filled={panel === item.id} />
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="cert-workspace__main">{children}</main>
        </div>
      </div>
    </div>
  )
}
