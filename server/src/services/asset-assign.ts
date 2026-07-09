/**
 * 用户 / 需求图片字段的机械分配（与 client user-cover-presets.ts 语义一致）
 */
import {
  assertFolder,
  loadAssetManifest,
  pickByIndex,
  stableIndexFromUserId,
  type AssetManifest,
} from './asset-manifest.js'

export type UserImageFields = {
  avatarUrl: string
  coverUrl: string
  demandCardCoverUrl: string
}

export type DemandImageFields = {
  coverImage: string
}

/** 按序号分配用户三件套（头像 / 主页背景 / 默认卡面） */
export function assignUserImages(
  userIndex: number,
  userId: string,
  manifest: AssetManifest,
): UserImageFields {
  const avatarUrl = pickByIndex(manifest.avatars, userIndex)
  const coverUrl = pickByIndex(manifest.covers, userIndex + 3)
  const demandCardCoverUrl = pickByIndex(
    manifest.cardCovers,
    userIndex + 7 + stableIndexFromUserId(userId, manifest.cardCovers.length),
  )

  assertFolder(avatarUrl, 'avatars')
  assertFolder(coverUrl, 'covers')
  assertFolder(demandCardCoverUrl, 'card-covers')

  return { avatarUrl, coverUrl, demandCardCoverUrl }
}

/** 需求卡面：仅 card-covers；与发布者默认卡面同池，按需求序号偏移 */
export function assignDemandCoverImage(
  demandIndex: number,
  publisherUserId: string,
  manifest: AssetManifest,
): DemandImageFields {
  const base = stableIndexFromUserId(publisherUserId, manifest.cardCovers.length)
  const coverImage = pickByIndex(manifest.cardCovers, demandIndex + base)

  assertFolder(coverImage, 'card-covers')

  return { coverImage }
}

export function loadManifestForAssign(): AssetManifest {
  return loadAssetManifest()
}
