/**
 * 通知事件类型白名单（Phase 1A）。
 * 禁止任意字符串进入决策；新增 eventType 必须先登记。
 */

export const NOTIFICATION_CATEGORIES = [
  'TRANSACTIONAL_REQUIRED',
  'USER_REQUESTED',
  'DIGEST',
  'RELATIONSHIP',
] as const

export type NotificationCategoryName = (typeof NOTIFICATION_CATEGORIES)[number]

export const NOTIFICATION_CHANNELS = ['IN_APP', 'WINDOWS', 'EMAIL'] as const
export type NotificationChannelName = (typeof NOTIFICATION_CHANNELS)[number]

export const NOTIFICATION_MODES = ['IMMEDIATE', 'DIGEST', 'OFF'] as const
export type NotificationModeName = (typeof NOTIFICATION_MODES)[number]

export type RegisteredEventType =
  | 'ORDER_FUNDS_CHANGED'
  | 'ORDER_STATUS_CHANGED'
  | 'SECURITY_ALERT'
  | 'DISPUTE_UPDATE'
  | 'TASK_RESULT_WAITING'
  | 'DEMAND_MATCHED'
  | 'LOOP_RUN_RESULT'
  | 'AGENT_TASK_RESULT'
  | 'TAG_AUTO_RECEIVE_MATCH'
  | 'OPPORTUNITY_DIGEST'
  | 'CIRCLE_DIGEST'
  | 'RELATIONSHIP_CHANGE'
  | 'CIRCLE_MEMBERSHIP_CHANGE'
  | 'TASK_QUIETED'

export type EventTypeDefinition = {
  eventType: RegisteredEventType
  category: NotificationCategoryName
  description: string
}

export const NOTIFICATION_EVENT_REGISTRY: Record<RegisteredEventType, EventTypeDefinition> = {
  ORDER_FUNDS_CHANGED: {
    eventType: 'ORDER_FUNDS_CHANGED',
    category: 'TRANSACTIONAL_REQUIRED',
    description: '资金/托管/结算变化',
  },
  ORDER_STATUS_CHANGED: {
    eventType: 'ORDER_STATUS_CHANGED',
    category: 'TRANSACTIONAL_REQUIRED',
    description: '订单状态变化',
  },
  SECURITY_ALERT: {
    eventType: 'SECURITY_ALERT',
    category: 'TRANSACTIONAL_REQUIRED',
    description: '安全与登录异常',
  },
  DISPUTE_UPDATE: {
    eventType: 'DISPUTE_UPDATE',
    category: 'TRANSACTIONAL_REQUIRED',
    description: '争议处理更新',
  },
  TASK_RESULT_WAITING: {
    eventType: 'TASK_RESULT_WAITING',
    category: 'TRANSACTIONAL_REQUIRED',
    description: '用户正在等待的任务结果',
  },
  DEMAND_MATCHED: {
    eventType: 'DEMAND_MATCHED',
    category: 'USER_REQUESTED',
    description: '用户订阅的需求匹配',
  },
  LOOP_RUN_RESULT: {
    eventType: 'LOOP_RUN_RESULT',
    category: 'USER_REQUESTED',
    description: '回运行结果（用户订阅）',
  },
  AGENT_TASK_RESULT: {
    eventType: 'AGENT_TASK_RESULT',
    category: 'USER_REQUESTED',
    description: '定时 Agent 任务结果',
  },
  TAG_AUTO_RECEIVE_MATCH: {
    eventType: 'TAG_AUTO_RECEIVE_MATCH',
    category: 'USER_REQUESTED',
    description: '标签主动接受匹配（对应 UserTag.autoReceive）',
  },
  OPPORTUNITY_DIGEST: {
    eventType: 'OPPORTUNITY_DIGEST',
    category: 'DIGEST',
    description: '机会摘要',
  },
  CIRCLE_DIGEST: {
    eventType: 'CIRCLE_DIGEST',
    category: 'DIGEST',
    description: '圈子摘要',
  },
  RELATIONSHIP_CHANGE: {
    eventType: 'RELATIONSHIP_CHANGE',
    category: 'RELATIONSHIP',
    description: '合作关系变化',
  },
  CIRCLE_MEMBERSHIP_CHANGE: {
    eventType: 'CIRCLE_MEMBERSHIP_CHANGE',
    category: 'RELATIONSHIP',
    description: '圈子成员关系变化',
  },
  TASK_QUIETED: {
    eventType: 'TASK_QUIETED',
    category: 'TRANSACTIONAL_REQUIRED',
    description: '任务已 Quiet（审计聚合，不打断用户）',
  },
}

export function isRegisteredEventType(value: string): value is RegisteredEventType {
  return Object.prototype.hasOwnProperty.call(NOTIFICATION_EVENT_REGISTRY, value)
}

export function getEventDefinition(eventType: string): EventTypeDefinition | null {
  if (!isRegisteredEventType(eventType)) return null
  return NOTIFICATION_EVENT_REGISTRY[eventType]
}

export function isNonEssentialCategory(category: NotificationCategoryName): boolean {
  return category !== 'TRANSACTIONAL_REQUIRED'
}
