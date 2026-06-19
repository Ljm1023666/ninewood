import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import type { LayoutMode } from '@/components/ui/morphing-card-stack'
import {
  motion,
  useTransform,
  useMotionValue,
  AnimatePresence,
} from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { X, Tag, Grid3X3, Layers, LayoutList } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PackCardData } from '@/components/card-pool/search-params'
import {
  MorphingCardStack,
  type CardData,
} from '@/components/ui/morphing-card-stack'

type AnimationPhase = 'scatter' | 'line' | 'circle'

const BASE_CARD_W = 190
const BASE_CARD_H = 336
const SCROLL_PER_CARD = 50

const lerp = (start: number, end: number, t: number) =>
  start * (1 - t) + end * t

/** 解析价格字符串为数字 */
function parsePriceNumber(price: string): number {
  const n = Number(price.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** 按价格档次返回流光色条 CSS 类 */
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

/** 按价格档次返回与色条匹配的背景色 */
function getShimmerColor(price: string): string {
  const n = parsePriceNumber(price)
  // 深色背景，与各档位色条主色协调
  if (n > 10000) return 'hsl(250, 30%, 12%)'
  if (n > 3000) return 'hsl(35, 30%, 12%)'
  if (n > 1000) return 'hsl(0, 30%, 12%)'
  if (n > 500) return 'hsl(18, 30%, 12%)'
  if (n > 100) return 'hsl(265, 30%, 12%)'
  if (n > 10) return 'hsl(220, 30%, 12%)'
  return 'hsl(150, 30%, 12%)'
}

// DOM 上限倍率：卡片始终以此尺寸渲染，3D 翻转不会模糊；实际大小由 scale 控制
const MAX_SIZE_SCALE = 2.2

// --- 单张卡片 ---
function PackCard({
  card,
  target,
  cardWidth,
  cardHeight,
  onNavigate,
}: {
  card: PackCardData
  target: {
    x: number
    y: number
    rotation: number
    scale: number
    opacity: number
  }
  cardWidth: number
  cardHeight: number
  onNavigate: (id: string) => void
}) {
  const [flipped, setFlipped] = useState(false)

  // 色条/字号随变体动态：圆环阶段占 1/3 卡面、大字少字；底弧阶段紧凑
  const minScale = 1.3
  const maxScale = MAX_SIZE_SCALE
  const morphT = Math.max(
    0,
    Math.min(1, (target.scale - minScale) / (maxScale - minScale)),
  )
  const barH = lerp((cardHeight * MAX_SIZE_SCALE) / 5, 32, morphT) // 字号与色条高度成正比，但不超过 4 字能放下的最大尺寸
  const maxFontByWidth = (cardWidth * MAX_SIZE_SCALE - 16) / 4
  const titleFontSize = Math.min(barH * 0.7, maxFontByWidth)
  const titleMaxChars = Math.max(4, Math.round(lerp(4, 14, morphT)))

  return (
    <motion.div
      animate={{
        x: target.x,
        y: target.y,
        rotate: target.rotation,
        scale: target.scale / MAX_SIZE_SCALE,
        opacity: target.opacity,
      }}
      transition={{ type: 'spring', stiffness: 40, damping: 15 }}
      style={{
        position: 'absolute',
        width: cardWidth * MAX_SIZE_SCALE,
        height: cardHeight * MAX_SIZE_SCALE,
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        boxShadow: '0 0 40px 18px rgba(255,255,255,0.045)',
        willChange: 'transform',
      }}
      className="cursor-pointer"
      onClick={() => setFlipped((v) => !v)}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* 正面：需求封面 + 流光色条 */}
        <div
          className="absolute inset-0 h-full w-full overflow-hidden rounded-lg shadow-lg"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {card.imageUrl ? (
            <img
              src={card.imageUrl}
              alt={card.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-2">
              <span className="text-[10px] text-text-muted text-center leading-tight line-clamp-3">
                {card.title}
              </span>
            </div>
          )}
          <motion.div
            animate={{ height: barH }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 30,
              mass: 0.5,
            }}
            className={cn(
              'absolute top-0 left-0 right-0 flex items-center overflow-hidden px-2 backdrop-blur-sm',
              getShimmerClass(card.price),
            )}
          >
            <motion.p
              animate={{ fontSize: titleFontSize }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 30,
                mass: 0.5,
              }}
              className="w-full font-bold text-white text-center whitespace-nowrap leading-none"
            >
              {card.title.length > titleMaxChars
                ? card.title.slice(0, titleMaxChars) + '…'
                : card.title}
            </motion.p>
          </motion.div>
        </div>

        {/* 背面：价格，点击进入详情 */}
        <div
          className="absolute inset-0 h-full w-full overflow-hidden rounded-lg shadow-lg flex items-center justify-center p-2"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {card.price && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onNavigate(card.id)
              }}
              className="flip-card-back-price text-sm font-extrabold leading-none cursor-pointer hover:scale-110 transition-transform"
            >
              {card.price}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// --- 主组件 ---
export function PackOpeningAnimation({
  cards,
  onClose,
}: {
  cards: PackCardData[]
  onClose: () => void
}) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [phase, setPhase] = useState<AnimationPhase>('scatter')
  const [showCardStack, setShowCardStack] = useState(false)
  const [queueStart, setQueueStart] = useState(0)
  const [stackLayout, setStackLayout] = useState<LayoutMode>('stack')

  // 动画阶段自动推进
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('line'), 400)
    const t2 = setTimeout(() => setPhase('circle'), 1600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  // 容器尺寸
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

  const total = cards.length

  // 固定缩放：变体后大小恒定，任何阶段卡片都不超过此尺寸
  const cardScale = 0.5

  const CARD_W = BASE_CARD_W * cardScale
  const CARD_H = BASE_CARD_H * cardScale

  const MAX_SCROLL = total * SCROLL_PER_CARD
  const MORPH_END = Math.round(MAX_SCROLL * 0.2)

  // 虚拟滚动
  const virtualScroll = useMotionValue(0)
  const scrollRef = useRef(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      // 变体阶段灵敏度高，完全展开后灵敏度降低，便于精细操控
      const progress = scrollRef.current / MAX_SCROLL
      const sensitivity = progress > 0.2 ? 0.5 - (progress - 0.2) * 0.4 : 0.5
      scrollRef.current = Math.min(
        Math.max(scrollRef.current + e.deltaY * sensitivity, 0),
        MAX_SCROLL,
      )
      virtualScroll.set(scrollRef.current)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [virtualScroll, MAX_SCROLL])

  // 变体进度：0 扇面 → 1 底弧
  const morphProgress = useTransform(virtualScroll, [0, MORPH_END], [0, 1])

  // 弧旋转
  const scrollRotate = useTransform(
    virtualScroll,
    [MORPH_END, MAX_SCROLL],
    [0, 360],
  )

  // 仅当滚轮实际变化时更新 state（用 rAF 节流，避免频繁重渲染导致卡面描边/掉帧）
  const [morphValue, setMorphValue] = useState(0)
  const [rotateValue, setRotateValue] = useState(0)
  const rafRef = useRef(0)
  const pendingRef = useRef<{ morph: number; rotate: number }>({
    morph: 0,
    rotate: 0,
  })

  useEffect(() => {
    const flush = () => {
      rafRef.current = 0
      setMorphValue(pendingRef.current.morph)
      setRotateValue(pendingRef.current.rotate)
    }
    const schedule = () => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(flush)
    }
    const unsub1 = morphProgress.on('change', (v) => {
      pendingRef.current.morph = v
      schedule()
    })
    const unsub2 = scrollRotate.on('change', (v) => {
      pendingRef.current.rotate = v
      schedule()
    })
    return () => {
      unsub1()
      unsub2()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [morphProgress, scrollRotate])

  // 散落位置 — 从中心向外炸开
  const scatterPositions = useMemo(() => {
    const angles = cards.map((_, i) => {
      if (total === 1) return -90 // 单卡向上
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 bg-bg-primary/95"
      >
        {/* 关闭/返回按钮 */}
        <button
          onClick={() => (showCardStack ? setShowCardStack(false) : onClose())}
          className="absolute top-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary/80 text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          aria-label={showCardStack ? '返回散落视图' : '关闭'}
        >
          <X className="size-5" />
        </button>

        <div
          ref={containerRef}
          className="relative w-full h-full overflow-hidden"
        >
          {/* 中央提示文字 */}
          {!showCardStack && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <motion.p
                initial={{ opacity: 0 }}
                animate={
                  phase === 'circle' && morphValue < 0.3
                    ? { opacity: 0.6 - morphValue * 2 }
                    : { opacity: 0 }
                }
                onClick={() => {
                  setShowCardStack(true)
                  setQueueStart(0)
                }}
                className="text-sm text-text-muted tracking-widest cursor-pointer hover:text-text-primary transition-colors pointer-events-auto"
              >
                点击聚拢卡牌
              </motion.p>
            </div>
          )}

          <div className="flex h-full w-full items-center justify-center">
            {cards.map((card, i) => {
              let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 }

              if (showCardStack) {
                // 卡片聚拢到中央堆叠
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
              } else {
                const h = containerSize.height
                const w = containerSize.width

                // 圆形分布：360° 均匀排列
                const minDim = Math.min(w, h)
                const circleRadius = Math.min(minDim * 0.35, 350)
                const circleAngleDeg = total === 1 ? -90 : (i / total) * 360
                const circleRad = (circleAngleDeg * Math.PI) / 180

                const circlePos = {
                  x: Math.cos(circleRad) * circleRadius,
                  y: Math.sin(circleRad) * circleRadius,
                  rotation: circleAngleDeg + 90,
                  scale: total <= 3 ? 1.8 : 1.3,
                  opacity: 1,
                }

                // 底弧 — 大角度铺开，填满屏幕下半区域
                const isMobile = w < 768
                const arcRadius = Math.min(w, h * 1.5) * (isMobile ? 1.3 : 1.2)
                const arcApexY = h * (isMobile ? 0.35 : 0.25)
                const arcCenterY = arcApexY + arcRadius
                const arcSpread =
                  total === 1
                    ? 0
                    : Math.min((total - 1) * 25, isMobile ? 120 : 200)
                const arcStartAngle = -90 - arcSpread / 2
                const arcStep = arcSpread / Math.max(total - 1, 1)
                const maxRotation = arcSpread * 0.8
                const scrollProgress = Math.min(
                  Math.max(rotateValue / 360, 0),
                  1,
                )
                // 双向旋转：从中位出发，左右两侧都能看到
                const boundedRotation = (0.5 - scrollProgress) * maxRotation
                const currentArcAngle =
                  arcStartAngle + i * arcStep + boundedRotation
                const arcRad = (currentArcAngle * Math.PI) / 180
                const arcPos = {
                  x: Math.cos(arcRad) * arcRadius,
                  y: Math.sin(arcRad) * arcRadius + arcCenterY,
                  rotation: currentArcAngle + 90,
                  scale: isMobile ? 1.6 : 2.2,
                  opacity: 1,
                }

                // 插值：圆形 → 底弧
                target = {
                  x: lerp(circlePos.x, arcPos.x, morphValue),
                  y: lerp(circlePos.y, arcPos.y, morphValue),
                  rotation: lerp(
                    circlePos.rotation,
                    arcPos.rotation,
                    morphValue,
                  ),
                  scale: lerp(circlePos.scale, arcPos.scale, morphValue),
                  opacity: 1,
                }
              }

              return (
                <PackCard
                  key={card.id}
                  card={card}
                  target={target}
                  cardWidth={CARD_W}
                  cardHeight={CARD_H}
                  onNavigate={handleNavigate}
                />
              )
            })}
          </div>

          {/* 聚拢后的卡片堆叠 */}
          {showCardStack &&
            (() => {
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
                  {/* 卡片堆叠 — 绝对居中，固定外壳防止布局跳动 */}
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

                  {/* 队列控制栏 — 绝对定位，不受卡片动画影响 */}
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
                    <button
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
                      onClick={() => setQueueStart((p) => p + 1)}
                      disabled={queueRemaining <= 0}
                      className="rounded-lg bg-white dark:bg-black px-3 py-1.5 text-sm text-black dark:text-white hover:opacity-80 transition-opacity border border-black/15 dark:border-white/15 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      下一张 →
                    </button>
                  </div>
                </motion.div>
              )
            })()}

          {/* 布局切换 */}
          {showCardStack && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center gap-1 rounded-lg bg-secondary/50 p-1">
              {[
                { mode: 'stack' as const, icon: Layers },
                { mode: 'grid' as const, icon: Grid3X3 },
                { mode: 'list' as const, icon: LayoutList },
              ].map(({ mode, icon: Icon }) => (
                <button
                  key={mode}
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
          )}

          {/* 回到散落视图 */}
          {showCardStack && (
            <button
              onClick={() => setShowCardStack(false)}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 rounded-full bg-white dark:bg-black px-4 py-2 text-sm text-black dark:text-white hover:opacity-80 transition-opacity border border-black/15 dark:border-white/15"
            >
              返回散落视图
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
