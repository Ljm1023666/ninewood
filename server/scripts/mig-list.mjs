import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const rows = await p.$queryRawUnsafe(
  'SELECT migration_name, finished_at, rolled_back_at, applied_steps_count FROM "_prisma_migrations" ORDER BY started_at',
)
console.log(JSON.stringify(rows, null, 2))
await p.$disconnect()
