import api from './index'

export const demandApi = {
  list(params?: Record<string, any>) {
    return api.get('/demands/search', { params })
  },
  get(id: string) {
    return api.get(`/demands/${id}`)
  },
  create(formData: FormData) {
    return api.post('/demands', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
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
}
