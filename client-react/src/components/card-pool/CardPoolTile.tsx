import type { CSSProperties, RefObject } from 'react'
import {
  BatteryCharging,
  BookOpen,
  Briefcase,
  Car,
  FileCheck,
  Hand,
  Layers,
  MapPin,
  Mic,
  Music,
  Palette,
  PenLine,
  ShoppingBag,
  SprayCan,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlackScope } from '@/components/card-pool/types'
import {
  scopeCurrentClassificationBasis,
  scopeKey,
  scopeTaxonomySpectrumStyle,
  scopeTileAccentColor,
} from '@/components/card-pool/scope'
import { stitchTileFaceGradient } from '@/constants/card-pool-stitch'
import { useLongPressDropInHand } from '@/components/card-pool/useLongPressHandZone'
import { BrowseBlackScopeDragGhost } from '@/components/card-pool/card-pool-drag-ghost'

function categoryIconFor(label: string): LucideIcon {
  if (/洗车|美容/.test(label)) return SprayCan
  if (/贴膜|改色|设计/.test(label)) return Palette
  if (/维修|保养/.test(label)) return Wrench
  if (/道路|救援/.test(label)) return Car
  if (/充电/.test(label)) return BatteryCharging
  if (/年检/.test(label)) return FileCheck
  if (/代驾|陪练/.test(label)) return Users
  if (/电商/.test(label)) return ShoppingBag
  if (/专业/.test(label)) return Briefcase
  if (/声乐|配音/.test(label)) return Mic
  if (/写作|文案/.test(label)) return PenLine
  if (/音乐/.test(label)) return Music
  if (/内容/.test(label)) return Layers
  if (/教育|培训/.test(label)) return BookOpen
  if (/技术|开发/.test(label)) return Wrench
  if (/旅行|户外/.test(label)) return MapPin
  return Layers
}

export function cardPoolCategoryIcon(label: string): LucideIcon {
  return categoryIconFor(label)
}

/** Stitch 定稿：BlackPackSpine 同构缩放的叠层卡包 */
export function CardPoolTileSpine({
  accent,
  faceGradient,
  dimmed = false,
  variant = 'tile',
}: {
  accent: string
  faceGradient: string
  dimmed?: boolean
  variant?: 'tile' | 'hand'
}) {
  return (
    <div
      className={cn(
        'card-pool-tile__pack',
        variant === 'hand' && 'card-pool-tile__pack--hand',
        dimmed && 'card-pool-tile__pack--dim',
      )}
      aria-hidden
    >
      <div className="card-pool-tile__pack-layer card-pool-tile__pack-layer--0" />
      <div className="card-pool-tile__pack-layer card-pool-tile__pack-layer--1" />
      <div className="card-pool-tile__pack-layer card-pool-tile__pack-layer--2" />
      <div
        className="card-pool-tile__pack-layer card-pool-tile__pack-layer--face"
        style={
          {
            background: faceGradient,
            borderColor: `color-mix(in srgb, ${accent} 42%, rgba(255,255,255,0.18))`,
            boxShadow: `0 0 28px color-mix(in srgb, ${accent} 38%, transparent), inset 0 1px 0 rgba(255,255,255,0.28)`,
          } as CSSProperties
        }
      />
    </div>
  )
}

export function CardPoolCategoryTile({
  scope,
  count,
  busy,
  featured = false,
  handDropZoneRef,
  onOpen,
  onDropInHand,
  onPointerHandZoneHover,
}: {
  scope: BlackScope
  count: number | null | undefined
  busy: boolean
  featured?: boolean
  handDropZoneRef: RefObject<HTMLElement | null>
  onOpen: () => void
  onDropInHand: (at: { clientX: number; clientY: number }) => void
  onPointerHandZoneHover?: (over: boolean) => void
}) {
  const label = scopeCurrentClassificationBasis(scope)
  const Icon = categoryIconFor(label)
  const accent = scopeTileAccentColor(scope)
  const faceGradient = stitchTileFaceGradient(accent)
  const isZero = count === 0
  const spectrum = scopeTaxonomySpectrumStyle(scope, count)

  const { onPointerDown, onClickCapture, dragInVisual } =
    useLongPressDropInHand({
      handZoneRef: handDropZoneRef,
      disabled: busy,
      onTap: onOpen,
      onDropInHand: onDropInHand,
      onHandZoneHoverChange: onPointerHandZoneHover,
    })

  return (
    <div className="group w-full min-w-0">
      <BrowseBlackScopeDragGhost
        dragInVisual={dragInVisual}
        basis={label}
        n={count}
        spectrum={spectrum}
      />
      <button
        type="button"
        disabled={busy}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
        style={{ '--tile-accent': accent } as CSSProperties}
        className={cn(
          'card-pool-tile w-full text-left outline-none',
          isZero && 'card-pool-tile--zero',
          featured && 'card-pool-tile--featured',
          !busy && 'cursor-pointer',
          busy && 'cursor-wait opacity-70',
        )}
      >
        <CardPoolTileSpine
          accent={accent}
          faceGradient={faceGradient}
          dimmed={isZero}
        />
        <div className="card-pool-tile__body">
          <div className="card-pool-tile__label-row">
            <span
              className="card-pool-tile__icon-wrap"
              style={{ color: accent }}
            >
              <Icon className="size-[1.125rem]" aria-hidden />
            </span>
            <span className="card-pool-tile__label">{label}</span>
          </div>
        </div>
        <span className="card-pool-tile__badge tabular-nums">
          {count === undefined ? '…' : count === null ? '—' : count}
        </span>
        {featured ? (
          <span className="card-pool-tile__featured-chip">高活跃</span>
        ) : null}
        <span className="card-pool-tile__drag-hint">
          <Hand className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
          拖入手牌
        </span>
      </button>
    </div>
  )
}

/** 手牌展开区：与卡池分类卡同系的叠放大卡 */
export function CardPoolHandStackCard({
  scope,
  count,
  isSingles = false,
  onRemove,
  className,
}: {
  scope: BlackScope
  count: number | null | undefined
  isSingles?: boolean
  onRemove: () => void
  className?: string
}) {
  const label = scopeCurrentClassificationBasis(scope)
  const Icon = categoryIconFor(label)
  const accent = scopeTileAccentColor(scope)
  const faceGradient = stitchTileFaceGradient(accent)
  const isZero = !isSingles && count === 0

  return (
    <div
      className={cn(
        'card-pool-hand-stack-card',
        isZero && 'card-pool-hand-stack-card--zero',
        className,
      )}
      style={{ '--tile-accent': accent } as CSSProperties}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="card-pool-hand-stack-card__close"
        aria-label="移除此卡包"
      >
        <X className="size-3.5" strokeWidth={2.25} />
      </button>
      <CardPoolTileSpine
        accent={accent}
        faceGradient={faceGradient}
        dimmed={isZero}
        variant="hand"
      />
      <div className="card-pool-hand-stack-card__body">
        <div className="card-pool-hand-stack-card__label-row">
          <span
            className="card-pool-hand-stack-card__icon"
            style={{ color: accent }}
          >
            <Icon className="size-5" aria-hidden />
          </span>
          <span className="card-pool-hand-stack-card__label">{label}</span>
        </div>
        <p className="card-pool-hand-stack-card__hint">
          双击打开桌面 · 右键更多操作
        </p>
      </div>
      <span className="card-pool-hand-stack-card__badge tabular-nums">
        {isSingles ? '?' : count === undefined ? '…' : count === null ? '—' : count}
      </span>
    </div>
  )
}

export function CardPoolCategoryGrid({
  scopes,
  scopeTotals,
  busy,
  handDropZoneRef,
  onCardOpen,
  onDropInHand,
  onPointerHandZoneHover,
}: {
  scopes: BlackScope[]
  scopeTotals: Record<string, number | null>
  busy: boolean
  handDropZoneRef: RefObject<HTMLElement | null>
  onCardOpen: (s: BlackScope) => void
  onDropInHand: (
    scope: BlackScope,
    at: { clientX: number; clientY: number },
  ) => void
  onPointerHandZoneHover?: (over: boolean) => void
}) {
  if (scopes.length === 0) return null

  const numericCounts = scopes
    .map((s) => scopeTotals[scopeKey(s)])
    .filter((v): v is number => typeof v === 'number')
  const maxCount =
    numericCounts.length > 0 ? Math.max(...numericCounts) : 0

  return (
    <div className="card-pool-stitch__grid">
      {scopes.map((s) => {
        const k = scopeKey(s)
        const n = scopeTotals[k]
        const featured =
          typeof n === 'number' && n > 0 && n === maxCount && maxCount >= 20
        return (
          <CardPoolCategoryTile
            key={k}
            scope={s}
            count={n}
            busy={busy}
            featured={featured}
            handDropZoneRef={handDropZoneRef}
            onOpen={() => onCardOpen(s)}
            onDropInHand={(at) => onDropInHand(s, at)}
            onPointerHandZoneHover={onPointerHandZoneHover}
          />
        )
      })}
    </div>
  )
}
