import { useMemo } from 'react'
import {
  toCardCoverThumbUrl,
  toProfileCoverThumbUrl,
  themeAmbientBgUrl,
} from '@/utils/user-cover-presets'
import { DisplayCoverPicture } from '@/components/ui/display-cover-picture'
import { useThemeStore } from '@/stores/theme'

/**
 * 全栏模糊氛围背景（Layout / 主栏后方）。
 * 默认：浅/深主题固定图（不跟个人主页变）。
 * 仅当传入已设置的 coverUrl 时覆盖（个人主页有封面）。
 */
export function UserCoverAmbientBg({
  coverUrl,
}: {
  /** 已废弃：氛围不再按用户 ID 抽预设 */
  userId?: string
  /** 个人主页已设置的封面；空则用主题默认图 */
  coverUrl?: string | null
}) {
  const isDark = useThemeStore((s) => s.current.dark)
  const trimmed = typeof coverUrl === 'string' ? coverUrl.trim() : ''
  const rawUrl = trimmed || themeAmbientBgUrl(isDark)
  const ambientSrc = trimmed.startsWith('/uploads/covers/')
    ? toProfileCoverThumbUrl(trimmed)
    : rawUrl.startsWith('/uploads/card-covers/')
      ? toCardCoverThumbUrl(rawUrl)
      : rawUrl
  const imageClass = useMemo(
    () =>
      isDark
        ? 'absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.58] blur-xl saturate-[1.12]'
        : 'absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.5] blur-lg saturate-[1.05]',
    [isDark],
  )
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 min-h-[100%] overflow-hidden"
      aria-hidden
    >
      <DisplayCoverPicture
        sources={ambientSrc}
        alt=""
        className={imageClass}
        pictureClassName="absolute inset-0 block h-full w-full"
        loading="eager"
        fetchPriority="low"
      />
      <div
        className={
          isDark
            ? 'absolute inset-0 bg-bg-primary/38'
            : 'absolute inset-0 bg-bg-primary/26'
        }
      />
      <div
        className={
          isDark
            ? 'absolute inset-0 bg-gradient-to-b from-bg-primary/55 via-transparent to-bg-primary/70'
            : 'absolute inset-0 bg-gradient-to-b from-bg-primary/36 via-bg-primary/12 to-bg-primary/40'
        }
        aria-hidden
      />
    </div>
  )
}
