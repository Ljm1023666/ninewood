import api from './index'

export const orderApi = {
  create(demandId: string, applicationId: string) {
    return api.post('/orders', { demandId, applicationId })
  },
  list(params?: { role?: string; page?: number }) {
    return api.get('/orders', { params })
  },
  get(id: string) {
    return api.get(`/orders/${id}`)
  },
  prepay(id: string) {
    return api.post(`/orders/${id}/prepay`)
  },
  complete(id: string) {
    return api.post(`/orders/${id}/complete`)
  },
  confirm(id: string) {
    return api.post(`/orders/${id}/confirm`)
  },
  dispute(id: string) {
    return api.post(`/orders/${id}/dispute`)
  },
  partial(id: string, newPrice: number, description: string) {
    return api.post(`/orders/${id}/partial`, { newPrice, description })
  },
}
