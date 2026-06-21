import api from './index'

export const reviewApi = {
  create(orderId: string, rating: number, content?: string) {
    return api.post('/reviews', { orderId, rating, content })
  },
  getByOrder(orderId: string) {
    return api.get(`/reviews/order/${orderId}`)
  },
}
