import { Link } from 'react-router-dom'
import { MsIcon } from '@/components/ui/ms-icon'
import {
  CERT_FEATURE_CARDS,
  CERT_INTRO_BULLETS,
  CERT_TIER_ROWS,
  CERT_RIGHTS_ROWS,
  TierCell,
} from '@/components/cert/cert-marketing'
import { cn } from '@/lib/utils'

export function CertStitchTierTable() {
  return (
    <div className="cert-stitch-glass">
      <div className="cert-stitch-glass__shine" aria-hidden />
      <div className="cert-stitch-glass__body">
        <div className="cert-stitch-glass__head">
          <h3>等级权益对比</h3>
          <MsIcon name="info" size={20} className="opacity-40 text-[var(--cs-on-surface-variant)]" />
        </div>
        <div>
          <div className="cert-stitch-tier__header">
            <span>维度</span>
            <span>未认证</span>
            <span className="cert-tier--basic">初级</span>
            <span className="cert-tier--advanced">高级</span>
          </div>
          {CERT_TIER_ROWS.map((row) => (
            <div key={row.dim} className="cert-stitch-tier__row">
              <div className="cert-stitch-tier__dim">{row.dim}</div>
              <div className="cert-stitch-tier__val">
                {row.none === 'close' || row.none === 'check' || row.none === 'verified' || row.none === 'remove' ? (
                  <TierCell value={row.none} />
                ) : (
                  row.none
                )}
              </div>
              <div className="cert-stitch-tier__val cert-tier--basic">
                {row.basic === 'close' || row.basic === 'check' || row.basic === 'verified' || row.basic === 'remove' ? (
                  <TierCell value={row.basic} />
                ) : (
                  row.basic
                )}
              </div>
              <div className="cert-stitch-tier__val cert-tier--advanced">
                {row.advanced === 'close' || row.advanced === 'check' || row.advanced === 'verified' || row.advanced === 'remove' ? (
                  <TierCell value={row.advanced} />
                ) : (
                  row.advanced
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CertStitchHero({
  onPrimary,
  primaryLabel = '立即开始认证',
}: {
  onPrimary: () => void
  primaryLabel?: string
}) {
  return (
    <section id="cert-path" className="cert-stitch-hero">
      <div className="cert-stitch-hero__copy is-fade-in">
        <h1 className="cert-stitch-hero__title">
          开启你的
          <br />
          <em>技术身份认证</em>
        </h1>
        <p className="cert-stitch-hero__lead">
          解锁精英开发者的专属权限与抢单额度。通过 Ninewood 权威认证，展示您的专业高度。
        </p>
        <ul className="cert-stitch-hero__bullets">
          {CERT_INTRO_BULLETS.map((text) => (
            <li key={text}>
              <span className="cert-stitch-hero__bullet-icon">
                <MsIcon name="check_circle" size={14} className="text-[var(--cs-primary-fixed)]" filled />
              </span>
              {text}
            </li>
          ))}
        </ul>
        <button type="button" className="cert-stitch-hero__cta" onClick={onPrimary}>
          {primaryLabel}
        </button>
      </div>
      <div id="cert-tiers" className="cert-stitch-hero__table-wrap">
        <CertStitchTierTable />
      </div>
    </section>
  )
}

export function CertStitchFeatureGrid() {
  return (
    <section id="cert-benefits" className="cert-stitch-features">
      {CERT_FEATURE_CARDS.map((card) => (
        <div key={card.title} className="cert-stitch-glass cert-stitch-feature">
          <div className="cert-stitch-feature__glow" aria-hidden />
          <div className="cert-stitch-feature__icon">
            <MsIcon name={card.icon} size={28} />
          </div>
          <h3>{card.title}</h3>
          <p>{card.desc}</p>
        </div>
      ))}
    </section>
  )
}

export function CertStitchBottomCta({
  onPrimary,
  onSecondary,
  primaryLabel = '上传认证材料',
}: {
  onPrimary: () => void
  onSecondary: () => void
  primaryLabel?: string
}) {
  return (
    <section className="cert-stitch-glass cert-stitch-bottom-cta">
      <h2>准备好证明您的专业能力了吗？</h2>
      <p>
        认证过程通常需要 3-5 个工作日，我们的专家委员会将对您的技术背景、项目经验和代码质量进行深度评估。
      </p>
      <div className="cert-stitch-bottom-cta__actions">
        <button type="button" className="cert-stitch-btn-solid" onClick={onPrimary}>
          {primaryLabel}
        </button>
        <button type="button" className="cert-stitch-btn-outline" onClick={onSecondary}>
          查看详细要求
        </button>
      </div>
    </section>
  )
}

export function CertStitchFooter() {
  const year = new Date().getFullYear()
  return (
    <footer id="cert-ecosystem" className="cert-stitch-footer">
      <div className="cert-stitch-footer__inner">
        <div className="cert-stitch-footer__brand">
          <span className="cert-stitch-footer__logo">Ninewood</span>
          <p className="cert-stitch-footer__copy">
            © {year} Ninewood Elite Technical Authority. 保留所有权利。
          </p>
        </div>
        <div className="cert-stitch-footer__cols">
          <div className="cert-stitch-footer__col">
            <p>法律合规</p>
            <Link to="/privacy">隐私政策</Link>
            <Link to="/terms">服务条款</Link>
          </div>
          <div className="cert-stitch-footer__col">
            <p>支持中心</p>
            <Link to="/help">安全白皮书</Link>
            <Link to="/help">联系我们</Link>
          </div>
        </div>
        <div className="cert-stitch-footer__social">
          <a href="mailto:support@ninewood.local" aria-label="邮件">
            <MsIcon name="alternate_email" size={20} />
          </a>
          <a href="/" aria-label="官网">
            <MsIcon name="public" size={20} />
          </a>
        </div>
      </div>
    </footer>
  )
}

export function CertStitchRightsTable({
  highlightLevel,
}: {
  highlightLevel?: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'
}) {
  const thClass = (level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED') =>
    cn(
      level === 'BASIC' && 'cert-tier--basic',
      level === 'INTERMEDIATE' && 'cert-tier--intermediate',
      level === 'ADVANCED' && 'cert-tier--advanced',
      highlightLevel === level && 'is-highlight cert-tier--highlight',
      highlightLevel && highlightLevel !== level && 'is-dim',
    )

  const tdClass = (level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED') =>
    cn(
      level === 'BASIC' && 'cert-tier--basic',
      level === 'INTERMEDIATE' && 'cert-tier--intermediate',
      level === 'ADVANCED' && 'cert-tier--advanced',
      highlightLevel === level && 'is-highlight cert-tier--highlight',
      highlightLevel && highlightLevel !== level && 'is-dim',
    )

  return (
    <table className="cert-stitch-rights-table">
      <thead>
        <tr>
          <th>权益项</th>
          <th className={thClass('BASIC')}>初级</th>
          <th className={thClass('INTERMEDIATE')}>中级</th>
          <th className={thClass('ADVANCED')}>高级</th>
        </tr>
      </thead>
      <tbody>
        {CERT_RIGHTS_ROWS.map((row) => (
          <tr key={row.dim}>
            <td>{row.dim}</td>
            <td className={tdClass('BASIC')}>
              {typeof row.basic === 'string' && !['close', 'check', 'verified', 'remove'].includes(row.basic) ? (
                row.basic
              ) : (
                <TierCell value={row.basic} />
              )}
            </td>
            <td className={tdClass('INTERMEDIATE')}>
              {typeof row.intermediate === 'string' &&
              !['close', 'check', 'verified', 'remove'].includes(row.intermediate) ? (
                row.intermediate
              ) : (
                <TierCell value={row.intermediate} />
              )}
            </td>
            <td className={tdClass('ADVANCED')}>
              {typeof row.advanced === 'string' &&
              !['close', 'check', 'verified', 'remove'].includes(row.advanced) ? (
                row.advanced
              ) : (
                <TierCell value={row.advanced} />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
