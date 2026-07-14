import api from './index'
import type { ServiceCard } from './service-card'

export type UnifiedDemandResult = {
  resultType: 'DEMAND'
  id: string
  title: string
  category: string
  type: string
  price: number
  city: string | null
  applicants: number
  createdAt: string
  expireAt: string
  isWelfare: boolean
}

export type UnifiedCardResult =
  | UnifiedDemandResult
  | (ServiceCard & { resultType: 'SERVICE_CARD' })

export const cardSearchApi = {
  async search(keyword: string, identity: 'DEMANDER' | 'PROVIDER') {
    const res = await api.get<{ data: { items: UnifiedCardResult[]; identity: string } }>(
      '/search/cards',
      { params: { keyword, identity } },
    )
    return res.data.data.items
  },
}
