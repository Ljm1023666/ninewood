import { useMemo, useState } from 'react'
import { CheckCircle2, Clock, Search, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  SESSION_GROUP_LABELS,
  SESSION_GROUP_ORDER,
  listDemandSessions,
  sessionDateGroup,
  type DemandSessionSnapshot,
  type SessionDateGroup,
} from '@/utils/demand-session-history'

interface DemandSessionHistoryProps {
  activeId: string | null
  sessionsTick: number
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

function groupSessions(
  sessions: DemandSessionSnapshot[],
  query: string,
): Partial<Record<SessionDateGroup, DemandSessionSnapshot[]>> {
  const q = query.trim().toLowerCase()
  const filtered = q
    ? sessions.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.fields.title.toLowerCase().includes(q) ||
          s.messages.some((m) => m.content.toLowerCase().includes(q)),
      )
    : sessions

  const groups: Partial<Record<SessionDateGroup, DemandSessionSnapshot[]>> = {}
  for (const session of filtered) {
    const g = sessionDateGroup(session.updatedAt)
    if (!groups[g]) groups[g] = []
    groups[g]!.push(session)
  }
  return groups
}

function formatRelativeTime(updatedAt: number): string {
  const diff = Date.now() - updatedAt
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  const d = new Date(updatedAt)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function DemandSessionHistory({
  activeId,
  sessionsTick,
  onSelect,
  onDelete,
}: DemandSessionHistoryProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const sessions = useMemo(() => {
    void sessionsTick
    return listDemandSessions()
  }, [sessionsTick, open])

  const grouped = useMemo(
    () => groupSessions(sessions, query),
    [sessions, query],
  )

  const hasResults = SESSION_GROUP_ORDER.some((g) => grouped[g]?.length)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="ws-btn ws-btn--icon"
          aria-label="历史会话"
          title="历史会话"
        >
          <Clock className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="ws-history-popover z-[200] w-[min(360px,calc(100vw-32px))] border-0 bg-transparent p-0 text-inherit shadow-none"
      >
        <div className="ws-history-panel">
          <div className="ws-history-search-wrap">
            <Search className="ws-history-search-icon size-3.5" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索历史会话…"
              className="ws-history-search"
            />
          </div>

          <div className="ws-history-list thin-scroll">
            {!hasResults ? (
              <p className="ws-history-empty">暂无历史会话</p>
            ) : (
              SESSION_GROUP_ORDER.map((group) => {
                const items = grouped[group]
                if (!items?.length) return null
                return (
                  <section key={group} className="ws-history-group">
                    <h3 className="ws-history-group-label">
                      {SESSION_GROUP_LABELS[group]}
                    </h3>
                    <ul className="ws-history-items">
                      {items.map((session) => {
                        const isActive = session.id === activeId
                        return (
                          <li key={session.id}>
                            <div
                              className={cn(
                                'ws-history-item',
                                isActive && 'ws-history-item--active',
                              )}
                            >
                              <button
                                type="button"
                                className="ws-history-item-main"
                                onClick={() => {
                                  onSelect(session.id)
                                  setOpen(false)
                                }}
                              >
                                <CheckCircle2
                                  className={cn(
                                    'ws-history-item-icon size-4 shrink-0',
                                    isActive && 'ws-history-item-icon--active',
                                  )}
                                />
                                <span className="ws-history-item-title">
                                  {session.title}
                                </span>
                                <span className="ws-history-item-time">
                                  {formatRelativeTime(session.updatedAt)}
                                </span>
                              </button>
                              <button
                                type="button"
                                className="ws-history-item-delete"
                                aria-label="删除会话"
                                title="删除"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (
                                    !window.confirm(
                                      `确定删除「${session.title}」？`,
                                    )
                                  ) {
                                    return
                                  }
                                  onDelete(session.id)
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
