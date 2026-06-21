import { describe, expect, it, vi } from 'vitest'

import type { PackCardImageItem } from '@/components/ui/3d-gallery-photography'
import {
  activatePackGalleryImages,
  bindPackGalleryImagesBridge,
  loadPackGalleryImages,
} from '@/utils/pack-gallery-bridge'
import { isRealGalleryImages } from '@/components/card-pool/pack-gallery-runtime'

const PLACEHOLDER_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

describe('isRealGalleryImages', () => {
  it('占位纹理不算就绪', () => {
    expect(
      isRealGalleryImages([
        { src: PLACEHOLDER_PIXEL, backSrc: PLACEHOLDER_PIXEL, alt: '' },
      ]),
    ).toBe(false)
  })

  it('blob 纹理算就绪', () => {
    expect(
      isRealGalleryImages([
        { src: 'blob:http://localhost/abc', backSrc: 'blob:http://localhost/def' },
      ]),
    ).toBe(true)
  })
})

describe('pack-gallery-bridge', () => {
  it('bridge 未绑定时排队，绑定后 flush', () => {
    const load = vi.fn<(cacheKey: string, items: PackCardImageItem[]) => void>()
    const activate = vi.fn<(cacheKey: string) => void>()
    const items: PackCardImageItem[] = [
      { src: 'blob:a', backSrc: 'blob:b', alt: 'x' },
    ]

    loadPackGalleryImages('key-a', items)
    activatePackGalleryImages('key-a')

    expect(load).not.toHaveBeenCalled()
    expect(activate).not.toHaveBeenCalled()

    bindPackGalleryImagesBridge({ load, activate })

    expect(load).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledWith('key-a', items)
    expect(activate).toHaveBeenCalledTimes(1)
    expect(activate).toHaveBeenCalledWith('key-a')

    bindPackGalleryImagesBridge(null)
  })

  it('bridge 已绑定时直接调用', () => {
    const load = vi.fn<(cacheKey: string, items: PackCardImageItem[]) => void>()
    const activate = vi.fn<(cacheKey: string) => void>()
    bindPackGalleryImagesBridge({ load, activate })

    const items: PackCardImageItem[] = [
      { src: 'blob:c', backSrc: 'blob:d', alt: 'y' },
    ]
    loadPackGalleryImages('key-b', items)
    activatePackGalleryImages('key-b')

    expect(load).toHaveBeenCalledWith('key-b', items)
    expect(activate).toHaveBeenCalledWith('key-b')

    bindPackGalleryImagesBridge(null)
  })
})
