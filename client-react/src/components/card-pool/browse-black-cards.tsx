import type { CSSProperties, RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { animate, motion } from 'framer-motion'
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
import { CardPoolCategoryGrid } from '@/components/card-pool/CardPoolTile'
import { BrowseBlackScopeDragGhost } from '@/components/card-pool/card-pool-drag-ghost'

export { BrowseBlackScopeDragGhost } from '@/components/card-pool/card-pool-drag-ghost'
export { CardPoolCategoryGrid, CardPoolCategoryTile, CardPoolTileSpine } from '@/components/card-pool/CardPoolTile'

/** 左侧叠层卡包厚度 */
export function BlackPackSpine({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'card-pool-pack-spine relative h-[100px] w-[72px] shrink-0 self-center sm:h-[108px] sm:w-[76px]',
        className,
      )}
      aria-hidden
    >
      <div className="card-pool-pack-spine__layer card-pool-pack-spine__layer--0" />
      <div className="card-pool-pack-spine__layer card-pool-pack-spine__layer--1" />
      <div className="card-pool-pack-spine__layer card-pool-pack-spine__layer--2" />
      <div className="card-pool-pack-spine__layer card-pool-pack-spine__layer--face" />
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
  // rainbow 渐变来自 CSS 自定义属性 --accent-bg（压成半透，避免实色条）
  const accentBg = (spectrum as Record<string, unknown> | undefined)?.[
    '--accent-bg'
  ] as string | undefined

  const tint =
    accentBg ??
    (accent
      ? `linear-gradient(105deg, color-mix(in srgb, ${accent} 42%, transparent) 0%, transparent 88%)`
      : null)

  return (
    <div className="card-pool-pack-strip relative flex h-9 w-full shrink-0 items-center justify-center overflow-hidden px-2">
      <div className="card-pool-pack-strip__glass absolute inset-0" aria-hidden />
      {tint ? (
        <div
          className="absolute inset-0 opacity-45 pack-strip-shimmer"
          style={{ backgroundImage: tint }}
          aria-hidden
        />
      ) : (
        <AuroraGradientBar
          className="absolute inset-0 opacity-30"
          intensity={0.65}
        />
      )}
      <span className="relative z-10 line-clamp-1 text-center text-sm font-bold tracking-wider text-[var(--internal-text,var(--text-primary))]">
        {label}
      </span>
    </div>
  )
}

/** 卡包按钮壳：圆角液态玻璃 */
export const packButtonClass = cn(
  'card-pool-pack-shell group flex w-full min-h-0 flex-row items-stretch overflow-hidden rounded-2xl text-left outline-none transition-opacity',
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
          onKeyDown={(e) => {
            if (busy) return
            if (e.key === 'Enter' && e.shiftKey) {
              e.preventDefault()
              e.stopPropagation()
              const rect = handDropZoneRef.current?.getBoundingClientRect()
              onLongPressDropInHand({
                clientX: rect ? rect.left + rect.width / 2 : 0,
                clientY: rect ? rect.top + rect.height / 2 : 0,
              })
            }
          }}
          aria-label="卡池总览，Enter 进入，Shift+Enter 加入手牌"
          className={cn(
            packButtonClass,
            !busy && packButtonIdle,
            busy && 'cursor-wait opacity-75',
          )}
        >
          <div className="card-pool-pack-shell__rail flex shrink-0 items-stretch px-3 py-3 sm:px-4">
            <BlackPackSpine />
          </div>
          <div className="flex min-w-0 flex-1 flex-col bg-transparent">
            <PackStrip label="全部 · 卡池总览" />
            <div className="flex min-h-[88px] flex-1 flex-col justify-center gap-1.5 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2 text-[var(--internal-text,var(--text-primary))]">
                <Layers
                  className="size-4 shrink-0 text-[var(--internal-text-secondary,var(--text-muted))]"
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
                <span className="text-sm text-[var(--internal-text-secondary,var(--text-muted))]">
                  全库 {totalFull}
                </span>
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
        <div className="flex min-w-0 flex-1 flex-col bg-transparent">
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

/** 子分类网格：pool 走 Stitch 定稿；explorer 保留旧卡包样式 */
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

  if (
    mode === 'pool' &&
    handDropZoneRef &&
    onLongPressDropScopeInHand
  ) {
    return (
      <CardPoolCategoryGrid
        scopes={scopes}
        scopeTotals={scopeTotals}
        busy={busy}
        handDropZoneRef={handDropZoneRef}
        onCardOpen={onCardOpen}
        onDropInHand={onLongPressDropScopeInHand}
        onPointerHandZoneHover={onPointerHandZoneHover}
      />
    )
  }

  return (
    <div className="card-pool-stitch__grid">
      {scopes.map((s) => (
        <ExplorerBrowseBlackCard
          key={scopeKey(s)}
          s={s}
          busy={busy}
          scopeTotals={scopeTotals}
          onCardOpen={onCardOpen}
        />
      ))}
    </div>
  )
}
