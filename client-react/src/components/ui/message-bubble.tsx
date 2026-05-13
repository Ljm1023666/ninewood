import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/theme'

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
/** 聊天里 .webm 多为语音（MediaRecorder）；视频用 mp4/mov/mkv 为主 */
const videoExts = /\.(mp4|mov|mkv)(\?|$)/i
const voicePathPattern = /\/uploads\/voice-/
const uploadAudioExt = /\/uploads\/[^?#]+\.(webm|mp3|wav|ogg|m4a)(\?|#|$)/i

/** 同屏仅一条语音在播：派发 id，其它实例收到后暂停 */
const VOICE_PLAY_EVENT = 'ninewood:voice-play'

export function MessageBubble({
  content,
  isMine,
  type,
  avatarUrl,
  nickname,
  hideAvatar,
  className,
}: MessageBubbleProps) {
  const isDark = useThemeStore((s) => s.current.dark)

  if (type === 'SYSTEM') {
    return (
      <div className="flex justify-center py-2">
        <span
          className={cn(
            'text-xs px-3 py-1 rounded-full',
            isDark
              ? 'text-neutral-500 bg-white/5'
              : 'text-text-muted bg-black/[0.04]',
          )}
        >
          {content}
        </span>
      </div>
    )
  }

  const isImage = imageExts.test(content)
  const isVideo = videoExts.test(content)
  const isVoice =
    type === 'VOICE' ||
    voicePathPattern.test(content) ||
    uploadAudioExt.test(content)

  return (
    <div
      className={cn(
        'flex items-end gap-2 mb-3 px-4',
        isMine ? 'flex-row-reverse' : 'flex-row',
        className,
      )}
    >
      {!isMine && !hideAvatar && (
        <div
          className={cn(
            'w-8 h-8 rounded-full overflow-hidden shrink-0',
            isDark ? 'bg-white/10' : 'bg-black/[0.06]',
          )}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
              {(nickname || '?')[0]}
            </div>
          )}
        </div>
      )}

      {isVoice ? (
        <VoiceBubble src={content} isMine={isMine} isDark={isDark} />
      ) : (
        <div
          className={cn(
            'max-w-[70%] px-4 py-2.5 rounded-2xl text-sm',
            isMine
              ? 'bg-blue-600/80 text-white rounded-br-md'
              : cn(
                  'rounded-bl-md',
                  isDark
                    ? 'bg-white/[0.06] text-neutral-200'
                    : 'bg-black/[0.05] text-text-primary',
                ),
          )}
        >
          {isImage ? (
            <img
              src={content}
              alt=""
              className="max-w-[240px] rounded-lg"
              loading="lazy"
            />
          ) : isVideo ? (
            <video
              src={content}
              controls
              className="max-w-[240px] rounded-lg"
              preload="metadata"
            />
          ) : (
            <p className="whitespace-pre-wrap break-words">{content}</p>
          )}
        </div>
      )}
    </div>
  )
}

/** 微信风格：左侧竖条 + 向右张开的短弧线 */
function WeChatVoiceGlyph({
  className,
  outward,
}: {
  className?: string
  outward: 'left' | 'right'
}) {
  return (
    <svg
      className={cn(
        'h-[18px] w-[22px] shrink-0 text-current',
        outward === 'left' && 'scale-x-[-1]',
        className,
      )}
      viewBox="0 0 22 18"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 3v12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.5 5.5c2.4 1.4 2.4 5.6 0 7"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        opacity={0.88}
      />
      <path
        d="M9 3.2c3.8 2.1 3.8 9.5 0 11.6"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
      <path
        d="M11.5 1.6c5.2 2.9 5.2 11.9 0 14.8"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity={0.82}
      />
    </svg>
  )
}

/** 抖音感：细竖条波形，仅在播放时起伏 */
function VoiceWaveBars({ playing }: { playing: boolean }) {
  const heights = [0.35, 0.55, 0.85, 0.5, 0.7] as const
  return (
    <div className="flex h-[18px] min-w-[32px] max-w-[52px] flex-1 items-center justify-center gap-[3px] px-0.5">
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-[2.5px] max-w-[3px] flex-1 rounded-full bg-current"
          style={{
            height: playing ? undefined : `${4 + h * 10}px`,
            opacity: playing ? 0.85 : 0.45,
            animation: playing
              ? `voice-wave 0.55s ease-in-out ${i * 0.08}s infinite alternate`
              : undefined,
            maxHeight: playing ? `${6 + h * 12}px` : undefined,
          }}
        />
      ))}
    </div>
  )
}

function VoiceBubble({
  src,
  isMine,
  isDark,
}: {
  src: string
  isMine: boolean
  isDark: boolean
}) {
  const instanceId = useRef<string | null>(null)
  if (instanceId.current === null) {
    instanceId.current = `v-${
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    }`
  }

  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (id !== instanceId.current && audioRef.current) {
        audioRef.current.pause()
        setPlaying(false)
      }
    }
    window.addEventListener(VOICE_PLAY_EVENT, handler)
    return () => window.removeEventListener(VOICE_PLAY_EVENT, handler)
  }, [])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onMeta = () =>
      setDuration(Number.isFinite(a.duration) && a.duration > 0 ? a.duration : 0)
    const onEnded = () => setPlaying(false)
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('ended', onEnded)
    return () => {
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('ended', onEnded)
    }
  }, [src])

  function toggle() {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause()
      a.currentTime = 0
      setPlaying(false)
      return
    }
    window.dispatchEvent(
      new CustomEvent(VOICE_PLAY_EVENT, { detail: instanceId.current }),
    )
    void a.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }

  const sec = duration > 0 ? Math.max(1, Math.ceil(duration)) : 0
  const durText = sec > 0 ? `${sec}″` : '···'
  /** 参考微信：时长越长条略宽，有上下限 */
  const barMin = isMine ? 108 : 100
  const barW = Math.min(220, barMin + Math.min(sec, 60) * 5)

  return (
    <button
      type="button"
      onClick={toggle}
      style={{ width: barW, maxWidth: '72%' }}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-left outline-none transition-[transform,opacity] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--primary-start)]/40',
        isMine
          ? 'flex-row-reverse bg-blue-600/90 text-white rounded-br-sm shadow-sm'
          : cn(
              'flex-row rounded-bl-sm shadow-sm',
              isDark
                ? 'bg-white/[0.08] text-neutral-100'
                : 'bg-black/[0.06] text-text-primary',
            ),
      )}
      aria-label={playing ? '暂停语音' : `播放语音 ${durText}`}
    >
      <audio ref={audioRef} className="hidden" src={src} preload="metadata" />

      <span
        className={cn(
          'shrink-0 tabular-nums text-[13px] leading-none',
          isMine ? 'text-white/90' : isDark ? 'text-white/75' : 'text-text-secondary',
        )}
      >
        {durText}
      </span>

      {playing ? (
        <VoiceWaveBars playing />
      ) : (
        <WeChatVoiceGlyph outward={isMine ? 'right' : 'left'} />
      )}
    </button>
  )
}
