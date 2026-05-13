import api from './index'

export const shortsApi = {
  list(params?: { tab?: string; page?: number; limit?: number }) {
    return api.get('/shorts', { params })
  },
  create(data: {
    mediaUrl: string
    coverUrl?: string
    description?: string
    tags?: string[]
  }) {
    return api.post('/shorts', data)
  },
}
