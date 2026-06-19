import api from './index'

export const complaintApi = {
  create(toUserId: string, demandId: string, reason: string) {
    return api.post('/complaints', { toUserId, demandId, reason })
  },
  list(page = 1) {
    return api.get('/complaints', { params: { page } })
  },
}
