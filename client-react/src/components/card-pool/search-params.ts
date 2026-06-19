import { demandApi } from '@/api/demand'
import type { BlackScope } from '@/components/card-pool/types'
import { subtreeLeafIds } from '@/components/card-pool/taxonomy'

/** GET /demands/search 的扁平参数（不含 page/limit） */
export function scopeToApiParams(scope: BlackScope): Record<string, string> {
  const out: Record<string, string> = {}
  const p = scope.path

  // __singles__ 特殊处理：用 ids 参数传递需求 ID 列表
  if (p.length >= 2 && p[1] === '__singles__') {
    if (scope.leafFilter && scope.leafFilter.length > 0) {
      out.ids = scope.leafFilter.join(',')
    }
    return out
  }

  if (p.length < 2) return out

  if (p[1] === 'online') out.serviceType = 'ONLINE'
  else if (p[1] === 'offline') out.serviceType = 'OFFLINE'

  /**
   * root 一级分叉（线上/线下）应当只按服务方式拆分，
   * 不能再叠加 taxonomy 类目白名单过滤，否则与「全部」总数口径不一致。
   */
  if (p.length === 2) return out

  if (scope.leafFilter?.length === 1) {
    out.taxonomyLeafId = scope.leafFilter[0]!
    return out
  }

  const last = p[p.length - 1]!
  const leaves = subtreeLeafIds(last)
  if (leaves.length === 1) {
    out.taxonomyLeafId = leaves[0]!
  } else if (leaves.length > 1) {
    out.taxonomyLeafIds = leaves.join(',')
  }
  return out
}

export function searchParamsToQueryString(
  params: Record<string, string>,
): string {
  const sp = new URLSearchParams()
  if (params.serviceType) sp.set('serviceType', params.serviceType)
  if (params.category) sp.set('category', params.category)
  if (params.categories) sp.set('categories', params.categories)
  if (params.taxonomyLeafId) sp.set('taxonomyLeafId', params.taxonomyLeafId)
  if (params.taxonomyLeafIds) sp.set('taxonomyLeafIds', params.taxonomyLeafIds)
  if (params.ids) sp.set('ids', params.ids)
  return sp.toString()
}

export async function fetchTotalForScope(scope: BlackScope): Promise<number> {
  const params = scopeToApiParams(scope)
  const r = await demandApi.list({ ...params, page: 1, limit: 1 })
  const d = r.data.data as { total?: number }
  return d.total ?? 0
}

export async function fetchFirstDemandId(
  scope: BlackScope,
): Promise<string | null> {
  const params = scopeToApiParams(scope)
  const r = await demandApi.list({ ...params, page: 1, limit: 1 })
  const d = r.data.data as { demands?: { id: string }[] }
  return d.demands?.[0]?.id ?? null
}
