import { prisma } from '../lib/prisma.js';
import type { Prisma } from '@prisma/client';
import { assertUserContentSafe } from './content-filter/index.js';
import { serviceCardService } from './service-card.service.js';
import { userBlockService } from './user-block.service.js';

type CardType = 'DEMAND' | 'SERVICE_CARD';

export const cardAttachmentService = {
  async send(params: {
    fromUserId: string;
    toUserId: string;
    cardType: CardType;
    cardId: string;
    content?: string;
  }) {
    if (params.fromUserId === params.toUserId) {
      throw Object.assign(new Error('不能给自己发送卡片'), { status: 400 });
    }
    if (await userBlockService.isBlockedEitherWay(params.fromUserId, params.toUserId)) {
      throw Object.assign(new Error('无法向该用户发送消息'), { status: 403 });
    }
    const content = params.content?.trim() || '发来一张卡片，点击查看详情。';
    assertUserContentSafe(content, '卡片说明');

    let snapshot: Record<string, unknown>;
    let demandId: string | null = null;
    let serviceCardId: string | null = null;
    if (params.cardType === 'SERVICE_CARD') {
      const serviceSnapshot = await serviceCardService.snapshot(params.cardId, params.fromUserId);
      snapshot = serviceSnapshot;
      serviceCardId = params.cardId;
    } else {
      const demand = await prisma.demand.findFirst({
        where: {
          id: params.cardId,
          userId: params.fromUserId,
          isPublic: true,
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          description: true,
          minPrice: true,
          category: true,
          serviceType: true,
          cityCode: true,
          coverImage: true,
          paths: true,
          status: true,
        },
      });
      if (!demand) throw Object.assign(new Error('需求卡不存在或无权发送'), { status: 404 });
      snapshot = {
        cardType: 'DEMAND',
        cardId: demand.id,
        title: demand.title,
        description: demand.description,
        minPrice: demand.minPrice,
        category: demand.category,
        serviceType: demand.serviceType,
        cityCode: demand.cityCode,
        coverImage: demand.coverImage,
        paths: demand.paths,
        status: demand.status,
      };
      demandId = demand.id;
    }

    return prisma.message.create({
      data: {
        fromUserId: params.fromUserId,
        toUserId: params.toUserId,
        content,
        type: 'TEXT',
        cardAttachment: {
          create: {
            cardType: params.cardType,
            demandId,
            serviceCardId,
            snapshot: snapshot as Prisma.InputJsonValue,
          },
        },
      },
      include: {
        fromUser: { select: { id: true, nickname: true, avatarUrl: true } },
        toUser: { select: { id: true, nickname: true, avatarUrl: true } },
        cardAttachment: true,
      },
    });
  },
};
