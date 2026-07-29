import { useNavigate } from 'react-router-dom'
import {
  DesktopPageShell,
  DlpBtnPrimary,
  DlpBtnGhost,
} from '@/components/layout/desktop-page'
import { MsIcon } from '@/components/ui/ms-icon'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

const shortcuts = [
  { label: '去发现', path: '/', icon: 'explore' },
  { label: '订单中心', path: '/orders', icon: 'receipt_long' },
  { label: '帮助中心', path: '/help', icon: 'help' },
] as const

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <DesktopPageShell title="页面不存在">
      <div className="dlp-not-found">
        <div className="dlp-not-found__code">404</div>

        <div>
          <h2 className="dlp-title !text-3xl">找不到该页面</h2>
          <p className="dlp-subtitle">
            你访问的链接可能已失效、被移除，或地址输入有误。可以返回上一页，或从下方快捷入口继续浏览。
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <DlpBtnGhost onClick={() => navigate(-1)}>返回上一页</DlpBtnGhost>
            <DlpBtnPrimary onClick={() => navigate('/')}>回首页</DlpBtnPrimary>
          </div>

          <div className="dlp-shortcut-grid">
            {shortcuts.map((s) => (
              <LiquidMetalButton
                key={s.path}
                type="button"
                onClick={() => navigate(s.path)}
                className="dlp-glass dlp-shortcut"
              >
                <MsIcon name={s.icon} size={20} className="text-[var(--price-foreground)]" />
                <span className="text-sm font-medium text-text-primary">{s.label}</span>
              </LiquidMetalButton>
            ))}
          </div>
        </div>
      </div>
    </DesktopPageShell>
  )
}
