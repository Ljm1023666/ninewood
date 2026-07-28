import {
  Suspense,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import '@/styles/messages-chat.css'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { SUBPAGE_NAV } from '@/utils/subpage-nav'
import { messageApi } from '@/api/message'
import { useChatStore } from '@/stores/chat'
import type { TemplateContact } from '@/components/ui/chat-template'
import { MessagesConversationSidebar } from '@/views/MessagesConversationSidebar'

function mergeContacts(
  prev: TemplateContact[],
  next: TemplateContact[],
): TemplateContact[] {
  if (prev.length === 0) return next
  const prevById = new Map(prev.map((row) => [row.id ?? row.name, row]))
  let changed = prev.length !== next.length

  const merged = next.map((row, index) => {
    const key = row.id ?? row.name
    const old = prevById.get(key)
    if (!old) {
      changed = true
      return row
    }
    if (
      old.name === row.name &&
      old.message === row.message &&
      old.image === row.image &&
      old.unreadCount === row.unreadCount &&
      old.lastMessageAt === row.lastMessageAt &&
      old.type === row.type
    ) {
      if (prev[index]?.id !== old.id) changed = true
      return old
    }
    changed = true
    // 头像 URL 未变时沿用旧字符串引用，降低子树比较抖动
    return old.image === row.image ? { ...row, image: old.image } : row
  })

  return changed ? merged : prev
}

export default function MessagesLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const [rows, setRows] = useState<TemplateContact[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [unreadById, setUnreadById] = useState<Record<string, number>>({})

  const threadUserId = useMemo(() => {
    if (!location.pathname.startsWith('/messages/')) return null
    const rest = location.pathname.slice('/messages/'.length)
    const seg = rest.split('/')[0] || null
    if (seg === 'merge') {
      const mergeId = rest.split('/')[1] || null
      return mergeId ? `merge:${mergeId}` : null
    }
    return seg
  }, [location.pathname])

  useEffect(() => {
    setSelectedId(threadUserId)
  }, [threadUserId])

  const fetchConversations = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    try {
      const [convRes, mergeRes] = await Promise.all([
        messageApi.conversations(),
        messageApi.getMerges().catch(() => ({ data: { data: [] } })),
      ])
      const list = (convRes.data.data ?? []) as {
        user: { id: string; nickname: string; avatarUrl?: string | null }
        lastMessage?: { content?: string; createdAt?: string }
        unreadCount?: number
      }[]
      const merges = (mergeRes.data.data ?? []) as {
        id: string
        title: string
        memberIds: string[]
        createdAt: string
      }[]

      const userRows: TemplateContact[] = list.map((c) => ({
        id: c.user.id,
        name: c.user.nickname,
        message: c.lastMessage?.content || '',
        image: c.user.avatarUrl || '',
        unreadCount: (c as { unreadCount?: number }).unreadCount ?? 0,
        lastMessageAt: c.lastMessage?.createdAt,
        type: 'user' as const,
      }))

      const mergeRows: TemplateContact[] = merges.map((m) => ({
        id: `merge:${m.id}`,
        name: m.title,
        message: `${m.memberIds?.length || 0} 位成员`,
        image: '',
        type: 'merge' as const,
      }))

      const next = [...userRows, ...mergeRows]
      setRows((prev) => mergeContacts(prev, next))
      setUnreadById((prev) => {
        const synced: Record<string, number> = {}
        let changed = false
        for (const row of next) {
          if (!row.id) continue
          const server = row.unreadCount ?? 0
          const local = prev[row.id]
          // 点击已清零则保住本地；服务端已读也采信
          const nextVal =
            local === 0 || server === 0 ? 0 : (local ?? server)
          synced[row.id] = nextVal
          if (prev[row.id] !== nextVal) changed = true
        }
        for (const key of Object.keys(prev)) {
          if (!(key in synced)) {
            changed = true
            break
          }
        }
        return changed ? synced : prev
      })

      for (const row of next) {
        if (!row.image) continue
        const img = new Image()
        img.src = row.image
      }
    } catch {
      if (!opts?.silent) setRows([])
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    void import('@/views/ChatDetail')
    void import('@/views/MessagesIndexPlaceholder')
  }, [])

  const conversationVersion = useChatStore((s) => s.conversationVersion)
  useEffect(() => {
    if (conversationVersion > 0) void fetchConversations({ silent: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationVersion])

  const currentChat = useMemo(() => {
    if (!selectedId) return null
    return rows.find((r) => r.id === selectedId) ?? null
  }, [rows, selectedId])

  const onSelectContact = useCallback(
    (c: TemplateContact) => {
      if (!c.id) return
      setSelectedId(c.id)
      setUnreadById((prev) =>
        prev[c.id!] === 0 ? prev : { ...prev, [c.id!]: 0 },
      )

      const navOpts =
        location.pathname.startsWith('/messages/') &&
        location.pathname !== '/messages/new-group'
          ? SUBPAGE_NAV
          : undefined

      startTransition(() => {
        if (c.type === 'merge') {
          navigate(`/messages/merge/${c.id!.replace('merge:', '')}`, navOpts)
        } else {
          navigate(`/messages/${c.id}`, navOpts)
        }
      })
    },
    [location.pathname, navigate],
  )

  return (
    <div className="internal-shell internal-messages-layout flex h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden">
      <MessagesConversationSidebar
        contacts={rows}
        loading={loading}
        selectedContactId={selectedId}
        unreadById={unreadById}
        onSelectContact={onSelectContact}
      />
      <div className="msg-pane-stage relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Suspense fallback={null}>
          <Outlet context={{ threadContact: currentChat }} />
        </Suspense>
      </div>
    </div>
  )
}
