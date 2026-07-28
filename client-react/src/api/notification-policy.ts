import api from '@/api'

export type NotificationPolicy = {
  id: string
  userId: string
  timezone: string
  quietHoursStart: string | null
  quietHoursEnd: string | null
  dailyInterruptCap: number
  nonEssentialPaused: boolean
}

export type NotificationSubscription = {
  id: string
  userId: string
  category: string
  eventType: string
  mode: 'IMMEDIATE' | 'DIGEST' | 'OFF'
  channels: Array<'IN_APP' | 'WINDOWS' | 'EMAIL'>
  filters: Record<string, unknown>
  sourceRef: string
  expiresAt: string | null
  createdAt: string
}

export type NotificationDelivery = {
  id: string
  eventType: string
  reasonCode: string
  reasonText: string
  channel: string
  status: string
  suppressionCode: string | null
  resourceType: string | null
  resourceId: string | null
  createdAt: string
}

export type CompletionSummary = {
  resourceType: 'LOOP_RUN' | 'ORDER' | 'AGENT_TASK' | 'DEMAND'
  resourceId: string
  outcomeStatus:
    | 'SUCCEEDED'
    | 'FAILED'
    | 'INCONCLUSIVE'
    | 'CANCELLED'
    | 'WITHDRAWN'
    | 'EXPIRED'
  outcomeSummary: string
  evidenceSummary?: string[]
  nextRequiredAction: null | { label: string; action: string }
  notificationsStopped: string[]
  quietedAt?: string
  alreadyQuiet?: boolean
}

export const notificationPolicyApi = {
  getPolicy: () => api.get('/notifications/policy'),
  updatePolicy: (body: Partial<NotificationPolicy>) => api.put('/notifications/policy', body),
  listSubscriptions: () => api.get('/notifications/subscriptions'),
  createSubscription: (body: {
    eventType: string
    mode: string
    channels: string[]
    filters?: Record<string, unknown>
    sourceRef?: string
    expiresAt?: string | null
  }) => api.post('/notifications/subscriptions', body),
  updateSubscription: (id: string, body: Record<string, unknown>) =>
    api.put(`/notifications/subscriptions/${id}`, body),
  deleteSubscription: (id: string) => api.delete(`/notifications/subscriptions/${id}`),
  listDeliveries: (page = 1) =>
    api.get('/notifications/deliveries', { params: { page, limit: 20 } }),
  /** 旧偏好仅作建议预填，不代表永久同意 */
  getLegacyPreferences: () => api.get('/pushes/preferences'),
  getCompletion: (resourceType: string, resourceId: string) =>
    api.get(`/notifications/completion/${resourceType}/${resourceId}`),
}
