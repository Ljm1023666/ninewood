import { useNavigate } from 'react-router-dom'
import {
  DesktopPageShell,
  DlpGlass,
  DlpGlassHead,
  DlpBtnPrimary,
} from '@/components/layout/desktop-page'
import { MsIcon } from '@/components/ui/ms-icon'

const tiers = [
  { dim: '单次抢单额度', none: '$500', basic: '$5K', advanced: '$50K+' },
  { dim: '技术服务费', none: '20%', basic: '15%', advanced: '5%' },
  { dim: '专属标识', none: 'close', basic: 'check', advanced: 'verified' },
  { dim: '专家社群', none: 'close', basic: 'remove', advanced: 'check' },
] as const

const features = [
  {
    title: '信誉保障',
    desc: '实名认证与订单履约记录，建立可信赖的服务身份。',
    icon: 'verified_user',
  },
  {
    title: '抢单额度',
    desc: '等级越高，每月可主动抢占的需求越多。',
    icon: 'bolt',
  },
  {
    title: '专属标识',
    desc: '个人主页与搜索结果展示认证徽章，提升曝光。',
    icon: 'workspace_premium',
  },
] as const

const bullets = [
  '全球公认的开发者认证标识 (Verified Status)',
  '单次任务抢单额度提升至 $50k+',
  '专属技术架构师 1对1 优先级支持',
] as const

function TierCell({ value }: { value: string }) {
  if (value === 'close') {
    return <MsIcon name="close" size={16} className="text-error" />
  }
  if (value === 'check') {
    return <MsIcon name="check" size={16} className="text-[var(--success-color)]" />
  }
  if (value === 'verified') {
    return <MsIcon name="verified" size={16} className="text-[var(--price-foreground)]" />
  }
  if (value === 'remove') {
    return <MsIcon name="remove" size={16} className="text-text-muted opacity-50" />
  }
  return <span className={value.includes('50') ? 'dlp-table__gold text-sm font-bold' : 'text-sm'}>{value}</span>
}

export default function CertIntro() {
  const navigate = useNavigate()

  return (
    <DesktopPageShell
      title="认证体系"
      subtitle="从新手到大师，逐级解锁抢单额度、搜索曝光与圈子权限"
    >
      <div className="dlp-hero-split">
        <div className="dlp-hero-copy">
          <p className="dlp-eyebrow">NINEWOOD CERTIFICATION</p>
          <h2>
            开启你的
            <br />
            <span className="text-[var(--price-foreground)]">技术身份认证</span>
          </h2>
          <p>
            解锁精英开发者的专属权限与抢单额度。通过 Ninewood 权威认证，展示您的专业高度。
          </p>
          <ul className="dlp-hero-list">
            {bullets.map((text) => (
              <li key={text}>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-[rgba(212,175,55,0.3)]">
                  <MsIcon name="check_circle" size={14} className="text-[var(--price-foreground)]" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <DlpBtnPrimary className="mt-8 !px-10 !py-4" onClick={() => navigate('/cert-center')}>
            立即开始认证
          </DlpBtnPrimary>
        </div>

        <DlpGlass gold>
          <DlpGlassHead title="等级权益对比" />
          <div className="dlp-glass__body !pt-0">
            <div className="grid grid-cols-5 gap-2 border-b border-[var(--wallet-divider)] pb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
              <div className="col-span-2">维度</div>
              <div className="text-center">未认证</div>
              <div className="text-center">初级</div>
              <div className="text-center text-[var(--price-foreground)]">高级</div>
            </div>
            {tiers.map((row) => (
              <div
                key={row.dim}
                className="grid grid-cols-5 gap-2 border-b border-[var(--wallet-divider)] py-4 last:border-b-0 hover:bg-white/[0.03]"
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
      </div>

      <div className="dlp-feature-grid">
        {features.map((f) => (
          <DlpGlass key={f.title} className="dlp-feature">
            <MsIcon name={f.icon} size={32} className="text-[var(--price-foreground)]" />
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </DlpGlass>
        ))}
      </div>
    </DesktopPageShell>
  )
}
