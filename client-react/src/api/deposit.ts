import api from './index'

export const depositApi = {
  hold(demandIds: string[]) {
    return api.post('/deposits/hold', { demandIds })
  },
  my() {
    return api.get('/deposits/my')
  },
  returnDeposit(id: string) {
    return api.post(`/deposits/${id}/return`)
  },
}
