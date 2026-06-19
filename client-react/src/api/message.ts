import api from './index'

export const messageApi = {
  conversations() {
    return api.get('/messages/conversations')
  },
  list(userId: string, page = 1) {
    return api.get(`/messages/${userId}`, { params: { page } })
  },
  send(toUserId: string, content: string) {
    return api.post('/messages/send', { toUserId, content })
  },
  sendForm(formData: FormData) {
    return api.post('/messages/send', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  notifications(page = 1) {
    return api.get('/messages/notifications', { params: { page } })
  },
  unreadCount() {
    return api.get('/messages/unread-count')
  },
}
