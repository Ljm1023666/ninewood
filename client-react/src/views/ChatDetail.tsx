import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { messageApi } from '@/api/message'
import { userApi } from '@/api/user'
import { ChatNavBar } from '@/components/ui/chat-navbar'
import { TimeDivider } from '@/components/ui/time-divider'
import { MessageBubble } from '@/components/ui/message-bubble'
import { ActionSheet } from '@/components/ui/action-sheet'

type ChatMessage = {
  id?: string; content: string; type?: string
  senderId?: string; receiverId?: string; fromUserId?: string; toUserId?: string
  fromUser?: { nickname: string; avatarUrl?: string }
  toUser?: { nickname: string; avatarUrl?: string }
  createdAt: string
}

export default function ChatDetail() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const userStore = useUserStore()
  const chatStore = useChatStore()

  const peerId = userId || ''
  const myId = userStore.user?.id || ''

  // 过滤出当前对话的消息
  const messages = chatStore.messages.filter((m: ChatMessage) =>
    ((m.senderId || m.fromUserId) === myId && (m.receiverId || m.toUserId) === peerId) ||
    ((m.senderId || m.fromUserId) === peerId && (m.receiverId || m.toUserId) === myId)
  )

  const [input, setInput] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showSheet, setShowSheet] = useState(false)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [peerUser, setPeerUser] = useState<{ nickname: string; avatarUrl: string | null } | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval>>()
  const [pollActive, setPollActive] = useState(false)

  // 取对端用户信息
  useEffect(() => {
    if (!peerId) return
    userApi.get(peerId).then(r => setPeerUser(r.data.data)).catch(() => setPeerUser(null))
    chatStore.fetchMessages(peerId)
    if (!chatStore.connected) startPolling()
    return () => stopPolling()
  }, [peerId])

  // 防止跟自己聊天
  useEffect(() => {
    if (peerId === myId) navigate('/messages', { replace: true })
  }, [peerId, myId])

  // 消息变化自动滚底
  useEffect(() => {
    scrollBottom()
  }, [messages.length])

  // socket 连接变化
  useEffect(() => {
    if (chatStore.connected) stopPolling()
    else if (peerId) startPolling()
  }, [chatStore.connected])

  function startPolling() {
    if (pollActive || chatStore.connected) return
    setPollActive(true)
    pollRef.current = setInterval(() => chatStore.fetchMessages(peerId), 10000)
  }
  function stopPolling() {
    setPollActive(false)
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = undefined }
  }

  const peerNickname = peerUser?.nickname || '聊天'

  function scrollBottom(force = false) {
    const el = listRef.current
    if (!el) return
    if (force) { el.scrollTop = el.scrollHeight; return }
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (atBottom) el.scrollTop = el.scrollHeight
  }

  async function send() {
    const text = input.trim()
    if (!text) return
    try {
      const res = await messageApi.send(peerId, text)
      useChatStore.setState((s) => ({ messages: [...s.messages, res.data.data] }))
      setInput('')
      setTimeout(() => scrollBottom(true), 100)
    } catch {}
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
      setUploadFile(f); setUploadPreview(URL.createObjectURL(f)); setUploadIsVideo(f.type.startsWith('video/'))
    }
  }

  async function sendFile() {
    if (!uploadFile) return
    try {
      const fd = new FormData(); fd.append('toUserId', peerId); fd.append('file', uploadFile); fd.append('content', '')
      await messageApi.sendForm(fd)
      setUploadFile(null); setUploadPreview(''); setUploadIsVideo(false)
      await chatStore.fetchMessages(peerId)
      setTimeout(() => scrollBottom(true), 100)
    } catch {}
  }

  function onSheetSelect(action: string) {
    setShowSheet(false)
    if (action === 'image') imageInputRef.current?.click()
    if (action === 'video') videoInputRef.current?.click()
  }

  const emojis = ['😀','😂','🤣','😍','🥰','😎','🤩','👍','🙏','💪','🔥','🎉','❤','💔','🎨','💻','📱','💰','⭐','✅','❌','🤝','🍳','🚗','☕','📖','🎵','🌙','✨','🎂']

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch bg-bg-primary">
      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-3xl shrink-0 flex-col self-center">
      <ChatNavBar nickname={peerNickname} />

      {/* 消息列表 */}
      <div ref={listRef} className="flex-1 overflow-y-auto thin-scroll py-2 flex flex-col">
        {messages.map((m: ChatMessage, idx: number) => (
          <div key={m.id || m.createdAt}>
            <TimeDivider timestamp={m.createdAt} prevTimestamp={idx > 0 ? messages[idx - 1].createdAt : null} />
            <MessageBubble
              content={m.content}
              isMine={(m.senderId || m.fromUserId) === myId}
              type={m.type}
              nickname={peerNickname}
              avatarUrl={peerUser?.avatarUrl || ''}
              hideAvatar={idx < messages.length - 1 && (messages[idx + 1]?.senderId || messages[idx + 1]?.fromUserId) === (m.senderId || m.fromUserId)}
            />
          </div>
        ))}
      </div>

      {/* 图片预览条 */}
      {uploadPreview && (
        <div className="flex gap-2 items-center px-4 py-2 border-t border-border bg-bg-secondary">
          {uploadIsVideo ? <video src={uploadPreview} controls muted className="w-16 h-16 rounded-md object-cover" />
            : <img src={uploadPreview} className="w-16 h-16 rounded-md object-cover" />}
          <button onClick={sendFile} className="text-sm px-3 py-1.5 rounded-md bg-[var(--primary-gradient)] text-white font-semibold">发送</button>
          <button onClick={() => { setUploadFile(null); setUploadPreview(''); setUploadIsVideo(false) }} className="text-sm text-text-muted">取消</button>
        </div>
      )}

      {/* Emoji 面板 */}
      {showEmoji && !showSheet && (
        <div className="flex flex-wrap gap-0.5 px-3 py-2.5 border-t border-border bg-card max-h-[200px] overflow-y-auto">
          {emojis.map((e) => (
            <span key={e} onClick={() => { setInput(input + e); setShowEmoji(false) }} className="text-[28px] cursor-pointer px-2 py-1.5 rounded-md hover:bg-bg-tertiary">{e}</span>
          ))}
        </div>
      )}

      <ActionSheet visible={showSheet} onClose={() => setShowSheet(false)} onSelect={onSheetSelect} />

      {/* 输入栏 */}
      <div className="flex gap-1 items-center px-2.5 py-2 bg-card border-t border-border">
        <button onClick={() => setIsVoiceMode(!isVoiceMode)} className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-transparent border-none text-text-secondary cursor-pointer rounded-full hover:bg-bg-tertiary">
          {isVoiceMode ? <span className="text-lg">🎤</span> : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="1" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/>
            </svg>
          )}
        </button>

        {isVoiceMode ? (
          <div className="flex-1 h-9 flex items-center justify-center bg-bg-secondary rounded-lg text-text-secondary text-sm font-semibold cursor-pointer select-none active:bg-bg-tertiary">
            按住 说话
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send() }}
              placeholder="输入消息..."
              className="w-full h-9 px-3 bg-bg-secondary border-none rounded-[18px] text-text-primary text-[15px] outline-none placeholder:text-text-muted"
            />
          </div>
        )}

        <button onClick={() => { setShowEmoji(!showEmoji); setShowSheet(false) }} className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-transparent border-none text-text-secondary cursor-pointer rounded-full hover:bg-bg-tertiary">
          <span className="text-[17px]">😊</span>
        </button>

        {input.trim() ? (
          <button onClick={send} className="h-9 px-[18px] flex-shrink-0 bg-[var(--success-color)] border-none rounded-md text-black text-sm font-semibold cursor-pointer hover:opacity-85 transition-opacity">
            发送
          </button>
        ) : (
          <button onClick={() => { setShowSheet(!showSheet); setShowEmoji(false) }} className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-transparent border-none text-text-secondary cursor-pointer rounded-full hover:bg-bg-tertiary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </button>
        )}

        <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={onFileChange} />
        <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={onFileChange} />
      </div>
      </div>
    </div>
  )
}
