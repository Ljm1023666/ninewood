import { describe, it, expect } from 'vitest'
import {
  assertRegistrationAge,
  calculateAge,
  MIN_REGISTRATION_AGE,
} from '../services/compliance-age.js'

describe('compliance-age', () => {
  it('拒绝低于注册年龄', () => {
    const birthday = new Date()
    birthday.setFullYear(birthday.getFullYear() - (MIN_REGISTRATION_AGE - 1))
    try {
      assertRegistrationAge(birthday)
      expect.unreachable()
    } catch (e: any) {
      expect(e.status).toBe(403)
    }
  })

  it('14-17 岁需监护人同意', () => {
    const birthday = new Date()
    birthday.setFullYear(birthday.getFullYear() - 16)
    try {
      assertRegistrationAge(birthday)
      expect.unreachable()
    } catch (e: any) {
      expect(e.status).toBe(400)
    }
    expect(() => assertRegistrationAge(birthday, true)).not.toThrow()
  })

  it('成年用户无需监护人', () => {
    const birthday = new Date()
    birthday.setFullYear(birthday.getFullYear() - 20)
    expect(calculateAge(birthday)).toBeGreaterThanOrEqual(18)
    expect(() => assertRegistrationAge(birthday)).not.toThrow()
  })
})
