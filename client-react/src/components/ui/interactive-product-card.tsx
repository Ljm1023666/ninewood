import {
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type TouchEvent,
  type HTMLAttributes,
} from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

export interface InteractiveProductCardProps
  extends HTMLAttributes<HTMLDivElement> {
  imageUrl: string
  logoUrl: string
  title: string
  description: string
  price: string
  /** 若提供，点击头像进入该路径（如 `/profile/:userId`） */
  avatarTo?: string
  /** 头像链接的无障碍说明 */
  avatarLabel?: string
  dotCount?: number
  activeDotIndex?: number
}

export function InteractiveProductCard({
  className,
  imageUrl,
  logoUrl,
  title,
  description,
  price,
  avatarTo,
  avatarLabel,
  dotCount = 4,
  activeDotIndex = 0,
  ...props
}: InteractiveProductCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties>({})

  const applyTilt = (clientX: number, clientY: number) => {
    if (!cardRef.current) return
    const { left, top, width, height } = cardRef.current.getBoundingClientRect()
    const x = clientX - left
    const y = clientY - top
    const rotateX = ((y - height / 2) / (height / 2)) * -8
    const rotateY = ((x - width / 2) / (width / 2)) * 8
    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`,
      transition: "transform 0.1s ease-out",
    })
  }

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    applyTilt(e.clientX, e.clientY)
  }

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return
    applyTilt(e.touches[0].clientX, e.touches[0].clientY)
  }

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return
    applyTilt(e.touches[0].clientX, e.touches[0].clientY)
  }

  const handleMouseLeave = () => {
    setStyle({
      transform:
        "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "transform 0.4s ease-in-out",
    })
  }

  const safeDots = Math.min(Math.max(dotCount, 1), 12)
  const safeActive = Math.min(Math.max(activeDotIndex, 0), safeDots - 1)

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseLeave}
      style={style}
      className={cn(
        "relative aspect-[9/12] w-full max-w-[340px] rounded-3xl bg-card shadow-lg",
        "[transform-style:preserve-3d]",
        /* 触摸倾斜时减少整页跟手滚动冲突；仍可从卡片外区域滑动页面 */
        "touch-manipulation",
        className,
      )}
      {...props}
    >
      <img
        src={imageUrl}
        alt={title}
        className="absolute inset-0 h-full w-full rounded-3xl object-cover transition-transform duration-300"
        style={{ transform: "translateZ(-20px) scale(1.1)" }}
      />
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

      <div
        className="absolute inset-0 flex flex-col p-5"
        style={{ transform: "translateZ(40px)" }}
      >
        <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
          <div className="min-w-0 flex-1 pr-1">
            <h3 className="text-xl font-bold leading-tight text-white">{title}</h3>
            <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-white/70">
              {description}
            </p>
          </div>
          {avatarTo ? (
            <Link
              to={avatarTo}
              className="shrink-0 rounded-full outline-none ring-2 ring-white/25 transition hover:ring-white/55 focus-visible:ring-white"
              aria-label={avatarLabel || "查看用户主页"}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={logoUrl}
                alt=""
                className="h-12 w-12 rounded-full object-cover"
              />
            </Link>
          ) : (
            <img
              src={logoUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white/25"
            />
          )}
        </div>

        <div className="absolute top-[124px] left-5">
          <div className="rounded-full bg-black/40 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
            {price}
          </div>
        </div>

        <div className="mt-auto flex w-full justify-center gap-2 pb-2">
          {Array.from({ length: safeDots }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                index === safeActive ? "bg-white" : "bg-white/30",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
