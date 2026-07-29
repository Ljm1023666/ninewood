import api from './index'

export type CircleActivityItem = {
  id: string;
  type: string;
  actor: { id: string; nickname: string } | null;
  title: string;
  summary: string | null;
  refId: string | null;
  createdAt: string;
};

export type CircleResourceItem = {
  id: string;
  name: string;
  fileUrl: string;
  mimeType: string | null;
  sizeBytes: number;
  sizeLabel: string;
  category: string;
  uploader: { id: string; nickname: string; avatarUrl: string | null };
  createdAt: string;
};

export type CircleMemberItem = {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
  lastSeenAt: string | null;
  lastActiveLabel: string;
  user: { id: string; nickname: string; avatarUrl: string | null; bio?: string | null };
};

export type CircleInviteItem = {
  id: string;
  email: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  statusLabel: string;
  invitedBy: { id: string; nickname: string };
  createdAt: string;
  expiresAt: string | null;
};



export const circleApi = {
  list() {
    return api.get('/circles/public')
  },
  my() {
    return api.get('/circles/my')
  },
  get(id: string) {
    return api.get(`/circles/${id}`)
  },
  create(data: { name: string; description?: string }) {
    return api.post('/circles', data)
  },
  joinByCode(code: string) {
    return api.post('/circles/join-by-code', { code })
  },
  applyPublic(data: { name: string; description?: string; cityCode?: string }) {
    return api.post('/circles/public/apply', data)
  },
  getDemands(circleId: string, page = 1) {
    return api.get(`/circles/${circleId}/demands`, { params: { page } })
  },
  // Task 8 / Wave B-E
  getHubHome(circleId: string) {
    return api.get(`/circles/${circleId}/hub/home`)
  },
  getHubActivities(circleId: string, page = 1) {
    return api.get(`/circles/${circleId}/hub/activities`, { params: { page } })
  },
  postAnnouncement(circleId: string, data: { title: string; body: string; pinned?: boolean }) {
    return api.post(`/circles/${circleId}/hub/announcements`, data)
  },

  getResources(circleId: string, params?: { category?: string; q?: string; page?: number; limit?: number }) {
    return api.get(`/circles/${circleId}/resources`, { params })
  },
  uploadResource(circleId: string, file: File, category?: string) {
    const fd = new FormData()
    fd.append('file', file)
    if (category) fd.append('category', category)
    return api.post(`/circles/${circleId}/resources`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteResource(circleId: string, resourceId: string) {
    return api.delete(`/circles/${circleId}/resources/${resourceId}`)
  },

  getAnalytics(circleId: string, range: '30d' | '7d' = '30d') {
    return api.get(`/circles/${circleId}/analytics`, { params: { range } })
  },

  getMembers(circleId: string, params?: { q?: string; page?: number; limit?: number }) {
    return api.get(`/circles/${circleId}/members`, { params })
  },

  listInvites(circleId: string) {
    return api.get(`/circles/${circleId}/invites`)
  },
  createInvite(circleId: string, email: string) {
    return api.post(`/circles/${circleId}/invites`, { email })
  },
  resendInvite(circleId: string, inviteId: string) {
    return api.post(`/circles/${circleId}/invites/${inviteId}/resend`)
  },
  revokeInvite(circleId: string, inviteId: string) {
    return api.delete(`/circles/${circleId}/invites/${inviteId}`)
  },

  postHeartbeat(circleId: string) {
    return api.post(`/circles/${circleId}/hub/heartbeat`)
  },
  join(circleId: string) {
    return api.post(`/circles/${circleId}/join`)
  },
  leave(circleId: string) {
    return api.post(`/circles/${circleId}/leave`)
  },

  listPosts(circleId: string, params?: { page?: number; pageSize?: number }) {
    return api.get(`/circles/${circleId}/posts`, { params })
  },
  createPost(circleId: string, content: string) {
    return api.post(`/circles/${circleId}/posts`, { content })
  },
  deletePost(circleId: string, postId: string) {
    return api.delete(`/circles/${circleId}/posts/${postId}`)
  },
  likePost(circleId: string, postId: string) {
    return api.post(`/circles/${circleId}/posts/${postId}/like`)
  },
  unlikePost(circleId: string, postId: string) {
    return api.delete(`/circles/${circleId}/posts/${postId}/like`)
  },
  listPostReplies(circleId: string, postId: string) {
    return api.get(`/circles/${circleId}/posts/${postId}/replies`)
  },
  createPostReply(circleId: string, postId: string, content: string) {
    return api.post(`/circles/${circleId}/posts/${postId}/replies`, { content })
  },
}

export type CirclePostItem = {
  id: string
  circleId: string
  userId: string
  content: string
  likeCount: number
  replyCount: number
  createdAt: string
  updatedAt: string
  userNickname: string
  userAvatar: string | null
  liked: boolean
  replies?: CirclePostReplyItem[]
}

export type CirclePostReplyItem = {
  id: string
  postId: string
  userId: string
  content: string
  createdAt: string
  userNickname: string
  userAvatar: string | null
}
