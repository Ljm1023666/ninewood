/**
 * 通知主权 Feature Flag（Phase 1B）。
 *
 * NOTIFICATION_SOVEREIGNTY_ENABLED=0（默认）：
 *   - 不接管 Demand / AgentTask 非必要发送；保留旧行为
 *   - 不得因 flag=0 改写 Notification* 表
 *
 * NOTIFICATION_SOVEREIGNTY_ENABLED=1：
 *   - 仅接管白名单事件：DEMAND_MATCHED、AGENT_TASK_RESULT
 *   - 不接管 Order / 私聊 / Socket 私信 / 争议等交易必要路径
 *
 * 退出条件：见 PRODUCT-TIME-SOVEREIGNTY-ENGINEERING-SPEC §17.1
 */

/** Phase 1B 允许接管的非必要事件 */
export const TAKEOVER_EVENT_TYPES = ['DEMAND_MATCHED', 'AGENT_TASK_RESULT'] as const

export type TakeoverEventType = (typeof TAKEOVER_EVENT_TYPES)[number]

export function isNotificationSovereigntyEnabled(): boolean {
  return process.env.NOTIFICATION_SOVEREIGNTY_ENABLED === '1'
}

/** API 默认开启；显式 =0 时关闭（404） */
export function isNotificationSovereigntyApiEnabled(): boolean {
  if (process.env.NOTIFICATION_SOVEREIGNTY_API === '0') return false
  return true
}

export function isTakeoverEventType(eventType: string): eventType is TakeoverEventType {
  return (TAKEOVER_EVENT_TYPES as readonly string[]).includes(eventType)
}

/**
 * 按事件类型控制是否接管业务发送。
 * flag=0 → 一律 false；flag=1 → 仅白名单非必要事件。
 */
export function canTakeOverNotificationTraffic(eventType: string): boolean {
  if (!isNotificationSovereigntyEnabled()) return false
  return isTakeoverEventType(eventType)
}

/** @deprecated 使用 canTakeOverNotificationTraffic(eventType) */
export function canTakeOverLegacyNotificationTraffic(): boolean {
  return false
}
