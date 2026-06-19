import { publisherUserCoverPreset } from '@/utils/user-cover-presets'

/** 全栏模糊封面 + 遮罩，作页面氛围背景（主内容区内 absolute 铺满）。优先用用户上传封面（如 /uploads/covers/…），否则预设图。 */
export function UserCoverAmbientBg({
  userId,
  coverUrl,
}: {
  userId?: string
  coverUrl?: string | null
}) {
  const trimmed = typeof coverUrl === 'string' ? coverUrl.trim() : ''
  const url = trimmed || publisherUserCoverPreset(userId)
  return (
    <div className="pointer-events-none absolute inset-0 z-0 min-h-[100%] overflow-hidden" aria-hidden>
      {/* 提高不透明度、略减遮罩，否则移动端看起来像「纯黑底无背景」 */}
      <img
        src={url}
        alt=""
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.58] blur-2xl saturate-[1.12]"
      />
      <div className="absolute inset-0 bg-bg-primary/38" />
      <div
        className="absolute inset-0 bg-gradient-to-b from-bg-primary/55 via-transparent to-bg-primary/70"
        aria-hidden
      />
    </div>
  )
}
