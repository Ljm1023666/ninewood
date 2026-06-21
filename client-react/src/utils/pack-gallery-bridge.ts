import type { PackCardImageItem } from '@/components/ui/3d-gallery-photography'

type ImagesBridge = {
  load: (cacheKey: string, items: PackCardImageItem[]) => void
  activate: (cacheKey: string) => void
}

type PendingLoad = { type: 'load'; cacheKey: string; items: PackCardImageItem[] }
type PendingActivate = { type: 'activate'; cacheKey: string }
type PendingOp = PendingLoad | PendingActivate

let imagesBridge: ImagesBridge | null = null
const pendingOps: PendingOp[] = []

function flushPendingOps(bridge: ImagesBridge) {
  while (pendingOps.length > 0) {
    const op = pendingOps.shift()
    if (!op) break
    if (op.type === 'load') bridge.load(op.cacheKey, op.items)
    else bridge.activate(op.cacheKey)
  }
}

export function bindPackGalleryImagesBridge(next: ImagesBridge | null) {
  imagesBridge = next
  if (next) flushPendingOps(next)
}

/** 预取完成时写入常驻画廊（加入手牌后触发） */
export function loadPackGalleryImages(cacheKey: string, items: PackCardImageItem[]) {
  if (imagesBridge) {
    imagesBridge.load(cacheKey, items)
    return
  }
  pendingOps.push({ type: 'load', cacheKey, items })
}

/** 开包时切换到对应卡包纹理（不重新合成） */
export function activatePackGalleryImages(cacheKey: string) {
  if (imagesBridge) {
    imagesBridge.activate(cacheKey)
    return
  }
  pendingOps.push({ type: 'activate', cacheKey })
}
