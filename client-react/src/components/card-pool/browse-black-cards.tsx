import type { CSSProperties, RefObject } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, animate, motion } from 'framer-motion'
import { Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlackScope } from '@/components/card-pool/types'
import {
  scopeCurrentClassificationBasis,
  scopeKey,
  scopeTaxonomySpectrumStyle,
} from '@/components/card-pool/scope'
import { AuroraGradientBar } from '@/components/ui/aurora-gradient-bar'
import { useLongPressDropInHand } from '@/components/card-pool/useLongPressHandZone'
import {
  HandEntryCardPackFace,
  HandPackGhostAtPoint,
} from '@/components/card-pool/HandPile'

export function BrowseBlackScopeDragGhost({
  dragInVisual,
  basis,
  n,
  spectrum,
}: {
  dragInVisual: { x: number; y: number } | null
  basis: string
  n: number | null | undefined
  spectrum: CSSProperties | undefined
}) {
  const [holdExit, setHoldExit] = useState(false)
  useLayoutEffect(() => {
    if (dragInVisual != null) setHoldExit(true)
  }, [dragInVisual])
  const show = dragInVisual != null || holdExit
  if (!show || typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence mode="sync" onExitComplete={() => setHoldExit(false)}>
      {dragInVisual != null ? (
        <HandPackGhostAtPoint
          key="browse-drag-in"
          x={dragInVisual.x}
          y={dragInVisual.y}
          exitOnUnmount
        >
          <HandEntryCardPackFace
            basis={basis}
            n={n}
            spectrum={spectrum}
            className="ring-2 ring-accent/40"
          />
        </HandPackGhostAtPoint>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

/** 左侧叠层黑卡（卡包厚度），仅用于横向卡包浏览 */
export function BlackPackSpine({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative h-[100px] w-[72px] shrink-0 self-center sm:h-[108px] sm:w-[76px]',
        className,
      )}
      aria-hidden
    >
      <div className="absolute left-0 top-3 z-0 h-[82px] w-9 rounded-lg border border-white/[0.1] bg-neutral-900/75 shadow-md sm:h-[88px]" />
      <div className="absolute left-1.5 top-2 z-[1] h-[86px] w-10 rounded-lg border border-white/[0.12] bg-neutral-800/85 shadow-md sm:h-[92px] sm:w-11" />
      <div className="absolute left-3 top-1 z-[2] h-[90px] w-11 rounded-lg border border-white/[0.14] bg-gradient-to-br from-neutral-700/95 to-neutral-950 shadow-lg sm:h-[96px] sm:w-12" />
      <div className="absolute left-[18px] top-0 z-[3] h-[94px] w-[52px] rounded-lg border border-t-white/20 border-l-white/18 border-r-white/[0.08] border-b-white/[0.06] border-accent/25 bg-gradient-to-b from-neutral-600/90 from-20% to-neutral-950 to-100% shadow-xl ring-1 ring-white/[0.05] sm:left-5 sm:h-[100px] sm:w-[54px]" />
    </div>
  )
}

function spectrumAccentColor(
  style: CSSProperties | undefined,
): string | undefined {
  const c = style?.color
  return typeof c === 'string' && c.length > 0 ? c : undefined
}

type PackStripProps = {
  label: string
  spectrum?: CSSProperties | undefined
}

export function PackStrip({ label, spectrum }: PackStripProps) {
  const accent = spectrumAccentColor(spectrum)
  // rainbow 渐变来自 CSS 自定义属性 --accent-bg
  const accentBg = (spectrum as Record<string, unknown> | undefined)?.[
    '--accent-bg'
  ] as string | undefined

  const gradient =
    accentBg ??
    (accent ? `linear-gradient(105deg, ${accent} 0%, #0a0a12 88%)` : null)

  if (gradient) {
    return (
      <div
        className="relative flex h-9 w-full shrink-0 items-center justify-center overflow-hidden px-2 pack-strip-shimmer"
        style={{ backgroundImage: gradient }}
      >
        <span className="relative z-10 line-clamp-1 text-center text-sm font-bold uppercase tracking-wider text-white drop-shadow-sm">
          {label}
        </span>
      </div>
    )
  }

  return (
    <div className="relative flex h-9 w-full shrink-0 items-center justify-center overflow-hidden">
      <AuroraGradientBar className="absolute inset-0" intensity={1} />
      <span className="relative z-10 line-clamp-1 px-2 text-center text-sm font-bold uppercase tracking-wider text-white drop-shadow-sm">
        {label}
      </span>
    </div>
  )
}

/** 与 RootSummaryBlackCard 一致：无圆弧双层边框 / 无投影外壳，仅布局与焦点环 */
export const packButtonClass = cn(
  'group flex w-full min-h-0 flex-row items-stretch overflow-visible text-left outline-none transition-opacity',
  'focus-visible:ring-2 focus-visible:ring-ring/50',
)

export const packButtonIdle = cn('cursor-pointer')

/** 根卡池「全部需求」等：数值变化时插值；位数变化时 layout 轻微过渡 */
export function AnimatedScopeCount({
  value,
  className,
  nullFallback = '…',
}: {
  value: number | null
  className?: string
  nullFallback?: string
}) {
  const displayRef = useRef<number | null>(null)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (value === null) {
      displayRef.current = null
      return
    }
    if (displayRef.current === null) {
      displayRef.current = value
      setDisplay(value)
      return
    }
    const from = displayRef.current
    if (from === value) {
      displayRef.current = value
      setDisplay(value)
      return
    }
    const ctrl = animate(from, value, {
      duration: 0.52,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        const r = Math.round(latest)
        displayRef.current = r
        setDisplay(r)
      },
      onComplete: () => {
        displayRef.current = value
        setDisplay(value)
      },
    })
    return () => ctrl.stop()
  }, [value])

  if (value === null) {
    return <span className={className}>{nullFallback}</span>
  }

  return (
    <motion.span layout="position" className={className}>
      {display}
    </motion.span>
  )
}

/** 根节点：横向卡包 + 极光顶条（与需求详情卡同系） */
export function RootSummaryBlackCard({
  total,
  totalFull,
  busy,
  onOpen,
  onLongPressDropInHand,
  handDropZoneRef,
  handDragScope,
  onPointerHandZoneHover,
}: {
  /** 牌堆上可见条数（已扣除入手牌子范围） */
  total: number | null
  /** 全库条数；大于 total 时显示简短说明 */
  totalFull?: number | null
  busy: boolean
  onOpen: () => void
  onLongPressDropInHand: (at: { clientX: number; clientY: number }) => void
  handDropZoneRef: RefObject<HTMLElement | null>
  /** 拖入「手牌区」时写入的 BlackScope（与 addToHand 一致） */
  handDragScope: BlackScope
  onPointerHandZoneHover?: (over: boolean) => void
}) {
  const { onPointerDown, onClickCapture, dragInVisual } =
    useLongPressDropInHand({
      handZoneRef: handDropZoneRef,
      disabled: busy,
      onTap: () => {
        if (!busy) onOpen()
      },
      onDropInHand: (at) => {
        if (!busy) onLongPressDropInHand(at)
      },
      onHandZoneHoverChange: onPointerHandZoneHover,
    })

  const spectrum = scopeTaxonomySpectrumStyle(handDragScope, total)

  return (
    <div className="flex flex-1 items-center justify-center py-6 sm:py-8">
      <BrowseBlackScopeDragGhost
        dragInVisual={dragInVisual}
        basis={scopeCurrentClassificationBasis(handDragScope)}
        n={total ?? undefined}
        spectrum={spectrum}
      />
      <div className="w-full max-w-2xl shrink-0 px-1">
        <button
          type="button"
          disabled={busy}
          onPointerDown={onPointerDown}
          onClickCapture={onClickCapture}
          className={cn(
            'group flex w-full min-h-0 flex-row items-stretch overflow-visible text-left outline-none transition-opacity',
            'focus-visible:ring-2 focus-visible:ring-ring/50',
            !busy && 'cursor-pointer',
            busy && 'cursor-wait opacity-75',
          )}
        >
          <div className="flex shrink-0 items-stretch border-r border-white/[0.08] bg-bg-secondary/75 px-3 py-3 sm:px-4">
            <BlackPackSpine />
          </div>
          <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
            <PackStrip label="全部 · 卡池总览" />
            <div className="flex min-h-[88px] flex-1 flex-col justify-center gap-1.5 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2 text-white/90">
                <Layers
                  className="size-4 shrink-0 text-neutral-400"
                  aria-hidden
                />
                <span className="text-sm font-semibold tracking-wide">
                  全部需求
                </span>
              </div>
              <AnimatedScopeCount
                value={total}
                className="font-mono text-3xl font-black tabular-nums tracking-tight text-[var(--primary-start)] drop-shadow-[0_0_12px_rgba(56,189,248,0.35)] sm:text-4xl"
              />
              {totalFull != null && total != null && totalFull > total ? (
                <span className="text-sm text-white/50">全库 {totalFull}</span>
              ) : null}
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

function ExplorerBrowseBlackCard({
  s,
  busy,
  scopeTotals,
  onCardOpen,
}: {
  s: BlackScope
  busy: boolean
  scopeTotals: Record<string, number | null>
  onCardOpen: (s: BlackScope) => void
}) {
  const n = scopeTotals[scopeKey(s)]
  const spectrum = scopeTaxonomySpectrumStyle(s, n)
  const stripLabel = scopeCurrentClassificationBasis(s)

  return (
    <div className="w-full min-w-0">
      <button
        type="button"
        disabled={busy}
        title="单击进入该分类"
        onClick={() => {
          if (!busy) onCardOpen(s)
        }}
        className={cn(
          packButtonClass,
          !busy && packButtonIdle,
          busy && 'cursor-wait opacity-70',
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-br from-neutral-950 via-neutral-900 to-black">
          <PackStrip label={stripLabel} spectrum={spectrum} />
          <div className="flex min-h-[84px] flex-1 flex-col items-center justify-center px-3 py-2.5 sm:min-h-[92px] sm:px-4">
            <span
              className={cn(
                'font-mono text-2xl font-black tabular-nums sm:text-3xl',
                !spectrum && 'text-[var(--primary-start)]',
              )}
              style={spectrum}
            >
              {n === undefined ? '…' : n === null ? '—' : n}
            </span>
          </div>
        </div>
      </button>
    </div>
  )
}

function PoolBrowseBlackCard({
  s,
  busy,
  scopeTotals,
  handDropZoneRef,
  onCardOpen,
  onLongPressDropScopeInHand,
  onPointerHandZoneHover,
}: {
  s: BlackScope
  busy: boolean
  scopeTotals: Record<string, number | null>
  handDropZoneRef: RefObject<HTMLElement | null>
  onCardOpen: (s: BlackScope) => void
  onLongPressDropScopeInHand: (
    scope: BlackScope,
    at: { clientX: number; clientY: number },
  ) => void
  onPointerHandZoneHover?: (over: boolean) => void
}) {
  const k = scopeKey(s)
  const n = scopeTotals[k]
  const { onPointerDown, onClickCapture, dragInVisual } =
    useLongPressDropInHand({
      handZoneRef: handDropZoneRef,
      disabled: busy,
      onTap: () => onCardOpen(s),
      onDropInHand: (at) => onLongPressDropScopeInHand(s, at),
      onHandZoneHoverChange: onPointerHandZoneHover,
    })
  const spectrum = scopeTaxonomySpectrumStyle(s, n)
  const stripLabel = scopeCurrentClassificationBasis(s)

  return (
    <div className="w-full min-w-0">
      <BrowseBlackScopeDragGhost
        dragInVisual={dragInVisual}
        basis={stripLabel}
        n={n}
        spectrum={spectrum}
      />
      <button
        type="button"
        disabled={busy}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
        className={cn(
          packButtonClass,
          !busy && packButtonIdle,
          busy && 'cursor-wait opacity-70',
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-br from-neutral-950 via-neutral-900 to-black">
          <PackStrip label={stripLabel} spectrum={spectrum} />
          <div className="flex min-h-[84px] flex-1 flex-col items-center justify-center px-3 py-2.5 sm:min-h-[92px] sm:px-4">
            <span
              className={cn(
                'font-mono text-2xl font-black tabular-nums sm:text-3xl',
                !spectrum && 'text-[var(--primary-start)]',
              )}
              style={spectrum}
            >
              {n === undefined ? '…' : n === null ? '—' : n}
            </span>
          </div>
        </div>
      </button>
    </div>
  )
}

/** 子分类：横向卡包网格（与根总览同系扁平布局 + 极光条） */
export function ChildBlackCardGrid({
  scopes,
  scopeTotals,
  busy,
  onCardOpen,
  onLongPressDropScopeInHand,
  handDropZoneRef,
  onPointerHandZoneHover,
  mode = 'pool',
}: {
  scopes: BlackScope[]
  scopeTotals: Record<string, number | null>
  busy: boolean
  onCardOpen: (s: BlackScope) => void
  onLongPressDropScopeInHand?: (
    scope: BlackScope,
    at: { clientX: number; clientY: number },
  ) => void
  handDropZoneRef?: RefObject<HTMLElement | null>
  onPointerHandZoneHover?: (over: boolean) => void
  mode?: 'pool' | 'explorer'
}) {
  if (scopes.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
      {scopes.map((s) => {
        const k = scopeKey(s)
        if (mode === 'explorer') {
          if (handDropZoneRef && onLongPressDropScopeInHand) {
            return (
              <PoolBrowseBlackCard
                key={k}
                s={s}
                busy={busy}
                scopeTotals={scopeTotals}
                handDropZoneRef={handDropZoneRef}
                onCardOpen={onCardOpen}
                onLongPressDropScopeInHand={onLongPressDropScopeInHand}
                onPointerHandZoneHover={onPointerHandZoneHover}
              />
            )
          }
          return (
            <ExplorerBrowseBlackCard
              key={k}
              s={s}
              busy={busy}
              scopeTotals={scopeTotals}
              onCardOpen={onCardOpen}
            />
          )
        }
        if (!handDropZoneRef || !onLongPressDropScopeInHand) return null
        return (
          <PoolBrowseBlackCard
            key={k}
            s={s}
            busy={busy}
            scopeTotals={scopeTotals}
            handDropZoneRef={handDropZoneRef}
            onCardOpen={onCardOpen}
            onLongPressDropScopeInHand={onLongPressDropScopeInHand}
            onPointerHandZoneHover={onPointerHandZoneHover}
          />
        )
      })}
    </div>
  )
}
