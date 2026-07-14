import api from './index'

export const reportApi = {
  create(data: {
    targetUserId: string
    messageId?: string
    demandId?: string
    category?: 'spam' | 'abuse' | 'adult' | 'scam' | 'other'
    reason: string
  }) {
    return api.post('/reports', data)
  },
  list(page = 1) {
    return api.get('/reports', { params: { page } })
  },
}
