import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';

// 每天凌晨 3 点清理过期消息
export function startCleanupMessagesCron() {
  cron.schedule('0 3 * * *', async () => {
    try {
      const now = new Date();

      // 普通聊天消息：保留 90 天
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const textResult = await prisma.message.deleteMany({
        where: { type: 'TEXT', createdAt: { lt: ninetyDaysAgo } },
      });

      // 系统通知：保留 30 天
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const systemResult = await prisma.message.deleteMany({
        where: { type: 'SYSTEM', createdAt: { lt: thirtyDaysAgo } },
      });

      const total = (textResult.count || 0) + (systemResult.count || 0);
      if (total > 0) {
        console.log(`[Cron] Cleaned ${total} expired messages (TEXT: ${textResult.count}, SYSTEM: ${systemResult.count})`);
      }
    } catch (err) {
      console.error('[Cron] Message cleanup failed:', err);
    }
  });
}
