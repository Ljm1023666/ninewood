/**
 * 旧偏好 → 新主权模型的映射（Phase 1B 冻结规则）。
 *
 * 硬约束：
 * - receivePushes=true → 不创建订阅，仅建议 filters
 * - 无 PushPreference → NO_OP（非全接受）
 * - UserTag.autoReceive=true → DEMAND_MATCHED / sourceRef=user_tag:{id}
 * - AgentTask 启用且含 MESSAGE → AGENT_TASK_RESULT / sourceRef=agent_task:{id}
 */

export type LegacyPushPreferenceSnapshot = {
  receivePushes: boolean
  pushFrequency: 'HIGH' | 'NORMAL' | 'LOW' | 'OFF'
  excludeKeywords: string[]
  excludeTags: string[]
  excludeRegions: number[]
}

export type LegacyUserTagSnapshot = {
  id: string
  tagName: string
  autoReceive: boolean
  regionId?: number | null
}

export type LegacyAgentTaskSnapshot = {
  id: string
  enabled: boolean
  deliveryChannels: unknown
}

export type MigrationPlanItem =
  | {
      kind: 'PAUSE_NON_ESSENTIAL'
      reason: string
    }
  | {
      kind: 'SUGGEST_FILTERS_ONLY'
      reason: string
      filters: {
        excludeKeywords: string[]
        excludeTags: string[]
        excludeRegions: number[]
      }
      suggestedDigestBias?: 'HIGH' | 'NORMAL' | 'LOW' | 'OFF'
    }
  | {
      kind: 'CREATE_SUBSCRIPTION'
      eventType: 'DEMAND_MATCHED' | 'AGENT_TASK_RESULT'
      sourceRef: string
      mode: 'IMMEDIATE' | 'DIGEST'
      channels: Array<'IN_APP' | 'WINDOWS' | 'EMAIL'>
      filters: Record<string, unknown>
      reason: string
    }
  | {
      kind: 'NO_OP'
      reason: string
    }

export function userTagSourceRef(tagId: string): string {
  return `user_tag:${tagId}`
}

export function agentTaskSourceRef(taskId: string): string {
  return `agent_task:${taskId}`
}

/**
 * receivePushes=true 不能视为永久同意；不创建任何开启订阅。
 * receivePushes=false → 暂停非必要（明确关闭意图）。
 */
export function planFromPushPreference(
  pref: LegacyPushPreferenceSnapshot | null,
): MigrationPlanItem[] {
  if (!pref) {
    return [
      {
        kind: 'NO_OP',
        reason: '无 PushPreference：新模型下非必要默认 OFF，不得解释为全接受',
      },
    ]
  }
  if (!pref.receivePushes || pref.pushFrequency === 'OFF') {
    return [
      {
        kind: 'PAUSE_NON_ESSENTIAL',
        reason: 'receivePushes=false 或频率 OFF：迁移为暂停全部非必要通知',
      },
    ]
  }
  return [
    {
      kind: 'SUGGEST_FILTERS_ONLY',
      reason:
        'receivePushes=true 不能视为永久同意；排除条件仅作新设置页预填建议，须用户明确保存订阅后才生效',
      filters: {
        excludeKeywords: pref.excludeKeywords,
        excludeTags: pref.excludeTags,
        excludeRegions: pref.excludeRegions,
      },
      suggestedDigestBias: pref.pushFrequency,
    },
  ]
}

export function planFromUserTag(tag: LegacyUserTagSnapshot): MigrationPlanItem {
  if (!tag.autoReceive) {
    return {
      kind: 'NO_OP',
      reason: 'autoReceive=false：非明确订阅意图',
    }
  }
  const filters: Record<string, unknown> = { tags: [tag.tagName] }
  if (tag.regionId != null) {
    filters.regionIds = [tag.regionId]
  }
  return {
    kind: 'CREATE_SUBSCRIPTION',
    eventType: 'DEMAND_MATCHED',
    sourceRef: userTagSourceRef(tag.id),
    mode: 'IMMEDIATE',
    channels: ['IN_APP'],
    filters,
    reason: 'UserTag.autoReceive=true → DEMAND_MATCHED 正向订阅',
  }
}

function channelsIncludeMessage(raw: unknown): boolean {
  if (!Array.isArray(raw)) return false
  return raw.map(String).includes('MESSAGE')
}

export function planFromAgentTask(task: LegacyAgentTaskSnapshot): MigrationPlanItem {
  if (!task.enabled) {
    return { kind: 'NO_OP', reason: 'AgentTask 未启用' }
  }
  if (!channelsIncludeMessage(task.deliveryChannels)) {
    return {
      kind: 'NO_OP',
      reason: 'AgentTask 未选择 MESSAGE 渠道：不应创建系统消息订阅（N11）',
    }
  }
  return {
    kind: 'CREATE_SUBSCRIPTION',
    eventType: 'AGENT_TASK_RESULT',
    sourceRef: agentTaskSourceRef(task.id),
    mode: 'IMMEDIATE',
    channels: ['IN_APP'],
    filters: { taskId: task.id },
    reason: '启用中的 AgentTask 且含 MESSAGE → AGENT_TASK_RESULT 订阅',
  }
}

export { channelsIncludeMessage }
