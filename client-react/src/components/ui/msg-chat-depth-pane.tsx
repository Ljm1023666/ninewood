import {
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react'

/** 左右两端轻微内收回弹；返回清理函数。 */
export function playHorizontalRebound(
  el: HTMLElement,
  opts?: { delay?: number; shrink?: number },
) {
  el.getAnimations().forEach((a) => a.cancel())

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return () => undefined

  const delay = opts?.delay ?? 0
  const shrink = opts?.shrink ?? 0.988

  el.style.willChange = 'transform'
  const animation = el.animate(
    [
      { transform: 'scaleX(1)', offset: 0 },
      { transform: `scaleX(${shrink})`, offset: 0.3 },
      { transform: 'scaleX(1.002)', offset: 0.72 },
      { transform: 'scaleX(1)', offset: 1 },
    ],
    {
      delay,
      duration: 420,
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
