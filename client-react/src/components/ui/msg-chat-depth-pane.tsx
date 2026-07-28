import {
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react'

/**
 * 切换回弹。不用 scaleX/transform：会强制合成层并打断相邻液态玻璃的
 * backdrop-filter，在分栏接缝闪出一小块「断裂」。
 */
export function playHorizontalRebound(
  el: HTMLElement,
  opts?: { delay?: number; shrink?: number },
) {
  el.getAnimations().forEach((a) => a.cancel())

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return () => undefined

  const delay = opts?.delay ?? 0
  // shrink 保留参数兼容；映射为轻微透明度起伏
  const dip = Math.min(0.08, Math.max(0.02, (1 - (opts?.shrink ?? 0.988)) * 4))

  el.style.willChange = 'opacity'
  const animation = el.animate(
    [
      { opacity: 1, offset: 0 },
      { opacity: 1 - dip, offset: 0.28 },
      { opacity: 1, offset: 1 },
    ],
    {
      delay,
      duration: 360,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  )

  void animation.finished.then(
    () => {
      el.style.willChange = ''
    },
    () => undefined,
  )

  return () => {
    animation.cancel()
    el.style.willChange = ''
  }
}

/** 右侧消息区切换回弹。 */
export function MsgChatDepthPane({
  paneKey,
  children,
}: {
  paneKey: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    return playHorizontalRebound(el)
  }, [paneKey])

  return (
    <div ref={ref} className="msg-chat-depth-pane">
      {children}
    </div>
  )
}

/** 输入框自身的切换回弹，与消息区互不牵连。 */
export function MsgComposerRebound({
  playKey,
  children,
}: {
  playKey: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // 略晚、略深一点，形成独立节拍
    return playHorizontalRebound(el, { delay: 60, shrink: 0.982 })
  }, [playKey])

  return (
    <div ref={ref} className="msg-composer__rebound">
      {children}
    </div>
  )
}
