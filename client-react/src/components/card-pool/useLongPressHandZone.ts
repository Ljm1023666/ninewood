import {
  useCallback,
  useRef,
  useState,
  type RefObject,
  type MouseEvent,
} from 'react'

/** 长按 300ms 后武装拖拽，短按仍触发开卡 */
const DEFAULT_LONG_MS = 300
const DEFAULT_MOVE_CANCEL_PX = 16
/** 尚未进入长按态时：仅当滑动较大才取消计时（便于按住后拖向手牌区） */
const PRE_ARM_MOVE_CANCEL_PX = 80
/** 指针移动超过此阈值即开始「提卡」幽灵跟随（与拖出手牌浮层同源） */
const GHOST_START_MOVE_PX = 6

type DropInOpts = {
  handZoneRef: RefObject<HTMLElement | null>
  disabled: boolean
  longPressMs?: number
  moveCancelPx?: number
  preArmMoveCancelPx?: number
  ghostStartMovePx?: number
  armOnMove?: boolean
  /** 短按松手（未武装、位移小）：开卡 / 进入下一级 */
  onTap: () => void
  /** 已在手牌区内松手：传入指针坐标供手牌区播放落入手势 */
  onDropInHand: (at: { clientX: number; clientY: number }) => void
  /** 黑卡拖向手牌时，指针是否在手牌区矩形内（用于高亮） */
  onHandZoneHoverChange?: (over: boolean) => void
}

/** 拖出手牌时：浮层跟随指针（突破手牌区 overflow） */
export type HandDragOutVisual = { x: number; y: number }

/** 拖入手牌时：与拖出共用的跟随坐标（用于 HandPackGhostAtPoint） */
export type HandDragInVisual = HandDragOutVisual

type DragOutOpts = {
  handZoneRef: RefObject<HTMLElement | null>
  disabled: boolean
  longPressMs?: number
  moveCancelPx?: number
  /** 长按后松手且落在手牌区外 */
  onDragOut: () => void
}

function pointInRect(x: number, y: number, r: DOMRect) {
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}

/** 黑卡：短按开卡；武装后拖向手牌区松手加入（幽灵层与拖出手牌同源） */
export function useLongPressDropInHand(opts: DropInOpts) {
  const {
    handZoneRef,
    disabled,
    longPressMs = DEFAULT_LONG_MS,
    moveCancelPx = DEFAULT_MOVE_CANCEL_PX,
    preArmMoveCancelPx = PRE_ARM_MOVE_CANCEL_PX,
    ghostStartMovePx = GHOST_START_MOVE_PX,
    armOnMove = true,
    onTap,
    onDropInHand,
    onHandZoneHoverChange,
  } = opts

  const onTapRef = useRef(onTap)
  const onDropRef = useRef(onDropInHand)
  const hoverCbRef = useRef(onHandZoneHoverChange)
  onTapRef.current = onTap
  onDropRef.current = onDropInHand
  hoverCbRef.current = onHandZoneHoverChange

  const suppressClick = useRef(false)
  const lastHoverRef = useRef<boolean | null>(null)

  const [dragInVisual, setDragInVisual] = useState<HandDragInVisual | null>(
    null,
  )
  const setDragInVisualRef = useRef(setDragInVisual)
  setDragInVisualRef.current = setDragInVisual

  const state = useRef({
    active: false,
    pid: -1,
    startX: 0,
    startY: 0,
    armed: false,
    movedCancel: false,
    timer: null as ReturnType<typeof setTimeout> | null,
  })

  const removeListeners = useRef<(() => void) | null>(null)

  const updateHandHover = useCallback(
    (clientX: number, clientY: number) => {
      const cb = hoverCbRef.current
      if (!cb) return
      const r = handZoneRef.current?.getBoundingClientRect()
      const over = r ? pointInRect(clientX, clientY, r) : false
      if (lastHoverRef.current !== over) {
        lastHoverRef.current = over
        cb(over)
      }
    },
    [handZoneRef],
  )

  const finish = useCallback(
    (e: PointerEvent) => {
      const s = state.current
      if (!s.active || e.pointerId !== s.pid) return

      if (s.timer) {
        clearTimeout(s.timer)
        s.timer = null
      }
      removeListeners.current?.()
      removeListeners.current = null

      const dist = Math.hypot(e.clientX - s.startX, e.clientY - s.startY)

      setDragInVisualRef.current(null)
      if (lastHoverRef.current !== null) {
        lastHoverRef.current = null
        hoverCbRef.current?.(false)
      }

      if (s.armed) {
        const r = handZoneRef.current?.getBoundingClientRect()
        if (r && pointInRect(e.clientX, e.clientY, r)) {
          suppressClick.current = true
          onDropRef.current({ clientX: e.clientX, clientY: e.clientY })
        } else if (!s.movedCancel && dist <= moveCancelPx) {
          /** DEFAULT_LONG_MS=0 时武装很快：未拖入手牌且几乎未移动 → 仍视为短按开卡 */
          suppressClick.current = true
          onTapRef.current()
        } else {
          suppressClick.current = true
        }
      } else if (!s.movedCancel && dist <= moveCancelPx) {
        suppressClick.current = true
        onTapRef.current()
      }

      s.active = false
      s.armed = false
      s.movedCancel = false
      s.pid = -1
    },
    [handZoneRef, moveCancelPx],
  )

  const onMove = useCallback(
    (e: PointerEvent) => {
      const s = state.current
      if (!s.active || e.pointerId !== s.pid) return

      if (s.armed) {
        setDragInVisualRef.current({ x: e.clientX, y: e.clientY })
        updateHandHover(e.clientX, e.clientY)
        return
      }

      const dx = e.clientX - s.startX
      const dy = e.clientY - s.startY
      const horizSwipe = Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.35
      const d = Math.hypot(dx, dy)

      if (horizSwipe || d > preArmMoveCancelPx) {
        s.movedCancel = true
        if (s.timer) {
          clearTimeout(s.timer)
          s.timer = null
        }
        return
      }

      if (armOnMove && d >= ghostStartMovePx) {
        if (s.timer) {
          clearTimeout(s.timer)
          s.timer = null
        }
        s.armed = true
        setDragInVisualRef.current({ x: e.clientX, y: e.clientY })
        updateHandHover(e.clientX, e.clientY)
      }
    },
    [updateHandHover, preArmMoveCancelPx, armOnMove, ghostStartMovePx],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || e.button !== 0) return
      const s = state.current
      if (s.active) return
      s.active = true
      s.pid = e.pointerId
      s.startX = e.clientX
      s.startY = e.clientY
      s.armed = false
      s.movedCancel = false
      lastHoverRef.current = null

      setDragInVisualRef.current(null)

      s.timer = setTimeout(() => {
        s.timer = null
        if (!s.active || s.movedCancel) return
        s.armed = true
        setDragInVisualRef.current({ x: s.startX, y: s.startY })
        updateHandHover(s.startX, s.startY)
      }, longPressMs)

      const up = (ev: PointerEvent) => finish(ev)
      const mv = (ev: PointerEvent) => onMove(ev)
      window.addEventListener('pointerup', up, true)
      window.addEventListener('pointercancel', up, true)
      window.addEventListener('pointermove', mv, true)
      removeListeners.current = () => {
        window.removeEventListener('pointerup', up, true)
        window.removeEventListener('pointercancel', up, true)
        window.removeEventListener('pointermove', mv, true)
      }
    },
    [disabled, longPressMs, finish, onMove, updateHandHover],
  )

  const onClickCapture = useCallback((e: MouseEvent<HTMLElement>) => {
    if (suppressClick.current) {
      e.preventDefault()
      e.stopPropagation()
      suppressClick.current = false
    }
  }, [])

  return { onPointerDown, onClickCapture, dragInVisual }
}

export function useLongPressDragOutOfHand(opts: DragOutOpts) {
  const {
    handZoneRef,
    disabled,
    longPressMs = DEFAULT_LONG_MS,
    onDragOut,
  } = opts

  const onOutRef = useRef(onDragOut)
  onOutRef.current = onDragOut

  const [dragOutVisual, setDragOutVisual] = useState<HandDragOutVisual | null>(
    null,
  )
  const setDragOutVisualRef = useRef(setDragOutVisual)
  setDragOutVisualRef.current = setDragOutVisual

  const state = useRef({
    active: false,
    pid: -1,
    startX: 0,
    startY: 0,
    armed: false,
    movedCancel: false,
    timer: null as ReturnType<typeof setTimeout> | null,
  })

  const removeListeners = useRef<(() => void) | null>(null)

  const finish = useCallback(
    (e: PointerEvent) => {
      const s = state.current
      if (!s.active || e.pointerId !== s.pid) return

      if (s.timer) {
        clearTimeout(s.timer)
        s.timer = null
      }
      removeListeners.current?.()
      removeListeners.current = null

      setDragOutVisualRef.current(null)

      if (s.armed) {
        const r = handZoneRef.current?.getBoundingClientRect()
        const inside = r ? pointInRect(e.clientX, e.clientY, r) : true
        if (!inside) onOutRef.current()
      }

      s.active = false
      s.armed = false
      s.movedCancel = false
      s.pid = -1
    },
    [handZoneRef],
  )

  const onMove = useCallback((e: PointerEvent) => {
    const s = state.current
    if (!s.active || e.pointerId !== s.pid) return
    if (s.armed) {
      setDragOutVisualRef.current({ x: e.clientX, y: e.clientY })
      return
    }
    const d = Math.hypot(e.clientX - s.startX, e.clientY - s.startY)
    if (d > PRE_ARM_MOVE_CANCEL_PX) {
      s.movedCancel = true
      if (s.timer) {
        clearTimeout(s.timer)
        s.timer = null
      }
    }
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || e.button !== 0) return
      const s = state.current
      if (s.active) return
      s.active = true
      s.pid = e.pointerId
      s.startX = e.clientX
      s.startY = e.clientY
      s.armed = false
      s.movedCancel = false

      setDragOutVisualRef.current(null)

      s.timer = setTimeout(() => {
        s.timer = null
        if (!s.active || s.movedCancel) return
        s.armed = true
        setDragOutVisualRef.current({ x: s.startX, y: s.startY })
      }, longPressMs)

      const up = (ev: PointerEvent) => finish(ev)
      const mv = (ev: PointerEvent) => onMove(ev)
      window.addEventListener('pointerup', up, true)
      window.addEventListener('pointercancel', up, true)
      window.addEventListener('pointermove', mv, true)
      removeListeners.current = () => {
        window.removeEventListener('pointerup', up, true)
        window.removeEventListener('pointercancel', up, true)
        window.removeEventListener('pointermove', mv, true)
      }
    },
    [disabled, longPressMs, finish, onMove],
  )

  return { onPointerDown, dragOutVisual }
}
