import api from './index'

export const userTagApi = {
  list() {
    return api.get('/user-tags')
  },
  open(tagName: string, regionId?: number) {
    return api.post(`/user-tags/${encodeURIComponent(tagName)}`, { regionId })
  },
  close(tagName: string) {
    return api.delete(`/user-tags/${encodeURIComponent(tagName)}`)
  },
  toggle(tagName: string) {
    return api.post(`/user-tags/${encodeURIComponent(tagName)}/toggle`)
  },
  orderStart(tagName: string) {
    return api.post(`/user-tags/${encodeURIComponent(tagName)}/order-start`)
  },
  orderFinish(tagName: string) {
    return api.post(`/user-tags/${encodeURIComponent(tagName)}/order-finish`)
  },
}
