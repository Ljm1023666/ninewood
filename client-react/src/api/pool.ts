import api from './index'

export const poolApi = {
  getActive(params?: {
    regionId?: number
    tags?: string
    excludeTags?: string
    untaggedOnly?: boolean
    isCertifiedOnly?: boolean
    special?: string
    page?: number
    pageSize?: number
  }) {
    return api.get('/demands/active', { params })
  },
  getDead(params?: {
    regionId?: number
    tags?: string
    excludeTags?: string
    page?: number
    pageSize?: number
  }) {
    return api.get('/demands/dead', { params })
  },
  extendDemand(id: string, months: number) {
    return api.post(`/demands/${id}/extend`, { months })
  },
  completeDemand(id: string, coverImage: string) {
    return api.post(`/demands/${id}/complete`, { coverImage })
  },
  bid(id: string, params?: { offerPrice?: number; message?: string }) {
    return api.post(`/demands/${id}/bid`, params)
  },
  getBids(id: string) {
    return api.get(`/demands/${id}/bids`)
  },
  updatePush(id: string, config: { tags?: string[]; keywords?: string[]; ageRanges?: string[] }) {
    return api.put(`/demands/${id}/push`, config)
  },
  executePush(id: string) {
    return api.post(`/demands/${id}/push/execute`)
  },
  getMyBids(page = 1, limit = 20) {
    return api.get('/demands/my-applications', { params: { page, limit } })
  },
}
