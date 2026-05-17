import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Brush,
  Camera,
  ChartBarIncreasing,
  ChevronLeft,
  File,
  Image,
  Paperclip,
  Send,
  Smile,
  UserRound,
} from 'lucide-react'
import { useUserStore } from '@/stores/user'
import { useChatStore, type ChatMessage } from '@/stores/chat'
import { messageApi } from '@/api/message'
import { userApi } from '@/api/user'
import { TimeDivider } from '@/components/ui/time-divider'
import { MessageBubble } from '@/components/ui/message-bubble'
import { ActionSheet } from '@/components/ui/action-sheet'
import { toast } from '@/components/ui/confirm-dialog'
import { TemplateChatRightShell } from '@/components/ui/chat-template'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function ChatDetail() {
  const { userId, mergeId } = useParams<{ userId?: string; mergeId?: string }>()
  const navigate = useNavigate()
  const userStore = useUserStore()
  const chatStore = useChatStore()

  const isMergeChat = !!mergeId
  const currentMergeId = mergeId || ''
  const peerId = userId || ''
  const myId = userStore.user?.id || ''
  const [mergeMessages, setMergeMessages] = useState<any[]>([])
  const [mergeTitle, setMergeTitle] = useState('群聊')

  // 过滤出当前对话的消息
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
  const [showSheet, setShowSheet] = useState(false)

  const [peerUser, setPeerUser] = useState<{
    nickname: string
    avatarUrl: string | null
  } | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
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
          .then((res) => setMergeMessages((res.data.data ?? []) as any[]))
          .catch(() => {
            /* noop */
          })
      }, 10000)
      return
    }
    pollRef.current = setInterval(() => fetchMessages(peerId), 10000)
  }, [connected, currentMergeId, fetchMessages, isMergeChat, peerId])

  // 取对端用户信息
  useEffect(() => {
    if (isMergeChat) {
      if (!currentMergeId) return
      messageApi
        .getMerges()
        .then((r) => {
          const merges = (r.data.data ?? []) as any[]
          const current = merges.find((m) => m.id === currentMergeId)
          setMergeTitle(current?.title || '群聊')
        })
        .catch(() => setMergeTitle('群聊'))
      messageApi
        .getMergeMessages(currentMergeId)
        .then((r) => setMergeMessages((r.data.data ?? []) as any[]))
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

  // 防止跟自己聊天
  useEffect(() => {
    if (isMergeChat) return
    if (peerId === myId) navigate('/messages', { replace: true })
  }, [isMergeChat, peerId, myId, navigate])

  // 消息变化自动滚底
  useEffect(() => {
    scrollBottom()
  }, [messages.length])

  // socket 连接变化
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

  const peerNickname = isMergeChat ? mergeTitle : peerUser?.nickname || '聊天'

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

  async function send() {
    const text = input.trim()
    if (!text) return
    try {
      if (isMergeChat) {
        await messageApi.sendMergeMessage(currentMergeId, text)
        const refreshed = await messageApi.getMergeMessages(currentMergeId)
        setMergeMessages((refreshed.data.data ?? []) as any[])
        chatStore.bumpConversation()
      } else {
        const res = await messageApi.send(peerId, text)
        useChatStore.setState((s) => ({
          messages: [...s.messages, res.data.data],
        }))
        chatStore.bumpConversation()
      }
      setInput('')
      setTimeout(() => scrollBottom(true), 100)
    } catch {
      toast('发送失败，请重试', 'error')
    }
  }

  // 文件选择
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [uploadPreview, setUploadPreview] = useState('')
  const [uploadIsVideo, setUploadIsVideo] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setUploadFile(f)
      setUploadPreview(URL.createObjectURL(f))
      setUploadIsVideo(f.type.startsWith('video/'))
    }
  }

  async function sendFile() {
    if (isMergeChat) return
    if (!uploadFile) return
    try {
      const fd = new FormData()
      fd.append('toUserId', peerId)
      fd.append('file', uploadFile)
      fd.append('content', '')
      await messageApi.sendForm(fd)
      setUploadFile(null)
      setUploadPreview('')
      setUploadIsVideo(false)
      await chatStore.fetchMessages(peerId)
      setTimeout(() => scrollBottom(true), 100)
    } catch {
      toast('发送失败，请重试', 'error')
    }
  }

  function onSheetSelect(action: string) {
    setShowSheet(false)
    if (action === 'image') imageInputRef.current?.click()
    if (action === 'video') videoInputRef.current?.click()
  }

  const emojis = [
    '😀',
    '😂',
    '🤣',
    '😍',
    '🥰',
    '😎',
    '🤩',
    '👍',
    '🙏',
    '💪',
    '🔥',
    '🎉',
    '❤',
    '💔',
    '🎨',
    '💻',
    '📱',
    '💰',
    '⭐',
    '✅',
    '❌',
    '🤝',
    '🍳',
    '🚗',
    '☕',
    '📖',
    '🎵',
    '🌙',
    '✨',
    '🎂',
  ]

  return (
    <TemplateChatRightShell
      embedInLayout
      currentChat={{
        id: isMergeChat ? `merge:${currentMergeId}` : peerId,
        name: peerNickname,
        message: '',
        image: isMergeChat ? '' : peerUser?.avatarUrl?.trim() || '',
      }}
      avatarFallback={peerNickname.slice(0, 2)}
      onProfileClick={
        !isMergeChat && peerId
          ? () => navigate(`/profile/${peerId}`)
          : undefined
      }
      headerLeading={
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className="shrink-0"
          aria-label="返回会话列表"
          onClick={() => navigate('/messages')}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      }
      middle={
        <div
          ref={listRef}
          className="thin-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-bg-primary px-2 py-2"
        >
          {messages.map((m: ChatMessage, idx: number) => {
            const senderId = m.senderId || m.fromUserId
            return (
              <div key={m.id || m.createdAt}>
                <TimeDivider
                  timestamp={m.createdAt}
                  prevTimestamp={idx > 0 ? messages[idx - 1].createdAt : null}
                />
                <MessageBubble
                  content={m.content}
                  isMine={senderId === myId}
                  type={m.type}
                  nickname={
                    isMergeChat
                      ? (m as any).fromUser?.nickname || '成员'
                      : peerNickname
                  }
                  avatarUrl={
                    isMergeChat
                      ? (m as any).fromUser?.avatarUrl || ''
                      : senderId === myId
                        ? userStore.user?.avatarUrl || ''
                        : peerUser?.avatarUrl || ''
                  }
                  hideAvatar={false}
                  isGroupedWithPrev={false}
                />
              </div>
            )
          })}
        </div>
      }
      inputRow={
        <>
          {uploadPreview ? (
            <div className="flex shrink-0 items-center gap-2 border-t border-border bg-bg-secondary px-3 py-2">
              {uploadIsVideo ? (
                <video
                  src={uploadPreview}
                  controls
                  muted
                  className="h-16 w-16 rounded-md object-cover"
                />
              ) : (
                <img
                  src={uploadPreview}
                  alt=""
                  className="h-16 w-16 rounded-md object-cover"
                />
              )}
              <button
                type="button"
                onClick={sendFile}
                className="rounded-md bg-[var(--primary-gradient)] px-3 py-1.5 text-sm font-semibold text-white"
              >
                发送
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadFile(null)
                  setUploadPreview('')
                  setUploadIsVideo(false)
                }}
                className="text-sm text-text-muted"
              >
                取消
              </button>
            </div>
          ) : null}

          {showEmoji && !showSheet ? (
            <div className="max-h-[200px] shrink-0 overflow-y-auto border-t border-border bg-card px-3 py-2">
              <div className="flex flex-wrap gap-0.5">
                {emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      setInput(input + e)
                      setShowEmoji(false)
                    }}
                    className="cursor-pointer rounded-md px-2 py-1.5 text-[28px] hover:bg-bg-tertiary"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <ActionSheet
            visible={showSheet}
            onClose={() => setShowSheet(false)}
            onSelect={onSheetSelect}
          />

          <div className="flex h-12 shrink-0 items-center gap-0.5 border-t border-border bg-card px-1">
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => {
                setShowEmoji(!showEmoji)
                setShowSheet(false)
              }}
              title="表情"
            >
              <Smile className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  title="附件"
                  disabled={isMergeChat}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => imageInputRef.current?.click()}
                >
                  <Image className="mr-2 h-4 w-4" /> 照片与视频
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => videoInputRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" /> 视频
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => imageInputRef.current?.click()}
                >
                  <File className="mr-2 h-4 w-4" /> 文件
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <UserRound className="mr-2 h-4 w-4" /> 联系人
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ChartBarIncreasing className="mr-2 h-4 w-4" /> 投票
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Brush className="mr-2 h-4 w-4" /> 画板
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void send()
              }}
              placeholder="输入消息…"
              className="h-9 min-w-0 flex-1 border-0 bg-transparent px-2 text-[15px] text-text-primary shadow-none focus-visible:ring-0"
            />

            {!input.trim() ? (
              <Button
                variant="ghost"
                size="icon"
                type="button"
                title="更多"
                onClick={() => {
                  setShowSheet(!showSheet)
                  setShowEmoji(false)
                }}
              >
                <span className="text-lg leading-none">＋</span>
              </Button>
            ) : null}

            <Button
              variant="ghost"
              size="icon"
              type="button"
              title="发送"
              onClick={() => void send()}
              disabled={!input.trim()}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onFileChange}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            hidden
            onChange={onFileChange}
          />
        </>
      }
    />
  )
}
