import { describe, it, expect } from 'vitest'
import { allocateNextAccountNo } from '../services/account-no.js'

describe('allocateNextAccountNo', () => {
  it('空库时从 1 起（0 保留管理员）', async () => {
    const tx = {
      user: {
        aggregate: async () => ({ _max: { accountNo: null } }),
      },
    }
    await expect(allocateNextAccountNo(tx as never)).resolves.toBe(1)
  })

  it('已有最大 accountNo 时递增', async () => {
    const tx = {
      user: {
        aggregate: async () => ({ _max: { accountNo: 42 } }),
      },
    }
    await expect(allocateNextAccountNo(tx as never)).resolves.toBe(43)
  })
})
