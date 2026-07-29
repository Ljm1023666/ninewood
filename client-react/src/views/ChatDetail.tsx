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
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { MsgChatDepthPane, MsgComposerRebound } from '@/components/ui/msg-chat-depth-pane'
import { toPreferThumbCoverUrl } from '@/utils/user-cover-presets'
import { getChatThreadContentState } from './chat-thread-state'

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
  const [loadError, setLoadError] = useState<string | null>(null)

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
  const loadRequestRef = useRef(0)

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
    pollRef.current = setInterval(() => {
      void fetchMessages(peerId).catch(() => {
        toast('消息同步失败', 'error')
      })
    }, 10000)
  }, [connected, currentMergeId, fetchMessages, isMergeChat, peerId])

  const loadCurrentMessages = useCallback(async () => {
    const requestId = ++loadRequestRef.current
    setInitialLoading(true)
    setLoadError(null)

    try {
      if (isMergeChat) {
        if (!currentMergeId) return
        setMergeMessages([])
        const response = await messageApi.getMergeMessages(currentMergeId)
        if (loadRequestRef.current === requestId) {
          setMergeMessages((response.data.data ?? []) as ChatMessage[])
        }
      } else {
        if (!peerId) return
        await fetchMessages(peerId)
      }
    } catch {
      if (loadRequestRef.current !== requestId) return
      if (isMergeChat) setMergeMessages([])
      setLoadError('消息加载失败，请检查网络后重试。')
    } finally {
      if (loadRequestRef.current === requestId) setInitialLoading(false)
    }
  }, [currentMergeId, fetchMessages, isMergeChat, peerId])

  useEffect(() => {
    if (isMergeChat) {
      if (!currentMergeId) return
      messageApi
        .getMerges()
        .then((r) => {
          const merges = (r.data.data ?? []) as { id: string; title: string }[]
          const current = merges.find((m) => m.id === currentMergeId)
          setMergeTitle(current?.title || '群聊')
        })
        .catch(() => setMergeTitle('群聊'))
      void loadCurrentMessages()
      if (!connected) startPolling()
      return () => {
        loadRequestRef.current += 1
        stopPolling()
      }
    }
    if (!peerId) return
    userApi
      .get(peerId)
      .then((r) => setPeerUser(r.data.data))
      .catch(() => setPeerUser(null))
    void loadCurrentMessages()
    void fetchUnreadCount()
    if (!connected) startPolling()
    return () => {
      loadRequestRef.current += 1
      stopPolling()
    }
  }, [
    connected,
    currentMergeId,
    fetchUnreadCount,
    isMergeChat,
    loadCurrentMessages,
    peerId,
    startPolling,
    stopPolling,
  ])

  // 仅在离开聊天页时清空，切换会话不清空，避免右侧闪白
  useEffect(() => {
    return () => {
      clearMessages()
    }
  }, [clearMessages])

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
    // 切换会话时不强制骨架闪白；右侧景深切场已承接过渡
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

  const threadContentState = getChatThreadContentState({
    loading: initialLoading,
    loadError,
    itemCount: threadItems.length,
    hasConversationPreview: Boolean(threadContact?.message?.trim()),
  })

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
  const paneKey = isMergeChat ? `merge:${currentMergeId}` : peerId

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
            <LiquidMetalButton
              type="button"
              className="msg-chat-header__action msg-chat-header__action--muted"
              onClick={() => setShowReport(true)}
            >
              举报
            </LiquidMetalButton>
            <LiquidMetalButton
              type="button"
              disabled={blocking}
              className="msg-chat-header__action msg-chat-header__action--danger"
              onClick={() => void handleBlockPeer()}
            >
              拉黑
            </LiquidMetalButton>
          </>
        ) : undefined
      }
      middle={
        <MsgChatDepthPane paneKey={paneKey || 'chat'}>
        <div
          ref={listRef}
          className="thin-scroll flex min-h-0 flex-1 flex-col overflow-y-auto bg-transparent px-3 py-3"
        >
          <div className="msg-thread">
            {threadContentState === 'loading' ? (
              <div
                className="flex flex-col gap-3 pt-2"
                role="status"
                aria-label="正在加载消息"
              >
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
                <span className="sr-only">正在加载消息…</span>
              </div>
            ) : threadContentState === 'error' ? (
              <div className="msg-empty-thread" role="alert">
                <div className="msg-empty-thread__icon" aria-hidden>
                  <MsIcon name="sync_problem" size={28} />
                </div>
                <h2>消息没有加载成功</h2>
                <p>{loadError}</p>
                <LiquidMetalButton
                  type="button"
                  className="msg-thread-state__action"
                  onClick={() => void loadCurrentMessages()}
                >
                  重新加载
                </LiquidMetalButton>
              </div>
            ) : threadContentState === 'mismatch' ||
              threadContentState === 'empty' ? (
              <div className="msg-empty-thread" role="status">
                <div className="msg-empty-thread__icon" aria-hidden>
                  <MsIcon
                    name={
                      threadContentState === 'mismatch'
                        ? 'sync_problem'
                        : 'chat_bubble_outline'
                    }
                    size={28}
                  />
                </div>
                <h2>
                  {threadContentState === 'mismatch'
                    ? '会话记录未同步完整'
                    : '还没有消息'}
                </h2>
                <p>
                  {threadContentState === 'mismatch'
                    ? '列表中有最近消息，但正文暂未返回。请重新加载，避免遗漏沟通记录。'
                    : '发送第一条消息，开始这段对话。'}
                </p>
                {threadContentState === 'mismatch' ? (
                  <LiquidMetalButton
                    type="button"
                    className="msg-thread-state__action"
                    onClick={() => void loadCurrentMessages()}
                  >
                    重新加载
                  </LiquidMetalButton>
                ) : null}
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
                          <span className="text-sm font-semibold text-text-secondary">
                            {m.cardAttachment.cardType === 'SERVICE_CARD' ? '服务卡' : '需求卡'}
                          </span>
                          {m.cardAttachment.snapshot.category && (
                            <span className="text-sm text-text-secondary">{m.cardAttachment.snapshot.category}</span>
                          )}
                        </div>
                        {m.cardAttachment.snapshot.coverImage && (
                          <img
                            className="mb-3 h-28 w-full rounded-lg object-cover"
                            src={toPreferThumbCoverUrl(m.cardAttachment.snapshot.coverImage)}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                        <strong className="block text-[15px] text-text-primary">
                          {m.cardAttachment.snapshot.title || '卡片'}
                        </strong>
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-text-secondary">
                          {m.cardAttachment.snapshot.summary || m.cardAttachment.snapshot.description || ''}
                        </p>
                        {m.cardAttachment.snapshot.evidence?.length ? (
                          <p className="mt-2 text-sm text-[var(--accent-color)]">
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
                          : undefined
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
                      onImageClick={setPreviewImage}
                    />
                  </div>
                )
              })
            )}
          </div>
        </div>
        </MsgChatDepthPane>
      }
      inputRow={hasChat ? (
        <div className="msg-composer">
          {showEmoji ? (
            <div className="msg-composer__emoji">
              <div className="msg-composer__emoji-grid">
                {emojis.map((e) => (
                  <LiquidMetalButton
                    key={e}
                    type="button"
                    onClick={() => {
                      handleInputChange(input + e)
                      setShowEmoji(false)
                    }}
                    className="msg-composer__emoji-btn"
                  >
                    {e}
                  </LiquidMetalButton>
                ))}
              </div>
            </div>
          ) : null}

          <MsgComposerRebound playKey={paneKey || 'chat'}>
            <div className="msg-composer__bar">
              <LiquidMetalButton
                type="button"
                className="msg-composer__icon-btn"
                onClick={() => setShowEmoji(!showEmoji)}
                title="表情"
              >
                <MsIcon name="mood" size={20} />
              </LiquidMetalButton>

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
                placeholder="输入消息…"
                title="Enter 发送，Shift+Enter 换行"
                className="msg-composer__input thin-scroll"
              />

              <LiquidMetalButton
                viewMode="icon"
                height={36}
                aria-label="发送"
                onClick={() => void send()}
                disabled={!input.trim()}
                active={Boolean(input.trim())}
                icon={<MsIcon name="send" size={18} />}
              />
            </div>
          </MsgComposerRebound>
        </div>
      ) : null}
    />
      {showReport ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowReport(false)}
        >
          <div
            className="liquid-glass-surface w-full max-w-md rounded-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-base font-semibold text-text-primary">举报用户</h3>
            <label className="mb-1 block text-sm text-text-secondary">类型</label>
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
            <label className="mb-1 block text-sm text-text-secondary">说明</label>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={4}
              className="mb-4 w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm"
              placeholder="请描述违规情况…"
            />
            <div className="flex justify-end gap-2">
              <LiquidMetalButton
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm text-text-muted hover:bg-bg-secondary"
                onClick={() => setShowReport(false)}
              >
                取消
              </LiquidMetalButton>
              <LiquidMetalButton
                label="提交举报"
                disabled={!reportReason.trim()}
                active={Boolean(reportReason.trim())}
                height={36}
                onClick={() => void submitReport()}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
