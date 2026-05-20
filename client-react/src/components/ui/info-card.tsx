import { useRef, useState, useCallback, type CSSProperties, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { isRTL } from '@/lib/is-rtl'

export interface InfoCardProps {
  image: string
  /** 顶部图 alt，默认与 title 相同 */
  imageAlt?: string
  title: string
  description: string
  width?: number | string
  height?: number | string
  borderColor?: string
  borderBgColor?: string
  borderWidth?: number
  borderPadding?: number
  cardBgColor?: string
  /** 预留：悬浮投影等扩展 */
  shadowColor?: string
  patternColor1?: string
  patternColor2?: string
  textColor?: string
  hoverTextColor?: string
  fontFamily?: string
  rtlFontFamily?: string
  effectBgColor?: string
  contentPadding?: string
  /** 铺满父级（翻面内嵌等），内层宽高 100% */
  fillContainer?: boolean
  /** clamp：与示例一致 3 行截断；scroll：长文案可滚动 */
  descriptionMode?: 'clamp' | 'scroll'
  /** 顶部大图点击跳转（如他人主页）；翻面卡片内需配合外层 `closest('a')` 忽略翻面 */
  heroImageTo?: string
  /** 顶部图链接无障碍说明 */
  heroImageAriaLabel?: string
  /** 外框与内层面板圆角；翻面内嵌须与 InteractiveProductCard 的 rounded-3xl 一致，避免四角露边 */
  shellBorderRadius?: string
}

export function InfoCard({
  image,
  imageAlt,
  title,
  description,
  width = 388,
  height = 378,
  borderColor = '#DAFF3E',
  borderBgColor = '#242424',
  borderWidth = 3,
  borderPadding = 14,
  cardBgColor = 'var(--bg-primary)',
  patternColor1 = 'rgba(230,230,230,0.15)',
  patternColor2 = 'rgba(240,240,240,0.15)',
  textColor = '#f5f5f5',
  hoverTextColor = '#242424',
  fontFamily = "'Roboto Mono', monospace",
  rtlFontFamily = "var(--font-family)",
  effectBgColor = '#DAFF3E',
  contentPadding = '10px 16px',
  fillContainer = false,
  descriptionMode = 'clamp',
  heroImageTo,
  heroImageAriaLabel,
  shellBorderRadius = '1em',
}: InfoCardProps) {
  const [hovered, setHovered] = useState(false)
  const borderRef = useRef<HTMLDivElement>(null)

  const updatePointerRotation = useCallback(
    (clientX: number, clientY: number) => {
      const border = borderRef.current
      if (!border) return
      const rect = border.getBoundingClientRect()
      const x = clientX - rect.left - rect.width / 2
      const y = clientY - rect.top - rect.height / 2
      const angle = Math.atan2(y, x)
      border.style.setProperty('--rotation', `${angle}rad`)
    },
    [],
  )

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    updatePointerRotation(e.clientX, e.clientY)
  }

  const rtl = isRTL(title) || isRTL(description)
  const effectiveFont = rtl ? rtlFontFamily : fontFamily
  const titleDirection = isRTL(title) ? 'rtl' : 'ltr'
  const descDirection = isRTL(description) ? 'rtl' : 'ltr'

  const innerWidth = fillContainer ? '100%' : 354
  const innerHeight = fillContainer ? '100%' : 344

  const pattern =
    `linear-gradient(45deg, ${patternColor1} 25%, transparent 25%, transparent 75%, ${patternColor2} 75%),` +
    `linear-gradient(-45deg, ${patternColor2} 25%, transparent 25%, transparent 75%, ${patternColor1} 75%)`

  const borderGradient = `conic-gradient(from var(--rotation, 0rad), ${borderColor} 0deg, ${borderColor} 90deg, ${borderBgColor} 90deg, ${borderBgColor} 360deg)`

  return (
    <div
      ref={borderRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        borderRef.current?.style.setProperty('--rotation', '0rad')
      }}
      style={
        {
          width: fillContainer ? '100%' : width,
          height: fillContainer ? '100%' : height,
          minHeight: fillContainer ? 0 : undefined,
          minWidth: fillContainer ? 0 : undefined,
          border: `${borderWidth}px solid transparent`,
          borderRadius: shellBorderRadius,
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          backgroundImage: `linear-gradient(${cardBgColor}, ${cardBgColor}), ${borderGradient}`,
          padding: borderPadding,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'box-shadow 0.3s',
          position: 'relative',
          fontFamily: effectiveFont,
        } as CSSProperties
      }
    >
      <div
        className="[text-rendering:auto]"
        style={
          {
            width: innerWidth,
            height: innerHeight,
            maxWidth: fillContainer ? '100%' : undefined,
            maxHeight: fillContainer ? '100%' : undefined,
            minHeight: fillContainer ? 0 : undefined,
            borderRadius: shellBorderRadius,
            background: cardBgColor,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            backgroundImage: pattern,
            backgroundSize: '20.84px 20.84px',
            padding: '0 0 8px 0',
          } as CSSProperties
        }
      >
        <div
          style={{
            width: '100%',
            flex: '0 0 48%',
            minHeight: 0,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {heroImageTo ? (
            <Link
              to={heroImageTo}
              aria-label={heroImageAriaLabel ?? imageAlt ?? title}
              className="block h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ic-card-bg,var(--bg-primary))] focus-visible:ring-white/40"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={image}
                alt=""
                decoding="async"
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </Link>
          ) : (
            <img
              src={image}
              alt={imageAlt ?? title}
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          )}
        </div>
        <div
          className="[text-rendering:auto]"
          style={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent:
              descriptionMode === 'scroll' ? 'flex-start' : 'space-between',
            gap: descriptionMode === 'scroll' ? 8 : undefined,
            padding: contentPadding,
            minHeight: 0,
          }}
        >
          <h1
            style={{
              fontSize: 21,
              fontWeight: 'bold',
              letterSpacing: '-.01em',
              lineHeight: 'normal',
              marginBottom: 5,
              color: hovered ? hoverTextColor : textColor,
              transition: 'color 0.3s ease',
              position: 'relative',
              overflow: 'hidden',
              direction: titleDirection,
              width: 'auto',
              flexShrink: descriptionMode === 'scroll' ? 0 : undefined,
              textRendering: 'auto',
              WebkitFontSmoothing: 'auto',
            }}
          >
            <span
              style={{
                position: 'relative',
                zIndex: 10,
                padding: '2px 4px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                width: '100%',
                height: '100%',
              }}
            >
              {title}
            </span>
            <span
              style={{
                clipPath: hovered
                  ? 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)'
                  : 'polygon(0 50%, 100% 50%, 100% 50%, 0 50%)',
                transformOrigin: 'center',
                transition: 'clip-path 0.4s cubic-bezier(.1,.5,.5,1)',
                position: 'absolute',
                left: -4,
                right: -4,
                top: -4,
                bottom: -4,
                zIndex: 0,
                backgroundColor: effectBgColor,
              }}
            />
          </h1>
          <p
            className={
              descriptionMode === 'scroll'
                ? 'thin-scroll min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap'
                : undefined
            }
            style={{
              fontSize: 14,
              color: textColor,
              textRendering: 'auto',
              WebkitFontSmoothing: 'auto',
              ...(descriptionMode === 'clamp'
                ? {
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }
                : {
                    display: 'block',
                  }),
              direction: descDirection,
              marginBottom: 0,
              paddingBottom: 0,
              minHeight: 0,
            }}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

export { isRTL } from '@/lib/is-rtl'
