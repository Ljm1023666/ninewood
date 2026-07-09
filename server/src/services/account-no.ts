import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

type Tx = Prisma.TransactionClient;

/** 分配下一个可用账号 ID（0 起，管理员由回填脚本固定为 0） */
export async function allocateNextAccountNo(tx: Tx = prisma): Promise<number> {
  const agg = await tx.user.aggregate({ _max: { accountNo: true } });
  return (agg._max.accountNo ?? -1) + 1;
}
