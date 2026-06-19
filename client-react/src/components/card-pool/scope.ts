import type { CSSProperties } from 'react'
import type { BlackScope } from '@/components/card-pool/types'
import {
  taxonomySpectrumColorForNodeId,
  TAXONOMY,
} from '@/components/card-pool/taxonomy'

/** 与手牌/牌堆去重、持久化一致的范围键 */
export function scopeKey(s: { path: string[]; leafFilter: string[] | null }) {
  return `${s.path.join('/')}|${s.leafFilter?.join(',') ?? ''}`
}

/** 当前范围下，下一层问号黑卡（迭代拆分） */
export function nextBlackScopes(parent: BlackScope): BlackScope[] {
  const last = parent.path[parent.path.length - 1]!
  const childIds = TAXONOMY[last]?.childIds ?? []
  if (childIds.length === 0) return []

  if (parent.leafFilter !== null) {
    return []
  }

  return childIds.map((id) => ({
    path: [...parent.path, id],
    leafFilter: null,
  }))
}

/**
 * 当前范围的简短分类依据（不含祖先路径）：路径末节点 ± 叶子筛选。
 * 单叶子时为「末节点 · 叶子」；用于 PackStrip、手牌、面包屑栏等与 scopeTitle 一致。
 */
export function scopeCurrentClassificationBasis(scope: BlackScope): string {
  const last = scope.path[scope.path.length - 1]!
  if (last === '__singles__') return '?'
  const base = TAXONOMY[last]?.label ?? last
  if (scope.leafFilter === null) return base
  if (scope.leafFilter.length === 0) return base
  if (scope.leafFilter.length === 1) {
    const k = scope.leafFilter[0]!
    const leaf = TAXONOMY[k]?.label ?? k
    return leaf === base ? leaf : `${base} · ${leaf}`
  }
  return `${base} · 合并 ${scope.leafFilter.length} 类`
}

export function scopeTitle(scope: BlackScope): string {
  return scopeCurrentClassificationBasis(scope)
}

/** 完整分类路径 + 叶子白名单（祖先以 › 连接）；审计/导出等需要全路径时用 */
export function scopeClassificationBasis(scope: BlackScope): string {
  const pathLabels = scope.path
    .map((id) => TAXONOMY[id]?.label ?? id)
    .join(' › ')
  if (scope.leafFilter === null) return pathLabels
  if (scope.leafFilter.length === 0) return pathLabels
  const leafLabels = scope.leafFilter
    .map((id) => TAXONOMY[id]?.label ?? id)
    .join('、')
  if (scope.leafFilter.length === 1) return `${pathLabels} · 仅：${leafLabels}`
  return `${pathLabels} · 合并 ${scope.leafFilter.length} 类：${leafLabels}`
}

/** 线上 / 线下分类树路径上的标题着色 */
export function scopeTaxonomySpectrumStyle(
  scope: BlackScope,
): CSSProperties | undefined {
  if (scope.leafFilter && scope.leafFilter.length > 1) {
    const last = scope.path[scope.path.length - 1]!
    const c = taxonomySpectrumColorForNodeId(last)
    return c === undefined ? undefined : { color: c }
  }
  const nodeId =
    scope.leafFilter?.length === 1
      ? scope.leafFilter[0]!
      : scope.path[scope.path.length - 1]!
  const c = taxonomySpectrumColorForNodeId(nodeId)
  return c === undefined ? undefined : { color: c }
}

/** @deprecated 请使用 scopeTaxonomySpectrumStyle */
export const scopeOfflineSpectrumStyle = scopeTaxonomySpectrumStyle

export function parentScope(scope: BlackScope): BlackScope | null {
  if (scope.leafFilter !== null && scope.leafFilter.length > 0) {
    return { path: [...scope.path], leafFilter: null }
  }
  if (scope.path.length <= 1) return null
  return { path: scope.path.slice(0, -1), leafFilter: null }
}
