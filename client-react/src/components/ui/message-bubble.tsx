import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  content: string
  isMine: boolean
  type?: string
  avatarUrl?: string
  nickname?: string
  /** 同发送者连续消息中非最后一条：隐藏头像并收紧与下一条的间距 */
  hideAvatar?: boolean
  /** 上一条为同发送者：用于气泡圆角分组样式 */
  isGroupedWithPrev?: boolean
  timestamp?: string
  className?: string
}

const imageExts = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i
const videoExts = /\.(mp4|mov|mkv)(\?|$)/i

export function MessageBubble({
  content,
  isMine,
  type,
  avatarUrl,
  nickname,
  hideAvatar,
  timestamp,
  className,
}: MessageBubbleProps) {
  if (type === 'SYSTEM') {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs px-3 py-1 rounded-full bg-bg-secondary/70 text-text-muted">
          {content}
        </span>
      </div>
    )
  }

  const isImage = imageExts.test(content)
  const isVideo = videoExts.test(content)

  const showAvatar = !hideAvatar

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3',
        isMine ? 'flex-row-reverse' : 'flex-row',
        className,
      )}
    >
      {showAvatar ? (
        <div
          className={cn(
            'w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-sm font-medium',
            isMine ? 'bg-[var(--accent-color)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
          )}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            (nickname || '?')[0]
          )}
        </div>
      ) : (
        <div className="w-10 shrink-0" aria-hidden />
      )}

      <div className="flex flex-col gap-0.5 max-w-[72%]">
        {!isMine && nickname && (
          <span className="text-[11px] text-text-muted px-1">{nickname}</span>
        )}

        <div className="flex items-end gap-1.5">
          <div
            className={cn(
              'rounded-xl px-4 py-2.5 text-sm leading-relaxed',
              isMine ? 'bg-[var(--accent-color)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]',
            )}
          >
            {isImage ? (
              <img
                src={content}
                alt=""
                className="max-w-[200px] rounded-lg"
                loading="lazy"
              />
            ) : isVideo ? (
              <video
                src={content}
                controls
                className="max-w-[200px] rounded-lg"
                preload="metadata"
              />
            ) : (
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {content}
              </p>
            )}
          </div>

          {timestamp && (
            <span
              className={cn(
                'text-[11px] mt-0.5',
                isMine ? 'text-white/50' : 'text-[var(--text-muted)]',
              )}
            >
              {timestamp}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
