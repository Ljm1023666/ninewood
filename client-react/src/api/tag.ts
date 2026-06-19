import api from './index'

export const tagApi = {
  list(q?: string) {
    return api.get('/tags', { params: { q } })
  },
  getByName(name: string) {
    return api.get(`/tags/${encodeURIComponent(name)}`)
  },
  create(name: string, category?: string) {
    return api.post('/tags', { name, category })
  },
  delete(name: string) {
    return api.delete(`/tags/${encodeURIComponent(name)}`)
  },
}
