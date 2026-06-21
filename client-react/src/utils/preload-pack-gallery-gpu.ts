import { useTexture } from '@react-three/drei'

import type { PackCardImageItem } from '@/components/ui/3d-gallery-photography'

const GPU_PRELOAD_BATCH = 4

function collectTextureUrls(items: PackCardImageItem[]): string[] {
  return [
    ...new Set(items.flatMap((item) => [item.src, item.backSrc ?? item.src])),
  ]
}

function staggerPreload(urls: string[]) {
  if (urls.length === 0) return

  let index = 0

  const pump = (deadline?: IdleDeadline) => {
    const batchEnd = Math.min(index + GPU_PRELOAD_BATCH, urls.length)
    while (index < batchEnd) {
      useTexture.preload(urls[index])
      index += 1
    }
    if (index < urls.length) {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(pump, { timeout: 120 })
      } else {
        setTimeout(() => pump(), 0)
      }
    }
  }

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(pump, { timeout: 120 })
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
