import api from './index'

export const regionApi = {
  getChildren(parentId?: number) {
    return api.get('/regions', { params: { parentId } })
  },
  getTree() {
    return api.get('/regions/tree')
  },
  search(q: string) {
    return api.get('/regions/search', { params: { q } })
  },
  getById(id: number) {
    return api.get(`/regions/${id}`)
  },
}
