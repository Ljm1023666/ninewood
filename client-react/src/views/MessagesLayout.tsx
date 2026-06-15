import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { messageApi } from '@/api/message'
import { useChatStore } from '@/stores/chat'
import { Home, type TemplateContact } from '@/components/ui/chat-template'
import { SidebarProvider } from '@/components/blocks/sidebar'

export default function MessagesLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const [rows, setRows] = useState<TemplateContact[]>([])
  const [, setLoading] = useState(false)

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

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const [convRes, mergeRes] = await Promise.all([
        messageApi.conversations(),
        messageApi.getMerges().catch(() => ({ data: { data: [] } })),
      ])
      const list = (convRes.data.data ?? []) as {
        user: { id: string; nickname: string; avatarUrl?: string | null }
        lastMessage?: { content?: string }
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
        type: 'user' as const,
      }))

      const mergeRows: TemplateContact[] = merges.map((m) => ({
        id: `merge:${m.id}`,
        name: m.title,
        message: `${m.memberIds?.length || 0} 位成员`,
        image: '',
        type: 'merge' as const,
      }))

      setRows([...userRows, ...mergeRows])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchConversations()
  }, [fetchConversations])

  const conversationVersion = useChatStore((s) => s.conversationVersion)
  useEffect(() => {
    if (conversationVersion > 0) void fetchConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationVersion])

  const currentChat = useMemo(() => {
    if (!threadUserId) return null
    return rows.find((r) => r.id === threadUserId) ?? null
  }, [rows, threadUserId])

  return (
    <SidebarProvider>
      <div className="internal-shell internal-messages-layout flex h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden">
        <Home
          variant="internal"
          showNavigateRail={false}
          contacts={rows}
          currentChat={currentChat}
          selectedContactId={threadUserId}
          onSelectContact={(c) => {
            if (!c.id) return
            if (c.type === 'merge') {
              const mergeId = c.id.replace('merge:', '')
              navigate(`/messages/merge/${mergeId}`)
            } else {
              navigate(`/messages/${c.id}`)
            }
          }}
          rightColumn={
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <Outlet />
            </div>
          }
        />
      </div>
    </SidebarProvider>
  )
}
