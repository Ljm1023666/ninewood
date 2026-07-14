import { create } from 'zustand'
import { messageApi } from '@/api/message'
import { connectSocket, disconnectSocket, getSocket } from '@/utils/socket'

export interface ChatMessage {
  id?: string
  content: string
  type?: string
  duration?: number
  senderId?: string
  receiverId?: string
  fromUserId?: string
  toUserId?: string
  fromUser?: { id: string; nickname: string; avatarUrl: string | null }
  toUser?: { id: string; nickname: string; avatarUrl: string | null }
  createdAt: string
  isRead?: boolean
  cardAttachment?: {
    cardType: 'DEMAND' | 'SERVICE_CARD'
    demandId: string | null
    serviceCardId: string | null
    snapshot: {
      title?: string
      summary?: string | null
      description?: string
      coverImage?: string | null
      category?: string
      priceMin?: string | number | null
      priceMax?: string | number | null
      completedCount?: number
      claims?: Array<{ label: string; isHighlighted?: boolean }>
      evidence?: Array<{ label: string; completedCount: number }>
    }
  }
}

/** 内存中保留的消息上限，防止跨会话无限增长 */
const MAX_MESSAGES = 400

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
  // 无 id 时附带内容哈希长度，降低同秒同文误判（L2）
  return `${from}|${to}|${msg.createdAt}|${msg.content}|${msg.content.length}`
}

function appendMessages(
  existing: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  const next = [...existing]
  for (const msg of incoming) {
    const key = messageKey(msg)
    const exists = next.some(
      (m) => (Boolean(msg.id) && m.id === msg.id) || messageKey(m) === key,
    )
    if (!exists) next.push(msg)
  }
  return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next
}

interface ChatState {
  conversations: any[]
  messages: ChatMessage[]
  unreadCount: number
  connected: boolean
  conversationVersion: number
  /** 当前私聊对方，用于过滤跨会话消息 */
  activePeerId: string | null

  connect: (token?: string) => ReturnType<typeof connectSocket>
  disconnect: () => void
  fetchConversations: () => Promise<void>
  fetchMessages: (userId: string, page?: number) => Promise<void>
  sendMessage: (toUserId: string, content: string) => Promise<void>
  fetchUnreadCount: () => Promise<void>
  bumpConversation: () => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set, get) => {
  const onPrivMsg = (msg: ChatMessage) => {
    const peer = get().activePeerId
    const from = msg.senderId || msg.fromUserId || ''
    const to = msg.receiverId || msg.toUserId || ''
    // 仅追加与当前会话相关的消息，避免跨会话污染
    if (peer && from !== peer && to !== peer) {
      void get().fetchUnreadCount()
      return
    }
    set({ messages: appendMessages(get().messages, [msg]) })
  }

  const onNotificationNew = () => {
    get().fetchUnreadCount()
  }

  const onConnect = () => set({ connected: true })
  const onDisconnect = () => set({ connected: false })

  const wire = (s: NonNullable<ReturnType<typeof getSocket>>) => {
    s.off('private:message', onPrivMsg).on('private:message', onPrivMsg)
    s.off('notification:new', onNotificationNew).on(
      'notification:new',
      onNotificationNew,
    )
    s.off('connect', onConnect).on('connect', onConnect)
    s.off('disconnect', onDisconnect).on('disconnect', onDisconnect)
  }

  const unwire = () => {
    const s = getSocket()
    if (!s) return
    s.off('private:message', onPrivMsg)
    s.off('notification:new', onNotificationNew)
    s.off('connect', onConnect)
    s.off('disconnect', onDisconnect)
  }

  return {
    conversations: [],
    messages: [],
    unreadCount: 0,
    connected: false,
    conversationVersion: 0,
    activePeerId: null,

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
      set({ conversations: res.data.data ?? [] })
    },

    async fetchMessages(userId, page = 1) {
      set({ activePeerId: userId })
      const res = await messageApi.list(userId, page)
      const fetched = (res.data.data ?? []) as ChatMessage[]
      if (page <= 1) {
        set({ messages: fetched.slice(-MAX_MESSAGES) })
      } else {
        // 更早页：前置合并
        const { messages } = get()
        const existingIds = new Set(messages.map((m) => m.id).filter(Boolean))
        const older = fetched.filter((m) => !m.id || !existingIds.has(m.id))
        const merged = [...older, ...messages]
        set({
          messages:
            merged.length > MAX_MESSAGES
              ? merged.slice(0, MAX_MESSAGES)
              : merged,
        })
      }
      void get().fetchUnreadCount()
    },

    async sendMessage(toUserId, content) {
      const res = await messageApi.send(toUserId, content)
      const msg = res.data.data as ChatMessage | undefined
      if (!msg) return
      set({ messages: appendMessages(get().messages, [msg]) })
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

    clearMessages() {
      set({ messages: [], activePeerId: null })
    },
  }
})
