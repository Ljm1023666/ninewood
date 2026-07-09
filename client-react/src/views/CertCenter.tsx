import { useState, useEffect, useCallback } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { userApi } from '@/api/user'
import { CertWorkspaceShell } from '@/components/cert/cert-workspace-shell'
import type { CertWorkspacePanel } from '@/components/cert/cert-workspace-types'
import {
  CertWorkspaceCommunityPanel,
  CertWorkspaceDashboardPanel,
  CertWorkspaceResourcesPanel,
  CertWorkspaceSettingsPanel,
  CertWorkspaceSupportPanel,
  CertWorkspaceTournamentPanel,
} from '@/components/cert/cert-workspace-panels'
import {
  CertCenterDashboardView,
  CertCenterIntroView,
} from '@/components/cert/cert-center-views'
import { toast } from '@/components/ui/confirm-dialog'

function highlightRightsLevel(level?: string): 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | undefined {
  if (level === 'BASIC' || level === 'INTERMEDIATE' || level === 'ADVANCED') return level
  if (level === 'MASTER') return 'ADVANCED'
  return undefined
}

function parsePanel(value: string | null): CertWorkspacePanel | null {
  const allowed: CertWorkspacePanel[] = [
    'dashboard',
    'center',
    'tournament',
    'resources',
    'community',
    'settings',
    'support',
  ]
  return allowed.includes(value as CertWorkspacePanel) ? (value as CertWorkspacePanel) : null
}

export default function CertCenter() {
  const [searchParams] = useSearchParams()
  const initialPanel = parsePanel(searchParams.get('panel')) ?? 'center'
  const [panel, setPanel] = useState<CertWorkspacePanel>(initialPanel)
  const [centerIntroMode, setCenterIntroMode] = useState(false)
  const [certStatus, setCertStatus] = useState<any>(null)
  const [upgrading, setUpgrading] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const r = await userApi.certStatus()
      setCertStatus(r.data.data)
    } catch (e: any) {
      toast(e?.response?.data?.message || e?.message || '操作失败', 'error')
    }
  }, [])

  async function upgrade() {
    setUpgrading(true)
    try {
      await userApi.upgradeCert()
      await fetchStatus()
      toast('升级申请已提交', 'success')
    } catch (e: any) {
      toast(e?.response?.data?.message || e?.message || '操作失败', 'error')
    } finally {
      setUpgrading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const scrollToUpload = () => {
    setPanel('center')
    setCenterIntroMode(false)
    requestAnimationFrame(() => {
      document.getElementById('cert-upload')?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  if (!certStatus) {
    return (
      <div className="cert-stitch cert-stitch--ambient flex min-h-screen items-center justify-center">
        <span className="loader" />
      </div>
    )
  }

  const isNone = certStatus.certificationLevel === 'NONE'
  const hasPromotion = certStatus?.promotion
  const canUpgrade = hasPromotion && certStatus.promotion.progress >= 1
  const isMaxLevel =
    certStatus.certificationLevel === 'ADVANCED' || certStatus.certificationLevel === 'MASTER'
  const upgradeHint = isMaxLevel
    ? '高级及以上需管理员授予'
    : !canUpgrade
      ? `还需完成 ${Math.max(0, (certStatus.promotion?.needed ?? 0) - certStatus.completedOrders)} 单`
      : undefined
  const rightsHighlight = highlightRightsLevel(certStatus.certificationLevel)
  const showIntroTopNav = isNone || centerIntroMode

  function renderPanel() {
    switch (panel) {
      case 'dashboard':
        return <CertWorkspaceDashboardPanel certStatus={certStatus} />
      case 'tournament':
        return <CertWorkspaceTournamentPanel />
      case 'resources':
        return <CertWorkspaceResourcesPanel />
      case 'community':
        return <CertWorkspaceCommunityPanel />
      case 'settings':
        return <CertWorkspaceSettingsPanel />
      case 'support':
        return <CertWorkspaceSupportPanel />
      case 'center':
      default:
        if (isNone || centerIntroMode) {
          return (
            <CertCenterIntroView
              onPrimary={scrollToUpload}
              onOpenSupport={() => setPanel('support')}
              onRegistered={fetchStatus}
            />
          )
        }
        return (
          <CertCenterDashboardView
            certStatus={certStatus}
            onUpgrade={upgrade}
            upgrading={upgrading}
            canUpgrade={canUpgrade}
            isMaxLevel={isMaxLevel}
            upgradeHint={upgradeHint}
            rightsHighlight={rightsHighlight}
            onShowIntro={() => {
              setCenterIntroMode(true)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        )
    }
  }

  return (
    <CertWorkspaceShell
      panel={panel}
      onPanelChange={(next) => {
        setPanel(next)
        if (next === 'center' && !isNone) {
          setCenterIntroMode(false)
        }
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }}
      onCertify={scrollToUpload}
      onUpgrade={upgrade}
      upgradeDisabled={!canUpgrade || isMaxLevel}
      upgrading={upgrading}
      upgradeHint={upgradeHint}
      showIntroTopNav={showIntroTopNav}
    >
      {renderPanel()}
    </CertWorkspaceShell>
  )
}

/** 兼容旧路由：统一进入工作区 */
export function CertIntroRedirect() {
  return <Navigate to="/cert-center" replace />
}
