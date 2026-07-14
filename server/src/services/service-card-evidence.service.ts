import { prisma } from '../lib/prisma.js';

function matchesClaim(label: string, demand: {
  title: string;
  category: string;
  tags: string[];
  paths: string[];
}) {
  const needle = label.trim().toLocaleLowerCase();
  if (!needle) return false;
  const haystack = [
    demand.title,
    demand.category,
    ...demand.tags,
    ...demand.paths,
  ].join(' ').toLocaleLowerCase();
  return haystack.includes(needle);
}

/** 根据服务者已完成订单重算服务卡经验，不暴露客户或订单明细。 */
export async function refreshServiceCardEvidenceForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      providerId: true,
      status: true,
      completedAt: true,
      demand: {
        select: { title: true, category: true, tags: true, paths: true },
      },
    },
  });
  if (!order || order.status !== 'COMPLETED' || !order.demand) return;

  const cards = await prisma.serviceCard.findMany({
    where: { userId: order.providerId },
    select: { id: true, claims: { select: { label: true } } },
  });
  if (!cards.length) return;

  const completedOrders = await prisma.order.findMany({
    where: { providerId: order.providerId, status: 'COMPLETED' },
    select: {
      completedAt: true,
      demand: { select: { title: true, category: true, tags: true, paths: true } },
    },
  });

  await prisma.$transaction(
    cards.flatMap((card) =>
      card.claims.map((claim) => {
        const matching = completedOrders.filter((item) =>
          item.demand
            ? matchesClaim(claim.label, item.demand)
            : false,
        );
        const completedCount = matching.length;
        const lastCompletedAt = matching.reduce<Date | null>(
          (latest, item) =>
            item.completedAt && (!latest || item.completedAt > latest) ? item.completedAt : latest,
          null,
        );
        return prisma.serviceCardEvidence.upsert({
          where: { serviceCardId_label: { serviceCardId: card.id, label: claim.label } },
          create: {
            serviceCardId: card.id,
            label: claim.label,
            completedCount,
            successfulCount: completedCount,
            successRate: completedCount ? 1 : null,
            lastCompletedAt,
          },
          update: {
            completedCount,
            successfulCount: completedCount,
            successRate: completedCount ? 1 : null,
            lastCompletedAt,
            calculatedAt: new Date(),
          },
        });
      }),
    ),
  );

  await prisma.$transaction(
    cards.flatMap((card) =>
      card.claims.map((claim) =>
        prisma.serviceCardClaim.update({
          where: { serviceCardId_label: { serviceCardId: card.id, label: claim.label } },
          data: {
            isHighlighted: completedOrders.some((item) =>
              item.demand ? matchesClaim(claim.label, item.demand) : false,
            ),
          },
        }),
      ),
    ),
  );
}
