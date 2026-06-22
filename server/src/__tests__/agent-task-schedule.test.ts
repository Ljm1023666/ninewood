import { describe, it, expect } from 'vitest'

/**
 * Wave B · computeNextRunAt + describeSchedule 单测
 *
 * 覆盖：
 *   - HOURLY: 整点漂移 / 已过则 +1h
 *   - DAILY:  atHour 必填 / 已过则 +1d
 *   - WEEKLY: weekday 必填 (1-7) / 跨天计算
 *   - describeSchedule 输出人类可读时刻
 *   - 非法参数抛 ScheduleValidationError
 */

import {
  computeNextRunAt,
  describeSchedule,
  ScheduleValidationError,
} from '../services/agent/task-schedule.js'

const now = new Date('2026-06-22T10:30:00.000+08:00') // 周一 10:30

describe('computeNextRunAt · HOURLY', () => {
  it('rolls forward to next :00 when current minute already passed', () => {
    const next = computeNextRunAt({ frequency: 'HOURLY', atMinute: 0 }, now)
    // 已过 10:00:00，应该 11:00
    expect(toISO(next)).toBe('2026-06-22T11:00:00.000+08:00')
  })

  it('rolls to current hour :atMinute if not yet passed', () => {
    const next = computeNextRunAt({ frequency: 'HOURLY', atMinute: 45 }, now)
    // 10:30 < 10:45 → 10:45
    expect(toISO(next)).toBe('2026-06-22T10:45:00.000+08:00')
  })

  it('rolls to next hour :atMinute if current minute exactly passed', () => {
    const exact = new Date('2026-06-22T10:00:00.000+08:00')
    const next = computeNextRunAt({ frequency: 'HOURLY', atMinute: 0 }, exact)
    // 相等（<=）按 +1h 处理
    expect(toISO(next)).toBe('2026-06-22T11:00:00.000+08:00')
  })
})

describe('computeNextRunAt · DAILY', () => {
  it('uses atHour from now when not yet passed', () => {
    const next = computeNextRunAt({ frequency: 'DAILY', atHour: 14, atMinute: 30 }, now)
    expect(toISO(next)).toBe('2026-06-22T14:30:00.000+08:00')
  })

  it('rolls to next day when atHour already passed', () => {
    const next = computeNextRunAt({ frequency: 'DAILY', atHour: 9, atMinute: 0 }, now)
    expect(toISO(next)).toBe('2026-06-23T09:00:00.000+08:00')
  })

  it('rolls to next day when exact match', () => {
    const exact = new Date('2026-06-22T10:00:00.000+08:00')
    const next = computeNextRunAt({ frequency: 'DAILY', atHour: 10, atMinute: 0 }, exact)
    expect(toISO(next)).toBe('2026-06-23T10:00:00.000+08:00')
  })

  it('throws when atHour missing', () => {
    expect(() => computeNextRunAt({ frequency: 'DAILY' }, now)).toThrow(ScheduleValidationError)
  })

  it('throws when atHour out of range', () => {
    expect(() => computeNextRunAt({ frequency: 'DAILY', atHour: 24 }, now)).toThrow(/0-23/)
  })
})

describe('computeNextRunAt · WEEKLY', () => {
  it('rolls to upcoming weekday in the same week', () => {
    // now 周一 10:30；目标 周三 09:00
    const next = computeNextRunAt({ frequency: 'WEEKLY', atHour: 9, atMinute: 0, weekday: 3 }, now)
    expect(toISO(next)).toBe('2026-06-24T09:00:00.000+08:00')
  })

  it('rolls to next week when target weekday already passed', () => {
    // now 周一；目标 周日 09:00 → 6 天后
    const next = computeNextRunAt({ frequency: 'WEEKLY', atHour: 9, atMinute: 0, weekday: 7 }, now)
    expect(toISO(next)).toBe('2026-06-28T09:00:00.000+08:00')
  })

  it('rolls to next week when target is today but time already passed', () => {
    // now 周一 10:30；目标 周一 09:00
    const next = computeNextRunAt({ frequency: 'WEEKLY', atHour: 9, atMinute: 0, weekday: 1 }, now)
    expect(toISO(next)).toBe('2026-06-29T09:00:00.000+08:00')
  })

  it('throws when weekday or atHour missing', () => {
    expect(() => computeNextRunAt({ frequency: 'WEEKLY', atHour: 9 }, now)).toThrow(/weekday/)
    expect(() => computeNextRunAt({ frequency: 'WEEKLY', weekday: 1 }, now)).toThrow(/atHour/)
  })

  it('throws on out-of-range weekday', () => {
    expect(() => computeNextRunAt({ frequency: 'WEEKLY', atHour: 9, weekday: 8 }, now)).toThrow(/1-7/)
    expect(() => computeNextRunAt({ frequency: 'WEEKLY', atHour: 9, weekday: 0 }, now)).toThrow(/1-7/)
  })
})

describe('computeNextRunAt · unsupported', () => {
  it('throws on unknown frequency', () => {
    expect(() => computeNextRunAt({ frequency: 'MINUTELY' as never }, now)).toThrow(ScheduleValidationError)
  })
})

describe('describeSchedule', () => {
  it('HOURLY', () => {
    expect(describeSchedule({ frequency: 'HOURLY', atMinute: 0 })).toBe('每小时 :00')
    expect(describeSchedule({ frequency: 'HOURLY', atMinute: 5 })).toBe('每小时 :05')
  })
  it('DAILY', () => {
    expect(describeSchedule({ frequency: 'DAILY', atHour: 9, atMinute: 0 })).toBe('每天 09:00')
    expect(describeSchedule({ frequency: 'DAILY', atHour: 14, atMinute: 30 })).toBe('每天 14:30')
  })
  it('WEEKLY', () => {
    expect(describeSchedule({ frequency: 'WEEKLY', atHour: 9, atMinute: 0, weekday: 1 })).toBe('每周一 09:00')
    expect(describeSchedule({ frequency: 'WEEKLY', atHour: 18, atMinute: 30, weekday: 7 })).toBe('每周日 18:30')
  })
})

function toISO(d: Date): string {
  // 保留 +08:00 形式以便阅读
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60_000)
  return local.toISOString().replace('Z', '+08:00')
}