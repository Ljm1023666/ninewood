/**
 * Task 10 · 共享需求搜索（Wave B 从 tools.ts 抽取）
 *
 * 单一来源供两处使用：
 *   - Agent 工具 `search_demands`（聊天中按需调用）
 *   - 自动化任务类型 `DEMAND_DIGEST.run`（定时调用，禁止 LLM）
 *
 * 自动化场景下 limit 硬顶 10（spec §0.1）；agent 聊天最多 20。
 * 任何对需求搜索逻辑的修改必须保证两边一致。
 */

import { prisma } from '../../lib/prisma.js'

export interface DemandSearchFilters {
  keyword?: string
  category?: string
  serviceType?: 'ONLINE' | 'OFFLINE'
  cityCode?: string
  tagName?: string
  minPrice?: number
  maxPrice?: number
  /** 仅 N 小时内发布（自动化专用） */
  createdWithinHours?: number
  /** 限制条数 */
  limit?: number
}

export interface DemandSearchItem {
  id: string
  title: string
  category: string
  type: 'ONLINE' | 'OFFLINE'
  price: number
  city: string | null
  applicants: number
  createdAt: Date
  expireAt: Date
  isWelfare: boolean
}

export const DEMAND_SEARCH_AGENT_LIMIT = 20
export const DEMAND_SEARCH_AUTOMATION_LIMIT = 10

/** 共享 where 构造；调用方负责 take/limit 上限 */
function buildWhere(filters: DemandSearchFilters): Record<string, unknown> {
  const where: Record<string, unknown> = { isPublic: true, status: 'ACTIVE' }
  if (filters.keyword) {
    where.OR = [
      { title: { contains: filters.keyword } },
      { description: { contains: filters.keyword } },
    ]
  }
  if (filters.category) where.category = { contains: filters.category }
  if (filters.serviceType) where.serviceType = filters.serviceType
  if (filters.cityCode) where.cityCode = filters.cityCode
  if (filters.tagName) where.tagName = filters.tagName
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const p: Record<string, unknown> = {}
    if (filters.minPrice !== undefined) p.gte = filters.minPrice
    if (filters.maxPrice !== undefined) p.lte = filters.maxPrice
    where.minPrice = p
  }
  if (filters.createdWithinHours !== undefined && filters.createdWithinHours > 0) {
    const since = new Date(Date.now() - filters.createdWithinHours * 3600_000)
    where.createdAt = { gte: since }
  }
  return where
}

/**
 * 通用需求搜索。
 * limitMax 由调用方指定：agent 聊天 = 20，自动化 = 10。
 */
export async function searchDemands(
  filters: DemandSearchFilters,
  opts: { limitMax?: number } = {},
): Promise<DemandSearchItem[]> {
  const limitMax = opts.limitMax ?? DEMAND_SEARCH_AGENT_LIMIT
  const limit = Math.min(filters.limit ?? limitMax, limitMax)
  const where = buildWhere(filters)

  const rows = await prisma.demand.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      category: true,
      serviceType: true,
      minPrice: true,
      cityCode: true,
      applicantCount: true,
      createdAt: true,
      expireAt: true,
      isPublicWelfare: true,
    },
  })

  return rows.map(d => ({
    id: d.id,
    title: d.title,
    category: d.category,
    type: d.serviceType,
    price: Number(d.minPrice),
    city: d.cityCode,
    applicants: d.applicantCount,
    createdAt: d.createdAt,
    expireAt: d.expireAt,
    isWelfare: d.isPublicWelfare,
  }))
}