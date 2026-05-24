import api from './index'

export const certificationApi = {
  register(data: { tags: string[]; regionId?: number }) {
    return api.post('/certification/register', data)
  },
  getProviders(params?: {
    tags?: string
    regionId?: number
    minRating?: number
    page?: number
    limit?: number
  }) {
    return api.get('/certification/providers', { params })
  },
  getProvider(userId: string) {
    return api.get(`/certification/providers/${userId}`)
  },
}
