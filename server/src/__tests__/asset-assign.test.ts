import { describe, expect, it } from 'vitest'
import {
  assignDemandCoverImage,
  assignUserImages,
} from '../services/asset-assign.js'
import type { AssetManifest } from '../services/asset-manifest.js'

const manifest: AssetManifest = {
  fromManifest: true,
  avatars: ['/uploads/avatars/avatar_01.png'],
  covers: ['/uploads/covers/cover_01.png'],
  cardCovers: ['/uploads/card-covers/10001.jpg', '/uploads/card-covers/10002.jpg'],
}

describe('asset-assign', () => {
  it('assigns user images from correct folders', () => {
    const u = assignUserImages(0, 'user-a', manifest)
    expect(u.avatarUrl).toMatch(/^\/uploads\/avatars\//)
    expect(u.coverUrl).toMatch(/^\/uploads\/covers\//)
    expect(u.demandCardCoverUrl).toMatch(/^\/uploads\/card-covers\//)
  })

  it('assigns demand cover only from card-covers', () => {
    const d = assignDemandCoverImage(3, 'user-b', manifest)
    expect(d.coverImage).toMatch(/^\/uploads\/card-covers\//)
  })
})
