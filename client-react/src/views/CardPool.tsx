import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Layers } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { toast } from '@/components/ui/confirm-dialog'
import { ComboboxDemo } from '@/components/ui/filters-demo'
import { useTableState } from '@/components/card-pool/useTableState'
import { CardPoolFooter } from '@/components/card-pool/CardPoolFooter'
import { TableBreadcrumb } from '@/components/card-pool/TableBreadcrumb'
import { DemandDiscoveryList } from '@/components/demand/DemandDiscoveryList'
import {
  nextBlackScopes,
  scopeKey,
  scopeTitle,
} from '@/components/card-pool/scope'
import type { BlackScope, HandEntry } from '@/components/card-pool/types'
import {
  fetchFirstDemandId,
  fetchPackContents,
  fetchTotalForScope,
  scopeToApiParams,
} from '@/components/card-pool/search-params'
import type { PackCardData } from '@/components/card-pool/search-params'
import { cn } from '@/lib/utils'
import {
  RootSummaryBlackCard,
  ChildBlackCardGrid,
  AnimatedScopeCount,
} from '@/components/card-pool/browse-black-cards'
import { PackOpeningAnimation } from '@/components/card-pool/PackOpeningAnimation'
import {
  dragSurfaceSelectNoneClass,
  preventCopyOnDragSurface,
} from '@/components/card-pool/drag-surface'
import {
  loadSharedCardPoolFocus,
  saveSharedCardPoolFocus,
} from '@/components/card-pool/tablePersistence'
import {
  useDesktopGridRows,
  useUniqueHandScopes,
  useHandTotals,
  useChildTotals,
} from '@/components/card-pool/useCardPoolShared'

const PAGE = 24

export default function CardPool() {
  const navigate = useNavigate()
  const sharedInitialFocus = useMemo(() => loadSharedCardPoolFocus(), [])

  const table = useTableState(sharedInitialFocus)
  const { clearHand, addDemandToSingles } = table
  const {
    focus,
    hand,
    discard,
    history,
    forward,
    mode,
    children,
    parent,
    addToHand,
    removeHandEntry,
    pinToFront,
    discardHandEntryById,
    restoreCard,
    addDemandToHand,
    expandNode,
    goParent,
    goToScope,
    undo,
    redo,
    recurseFromDesktop,
  } = table

  const rangeLabel = '同城 5 km'
  const [scopeTotal, setScopeTotal] = useState<number | null>(null)
  const [openingCarousel, setOpeningCarousel] = useState(false)
  const [packOpeningCards, setPackOpeningCards] = useState<
    PackCardData[] | null
  >(null)
  const [desktopOpen, setDesktopOpen] = useState<{
    apiParams: Record<string, string>
    blackScope: BlackScope
  } | null>(null)
  const [desktopListNonce, setDesktopListNonce] = useState(0)
  const [rootBrowseExpanded, setRootBrowseExpanded] = useState(false)
  const [childPage, setChildPage] = useState(0)

  const { desktopGridRows, setDesktopGridRows } = useDesktopGridRows()
  const uniqueHandScopes = useUniqueHandScopes(hand)
  const handTotals = useHandTotals(uniqueHandScopes)
  const childTotals = useChildTotals(children)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const handDropZoneRef = useRef<HTMLDivElement | null>(null)
  const celebrateBlackScopeDropRef = useRef<
    ((scope: BlackScope, clientX: number, clientY: number) => void) | null
  >(null)
  const [pointerHandDropHover, setPointerHandDropHover] = useState(false)
  const focusPathKeyRef = useRef<string>('')

  useEffect(() => {
    saveSharedCardPoolFocus(focus)
  }, [focus])

  const isRootOnly =
    focus.path.length === 1 &&
    focus.path[0] === 'root' &&
    focus.leafFilter === null

  const handScopeKeys = useMemo(
    () => new Set(hand.map((h) => scopeKey(h.scope))),
    [hand],
  )

  const childrenNotInHand = useMemo(
    () => children.filter((s) => !handScopeKeys.has(scopeKey(s))),
    [children, handScopeKeys],
  )

  const rootScopeInHand = handScopeKeys.has(scopeKey(focus))

  useEffect(() => {
    const key = scopeKey(focus)
    if (focusPathKeyRef.current === key) return
    focusPathKeyRef.current = key
    setDesktopOpen(null)
    setChildPage(0)
  }, [focus])

  useEffect(() => {
    if (isRootOnly) setRootBrowseExpanded(false)
  }, [isRootOnly])

  // 非根叶子焦点：自动打开桌面（有数据时）
  useEffect(() => {
    if (mode !== 'leaf') return
    if (isRootOnly) return
    let cancelled = false
    void fetchFirstDemandId(focus).then((id) => {
      if (cancelled) return
      if (!id) {
        setDesktopOpen(null)
        return
      }
      setDesktopOpen({
        apiParams: scopeToApiParams(focus),
        blackScope: focus,
      })
      setDesktopListNonce((n) => n + 1)
    })
    return () => {
      cancelled = true
    }
  }, [mode, focus, isRootOnly])

  useEffect(() => {
    let c = false
    setScopeTotal(null)
    void fetchTotalForScope(focus).then((t) => {
      if (!c) setScopeTotal(t)
    })
    return () => {
      c = true
    }
  }, [focus])

  const browseDemandCount = useMemo(() => {
    if (scopeTotal === null) return null
    return scopeTotal
  }, [scopeTotal])

  const closeDesktop = useCallback(() => setDesktopOpen(null), [])

  const runDesktopRecurse = useCallback(() => {
    if (!desktopOpen) return
    const { blackScope } = desktopOpen
    setDesktopOpen(null)
    const added = recurseFromDesktop(blackScope)
    if (!added) toast('该范围已在手牌中', 'info')
  }, [desktopOpen, recurseFromDesktop])

  function enterDesktop(scope: BlackScope) {
    setOpeningCarousel(true)
    void fetchFirstDemandId(scope)
      .then((id) => {
        if (!id) {
          toast('当前范围内暂无需求', 'error')
          return
        }
        setDesktopOpen({
          apiParams: scopeToApiParams(scope),
          blackScope: scope,
        })
        setDesktopListNonce((n) => n + 1)
      })
      .catch((e: unknown) => {
        const err = e as {
          response?: { data?: { message?: string } }
          message?: string
        }
        toast(err.response?.data?.message || err.message || '加载失败', 'error')
      })
      .finally(() => setOpeningCarousel(false))
  }

  const pagedChildren = useMemo(() => {
    if (mode !== 'paged') return childrenNotInHand
    const totalPages = Math.max(1, Math.ceil(childrenNotInHand.length / PAGE))
    const p = Math.min(childPage, totalPages - 1)
    return childrenNotInHand.slice(p * PAGE, (p + 1) * PAGE)
  }, [childrenNotInHand, mode, childPage])

  useEffect(() => {
    if (mode !== 'paged') return
    const n = childrenNotInHand.length
    const totalPages = Math.max(1, Math.ceil(n / PAGE))
    const maxP = totalPages - 1
    if (childPage > maxP) setChildPage(maxP)
  }, [mode, childrenNotInHand.length, childPage])

  function openHandDesktop(entry: HandEntry) {
    setOpeningCarousel(true)
    void fetchPackContents(entry.scope)
      .then((cards) => {
        setOpeningCarousel(false)
        if (cards.length === 0) {
          toast('当前范围内暂无需求', 'error')
          return
        }
        setPackOpeningCards(cards)
      })
      .catch((e: unknown) => {
        setOpeningCarousel(false)
        const err = e as {
          response?: { data?: { message?: string } }
          message?: string
        }
        toast(err.response?.data?.message || err.message || '加载失败', 'error')
      })
  }

  function renderBrowse() {
    if (isRootOnly && !rootBrowseExpanded) {
      if (rootScopeInHand) {
        return (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRootBrowseExpanded(true)}
            >
              展开子分类
            </Button>
          </div>
        )
      }
      return (
        <RootSummaryBlackCard
          total={browseDemandCount}
          totalFull={scopeTotal}
          busy={openingCarousel}
          onOpen={() => setRootBrowseExpanded(true)}
          onLongPressDropInHand={(at) => {
            celebrateBlackScopeDropRef.current?.(focus, at.clientX, at.clientY)
            const added = addToHand(focus)
            if (!added) toast('该范围已在手牌中', 'info')
          }}
          handDropZoneRef={handDropZoneRef}
          handDragScope={focus}
          onPointerHandZoneHover={setPointerHandDropHover}
        />
      )
    }

    const showPager = mode === 'paged' && childrenNotInHand.length > PAGE
    const totalPages = Math.max(1, Math.ceil(childrenNotInHand.length / PAGE))

    return (
      <div className="flex flex-col gap-4">
        {showPager ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-text-muted">
              子分类 {childrenNotInHand.length} · 第 {childPage + 1}/
              {totalPages} 页
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={childPage <= 0}
                onClick={() => setChildPage((p) => Math.max(0, p - 1))}
              >
                上一页
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={childPage >= totalPages - 1}
                onClick={() =>
                  setChildPage((p) => Math.min(totalPages - 1, p + 1))
                }
              >
                下一页
              </Button>
            </div>
          </div>
        ) : null}
        <ChildBlackCardGrid
          scopes={pagedChildren}
          scopeTotals={childTotals}
          busy={openingCarousel}
          handDropZoneRef={handDropZoneRef}
          onPointerHandZoneHover={setPointerHandDropHover}
          onCardOpen={(s) => {
            if (nextBlackScopes(s).length > 0) expandNode(s)
            else void enterDesktop(s)
          }}
          onLongPressDropScopeInHand={(s, at) => {
            celebrateBlackScopeDropRef.current?.(s, at.clientX, at.clientY)
            const added = addToHand(s)
            if (!added) toast('该范围已在手牌中', 'info')
          }}
        />
      </div>
    )
  }

  function renderDesktopSection(fullHeight: boolean) {
    if (!desktopOpen) return null
    return (
      <section
        className={cn(
          'flex flex-col gap-3 rounded-xl border border-border bg-muted/5 p-3',
          fullHeight && 'min-h-0 flex-1',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-text-muted">
            桌面 ·{' '}
            <span className={cn('text-text-primary')}>
              {scopeTitle(desktopOpen.blackScope)}
            </span>
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeDesktop}
            >
              关闭桌面
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={runDesktopRecurse}
            >
              递归（回手牌）
            </Button>
          </div>
        </div>
        <div
          className={cn(
            'min-h-0 min-w-0',
            fullHeight ? 'flex flex-1 flex-col' : 'max-h-[560px] flex flex-col',
          )}
        >
          <DemandDiscoveryList
            key={desktopListNonce}
            listScope={desktopOpen.apiParams}
            keyword=""
            serviceType="ALL"
            scrollRootRef={scrollRef}
            interactionMode="cardPoolDesktop"
            layoutVariant="grid"
            desktopGridRowCount={desktopGridRows}
            onDesktopGridRowCountChange={setDesktopGridRows}
            pageSize={
              desktopOpen.blackScope.path.some((s) => s === '__singles__')
                ? 200
                : 6
            }
            paginationMode={
              desktopOpen.blackScope.path.some((s) => s === '__singles__')
                ? 'infinite'
                : 'paged'
            }
            onDemandRowRecurse={(d) => {
              const r = addDemandToHand(
                d.category,
                d.serviceType,
                d.taxonomyLeafId,
              )
              if (r === 'invalid') toast('无法映射该需求的分类到黑卡', 'error')
              else if (r === 'duplicate') toast('该分类已在手牌中', 'info')
            }}
            onLongPressDropDemandInHand={(demandId) => {
              addDemandToSingles(demandId)
              toast('已加入 ? 卡包', 'success')
            }}
            handDropZoneRef={handDropZoneRef}
            className={fullHeight ? 'min-h-0 flex-1' : undefined}
          />
        </div>
      </section>
    )
  }

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <BackButton />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Layers className="size-5 shrink-0 text-foreground" />
            <h1 className="text-lg font-bold text-text-primary">卡池</h1>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-muted">
            <span>监控：{rangeLabel}</span>
            <button
              type="button"
              className="text-sm text-text-muted transition-colors hover:text-text-primary"
              onClick={() => navigate('/card-pool/explorer')}
            >
              资源管理器
            </button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden',
          dragSurfaceSelectNoneClass,
        )}
        onCopy={preventCopyOnDragSurface}
        onCut={preventCopyOnDragSurface}
      >
        <TableBreadcrumb
          focus={focus}
          canUndo={history.length > 0}
          canRedo={forward.length > 0}
          canGoParent={Boolean(parent)}
          onUndo={undo}
          onRedo={redo}
          onGoParent={goParent}
          onJumpToPath={(path) => goToScope({ path, leafFilter: null })}
        />

        <div className="flex shrink-0 items-center gap-4 border-b border-border bg-bg-secondary/50 px-4 py-2 text-sm text-text-secondary">
          <span>
            浏览：
            <span className={cn('font-semibold', 'text-text-primary')}>
              {scopeTitle(focus)}
            </span>
            {browseDemandCount !== null ? (
              <span className="ml-1 inline-flex items-center tabular-nums">
                （
                <AnimatedScopeCount
                  value={browseDemandCount}
                  className="tabular-nums"
                />{' '}
                条）
              </span>
            ) : null}
          </span>
          <span className="text-text-muted">手牌 {hand.length}</span>
          {discard.length > 0 ? (
            <span className="text-text-muted">弃牌区 {discard.length}</span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center border-b border-border px-4 py-2">
          <ComboboxDemo disabled />
        </div>

        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto thin-scroll px-4 py-4"
        >
          {mode === 'leaf' && !isRootOnly ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-text-secondary">
                  叶子 ·{' '}
                  <span className={cn('font-semibold text-text-primary')}>
                    {scopeTitle(focus)}
                  </span>
                  {' · 共 '}
                  {scopeTotal ?? '…'} 条需求
                </span>
                {!desktopOpen && scopeTotal != null && scopeTotal > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => enterDesktop(focus)}
                  >
                    打开需求列表
                  </Button>
                ) : null}
              </div>
              {renderDesktopSection(true)}
            </div>
          ) : (
            <>
              {renderBrowse()}
              {renderDesktopSection(false)}
            </>
          )}
        </div>

        <CardPoolFooter
          ref={handDropZoneRef}
          hand={hand}
          discard={discard}
          handTotals={handTotals}
          openingCarousel={openingCarousel}
          onOpenDesktop={openHandDesktop}
          onRemove={removeHandEntry}
          onPin={pinToFront}
          onDiscard={discardHandEntryById}
          onRestore={restoreCard}
          onClearHand={clearHand}
          onDropBlackScope={(scope) => {
            const added = addToHand(scope)
            if (!added) toast('该范围已在手牌中', 'info')
          }}
          celebrateBlackScopeDropRef={celebrateBlackScopeDropRef}
          pointerDropHighlight={pointerHandDropHover}
        />
      </div>

      {/* 卡包开启动画 */}
      {packOpeningCards && (
        <PackOpeningAnimation
          cards={packOpeningCards}
          onClose={() => setPackOpeningCards(null)}
        />
      )}
    </div>
  )
}
