import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from 'react'
import { createPortal } from 'react-dom'
import {
  motion,
  AnimatePresence,
  useMotionValue,
  animate,
  useDragControls,
  type PanInfo,
} from 'framer-motion'
import { ChevronUp, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlackScope, HandEntry } from '@/components/card-pool/types'
import {
  packButtonClass,
  packButtonIdle,
} from '@/components/card-pool/browse-black-cards'
import {
  scopeCurrentClassificationBasis,
  scopeKey,
  scopeTaxonomySpectrumStyle,
} from '@/components/card-pool/scope'
import { useLongPressDragOutOfHand } from '@/components/card-pool/useLongPressHandZone'

const PEEK_LEAVE_MS = 420
const ACTION_W = 132

/** 手牌区专用：竖条卡面（路径标题 + 数量），与卡池浏览区的横向卡包视觉分离 */
export function HandEntryCardPackFace({
  basis,
  n,
  spectrum,
  className,
  isSingles,
}: {
  basis: string
  n: number | null | undefined
  spectrum: CSSProperties | undefined
  className?: string
  isSingles?: boolean
}) {
  const accent =
    spectrum?.color != null &&
    typeof spectrum.color === 'string' &&
    spectrum.color.length > 0
      ? spectrum.color
      : undefined

  if (isSingles) {
    return (
      <div
        className={cn(
          packButtonClass,
          'min-h-[108px] overflow-hidden rounded-lg border border-white/10 bg-neutral-950',
          className,
        )}
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2">
          <span className="text-5xl font-black leading-none text-white/80">
            ?
          </span>
          <span className="text-sm font-medium text-white/40">{n ?? '?'}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        packButtonClass,
        'min-h-[108px] overflow-hidden rounded-lg border border-white/[0.08] bg-neutral-950',
        className,
      )}
    >
      <div
        className={cn(
          'w-1 shrink-0 self-stretch',
          accent == null &&
            'bg-gradient-to-b from-[var(--primary-start)] to-neutral-900',
        )}
        style={
          accent != null
            ? {
                background: `linear-gradient(180deg, ${accent} 0%, #171717 100%)`,
              }
            : undefined
        }
        aria-hidden
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-2 bg-gradient-to-br from-neutral-950 via-neutral-900 to-black px-3 py-3">
        <span
          className="line-clamp-5 min-w-0 text-left text-sm font-semibold leading-snug text-white/95"
          style={spectrum}
        >
          {basis}
        </span>
        <span
          className={cn(
            'font-mono text-3xl font-black tabular-nums tracking-tight',
            accent == null && 'text-[var(--primary-start)]',
          )}
          style={spectrum}
        >
          {n === undefined ? '…' : n === null ? '—' : n}
        </span>
      </div>
    </div>
  )
}

export function handPackFacePropsFromScope(
  scope: BlackScope,
  scopeTotals: Record<string, number | null>,
) {
  const k = scopeKey(scope)
  const n = scopeTotals[k]
  return {
    basis: scopeCurrentClassificationBasis(scope),
    n,
    spectrum: scopeTaxonomySpectrumStyle(scope, n),
    isSingles: scope.path[scope.path.length - 1] === '__singles__',
  }
}

/** 拖出 / 拖入浮层：同一视口锚点 + 弹簧，避免两套动画不一致 */
const HAND_PACK_GHOST_SPRING = {
  type: 'spring' as const,
  stiffness: 520,
  damping: 30,
}
/** 近似卡面高度 × 原有 translate(-50%,-52%) 的纵向锚点偏移 */
const HAND_GHOST_TOP_OFFSET = Math.round(120 * 0.52)

function handGhostHalfCardWPx() {
  if (typeof globalThis.window === 'undefined') return 110
  return Math.min(220, globalThis.window.innerWidth * 0.92) / 2
}

export function HandPackGhostAtPoint({
  x,
  y,
  children,
  onPopComplete,
  exitOnUnmount,
}: {
  x: number
  y: number
  children: React.ReactNode
  onPopComplete?: () => void
  /** 仅在拖出幽灵使用：`AnimatePresence` 卸载前先播与 initial 对称的 exit（拖入仍为松手后即播入，再在 onComplete 卸载） */
  exitOnUnmount?: boolean
}) {
  const halfW = handGhostHalfCardWPx()
  return (
    <motion.div
      className="pointer-events-none fixed z-[var(--z-modal)] isolate w-[min(92vw,220px)] max-w-[220px] origin-center"
      aria-hidden
      style={{
        left: x - halfW,
        top: y - HAND_GHOST_TOP_OFFSET,
      }}
      initial={{ scale: 0.9, opacity: 0.88 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={exitOnUnmount ? { scale: 0.9, opacity: 0.88 } : undefined}
      transition={HAND_PACK_GHOST_SPRING}
      onAnimationComplete={onPopComplete}
    >
      <div className="rotate-[-1.5deg] drop-shadow-[0_22px_50px_rgba(0,0,0,0.55)]">
        {children}
      </div>
    </motion.div>
  )
}

interface HandPileProps {
  entries: HandEntry[]
  scopeTotals: Record<string, number | null>
  busy: boolean
  onOpenDesktop: (entry: HandEntry) => void
  onRemove: (id: string) => void
  onPin: (id: string) => void
  onDiscardToPile: (id: string) => void
  onPreview: (entry: HandEntry) => void
  /** 资源管理器等：从卡池指针拖入时加入手牌 */
  onDropBlackScope?: (scope: BlackScope) => void
  /** 指针拖入松手时在外部触发与落点一致的卡面浮现（addToHand 仍由外部调用） */
  celebrateBlackScopeDropRef?: MutableRefObject<
    ((scope: BlackScope, clientX: number, clientY: number) => void) | null
  >
  /** 指针拖曳经过手牌矩形（非 HTML5） */
  pointerDropHighlight?: boolean
}

function HandSwipeRow({
  entry,
  busy,
  handZoneRef,
  openSwipeId,
  setOpenSwipeId,
  scopeTotals,
  onOpenDesktop,
  onRemove,
  onPin,
  onDiscardToPile,
  onCtx,
}: {
  entry: HandEntry
  busy: boolean
  handZoneRef: RefObject<HTMLElement | null>
  openSwipeId: string | null
  setOpenSwipeId: Dispatch<SetStateAction<string | null>>
  scopeTotals: Record<string, number | null>
  onOpenDesktop: (entry: HandEntry) => void
  onRemove: (id: string) => void
  onPin: (id: string) => void
  onDiscardToPile: (id: string) => void
  onCtx: (e: React.MouseEvent, entry: HandEntry) => void
}) {
  const dragControls = useDragControls()
  const x = useMotionValue(0)
  const k = scopeKey(entry.scope)
  const n = scopeTotals[k]
  const basis = scopeCurrentClassificationBasis(entry.scope)
  const spectrum = scopeTaxonomySpectrumStyle(entry.scope, n)
  const isSingles =
    entry.scope.path[entry.scope.path.length - 1] === '__singles__'
  const snapClosed = useCallback(() => {
    animate(x, 0, { type: 'spring', stiffness: 520, damping: 38 })
    setOpenSwipeId((cur) => (cur === entry.id ? null : cur))
  }, [entry.id, setOpenSwipeId, x])

  useEffect(() => {
    if (openSwipeId !== null && openSwipeId !== entry.id) {
      snapClosed()
    }
  }, [entry.id, openSwipeId, snapClosed])

  const { onPointerDown, dragOutVisual } = useLongPressDragOutOfHand({
    handZoneRef,
    disabled: busy,
    onDragOut: () => onRemove(entry.id),
  })

  const [holdDragOutPresence, setHoldDragOutPresence] = useState(false)
  useLayoutEffect(() => {
    if (dragOutVisual != null) setHoldDragOutPresence(true)
  }, [dragOutVisual])

  const showDragOutPortal = dragOutVisual != null || holdDragOutPresence

  const dragOutGhost =
    showDragOutPortal &&
    typeof document !== 'undefined' &&
    createPortal(
      <AnimatePresence
        mode="sync"
        onExitComplete={() => setHoldDragOutPresence(false)}
      >
        {dragOutVisual != null ? (
          <HandPackGhostAtPoint
            key="hand-drag-out-ghost"
            x={dragOutVisual.x}
            y={dragOutVisual.y}
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

  const onDragEnd = useCallback(
    (_e: unknown, info: PanInfo) => {
      const cur = x.get()
      const projected = cur + info.velocity.x * 0.18
      if (projected < -ACTION_W * 0.32) {
        animate(x, -ACTION_W, { type: 'spring', stiffness: 420, damping: 34 })
        setOpenSwipeId(entry.id)
      } else {
        snapClosed()
      }
    },
    [entry.id, setOpenSwipeId, snapClosed, x],
  )

  return (
    <>
      {dragOutGhost}
      <motion.div
        layout
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10, transition: { duration: 0.2 } }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="relative mx-auto w-full max-w-[252px] overflow-visible py-2"
      >
        <div
          className="pointer-events-auto absolute inset-y-0 right-0 z-0 flex w-[132px] divide-x divide-border/60"
          aria-hidden
        >
          <button
            type="button"
            tabIndex={-1}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 bg-muted/90 text-sm font-medium text-text-primary hover:bg-accent/15"
            onClick={() => {
              onPin(entry.id)
              snapClosed()
            }}
          >
            置顶
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 bg-muted/90 text-sm font-medium text-text-primary hover:bg-accent/15"
            onClick={() => {
              onDiscardToPile(entry.id)
              snapClosed()
            }}
          >
            弃牌
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 bg-destructive/20 text-sm font-medium text-destructive hover:bg-destructive/30"
            onClick={() => {
              onRemove(entry.id)
              snapClosed()
            }}
          >
            移除
          </button>
        </div>

        <motion.div
          style={{ x }}
          drag={busy ? false : 'x'}
          dragListener={false}
          dragControls={dragControls}
          dragConstraints={{ left: -ACTION_W, right: 0 }}
          dragElastic={0.22}
          dragMomentum={false}
          onDragStart={() => setOpenSwipeId(entry.id)}
          onDragEnd={onDragEnd}
          className="relative z-10 min-w-0"
        >
          <div className="flex min-w-0 flex-row items-stretch">
            <button
              type="button"
              tabIndex={0}
              aria-label="从此条向左拖，展开置顶、弃牌、移除"
              disabled={busy}
              className={cn(
                'flex w-[22px] shrink-0 touch-none select-none flex-col items-center justify-center rounded-none border-0 border-r border-white/[0.08] bg-bg-secondary/70 p-0 text-neutral-400 hover:bg-bg-secondary/85',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50',
              )}
              onPointerDown={(e) => {
                if (busy) return
                dragControls.start(e)
              }}
            >
              <GripVertical className="size-3.5 opacity-75" aria-hidden />
            </button>
            <div
              className={cn(
                'min-w-0 flex-1 transition-opacity duration-150',
                busy && 'pointer-events-none cursor-wait opacity-55',
                dragOutVisual && !busy && 'opacity-[0.18]',
              )}
              onPointerDown={onPointerDown}
              onDoubleClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!busy) onOpenDesktop(entry)
              }}
              onContextMenu={(e) => {
                onCtx(e, entry)
              }}
              role="group"
              aria-label={`手牌：${basis}`}
              tabIndex={-1}
            >
              <div className="w-full min-w-0 px-0.5 py-1">
                <HandEntryCardPackFace
                  basis={basis}
                  n={n}
                  spectrum={spectrum}
                  isSingles={isSingles}
                  className={cn(
                    !busy && packButtonIdle,
                    'cursor-grab active:cursor-grabbing',
                  )}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}

export const HandPile = forwardRef<HTMLDivElement, HandPileProps>(
  function HandPile(
    {
      entries,
      scopeTotals,
      busy,
      onOpenDesktop,
      onRemove,
      onPin,
      onDiscardToPile,
      onPreview,
      onDropBlackScope,
      celebrateBlackScopeDropRef,
      pointerDropHighlight = false,
    },
    ref,
  ) {
    const [ctx, setCtx] = useState<{
      x: number
      y: number
      entry: HandEntry
    } | null>(null)
    const [panelOpen, setPanelOpen] = useState(false)
    const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)
    const [dropInGhost, setDropInGhost] = useState<{
      key: number
      x: number
      y: number
      scope: BlackScope
    } | null>(null)
    const dropInKeyRef = useRef(0)
    const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const clearLeaveTimer = useCallback(() => {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current)
        leaveTimerRef.current = null
      }
    }, [])

    const schedulePanelClose = useCallback(() => {
      clearLeaveTimer()
      leaveTimerRef.current = setTimeout(() => {
        leaveTimerRef.current = null
        if (ctx) return
        if (pointerDropHighlight) return
        setPanelOpen(false)
      }, PEEK_LEAVE_MS)
    }, [clearLeaveTimer, ctx, pointerDropHighlight])

    const openPanel = useCallback(() => {
      clearLeaveTimer()
      setPanelOpen(true)
    }, [clearLeaveTimer])

    useEffect(
      () => () => {
        clearLeaveTimer()
      },
      [clearLeaveTimer],
    )

    const closeCtx = useCallback(() => setCtx(null), [])

    const celebrateAtClient = useCallback(
      (scope: BlackScope, clientX: number, clientY: number) => {
        dropInKeyRef.current += 1
        setDropInGhost({
          key: dropInKeyRef.current,
          x: clientX,
          y: clientY,
          scope,
        })
      },
      [],
    )

    useLayoutEffect(() => {
      const celebrateRef = celebrateBlackScopeDropRef
      if (!celebrateRef) return
      celebrateRef.current = celebrateAtClient
      return () => {
        celebrateRef.current = null
      }
    }, [celebrateBlackScopeDropRef, celebrateAtClient])

    const onCtx = useCallback(
      (e: React.MouseEvent, entry: HandEntry) => {
        e.preventDefault()
        openPanel()
        setCtx({ x: e.clientX, y: e.clientY, entry })
      },
      [openPanel],
    )

    const dropInGhostPortal =
      dropInGhost &&
      typeof document !== 'undefined' &&
      createPortal(
        <HandPackGhostAtPoint
          key={dropInGhost.key}
          x={dropInGhost.x}
          y={dropInGhost.y}
          onPopComplete={() => setDropInGhost(null)}
        >
          <HandEntryCardPackFace
            {...handPackFacePropsFromScope(dropInGhost.scope, scopeTotals)}
            className="ring-2 ring-accent/40"
          />
        </HandPackGhostAtPoint>,
        document.body,
      )

    return (
      <>
        {dropInGhostPortal}
        <div
          ref={ref}
          onMouseEnter={openPanel}
          onMouseLeave={schedulePanelClose}
          className={cn(
            'relative flex shrink-0 flex-col border-t border-border bg-background/95 backdrop-blur-sm',
            pointerDropHighlight &&
              onDropBlackScope &&
              'ring-2 ring-inset ring-accent/55 bg-accent/[0.06]',
          )}
        >
          <motion.div
            initial={false}
            animate={{
              height: panelOpen ? 'auto' : 0,
              opacity: panelOpen ? 1 : 0,
            }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            className={cn(
              'min-h-0',
              panelOpen
                ? 'overflow-x-visible overflow-y-visible'
                : 'overflow-hidden',
            )}
          >
            <div className="max-h-[min(58vh,680px)] min-h-0 overflow-y-auto overflow-x-visible thin-scroll pl-5 pr-3 pb-8 pt-8">
              {entries.length === 0 ? (
                <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 border border-dashed border-border px-3 py-2 text-center text-sm text-text-muted">
                  <span>
                    {onDropBlackScope
                      ? '指针按住黑卡微移提起卡面，拖入下方手牌区松手加入'
                      : '长按卡池黑卡拖入手牌区加入'}
                  </span>
                  <span className="text-sm text-text-muted/90">
                    卡面为卡池同款卡包造型（仅分类依据文案）；左侧竖条向左拖展开操作；拖入与拖出共用同一套全屏浮层弹簧动画
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-4 pb-1">
                  <AnimatePresence initial={false} mode="popLayout">
                    {entries.map((entry) => (
                      <HandSwipeRow
                        key={entry.id}
                        entry={entry}
                        busy={busy}
                        handZoneRef={ref as RefObject<HTMLElement | null>}
                        openSwipeId={openSwipeId}
                        setOpenSwipeId={setOpenSwipeId}
                        scopeTotals={scopeTotals}
                        onOpenDesktop={onOpenDesktop}
                        onRemove={onRemove}
                        onPin={onPin}
                        onDiscardToPile={onDiscardToPile}
                        onCtx={onCtx}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>

          <button
            type="button"
            className={cn(
              'flex w-full items-center justify-between gap-2 border-t border-border/60 px-3 py-2.5 text-left transition-colors',
              'hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40',
            )}
            onClick={() => setPanelOpen((o) => !o)}
            onMouseEnter={openPanel}
            aria-expanded={panelOpen}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-text-muted">
              <span>
                手牌 <span className="tabular-nums">({entries.length})</span>
              </span>
              {onDropBlackScope ? (
                <span className="hidden font-normal text-sm text-text-muted/80 sm:inline">
                  悬停展开 · 左侧条侧滑 · 拖入/拖出共用指针卡面浮层
                </span>
              ) : null}
            </span>
            <ChevronUp
              className={cn(
                'size-4 shrink-0 text-text-muted transition-transform duration-200',
                !panelOpen && 'rotate-180',
              )}
            />
          </button>

          {ctx ? (
            <>
              <div
                className="fixed inset-0 z-[var(--z-overlay)]"
                onClick={closeCtx}
              />
              <div
                className="fixed z-[var(--z-modal)] min-w-[160px] rounded-lg border border-border bg-bg-secondary p-1 text-foreground shadow-xl ring-1 ring-black/20 backdrop-blur-none"
                style={{ left: ctx.x, top: ctx.y }}
              >
                <button
                  type="button"
                  className="flex w-full rounded px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary"
                  onClick={() => {
                    onRemove(ctx.entry.id)
                    closeCtx()
                  }}
                >
                  从手牌移除
                </button>
                <button
                  type="button"
                  className="flex w-full rounded px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary"
                  onClick={() => {
                    onPin(ctx.entry.id)
                    closeCtx()
                  }}
                >
                  置顶（首位）
                </button>
                <button
                  type="button"
                  className="flex w-full rounded px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary"
                  onClick={() => {
                    onPreview(ctx.entry)
                    closeCtx()
                  }}
                >
                  查看详情
                </button>
                <button
                  type="button"
                  className="flex w-full rounded px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary"
                  onClick={() => {
                    onDiscardToPile(ctx.entry.id)
                    closeCtx()
                  }}
                >
                  弃牌区
                </button>
              </div>
            </>
          ) : null}
        </div>
      </>
    )
  },
)
