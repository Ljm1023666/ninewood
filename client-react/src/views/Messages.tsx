import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatChatTime } from '@/utils/time'
import { messageApi } from '@/api/message'

export default function Messages() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetchConversations() {
    setLoading(true)
    setError('')
    try {
      const res = await messageApi.conversations()
      setConversations(res.data.data)
    } catch (e: any) {
      setError(e.response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchConversations()
  }, [])

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch overflow-y-auto thin-scroll bg-bg-primary">
      {error && (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-sm text-text-muted">
          <p>{error}</p>
          <button type="button" onClick={() => void fetchConversations()} className="mt-3 text-accent">
            重试
          </button>
        </div>
      )}

      {loading && !error && (
        <div className="flex flex-1 items-center justify-center py-16 text-sm text-text-muted">加载中...</div>
      )}

      {!loading && !error && (
        <div className="relative z-10 mx-auto box-border flex w-full max-w-3xl shrink-0 flex-col self-center px-4 pb-8 pt-6 sm:px-6">
          <div className="mb-2 flex min-w-0 items-baseline justify-between gap-3">
            <span className="text-2xl font-extrabold tracking-[-0.3px] text-text-primary">消息</span>
            {conversations.length > 0 && (
              <span className="shrink-0 whitespace-nowrap text-xs text-text-muted">{conversations.length} 个对话</span>
            )}
          </div>

          {conversations.length === 0 && (
            <div className="py-16 text-center text-sm text-text-muted">
              <p className="mb-3 text-4xl">💬</p>
              <p>还没有消息，去首页找人聊聊吧</p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-4 rounded-lg bg-[var(--primary-gradient)] px-6 py-2 text-sm font-semibold text-white"
              >
                去首页
              </button>
            </div>
          )}

          {conversations.map((c) => (
            <div
              key={c.user.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/messages/${c.user.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/messages/${c.user.id}`)}
              className="flex cursor-pointer items-center gap-3.5 px-1 py-4 transition-all hover:translate-x-1 hover:bg-bg-secondary active:scale-[0.985]"
            >
              <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-bg-tertiary to-card">
                {c.user.avatarUrl ? (
                  <img src={c.user.avatarUrl} className="h-full w-full object-cover" loading="lazy" alt="" />
                ) : (
                  <span className="text-lg font-bold text-text-secondary">{c.user.nickname?.charAt(0)}</span>
                )}
                {c.unreadCount > 0 && (
                  <div className="absolute right-1 top-1 h-2.5 w-2.5 animate-[dot-pulse_2s_ease-in-out_infinite] rounded-full bg-[var(--error-color)]" />
                )}
              </div>
              <div className="min-w-0 flex-1 border-b border-border pb-0.5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[17px] font-semibold text-text-primary">{c.user.nickname}</span>
                  <span className="ml-2 flex-shrink-0 text-xs text-text-muted">
                    {formatChatTime(c.lastMessage?.createdAt)}
                  </span>
                </div>
                <p className="truncate text-[13px] text-text-muted">
                  {c.lastMessage?.content?.slice(0, 40) || '暂无消息'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
