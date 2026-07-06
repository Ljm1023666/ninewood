import type { PackCardImageItem } from '@/components/ui/3d-gallery-photography'

import type { PackCardData } from '@/components/card-pool/search-params'

import { fetchPackContents } from '@/components/card-pool/search-params'

import type { BlackScope } from '@/components/card-pool/types'

import { scopeKey } from '@/components/card-pool/scope'

import {

  buildPackCardFastGalleryItem,

  buildPackCardTexturePair,

} from '@/utils/pack-card-texture'

import {

  upgradeCardCoverUrlForGallery,

  upgradeCardCoverUrlToDetail,

} from '@/utils/user-cover-presets'

import {

  preloadPackGalleryGpuTextures,

  preloadPackGalleryGpuTexturesDelta,

} from '@/utils/preload-pack-gallery-gpu'

import { loadPackGalleryImages } from '@/utils/pack-gallery-bridge'

import { yieldToMain } from '@/utils/yield-to-main'



export type PackGallerySnapshot = {

  cards: PackCardData[]

  items: PackCardImageItem[]

  ready: boolean

  /** 全部卡面已升级为 HD canvas 合成纹理 */

  texturesComplete?: boolean

}



const EMPTY_SNAPSHOT: PackGallerySnapshot = {

  cards: [],

  items: [],

  ready: false,

  texturesComplete: false,

}



const snapshots = new Map<string, PackGallerySnapshot>()

const inflight = new Map<string, Promise<PackGallerySnapshot>>()

const listeners = new Map<string, Set<() => void>>()

const upgradeTasks = new Map<string, Promise<void>>()



function emit(key: string) {

  listeners.get(key)?.forEach((listener) => listener())

}



/** 纹理结构变更时递增，使旧 blob 缓存失效 */

const PACK_GALLERY_CACHE_VERSION = 8



export function getPackGalleryKey(scope: BlackScope): string {

  return `${scopeKey(scope)}@gallery-v${PACK_GALLERY_CACHE_VERSION}`

}



function revokeItemBlobs(item: PackCardImageItem) {

  if (item.src.startsWith('blob:')) URL.revokeObjectURL(item.src)

  if (item.backSrc?.startsWith('blob:')) URL.revokeObjectURL(item.backSrc)

}



function revokeGalleryItems(items: PackCardImageItem[]) {

  for (const item of items) {

    revokeItemBlobs(item)

  }

}



function toGalleryItem(

  card: PackCardData,

  front: string,

  back: string,

): PackCardImageItem {

  return {

    src: front,

    backSrc: back,

    alt: card.title,

    title: card.title,

    price: card.price,

    id: card.id,

  }

}



async function buildFastTextureItem(card: PackCardData): Promise<PackCardImageItem | null> {

  if (!card.imageUrl?.trim()) return null



  const detailUrl =

    card.detailImageUrl?.trim() || upgradeCardCoverUrlToDetail(card.imageUrl)



  try {

    const pair = await buildPackCardFastGalleryItem({

      detailImageUrl: detailUrl,

      title: card.title,

      price: card.price,

    })

    return toGalleryItem(card, pair.front, pair.back)

  } catch {

    return toGalleryItem(card, detailUrl, detailUrl)

  }

}



async function buildHdTextureItem(card: PackCardData): Promise<PackCardImageItem | null> {

  if (!card.imageUrl?.trim()) return null



  const detailUrl =

    card.detailImageUrl?.trim() || upgradeCardCoverUrlToDetail(card.imageUrl)

  const galleryUrl = upgradeCardCoverUrlForGallery(card.imageUrl)



  try {

    const pair = await buildPackCardTexturePair({

      src: galleryUrl,

      fallbackSrc: detailUrl,

      title: card.title,

      price: card.price,

    })

    return toGalleryItem(card, pair.front, pair.back)

  } catch {

    return toGalleryItem(card, detailUrl, detailUrl)

  }

}



async function mapPool<T, R>(

  items: T[],

  concurrency: number,

  fn: (item: T, index: number) => Promise<R>,

): Promise<R[]> {

  if (items.length === 0) return []

  const results = new Array<R>(items.length)

  let cursor = 0



  async function worker() {

    while (cursor < items.length) {

      const index = cursor

      cursor += 1

      results[index] = await fn(items[index], index)

      await yieldToMain()

    }

  }



  const workers = Math.min(concurrency, items.length)

  await Promise.all(Array.from({ length: workers }, () => worker()))

  return results

}



const FAST_TEXTURE_CONCURRENCY = 4

/** HD 升级每张卡之间的间隔，避免连续 canvas 合成占满主线程 */
const HD_TEXTURE_CARD_GAP_MS = 100

type GalleryBuildOptions = {
  /** 开包路径：延后 HD，入画廊后再升级 */
  deferHdUpgrade?: boolean
  /** 开包路径：GPU 预载改到 loading 阶段 */
  deferGpuPreload?: boolean
}

/** 已合成快纹理、等待入画廊后再启动 HD 的 cache key */
const deferredHdKeys = new Set<string>()

async function buildFastTexturesForCards(

  cards: PackCardData[],

): Promise<PackCardImageItem[]> {

  const built = await mapPool(cards, FAST_TEXTURE_CONCURRENCY, (card) =>

    buildFastTextureItem(card),

  )

  return built.filter((item): item is PackCardImageItem => item != null)

}



function publishSnapshot(key: string, snapshot: PackGallerySnapshot) {

  snapshots.set(key, snapshot)

  loadPackGalleryImages(key, snapshot.items)

  emit(key)

}



async function upgradeTexturesInBackground(
  key: string,
  cards: PackCardData[],
  seedItems: PackCardImageItem[],
) {
  const upgraded = [...seedItems]
  const indexById = new Map(
    upgraded.map((item, index) => [item.id ?? `idx:${index}`, index]),
  )

  for (const card of cards) {
    const index = indexById.get(card.id)
    if (index == null) continue

    const previous = upgraded[index]
    if (!previous) continue

    const hd = await buildHdTextureItem(card)
    await yieldToMain()
    if (!hd) continue

    revokeItemBlobs(previous)
    upgraded[index] = hd

    if (HD_TEXTURE_CARD_GAP_MS > 0) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, HD_TEXTURE_CARD_GAP_MS)
      })
    }
  }

  const base = snapshots.get(key)
  if (!base) return

  const texturesComplete = cards.every((c) => {
    const itemIndex = indexById.get(c.id)
    if (itemIndex == null) return true
    return upgraded[itemIndex]?.src.startsWith('blob:') ?? false
  })

  publishSnapshot(key, {
    ...base,
    items: upgraded,
    texturesComplete,
  })
  preloadPackGalleryGpuTexturesDelta(seedItems, upgraded)
}



function scheduleTextureUpgrade(

  key: string,

  cards: PackCardData[],

  seedItems: PackCardImageItem[],

) {

  if (upgradeTasks.has(key)) return



  const task = upgradeTexturesInBackground(key, cards, seedItems)

    .catch(() => undefined)

    .finally(() => {

      upgradeTasks.delete(key)

    })



  upgradeTasks.set(key, task)

}



async function buildGallerySnapshotFromCards(
  key: string,
  cards: PackCardData[],
  options?: GalleryBuildOptions,
): Promise<PackGallerySnapshot> {
  const fastItems = await buildFastTexturesForCards(cards)

  const snapshot: PackGallerySnapshot = {
    cards,
    items: fastItems,
    ready: true,
    texturesComplete: fastItems.length === 0,
  }

  publishSnapshot(key, snapshot)

  if (!options?.deferGpuPreload) {
    preloadPackGalleryGpuTextures(fastItems)
  }

  if (!snapshot.texturesComplete) {
    if (options?.deferHdUpgrade) {
      deferredHdKeys.add(key)
    } else {
      scheduleTextureUpgrade(key, cards, fastItems)
    }
  }

  return snapshot
}

async function loadPackGallery(scope: BlackScope, key: string): Promise<PackGallerySnapshot> {
  const cards = await fetchPackContents(scope)
  return buildGallerySnapshotFromCards(key, cards)
}

/**
 * 合成画廊快纹理。开包路径默认延后 HD 与 GPU 预载，避免入画廊瞬间卡顿。
 */
export function warmPackGalleryFromCards(
  scope: BlackScope,
  cards: PackCardData[],
): Promise<PackGallerySnapshot> {
  const key = getPackGalleryKey(scope)
  const existing = snapshots.get(key)
  const packOpenOpts: GalleryBuildOptions = {
    deferHdUpgrade: true,
    deferGpuPreload: true,
  }

  if (existing?.ready) {
    loadPackGalleryImages(key, existing.items)
    if (!existing.texturesComplete) {
      deferredHdKeys.add(key)
    }
    return Promise.resolve(existing)
  }

  const running = inflight.get(key)
  if (running) return running

  snapshots.set(key, { cards, items: [], ready: false, texturesComplete: false })

  const promise = buildGallerySnapshotFromCards(key, cards, packOpenOpts)
    .then((snapshot) => {
      inflight.delete(key)
      return snapshot
    })
    .catch(() => {
      const fallback: PackGallerySnapshot = {
        cards,
        items: [],
        ready: true,
        texturesComplete: true,
      }
      snapshots.set(key, fallback)
      inflight.delete(key)
      emit(key)
      return fallback
    })

  inflight.set(key, promise)
  return promise
}

/** loading 阶段触发 GPU 纹理预载（与 Canvas 挂载并行，opacity=0） */
export function preloadPackGalleryGpuForScope(scope: BlackScope): void {
  const key = getPackGalleryKey(scope)
  const snap = snapshots.get(key)
  if (snap?.items.length) {
    preloadPackGalleryGpuTextures(snap.items)
  }
}

/** 入画廊稳定后再启动 HD 升级，避免与首屏 3D 渲染争抢主线程 */
export function resumePackGalleryHdUpgrade(scope: BlackScope): void {
  const key = getPackGalleryKey(scope)
  if (!deferredHdKeys.has(key)) return
  deferredHdKeys.delete(key)

  const snap = snapshots.get(key)
  if (!snap?.ready || snap.texturesComplete) return
  scheduleTextureUpgrade(key, snap.cards, snap.items)
}



/** 加入手牌后立即调用，后台预取卡包数据与画廊纹理 */

export function prefetchPackGallery(scope: BlackScope): void {

  const key = getPackGalleryKey(scope)

  const existing = snapshots.get(key)

  if (existing?.ready) {

    loadPackGalleryImages(key, existing.items)

    if (!existing.texturesComplete) {

      scheduleTextureUpgrade(key, existing.cards, existing.items)

    }

    return

  }

  if (inflight.has(key)) return



  snapshots.set(key, EMPTY_SNAPSHOT)



  const promise = loadPackGallery(scope, key)

    .then((snapshot) => {

      inflight.delete(key)

      return snapshot

    })

    .catch(() => {

      const fallback: PackGallerySnapshot = { cards: [], items: [], ready: true, texturesComplete: true }

      snapshots.set(key, fallback)

      inflight.delete(key)

      emit(key)

      return fallback

    })



  inflight.set(key, promise)

}



/** 开包前确保数据就绪；若已在预取则复用同一 Promise */

export function ensurePackGallery(scope: BlackScope): Promise<PackGallerySnapshot> {

  const key = getPackGalleryKey(scope)

  const existing = snapshots.get(key)

  if (existing?.ready) {

    preloadPackGalleryGpuTextures(existing.items)

    loadPackGalleryImages(key, existing.items)

    if (!existing.texturesComplete) {

      scheduleTextureUpgrade(key, existing.cards, existing.items)

    }

    return Promise.resolve(existing)

  }



  const running = inflight.get(key)

  if (running) return running



  prefetchPackGallery(scope)

  return inflight.get(key) ?? Promise.resolve(EMPTY_SNAPSHOT)

}



export function getPackGallerySnapshot(key: string): PackGallerySnapshot {

  return snapshots.get(key) ?? EMPTY_SNAPSHOT

}



export function subscribePackGallery(key: string, listener: () => void): () => void {

  if (!listeners.has(key)) listeners.set(key, new Set())

  listeners.get(key)!.add(listener)

  return () => {

    listeners.get(key)?.delete(listener)

  }

}



export function evictPackGallery(scope: BlackScope): void {

  const key = getPackGalleryKey(scope)

  const snap = snapshots.get(key)

  if (snap) revokeGalleryItems(snap.items)

  snapshots.delete(key)

  inflight.delete(key)

  upgradeTasks.delete(key)

  deferredHdKeys.delete(key)

  emit(key)

}



export function evictAllPackGalleries(scopes: BlackScope[]): void {

  for (const scope of scopes) {

    evictPackGallery(scope)

  }

}


