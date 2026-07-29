import { useMemo } from 'react'
import {
  toCardCoverThumbUrl,
  toProfileCoverThumbUrl,
} from '@/utils/user-cover-presets'
import { DisplayCoverPicture } from '@/components/ui/display-cover-picture'
import { useThemeStore } from '@/stores/theme'

/**
 * 全栏氛围背景（Layout / 主栏后方）。
 * 默认：纯色底（无背景图、无渐变），供液态玻璃透色。
 * 仅当传入 coverUrl 时叠模糊封面（个人主页）。
 */
export function UserCoverAmbientBg({
  coverUrl,
}: {
  /** 已废弃：氛围不再按用户 ID 抽预设 */
  userId?: string
  /** 个人主页已设置的封面；空则不用图片 */
  coverUrl?: string | null
}) {
  const isDark = useThemeStore((s) => s.current.dark)
  const trimmed = typeof coverUrl === 'string' ? coverUrl.trim() : ''
  const ambientSrc = trimmed
    ? trimmed.startsWith('/uploads/covers/')
      ? toProfileCoverThumbUrl(trimmed)
      : trimmed.startsWith('/uploads/card-covers/')
        ? toCardCoverThumbUrl(trimmed)
        : trimmed
    : null
  const imageClass = useMemo(
    () =>
      isDark
        ? 'absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.58] blur-xl saturate-[1.12]'
        : 'absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.5] blur-lg saturate-[1.05]',
    [isDark],
  )
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 min-h-[100%] overflow-hidden bg-bg-primary"
      aria-hidden
    >
      {ambientSrc ? (
        <>
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
        </>
      ) : null}
    </div>
  )
}
