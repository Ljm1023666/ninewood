import api from './index'

export const complaintApi = {
  create(data: { toUserId: string; demandId: string; reason: string }) {
    return api.post('/complaints', data)
  },
  list(page = 1) {
    return api.get('/complaints', { params: { page } })
  },
}
