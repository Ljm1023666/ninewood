import { MsIcon } from '@/components/ui/ms-icon'
import {
  CertStitchHero,
  CertStitchFeatureGrid,
  CertStitchBottomCta,
  CertStitchFooter,
  CertStitchRightsTable,
} from '@/components/cert/cert-stitch-blocks'
import { CertRegisterForm } from '@/components/cert/cert-register-form'
import {
  formatSnatchCredits,
  timelineStepDesc,
  levelDisplay,
  certTierClass,
} from '@/components/cert/cert-utils'
import { cn } from '@/lib/utils'

const steps = [
  { level: 'NONE', label: '未认证', desc: '基础账户创建' },
  { level: 'BASIC', label: '初级认证', desc: '完成 5 次服务' },
  { level: 'INTERMEDIATE', label: '中级认证', desc: '完成 20 次服务' },
  { level: 'ADVANCED', label: '高级认证', desc: '完成 50 次服务' },
] as const

function stepCountSuffix(level: string) {
  if (level === 'BASIC') return '(5次)'
  if (level === 'INTERMEDIATE') return '(20次)'
  if (level === 'ADVANCED') return '(50次)'
  return ''
}

export function CertCenterIntroView({
  onPrimary,
  onOpenSupport,
  onRegistered,
}: {
  onPrimary: () => void
  onOpenSupport: () => void
  onRegistered?: () => void
}) {
  return (
    <>
      <CertStitchHero onPrimary={onPrimary} primaryLabel="立即开始认证" />
      <CertStitchFeatureGrid />
      <CertStitchBottomCta
        onPrimary={onPrimary}
        onSecondary={onOpenSupport}
      />
      <CertRegisterForm id="cert-upload" onRegistered={onRegistered} />
      <CertStitchFooter />
    </>
  )
}

export function CertCenterDashboardView({
  certStatus,
  onUpgrade,
  upgrading,
  canUpgrade,
  isMaxLevel,
  upgradeHint,
  rightsHighlight,
  onShowIntro,
}: {
  certStatus: any
  onUpgrade: () => void
  upgrading: boolean
  canUpgrade: boolean
  isMaxLevel: boolean
  upgradeHint?: string
  rightsHighlight?: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'
  onShowIntro: () => void
}) {
  const currentIdx = steps.findIndex((s) => s.level === certStatus?.certificationLevel)
  const hasPromotion = certStatus?.promotion
  const progressPct = hasPromotion ? Math.round(certStatus.promotion.progress * 100) : 0
  const levelText = levelDisplay(certStatus.certificationLevel)
  const tierClass = certTierClass(certStatus.certificationLevel)

  const tierDotClass = (level: string) => {
    if (level === 'BASIC') return 'cert-stitch-timeline__dot--tier-basic'
    if (level === 'INTERMEDIATE') return 'cert-stitch-timeline__dot--tier-intermediate'
    if (level === 'ADVANCED') return 'cert-stitch-timeline__dot--tier-advanced'
    return ''
  }

  return (
    <>
      <header className="cert-stitch-page-head">
        <div>
          <h1>等级与进度</h1>
          <p>管理你的认证等级，解锁更高阶的交易与运营能力。</p>
        </div>
        <button
          type="button"
          className="cert-stitch-btn-upgrade"
          onClick={onUpgrade}
          disabled={!canUpgrade || upgrading || isMaxLevel}
          title={upgradeHint}
        >
          <MsIcon name="upgrade" size={16} />
          {upgrading ? '提交中…' : isMaxLevel ? '已满级' : '申请升级'}
        </button>
      </header>

      <div className="cert-stitch-dashboard">
        <div className="cert-stitch-dashboard__path">
          <div className="cert-stitch-glass cert-stitch-path-card">
            <MsIcon name="route" className="cert-stitch-path-card__watermark" />
            <h3>
              <MsIcon name="timeline" size={20} />
              认证路径
            </h3>
            <ol className="cert-stitch-timeline">
              {steps.map((step, idx) => {
                const done = idx < currentIdx
                const current = idx === currentIdx
                const locked = idx > currentIdx
                const state = locked ? 'locked' : current ? 'current' : 'done'
                return (
                  <li
                    key={step.level}
                    className={cn('cert-stitch-timeline__item', locked && 'is-locked')}
                  >
                    <div
                      className={cn(
                        'cert-stitch-timeline__dot',
                        done && 'cert-stitch-timeline__dot--done',
                        current && 'cert-stitch-timeline__dot--current',
                        locked && 'cert-stitch-timeline__dot--locked',
                        (done || current) && tierDotClass(step.level),
                      )}
                    />
                    <p
                      className={cn(
                        'cert-stitch-timeline__title',
                        current && 'is-current',
                        current && certTierClass(step.level),
                        current && 'cert-tier--highlight',
                      )}
                    >
                      {step.label}
                      {stepCountSuffix(step.level)}
                    </p>
                    <p className="cert-stitch-timeline__desc">
                      {locked ? (
                        <span className="inline-flex items-center gap-1">
                          <MsIcon name="lock" size={10} />
                          尚未解锁
                        </span>
                      ) : (
                        timelineStepDesc(step.level, state, step.desc)
                      )}
                    </p>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>

        <div className="cert-stitch-dashboard__status">
          <div
            className={cn(
              'cert-stitch-glass cert-stitch-status-card',
              tierClass && 'cert-stitch-status-card--tier',
              tierClass,
            )}
          >
            <div className={cn('cert-stitch-status-card__glow', tierClass)} aria-hidden />
            <div className="cert-stitch-status-card__head">
              <div>
                <p className="cert-stitch-status-card__eyebrow">Status</p>
                <p className={cn('cert-stitch-status-card__level', tierClass, 'cert-tier--highlight')}>
                  当前等级: {levelText}
                </p>
              </div>
              <MsIcon
                name="shield_person"
                size={64}
                className={cn('cert-stitch-status-card__shield', tierClass)}
                filled
              />
            </div>

            <div className="cert-stitch-status-card__stats">
              <div className="cert-stitch-status-card__stat">
                <p>信誉积分</p>
                <strong>{certStatus.creditScore ?? '—'}</strong>
              </div>
              <div className="cert-stitch-status-card__stat">
                <p>完成订单</p>
                <strong>{certStatus.completedOrders ?? 0}</strong>
              </div>
            </div>

            {hasPromotion && !isMaxLevel ? (
              <div className="cert-stitch-status-card__progress">
                <div className="cert-stitch-status-card__progress-meta">
                  <span>升级进度 {progressPct}%</span>
                  <span>
                    还需 {Math.max(0, certStatus.promotion.needed - certStatus.completedOrders)} 单
                  </span>
                </div>
                <div className="cert-stitch-status-card__bar">
                  <div
                    className={cn('cert-stitch-status-card__bar-fill', tierClass)}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            ) : isMaxLevel ? (
              <div className="cert-stitch-status-card__max-badge">已满级 · Elite Authority</div>
            ) : null}

            <div className="cert-stitch-status-card__rows">
              <div className="cert-stitch-status-card__row">
                <span>
                  <MsIcon name="receipt_long" size={16} className={tierClass} />
                  本月抢单额度
                </span>
                <strong className={tierClass}>
                  {formatSnatchCredits(
                    certStatus.snatchCredits ?? 0,
                    certStatus.certificationLevel,
                  )}
                </strong>
              </div>
              <div className="cert-stitch-status-card__row">
                <span>
                  <MsIcon name="fact_check" size={16} className={tierClass} />
                  认证材料
                </span>
                <span className={cn('cert-stitch-status-card__verified', tierClass)}>
                  <MsIcon name="verified" size={14} filled className={tierClass} />
                  已认证
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="cert-stitch-dashboard__rights" id="cert-rights-compare">
          <div className="cert-stitch-glass cert-stitch-rights-card">
            <h3>
              <MsIcon name="military_tech" size={20} className="text-[var(--cs-primary)]" />
              认证权益对比
            </h3>
            <CertStitchRightsTable highlightLevel={rightsHighlight} />
          </div>
        </div>
      </div>

      <div className="cert-stitch-center-footer-link">
        <button type="button" onClick={onShowIntro}>
          查看认证介绍
        </button>
      </div>
    </>
  )
}
