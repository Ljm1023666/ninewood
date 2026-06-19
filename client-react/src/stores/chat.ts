import { create } from 'zustand'
import { messageApi } from '@/api/message'
import { connectSocket, disconnectSocket, getSocket } from '@/utils/socket'

export interface ChatMessage {
  id?: string
  content: string
  type?: string
  senderId?: string
  receiverId?: string
  fromUserId?: string
  toUserId?: string
  fromUser?: { id: string; nickname: string; avatarUrl: string | null }
  toUser?: { id: string; nickname: string; avatarUrl: string | null }
  createdAt: string
  isRead?: boolean
}

function messageKey(
  msg: Pick<
    ChatMessage,
    | 'id'
    | 'content'
    | 'createdAt'
    | 'senderId'
    | 'fromUserId'
    | 'receiverId'
    | 'toUserId'
  >,
) {
  if (msg.id) return `id:${msg.id}`
  const from = msg.senderId || msg.fromUserId || ''
  const to = msg.receiverId || msg.toUserId || ''
  return `${from}|${to}|${msg.createdAt}|${msg.content}`
}

interface ChatState {
  conversations: any[]
  messages: ChatMessage[]
  unreadCount: number
  connected: boolean
  conversationVersion: number

  connect: (token: string) => ReturnType<typeof connectSocket>
  disconnect: () => void
  fetchConversations: () => Promise<void>
  fetchMessages: (userId: string, page?: number) => Promise<void>
  sendMessage: (toUserId: string, content: string) => Promise<void>
  fetchUnreadCount: () => Promise<void>
  bumpConversation: () => void
}

export const useChatStore = create<ChatState>((set, get) => {
  const onPrivMsg = (msg: ChatMessage) => {
    const { messages } = get()
    const incoming = messageKey(msg)
    const exists = messages.some(
      (m) => (Boolean(msg.id) && m.id === msg.id) || messageKey(m) === incoming,
    )
    if (!exists) {
      set({ messages: [...messages, msg] })
    }
  }

  const onNotificationNew = () => {
    get().fetchUnreadCount()
  }

  const wire = (s: NonNullable<ReturnType<typeof getSocket>>) => {
    s.off('private:message', onPrivMsg).on('private:message', onPrivMsg)
    s.off('notification:new', onNotificationNew).on(
      'notification:new',
      onNotificationNew,
    )
    s.off('connect', () => set({ connected: true })).on('connect', () =>
      set({ connected: true }),
    )
    s.off('disconnect', () => set({ connected: false })).on('disconnect', () =>
      set({ connected: false }),
    )
  }

  const unwire = () => {
    const s = getSocket()
    if (!s) return
    s.off('private:message', onPrivMsg)
    s.off('notification:new', onNotificationNew)
  }

  return {
    conversations: [],
    messages: [],
    unreadCount: 0,
    connected: false,
    conversationVersion: 0,

    connect(token) {
      const s = connectSocket(token)
      wire(s)
      set({ connected: s.connected })
      return s
    },

    disconnect() {
      unwire()
      disconnectSocket()
      set({ connected: false })
    },

    async fetchConversations() {
      const res = await messageApi.conversations()
      set({ conversations: res.data.data })
    },

    async fetchMessages(userId, page = 1) {
      const res = await messageApi.list(userId, page)
      const fetched = res.data.data as ChatMessage[]
      const { messages } = get()
      const existingIds = new Set(fetched.map((m) => m.id).filter(Boolean))
      const socketOnly = messages.filter((m) => !m.id || !existingIds.has(m.id))
      const merged = [...fetched]
      for (const sm of socketOnly) {
        if (
          !merged.some(
            (m) => m.content === sm.content && m.createdAt === sm.createdAt,
          )
        ) {
          merged.push(sm)
        }
      }
      set({ messages: merged })
    },

    async sendMessage(toUserId, content) {
      await messageApi.send(toUserId, content)
    },

    async fetchUnreadCount() {
      try {
        const res = await messageApi.unreadCount()
        set({ unreadCount: res.data.data?.count || 0 })
      } catch {
        /* ignore */
      }
    },

    bumpConversation() {
      set((s) => ({ conversationVersion: s.conversationVersion + 1 }))
    },
  }
})
