import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  MessageContextMenu,
  SendStatusIndicator,
} from '@/components/ui/message-chat-extras'
import { toast } from '@/components/ui/confirm-dialog'

export type MessageSendStatus = 'sending' | 'failed'

interface MessageBubbleProps {
  content: string
  isMine: boolean
  type?: string
  avatarUrl?: string
  nickname?: string
  hideAvatar?: boolean
  isGroupedWithPrev?: boolean
  isGroupedWithNext?: boolean
  showTimestamp?: boolean
  timestamp?: string
  sendStatus?: MessageSendStatus
  onRetry?: () => void
  onImageClick?: (src: string) => void
  className?: string
}

const imageExts = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i
const videoExts = /\.(mp4|mov|mkv)(\?|$)/i
const AGENT_TASK_TAG = '[AGENT_TASK]'

function SystemMessage({ content }: { content: string }) {
  if (content.includes(AGENT_TASK_TAG)) {
    const lines = content.replace(AGENT_TASK_TAG, '').trim().split('\n')
    const title = lines[0]?.trim() || '自动化任务'
    const body = lines.slice(1).join('\n').trim() || content
    return (
      <div className="msg-agent-card">
        <p className="msg-agent-card__label">自动化推送</p>
        <p className="msg-agent-card__title">{title}</p>
        <p className="msg-agent-card__body">{body}</p>
        <Link to="/agent/tasks" className="msg-agent-card__link">
          查看结果箱 →
        </Link>
      </div>
    )
  }

  return (
    <div className="msg-system">
      <span className="msg-system__pill">{content}</span>
    </div>
  )
}

export function MessageBubble({
  content,
  isMine,
  type,
  avatarUrl,
  nickname,
  hideAvatar,
  isGroupedWithPrev = false,
  isGroupedWithNext = false,
  sendStatus,
  onRetry,
  onImageClick,
  className,
}: MessageBubbleProps) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      toast('已复制', 'success')
    } catch {
      toast('复制失败', 'error')
    }
  }, [content])

  if (type === 'SYSTEM') {
    return <SystemMessage content={content} />
  }

  const isImage = imageExts.test(content)
  const isVideo = videoExts.test(content)
  const isMedia = isImage || isVideo
  const showAvatar = !hideAvatar

  return (
    <>
      <div
        className={cn(
          'msg-row',
          isGroupedWithNext && 'msg-row--grouped',
          className,
        )}
        onContextMenu={(e) => {
          if (isMedia) return
          e.preventDefault()
          setMenuPos({ x: e.clientX, y: e.clientY })
        }}
      >
        <div
          className={cn(
            'msg-row__inner',
            isMine && 'msg-row__inner--mine',
          )}
        >
          <div className={cn('msg-row__cluster', isMine && 'msg-row__cluster--mine')}>
            {!isMine && nickname && !isGroupedWithPrev && (
              <span className="msg-nickname">{nickname}</span>
            )}

            <div
              className={cn(
                'msg-row__bubble-line',
                isMine && 'msg-row__bubble-line--mine',
              )}
            >
              {showAvatar ? (
                <div className="msg-avatar">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" />
                  ) : (
                    (nickname || '?')[0]
                  )}
                </div>
              ) : (
                <div className="msg-avatar msg-avatar--placeholder" aria-hidden />
              )}

              <div
                className={cn(
                  'msg-bubble-wrap',
                  isMine && 'msg-bubble-wrap--mine',
                )}
              >
                {sendStatus && isMine && (
                  <SendStatusIndicator
                    status={sendStatus}
                    onRetry={onRetry}
                  />
                )}

                <div
                  className={cn(
                    'msg-bubble',
                    isMine ? 'msg-bubble--mine' : 'msg-bubble--peer',
                    isGroupedWithPrev && 'msg-bubble--group-prev',
                    isGroupedWithNext && 'msg-bubble--group-next',
                    isMedia && 'msg-bubble--media',
                    isImage && onImageClick && 'msg-bubble--clickable',
                  )}
                  onClick={
                    isImage && onImageClick
                      ? () => onImageClick(content)
                      : undefined
                  }
                  onKeyDown={
                    isImage && onImageClick
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onImageClick(content)
                          }
                        }
                      : undefined
                  }
                  role={isImage && onImageClick ? 'button' : undefined}
                  tabIndex={isImage && onImageClick ? 0 : undefined}
                >
                  {isImage ? (
                    <img
                      src={content}
                      alt=""
                      className="msg-bubble__image"
                      loading="lazy"
                      draggable={false}
                    />
                  ) : isVideo ? (
                    <video
                      src={content}
                      controls
                      className="msg-bubble__video"
                      preload="metadata"
                    />
                  ) : (
                    <p className="msg-bubble__text">{content}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {menuPos && (
        <MessageContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onCopy={handleCopy}
          onClose={() => setMenuPos(null)}
        />
      )}
    </>
  )
}
