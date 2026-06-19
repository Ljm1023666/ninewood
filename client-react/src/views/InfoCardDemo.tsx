import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { InfoCard } from '@/components/ui/info-card'
import { AcetFavouriteButton } from '@/components/ui/tailwindcss-buttons-variants'

const containerStyle: CSSProperties = {
  display: 'flex',
  gap: 24,
  padding: 24,
  flexWrap: 'wrap',
  justifyContent: 'center',
  alignItems: 'flex-start',
  background: 'none',
  fontFamily: 'var(--ic-font-mono, ui-monospace, monospace)',
  margin: 0,
}

const fileContainerStyle: CSSProperties = {
  width: 388,
  height: 378,
  borderRadius: '1em',
  position: 'relative',
  overflow: 'hidden',
  padding: 0,
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  background: 'none',
  boxSizing: 'border-box',
}

export default function InfoCardDemoPage() {
  const navigate = useNavigate()
  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch overflow-y-auto thin-scroll p-6 md:p-12">
      <div className="relative z-10 mx-auto w-full max-w-6xl shrink-0 self-center">
        <h1 className="mb-2 text-2xl font-black tracking-wider text-text-primary">
          InfoCard 演示
        </h1>
        <p className="mb-8 text-sm text-text-muted">
          锥形渐变边框随鼠标、RTL、标题悬停扫光。主题变量见{' '}
          <code className="rounded bg-muted px-1">index.css</code> 中{' '}
          <code className="rounded bg-muted px-1">--ic-*</code>，与{' '}
          <code className="rounded bg-muted px-1">data-appearance</code> 对齐。
        </p>
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <AcetFavouriteButton
            type="button"
            onClick={() => navigate('/ui/tailwind-buttons')}
            className="!text-sm"
          >
            打开 Aceternity 按钮样式库
          </AcetFavouriteButton>
        </div>
        <div className="info-card-demo-scope" style={containerStyle}>
          <div className="file-container" style={fileContainerStyle}>
            <InfoCard
              image="https://images.unsplash.com/photo-1567777285486-8af9bfd5d7db?q=80&w=1920&auto=format&fit=crop"
              title="American English"
              description="Master American English efficiently with personalized lessons, cultural insights, and practical exercises."
              borderColor="var(--ic-border-1)"
              borderBgColor="var(--ic-border-bg)"
              cardBgColor="var(--ic-card-bg)"
              shadowColor="var(--ic-shadow)"
              textColor="var(--ic-text)"
              hoverTextColor="var(--ic-hover-text-1)"
              fontFamily="var(--ic-font-mono)"
              rtlFontFamily="var(--ic-font-rtl)"
              effectBgColor="var(--ic-border-1)"
              patternColor1="var(--ic-pattern-1)"
              patternColor2="var(--ic-pattern-2)"
              contentPadding="14.3px 16px"
            />
          </div>
          <div className="file-container" style={fileContainerStyle}>
            <InfoCard
              image="https://images.unsplash.com/photo-1448906654166-444d494666b3?q=80&w=1920&auto=format&fit=crop"
              title="British English"
              description="Explore British English nuances, from pronunciation to idioms and dialect-specific words."
              borderColor="var(--ic-border-2)"
              borderBgColor="var(--ic-border-bg)"
              cardBgColor="var(--ic-card-bg)"
              shadowColor="var(--ic-shadow)"
              textColor="var(--ic-text)"
              hoverTextColor="var(--ic-hover-text-2)"
              fontFamily="var(--ic-font-mono)"
              rtlFontFamily="var(--ic-font-rtl)"
              effectBgColor="var(--ic-border-2)"
              patternColor1="var(--ic-pattern-1)"
              patternColor2="var(--ic-pattern-2)"
              contentPadding="14.3px 16px"
            />
          </div>
          <div className="file-container" style={fileContainerStyle}>
            <InfoCard
              image="https://images.unsplash.com/photo-1618415112746-d999da95f609?q=80&w=1920&auto=format&fit=crop"
              title="עברית"
              description="לימוד השפה העברית המודרנית, דקדוק ואוצר מילים. שיפור מיומנויות דיבור וכתיבה, חקירת ספרות עברית. הכרת תרבות ישראלית, מנהגים והיסטוריה."
              borderColor="var(--ic-border-3)"
              borderBgColor="var(--ic-border-bg)"
              cardBgColor="var(--ic-card-bg)"
              shadowColor="var(--ic-shadow)"
              textColor="var(--ic-text)"
              hoverTextColor="var(--ic-hover-text-3)"
              fontFamily="var(--ic-font-mono)"
              rtlFontFamily="var(--ic-font-rtl)"
              effectBgColor="var(--ic-border-3)"
              patternColor1="var(--ic-pattern-1)"
              patternColor2="var(--ic-pattern-2)"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
