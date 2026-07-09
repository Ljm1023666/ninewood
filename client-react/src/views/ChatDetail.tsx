import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { MsIcon } from '@/components/ui/ms-icon'
import { useUserStore } from '@/stores/user'
import { useChatStore, type ChatMessage } from '@/stores/chat'
import { messageApi } from '@/api/message'
import { userApi } from '@/api/user'
import { TimeDivider } from '@/components/ui/time-divider'
import { UnreadDivider } from '@/components/ui/unread-divider'
import { MessageBubble } from '@/components/ui/message-bubble'
import { MessageImagePreview } from '@/components/ui/message-chat-extras'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { TemplateChatRightShell } from '@/components/ui/chat-template'
import type { TemplateContact } from '@/components/ui/chat-template'
import { BackButton } from '@/components/ui/back-button'

function getSenderId(m: ChatMessage): string {
  return m.senderId || m.fromUserId || ''
}

function messageRowKey(m: ChatMessage, idx: number): string {
  return m.id || `${m.createdAt}-${idx}`
}

interface PendingOutgoing {
  clientId: string
  content: string
  status: 'sending' | 'failed'
  createdAt: string
}

export default function ChatDetail() {
  const { userId, mergeId } = useParams<{ userId?: string; mergeId?: string }>()
  const { threadContact } = useOutletContext<{
    threadContact?: TemplateContact | null
  }>()
  const navigate = useNavigate()
  const userStore = useUserStore()
  const chatStore = useChatStore()

  const isMergeChat = !!mergeId
  const currentMergeId = mergeId || ''
  const peerId = userId || ''
  const myId = userStore.user?.id || ''
  const [mergeMessages, setMergeMessages] = useState<ChatMessage[]>([])
  const [mergeTitle, setMergeTitle] = useState('群聊')

  const messages = isMergeChat
    ? mergeMessages
    : chatStore.messages.filter(
        (m: ChatMessage) =>
          ((m.senderId || m.fromUserId) === myId &&
            (m.receiverId || m.toUserId) === peerId) ||
          ((m.senderId || m.fromUserId) === peerId &&
            (m.receiverId || m.toUserId) === myId),
      )

  const [input, setInput] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const [peerUser, setPeerUser] = useState<{
    nickname: string
    avatarUrl: string | null
  } | null>(null)
  const [pendingOutgoing, setPendingOutgoing] = useState<PendingOutgoing[]>([])
  const [unreadAnchorKey, setUnreadAnchorKey] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const unreadAnchorCaptured = useRef(false)
  const listRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const connected = chatStore.connected
  const fetchMessages = chatStore.fetchMessages

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = undefined
    }
  }, [])

  const startPolling = useCallback(() => {
    if (pollRef.current || connected) return
    if (isMergeChat) {
      pollRef.current = setInterval(() => {
        messageApi
          .getMergeMessages(currentMergeId)
          .then((res) => setMergeMessages((res.data.data ?? []) as ChatMessage[]))
          .catch(() => {
            toast('消息同步失败', 'error')
          })
      }, 10000)
      return
    }
    pollRef.current = setInterval(() => fetchMessages(peerId), 10000)
  }, [connected, currentMergeId, fetchMessages, isMergeChat, peerId])

  useEffect(() => {
    if (isMergeChat) {
      if (!currentMergeId) return
      setMergeMessages([])
      messageApi
        .getMerges()
        .then((r) => {
          const merges = (r.data.data ?? []) as { id: string; title: string }[]
          const current = merges.find((m) => m.id === currentMergeId)
          setMergeTitle(current?.title || '群聊')
        })
        .catch(() => setMergeTitle('群聊'))
      messageApi
        .getMergeMessages(currentMergeId)
        .then((r) => setMergeMessages((r.data.data ?? []) as ChatMessage[]))
        .catch(() => setMergeMessages([]))
      if (!connected) startPolling()
      return () => stopPolling()
    }
    if (!peerId) return
    userApi
      .get(peerId)
      .then((r) => setPeerUser(r.data.data))
      .catch(() => setPeerUser(null))
    fetchMessages(peerId)
    chatStore.fetchUnreadCount()
    if (!connected) startPolling()
    return () => stopPolling()
  }, [
    connected,
    currentMergeId,
    fetchMessages,
    isMergeChat,
    peerId,
    startPolling,
    stopPolling,
  ])

  useEffect(() => {
    unreadAnchorCaptured.current = false
    setUnreadAnchorKey(null)
    setPendingOutgoing([])
  }, [peerId, currentMergeId])

  useEffect(() => {
    if (isMergeChat || unreadAnchorCaptured.current || messages.length === 0) return
    const idx = messages.findIndex((m) => {
      const from = getSenderId(m)
      return from !== myId && m.isRead === false && m.type !== 'SYSTEM'
    })
    if (idx >= 0) {
      setUnreadAnchorKey(messageRowKey(messages[idx]!, idx))
      unreadAnchorCaptured.current = true
    }
  }, [messages, myId, isMergeChat])

  useEffect(() => {
    if (isMergeChat) return
    if (peerId === myId) navigate('/messages', { replace: true })
  }, [isMergeChat, peerId, myId, navigate])

  const threadItems = useMemo(() => {
    const items: Array<
      | { kind: 'message'; key: string; message: ChatMessage; index: number }
      | { kind: 'pending'; key: string; pending: PendingOutgoing }
    > = messages.map((m, index) => ({
      kind: 'message' as const,
      key: messageRowKey(m, index),
      message: m,
      index,
    }))
    for (const p of pendingOutgoing) {
      items.push({ kind: 'pending', key: p.clientId, pending: p })
    }
    return items
  }, [messages, pendingOutgoing])

  useEffect(() => {
    scrollBottom()
  }, [messages.length, pendingOutgoing.length])

  useEffect(() => {
    if (messages.length > 0 && initialLoading) setInitialLoading(false)
  }, [messages.length, initialLoading])

  useEffect(() => {
    if (connected) stopPolling()
    else if ((isMergeChat && currentMergeId) || peerId) startPolling()
  }, [
    connected,
    currentMergeId,
    isMergeChat,
    peerId,
    startPolling,
    stopPolling,
  ])

  const peerNickname = isMergeChat ? mergeTitle : peerUser?.nickname || threadContact?.name || '聊天'

  function scrollBottom(force = false) {
    const el = listRef.current
    if (!el) return
    if (force) {
      el.scrollTop = el.scrollHeight
      return
    }
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (atBottom) el.scrollTop = el.scrollHeight
  }

  async function send(retry?: PendingOutgoing) {
    const text = retry ? retry.content : input.trim()
    if (!text) return

    const clientId =
      retry?.clientId ??
      `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    if (retry) {
      setPendingOutgoing((p) =>
        p.map((x) =>
          x.clientId === clientId ? { ...x, status: 'sending' as const } : x,
        ),
      )
    } else {
      setPendingOutgoing((p) => [
        ...p,
        {
          clientId,
          content: text,
          status: 'sending',
          createdAt: new Date().toISOString(),
        },
      ])
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }

    try {
      if (isMergeChat) {
        await messageApi.sendMergeMessage(currentMergeId, text)
        const refreshed = await messageApi.getMergeMessages(currentMergeId)
        setMergeMessages((refreshed.data.data ?? []) as ChatMessage[])
        chatStore.bumpConversation()
      } else {
        const res = await messageApi.send(peerId, text)
        useChatStore.setState((s) => ({
          messages: [...s.messages, res.data.data],
        }))
        chatStore.bumpConversation()
      }
      setPendingOutgoing((p) => p.filter((x) => x.clientId !== clientId))
      setTimeout(() => scrollBottom(true), 100)
    } catch {
      setPendingOutgoing((p) =>
        p.map((x) =>
          x.clientId === clientId ? { ...x, status: 'failed' as const } : x,
        ),
      )
      if (retry) toast('发送失败，请重试', 'error')
    }
  }

  function retryPending(p: PendingOutgoing) {
    void send(p)
  }

  function handleInputChange(value: string) {
    setInput(value)
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const emojis = [
    '😀', '😂', '🤣', '😍', '🥰', '😎', '🤩', '👍', '🙏', '💪',
    '🔥', '🎉', '❤', '💔', '🎨', '💻', '📱', '💰', '⭐', '✅',
    '❌', '🤝', '🍳', '🚗', '☕', '📖', '🎵', '🌙', '✨', '🎂',
  ]

  const hasChat = isMergeChat ? !!currentMergeId : !!peerId

  return (
    <>
      <MessageImagePreview
        src={previewImage ?? ''}
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
      />
      <TemplateChatRightShell
      embedInLayout
      variant="internal"
      currentChat={{
        id: isMergeChat ? `merge:${currentMergeId}` : peerId,
        name: peerNickname,
        message: '',
        image: '',
      }}
      onProfileClick={
        !isMergeChat && peerId
          ? () => navigate(`/profile/${peerId}`)
          : undefined
      }
      headerLeading={
        <BackButton
          compact
          label="返回会话列表"
          onBack={() => navigate('/messages')}
        />
      }
      middle={
        <div
          ref={listRef}
          className="thin-scroll flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg-primary px-3 py-3"
        >
          <div className="msg-thread">
            {initialLoading && messages.length === 0 ? (
              <div className="flex flex-col gap-3 pt-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-end gap-2',
                      i % 2 === 0 ? 'flex-row-reverse' : 'flex-row',
                    )}
                  >
                    {i % 2 !== 0 && <div className="size-9 shrink-0" />}
                    <Skeleton
                      className={cn(
                        'h-9 rounded-xl',
                        i % 2 === 0 ? 'w-48' : 'w-36',
                      )}
                    />
                    {i % 2 === 0 && <div className="size-9 shrink-0" />}
                  </div>
                ))}
              </div>
            ) : (
              threadItems.map((item) => {
                if (item.kind === 'pending') {
                  const p = item.pending
                  const prevMsg =
                    messages.length > 0 ? messages[messages.length - 1] : null
                  const prevSender = prevMsg ? getSenderId(prevMsg) : null
                  const groupedWithPrev = prevSender === myId
                  return (
                    <div key={item.key}>
                      <MessageBubble
                        content={p.content}
                        isMine
                        avatarUrl={userStore.user?.avatarUrl || ''}
                        hideAvatar={false}
                        isGroupedWithPrev={groupedWithPrev}
                        isGroupedWithNext={false}
                        showTimestamp
                        timestamp={p.createdAt}
                        sendStatus={p.status}
                        onRetry={() => retryPending(p)}
                      />
                    </div>
                  )
                }

                const m = item.message
                const idx = item.index
                const rowKey = item.key
                const senderId = getSenderId(m)
                const prev = idx > 0 ? messages[idx - 1] : null
                const next =
                  idx < messages.length - 1 ? messages[idx + 1] : null
                const prevSender = prev ? getSenderId(prev) : null
                const nextSender = next ? getSenderId(next) : null
                const isSystem = m.type === 'SYSTEM'
                const prevSystem = prev?.type === 'SYSTEM'
                const nextSystem = next?.type === 'SYSTEM'
                const isMine = senderId === myId
                const isGroupedWithPrev =
                  !isSystem && !prevSystem && senderId === prevSender
                const isGroupedWithNext =
                  !isSystem && !nextSystem && senderId === nextSender

                return (
                  <div key={rowKey}>
                    <TimeDivider
                      timestamp={m.createdAt}
                      prevTimestamp={
                        idx > 0 ? messages[idx - 1].createdAt : null
                      }
                    />
                    {unreadAnchorKey === rowKey && <UnreadDivider />}
                    <MessageBubble
                      content={m.content}
                      isMine={isMine}
                      type={m.type}
                      nickname={
                        isMergeChat
                          ? (
                              m as ChatMessage & {
                                fromUser?: { nickname?: string }
                              }
                            ).fromUser?.nickname || '成员'
                          : isMine
                            ? undefined
                            : peerNickname
                      }
                      avatarUrl={
                        isMergeChat
                          ? (
                              m as ChatMessage & {
                                fromUser?: { avatarUrl?: string }
                              }
                            ).fromUser?.avatarUrl || ''
                          : isMine
                            ? userStore.user?.avatarUrl || ''
                            : peerUser?.avatarUrl || ''
                      }
                      hideAvatar={isGroupedWithNext}
                      isGroupedWithPrev={isGroupedWithPrev}
                      isGroupedWithNext={isGroupedWithNext}
                      showTimestamp={!isGroupedWithNext}
                      timestamp={m.createdAt}
                      onImageClick={setPreviewImage}
                    />
                  </div>
                )
              })
            )}
          </div>
        </div>
      }
      inputRow={hasChat ? (
        <div className="msg-composer">
          {showEmoji ? (
            <div className="msg-composer__emoji">
              <div className="msg-composer__emoji-grid">
                {emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      handleInputChange(input + e)
                      setShowEmoji(false)
                    }}
                    className="msg-composer__emoji-btn"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="msg-composer__bar">
            <button
              type="button"
              className="msg-composer__icon-btn"
              onClick={() => setShowEmoji(!showEmoji)}
              title="表情"
            >
              <MsIcon name="mood" size={20} />
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
              placeholder="输入消息…（Shift+Enter 换行）"
              className="msg-composer__input thin-scroll"
            />

            <button
              type="button"
              title="发送"
              onClick={() => void send()}
              disabled={!input.trim()}
              className={cn(
                'msg-composer__send',
                input.trim() && 'msg-composer__send--active',
              )}
            >
              <MsIcon name="send" size={20} />
            </button>
          </div>
        </div>
      ) : null}
    />
    </>
  )
}
