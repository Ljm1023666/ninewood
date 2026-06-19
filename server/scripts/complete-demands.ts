import { PrismaClient } from '@prisma/client'
import { refreshTagStats } from '../src/services/tag-stats.js'

const p = new PrismaClient()

async function main() {
  const demands = await p.demand.findMany({
    where: { stage: 'active' },
    take: 15,
    select: { id: true, title: true },
  })
  for (const d of demands) {
    await p.demand.update({ where: { id: d.id }, data: { stage: 'completed' } })
    console.log('Completed:', d.title)
  }
  const r = await refreshTagStats()
  console.log('TagStats refreshed:', r.groupsUpdated, 'groups')
  await p.$disconnect()
}
main()
