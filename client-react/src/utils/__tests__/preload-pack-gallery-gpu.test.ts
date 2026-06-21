import { describe, expect, it, vi } from 'vitest'

import { preloadPackGalleryGpuTexturesDelta } from '@/utils/preload-pack-gallery-gpu'
import type { PackCardImageItem } from '@/components/ui/3d-gallery-photography'

vi.mock('@react-three/drei', () => ({
  useTexture: {
    preload: vi.fn(),
  },
}))

import { useTexture } from '@react-three/drei'

describe('preloadPackGalleryGpuTexturesDelta', () => {
  it('只预载新增 URL', () => {
    const prev: PackCardImageItem[] = [
      { src: 'https://a/front.jpg', backSrc: 'blob:back-a' },
    ]
    const next: PackCardImageItem[] = [
      { src: 'blob:front-hd', backSrc: 'blob:back-a' },
    ]

    preloadPackGalleryGpuTexturesDelta(prev, next)

    expect(useTexture.preload).toHaveBeenCalledWith('blob:front-hd')
    expect(useTexture.preload).not.toHaveBeenCalledWith('blob:back-a')
    expect(useTexture.preload).not.toHaveBeenCalledWith('https://a/front.jpg')
  })
})
