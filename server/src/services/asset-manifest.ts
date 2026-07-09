/**
 * 素材清单：与 sync-picture-assets.mjs 写入的 .asset-manifest.json 对齐
 *
 * 文件夹 → 用途（机械映射，禁止混用）：
 * - uploads/avatars/     → User.avatarUrl
 * - uploads/covers/      → User.coverUrl（个人主页背景）
 * - uploads/card-covers/   → User.demandCardCoverUrl、Demand.coverImage（卡面原图）
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const MANIFEST_PATH = path.join(__dirname, '../../uploads/.asset-manifest.json')

export type AssetManifest = {
  avatars: string[]
  covers: string[]
  cardCovers: string[]
  fromManifest: boolean
}

const FALLBACK_AVATARS = Array.from(
  { length: 20 },
  (_, i) => `/uploads/avatars/avatar_${String(i + 1).padStart(2, '0')}.png`,
)
const FALLBACK_COVERS = Array.from(
  { length: 14 },
  (_, i) => `/uploads/covers/cover_${String(i + 1).padStart(2, '0')}.png`,
)
const FALLBACK_CARD_COVERS = Array.from(
  { length: 21 },
  (_, i) => `/uploads/card-covers/100${String(i + 1).padStart(2, '0')}.jpg`,
)

export function pickByIndex<T>(arr: readonly T[], index: number): T {
  if (arr.length === 0) throw new Error('素材列表为空')
  return arr[((index % arr.length) + arr.length) % arr.length]!
}

/** 与 client publisherUserCoverPreset 同算法 */
export function stableIndexFromUserId(userId: string, len: number): number {
  let h = 2166136261
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % Math.max(1, len)
}

export function loadAssetManifest(): AssetManifest {
  if (fs.existsSync(MANIFEST_PATH)) {
    const raw = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as {
      avatars?: string[]
      covers?: string[]
      cardCovers?: string[]
    }
    const avatars = raw.avatars?.filter(Boolean) ?? []
    const covers = raw.covers?.filter(Boolean) ?? []
    const cardCovers = raw.cardCovers?.filter(Boolean) ?? []
    if (avatars.length && covers.length && cardCovers.length) {
      return { avatars, covers, cardCovers, fromManifest: true }
    }
  }
  return {
    avatars: [...FALLBACK_AVATARS],
    covers: [...FALLBACK_COVERS],
    cardCovers: [...FALLBACK_CARD_COVERS],
    fromManifest: false,
  }
}

export function assertFolder(url: string, folder: 'avatars' | 'covers' | 'card-covers'): void {
  const prefix = `/uploads/${folder}/`
  if (!url.startsWith(prefix)) {
    throw new Error(`URL 必须来自 ${prefix}，实际: ${url}`)
  }
}
