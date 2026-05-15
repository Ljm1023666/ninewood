import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Folder,
  FileType2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { TAXONOMY } from '@/components/card-pool/taxonomy'
import type { BlackScope, HandEntry } from '@/components/card-pool/types'
import {
  nextBlackScopes,
  scopeKey,
  scopeTitle,
} from '@/components/card-pool/scope'
import { DemandDiscoveryList } from '@/components/demand/DemandDiscoveryList'
import {
  fetchFirstDemandId,
  fetchTotalForScope,
  scopeToApiParams,
} from '@/components/card-pool/search-params'
import { HandPile } from '@/components/card-pool/HandPile'
import { TableDiscard } from '@/components/card-pool/TableDiscard'
import { usePersistedGlobalHand } from '@/components/card-pool/usePersistedGlobalHand'
import { categoryToLeafBlackScope } from '@/components/card-pool/category-to-scope'
import {
  dragSurfaceSelectNoneClass,
  preventCopyOnDragSurface,
} from '@/components/card-pool/drag-surface'
import {
  loadSharedCardPoolFocus,
  saveSharedCardPoolFocus,
} from '@/components/card-pool/tablePersistence'

/** 从某一节点 id 沿 parent 链回溯到 root，得到 root→该节点的 path */
function pathIdsFromRootTo(nodeId: string): string[] | null {
  const rev: string[] = []
  let cur: string | null = nodeId
  while (cur) {
    rev.push(cur)
    cur = TAXONOMY[cur]?.parent ?? null
  }
  if (rev[rev.length - 1] !== 'root') return null
  return rev.reverse()
}

const DESKTOP_GRID_ROWS_LS = 'ninewood.cardPool.desktopGridRows'

function readDesktopGridRows(): number {
  try {
    const raw = localStorage.getItem(DESKTOP_GRID_ROWS_LS)
    const n = raw === null ? 2 : parseInt(raw, 10)
    if (!Number.isFinite(n)) return 2
    return Math.min(5, Math.max(1, n))
  } catch {
    return 2
  }
}

const TREE_INDENT = [
  'pl-0',
  'pl-2',
  'pl-4',
  'pl-6',
  'pl-8',
  'pl-10',
  'pl-12',
  'pl-14',
  'pl-16',
  'pl-[4.25rem]',
  'pl-[5rem]',
] as const

function TaxonomyTreePanel({
  focusPath,
  expanded,
  onToggleExpand,
  onSelectNodeId,
}: {
  focusPath: string[]
  expanded: ReadonlySet<string>
  onToggleExpand: (id: string) => void
  onSelectNodeId: (id: string) => void
}) {
  function Row({ id, depth }: { id: string; depth: number }) {
    const meta = TAXONOMY[id]
    if (!meta) return null
    const kids = meta.childIds
    const open = id === 'root' ? true : expanded.has(id)
    const selected = focusPath[focusPath.length - 1] === id
    const pl =
      TREE_INDENT[Math.min(depth, TREE_INDENT.length - 1)] ?? 'pl-[5rem]'
    return (
      <div>
        <div
          className={cn(
            'flex items-center gap-0.5 rounded py-0.5',
            pl,
            selected && 'bg-accent/15',
          )}
        >
          {kids.length > 0 ? (
            <button
              type="button"
              className="shrink-0 rounded p-1 text-text-muted hover:bg-accent/10"
              aria-label={
                id === 'root' ? '一级「全部」始终展开' : '双击展开或收起子菜单'
              }
              title={
                id === 'root'
                  ? '一级「全部」始终展开'
                  : '双击：展开或收起子菜单（单击不会切换）'
              }
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (id === 'root') return
                const wasOpen = open
                onToggleExpand(id)
                if (!wasOpen) onSelectNodeId(id)
              }}
            >
              {open ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </button>
          ) : (
            <span className="w-5 shrink-0" aria-hidden />
          )}
          <button
            type="button"
            className={cn(
              'min-w-0 flex-1 truncate px-1 py-1 text-left text-sm hover:bg-accent/10',
              'text-text-primary',
            )}
            title={
              kids.length > 0 && id !== 'root'
                ? '单击：选中当前分类；双击：展开或收起子菜单（与左侧箭头一致）'
                : '单击选中'
            }
            onClick={() => onSelectNodeId(id)}
            onDoubleClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (id === 'root' || kids.length === 0) return
              const wasOpen = open
              onToggleExpand(id)
              if (!wasOpen) onSelectNodeId(id)
            }}
          >
            {meta.label}
          </button>
        </div>
        {open &&
          kids.map((cid) => <Row key={cid} id={cid} depth={depth + 1} />)}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      <Row id="root" depth={0} />
    </div>
  )
}

/** 右侧：Windows 资源管理器「详细信息」式列表（无卡包大图） */
function ExplorerDetailsScopeRow({
  s,
  childTotals,
  selectedKey,
  rowKey,
  onSelectKey,
  onNavigateInto,
  onOpenCtxMenu,
}: {
  s: BlackScope
  childTotals: Record<string, number>
  selectedKey: string | null
  rowKey: string
  onSelectKey: (k: string) => void
  onNavigateInto: (s: BlackScope) => void
  onOpenCtxMenu: (e: React.MouseEvent, s: BlackScope) => void
}) {
  const hasKids = nextBlackScopes(s).length > 0
  const n = childTotals[rowKey]
  const isSel = selectedKey === rowKey

  return (
    <>
      <tr
        title="单击选择；双击打开"
        className={cn(
          'cursor-default border-b border-border/60 transition-colors',
          isSel ? 'bg-accent/20' : 'hover:bg-muted/35',
        )}
        onClick={() => onSelectKey(rowKey)}
        onDoubleClick={(e) => {
          e.preventDefault()
          onNavigateInto(s)
        }}
        onContextMenu={(e) => onOpenCtxMenu(e, s)}
      >
        <td className="px-3 py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            {hasKids ? (
              <Folder
                className="size-4 shrink-0 text-amber-600/90 dark:text-amber-400/90"
                aria-hidden
              />
            ) : (
              <FileType2
                className="size-4 shrink-0 text-text-muted"
                aria-hidden
              />
            )}
            <span
              className={cn(
                'min-w-0 truncate font-medium',
                'text-text-primary',
              )}
            >
              {scopeTitle(s)}
            </span>
          </div>
        </td>
        <td className="px-2 py-1.5 text-xs text-text-muted">
          {hasKids ? '文件夹' : '分类范围'}
        </td>
        <td className="px-3 py-1.5 text-right font-mono text-xs tabular-nums text-text-secondary">
          {n === undefined ? '…' : n}
        </td>
      </tr>
    </>
  )
}

function ExplorerDetailsShell({
  focus,
  childScopes,
  childTotals,
  onNavigateInto,
  onAddToHand,
  onJumpToPath,
}: {
  focus: BlackScope
  childScopes: BlackScope[]
  childTotals: Record<string, number>
  onNavigateInto: (s: BlackScope) => void
  onAddToHand: (s: BlackScope) => void
  onJumpToPath: (path: string[]) => void
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [ctx, setCtx] = useState<{
    x: number
    y: number
    scope: BlackScope
  } | null>(null)
  const focusPathKey = focus.path.join('/')

  useEffect(() => {
    setSelectedKey(null)
    setCtx(null)
  }, [focusPathKey])

  const closeCtx = useCallback(() => setCtx(null), [])

  const pathSegments = focus.path.map((id) => TAXONOMY[id]?.label ?? id)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0 border border-border bg-card">
      <div
        className="flex shrink-0 flex-wrap items-center gap-x-1 gap-y-0.5 border-b border-border bg-muted/15 px-2 py-1.5 font-mono text-[11px] text-text-primary"
        title="当前路径"
        role="navigation"
        aria-label="地址栏"
      >
        {pathSegments.map((label, i) => (
          <span
            key={`${i}-${label}`}
            className="flex min-w-0 max-w-full items-center gap-1"
          >
            {i > 0 ? <span className="shrink-0 text-text-muted">›</span> : null}
            {i < pathSegments.length - 1 ? (
              <button
                type="button"
                className="min-w-0 truncate rounded px-1 py-0.5 hover:bg-accent/10"
                onClick={() => onJumpToPath(focus.path.slice(0, i + 1))}
                title={`跳转到 ${label}`}
              >
                {label}
              </button>
            ) : (
              <span className="min-w-0 truncate font-semibold text-text-primary">
                {label}
              </span>
            )}
          </span>
        ))}
      </div>

      <div className="thin-scroll min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-[1] border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            <tr>
              <th className="w-[min(52%,520px)] px-3 py-2">名称</th>
              <th className="w-36 px-2 py-2">类型</th>
              <th className="w-28 px-3 py-2 text-right tabular-nums">需求数</th>
            </tr>
          </thead>
          <tbody>
            {childScopes.map((s) => {
              const k = scopeKey(s)
              return (
                <ExplorerDetailsScopeRow
                  key={k}
                  s={s}
                  rowKey={k}
                  childTotals={childTotals}
                  selectedKey={selectedKey}
                  onSelectKey={setSelectedKey}
                  onNavigateInto={onNavigateInto}
                  onOpenCtxMenu={(e, scope) => {
                    e.preventDefault()
                    setSelectedKey(scopeKey(scope))
                    setCtx({ x: e.clientX, y: e.clientY, scope })
                  }}
                />
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-3 border-t border-border bg-muted/20 px-3 py-1 text-[11px] text-text-muted">
        <span>
          {childScopes.length} 个项目
          {selectedKey ? <span className="ml-2">已选择 1 个项目</span> : null}
        </span>
        <span className="hidden sm:inline">单击选择 · 双击打开 · 右键更多</span>
      </div>

      {ctx ? (
        <>
          <div
            className="fixed inset-0 z-[340]"
            onClick={closeCtx}
            aria-hidden
          />
          <div className="fixed left-1/2 top-1/2 z-[341] min-w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-bg-secondary py-1 text-sm text-foreground shadow-lg ring-1 ring-black/20 backdrop-blur-none">
            <button
              type="button"
              className="flex w-full px-3 py-2 text-left hover:bg-bg-tertiary"
              onClick={() => {
                onNavigateInto(ctx.scope)
                closeCtx()
              }}
            >
              打开
            </button>
            <button
              type="button"
              className="flex w-full px-3 py-2 text-left hover:bg-bg-tertiary"
              onClick={() => {
                onAddToHand(ctx.scope)
                closeCtx()
              }}
            >
              加入手牌
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

/** 浏览树与卡池牌桌的焦点分离；手牌与弃牌与主卡池共用 IndexedDB 持久化 */
export default function CardPoolResourceExplorer() {
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const handDropZoneRef = useRef<HTMLDivElement>(null)
  const {
    hand,
    discard,
    addToHand,
    removeHandEntry,
    pinToFront,
    discardHandEntryById,
    restoreCard,
  } = usePersistedGlobalHand()

  const [focus, setFocus] = useState<BlackScope>(
    () => loadSharedCardPoolFocus() ?? { path: ['root'], leafFilter: null },
  )
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['root']))
  const expandedRef = useRef(expanded)
  expandedRef.current = expanded
  const [childTotals, setChildTotals] = useState<Record<string, number>>({})
  const [leafDesktop, setLeafDesktop] = useState<Record<string, string> | null>(
    null,
  )
  const [openingCarousel, setOpeningCarousel] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState<{
    apiParams: Record<string, string>
    blackScope: BlackScope
  } | null>(null)
  const [desktopListNonce, setDesktopListNonce] = useState(0)
  const [desktopGridRows, setDesktopGridRows] = useState(readDesktopGridRows)
  const [handTotals, setHandTotals] = useState<Record<string, number>>({})

  const children = useMemo(() => nextBlackScopes(focus), [focus])
  const isLeaf = children.length === 0
  const focusPathKey = focus.path.join('/')

  useEffect(() => {
    saveSharedCardPoolFocus(focus)
  }, [focus])

  useEffect(() => {
    try {
      localStorage.setItem(DESKTOP_GRID_ROWS_LS, String(desktopGridRows))
    } catch {
      /* ignore */
    }
  }, [desktopGridRows])

  useEffect(() => {
    setDesktopOpen(null)
  }, [focusPathKey])

  /** 仅展开当前路径上的祖先，不把末段节点自动展开，子菜单由双击打开 */
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev)
      for (let i = 1; i < focus.path.length - 1; i++) {
        next.add(focus.path[i]!)
      }
      return next
    })
  }, [focusPathKey])

  useEffect(() => {
    if (isLeaf) {
      setLeafDesktop(scopeToApiParams(focus))
      return
    }
    setLeafDesktop(null)
    if (children.length === 0) return
    let c = false
    void Promise.all(
      children.map(async (s) => {
        const k = scopeKey(s)
        try {
          const n = await fetchTotalForScope(s)
          return [k, n] as const
        } catch {
          return [k, 0] as const
        }
      }),
    ).then((pairs) => {
      if (c) return
      const next: Record<string, number> = {}
      for (const [k, v] of pairs) next[k] = v
      setChildTotals(next)
    })
    return () => {
      c = true
    }
  }, [focus, children, isLeaf])

  const uniqueHandScopes = useMemo(() => {
    const m = new Map<string, BlackScope>()
    for (const h of hand) {
      const k = scopeKey(h.scope)
      if (!m.has(k)) m.set(k, h.scope)
    }
    return [...m.values()]
  }, [hand])

  useEffect(() => {
    if (uniqueHandScopes.length === 0) {
      setHandTotals({})
      return
    }
    let c = false
    void Promise.all(
      uniqueHandScopes.map(async (s) => {
        const k = scopeKey(s)
        try {
          const n = await fetchTotalForScope(s)
          return [k, n] as const
        } catch {
          return [k, 0] as const
        }
      }),
    ).then((pairs) => {
      if (c) return
      setHandTotals((prev) => {
        const next = { ...prev }
        for (const [k, v] of pairs) next[k] = v
        return next
      })
    })
    return () => {
      c = true
    }
  }, [uniqueHandScopes])

  const closeDesktop = useCallback(() => setDesktopOpen(null), [])

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

  function openHandDesktop(entry: HandEntry) {
    void enterDesktop(entry.scope)
  }

  function previewHand(entry: HandEntry) {
    void fetchTotalForScope(entry.scope).then((n) => {
      toast(`「${scopeTitle(entry.scope)}」约 ${n} 条需求`, 'success')
    })
  }

  const pickChild = useCallback((s: BlackScope) => {
    setFocus(s)
  }, [])

  const onToggleExpand = useCallback((id: string) => {
    if (id === 'root') return
    const wasOpen = expandedRef.current.has(id)
    setExpanded((prev) => {
      const next = new Set(prev)
      if (wasOpen) next.delete(id)
      else next.add(id)
      return next
    })
    if (wasOpen) {
      setFocus((f) => {
        const idx = f.path.indexOf(id)
        if (idx < 0) return f
        /** 收起后焦点离开该节点及其子孙，避免 focusPathKey effect 立刻再次展开 */
        if (f.path.length > idx) {
          const nextPath = f.path.slice(0, Math.max(1, idx))
          return { path: nextPath, leafFilter: null }
        }
        return f
      })
    }
  }, [])

  const onSelectNodeId = useCallback((id: string) => {
    const path = pathIdsFromRootTo(id)
    if (!path) return
    setFocus({ path, leafFilter: null })
  }, [])

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="返回卡池"
          onClick={() => navigate('/card-pool')}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-text-primary">资源管理器</h1>
          <p className="text-[11px] text-text-muted">
            分类浏览独立；手牌与弃牌与主卡池共用持久化
          </p>
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
        <div className="flex min-h-0 flex-1 divide-x divide-border overflow-hidden">
          <nav className="thin-scroll w-64 shrink-0 overflow-y-auto border-r border-border bg-muted/15 p-2">
            <p className="mb-1.5 px-1 text-[11px] font-semibold text-text-muted">
              文件夹
            </p>
            <p className="mb-2 px-1 text-[10px] leading-snug text-text-muted">
              单击选择；双击名称或箭头展开/折叠。
            </p>
            <TaxonomyTreePanel
              focusPath={focus.path}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onSelectNodeId={onSelectNodeId}
            />
          </nav>

          <div
            ref={scrollRef}
            className="thin-scroll flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3"
          >
            {desktopOpen ? (
              <section className="flex min-h-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-muted/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-text-muted">
                    桌面 ·{' '}
                    <span className={cn('text-text-primary')}>
                      {scopeTitle(desktopOpen.blackScope)}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={closeDesktop}
                  >
                    关闭桌面
                  </Button>
                </div>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
                    onDemandRowRecurse={(d) => {
                      const scope = categoryToLeafBlackScope(
                        d.category,
                        d.serviceType,
                        d.taxonomyLeafId,
                      )
                      if (!scope) toast('无法映射该需求的分类到黑卡', 'error')
                      else {
                        const ok = addToHand(scope)
                        if (!ok) toast('该分类已在手牌中', 'info')
                      }
                    }}
                    className="min-h-0 flex-1 flex-col"
                  />
                </div>
              </section>
            ) : isLeaf && leafDesktop ? (
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <div
                  className="shrink-0 rounded border border-border bg-muted/15 px-2 py-1.5 font-mono text-[11px] text-text-muted"
                  title="当前路径"
                >
                  {focus.path
                    .map((id) => TAXONOMY[id]?.label ?? id)
                    .join(' › ')}
                </div>
                <DemandDiscoveryList
                  listScope={leafDesktop}
                  keyword=""
                  serviceType="ALL"
                  scrollRootRef={scrollRef}
                />
              </div>
            ) : (
              <ExplorerDetailsShell
                focus={focus}
                childScopes={children}
                childTotals={childTotals}
                onNavigateInto={pickChild}
                onAddToHand={(s) => {
                  const ok = addToHand(s)
                  if (!ok) toast('该范围已在手牌中', 'info')
                }}
                onJumpToPath={(path) => setFocus({ path, leafFilter: null })}
              />
            )}
          </div>
        </div>

        <HandPile
          ref={handDropZoneRef}
          entries={hand}
          scopeTotals={handTotals}
          busy={openingCarousel}
          onOpenDesktop={openHandDesktop}
          onRemove={removeHandEntry}
          onPin={pinToFront}
          onDiscardToPile={discardHandEntryById}
          onPreview={previewHand}
        />

        <TableDiscard
          discard={discard}
          onRestore={(c) => {
            const ok = restoreCard(c)
            if (!ok) toast('该范围已在手牌中', 'info')
          }}
        />
      </div>
    </div>
  )
}
