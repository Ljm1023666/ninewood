import api from './index'

export const demandApi = {
  list(params?: Record<string, any>) {
    return api.get('/demands/search', { params })
  },
  get(id: string) {
    return api.get(`/demands/${id}`)
  },
  create(formData: FormData) {
    // 勿手写 multipart Content-Type，否则缺少 boundary；由浏览器/axios 自动设置
    return api.post('/demands', formData, { timeout: 600_000 })
  },
  apply(id: string, data: { offerPrice?: number; message?: string }) {
    return api.post(`/demands/${id}/apply`, data)
  },
  snatch(id: string) {
    return api.post(`/demands/${id}/snatch`)
  },
  acceptSnatch(id: string, applicationId: string) {
    return api.post(`/demands/${id}/accept-snatch`, { applicationId })
  },
  myDemands(page = 1) {
    return api.get('/demands/my', { params: { page } })
  },
  myApplications(page = 1) {
    return api.get('/demands/my-applications', { params: { page } })
  },
  getApplications(id: string) {
    return api.get(`/demands/${id}/applications`)
  },
  deleteDemand(id: string) {
    return api.delete(`/demands/${id}`)
  },
  getMyStatus() {
    return api.get('/demands/my-status')
  },
  // AI 2.5
  requestDemand(id: string, message: string) {
    return api.post(`/demands/${id}/request`, { message })
  },
  acceptApplicant(id: string, applicantId: string) {
    return api.post(`/demands/${id}/accept/${applicantId}`)
  },
  rejectApplicant(id: string, applicantId: string) {
    return api.post(`/demands/${id}/reject/${applicantId}`)
  },
  getApplicantsV2(id: string) {
    return api.get(`/demands/${id}/applicants-v2`)
  },
  withdrawDemand(id: string) {
    return api.post(`/demands/${id}/withdraw`)
  },
  // AI 2.8: 结算明细
  getSettlement(id: string) {
    return api.get(`/transactions/${id}/breakdown`)
  },
  searchProviders(params: {
    tagName?: string
    regionId?: number
    page?: number
  }) {
    return api.get('/providers/search', { params })
  },
}
