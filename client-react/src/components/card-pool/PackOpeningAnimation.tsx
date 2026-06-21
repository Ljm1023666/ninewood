import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { LayoutMode } from '@/components/ui/morphing-card-stack'
import {
  motion,
  useTransform,
  useMotionValue,
  useSpring,
  AnimatePresence,
  type MotionValue,
} from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { X, Tag, Grid3X3, Layers, LayoutList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DisplayCoverPicture } from '@/components/ui/display-cover-picture'
import type { PackCardData } from '@/components/card-pool/search-params'
import type { BlackScope } from '@/components/card-pool/types'
import { usePackGallery } from '@/hooks/use-pack-card-textures'
import { usePackGalleryRuntime } from '@/components/card-pool/pack-gallery-runtime'
import { activatePackGalleryImages } from '@/utils/pack-gallery-bridge'
import { warmPackGalleryFromCards } from '@/utils/pack-gallery-cache'
import {
  MorphingCardStack,
  type CardData,
} from '@/components/ui/morphing-card-stack'

type AnimationPhase = 'scatter' | 'line' | 'circle'
type ViewMode = 'opening' | 'falling' | 'loading' | 'gallery'

const BASE_CARD_W = 190
const BASE_CARD_H = 336
const SCROLL_PER_CARD = 50
const OVERSCROLL_THRESHOLD = 160
/** 掉落时长（放缓，为画廊纹理合成争取时间） */
const FALL_MS = 2400

const lerp = (start: number, end: number, t: number) =>
  start * (1 - t) + end * t

function parsePriceNumber(price: string): number {
  const n = Number(price.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function getShimmerClass(price: string): string {
  const n = parsePriceNumber(price)
  return cn(
    'flip-card-title-bar-shimmer',
    n > 10000
      ? 'flip-card-title-bar-shimmer--rainbow'
      : n > 3000
        ? 'flip-card-title-bar-shimmer--gold'
        : n > 1000
          ? 'flip-card-title-bar-shimmer--red'
          : n > 500
            ? 'flip-card-title-bar-shimmer--orange'
            : n > 100
              ? 'flip-card-title-bar-shimmer--violet'
              : n > 10
                ? 'flip-card-title-bar-shimmer--blue'
                : 'flip-card-title-bar-shimmer--green',
  )
}

function getShimmerColor(price: string): string {
  const n = parsePriceNumber(price)
  if (n > 10000) return 'hsl(250, 30%, 12%)'
  if (n > 3000) return 'hsl(35, 30%, 12%)'
  if (n > 1000) return 'hsl(0, 30%, 12%)'
  if (n > 500) return 'hsl(18, 30%, 12%)'
  if (n > 100) return 'hsl(265, 30%, 12%)'
  if (n > 10) return 'hsl(220, 30%, 12%)'
  return 'hsl(150, 30%, 12%)'
}

const MAX_SIZE_SCALE = 2.2

const PACK_CARD_SPRING = { stiffness: 40, damping: 15 }
const TITLE_BAR_SPRING = { stiffness: 200, damping: 30, mass: 0.5 }

type CardTarget = {
  x: number
  y: number
  rotation: number
  scale: number
  opacity: number
}

/** 底弧阶段目标位（纯函数，供 useTransform 每帧调用） */
function computeCircleArcTarget(
  index: number,
  total: number,
  w: number,
  h: number,
  morphValue: number,
  rotateValue: number,
): CardTarget {
  const minDim = Math.min(w, h)
  const circleRadius = Math.min(minDim * 0.35, 350)
  const circleAngleDeg = total === 1 ? -90 : (index / total) * 360
  const circleRad = (circleAngleDeg * Math.PI) / 180

  const circlePos = {
    x: Math.cos(circleRad) * circleRadius,
    y: Math.sin(circleRad) * circleRadius,
    rotation: circleAngleDeg + 90,
    scale: total <= 3 ? 1.8 : 1.3,
    opacity: 1,
  }

  const arcRadius = Math.min(w, h * 1.5) * 1.2
  const arcApexY = h * 0.25
  const arcCenterY = arcApexY + arcRadius
  const arcSpread =
    total === 1 ? 0 : Math.min((total - 1) * 25, 200)
  const arcStartAngle = -90 - arcSpread / 2
  const arcStep = arcSpread / Math.max(total - 1, 1)
  const maxRotation = arcSpread * 0.8
  const scrollProgress = Math.min(Math.max(rotateValue / 360, 0), 1)
  const boundedRotation = (0.5 - scrollProgress) * maxRotation
  const currentArcAngle = arcStartAngle + index * arcStep + boundedRotation
  const arcRad = (currentArcAngle * Math.PI) / 180
  const arcPos = {
    x: Math.cos(arcRad) * arcRadius,
    y: Math.sin(arcRad) * arcRadius + arcCenterY,
    rotation: currentArcAngle + 90,
    scale: 2.2,
    opacity: 1,
  }

  return {
    x: lerp(circlePos.x, arcPos.x, morphValue),
    y: lerp(circlePos.y, arcPos.y, morphValue),
    rotation: lerp(circlePos.rotation, arcPos.rotation, morphValue),
    scale: lerp(circlePos.scale, arcPos.scale, morphValue),
    opacity: 1,
  }
}

function titleMetricsFromScale(
  cardWidth: number,
  cardHeight: number,
  scale: number,
) {
  const minScale = 1.3
  const morphT = Math.max(
    0,
    Math.min(1, (scale - minScale) / (MAX_SIZE_SCALE - minScale)),
  )
  const barH = lerp((cardHeight * MAX_SIZE_SCALE) / 5, 32, morphT)
  const maxFontByWidth = (cardWidth * MAX_SIZE_SCALE - 16) / 4
  const titleFontSize = Math.min(barH * 0.7, maxFontByWidth)
  const titleMaxChars = Math.max(4, Math.round(lerp(4, 14, morphT)))
  return { barH, titleFontSize, titleMaxChars }
}

const PackCardFace = memo(function PackCardFace({
  card,
  barH,
  titleFontSize,
  titleMaxChars,
  onFrontClick,
  onNavigate,
}: {
  card: PackCardData
  barH: number
  titleFontSize: number
  titleMaxChars: number
  onFrontClick: () => void
  onNavigate: (id: string) => void
}) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <>
      <div
        className="absolute inset-0 h-full w-full overflow-hidden rounded-lg shadow-lg cursor-pointer"
        style={{
          backfaceVisibility: 'hidden',
          backgroundColor: getShimmerColor(card.price),
        }}
        onClick={(e) => {
          e.stopPropagation()
          onFrontClick()
        }}
      >
        {card.imageUrl && !imgFailed ? (
          <DisplayCoverPicture
            sources={card.imageUrl}
            alt={card.title}
            decoding="async"
            className="h-full w-full object-cover"
            pictureClassName="block h-full w-full"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center p-2"
            style={{ backgroundColor: getShimmerColor(card.price) }}
          >
            <span className="text-[10px] text-text-muted text-center leading-tight line-clamp-3">
              {card.title}
            </span>
          </div>
        )}
        <motion.div
          animate={{ height: barH }}
          transition={{ type: 'spring', ...TITLE_BAR_SPRING }}
          className={cn(
            'absolute top-0 left-0 right-0 flex items-center overflow-hidden px-2 bg-black/35',
            getShimmerClass(card.price),
          )}
        >
          <motion.p
            animate={{ fontSize: titleFontSize }}
            transition={{ type: 'spring', ...TITLE_BAR_SPRING }}
            className="w-full font-bold text-white text-center whitespace-nowrap leading-none"
          >
            {card.title.length > titleMaxChars
              ? card.title.slice(0, titleMaxChars) + '…'
              : card.title}
          </motion.p>
        </motion.div>
      </div>
      <div
        className="absolute inset-0 h-full w-full overflow-hidden rounded-lg shadow-lg flex items-center justify-center p-2"
        style={{
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          backgroundColor: getShimmerColor(card.price),
        }}
      >
        {card.price ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onNavigate(card.id)
            }}
            className="flip-card-back-price relative z-10 text-sm font-extrabold leading-none cursor-pointer hover:scale-110 transition-transform"
          >
            {card.price}
          </button>
        ) : null}
      </div>
    </>
  )
})

const packCardShellStyle = {
  position: 'absolute' as const,
  transformStyle: 'preserve-3d' as const,
  perspective: '1000px',
  boxShadow: '0 0 40px 18px rgba(255,255,255,0.045)',
  willChange: 'transform' as const,
}

/** 滚轮/掉落：MotionValue + useSpring，无每帧 setState 重渲染 */
const PackCardMotionDriven = memo(function PackCardMotionDriven({
  card,
  index,
  total,
  cardWidth,
  cardHeight,
  containerW,
  containerH,
  morphProgress,
  scrollRotate,
  fallProgress,
  isFalling,
  onNavigate,
}: {
  card: PackCardData
  index: number
  total: number
  cardWidth: number
  cardHeight: number
  containerW: number
  containerH: number
  morphProgress: MotionValue<number>
  scrollRotate: MotionValue<number>
  fallProgress: MotionValue<number>
  isFalling: boolean
  onNavigate: (id: string) => void
}) {
  const [flipped, setFlipped] = useState(false)

  const targetX = useTransform([morphProgress, scrollRotate], ([m, r]) =>
    computeCircleArcTarget(index, total, containerW, containerH, m, r).x,
  )
  const targetY = useTransform(
    [morphProgress, scrollRotate, fallProgress],
    ([m, r, f]) => {
      const base = computeCircleArcTarget(
        index,
        total,
        containerW,
        containerH,
        m,
        r,
      ).y
      if (!isFalling || f <= 0) return base
      const eased = f * f
      const distance =
        containerH > 0
          ? containerH * 0.55 + cardHeight * MAX_SIZE_SCALE * 1.2
          : 960
      return base + eased * distance
    },
  )
  const targetRotate = useTransform([morphProgress, scrollRotate], ([m, r]) =>
    computeCircleArcTarget(index, total, containerW, containerH, m, r).rotation,
  )
  const targetScale = useTransform([morphProgress, scrollRotate], ([m, r]) => {
    const s = computeCircleArcTarget(
      index,
      total,
      containerW,
      containerH,
      m,
      r,
    ).scale
    return s / MAX_SIZE_SCALE
  })

  const x = useSpring(targetX, PACK_CARD_SPRING)
  const y = useSpring(targetY, PACK_CARD_SPRING)
  const rotate = useSpring(targetRotate, PACK_CARD_SPRING)
  const scale = useSpring(targetScale, PACK_CARD_SPRING)
  const opacity = useTransform(fallProgress, (f) => {
    if (!isFalling) return 1
    if (f >= 1) return 0
    if (f < 0.72) return 1
    return Math.max(0, 1 - (f - 0.72) / 0.28)
  })
  const barHTarget = useTransform([morphProgress, scrollRotate], ([m, r]) => {
    const s = computeCircleArcTarget(
      index,
      total,
      containerW,
      containerH,
      m,
      r,
    ).scale
    return titleMetricsFromScale(cardWidth, cardHeight, s).barH
  })
  const titleFontSizeTarget = useTransform(
    [morphProgress, scrollRotate],
    ([m, r]) => {
      const s = computeCircleArcTarget(
        index,
        total,
        containerW,
        containerH,
        m,
        r,
      ).scale
      return titleMetricsFromScale(cardWidth, cardHeight, s).titleFontSize
    },
  )
  const barH = useSpring(barHTarget, TITLE_BAR_SPRING)
  const titleFontSize = useSpring(titleFontSizeTarget, TITLE_BAR_SPRING)

  return (
    <motion.div
      style={{
        ...packCardShellStyle,
        width: cardWidth * MAX_SIZE_SCALE,
        height: cardHeight * MAX_SIZE_SCALE,
        x,
        y,
        rotate,
        scale,
        opacity,
      }}
      className="cursor-pointer"
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      >
        <PackCardFaceMotion
          card={card}
          barH={barH}
          titleFontSize={titleFontSize}
          onFrontClick={() => setFlipped((v) => !v)}
          onNavigate={onNavigate}
        />
      </motion.div>
    </motion.div>
  )
})

const PackCardFaceMotion = memo(function PackCardFaceMotion({
  card,
  barH,
  titleFontSize,
  onFrontClick,
  onNavigate,
}: {
  card: PackCardData
  barH: MotionValue<number>
  titleFontSize: MotionValue<number>
  onFrontClick: () => void
  onNavigate: (id: string) => void
}) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <>
      <div
        className="absolute inset-0 h-full w-full overflow-hidden rounded-lg shadow-lg cursor-pointer"
        style={{
          backfaceVisibility: 'hidden',
          backgroundColor: getShimmerColor(card.price),
        }}
        onClick={(e) => {
          e.stopPropagation()
          onFrontClick()
        }}
      >
        {card.imageUrl && !imgFailed ? (
          <DisplayCoverPicture
            sources={card.imageUrl}
            alt={card.title}
            decoding="async"
            className="h-full w-full object-cover"
            pictureClassName="block h-full w-full"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center p-2"
            style={{ backgroundColor: getShimmerColor(card.price) }}
          >
            <span className="text-[10px] text-text-muted text-center leading-tight line-clamp-3">
              {card.title}
            </span>
          </div>
        )}
        <motion.div
          style={{ height: barH }}
          className={cn(
            'absolute top-0 left-0 right-0 flex items-center overflow-hidden px-2 bg-black/35',
            getShimmerClass(card.price),
          )}
        >
          <motion.p
            style={{ fontSize: titleFontSize }}
            className="w-full font-bold text-white text-center whitespace-nowrap leading-none truncate"
          >
            {card.title}
          </motion.p>
        </motion.div>
      </div>
      <div
        className="absolute inset-0 h-full w-full overflow-hidden rounded-lg shadow-lg flex items-center justify-center p-2"
        style={{
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          backgroundColor: getShimmerColor(card.price),
        }}
      >
        {card.price ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onNavigate(card.id)
            }}
            className="flip-card-back-price relative z-10 text-sm font-extrabold leading-none cursor-pointer hover:scale-110 transition-transform"
          >
            {card.price}
          </button>
        ) : null}
      </div>
    </>
  )
})

/** scatter / line / stack：phase 切换或聚拢时用 spring */
const PackCardSpringDriven = memo(function PackCardSpringDriven({
  card,
  target,
  gatherFrom,
  cardWidth,
  cardHeight,
  onNavigate,
}: {
  card: PackCardData
  target: CardTarget
  /** 聚拢瞬间：从底弧当前位 spring 到 stack 目标 */
  gatherFrom?: CardTarget | null
  cardWidth: number
  cardHeight: number
  onNavigate: (id: string) => void
}) {
  const [flipped, setFlipped] = useState(false)
  const { barH, titleFontSize, titleMaxChars } = titleMetricsFromScale(
    cardWidth,
    cardHeight,
    gatherFrom?.scale ?? target.scale,
  )

  const toMotion = (t: CardTarget) => ({
    x: t.x,
    y: t.y,
    rotate: t.rotation,
    scale: t.scale / MAX_SIZE_SCALE,
    opacity: t.opacity,
  })

  return (
    <motion.div
      initial={gatherFrom ? toMotion(gatherFrom) : false}
      animate={toMotion(target)}
      transition={{ type: 'spring', ...PACK_CARD_SPRING }}
      style={{
        ...packCardShellStyle,
        width: cardWidth * MAX_SIZE_SCALE,
        height: cardHeight * MAX_SIZE_SCALE,
      }}
      className="cursor-pointer"
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      >
        <PackCardFace
          card={card}
          barH={barH}
          titleFontSize={titleFontSize}
          titleMaxChars={titleMaxChars}
          onFrontClick={() => setFlipped((v) => !v)}
          onNavigate={onNavigate}
        />
      </motion.div>
    </motion.div>
  )
})

function PackOpeningMorphHint({
  morphProgress,
  active,
  className,
  children,
  maxMorph = 0.25,
}: {
  morphProgress: MotionValue<number>
  active: boolean
  className?: string
  children: ReactNode
  maxMorph?: number
}) {
  const opacity = useTransform(morphProgress, (v) =>
    active && v < maxMorph ? 1 : 0,
  )
  if (!active) return null
  return (
    <motion.div style={{ opacity }} className={className}>
      {children}
    </motion.div>
  )
}

function GatherCardsHint({
  morphProgress,
  active,
  onGather,
}: {
  morphProgress: MotionValue<number>
  active: boolean
  onGather: () => void
}) {
  const opacity = useTransform(morphProgress, (v) =>
    active && v < 0.3 ? 0.6 - v * 2 : 0,
  )
  if (!active) return null
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <motion.p
        style={{ opacity }}
        onClick={onGather}
        className="text-sm text-white/50 tracking-widest cursor-pointer hover:text-white/80 transition-colors pointer-events-auto"
      >
        点击聚拢卡牌
      </motion.p>
    </div>
  )
}

function PackGalleryLoadingOverlay({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[55] flex flex-col items-center justify-center bg-black">
      <div
        className="mb-4 size-9 animate-spin rounded-full border-2 border-white/15 border-t-white/70"
        aria-hidden
      />
      <p className="font-mono text-sm tracking-widest text-white/55">{label}</p>
    </div>
  )
}

function packGalleryLoadingLabel(
  ready: boolean,
  texturesComplete: boolean,
): string {
  if (!ready) return '正在合成卡面纹理…'
  if (!texturesComplete) return '正在优化画廊资源…'
  return '正在初始化场景…'
}

export function PackOpeningAnimation({
  cards,
  galleryCacheKey,
  galleryScope,
  onClose,
}: {
  cards: PackCardData[]
  galleryCacheKey: string
  galleryScope: BlackScope
  onClose: () => void
}) {
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const galleryRuntime = usePackGalleryRuntime()
  const galleryWheelRef = galleryRuntime.wheelImpulseRef

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [phase, setPhase] = useState<AnimationPhase>('scatter')
  const [viewMode, setViewMode] = useState<ViewMode>('opening')
  const fallProgress = useMotionValue(0)
  const [showCardStack, setShowCardStack] = useState(false)
  const [gatherOrigins, setGatherOrigins] = useState<CardTarget[] | null>(null)
  const [queueStart, setQueueStart] = useState(0)
  const [stackLayout, setStackLayout] = useState<LayoutMode>('stack')

  const overscrollRef = useRef(0)
  const galleryLoadStartedRef = useRef(false)
  const galleryRevealedRef = useRef(false)
  const viewModeRef = useRef<ViewMode>('opening')
  viewModeRef.current = viewMode

  const galleryLoadActive = viewMode === 'loading' || viewMode === 'gallery'
  const { ready: galleryReady, texturesComplete: galleryTexturesComplete } =
    usePackGallery(galleryLoadActive ? galleryCacheKey : null, cards)

  const galleryVisible = viewMode === 'gallery'

  const galleryRuntimeRef = useRef(galleryRuntime)
  galleryRuntimeRef.current = galleryRuntime

  const galleryFullyReady = galleryReady && galleryTexturesComplete

  // 开包/掉落：完全不碰画廊；loading 起才合成纹理、挂载 Canvas
  useEffect(() => {
    const rt = galleryRuntimeRef.current

    if (!galleryLoadActive) {
      rt.hide()
      rt.setLayerOpacity(0)
      return
    }

    if (viewMode === 'loading' && !galleryLoadStartedRef.current) {
      galleryLoadStartedRef.current = true
      galleryRevealedRef.current = false
      void warmPackGalleryFromCards(galleryScope, cards)
    }

    rt.show(galleryCacheKey)
    if (galleryReady) {
      activatePackGalleryImages(galleryCacheKey)
    }

    if (viewMode === 'loading') {
      rt.setLayerOpacity(0)
    }
  }, [galleryLoadActive, viewMode, galleryCacheKey, galleryScope, cards, galleryReady])

  useEffect(() => {
    if (viewMode !== 'loading' || !galleryFullyReady || galleryRevealedRef.current) {
      return
    }

    const rt = galleryRuntimeRef.current
    const revealGallery = () => {
      if (galleryRevealedRef.current) return
      galleryRevealedRef.current = true
      rt.setLayerOpacity(1)
      setViewMode('gallery')
    }

    if (rt.isSceneReady()) {
      queueMicrotask(revealGallery)
      return
    }

    return rt.subscribeSceneReady(revealGallery)
  }, [viewMode, galleryFullyReady])

  useEffect(() => {
    return () => {
      galleryRuntimeRef.current.hide()
      galleryRuntimeRef.current.setLayerOpacity(0)
    }
  }, [])

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('line'), 400)
    const t2 = setTimeout(() => setPhase('circle'), 1600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    ro.observe(el)
    setContainerSize({ width: el.offsetWidth, height: el.offsetHeight })
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (viewMode !== 'falling') return
    fallProgress.set(0)
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / FALL_MS)
      fallProgress.set(t)
      if (containerRef.current) {
        containerRef.current.style.opacity = String(
          Math.max(0, 1 - t * 0.95),
        )
      }
      if (t < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        fallProgress.set(1)
        galleryRevealedRef.current = false
        setViewMode('loading')
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [viewMode, fallProgress])

  const total = cards.length
  const cardScale = 0.5
  const CARD_W = BASE_CARD_W * cardScale
  const CARD_H = BASE_CARD_H * cardScale
  const MAX_SCROLL = Math.max(total * SCROLL_PER_CARD, 1)
  const MORPH_END = Math.round(MAX_SCROLL * 0.2)

  const virtualScroll = useMotionValue(0)
  const scrollRef = useRef(0)

  const morphProgress = useTransform(virtualScroll, [0, MORPH_END], [0, 1])
  const scrollRotate = useTransform(
    virtualScroll,
    [MORPH_END, MAX_SCROLL],
    [0, 360],
  )

  const [scrollAtMax, setScrollAtMax] = useState(false)
  const [arcScrollActive, setArcScrollActive] = useState(false)
  const [arcMorphReady, setArcMorphReady] = useState(false)
  const morphValueRef = useRef(0)
  const rotateValueRef = useRef(0)

  useEffect(() => {
    const unsub1 = morphProgress.on('change', (v) => {
      morphValueRef.current = v
      const ready = v > 0.85
      setArcMorphReady((prev) => (prev === ready ? prev : ready))
    })
    const unsub2 = scrollRotate.on('change', (v) => {
      rotateValueRef.current = v
    })
    return () => {
      unsub1()
      unsub2()
    }
  }, [morphProgress, scrollRotate])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      if (viewModeRef.current === 'gallery') return
      e.preventDefault()

      if (showCardStack || phase !== 'circle' || viewModeRef.current === 'falling') {
        return
      }

      const atBottom = scrollRef.current >= MAX_SCROLL - 2

      if (atBottom && e.deltaY > 0 && morphValueRef.current > 0.85) {
        overscrollRef.current += e.deltaY
        const t = Math.min(1, overscrollRef.current / OVERSCROLL_THRESHOLD)
        if (t >= 1 && viewModeRef.current === 'opening') {
          fallProgress.set(0)
          if (containerRef.current) containerRef.current.style.opacity = '1'
          setViewMode('falling')
        }
        return
      }

      if (e.deltaY < 0 && overscrollRef.current > 0) {
        overscrollRef.current = Math.max(0, overscrollRef.current + e.deltaY)
      }

      const progress = scrollRef.current / MAX_SCROLL
      const sensitivity = progress > 0.2 ? 0.5 - (progress - 0.2) * 0.4 : 0.5
      scrollRef.current = Math.min(
        Math.max(scrollRef.current + e.deltaY * sensitivity, 0),
        MAX_SCROLL,
      )
      setScrollAtMax(scrollRef.current >= MAX_SCROLL - 2)
      if (scrollRef.current > 0) setArcScrollActive(true)
      virtualScroll.set(scrollRef.current)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [virtualScroll, MAX_SCROLL, phase, showCardStack, fallProgress])

  // 画廊阶段：window 捕获滚轮/键盘，避免 Canvas 不冒泡 & 底层卡池 scroll 抢事件
  useEffect(() => {
    const onGalleryWheel = (e: WheelEvent) => {
      if (viewModeRef.current !== 'gallery') return
      e.preventDefault()
      galleryWheelRef.current?.(e.deltaY)
    }
    const onGalleryKey = (e: KeyboardEvent) => {
      if (viewModeRef.current !== 'gallery') return
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        galleryWheelRef.current?.(-120)
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        galleryWheelRef.current?.(120)
      }
    }
    window.addEventListener('wheel', onGalleryWheel, { passive: false, capture: true })
    document.addEventListener('keydown', onGalleryKey)
    return () => {
      window.removeEventListener('wheel', onGalleryWheel, { capture: true })
      document.removeEventListener('keydown', onGalleryKey)
    }
  }, [])

  const scatterPositions = useMemo(() => {
    const angles = cards.map((_, i) => {
      if (total === 1) return -90
      const spread = Math.min((total - 1) * 25, 140)
      return -90 - spread / 2 + (total > 1 ? (spread * i) / (total - 1) : 0)
    })
    return cards.map((_, i) => {
      const rad = (angles[i] * Math.PI) / 180
      const dist = 400 + Math.random() * 400
      return {
        x: Math.cos(rad) * dist,
        y: Math.sin(rad) * dist + Math.random() * 200,
        rotation: Math.random() * 120 - 60,
        scale: 0.4,
        opacity: 0,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  const handleNavigate = useCallback(
    (id: string) => {
      onClose()
      navigate(`/demands/${id}`)
    },
    [navigate, onClose],
  )

  useEffect(() => {
    galleryRuntimeRef.current.setCardNavigateHandler(handleNavigate)
    return () => {
      galleryRuntimeRef.current.setCardNavigateHandler(null)
    }
  }, [handleNavigate])

  const handleGatherCards = useCallback(() => {
    const w = containerSize.width || containerRef.current?.offsetWidth || 0
    const h = containerSize.height || containerRef.current?.offsetHeight || 0
    setGatherOrigins(
      cards.map((_, i) =>
        computeCircleArcTarget(
          i,
          total,
          w,
          h,
          morphValueRef.current,
          rotateValueRef.current,
        ),
      ),
    )
    setShowCardStack(true)
    setQueueStart(0)
  }, [cards, total, containerSize.width, containerSize.height])

  /** 画廊 X：回到底弧底部，而非退出整个开包 */
  const exitGalleryToArc = useCallback(() => {
    scrollRef.current = MAX_SCROLL
    virtualScroll.set(MAX_SCROLL)
    morphValueRef.current = 1
    rotateValueRef.current = 360
    setArcMorphReady(true)
    setArcScrollActive(true)
    setScrollAtMax(true)
    overscrollRef.current = 0
    fallProgress.set(0)
    if (containerRef.current) containerRef.current.style.opacity = '1'
    setViewMode('opening')
  }, [MAX_SCROLL, virtualScroll, fallProgress])

  const atArcBottom =
    viewMode === 'opening' &&
    phase === 'circle' &&
    !showCardStack &&
    arcMorphReady &&
    scrollAtMax

  const useMotionCards =
    phase === 'circle' &&
    !showCardStack &&
    (viewMode === 'falling' ||
      (viewMode === 'opening' && arcScrollActive))

  return (
    <AnimatePresence>
      <motion.div
        ref={rootRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'fixed inset-0',
          galleryVisible ? 'z-[60] pointer-events-none' : 'z-50',
        )}
        style={{
          backgroundColor: galleryVisible ? 'transparent' : '#000000',
        }}
      >
        {viewMode === 'loading' ? (
          <PackGalleryLoadingOverlay
            label={packGalleryLoadingLabel(galleryReady, galleryTexturesComplete)}
          />
        ) : null}

        {galleryVisible ? (
          <>
            <div className="pointer-events-none absolute bottom-10 left-0 z-[60] w-full text-center font-mono text-[11px] font-semibold uppercase text-white">
              <p>滚轮浏览 · 单击翻面</p>
              <p className="opacity-60">3 秒无操作恢复自动播放</p>
            </div>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => {
            if (viewMode === 'gallery') {
              exitGalleryToArc()
              return
            }
            if (showCardStack) {
              setShowCardStack(false)
              setGatherOrigins(null)
            } else onClose()
          }}
          className={cn(
            'pointer-events-auto absolute top-4 right-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full transition-colors',
            galleryVisible
              ? 'bg-white/15 text-white shadow-lg backdrop-blur-sm hover:bg-white/25'
              : 'bg-white/10 text-white hover:bg-white/20',
          )}
          aria-label={
            viewMode === 'gallery'
              ? '返回底弧'
              : showCardStack
                ? '返回散落视图'
                : '关闭'
          }
        >
          <X className="size-5" />
        </button>

        {/* 开包舞台始终挂载，避免进画廊卸载后 containerSize 归零导致回退时圆簇扭曲 */}
        <div
          ref={containerRef}
          className={cn(
            'relative z-10 h-full w-full overflow-hidden',
            (galleryVisible || viewMode === 'falling' || viewMode === 'loading') &&
              'pointer-events-none',
            galleryVisible && 'invisible',
          )}
          style={{
            opacity:
              viewMode === 'loading' || galleryVisible ? 0 : 1,
          }}
          aria-hidden={galleryVisible}
        >
            {atArcBottom ? (
              <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 pointer-events-none text-center">
                <p className="font-mono text-xs tracking-widest text-white/70">
                  继续下滑 · 卡片落入画廊
                </p>
              </div>
            ) : null}

            <PackOpeningMorphHint
              morphProgress={morphProgress}
              active={!showCardStack && phase === 'circle'}
              className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 pointer-events-none text-center"
            >
              <p className="font-mono text-xs tracking-widest text-white/70">
                滚轮展开底弧 · 点击聚拢卡牌
              </p>
            </PackOpeningMorphHint>

            <GatherCardsHint
              morphProgress={morphProgress}
              active={!showCardStack && viewMode === 'opening' && phase === 'circle'}
              onGather={handleGatherCards}
            />

            <div className="flex h-full w-full items-center justify-center">
              {cards.map((card, i) => {
                if (useMotionCards) {
                  return (
                    <PackCardMotionDriven
                      key={card.id}
                      card={card}
                      index={i}
                      total={total}
                      cardWidth={CARD_W}
                      cardHeight={CARD_H}
                      containerW={containerSize.width}
                      containerH={containerSize.height}
                      morphProgress={morphProgress}
                      scrollRotate={scrollRotate}
                      fallProgress={fallProgress}
                      isFalling={viewMode === 'falling'}
                      onNavigate={handleNavigate}
                    />
                  )
                }

                let target: CardTarget = {
                  x: 0,
                  y: 0,
                  rotation: 0,
                  scale: 1,
                  opacity: 1,
                }

                if (showCardStack) {
                  const stackOffset = i * 3
                  target = {
                    x: stackOffset,
                    y: stackOffset,
                    rotation: 0,
                    scale: 0.5,
                    opacity: 0,
                  }
                } else if (phase === 'scatter') {
                  target = scatterPositions[i]
                } else if (phase === 'line') {
                  const spacing = CARD_W + 10
                  const totalWidth = total * spacing
                  target = {
                    x: i * spacing - totalWidth / 2,
                    y: 0,
                    rotation: 0,
                    scale: 1,
                    opacity: 1,
                  }
                } else if (phase === 'circle') {
                  const w = containerSize.width || containerRef.current?.offsetWidth || 0
                  const h = containerSize.height || containerRef.current?.offsetHeight || 0
                  target = computeCircleArcTarget(i, total, w, h, 0, 0)
                }

                return (
                  <PackCardSpringDriven
                    key={card.id}
                    card={card}
                    target={target}
                    gatherFrom={showCardStack ? gatherOrigins?.[i] : null}
                    cardWidth={CARD_W}
                    cardHeight={CARD_H}
                    onNavigate={handleNavigate}
                  />
                )
              })}
            </div>

            {showCardStack
              ? (() => {
                  const MAX_VISIBLE = 4
                  const allStackCards: CardData[] = cards.map(
                    (c): CardData => ({
                      id: c.id,
                      title: c.title,
                      description: c.description || c.price,
                      icon: <Tag className="size-5" />,
                      color: getShimmerColor(c.price),
                      shimmerClass: getShimmerClass(c.price),
                    }),
                  )
                  const visibleCards = allStackCards.slice(
                    queueStart,
                    queueStart + MAX_VISIBLE,
                  )
                  const queueRemaining =
                    allStackCards.length - queueStart - visibleCards.length

                  return (
                    <motion.div
                      key="stack-overlay"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6, duration: 0.4, ease: 'easeOut' }}
                      className="absolute inset-0 z-20"
                    >
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="pointer-events-auto">
                          <MorphingCardStack
                            cards={visibleCards}
                            layout={stackLayout}
                            onLayoutChange={setStackLayout}
                            onCardClick={(card) => handleNavigate(card.id)}
                          />
                        </div>
                      </div>
                      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setQueueStart((p) => Math.max(0, p - 1))}
                          disabled={queueStart === 0}
                          className="rounded-lg bg-white dark:bg-black px-3 py-1.5 text-sm text-black dark:text-white hover:opacity-80 transition-opacity border border-black/15 dark:border-white/15 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ← 上一张
                        </button>
                        <span className="text-sm text-black dark:text-white tabular-nums min-w-[80px] text-center font-medium">
                          {queueStart + 1}–{queueStart + visibleCards.length} /{' '}
                          {allStackCards.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQueueStart((p) => p + 1)}
                          disabled={queueRemaining <= 0}
                          className="rounded-lg bg-white dark:bg-black px-3 py-1.5 text-sm text-black dark:text-white hover:opacity-80 transition-opacity border border-black/15 dark:border-white/15 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          下一张 →
                        </button>
                      </div>
                    </motion.div>
                  )
                })()
              : null}

            {showCardStack ? (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center gap-1 rounded-lg bg-secondary/50 p-1">
                {(
                  [
                    { mode: 'stack' as const, icon: Layers },
                    { mode: 'grid' as const, icon: Grid3X3 },
                    { mode: 'list' as const, icon: LayoutList },
                  ] as const
                ).map(({ mode, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setStackLayout(mode)}
                    className={cn(
                      'rounded-md p-2 transition-all',
                      stackLayout === mode
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                    )}
                    aria-label={`切换到 ${mode} 布局`}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            ) : null}

            {showCardStack ? (
              <button
                type="button"
                onClick={() => {
                  setShowCardStack(false)
                  setGatherOrigins(null)
                }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 rounded-full bg-white dark:bg-black px-4 py-2 text-sm text-black dark:text-white hover:opacity-80 transition-opacity border border-black/15 dark:border-white/15"
              >
                返回散落视图
              </button>
            ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
