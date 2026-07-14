import { useState } from 'react'
import { MsIcon } from '@/components/ui/ms-icon'
import { levelDisplay, certTierClass, formatSnatchCredits } from '@/components/cert/cert-utils'
import { cn } from '@/lib/utils'
import {
  CERT_RESOURCE_ITEMS,
  CertResourceDetailView,
  type CertResourceId,
} from '@/components/cert/cert-resource-views'

function CertWorkspaceStub({
  icon,
  title,
  desc,
}: {
  icon: string
  title: string
  desc: string
}) {
  return (
    <div className="cert-stitch-glass cert-stitch-panel-stub">
      <div className="cert-stitch-panel-stub__icon">
        <MsIcon name={icon} size={40} />
      </div>
      <h2>{title}</h2>
      <p>{desc}</p>
    </div>
  )
}

export function CertWorkspaceDashboardPanel({
  certStatus,
}: {
  certStatus: {
    certificationLevel?: string
    creditScore?: number
    completedOrders?: number
    snatchCredits?: number
    promotion?: { progress: number; needed: number } | null
  } | null
}) {
  if (!certStatus) return null
  const level = levelDisplay(certStatus.certificationLevel)
  const tierClass = certTierClass(certStatus.certificationLevel)
  const progress = certStatus.promotion
    ? Math.round(certStatus.promotion.progress * 100)
    : null

  return (
    <div className="cert-stitch-panel-page">
      <header className="cert-stitch-page-head">
        <div>
          <h1>仪表盘</h1>
          <p>认证体系关键指标一览，掌握您的精英开发者成长轨迹。</p>
        </div>
      </header>
      <div className="cert-stitch-dashboard-stats">
        <div className="cert-stitch-glass cert-stitch-dashboard-stat">
          <p>当前等级</p>
          <strong className={cn(tierClass, tierClass && 'cert-tier--highlight')}>{level}</strong>
        </div>
        <div className="cert-stitch-glass cert-stitch-dashboard-stat">
          <p>信誉积分</p>
          <strong>{certStatus.creditScore ?? '—'}</strong>
        </div>
        <div className="cert-stitch-glass cert-stitch-dashboard-stat">
          <p>完成订单</p>
          <strong>{certStatus.completedOrders ?? 0}</strong>
        </div>
        <div className="cert-stitch-glass cert-stitch-dashboard-stat">
          <p>本月抢单额度</p>
          <strong>
            {formatSnatchCredits(
              certStatus.snatchCredits ?? 0,
              certStatus.certificationLevel,
            )}
          </strong>
        </div>
      </div>
      {progress !== null && certStatus.promotion ? (
        <div className="cert-stitch-glass cert-stitch-panel-card">
          <h3>升级进度</h3>
          <div className="cert-stitch-status-card__progress-meta">
            <span>{progress}%</span>
            <span>目标 {certStatus.promotion.needed} 单</span>
          </div>
          <div className="cert-stitch-status-card__bar">
            <div
              className="cert-stitch-status-card__bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function CertWorkspaceTournamentPanel() {
  return (
    <CertWorkspaceStub
      icon="workspace_premium"
      title="技术锦标赛"
      desc="参与 Ninewood 技术排位赛，通过实战项目挑战提升认证权重与曝光优先级。赛季榜单与奖励规则即将开放。"
    />
  )
}

export function CertWorkspaceResourcesPanel({
  rightsHighlight,
}: {
  rightsHighlight?: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'
}) {
  const [activeId, setActiveId] = useState<CertResourceId | null>(null)

  if (activeId) {
    return (
      <CertResourceDetailView
        id={activeId}
        rightsHighlight={rightsHighlight}
        onBack={() => {
          setActiveId(null)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />
    )
  }

  return (
    <div className="cert-stitch-panel-page">
      <header className="cert-stitch-page-head">
        <div>
          <h1>资源库</h1>
          <p>认证相关的文档、规范与操作指南。</p>
        </div>
      </header>
      <div className="cert-stitch-resource-grid">
        {CERT_RESOURCE_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="cert-stitch-glass cert-stitch-resource-card"
            onClick={() => {
              setActiveId(item.id)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            <MsIcon name={item.icon} size={28} className="text-[var(--cs-primary-fixed)]" />
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
            <span className="cert-stitch-resource-card__action">
              查看
              <MsIcon name="arrow_forward" size={14} />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function CertWorkspaceCommunityPanel() {
  return (
    <CertWorkspaceStub
      icon="groups"
      title="精英社区"
      desc="与已通过高级认证的技术专家交流项目经验、协作机会与行业洞察。社区频道正在筹备中。"
    />
  )
}

export function CertWorkspaceSettingsPanel() {
  return (
    <div className="cert-stitch-panel-page">
      <header className="cert-stitch-page-head">
        <div>
          <h1>设置</h1>
          <p>管理认证展示偏好与通知选项。</p>
        </div>
      </header>
      <div className="cert-stitch-glass cert-stitch-panel-card cert-stitch-settings-list">
        <label className="cert-stitch-settings-row">
          <span>公开认证徽章</span>
          <input type="checkbox" defaultChecked />
        </label>
        <label className="cert-stitch-settings-row">
          <span>升级进度提醒</span>
          <input type="checkbox" defaultChecked />
        </label>
        <label className="cert-stitch-settings-row">
          <span>锦标赛邀请通知</span>
          <input type="checkbox" />
        </label>
      </div>
    </div>
  )
}

export function CertWorkspaceSupportPanel() {
  const faqs = [
    '认证审核需要多久？通常 3-5 个工作日。',
    '如何升级到下一等级？完成对应数量的成功订单后可申请升级。',
    '高级认证可以自助申请吗？高级及以上需管理员审核授予。',
  ]
  return (
    <div className="cert-stitch-panel-page">
      <header className="cert-stitch-page-head">
        <div>
          <h1>支持</h1>
          <p>认证流程常见问题与协助渠道。</p>
        </div>
      </header>
      <div className="cert-stitch-glass cert-stitch-panel-card">
        <h3>常见问题</h3>
        <ul className="cert-stitch-support-faqs">
          {faqs.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
        <p className="cert-stitch-support-contact">
          如需人工协助，请发送邮件至 support@ninewood.local
        </p>
      </div>
    </div>
  )
}
