/**
 * Task 10 · 任务下一次执行时间计算
 *
 * 从计划时刻推算（非 now + interval），避免漂移（spec §4.3）。
 * 时区使用服务器本地（与 cron/time-limit-reminder 一致）。
 *
 * 频率规则：
 *   - HOURLY : 下一整点的 atMinute（已过则 +1h）
 *   - DAILY  : 下一日 atHour:atMinute（atHour 必填）
 *   - WEEKLY : 下一匹配 weekday (1-7) 的 atHour:atMinute
 */

export type AgentTaskFrequency = 'HOURLY' | 'DAILY' | 'WEEKLY'

export interface ScheduleInput {
  frequency: AgentTaskFrequency
  atHour?: number | null
  atMinute?: number | null
  weekday?: number | null
}

export class ScheduleValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScheduleValidationError'
  }
}

/**
 * 计算下次执行时间。
 * @param now 当前时间（注入便于测试）
 * @throws ScheduleValidationError 当 frequency 参数不合法
 */
export function computeNextRunAt(input: ScheduleInput, now: Date = new Date()): Date {
  const minute = clampInt(input.atMinute ?? 0, 0, 59, 'atMinute')

  switch (input.frequency) {
    case 'HOURLY': {
      const next = new Date(now)
      next.setMinutes(minute, 0, 0)
      if (next.getTime() <= now.getTime()) {
        next.setHours(next.getHours() + 1)
      }
      return next
    }

    case 'DAILY': {
      const hour = clampInt(input.atHour, 0, 23, 'atHour', true)
      const next = new Date(now)
      next.setHours(hour, minute, 0, 0)
      if (next.getTime() <= now.getTime()) {
        next.setDate(next.getDate() + 1)
      }
      return next
    }

    case 'WEEKLY': {
      const hour = clampInt(input.atHour, 0, 23, 'atHour', true)
      const targetDay = clampInt(input.weekday, 1, 7, 'weekday', true)
      const next = new Date(now)
      next.setHours(hour, minute, 0, 0)
      // JavaScript getDay: 0=Sun..6=Sat；spec weekday: 1=Mon..7=Sun
      const jsDay = targetDay === 7 ? 0 : targetDay
      const diff = (jsDay - next.getDay() + 7) % 7
      next.setDate(next.getDate() + diff)
      if (next.getTime() <= now.getTime()) {
        next.setDate(next.getDate() + 7)
      }
      return next
    }

    default:
      throw new ScheduleValidationError(`unsupported frequency: ${input.frequency as string}`)
  }
}

function clampInt(
  value: number | null | undefined,
  min: number,
  max: number,
  field: string,
  required = false,
): number {
  if (value === null || value === undefined) {
    if (required) throw new ScheduleValidationError(`${field} 必填`)
    return min
  }
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < min || value > max) {
    throw new ScheduleValidationError(`${field} 必须为 ${min}-${max} 的整数`)
  }
  return value
}

/**
 * 人类可读时刻说明（前端展示「下次运行时间」/Task Draft Card 用）
 *   - HOURLY : "每小时 :00"
 *   - DAILY  : "每天 09:00"
 *   - WEEKLY : "每周一 09:00"
 */
export function describeSchedule(input: ScheduleInput): string {
  const minute = (input.atMinute ?? 0).toString().padStart(2, '0')
  switch (input.frequency) {
    case 'HOURLY':
      return `每小时 :${minute}`
    case 'DAILY': {
      const h = (input.atHour ?? 0).toString().padStart(2, '0')
      return `每天 ${h}:${minute}`
    }
    case 'WEEKLY': {
      const dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
      const name = dayNames[input.weekday ?? 1]
      const h = (input.atHour ?? 0).toString().padStart(2, '0')
      return `每${name} ${h}:${minute}`
    }
  }
}