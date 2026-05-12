import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type CSSProperties,
  type MouseEvent,
  type TouchEvent,
  type HTMLAttributes,
} from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useThemeStore } from '@/stores/theme'

export interface InteractiveProductCardProps
  extends HTMLAttributes<HTMLDivElement> {
  imageUrl: string
  logoUrl: string
  title: string
  description: string
  price: string
  avatarTo?: string
  avatarLabel?: string
  dotCount?: number
  activeDotIndex?: number
  /** 上滑/滚轮向下 → 下一张 */
  onSwipeNext?: () => void
  /** 下滑/滚轮向上 → 上一张 */
  onSwipePrev?: () => void
  /** 为 true 时由外层垂直拖动手势切页，关闭内部滑切/滚轮切页 */
  externalVerticalDrag?: boolean
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
  onSwipeNext,
  onSwipePrev,
  externalVerticalDrag = false,
  ...props
}: InteractiveProductCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const isDark = useThemeStore((s) => s.current.dark)
  const [style, setStyle] = useState<CSSProperties>({})
  const touchActive = useRef(false)
  const neutralLockedRef = useRef(false)
  const calibrateTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const touchStartY = useRef(0)
  const onSwipeNextRef = useRef(onSwipeNext)
  const onSwipePrevRef = useRef(onSwipePrev)
  onSwipeNextRef.current = onSwipeNext
  onSwipePrevRef.current = onSwipePrev
  const removeMouseSwipeListenersRef = useRef<(() => void) | null>(null)
  /** 粗指针设备：禁用触摸移动跟手 3D（touchmove 会极频繁 setState）；陀螺仪仍可用 */
  const coarsePointerRef = useRef(false)
  useEffect(() => {
    coarsePointerRef.current = window.matchMedia("(pointer: coarse)").matches
  }, [])

  // 切换卡片或内容变化时清空 3D tilt，避免滑动过程与松手后视觉不一致
  useEffect(() => {
    setStyle({})
    return () => {
      removeMouseSwipeListenersRef.current?.()
      removeMouseSwipeListenersRef.current = null
    }
  }, [imageUrl, logoUrl, title, description, price])

  const applyTilt = useCallback((x: number, y: number) => {
    if (!cardRef.current) return
    const { width, height } = cardRef.current.getBoundingClientRect()
    const rotateX = ((y - 0.5) * 2) * -10
    const rotateY = ((x - 0.5) * 2) * 10
    setStyle({
      transform: `perspective(1000px) rotateX(${(rotateX / 10) * 7}deg) rotateY(${(rotateY / 10) * 7}deg) scale3d(1.06, 1.06, 1.06)`,
      transition: "transform 0.15s ease-out",
    })
  }, [])

  // ── 桌面：鼠标跟动 ──
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!externalVerticalDrag && (onSwipeNextRef.current || onSwipePrevRef.current) && (e.buttons & 1)) {
      return
    }
    if (!cardRef.current) return
    const { left, top, width, height } = cardRef.current.getBoundingClientRect()
    const rx = ((e.clientY - top) / height - 0.5) * 2
    const ry = ((e.clientX - left) / width - 0.5) * 2
    setStyle({
      transform: `perspective(800px) rotateX(${rx * -7}deg) rotateY(${ry * 7}deg) scale3d(1.06, 1.06, 1.06)`,
      transition: "transform 0.1s ease-out",
    })
  }

  // ── 触摸：手指跟动（与陀螺仪共存）──
  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return
    if (coarsePointerRef.current) return
    touchActive.current = true
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    const rx = ((e.touches[0].clientY - rect.top) / rect.height - 0.5) * 2
    const ry = ((e.touches[0].clientX - rect.left) / rect.width - 0.5) * 2
    setStyle({
      transform: `perspective(800px) rotateX(${rx * -7}deg) rotateY(${ry * 7}deg) scale3d(1.06, 1.06, 1.06)`,
      transition: "transform 0.1s ease-out",
    })
  }

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (externalVerticalDrag) {
      touchStartY.current = e.touches[0]?.clientY ?? 0
      return
    }
    touchActive.current = true
    touchStartY.current = e.touches[0]?.clientY ?? 0
    handleTouchMove(e)
  }

  const resetTilt = () => {
    touchActive.current = false
    neutralLockedRef.current = false
    clearTimeout(calibrateTimerRef.current)
    calibrateTimerRef.current = setTimeout(() => { neutralLockedRef.current = true }, 500)
  }

  // 触摸结束：检测滑动方向
  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (externalVerticalDrag) {
      resetTilt()
      return
    }
    const endY = (e as any).changedTouches?.[0]?.clientY ?? touchStartY.current
    const dy = touchStartY.current - endY
    if (dy > 50 && onSwipeNext) onSwipeNext()
    else if (dy < -50 && onSwipePrev) onSwipePrev()
    else resetTilt()
  }

  /** 左键按下后在任意位置松手：按垂直位移切上/下一张（与触摸阈值一致） */
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (externalVerticalDrag) return
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('a, button, [role="button"]')) return
    if (!onSwipeNextRef.current && !onSwipePrevRef.current) return

    removeMouseSwipeListenersRef.current?.()
    const startY = e.clientY
    let finished = false
    const finish = (ev: MouseEvent) => {
      if (finished) return
      finished = true
      window.removeEventListener('mouseup', finish, true)
      window.removeEventListener('blur', onBlur)
      removeMouseSwipeListenersRef.current = null
      const dy = startY - ev.clientY
      if (dy > 50 && onSwipeNextRef.current) onSwipeNextRef.current()
      else if (dy < -50 && onSwipePrevRef.current) onSwipePrevRef.current()
      else resetTilt()
    }
    const onBlur = () => {
      if (finished) return
      finished = true
      window.removeEventListener('mouseup', finish, true)
      window.removeEventListener('blur', onBlur)
      removeMouseSwipeListenersRef.current = null
      resetTilt()
    }
    window.addEventListener('mouseup', finish, true)
    window.addEventListener('blur', onBlur)
    removeMouseSwipeListenersRef.current = () => {
      if (!finished) {
        finished = true
        window.removeEventListener('mouseup', finish, true)
        window.removeEventListener('blur', onBlur)
      }
    }
  }

  const handleMouseLeave = (e: MouseEvent<HTMLDivElement>) => {
    if (e.buttons & 1) return
    resetTilt()
  }

  // 鼠标滚轮
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (externalVerticalDrag) return
    if (e.deltaY > 30 && onSwipeNext) onSwipeNext()
    else if (e.deltaY < -30 && onSwipePrev) onSwipePrev()
  }

  // ── 陀螺仪 + 加速度计（手机也启用；触摸跟手倾斜仍关闭以防 touchmove 爆刷）
  // 传感器回调用 rAF 合并到每帧最多一次 setState，减轻掉帧
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {}

    const w = window as any
    const DoeCtor = w.DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> })
      | undefined

    let cleanup: (() => void) | undefined
    let orientationFired = false
    let neutralBeta = 0
    let neutralGamma = 0

    // 重置中性位
    function resetNeutral() {
      neutralLockedRef.current = false
      clearTimeout(calibrateTimerRef.current)
      calibrateTimerRef.current = setTimeout(() => {
        neutralLockedRef.current = true
      }, 500)
    }

    let rafId: number | null = null
    let pendingStyle: CSSProperties | null = null

    function flushStyle() {
      rafId = null
      if (pendingStyle == null || touchActive.current) {
        pendingStyle = null
        return
      }
      setStyle(pendingStyle)
      pendingStyle = null
    }

    function scheduleSetStyle(next: CSSProperties) {
      if (touchActive.current) return
      pendingStyle = next
      if (rafId == null) rafId = requestAnimationFrame(flushStyle)
    }

    const applyGyro = (rxNorm: number, ryNorm: number) => {
      if (touchActive.current) return
      const rx = Math.max(-1, Math.min(1, rxNorm))
      const ry = Math.max(-1, Math.min(1, ryNorm))
      scheduleSetStyle({
        transform: `perspective(800px) rotateX(${rx * -7}deg) rotateY(${ry * 7}deg) scale3d(1.06, 1.06, 1.06)`,
        transition: "transform 0.08s ease-out",
      })
    }

    function handleOrientation(e: any) {
      if (e.beta == null || e.gamma == null) return
      orientationFired = true

      // 前 0.5 秒持续更新中性位（平滑锁定）
      if (!neutralLockedRef.current) {
        const W = 0.85 // 指数平滑权重
        neutralBeta = neutralBeta * W + e.beta * (1 - W)
        neutralGamma = neutralGamma * W + e.gamma * (1 - W)
        // 中性位未锁定时卡片归正
        scheduleSetStyle({
          transform: "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1.06, 1.06, 1.06)",
          transition: "transform 0.15s ease-out",
        })
        return
      }

      // 锁定后：相对偏移计算倾斜
      const deltaBeta = e.beta - neutralBeta
      const deltaGamma = e.gamma - neutralGamma
      applyGyro(deltaBeta / 30, deltaGamma / 30)
    }

    function handleMotion(e: any) {
      if (orientationFired) return
      const ag = e.accelerationIncludingGravity
      if (!ag || ag.x == null) return
      const rx = (ag.y ?? 0) / 9.8
      const ry = (ag.x ?? 0) / 9.8
      applyGyro(rx, ry)
    }

    function attachSensors() {
      window.addEventListener("deviceorientation", handleOrientation)
      window.addEventListener("devicemotion", handleMotion)
      // 启动首次校准（2 秒后锁定中性位）
      resetNeutral()
    }

    const needsPermission = typeof DoeCtor?.requestPermission === "function"

    if (!needsPermission) {
      // Android：直接双通道监听
      attachSensors()
    } else {
      // iOS 13+：需要用户手势触发权限
      function onGesture() {
        DoeCtor!.requestPermission!()
          .then((state: string) => {
            if (state === "granted") attachSensors()
          })
          .catch(() => {})
        document.removeEventListener("touchstart", onGesture)
        document.removeEventListener("click", onGesture)
      }
      document.addEventListener("touchstart", onGesture, { once: true })
      document.addEventListener("click", onGesture, { once: true })
      cleanup = () => {
        document.removeEventListener("touchstart", onGesture)
        document.removeEventListener("click", onGesture)
      }
    }

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId)
      window.removeEventListener("deviceorientation", handleOrientation)
      window.removeEventListener("devicemotion", handleMotion)
      cleanup?.()
    }
  }, [])

  const safeDots = Math.min(Math.max(dotCount, 1), 12)
  const safeActive = Math.min(Math.max(activeDotIndex, 0), safeDots - 1)

  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      style={style}
      className={cn(
        /* 宽度用视口推算，避免父级 flex 压缩时 100% 变成极窄条 */
        /* 宽度：扣除全局侧栏，避免在 main 内仍按整屏 vw 计算导致视觉不居中 */
        'relative box-border aspect-[9/16] w-[min(272px,calc(100vw-var(--sidebar-w,72px)-2rem))] max-w-full shrink-0 rounded-3xl shadow-lg md:w-[min(332px,calc(100vw-var(--sidebar-w,72px)-2.5rem))]',
        isDark ? 'bg-card' : 'bg-transparent',
        '[transform-style:preserve-3d]',
        'touch-manipulation',
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
      {isDark ? (
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      ) : (
        /* 浅色：约 80% 透明（≈20% 黑），略压高光、不糊图 */
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-black/20" />
      )}

      <div
        className="absolute inset-0 flex flex-col p-5"
        style={{ transform: "translateZ(40px)" }}
      >
        <div
          className={cn(
            'flex items-start justify-between gap-3 rounded-xl border p-4',
            isDark
              ? 'border-white/10 bg-white/5 md:backdrop-blur-md'
              : 'border-black/15 bg-transparent',
          )}
        >
          <div className="min-w-0 flex-1 pr-1">
            <h3
              className={cn(
                'text-2xl font-bold leading-tight',
                isDark ? 'text-white' : 'text-text-primary [text-shadow:none]',
              )}
            >
              {title}
            </h3>
            {description.trim() ? (
              <p
                className={cn(
                  'mt-1 line-clamp-4 text-sm leading-relaxed',
                  isDark ? 'text-white/70' : 'text-text-primary [text-shadow:none]',
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
          {avatarTo ? (
            <Link
              to={avatarTo}
              className={cn('shrink-0 rounded-full outline-none ring-2 transition', isDark ? 'ring-white/25 hover:ring-white/55 focus-visible:ring-white' : 'ring-black/[0.1] hover:ring-black/[0.2] focus-visible:ring-black/[0.3]')}
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
              className={cn('h-12 w-12 shrink-0 rounded-full object-cover ring-2', isDark ? 'ring-white/25' : 'ring-black/[0.1]')}
            />
          )}
        </div>

        <div className="absolute top-[140px] left-5">
          <div
            className={cn(
              'text-3xl font-extrabold',
              isDark ? 'text-white drop-shadow-lg' : 'text-text-primary [text-shadow:none]',
            )}
          >
            {price}
          </div>
        </div>

        <div className="mt-auto flex w-full justify-center gap-2 pb-2">
          {Array.from({ length: safeDots }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                index === safeActive
                  ? isDark ? "bg-white" : "bg-black/60"
                  : isDark ? "bg-white/30" : "bg-black/20",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
