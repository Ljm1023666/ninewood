import {
  useRef,
  useState,
  useEffect,
  type CSSProperties,
  type MouseEvent,
  type HTMLAttributes,
} from 'react'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
} from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/theme'
import { InfoCard } from '@/components/ui/info-card'
import { publisherUserCoverPreset } from '@/utils/user-cover-presets'
import {
  getImageAvgLuminance,
  LIGHT_IMAGE_LUMINANCE_THRESHOLD,
} from '@/utils/image-analyzer'

export interface InteractiveProductCardProps extends HTMLAttributes<HTMLDivElement> {
  imageUrl: string
  logoUrl: string
  title: string
  description: string
  price: string
  avatarTo?: string
  avatarLabel?: string
  dotCount?: number
  activeDotIndex?: number
  /** 上滑/滚轮向下 → 下一张 */
  onSwipeNext?: () => void
  /** 下滑/滚轮向上 → 上一张 */
  onSwipePrev?: () => void
  /** 为 true 时由外层垂直拖动手势切页，关闭内部滑切/滚轮切页 */
  externalVerticalDrag?: boolean
  /** 点击背面价格区域回调（加入手牌） */
  onAddToHand?: () => void
  /** 为 true 时关闭本卡片自带的鼠标 3D 倾斜（供外层如 CometCard 统一做 3D） */
  disableSurfaceTilt?: boolean
  /** 全卡跟手高光（与 CometCard 联用时开启） */
  innerSheen?: boolean
  /** 点击翻面：正面标题置于橙色横条内 + 左下角红色价格；背面 InfoCard 完整描述 */
  flipDescription?: boolean
  /** 背面顶部大图：个人中心封面；未传时用 publisherUserId 映射预设图（与全站个人中心一致） */
  profileCoverUrl?: string | null
  /** 与 profileCoverUrl 搭配：发布者 id，用于无封面时的预设封面 */
  publisherUserId?: string | null
}

function parsePriceNumber(price: string): number {
  const n = Number(price.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function InteractiveProductCard({
  className,
  imageUrl,
  logoUrl,
  title,
  description,
  price,
  avatarTo,
  avatarLabel,
  dotCount = 4,
  activeDotIndex = 0,
  onSwipeNext,
  onSwipePrev,
  externalVerticalDrag = false,
  disableSurfaceTilt = false,
  innerSheen = false,
  flipDescription = false,
  profileCoverUrl,
  publisherUserId,
  onAddToHand,
  ...props
}: InteractiveProductCardProps) {
  const navigate = useNavigate()
  const cardRef = useRef<HTMLDivElement>(null)
  const isDark = useThemeStore((s) => s.current.dark)
  const [flipped, setFlipped] = useState(false)
  const flippedRef = useRef(false)
  flippedRef.current = flipped
  const [imageSrc, setImageSrc] = useState(imageUrl)
  const fallbackCover = publisherUserCoverPreset(publisherUserId ?? undefined)
  useEffect(() => {
    setImageSrc(imageUrl)
  }, [imageUrl])

  const sheenX = useMotionValue(0)
  const sheenY = useMotionValue(0)
  const sheenXSpring = useSpring(sheenX)
  const sheenYSpring = useSpring(sheenY)
  /** 彩虹箔纸扫光位置 — 跟手移动 */
  const foilPosX = useTransform(sheenXSpring, [-0.5, 0.5], [0, 100])
  const foilPosY = useTransform(sheenYSpring, [-0.5, 0.5], [0, 100])
  const foilPosition = useMotionTemplate`${foilPosX}% ${foilPosY}%`

  /** 低调白光 — 浅色图片用 */
  const sheenGlareX = useTransform(sheenXSpring, [-0.5, 0.5], [0, 100])
  const sheenGlareY = useTransform(sheenYSpring, [-0.5, 0.5], [0, 100])
  const subtleSheen = useMotionTemplate`radial-gradient(circle farthest-corner at ${sheenGlareX}% ${sheenGlareY}%, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.42) 30%, rgba(255,255,255,0.16) 64%, rgba(255,255,255,0) 100%)`

  /** sheen 模式：浅色图用低调白光，深色图用彩虹扫光 */
  const [sheenMode, setSheenMode] = useState<'rainbow' | 'subtle'>('rainbow')

  useEffect(() => {
    let cancelled = false
    getImageAvgLuminance(imageUrl)
      .then((lum) => {
        if (cancelled) return
        setSheenMode(
          lum > LIGHT_IMAGE_LUMINANCE_THRESHOLD ? 'subtle' : 'rainbow',
        )
      })
      .catch(() => {
        if (!cancelled) setSheenMode('rainbow')
      })
    return () => {
      cancelled = true
    }
  }, [imageUrl])
  /** 微噪点纹理 — 模拟实体卡纸的颗粒触感 */
  const noiseTextureUrl =
    'url("data:image/svg+xml,%3Csvg%20viewBox=%220%200%20256%20256%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter%20id=%22n%22%3E%3CfeTurbulence%20type=%22fractalNoise%22%20baseFrequency=%220.85%22%20numOctaves=%223%22%20stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20filter=%22url(%23n)%22/%3E%3C/svg%3E")'

  const [style, setStyle] = useState<CSSProperties>({})
  const onSwipeNextRef = useRef(onSwipeNext)
  const onSwipePrevRef = useRef(onSwipePrev)
  onSwipeNextRef.current = onSwipeNext
  onSwipePrevRef.current = onSwipePrev
  const removeMouseSwipeListenersRef = useRef<(() => void) | null>(null)

  // 切换卡片或内容变化时清空 3D tilt 和翻面状态
  useEffect(() => {
    setStyle({})
    sheenX.set(0)
    sheenY.set(0)
    setFlipped(false)
    return () => {
      removeMouseSwipeListenersRef.current?.()
      removeMouseSwipeListenersRef.current = null
    }
  }, [imageUrl, logoUrl, title, description, price, sheenX, sheenY])

  const safeToggleFlip = () => {
    if (!flipDescription || !description.trim()) return
    setFlipped((v) => !v)
  }

  // ── 桌面：鼠标跟动 ──
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (
      !externalVerticalDrag &&
      (onSwipeNextRef.current || onSwipePrevRef.current) &&
      e.buttons & 1
    ) {
      return
    }
    if (innerSheen && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      sheenX.set((e.clientX - rect.left) / rect.width - 0.5)
      sheenY.set((e.clientY - rect.top) / rect.height - 0.5)
    }
    if (disableSurfaceTilt) return
    if (!cardRef.current) return
    const { left, top, width, height } = cardRef.current.getBoundingClientRect()
    const rx = ((e.clientY - top) / height - 0.5) * 2
    const ry = ((e.clientX - left) / width - 0.5) * 2
    setStyle({
      transform: `perspective(800px) rotateX(${rx * -7}deg) rotateY(${ry * 7}deg) scale3d(1.06, 1.06, 1.06)`,
      transition: 'transform 0.1s ease-out',
    })
  }

  const resetTilt = () => {
    sheenX.set(0)
    sheenY.set(0)
    if (!disableSurfaceTilt) {
      setStyle({
        transform:
          'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1.06, 1.06, 1.06)',
        transition: 'transform 0.2s ease-out',
      })
    }
  }

  /** 左键按下后在任意位置松手：按垂直位移切上/下一张 */
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (externalVerticalDrag) return
    if (flipDescription && description.trim() && flipped) return
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('a, button')) return
    if (!onSwipeNextRef.current && !onSwipePrevRef.current) return

    removeMouseSwipeListenersRef.current?.()
    const startY = e.clientY
    let finished = false
    const finish = (ev: globalThis.MouseEvent) => {
      if (finished) return
      finished = true
      window.removeEventListener('mouseup', finish, true)
      window.removeEventListener('blur', onBlur)
      removeMouseSwipeListenersRef.current = null
      const dy = startY - ev.clientY
      if (flipDescription && description.trim() && flippedRef.current) {
        resetTilt()
        return
      }
      if (dy > 50 && onSwipeNextRef.current) onSwipeNextRef.current()
      else if (dy < -50 && onSwipePrevRef.current) onSwipePrevRef.current()
      else resetTilt()
    }
    const onBlur = () => {
      if (finished) return
      finished = true
      window.removeEventListener('mouseup', finish, true)
      window.removeEventListener('blur', onBlur)
      removeMouseSwipeListenersRef.current = null
      resetTilt()
    }
    window.addEventListener('mouseup', finish, true)
    window.addEventListener('blur', onBlur)
    removeMouseSwipeListenersRef.current = () => {
      if (!finished) {
        finished = true
        window.removeEventListener('mouseup', finish, true)
        window.removeEventListener('blur', onBlur)
      }
    }
  }

  const handleMouseLeave = (e: MouseEvent<HTMLDivElement>) => {
    if (e.buttons & 1) return
    resetTilt()
  }

  // 鼠标滚轮
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (externalVerticalDrag) return
    if (flipDescription && description.trim() && flipped) return
    if (e.deltaY > 30 && onSwipeNext) onSwipeNext()
    else if (e.deltaY < -30 && onSwipePrev) onSwipePrev()
  }

  const safeDots = Math.min(Math.max(dotCount, 1), 12)
  const safeActive = Math.min(Math.max(activeDotIndex, 0), safeDots - 1)

  const isFlipLayout = flipDescription && description.trim().length > 0
  const profileBackImageUrl =
    profileCoverUrl?.trim() ||
    publisherUserCoverPreset(publisherUserId ?? undefined)
  const numericPrice = parsePriceNumber(price)
  /** 翻面标题色条：按价格档次选用 CSS shimmer 类（绿/蓝/紫/橙/红/金/虹彩） */
  const titleBarShimmerVariant = cn(
    'flip-card-title-bar-shimmer',
    numericPrice > 10000
      ? 'flip-card-title-bar-shimmer--rainbow'
      : numericPrice > 3000
        ? 'flip-card-title-bar-shimmer--gold'
        : numericPrice > 1000
          ? 'flip-card-title-bar-shimmer--red'
          : numericPrice > 500
            ? 'flip-card-title-bar-shimmer--orange'
            : numericPrice > 100
              ? 'flip-card-title-bar-shimmer--violet'
              : numericPrice > 10
                ? 'flip-card-title-bar-shimmer--blue'
                : 'flip-card-title-bar-shimmer--green',
  )
  /** 翻面布局时根节点不要叠 perspective，否则与 CometCard / 内层 perspective 叠加，背面会像斜薄片、出现诡异侧棱 */
  const rootTransformStyle: CSSProperties = isFlipLayout
    ? {}
    : disableSurfaceTilt
      ? {
          transform:
            'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
        }
      : style

  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      style={rootTransformStyle}
      className={cn(
        /* 宽度用视口推算，避免父级 flex 压缩时 100% 变成极窄条 */
        /* 宽度：扣除全局侧栏，避免在 main 内仍按整屏 vw 计算导致视觉不居中 */
        'relative box-border aspect-[9/16] w-[min(332px,calc(100vw-var(--sidebar-w,72px)-2.5rem))] max-w-full shrink-0 rounded-3xl [will-change:transform]',
        isFlipLayout ? 'shadow-none' : 'shadow-lg',
        isFlipLayout ? 'overflow-visible' : 'overflow-hidden',
        'bg-transparent',
        className,
        isFlipLayout && '!ring-0 !ring-offset-0',
      )}
      {...props}
    >
      {isFlipLayout ? (
        <div className="absolute inset-0 [perspective:1400px] [transform-style:preserve-3d]">
          <div
            role="button"
            tabIndex={0}
            aria-label={flipped ? '返回卡片正面' : '查看需求描述'}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('a, button')) return
              safeToggleFlip()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                safeToggleFlip()
              }
            }}
            className={cn(
              'absolute inset-0 cursor-pointer outline-none [transform-style:preserve-3d]',
              isDark
                ? 'focus-visible:ring-2 focus-visible:ring-white/35'
                : 'focus-visible:ring-2 focus-visible:ring-black/25',
            )}
            style={{
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transformOrigin: '50% 50%',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* 正面：封面 + 高光 + 文案；翻面时子层不再 translateZ，避免旋转时挤出“盒子侧棱” */}
            <div
              className="absolute inset-0 z-[1] overflow-hidden rounded-3xl [backface-visibility:hidden] [transform-style:preserve-3d]"
              style={{ transform: 'rotateY(0deg) translateZ(0)' }}
            >
              <img
                src={imageSrc}
                alt={title}
                decoding="async"
                fetchPriority="high"
                onError={() => setImageSrc(fallbackCover)}
                className="absolute inset-0 h-full w-full rounded-3xl object-cover [backface-visibility:hidden]"
                style={{ transform: 'translateZ(0) scale(1)' }}
              />

              {innerSheen ? (
                <>
                  {sheenMode === 'rainbow' ? (
                    <>
                      {/* 彩虹箔纸扫光 */}
                      <motion.div
                        className="pointer-events-none absolute inset-0 z-[5] h-full w-full rounded-3xl [backface-visibility:hidden]"
                        style={{
                          transform: 'translateZ(0)',
                          mixBlendMode: 'overlay' as const,
                          opacity: 0.65,
                          background: `
                            linear-gradient(
                              125deg,
                              rgba(255,60,60,0.7) 0%,
                              rgba(255,160,20,0.65) 12%,
                              rgba(240,240,40,0.6) 24%,
                              rgba(50,220,100,0.55) 36%,
                              rgba(30,180,240,0.55) 48%,
                              rgba(80,60,240,0.6) 60%,
                              rgba(200,40,220,0.6) 72%,
                              rgba(255,60,130,0.65) 84%,
                              rgba(255,60,60,0.7) 100%
                            )
                          `
                            .replace(/\s+/g, ' ')
                            .trim(),
                          backgroundSize: '280% 280%',
                          backgroundPosition: foilPosition,
                        }}
                      />
                      {/* 噪点纹理 */}
                      <div
                        className="pointer-events-none absolute inset-0 z-[7] h-full w-full rounded-3xl [backface-visibility:hidden]"
                        style={{
                          transform: 'translateZ(2px)',
                          mixBlendMode: 'overlay',
                          opacity: 0.08,
                          backgroundImage: noiseTextureUrl,
                        }}
                      />
                    </>
                  ) : (
                    <motion.div
                      className="pointer-events-none absolute inset-0 z-[5] h-full w-full rounded-3xl mix-blend-soft-light [backface-visibility:hidden]"
                      style={{
                        transform: 'translateZ(0)',
                        background: subtleSheen,
                        opacity: 0.62,
                      }}
                    />
                  )}
                </>
              ) : null}

              <div
                className="absolute inset-0 z-10 flex min-h-0 flex-col pt-16"
                style={{ transform: 'translateZ(40px)' }}
              >
                <div
                  className={cn(
                    'relative shrink-0 flex w-full justify-center overflow-hidden px-4 backdrop-blur-sm [text-rendering:optimizeLegibility]',
                    titleBarShimmerVariant,
                  )}
                  style={{ paddingTop: 16, paddingBottom: 16 }}
                >
                  <h3
                    className={cn(
                      'relative z-10 m-0 w-full text-center text-[22px] font-bold leading-tight tracking-tight',
                      isDark
                        ? 'text-white [text-shadow:none]'
                        : 'text-black [text-shadow:none]',
                    )}
                  >
                    {title}
                  </h3>
                </div>

                <div className="pointer-events-none absolute bottom-5 left-1/2 z-[11] flex -translate-x-1/2 gap-2">
                  {Array.from({ length: safeDots }).map((_, index) => (
                    <div
                      key={index}
                      data-active={index === safeActive ? 'true' : 'false'}
                      className="flip-card-front-dot h-1.5 w-1.5 shrink-0"
                    >
                      <span
                        className="flip-card-front-dot-shine"
                        style={{
                          animationDelay: `${index * 0.14}s`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 背面：z 低于正面，避免 InfoCard 锥形边框在 preserve-3d 下叠到正面；未翻面时 pointer-events-none 防鼠标驱动背面环带 */}
            <div
              className={cn(
                'absolute inset-0 z-0 min-h-0 min-w-0 overflow-hidden rounded-3xl [backface-visibility:hidden] [transform:rotateY(180deg)_translateZ(2px)] [transform-style:preserve-3d]',
                !flipped && 'pointer-events-none',
              )}
            >
              <div className="relative h-full min-h-0 w-full overflow-hidden rounded-3xl [isolation:isolate] [transform:translate3d(0,0,0)] [transform-style:flat]">
                <InfoCard
                  fillContainer
                  descriptionMode="scroll"
                  shellBorderRadius="1.5rem"
                  image={profileBackImageUrl}
                  imageAlt={avatarLabel || title}
                  heroImageAriaLabel={avatarLabel}
                  title={title}
                  description={description}
                  borderColor="var(--ic-border-1)"
                  borderBgColor="var(--ic-border-bg)"
                  cardBgColor="var(--ic-card-bg)"
                  textColor="var(--ic-text)"
                  hoverTextColor="var(--ic-hover-text-1)"
                  fontFamily="var(--font-family)"
                  rtlFontFamily="var(--font-family)"
                  effectBgColor="var(--ic-border-1)"
                  patternColor1="var(--ic-pattern-1)"
                  patternColor2="var(--ic-pattern-2)"
                  contentPadding="14.3px 16px"
                />

                {/* 封面图点击跳转（用 navigate 避免 3D 容器内 Link 闪烁） */}
                {avatarTo && profileBackImageUrl && (
                  <div
                    className="absolute left-0 right-0 top-0 z-30 cursor-pointer"
                    style={{ height: '48%' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      navigate(avatarTo)
                    }}
                  />
                )}

                <div className="absolute bottom-5 left-4 z-20 max-w-[calc(100%-2rem)] text-left">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddToHand?.()
                    }}
                    className="flip-card-back-price text-3xl font-extrabold leading-none [text-shadow:none] cursor-pointer hover:scale-105 transition-transform"
                  >
                    {price}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <img
            src={imageSrc}
            alt={title}
            decoding="async"
            fetchPriority="high"
            onError={() => setImageSrc(fallbackCover)}
            className="absolute inset-0 h-full w-full object-cover [backface-visibility:hidden]"
            style={{ transform: 'translateZ(0) scale(1)' }}
          />

          {innerSheen ? (
            <>
              {sheenMode === 'rainbow' ? (
                <>
                  {/* 彩虹箔纸扫光 */}
                  <motion.div
                    className="pointer-events-none absolute inset-0 z-[5] h-full w-full rounded-3xl [backface-visibility:hidden]"
                    style={{
                      transform: 'translateZ(22px)',
                      mixBlendMode: 'overlay' as const,
                      opacity: 0.65,
                      background: `
                        linear-gradient(
                          125deg,
                          rgba(255,60,60,0.7) 0%,
                          rgba(255,160,20,0.65) 12%,
                          rgba(240,240,40,0.6) 24%,
                          rgba(50,220,100,0.55) 36%,
                          rgba(30,180,240,0.55) 48%,
                          rgba(80,60,240,0.6) 60%,
                          rgba(200,40,220,0.6) 72%,
                          rgba(255,60,130,0.65) 84%,
                          rgba(255,60,60,0.7) 100%
                        )
                      `
                        .replace(/\s+/g, ' ')
                        .trim(),
                      backgroundSize: '280% 280%',
                      backgroundPosition: foilPosition,
                    }}
                  />
                  {/* 噪点纹理 */}
                  <div
                    className="pointer-events-none absolute inset-0 z-[7] h-full w-full rounded-3xl [backface-visibility:hidden]"
                    style={{
                      transform: 'translateZ(24px)',
                      mixBlendMode: 'overlay',
                      opacity: 0.08,
                      backgroundImage: noiseTextureUrl,
                    }}
                  />
                </>
              ) : (
                <motion.div
                  className="pointer-events-none absolute inset-0 z-[5] h-full w-full rounded-3xl mix-blend-soft-light [backface-visibility:hidden]"
                  style={{
                    transform: 'translateZ(22px)',
                    background: subtleSheen,
                    opacity: 0.62,
                  }}
                />
              )}
            </>
          ) : null}

          <div
            className="absolute inset-0 z-10 flex flex-col px-10 pb-5 pt-16"
            style={{ transform: 'translateZ(40px)' }}
          >
            <div className="flex shrink-0 flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 pr-1">
                  <h3
                    className={cn(
                      'text-2xl font-bold leading-tight [transform:translateX(0.01em)]',
                      isDark
                        ? 'text-white'
                        : 'text-text-primary [text-shadow:none]',
                    )}
                  >
                    {title}
                  </h3>
                  {description.trim() ? (
                    <p
                      className={cn(
                        'mt-1 line-clamp-4 text-sm leading-relaxed',
                        isDark
                          ? 'text-white/70'
                          : 'text-text-primary [text-shadow:none]',
                      )}
                    >
                      {description}
                    </p>
                  ) : null}
                </div>
                {avatarTo ? (
                  <button
                    type="button"
                    className={cn(
                      'shrink-0 cursor-pointer rounded-full outline-none ring-2 transition',
                      isDark
                        ? 'ring-white/25 hover:ring-white/55 focus-visible:ring-white'
                        : 'ring-black/[0.1] hover:ring-black/[0.2] focus-visible:ring-black/[0.3]',
                    )}
                    aria-label={avatarLabel || '查看用户主页'}
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(avatarTo)
                    }}
                  >
                    <img
                      src={logoUrl}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  </button>
                ) : (
                  <img
                    src={logoUrl}
                    alt=""
                    className={cn(
                      'h-12 w-12 shrink-0 rounded-full object-cover ring-2',
                      isDark ? 'ring-white/25' : 'ring-black/[0.1]',
                    )}
                  />
                )}
              </div>

              <div
                className={cn(
                  'text-3xl font-extrabold',
                  isDark
                    ? 'text-white drop-shadow-lg'
                    : 'text-text-primary [text-shadow:none]',
                )}
              >
                {price}
              </div>
            </div>

            <div className="mt-auto flex w-full justify-center gap-2 pb-2">
              {Array.from({ length: safeDots }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    index === safeActive
                      ? isDark
                        ? 'bg-white'
                        : 'bg-text-muted/70'
                      : isDark
                        ? 'bg-white/30'
                        : 'bg-text-muted/35',
                  )}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
