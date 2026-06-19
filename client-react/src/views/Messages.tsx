import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatChatTime } from '@/utils/time'
import { messageApi } from '@/api/message'
import { useUserStore } from '@/stores/user'

export default function Messages() {
  const navigate = useNavigate()
  const userStore = useUserStore()
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetchConversations() {
    setLoading(true); setError('')
    try {
      const res = await messageApi.conversations()
      setConversations(res.data.data)
    } catch (e: any) {
      setError(e.response?.data?.message || '加载失败')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchConversations() }, [])

  return (
    <div className="h-full overflow-y-auto thin-scroll bg-bg-primary max-w-3xl mx-auto">
      {error && (
        <div className="text-center py-16 text-text-muted text-sm">
          <p>{error}</p>
          <button onClick={fetchConversations} className="mt-3 text-accent text-sm">重试</button>
        </div>
      )}

      {loading && !error && (
        <div className="text-center py-16 text-text-muted text-sm">加载中...</div>
      )}

      {!loading && !error && (
        <div className="flex flex-col">
          <div className="flex items-baseline justify-between px-5 pt-5 pb-2">
            <span className="text-2xl font-extrabold text-text-primary tracking-[-0.3px]">消息</span>
            {conversations.length > 0 && <span className="text-xs text-text-muted">{conversations.length} 个对话</span>}
          </div>

          {conversations.length === 0 && (
            <div className="text-center py-16 text-text-muted text-sm">
              <p className="text-4xl mb-3">💬</p>
              <p>还没有消息，去首页找人聊聊吧</p>
              <button onClick={() => navigate('/')} className="mt-4 px-6 py-2 rounded-lg bg-[var(--primary-gradient)] text-white text-sm font-semibold">去首页</button>
            </div>
          )}

          {conversations.map((c) => (
            <div
              key={c.user.id}
              onClick={() => navigate(`/messages/${c.user.id}`)}
              className="flex gap-3.5 px-5 py-4 cursor-pointer items-center hover:bg-bg-secondary hover:translate-x-1 transition-all active:scale-[0.985]"
            >
              <div className="relative w-12 h-12 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-bg-tertiary to-card flex items-center justify-center">
                {c.user.avatarUrl ? (
                  <img src={c.user.avatarUrl} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-lg font-bold text-text-secondary">{c.user.nickname?.charAt(0)}</span>
                )}
                {c.unreadCount > 0 && (
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[var(--error-color)] animate-[dot-pulse_2s_ease-in-out_infinite]" />
                )}
              </div>
              <div className="flex-1 min-w-0 pb-0.5 border-b border-border">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[17px] text-text-primary font-semibold">{c.user.nickname}</span>
                  <span className="text-xs text-text-muted flex-shrink-0 ml-2">{formatChatTime(c.lastMessage?.createdAt)}</span>
                </div>
                <p className="text-[13px] text-text-muted truncate">{c.lastMessage?.content?.slice(0, 40) || '暂无消息'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
