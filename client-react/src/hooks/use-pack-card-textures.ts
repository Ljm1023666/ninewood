import { useCallback, useSyncExternalStore } from 'react'

import type { PackCardImageItem } from '@/components/ui/3d-gallery-photography'
import type { PackCardData } from '@/components/card-pool/search-params'
import {
  getPackGallerySnapshot,
  subscribePackGallery,
  type PackGallerySnapshot,
} from '@/utils/pack-gallery-cache'

const EMPTY: PackGallerySnapshot = { cards: [], items: [], ready: false, texturesComplete: false }

/** 订阅 scope 级画廊缓存，避免开包/进画廊时重复合成纹理 */
export function usePackGallery(cacheKey: string | null, fallbackCards: PackCardData[] = []) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!cacheKey) return () => {}
      return subscribePackGallery(cacheKey, onStoreChange)
    },
    [cacheKey],
  )

  const getSnapshot = useCallback((): PackGallerySnapshot => {
    if (!cacheKey) return EMPTY
    return getPackGallerySnapshot(cacheKey)
  }, [cacheKey])

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const cards = snapshot.cards.length > 0 ? snapshot.cards : fallbackCards
  const items: PackCardImageItem[] = snapshot.items

  return { cards, items, ready: snapshot.ready, texturesComplete: snapshot.texturesComplete ?? snapshot.ready }
}
