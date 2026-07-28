import api from './index'

export type DiscussionTopic = {
  id: string
  title: string
  content: string
  isPinned: boolean
  createdAt: string
  circleId: string
  circleName: string
  publisherId: string
  publisherNickname: string
  publisherAvatar: string | null
  tags: string
}

export const discussionsApi = {
  list(params?: { page?: number; pageSize?: number }) {
    return api.get('/discussions', { params })
  },
  publishTargets() {
    return api.get('/discussions/publish-targets')
  },
}
