import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
  const label = process.argv[2] || 'snapshot'
  const [orders, holds, ledgers, settlements, migs] = await Promise.all([
    p.order.count(),
    p.walletHold.count(),
    p.walletLedger.count(),
    p.settlement.count(),
    p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "_prisma_migrations"'),
  ])

  const extras = {}
  const proposals = await p.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name = 'OrderPartialProposal'`,
  )
  const idem = await p.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name = 'IdempotencyRecord'`,
  )
  const opKeys = await p.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS n FROM information_schema.columns WHERE table_schema='public' AND table_name = 'WalletLedger' AND column_name = 'operationKey'`,
  )
  extras.hasOrderPartialProposal = proposals[0]?.n > 0
  extras.hasIdempotencyRecord = idem[0]?.n > 0
  extras.hasOperationKeyColumn = opKeys[0]?.n > 0

  if (extras.hasOrderPartialProposal) {
    const c = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "OrderPartialProposal"')
    extras.orderPartialProposalRows = c[0]?.n
  }
  if (extras.hasIdempotencyRecord) {
    const c = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "IdempotencyRecord"')
    extras.idempotencyRecordRows = c[0]?.n
  }

  let partialPendingOrders = null
  try {
    const c = await p.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS n FROM "Order" WHERE status::text = 'PARTIAL_PENDING'`,
    )
    partialPendingOrders = c[0]?.n
  } catch {
    partialPendingOrders = 'enum-missing'
  }

  console.log(
    JSON.stringify(
      {
        label,
        orders,
        holds,
        ledgers,
        settlements,
        migrations: migs[0]?.n,
        partialPendingOrders,
        ...extras,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await p.$disconnect()
  })
