import type { ReactNode } from 'react'
import { MsIcon } from '@/components/ui/ms-icon'
import { CertStitchRightsTable, CertStitchTierTable } from '@/components/cert/cert-stitch-blocks'
import { FAQ, type FaqEntry, type TipType } from '@/views/help-faq-data'
import { cn } from '@/lib/utils'

export type CertResourceId = 'materials' | 'standards' | 'rights' | 'compliance'

export const CERT_RESOURCE_ITEMS: {
  id: CertResourceId
  icon: string
  title: string
  desc: string
}[] = [
  {
    id: 'materials',
    icon: 'description',
    title: '认证材料清单',
    desc: '服务项目标签、作品集与履约记录提交规范',
  },
  {
    id: 'standards',
    icon: 'gavel',
    title: '等级评审标准',
    desc: '初级 / 中级 / 高级的订单量与质量门槛说明',
  },
  {
    id: 'rights',
    icon: 'policy',
    title: '权益白皮书',
    desc: '抢单额度、费率优惠与搜索曝光规则全文',
  },
  {
    id: 'compliance',
    icon: 'security',
    title: '合规与安全',
    desc: '身份核验、材料保密与争议处理流程',
  },
]

const LEVEL_THRESHOLDS = [
  { level: 'BASIC', label: '初级认证', orders: 5, tierClass: 'cert-tier--basic' },
  { level: 'INTERMEDIATE', label: '中级认证', orders: 20, tierClass: 'cert-tier--intermediate' },
  { level: 'ADVANCED', label: '高级认证', orders: 50, tierClass: 'cert-tier--advanced' },
] as const

const MATERIAL_CHECKLIST = [
  '已确认的服务项目标签（与真实能力匹配）',
  '作品集或案例链接（可验证交付质量）',
  '近期履约记录或订单完成截图',
  '身份证件影像（实名核验，平台加密存储）',
  '技能证书或资质证明（申请技能认证时必填）',
] as const

function faqById(id: string): FaqEntry | undefined {
  return FAQ.find((f) => f.id === id)
}

function CertResourceTip({ type, content }: { type: TipType; content: string }) {
  const label = { tip: '提示', warning: '注意', danger: '警告', info: '说明' }[type]
  const icon = { tip: 'lightbulb', warning: 'warning', danger: 'error', info: 'info' }[type]
  return (
    <div className={cn('cert-stitch-resource-tip', `cert-stitch-resource-tip--${type}`)}>
      <MsIcon name={icon} size={18} />
      <div>
        <strong>{label}</strong>
        <p>{content}</p>
      </div>
    </div>
  )
}

function FaqInline({ faq }: { faq: FaqEntry }) {
  return (
    <div className="cert-stitch-resource-prose">
      <p className="cert-stitch-resource-prose__intro">{faq.intro}</p>
      {faq.steps?.length ? (
        <ol className="cert-stitch-resource-steps">
          {faq.steps.map((step, i) => (
            <li key={step.title}>
              <span className="cert-stitch-resource-steps__idx">{i + 1}</span>
              <div>
                <h4>{step.title}</h4>
                <p>{step.content}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      {faq.tips?.map((tip, i) => (
        <CertResourceTip key={i} type={tip.type} content={tip.content} />
      ))}
    </div>
  )
}

export function CertResourceDocShell({
  icon,
  title,
  onBack,
  children,
}: {
  icon: string
  title: string
  onBack: () => void
  children: ReactNode
}) {
  return (
    <div className="cert-stitch-panel-page cert-stitch-resource-doc">
      <header className="cert-stitch-resource-doc__head">
        <button type="button" className="cert-stitch-resource-doc__back" onClick={onBack}>
          <MsIcon name="arrow_back" size={18} />
          返回资源库
        </button>
        <div className="cert-stitch-resource-doc__title">
          <MsIcon name={icon} size={26} className="text-[var(--cs-primary-fixed)]" />
          <h1>{title}</h1>
        </div>
      </header>
      <div className="cert-stitch-resource-doc__body">{children}</div>
    </div>
  )
}

export function CertResourceMaterialsView() {
  const faq = faqById('how-to-cert')
  return (
    <>
      <section className="cert-stitch-glass cert-stitch-resource-section">
        <h2>提交清单</h2>
        <ul className="cert-stitch-resource-checklist">
          {MATERIAL_CHECKLIST.map((item) => (
            <li key={item}>
              <MsIcon name="check_circle" size={16} className="text-[var(--cs-accent-success)]" />
              {item}
            </li>
          ))}
        </ul>
      </section>
      {faq ? (
        <section className="cert-stitch-glass cert-stitch-resource-section">
          <h2>提交流程</h2>
          <FaqInline faq={faq} />
        </section>
      ) : null}
    </>
  )
}

export function CertResourceStandardsView({
  rightsHighlight,
}: {
  rightsHighlight?: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'
}) {
  return (
    <>
      <section className="cert-stitch-glass cert-stitch-resource-section">
        <h2>升级门槛</h2>
        <p className="cert-stitch-resource-prose__intro">
          完成对应数量的成功订单后，可在认证中心申请升级。高级及以上需管理员审核授予。
        </p>
        <div className="cert-stitch-resource-levels">
          {LEVEL_THRESHOLDS.map((row) => (
            <div key={row.level} className="cert-stitch-resource-levels__item">
              <span className={cn('cert-stitch-resource-levels__label', row.tierClass)}>
                {row.label}
              </span>
              <span className="cert-stitch-resource-levels__val">完成 {row.orders} 次服务</span>
            </div>
          ))}
        </div>
      </section>
      <section className="cert-stitch-glass cert-stitch-resource-section">
        <h2>权益对比</h2>
        <CertStitchRightsTable highlightLevel={rightsHighlight} />
      </section>
      <section className="cert-stitch-glass cert-stitch-resource-section">
        <h2>额度与费率（介绍页对照）</h2>
        <CertStitchTierTable />
      </section>
    </>
  )
}

export function CertResourceRightsView({
  rightsHighlight,
}: {
  rightsHighlight?: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'
}) {
  const benefits = faqById('cert-benefits')
  const credit = faqById('credit-system')
  return (
    <>
      {benefits ? (
        <section className="cert-stitch-glass cert-stitch-resource-section">
          <h2>等级权益说明</h2>
          <FaqInline faq={benefits} />
        </section>
      ) : null}
      <section className="cert-stitch-glass cert-stitch-resource-section">
        <h2>权益对照表</h2>
        <CertStitchRightsTable highlightLevel={rightsHighlight} />
      </section>
      {credit ? (
        <section className="cert-stitch-glass cert-stitch-resource-section">
          <h2>抢单额度与信用分</h2>
          <FaqInline faq={credit} />
        </section>
      ) : null}
    </>
  )
}

export function CertResourceComplianceView() {
  const certFaq = faqById('how-to-cert')
  const dispute = faqById('order-dispute')
  return (
    <>
      <section className="cert-stitch-glass cert-stitch-resource-section">
        <h2>身份核验与材料保密</h2>
        <p className="cert-stitch-resource-prose__intro">
          认证材料仅用于身份与技能审核，平台采用加密存储，审核人员按需最小化访问，不会向第三方公开您的证件影像。
        </p>
        {certFaq?.steps?.slice(1, 3).map((step, i) => (
          <div key={step.title} className="cert-stitch-resource-inline-block">
            <h4>
              {i + 1}. {step.title}
            </h4>
            <p>{step.content}</p>
          </div>
        ))}
        <CertResourceTip
          type="warning"
          content="请勿通过平台以外渠道发送证件原件或支付认证费用，谨防诈骗。"
        />
      </section>
      {dispute ? (
        <section className="cert-stitch-glass cert-stitch-resource-section">
          <h2>争议处理流程</h2>
          <FaqInline faq={dispute} />
        </section>
      ) : null}
    </>
  )
}

export function CertResourceDetailView({
  id,
  rightsHighlight,
  onBack,
}: {
  id: CertResourceId
  rightsHighlight?: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'
  onBack: () => void
}) {
  const meta = CERT_RESOURCE_ITEMS.find((x) => x.id === id)!
  return (
    <CertResourceDocShell icon={meta.icon} title={meta.title} onBack={onBack}>
      {id === 'materials' ? <CertResourceMaterialsView /> : null}
      {id === 'standards' ? (
        <CertResourceStandardsView rightsHighlight={rightsHighlight} />
      ) : null}
      {id === 'rights' ? <CertResourceRightsView rightsHighlight={rightsHighlight} /> : null}
      {id === 'compliance' ? <CertResourceComplianceView /> : null}
    </CertResourceDocShell>
  )
}
