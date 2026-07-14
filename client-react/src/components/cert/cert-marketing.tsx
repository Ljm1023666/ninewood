import { MsIcon } from '@/components/ui/ms-icon'
import { DlpGlass, DlpGlassHead } from '@/components/layout/desktop-page'
import { cn } from '@/lib/utils'

export const CERT_INTRO_BULLETS = [
  '全球公认的开发者认证标识 (Verified Status)',
  '单次任务抢单额度提升至 $50k+',
  '专属技术架构师 1对1 优先级支持',
] as const

export const CERT_TIER_ROWS = [
  { dim: '单次抢单额度', none: '$500', basic: '$5K', advanced: '$50K+' },
  { dim: '技术服务费', none: '20%', basic: '15%', advanced: '5%' },
  { dim: '专属标识', none: 'close', basic: 'check', advanced: 'verified' },
  { dim: '专家社群', none: 'close', basic: 'remove', advanced: 'check' },
] as const

export const CERT_FEATURE_CARDS = [
  {
    title: '信誉保障',
    desc: '通过严谨的身份认证流程，建立基于真实能力的信任背书。在高端技术交易市场中，您的认证身份即是实力的最佳证明，确保交易全程安全可靠。',
    icon: 'security',
  },
  {
    title: '抢单额度',
    desc: '更高的认证级别直接对应更广阔的项目机会。从基础的模块开发到百万级系统架构设计，Ninewood 认证是您通往高价值、高影响力项目的唯一通行证。',
    icon: 'rocket_launch',
  },
  {
    title: '专属标识',
    desc: '在社区中脱颖而出。获得金色认证徽章、定制化的个人中心封面以及在全球人才搜索列表中的置顶展示，让全球顶尖雇主第一时间关注到您。',
    icon: 'stars',
  },
] as const

export const CERT_RIGHTS_ROWS = [
  { dim: '抢单额度', basic: '1', intermediate: '3', advanced: '不限' },
  { dim: '特殊检索', basic: 'close', intermediate: 'check', advanced: 'check' },
  { dim: '优先展示', basic: 'close', intermediate: 'close', advanced: 'check' },
  { dim: '专属客服', basic: 'close', intermediate: 'close', advanced: 'check' },
] as const

export function TierCell({ value }: { value: string }) {
  if (value === 'close') {
    return <MsIcon name="close" size={16} className="cert-tier-close text-[var(--error-color,#f87171)]" />
  }
  if (value === 'check') {
    return <MsIcon name="check" size={16} className="cert-tier-check text-[var(--success-color,#10b981)]" />
  }
  if (value === 'verified') {
    return <MsIcon name="verified" size={16} className="cert-tier-verified cert-tier--advanced" filled />
  }
  if (value === 'remove') {
    return <MsIcon name="remove" size={16} className="cert-tier-muted text-text-muted opacity-50" />
  }
  return <span className={cn(value.includes('50') && 'cert-tier--advanced font-bold')}>{value}</span>
}

export function CertTierComparisonTable() {
  return (
    <DlpGlass gold className="dlp-cert-tier-card">
      <DlpGlassHead title="等级权益对比" />
      <div className="dlp-glass__body !pt-0">
        <div className="grid grid-cols-5 gap-2 border-b border-[var(--wallet-divider)] pb-4 text-xs font-semibold tracking-wide text-text-muted">
          <div className="col-span-2 text-sm font-medium">维度</div>
          <div className="text-center text-sm">未认证</div>
          <div className="text-center text-base cert-tier--basic">初级</div>
          <div className="text-center text-base cert-tier--advanced">高级</div>
        </div>
        {CERT_TIER_ROWS.map((row) => (
          <div
            key={row.dim}
            className="grid grid-cols-5 gap-2 border-b border-[var(--wallet-divider)] py-4 last:border-b-0 transition-colors hover:bg-white/[0.03]"
          >
            <div className="col-span-2 text-sm text-text-primary">{row.dim}</div>
            <div className="flex justify-center">
              <TierCell value={row.none} />
            </div>
            <div className="flex justify-center">
              <TierCell value={row.basic} />
            </div>
            <div className="flex justify-center">
              <TierCell value={row.advanced} />
            </div>
          </div>
        ))}
      </div>
    </DlpGlass>
  )
}

export function CertFeatureGrid() {
  return (
    <div className="dlp-feature-grid dlp-cert-features">
      {CERT_FEATURE_CARDS.map((f) => (
        <DlpGlass key={f.title} className="dlp-feature dlp-cert-feature-card">
          <div className="dlp-cert-feature-card__icon">
            <MsIcon name={f.icon} size={28} className="text-[var(--price-foreground)]" />
          </div>
          <h3>{f.title}</h3>
          <p>{f.desc}</p>
        </DlpGlass>
      ))}
    </div>
  )
}

export function CertRightsCompareTable({
  highlightLevel,
}: {
  highlightLevel?: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'
}) {
  const colClass = (level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED') =>
    cn(
      'text-center',
      level === 'BASIC' && 'cert-tier--basic',
      level === 'INTERMEDIATE' && 'cert-tier--intermediate',
      level === 'ADVANCED' && 'cert-tier--advanced',
      highlightLevel === level && 'font-semibold cert-tier--highlight',
      highlightLevel && highlightLevel !== level && 'opacity-50',
    )

  return (
    <div className="dlp-table-wrap">
      <table className="dlp-table dlp-cert-rights-table">
        <thead>
          <tr>
            <th>权益项</th>
            <th className={colClass('BASIC')}>初级</th>
            <th className={colClass('INTERMEDIATE')}>中级</th>
            <th className={colClass('ADVANCED')}>高级</th>
          </tr>
        </thead>
        <tbody>
          {CERT_RIGHTS_ROWS.map((row) => (
            <tr key={row.dim}>
              <td className="dlp-table__primary">{row.dim}</td>
              <td className={colClass('BASIC')}>
                <div className="flex justify-center">
                  <TierCell value={row.basic} />
                </div>
              </td>
              <td className={colClass('INTERMEDIATE')}>
                <div className="flex justify-center">
                  <TierCell value={row.intermediate} />
                </div>
              </td>
              <td className={colClass('ADVANCED')}>
                <div className="flex justify-center">
                  <TierCell value={row.advanced} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
