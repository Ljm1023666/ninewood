import type { ClipboardEvent } from 'react'

/** 与 HTML5 / 手势拖放同屏区域：禁止选中，减少误选文字干扰拖动 */
export const dragSurfaceSelectNoneClass = 'select-none'

export function preventCopyOnDragSurface(e: ClipboardEvent<Element>) {
  e.preventDefault()
}
