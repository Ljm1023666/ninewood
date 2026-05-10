import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';

// Daily at 2 AM: update circle active_score and check for warnings/defunct
export function startCircleActivityCron() {
  cron.schedule('0 2 * * *', async () => {
    console.log('[Cron] Updating circle activity scores');
    try {
      const circles = await prisma.circle.findMany({
        where: { status: { not: 'DEFUNCT' } },
        select: { id: true },
      });

      for (const circle of circles) {
        // Count new demands in the last 24 hours
        const newDemands = await prisma.demand.count({
          where: {
            circleId: circle.id,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        await prisma.circle.update({
          where: { id: circle.id },
          data: { activeScore: newDemands },
        });
      }

      // Check for warnings: active_score < 5 for 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const inactiveCircles = await prisma.circle.findMany({
        where: {
          status: 'ACTIVE',
          activeScore: { lt: 5 },
          createdAt: { lt: thirtyDaysAgo },
        },
      });

      for (const c of inactiveCircles) {
        await prisma.circle.update({
          where: { id: c.id },
          data: { status: 'WARNING' },
        });
        console.log(`[Cron] Circle ${c.name} marked as WARNING`);
      }

      // Check for defunct: warning for 7+ days and still inactive
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const defunctCircles = await prisma.circle.findMany({
        where: {
          status: 'WARNING',
          activeScore: { lt: 5 },
          createdAt: { lt: thirtyDaysAgo }, // existed 30+ days
        },
      });

      for (const c of defunctCircles) {
        // Move circle demands to public
        await prisma.demand.updateMany({
          where: { circleId: c.id, status: 'PENDING' },
          data: { isPublic: true, circleId: null },
        });

        await prisma.circle.update({
          where: { id: c.id },
          data: { status: 'DEFUNCT' },
        });
        console.log(`[Cron] Circle ${c.name} marked as DEFUNCT`);
      }
    } catch (err) {
      console.error('[Cron] Circle activity check failed:', err);
    }
  });
}
