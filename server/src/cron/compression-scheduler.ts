import { prisma } from '../lib/prisma.js';
import { poolService } from '../services/pool.service.js';

/**
 * 压缩调度定时任务。
 * 检查 nextCompressionDate 到期的需求，按时间杠杆规则推进压缩阶段：
 *   1. coverDeletion 到期 → 删封面，stage → compressed
 *   2. detailDeletion 到期 → 清空敏感字段（description、minPrice）
 *   3. cardDeletion 到期 → 彻底删除需求
 *
 * 每次处理后更新 nextCompressionDate 为下一到期时间。
 */
export async function runCompressionScheduler() {
  const now = new Date();

  const dueDemands = await prisma.activeDemand.findMany({
    where: { nextCompressionDate: { lte: now } },
    include: { demand: true },
  });

  if (dueDemands.length === 0) return;

  for (const ad of dueDemands) {
    try {
      // 若 demand 已被手动删除，跳过
      if (!ad.demand) {
        await prisma.activeDemand.delete({ where: { demandId: ad.demandId } });
        continue;
      }

      const dates = poolService.calculateCompressionDates(ad.demand.createdAt, ad.totalExtendedMonths);

      if (now >= dates.cardDeletion) {
        // 删卡（彻底删除）
        await prisma.demand.delete({ where: { id: ad.demandId } });
        console.log(`[Cron] Compression: deleted demand ${ad.demandId} (card expired)`);
      } else if (now >= dates.detailDeletion) {
        // 删详情（清空描述、金额等敏感字段，保留标题和封面）
        await prisma.demand.update({
          where: { id: ad.demandId },
          data: { description: '[已压缩]', minPrice: 0, amountEstimate: null },
        });
        console.log(`[Cron] Compression: compressed details for demand ${ad.demandId} (detail expired)`);
      } else if (now >= dates.coverDeletion) {
        // 删封面
        await prisma.demand.update({
          where: { id: ad.demandId },
          data: { coverImage: null, stage: 'compressed' },
        });
        console.log(`[Cron] Compression: removed cover for demand ${ad.demandId} (cover expired)`);
      }

      // 更新下次检查时间：取下一个未到期的日期
      const nextDate = [dates.coverDeletion, dates.detailDeletion, dates.cardDeletion]
        .find(d => d > now);

      // 如果 demand 已被删除（cardDeletion 分支），cascade 会自动清理 ActiveDemand，无需更新
      if (now < dates.cardDeletion) {
        await prisma.activeDemand.update({
          where: { demandId: ad.demandId },
          data: { nextCompressionDate: nextDate ?? undefined },
        });
      }
    } catch (err) {
      console.error(`[Cron] Compression scheduler failed for demand ${ad.demandId}:`, err);
    }
  }
}
