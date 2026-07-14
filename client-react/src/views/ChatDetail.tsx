import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { MsIcon } from '@/components/ui/ms-icon'
import { useUserStore } from '@/stores/user'
import { useChatStore, type ChatMessage } from '@/stores/chat'
import { messageApi } from '@/api/message'
import { userApi } from '@/api/user'
import { reportApi } from '@/api/report'
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
  const [searchParams] = useSearchParams()
  const { threadContact } = useOutletContext<{
    threadContact?: TemplateContact | null
  }>()
  const navigate = useNavigate()
  const userStore = useUserStore()
  const connected = useChatStore((s) => s.connected)
  const fetchMessages = useChatStore((s) => s.fetchMessages)
  const fetchUnreadCount = useChatStore((s) => s.fetchUnreadCount)
  const bumpConversation = useChatStore((s) => s.bumpConversation)
  const clearMessages = useChatStore((s) => s.clearMessages)
  const storeMessages = useChatStore((s) => s.messages)

  const isMergeChat = !!mergeId
  const currentMergeId = mergeId || ''
  const peerId = userId || ''
  const myId = userStore.user?.id || ''
  const [mergeMessages, setMergeMessages] = useState<ChatMessage[]>([])
  const [mergeTitle, setMergeTitle] = useState('群聊')

  const messages = isMergeChat
    ? mergeMessages
    : storeMessages.filter(
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
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportCategory, setReportCategory] = useState<'spam' | 'abuse' | 'adult' | 'scam' | 'other'>('other')
  const [blocking, setBlocking] = useState(false)
  const cardAttachSent = useRef(false)
  const unreadAnchorCaptured = useRef(false)
  const listRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

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
    void fetchUnreadCount()
    if (!connected) startPolling()
    return () => {
      stopPolling()
      clearMessages()
    }
  }, [
    clearMessages,
    connected,
    currentMergeId,
    fetchMessages,
    fetchUnreadCount,
    isMergeChat,
    peerId,
    startPolling,
    stopPolling,
  ])

  useEffect(() => {
    const serviceCardId = searchParams.get('serviceCardId')
    if (isMergeChat || !peerId || !serviceCardId || cardAttachSent.current) return
    cardAttachSent.current = true
    messageApi
      .sendCardAttachment(peerId, 'SERVICE_CARD', serviceCardId)
      .then(() => fetchMessages(peerId))
      .catch(() => {
        cardAttachSent.current = false
        toast('服务卡发送失败', 'error')
      })
  }, [fetchMessages, isMergeChat, peerId, searchParams])

  useEffect(() => {
    unreadAnchorCaptured.current = false
    setUnreadAnchorKey(null)
    setPendingOutgoing([])
    setInitialLoading(true)
    cardAttachSent.current = false
  }, [peerId, currentMergeId])

  useEffect(() => {
    // 每个会话只锚定首次出现的未读分界；切换会话时重置
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
        bumpConversation()
      } else {
        const res = await messageApi.send(peerId, text)
        const newMsg = res.data.data as ChatMessage | undefined
        if (newMsg) {
          useChatStore.setState((s) => {
            const incoming = newMsg.id
              ? `id:${newMsg.id}`
              : `${myId}|${peerId}|${newMsg.createdAt}|${newMsg.content}`
            const exists = s.messages.some(
              (m) =>
                (Boolean(newMsg.id) && m.id === newMsg.id) ||
                (m.id
                  ? `id:${m.id}`
                  : `${getSenderId(m)}|${m.receiverId || m.toUserId || ''}|${m.createdAt}|${m.content}`) ===
                  incoming,
            )
            return exists ? s : { messages: [...s.messages, newMsg] }
          })
        }
        bumpConversation()
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

  async function handleBlockPeer() {
    if (!peerId || isMergeChat) return
    setBlocking(true)
    try {
      await userApi.blockUser(peerId)
      toast('已拉黑该用户', 'success')
      navigate('/messages')
    } catch {
      toast('拉黑失败，请稍后重试', 'error')
    } finally {
      setBlocking(false)
    }
  }

  async function submitReport() {
    if (!peerId || !reportReason.trim()) return
    try {
      await reportApi.create({
        targetUserId: peerId,
        category: reportCategory,
        reason: reportReason.trim(),
      })
      toast('举报已提交', 'success')
      setShowReport(false)
      setReportReason('')
    } catch {
      toast('举报提交失败', 'error')
    }
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
      headerTrailing={
        !isMergeChat && peerId ? (
          <>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs text-text-muted hover:bg-bg-secondary hover:text-text-primary"
              onClick={() => setShowReport(true)}
            >
              举报
            </button>
            <button
              type="button"
              disabled={blocking}
              className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 disabled:opacity-50"
              onClick={() => void handleBlockPeer()}
            >
              拉黑
            </button>
          </>
        ) : undefined
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
                    {m.cardAttachment && (
                      <div className={cn('mb-2 max-w-[360px] rounded-xl border border-border bg-bg-card p-3', isMine ? 'ml-auto' : 'mr-auto')}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                            {m.cardAttachment.cardType === 'SERVICE_CARD' ? '服务卡' : '需求卡'}
                          </span>
                          {m.cardAttachment.snapshot.category && (
                            <span className="text-xs text-text-muted">{m.cardAttachment.snapshot.category}</span>
                          )}
                        </div>
                        {m.cardAttachment.snapshot.coverImage && (
                          <img
                            className="mb-3 h-28 w-full rounded-lg object-cover"
                            src={m.cardAttachment.snapshot.coverImage}
                            alt=""
                          />
                        )}
                        <strong className="block text-sm text-text-primary">
                          {m.cardAttachment.snapshot.title || '卡片'}
                        </strong>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">
                          {m.cardAttachment.snapshot.summary || m.cardAttachment.snapshot.description || ''}
                        </p>
                        {m.cardAttachment.snapshot.evidence?.length ? (
                          <p className="mt-2 text-xs text-[var(--accent-color)]">
                            {m.cardAttachment.snapshot.evidence[0].label} 已完成 {m.cardAttachment.snapshot.evidence[0].completedCount} 次
                          </p>
                        ) : null}
                      </div>
                    )}
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
                      hideAvatar={false}
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
      {showReport ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowReport(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-bg-primary p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-base font-semibold text-text-primary">举报用户</h3>
            <label className="mb-1 block text-xs text-text-muted">类型</label>
            <select
              value={reportCategory}
              onChange={(e) =>
                setReportCategory(e.target.value as typeof reportCategory)
              }
              className="mb-3 w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm"
            >
              <option value="spam">垃圾信息</option>
              <option value="abuse">辱骂骚扰</option>
              <option value="adult">色情低俗</option>
              <option value="scam">诈骗</option>
              <option value="other">其他</option>
            </select>
            <label className="mb-1 block text-xs text-text-muted">说明</label>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={4}
              className="mb-4 w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm"
              placeholder="请描述违规情况…"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm text-text-muted hover:bg-bg-secondary"
                onClick={() => setShowReport(false)}
              >
                取消
              </button>
              <button
                type="button"
                disabled={!reportReason.trim()}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white disabled:opacity-50"
                onClick={() => void submitReport()}
              >
                提交举报
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
