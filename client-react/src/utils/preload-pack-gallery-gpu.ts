import { useTexture } from '@react-three/drei'

import type { PackCardImageItem } from '@/components/ui/3d-gallery-photography'

const GPU_PRELOAD_BATCH = 2

/** 递增后废弃进行中的 idle 预载队列，避免继续 preload 已 revoke 的 blob */
let preloadEpoch = 0

export function invalidatePackGalleryGpuPreload() {
  preloadEpoch += 1
}

function collectTextureUrls(items: PackCardImageItem[]): string[] {
  return [
    ...new Set(items.flatMap((item) => [item.src, item.backSrc ?? item.src])),
  ]
}

function staggerPreload(urls: string[]) {
  if (urls.length === 0) return

  const epoch = preloadEpoch
  let index = 0

  const pump = () => {
    if (epoch !== preloadEpoch) return
    const batchEnd = Math.min(index + GPU_PRELOAD_BATCH, urls.length)
    while (index < batchEnd) {
      try {
        useTexture.preload(urls[index])
      } catch {
        /* preload 同步失败忽略；异步加载错误由画廊 ErrorBoundary 兜底 */
      }
      index += 1
    }
    if (index < urls.length) {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => pump(), { timeout: 120 })
      } else {
        setTimeout(() => pump(), 0)
      }
    }
  }

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => pump(), { timeout: 120 })
  } else {
    pump()
  }
}

/** 将纹理 URL 分批预载进 Three 缓存，避免一次性阻塞 GPU 上传 */
export function preloadPackGalleryGpuTextures(items: PackCardImageItem[]) {
  staggerPreload(collectTextureUrls(items))
}

/** 仅预载相对上一版新增的 URL（渐进升级 HD 纹理时用） */
export function preloadPackGalleryGpuTexturesDelta(
  prev: PackCardImageItem[],
  next: PackCardImageItem[],
) {
  const known = new Set(collectTextureUrls(prev))
  const delta = collectTextureUrls(next).filter((url) => !known.has(url))
  staggerPreload(delta)
}
