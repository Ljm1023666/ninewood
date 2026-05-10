import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';

// Scan every 5 minutes: freeze demands where status=PENDING and expireAt < now
export function startFreezeDemandsCron() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await prisma.demand.updateMany({
        where: {
          status: 'PENDING',
          expireAt: { lt: new Date() },
        },
        data: { status: 'FROZEN' },
      });

      // Forfeit linked deposits
      if (result.count > 0) {
        // Find all frozen demand IDs to forfeit their deposits
        const frozenDemands = await prisma.demand.findMany({
          where: { status: 'FROZEN', expireAt: { lt: new Date() } },
          select: { id: true, userId: true },
        });

        for (const d of frozenDemands) {
          const deposit = await prisma.deposit.findFirst({
            where: { userId: d.userId, status: 'PENDING' },
          });
          if (deposit) {
            const demandIds = deposit.demandIds as string[];
            if (demandIds.includes(d.id)) {
              await prisma.deposit.update({
                where: { id: deposit.id },
                data: { status: 'FORFEITED' },
              });
            }
          }
        }
      }

      if (result.count > 0) {
        console.log(`[Cron] Froze ${result.count} expired demands`);
      }
    } catch (err) {
      console.error('[Cron] Freeze demands failed:', err);
    }
  });
}
