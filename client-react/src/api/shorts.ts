import api from './index'

export const shortsApi = {
  list(params?: { tab?: string; page?: number }) {
    return api.get('/shorts', { params })
  },
}
