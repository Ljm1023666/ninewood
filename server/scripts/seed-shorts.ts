import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Update the 5 COMPLETED demands to include mediaUrls pointing to the existing video
  const completed = await prisma.demand.findMany({
    where: { status: 'COMPLETED' },
    include: { orders: { select: { agreedPrice: true, provider: { select: { nickname: true } } }, take: 1 } },
  });

  console.log(`Found ${completed.length} completed demands\n`);

  if (completed.length === 0) {
    console.log('No completed demands. Run prisma/seed.ts first, then re-run this script.');
    return;
  }

  for (let i = 0; i < completed.length; i++) {
    const d = completed[i];
    const order = d.orders[0];
    const providerName = order?.provider?.nickname || '未知';

    console.log(`  ${i + 1}. [${d.category}] ${d.title} — ¥${d.minPrice} → ${providerName} 成交 ¥${order?.agreedPrice || '?'}`);
  }

  const videoUrl = '/uploads/1778316022704-x30azgj0ylr.mp4';

  // Add mediaUrls to each completed demand
  for (const d of completed) {
    await prisma.demand.update({
      where: { id: d.id },
      data: { mediaUrls: [videoUrl] },
    });
  }

  console.log(`\nDone — ${completed.length} demands now have video URLs`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
