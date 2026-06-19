import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlackScope, HandEntry } from '@/components/card-pool/types'
import { packButtonClass } from '@/components/card-pool/browse-black-cards'
import {
  scopeCurrentClassificationBasis,
  scopeKey,
  scopeTaxonomySpectrumStyle,
} from '@/components/card-pool/scope'

const PEEK_LEAVE_MS = 420

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
    const [visibleSlots, setVisibleSlots] = useState<
      { key: string; entry: HandEntry }[]
    >(() =>
      entries
        .slice(0, Math.min(3, entries.length))
        .map((e, i) => ({ key: `${e.id}-s${i}`, entry: e })),
    )
    const nextIdxRef = useRef(Math.min(3, entries.length))
    const cycleRef = useRef(0)
    const [currentPos, setCurrentPos] = useState(1)
    const [dropInGhost, setDropInGhost] = useState<{
      key: number
      x: number
      y: number
      scope: BlackScope
    } | null>(null)
    const dropInKeyRef = useRef(0)
    const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const prevEntryLenRef = useRef(entries.length)

    const prevEntriesRef = useRef(entries)

    useEffect(() => {
      const prevLen = prevEntryLenRef.current
      const newLen = entries.length

      if (newLen < prevLen) {
        // 移除了条目：visibleSlots 已由按钮更新，只需补位
        const maxVisible = Math.min(3, newLen)
        const prevEntries = prevEntriesRef.current
        const removedIds = new Set(
          prevEntries
            .map((e) => e.id)
            .filter((id) => !entries.some((e) => e.id === id)),
        )
        setVisibleSlots((prev) => {
          const remaining = prev.filter((s) => !removedIds.has(s.entry.id))
          if (remaining.length >= maxVisible) return remaining
          const existingIds = new Set(remaining.map((s) => s.entry.id))
          cycleRef.current += 1
          const toAdd = entries
            .filter((e) => !existingIds.has(e.id))
            .slice(0, maxVisible - remaining.length)
          return [
            ...remaining,
            ...toAdd.map((e) => ({
              key: `${e.id}-f${cycleRef.current}`,
              entry: e,
            })),
          ]
        })
        nextIdxRef.current = newLen
        prevEntryLenRef.current = newLen
        prevEntriesRef.current = entries
        return
      }

      if (newLen > prevLen) {
        // 新增了条目：重置队列
        setVisibleSlots(
          entries
            .slice(0, Math.min(3, newLen))
            .map((e, i) => ({ key: `${e.id}-s${i}`, entry: e })),
        )
        nextIdxRef.current = Math.min(3, newLen)
        cycleRef.current = 0
        setCurrentPos(1)
      }

      prevEntryLenRef.current = newLen
      prevEntriesRef.current = entries
    }, [entries.length])

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
                <>
                  <div className="relative flex w-full flex-col items-center justify-center">
                    <div className="relative h-[380px] w-full overflow-hidden sm:w-[644px]">
                      <AnimatePresence initial={false}>
                        {visibleSlots.map(({ key: slotKey, entry }, index) => {
                          const positionStyles = [
                            { scale: 1, y: 12 },
                            { scale: 0.95, y: -16 },
                            { scale: 0.9, y: -44 },
                          ]
                          const { y, scale } =
                            positionStyles[index] ?? positionStyles[2]
                          const zIndex = index === 0 && busy ? 10 : 3 - index
                          const exitAnim =
                            index === 0
                              ? { y: 340, scale: 1, zIndex: 10 }
                              : undefined
                          const lastIdx = visibleSlots.length - 1
                          const initialAnim =
                            index === lastIdx && lastIdx > 0
                              ? { y: 340, scale: 0.9 }
                              : undefined
                          const basis = scopeCurrentClassificationBasis(
                            entry.scope,
                          )
                          const isSingles =
                            entry.scope.path[entry.scope.path.length - 1] ===
                            '__singles__'
                          const n = scopeTotals[scopeKey(entry.scope)]
                          const spectrum = scopeTaxonomySpectrumStyle(
                            entry.scope,
                            n,
                          )
                          const accentColor = spectrum?.color || '#a78bfa'

                          return (
                            <motion.div
                              key={slotKey}
                              initial={initialAnim}
                              animate={{ y, scale }}
                              exit={exitAnim}
                              transition={{
                                type: 'spring',
                                duration: 1,
                                bounce: 0,
                              }}
                              style={{
                                zIndex,
                                left: '50%',
                                x: '-50%',
                                bottom: 0,
                              }}
                              className="absolute flex h-[280px] w-[324px] overflow-hidden rounded-t-xl border-x border-t border-border bg-neutral-900 shadow-lg will-change-transform sm:w-[512px]"
                              onDoubleClick={(e) => {
                                if (!busy) {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  onOpenDesktop(entry)
                                }
                              }}
                              onContextMenu={(e) => {
                                onCtx(e, entry)
                              }}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setVisibleSlots((prev) =>
                                    prev.filter((s) => s.entry.id !== entry.id),
                                  )
                                  onRemove(entry.id)
                                }}
                                className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-white/60 hover:bg-red-500/60 hover:text-white transition-colors"
                                aria-label="移除此卡包"
                              >
                                <X className="size-3" />
                              </button>
                              <div className="flex h-full w-full flex-col">
                                {/* 色条 + 标题 */}
                                <div
                                  className="flex shrink-0 items-center px-3 py-2.5"
                                  style={{
                                    background: `linear-gradient(135deg, ${accentColor}ee, ${accentColor}30)`,
                                  }}
                                >
                                  <span className="text-sm font-bold text-white truncate drop-shadow-sm">
                                    {basis}
                                  </span>
                                </div>
                                {/* 数量 */}
                                <div className="flex flex-1 items-center justify-center">
                                  {isSingles ? (
                                    <span className="select-none text-6xl font-black text-white/20">
                                      ?
                                    </span>
                                  ) : (
                                    <span className="select-none text-5xl font-black text-white/60 tabular-nums">
                                      {n == null ? '…' : n}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </AnimatePresence>
                    </div>
                    {entries.length >= 2 && (
                      <div className="relative z-10 flex w-full items-center justify-center border-t border-border py-4 sm:w-[644px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            cycleRef.current += 1
                            const idx = nextIdxRef.current % entries.length
                            setVisibleSlots((prev) => [
                              ...prev.slice(1),
                              {
                                key: `${entries[idx].id}-c${cycleRef.current}`,
                                entry: entries[idx],
                              },
                            ])
                            nextIdxRef.current = idx + 1
                            setCurrentPos(
                              ((idx - 1 + entries.length) % entries.length) + 1,
                            )
                          }}
                          className="pointer-events-auto flex h-9 cursor-pointer select-none items-center justify-center gap-1 overflow-hidden rounded-lg border border-border bg-background px-3 font-medium text-secondary-foreground transition-all hover:bg-secondary/80 active:scale-[0.98]"
                        >
                          切换
                          <span className="text-muted-foreground/60">
                            ({currentPos} / {entries.length})
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
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
