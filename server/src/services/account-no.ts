import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

type Tx = Prisma.TransactionClient

/** 0 保留给管理员；新用户从 1 起递增 */
export async function allocateNextAccountNo(tx: Tx): Promise<number> {
  const agg = await tx.user.aggregate({ _max: { accountNo: true } })
  const max = agg._max.accountNo
  if (max == null) return 1
  return max + 1
}

export function isAccountNoConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: string; meta?: { target?: string[] } }
  if (e.code !== 'P2002') return false
  const target = e.meta?.target
  if (!target) return true
  return target.some((t) => t.toLowerCase().includes('accountno'))
}

const MAX_ACCOUNT_NO_ATTEMPTS = 5

/** 在事务内分配 accountNo 并执行创建；撞唯一约束时自动重试 */
export async function withAllocatedAccountNo<T>(
  create: (tx: Tx, accountNo: number) => Promise<T>,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_ACCOUNT_NO_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const accountNo = await allocateNextAccountNo(tx)
        return create(tx, accountNo)
      })
    } catch (error) {
      lastError = error
      if (!isAccountNoConflict(error) || attempt >= MAX_ACCOUNT_NO_ATTEMPTS - 1) {
        throw error
      }
    }
  }
  throw lastError
}
