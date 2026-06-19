import { NODE_SEARCH_CATEGORY, TAXONOMY } from '@/components/card-pool/taxonomy'
import type { BlackScope } from '@/components/card-pool/types'

/** 从叶子 taxonomy id 向上拼出含 root 的 path */
export function taxonomyPathFromLeaf(leafId: string): string[] {
  const segs: string[] = []
  let cur: string | null = leafId
  while (cur) {
    segs.unshift(cur)
    cur = TAXONOMY[cur]?.parent ?? null
  }
  if (segs[0] !== 'root') segs.unshift('root')
  return segs
}

export function taxonomyLeafToBlackScope(
  taxonomyLeafId: string,
): BlackScope | null {
  if (
    !TAXONOMY[taxonomyLeafId] ||
    TAXONOMY[taxonomyLeafId]!.childIds.length > 0
  )
    return null
  return { path: taxonomyPathFromLeaf(taxonomyLeafId), leafFilter: null }
}

/**
 * 将需求列表中的 category + serviceType 还原为一张叶子黑卡。
 * 当同一类目映射到多个叶子时返回 null，避免错误自动归类。
 */
export function categoryToLeafBlackScope(
  category: string,
  serviceType: string,
  taxonomyLeafId?: string | null,
): BlackScope | null {
  if (taxonomyLeafId) {
    const direct = taxonomyLeafToBlackScope(taxonomyLeafId)
    if (direct) return direct
  }
  const branch =
    serviceType === 'ONLINE'
      ? 'online'
      : serviceType === 'OFFLINE'
        ? 'offline'
        : null
  const candidates = Object.entries(NODE_SEARCH_CATEGORY)
    .filter(([, cat]) => cat === category)
    .map(([leafId]) => leafId)
    .filter((leafId) => {
      if (!branch) return true
      const p = taxonomyPathFromLeaf(leafId)
      return p.includes(branch)
    })
    .sort()
  if (candidates.length !== 1) return null
  const leafId = candidates[0]!
  return { path: taxonomyPathFromLeaf(leafId), leafFilter: null }
}
