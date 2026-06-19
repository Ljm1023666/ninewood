/** 公开广场搜索排除的状态（冻结、进行中仅当事方可看详情） */
export const PUBLIC_SEARCH_EXCLUDED_STATUSES = ['FROZEN', 'IN_PROGRESS'] as const

export type DemandMarketplaceSnapshot = {
  status: string
  applicantCount: number
  maxApplicants?: number | null
}

/** 需求是否应出现在公开广场（非 geo SQL 路径的 post-filter 规则） */
export function isVisibleInMarketplace(demand: DemandMarketplaceSnapshot): boolean {
  if ((PUBLIC_SEARCH_EXCLUDED_STATUSES as readonly string[]).includes(demand.status)) {
    return false
  }
  const cap = demand.maxApplicants ?? 10
  if (['PENDING', 'ACTIVE'].includes(demand.status) && demand.applicantCount >= cap) {
    return false
  }
  return true
}
