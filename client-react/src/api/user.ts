import api from './index'

export const userApi = {
  getMe() {
    return api.get('/users/me')
  },
  get(id: string) {
    return api.get(`/users/${id}`)
  },
  updateProfile(data: FormData | Record<string, any>) {
    const isFormData = data instanceof FormData
    return api.put(
      '/users/profile',
      data,
      isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {},
    )
  },
  certStatus() {
    return api.get('/users/cert-status')
  },
  upgradeCert() {
    return api.post('/users/upgrade-cert')
  },
  snatchStatus() {
    return api.get('/users/snatch-status')
  },
  search(keyword: string) {
    return api.get('/users/search', { params: { keyword } })
  },
  follow(id: string) {
    return api.post(`/users/${id}/follow`)
  },
  unfollow(id: string) {
    return api.delete(`/users/${id}/follow`)
  },
  followers(id: string, page = 1) {
    return api.get(`/users/${id}/followers`, { params: { page } })
  },
  following(id: string, page = 1) {
    return api.get(`/users/${id}/following`, { params: { page } })
  },
  toggleFavorite(demandId: string) {
    return api.post(`/users/favorites/${demandId}`)
  },
  getFavorites(page = 1) {
    return api.get('/users/favorites', { params: { page } })
  },
  getFavoriteStatus(demandId: string) {
    return api.get(`/users/favorites/${demandId}/status`)
  },
  searchByTags(tags: string, params?: { regionId?: number; includeBusy?: boolean; page?: number }) {
    return api.get('/users/search', { params: { tags, ...params } })
  },
  updateTags(tags: string[]) {
    return api.put('/users/tags', { tags })
  },
  getMyTags() {
    return api.get('/users/tags')
  },
  getUserTags(userId: string) {
    return api.get(`/users/tags/${userId}`)
  },
  updateBusy(isBusy: boolean, allowSpecialSearch?: boolean) {
    return api.put('/users/busy', { isBusy, allowSpecialSearch })
  },
  getMyBusy() {
    return api.get('/users/busy')
  },
  getBlocklist() {
    return api.get('/users/blocklist')
  },
  updateBlocklist(blocklist: { tags?: string[]; keywords?: string[]; ageRanges?: string[] }) {
    return api.put('/users/blocklist', blocklist)
  },
}
