/**
 * 旧偏好迁移映射纯函数测试（不写库）。
 */
import { describe, it, expect, afterEach } from 'vitest'
import {
  planFromAgentTask,
  planFromPushPreference,
  planFromUserTag,
  userTagSourceRef,
  agentTaskSourceRef,
} from './notification-legacy-migration.js'
import { isInQuietHours, isValidTimezone } from './notification-decision.service.js'
import { canTakeOverNotificationTraffic } from '../config/notification-sovereignty.js'

describe('notification legacy migration mapping', () => {
  it('无 PushPreference → NO_OP（不得全接受）', () => {
    const plan = planFromPushPreference(null)
    expect(plan).toHaveLength(1)
    expect(plan[0].kind).toBe('NO_OP')
  })

  it('receivePushes=false → PAUSE_NON_ESSENTIAL', () => {
    const plan = planFromPushPreference({
      receivePushes: false,
      pushFrequency: 'NORMAL',
      excludeKeywords: [],
      excludeTags: [],
      excludeRegions: [],
    })
    expect(plan[0].kind).toBe('PAUSE_NON_ESSENTIAL')
  })

  it('receivePushes=true → 仅建议 filters，不创建订阅', () => {
    const plan = planFromPushPreference({
      receivePushes: true,
      pushFrequency: 'HIGH',
      excludeKeywords: ['spam'],
      excludeTags: ['x'],
      excludeRegions: [1],
    })
    expect(plan[0].kind).toBe('SUGGEST_FILTERS_ONLY')
    if (plan[0].kind === 'SUGGEST_FILTERS_ONLY') {
      expect(plan[0].filters.excludeKeywords).toEqual(['spam'])
    }
  })

  it('UserTag.autoReceive=true → DEMAND_MATCHED / user_tag:{id}', () => {
    const item = planFromUserTag({
      id: 'tag-1',
      tagName: '家电维修',
      autoReceive: true,
      regionId: 330100,
    })
    expect(item.kind).toBe('CREATE_SUBSCRIPTION')
    if (item.kind === 'CREATE_SUBSCRIPTION') {
      expect(item.eventType).toBe('DEMAND_MATCHED')
      expect(item.sourceRef).toBe(userTagSourceRef('tag-1'))
      expect(item.mode).toBe('IMMEDIATE')
      expect(item.filters).toEqual({ tags: ['家电维修'], regionIds: [330100] })
    }
  })

  it('AgentTask 无 MESSAGE → NO_OP（N11）', () => {
    const item = planFromAgentTask({
      id: 't1',
      enabled: true,
      deliveryChannels: ['AGENT_INBOX'],
    })
    expect(item.kind).toBe('NO_OP')
  })

  it('AgentTask 启用且含 MESSAGE → AGENT_TASK_RESULT IMMEDIATE', () => {
    const item = planFromAgentTask({
      id: 't2',
      enabled: true,
      deliveryChannels: ['MESSAGE', 'AGENT_INBOX'],
    })
    expect(item.kind).toBe('CREATE_SUBSCRIPTION')
    if (item.kind === 'CREATE_SUBSCRIPTION') {
      expect(item.eventType).toBe('AGENT_TASK_RESULT')
      expect(item.sourceRef).toBe(agentTaskSourceRef('t2'))
      expect(item.mode).toBe('IMMEDIATE')
      expect(item.filters).toEqual({ taskId: 't2' })
    }
  })
})

describe('quiet hours helper', () => {
  it('校验时区', () => {
    expect(isValidTimezone('Asia/Shanghai')).toBe(true)
    expect(isValidTimezone('Not/AZone')).toBe(false)
  })

  it('跨午夜安静时段', () => {
    const inQuiet = new Date('2026-07-28T15:30:00.000Z')
    expect(isInQuietHours(inQuiet, 'Asia/Shanghai', '22:00', '07:00')).toBe(true)
    const day = new Date('2026-07-28T04:00:00.000Z')
    expect(isInQuietHours(day, 'Asia/Shanghai', '22:00', '07:00')).toBe(false)
  })
})

describe('takeover flag', () => {
  const prev = process.env.NOTIFICATION_SOVEREIGNTY_ENABLED
  afterEach(() => {
    if (prev === undefined) delete process.env.NOTIFICATION_SOVEREIGNTY_ENABLED
    else process.env.NOTIFICATION_SOVEREIGNTY_ENABLED = prev
  })

  it('flag=0 不接管任何事件', () => {
    process.env.NOTIFICATION_SOVEREIGNTY_ENABLED = '0'
    expect(canTakeOverNotificationTraffic('DEMAND_MATCHED')).toBe(false)
    expect(canTakeOverNotificationTraffic('ORDER_FUNDS_CHANGED')).toBe(false)
  })

  it('flag=1 仅接管白名单非必要事件', () => {
    process.env.NOTIFICATION_SOVEREIGNTY_ENABLED = '1'
    expect(canTakeOverNotificationTraffic('DEMAND_MATCHED')).toBe(true)
    expect(canTakeOverNotificationTraffic('AGENT_TASK_RESULT')).toBe(true)
    expect(canTakeOverNotificationTraffic('ORDER_FUNDS_CHANGED')).toBe(false)
    expect(canTakeOverNotificationTraffic('SECURITY_ALERT')).toBe(false)
  })
})
