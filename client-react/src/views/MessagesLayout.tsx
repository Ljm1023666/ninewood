import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { messageApi } from '@/api/message'
import { Home, type TemplateContact } from '@/components/ui/chat-template'
import { ResizablePanel } from '@/components/ui/resizable'
import { SidebarProvider } from '@/components/blocks/sidebar'

export default function MessagesLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const [rows, setRows] = useState<TemplateContact[]>([])
  const [, setLoading] = useState(false)

  const threadUserId = useMemo(() => {
    if (!location.pathname.startsWith('/messages/')) return null
    const rest = location.pathname.slice('/messages/'.length)
    return rest.split('/')[0] || null
  }, [location.pathname])

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await messageApi.conversations()
      const list = (res.data.data ?? []) as {
        user: { id: string; nickname: string; avatarUrl?: string | null }
        lastMessage?: { content?: string }
      }[]
      setRows(
        list.map((c) => ({
          id: c.user.id,
          name: c.user.nickname,
          message: c.lastMessage?.content || '',
          image: c.user.avatarUrl || 'https://github.com/rayimanoj8.png',
          unreadCount: (c as any).unreadCount ?? 0,
        })),
      )
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchConversations()
  }, [fetchConversations])

  const currentChat = useMemo(() => {
    if (!threadUserId) return null
    return rows.find((r) => r.id === threadUserId) ?? null
  }, [rows, threadUserId])

  return (
    <SidebarProvider>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
      {/**
       * showNavigateRail={false}：模板内 shadcn Sidebar 为 fixed;left:0，会盖住会话列表并与 Ninewood 全局侧栏重叠。
       * 独立全屏预览请用 ChatTemplateDemoPage（带 SidebarProvider + showNavigateRail 默认 true）。
       */}
      <Home
        showNavigateRail={false}
        contacts={rows}
        currentChat={currentChat}
        selectedContactId={threadUserId}
        onSelectContact={(c) => {
          if (c.id) navigate(`/messages/${c.id}`)
        }}
        rightColumn={
          <ResizablePanel
            defaultSize={75}
            minSize={40}
            className="min-h-0 min-w-0"
          >
            <Outlet />
          </ResizablePanel>
        }
      />
    </div>
    </SidebarProvider>
  )
}
