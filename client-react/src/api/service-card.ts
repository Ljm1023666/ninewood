import api from './index'

export type ServiceCardClaim = {
  id: string
  label: string
  description: string | null
  isHighlighted: boolean
  sortOrder: number
}

export type ServiceCardEvidence = {
  label: string
  completedCount: number
  successfulCount: number
  successRate: number | null
  lastCompletedAt: string | null
  calculatedAt: string
}

export type ServiceCard = {
  id: string
  title: string
  summary: string | null
  description: string
  coverImage: string | null
  category: string
  serviceType: 'ONLINE' | 'OFFLINE'
  cityCode: string | null
  regionId: number | null
  paths: string[]
  tags: string[]
  priceMin: string | number | null
  priceMax: string | number | null
  priceUnit: string | null
  deliveryMode: string
  availability: string
  status: string
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  publisher?: {
    id: string
    nickname: string
    avatarUrl: string | null
    certificationLevel: string
    completedOrders: number
  }
  claims: ServiceCardClaim[]
  evidence: ServiceCardEvidence[]
  isOwner?: boolean
}

type Envelope<T> = { data: T }

export type ServiceCardInput = {
  title: string
  summary?: string
  description: string
  coverImage?: string
  category: string
  serviceType?: 'ONLINE' | 'OFFLINE'
  cityCode?: string
  regionId?: number
  paths?: string[]
  tags?: string[]
  priceMin?: number
  priceMax?: number
  priceUnit?: string
  deliveryMode?: string
  availability?: string
  claims?: Array<{ label: string; description?: string }>
}

export const serviceCardApi = {
  async create(input: ServiceCardInput) {
    const res = await api.post<Envelope<ServiceCard>>('/service-cards', input)
    return res.data.data
  },
  async listMine() {
    const res = await api.get<Envelope<ServiceCard[]>>('/service-cards/mine')
    return res.data.data
  },
  async get(id: string) {
    const res = await api.get<Envelope<ServiceCard>>(`/service-cards/${id}`)
    return res.data.data
  },
  async getOwned(id: string) {
    const res = await api.get<Envelope<ServiceCard>>(`/service-cards/owned/${id}`)
    return res.data.data
  },
  async update(id: string, input: ServiceCardInput) {
    const res = await api.patch<Envelope<ServiceCard>>(`/service-cards/${id}`, input)
    return res.data.data
  },
  async publish(id: string) {
    const res = await api.post<Envelope<ServiceCard>>(`/service-cards/${id}/publish`)
    return res.data.data
  },
  async unpublish(id: string) {
    const res = await api.post<Envelope<ServiceCard>>(`/service-cards/${id}/unpublish`)
    return res.data.data
  },
  async search(params: { keyword?: string; category?: string; tags?: string[]; limit?: number } = {}) {
    const res = await api.get<Envelope<ServiceCard[]>>('/service-cards/search', {
      params: { ...params, tags: params.tags?.join(',') },
    })
    return res.data.data
  },
}
