import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  content: string
  isMine: boolean
  type?: string
  avatarUrl?: string
  nickname?: string
  hideAvatar?: boolean
  className?: string
}

const imageExts = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i
const videoExts = /\.(mp4|mov|webm|mkv)(\?|$)/i

export function MessageBubble({
  content,
  isMine,
  type,
  avatarUrl,
  nickname,
  hideAvatar,
  className,
}: MessageBubbleProps) {
  if (type === 'SYSTEM') {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-neutral-500 bg-white/5 px-3 py-1 rounded-full">{content}</span>
      </div>
    )
  }

  const isImage = imageExts.test(content)
  const isVideo = videoExts.test(content)

  return (
    <div
      className={cn(
        'flex items-end gap-2 mb-3 px-4',
        isMine ? 'flex-row-reverse' : 'flex-row',
        className,
      )}
    >
      {/* Avatar */}
      {!isMine && !hideAvatar && (
        <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
              {(nickname || '?')[0]}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          'max-w-[70%] px-4 py-2.5 rounded-2xl text-sm',
          isMine
            ? 'bg-blue-600/80 text-white rounded-br-md'
            : 'bg-white/[0.06] text-neutral-200 rounded-bl-md',
        )}
      >
        {isImage ? (
          <img src={content} alt="" className="max-w-[240px] rounded-lg" loading="lazy" />
        ) : isVideo ? (
          <video src={content} controls className="max-w-[240px] rounded-lg" preload="metadata" />
        ) : (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        )}
      </div>
    </div>
  )
}
