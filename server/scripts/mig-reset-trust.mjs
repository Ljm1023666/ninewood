import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const deleted = await p.$executeRawUnsafe(
  `DELETE FROM "_prisma_migrations" WHERE migration_name = '20260728120000_order_transaction_trust'`,
)
console.log('deleted rows', deleted)
await p.$disconnect()
