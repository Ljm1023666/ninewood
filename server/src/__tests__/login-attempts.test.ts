import { describe, it, expect, beforeEach } from 'vitest'
import {
  assertLoginNotLocked,
  clearLoginFailures,
  recordLoginFailure,
} from '../services/login-attempts.js'

describe('login-attempts', () => {
  const key = 'phone:13800000001'

  beforeEach(async () => {
    await clearLoginFailures(key)
  })

  it('连续失败 5 次后锁定', async () => {
    for (let i = 0; i < 4; i++) {
      await recordLoginFailure(key)
      await expect(assertLoginNotLocked(key)).resolves.toBeUndefined()
    }
    await recordLoginFailure(key)
    await expect(assertLoginNotLocked(key)).rejects.toMatchObject({
      status: 429,
    })
  })

  it('成功后清除失败计数', async () => {
    await recordLoginFailure(key)
    await recordLoginFailure(key)
    await clearLoginFailures(key)
    await expect(assertLoginNotLocked(key)).resolves.toBeUndefined()
  })
})
