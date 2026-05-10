import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';

// Reset snatch credits on the 1st of every month at 00:00
export function startSnatchResetCron() {
  cron.schedule('0 0 1 * *', async () => {
    console.log('[Cron] Resetting snatch credits for ADVANCED+ users');
    try {
      const result = await prisma.user.updateMany({
        where: { certificationLevel: { in: ['ADVANCED', 'MASTER'] } },
        data: { snatchCredits: 3 },
      });
      console.log(`[Cron] Snatch credits reset for ${result.count} users`);
    } catch (err) {
      console.error('[Cron] Snatch reset failed:', err);
    }
  });
}
