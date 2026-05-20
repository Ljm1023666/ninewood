import { useMemo } from 'react'
import { publisherUserCoverPreset } from '@/utils/user-cover-presets'
import { useThemeStore } from '@/stores/theme'

/** 全栏模糊封面 + 遮罩，作页面氛围背景（主内容区内 absolute 铺满）。优先用用户上传封面（如 /uploads/covers/…），否则预设图。 */
export function UserCoverAmbientBg({
  userId,
  coverUrl,
}: {
  userId?: string
  coverUrl?: string | null
}) {
  const isDark = useThemeStore((s) => s.current.dark)
  const trimmed = typeof coverUrl === 'string' ? coverUrl.trim() : ''
  const url = trimmed || publisherUserCoverPreset(userId)
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
      {/* 亮暗模式分支：浅色避免被 bg-primary 叠层“洗白” */}
      <img src={url} alt="" className={imageClass} />
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
