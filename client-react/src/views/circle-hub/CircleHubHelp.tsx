import { useState } from 'react'
import { MsIcon } from '@/components/ui/ms-icon'
import { toast } from '@/components/ui/confirm-dialog'
import { useCircleHub } from './circle-hub-context'

const FAQ = [
  {
    q: '如何在此圈子发布需求？',
    a: '在圈子主页点击“发布需求”按钮，填写项目描述、所需技能及合作方式。建议附上原型图或参考链接以提高匹配率。',
  },
  {
    q: '圈子是否允许商业推广？',
    a: '仅限于在“资源文件”板块分享与开发相关的工具、SaaS 服务或开源项目。严禁在讨论区发布无关广告。',
  },
  {
    q: '如何联系其他圈友进行合作？',
    a: '点击成员头像进入个人主页，可通过私信或其留下的联系方式（如微信、邮箱）发起沟通。',
  },
  {
    q: '圈子内的资源如何下载？',
    a: '进入左侧导航栏的“资源文件”板块，即可浏览并下载圈友共享的设计规范、开源代码和相关文档。',
  },
]

const QUICK_LINKS = [
  { icon: 'description', label: '新手指南' },
  { icon: 'verified_user', label: '账号安全' },
  { icon: 'notifications_active', label: '通知设置' },
  { icon: 'api', label: 'API 文档' },
]

const RULES = [
  '友善交流，尊重每位开发者的技术栈选择。',
  '禁止灌水、刷屏或发布违法违规内容。',
  '开源项目推广需附带详细介绍。',
]

/** 帮助中心 — Stitch help-variant-c Bento 卡片布局 */
export default function CircleHubHelp() {
  const { circle } = useCircleHub()
  const [query, setQuery] = useState('')

  if (!circle) return null

  const ownerName = circle.owner?.nickname || '圈主'
  const ownerMember = circle.members?.find((m) => m.role === 'OWNER')
  const ownerAvatar = ownerMember?.user?.avatarUrl

  function handleSearch() {
    toast(query.trim() ? `搜索「${query.trim()}」功能即将上线` : '请输入搜索关键词', 'info')
  }

  function stubLink(label: string) {
    toast(`${label}功能即将上线`, 'info')
  }

  return (
    <div className="cdb-main-inner cdb-hub-page">
      <div className="cdb-hub-help-grid">
        <div className="cdb-hub-help-intro">
          <MsIcon name="support_agent" size={32} className="cdb-text-primary" aria-hidden />
          <div>
            <h2 className="cdb-hub-page-title">帮助中心</h2>
            <p className="cdb-text-muted cdb-text-body-sm">{circle.name} - 专属服务支持</p>
          </div>
        </div>

        <section className="cdb-glass-card cdb-hub-help-search">
          <div className="cdb-hub-help-search-field">
            <MsIcon name="search" size={22} className="cdb-hub-search-icon" aria-hidden />
            <input
              className="cdb-hub-help-search-input"
              placeholder="搜索问题、规则或指南..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button type="button" className="cdb-btn-primary cdb-hub-help-search-btn" onClick={handleSearch}>
            搜索
          </button>
        </section>

        <section className="cdb-glass-card cdb-hub-faq">
          <div className="cdb-hub-faq-head">
            <MsIcon name="quiz" size={22} className="cdb-text-primary" aria-hidden />
            <h3 className="cdb-hub-card-title">常见问题 (FAQ)</h3>
          </div>
          <div className="cdb-hub-faq-list">
            {FAQ.map((item) => (
              <details key={item.q} className="cdb-hub-faq-item">
                <summary className="cdb-hub-faq-summary">
                  <span>{item.q}</span>
                  <MsIcon name="expand_more" size={22} className="cdb-hub-faq-chevron" aria-hidden />
                </summary>
                <p className="cdb-text-muted cdb-hub-faq-answer">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="cdb-glass-card cdb-hub-quick-links">
          <div className="cdb-hub-faq-head">
            <MsIcon name="bolt" size={22} className="cdb-text-primary" aria-hidden />
            <h3 className="cdb-hub-card-title">快捷入口</h3>
          </div>
          <div className="cdb-hub-quick-grid">
            {QUICK_LINKS.map((link) => (
              <button
                key={link.label}
                type="button"
                className="cdb-hub-quick-item"
                onClick={() => stubLink(link.label)}
              >
                <MsIcon name={link.icon} size={24} className="cdb-text-muted" aria-hidden />
                <span>{link.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="cdb-glass-card cdb-hub-rules">
          <div className="cdb-hub-faq-head">
            <MsIcon name="gavel" size={22} className="cdb-hub-icon-tertiary" aria-hidden />
            <h3 className="cdb-hub-card-title">圈子公约</h3>
          </div>
          <ul className="cdb-hub-rules-list">
            {RULES.map((rule) => (
              <li key={rule}>
                <MsIcon name="check_circle" size={18} className="cdb-hub-icon-tertiary" aria-hidden />
                <span className="cdb-text-muted">{rule}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="cdb-demands-link cdb-hub-rules-more" onClick={() => stubLink('完整规范')}>
            查看完整规范 →
          </button>
        </section>

        <section className="cdb-glass-card cdb-hub-contact">
          <div className="cdb-hub-contact-main">
            <div className="cdb-hub-contact-avatar-wrap">
              {ownerAvatar ? (
                <img src={ownerAvatar} alt="" className="cdb-hub-contact-avatar" />
              ) : (
                <div className="cdb-hub-contact-avatar-fallback">{ownerName.slice(0, 1)}</div>
              )}
              <span className="cdb-hub-contact-online" />
            </div>
            <div>
              <h4 className="cdb-hub-card-title">需要更多帮助？</h4>
              <p className="cdb-text-muted cdb-text-body-sm">
                直接联系圈主 <span className="cdb-text-primary">{ownerName}</span>，通常在 2 小时内回复。
              </p>
            </div>
          </div>
          <div className="cdb-hub-contact-actions">
            <button type="button" className="cdb-hub-btn-outline" onClick={() => stubLink('发送私信')}>
              <MsIcon name="mail" size={20} aria-hidden />
              发送私信
            </button>
            <button type="button" className="cdb-btn-primary" onClick={() => stubLink('在线咨询')}>
              <MsIcon name="forum" size={20} aria-hidden />
              在线咨询
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
