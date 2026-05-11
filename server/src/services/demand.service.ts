import { prisma } from '../lib/prisma.js';
import { ServiceType, DemandStatus } from '@prisma/client';

const CERT_ORDER: Record<string, number> = { MASTER: 4, ADVANCED: 3, INTERMEDIATE: 2, BASIC: 1, NONE: 0 };

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatCreatedAgo(createdAt: Date): string {
  const diff = Date.now() - createdAt.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export const demandService = {
  async create(params: {
    userId: string;
    title: string;
    description: string;
    minPrice: number;
    category: string;
    serviceType: ServiceType;
    locationLat?: number;
    locationLng?: number;
    cityCode?: string;
    expireAt: string;
    circleId?: string;
    mediaUrls?: string[];
  }) {
    // Check frozen demands
    const frozenCount = await prisma.demand.count({
      where: { userId: params.userId, status: 'FROZEN' },
    });
    if (frozenCount > 0) throw { status: 400, message: '你有冻结中的需求，请先删除后再发布新需求' };

    // Check active demand count (max 3)
    const activeCount = await prisma.demand.count({
      where: { userId: params.userId, status: 'PENDING' },
    });
    if (activeCount >= 3) throw { status: 400, message: '同时进行中的需求不能超过3个' };

    // Circle membership check
    if (params.circleId) {
      const member = await prisma.circleMember.findUnique({
        where: { circleId_userId: { circleId: params.circleId, userId: params.userId } },
      });
      if (!member) throw { status: 403, message: '请先加入该需求圈' };
    }

    const demand = await prisma.demand.create({
      data: {
        userId: params.userId,
        title: params.title,
        description: params.description,
        minPrice: params.minPrice,
        category: params.category,
        serviceType: params.serviceType,
        locationLat: params.locationLat || null,
        locationLng: params.locationLng || null,
        cityCode: params.cityCode || null,
        expireAt: new Date(params.expireAt),
        circleId: params.circleId || null,
        isPublic: params.circleId ? false : true,
        mediaUrls: params.mediaUrls || [],
      },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true, certificationLevel: true } },
        _count: { select: { applications: true } },
      },
    });

    return demand;
  },

  async search(params: {
    keyword?: string;
    category?: string;
    serviceType?: string;
    minPrice?: number;
    maxPrice?: number;
    distance?: number;
    lat?: number;
    lng?: number;
    cityCode?: string;
    page?: number;
    limit?: number;
    excludeExample?: boolean;
    userId?: string;
    /** 只看待发布者的需求（发现页 ?publisher=uuid） */
    publisherId?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const where: any = { status: 'PENDING' };

    const publisherFilter =
      params.publisherId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.publisherId)
        ? params.publisherId
        : undefined;
    if (publisherFilter) where.userId = publisherFilter;

    if (params.serviceType) where.serviceType = params.serviceType;
    if (params.category) where.category = params.category;
    if (params.minPrice) where.minPrice = { ...(where.minPrice || {}), gte: params.minPrice };
    if (params.maxPrice) where.minPrice = { ...(where.minPrice || {}), lte: params.maxPrice };
    if (params.excludeExample) where.isExample = false;
    if (params.keyword) {
      where.OR = [
        { title: { contains: params.keyword, mode: 'insensitive' } },
        { description: { contains: params.keyword, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = { createdAt: 'desc' };

    // Visibility: public only, or circle-internal for members
    if (params.userId) {
      where.AND = [
        {
          OR: [
            { isPublic: true },
            { circle: { members: { some: { userId: params.userId } } } },
            { isPublic: false, createdAt: { lt: new Date(Date.now() - 15 * 60 * 1000) } },
          ],
        },
      ];
    } else {
      where.isPublic = true;
    }

    const hasGeo = !!(params.lat && params.lng && params.distance);
    const publisherSql = publisherFilter ? `AND d."userId" = '${publisherFilter}'` : '';

    if (hasGeo) {
      // PostgreSQL-level haversine: push distance calc + filter to DB
      const raw = await prisma.$queryRawUnsafe<any[]>(`
        SELECT d.*,
          u."nickname", u."avatarUrl", u."certificationLevel",
          COALESCE((SELECT COUNT(*) FROM "DemandApplication" WHERE "demandId" = d.id), 0)::int AS "applicantCount",
          6371 * 2 * ASIN(SQRT(
            POWER(SIN((${params.lat} - d."locationLat") * PI() / 180 / 2), 2) +
            COS(${params.lat} * PI() / 180) * COS(d."locationLat" * PI() / 180) *
            POWER(SIN((${params.lng} - d."locationLng") * PI() / 180 / 2), 2)
          )) AS "distanceKm"
        FROM "Demand" d
        JOIN "User" u ON u.id = d."userId"
        WHERE d.status = 'PENDING'
          ${publisherSql}
          ${params.cityCode ? `AND d."cityCode" = '${params.cityCode}'` : ''}
          ${params.category ? `AND d."category" = '${params.category}'` : ''}
          ${params.keyword ? `AND (d."title" ILIKE '%${params.keyword}%' OR d."description" ILIKE '%${params.keyword}%')` : ''}
          AND (
            d."serviceType" = 'ONLINE'
            OR (
              d."serviceType" = 'OFFLINE'
              AND d."locationLat" IS NOT NULL
              AND d."locationLng" IS NOT NULL
              AND 6371 * 2 * ASIN(SQRT(
                POWER(SIN((${params.lat} - d."locationLat") * PI() / 180 / 2), 2) +
                COS(${params.lat} * PI() / 180) * COS(d."locationLat" * PI() / 180) *
                POWER(SIN((${params.lng} - d."locationLng") * PI() / 180 / 2), 2)
              )) <= ${params.distance}
            )
          )
        ORDER BY d."createdAt" DESC
        LIMIT ${limit} OFFSET ${(page - 1) * limit}
      `);

      // Count query
      const countRaw = await prisma.$queryRawUnsafe<any[]>(`
        SELECT COUNT(*)::int AS total FROM "Demand" d
        WHERE d.status = 'PENDING'
          ${publisherSql}
          ${params.cityCode ? `AND d."cityCode" = '${params.cityCode}'` : ''}
          ${params.category ? `AND d."category" = '${params.category}'` : ''}
          AND (
            d."serviceType" = 'ONLINE'
            OR (
              d."serviceType" = 'OFFLINE'
              AND d."locationLat" IS NOT NULL AND d."locationLng" IS NOT NULL
              AND 6371 * 2 * ASIN(SQRT(
                POWER(SIN((${params.lat} - d."locationLat") * PI() / 180 / 2), 2) +
                COS(${params.lat} * PI() / 180) * COS(d."locationLat" * PI() / 180) *
                POWER(SIN((${params.lng} - d."locationLng") * PI() / 180 / 2), 2)
              )) <= ${params.distance}
            )
          )
      `);

      const total = countRaw[0]?.total || 0;
      const result = raw.map((d: any) => ({
        id: d.id,
        title: d.title,
        minPrice: Number(d.minPrice),
        category: d.category,
        serviceType: d.serviceType,
        cityCode: d.cityCode,
        applicantCount: d.applicantCount,
        distance: d.distanceKm ? Math.round(Number(d.distanceKm) * 10) / 10 : null,
        createdAgo: formatCreatedAgo(d.createdAt),
        isExample: d.isExample,
        user: { id: d.userId, nickname: d.nickname, avatarUrl: d.avatarUrl, certificationLevel: d.certificationLevel },
        mediaUrls: d.mediaUrls,
        isSnatched: false,
        createdAt: d.createdAt,
      }));

      return { demands: result, total, page, totalPages: Math.ceil(total / limit) };
    }

    // Non-geo query: standard Prisma
    let demands = await prisma.demand.findMany({
      where,
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true, certificationLevel: true } },
        _count: { select: { applications: true } },
      },
      orderBy,
    });

    // Map results
    const result = demands.map((d) => ({
      id: d.id,
      title: d.title,
      minPrice: Number(d.minPrice),
      category: d.category,
      serviceType: d.serviceType,
      cityCode: d.cityCode,
      applicantCount: d._count.applications,
      distance: null,
      createdAgo: formatCreatedAgo(d.createdAt),
      isExample: d.isExample,
      user: d.user,
      mediaUrls: d.mediaUrls,
      isSnatched: false,
      createdAt: d.createdAt,
    }));

    const total = result.length;
    const paged = result.slice((page - 1) * limit, page * limit);

    return { demands: paged, total, page, totalPages: Math.ceil(total / limit) };
  },

  async getById(demandId: string, userId?: string) {
    const demand = await prisma.demand.findUnique({
      where: { id: demandId },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true, coverUrl: true, certificationLevel: true, creditScore: true } },
        applications: {
          include: { user: { select: { id: true, nickname: true, avatarUrl: true, certificationLevel: true } } },
          orderBy: { createdAt: 'desc' },
        },
        circle: { select: { id: true, name: true, type: true } },
      },
    });
    if (!demand) throw { status: 404, message: '需求不存在' };

    const isOwner = userId === demand.userId;
    const hasOrder = demand.applications.some(a => a.status === 'ACCEPTED');

    return {
      ...demand,
      minPrice: Number(demand.minPrice),
      applications: isOwner ? demand.applications.map(a => ({
        ...a,
        offerPrice: a.offerPrice ? Number(a.offerPrice) : null,
      })) : [],
      hasOrder,
      isOwner,
    };
  },

  async apply(demandId: string, userId: string, offerPrice?: number, message?: string) {
    const demand = await prisma.demand.findUnique({ where: { id: demandId } });
    if (!demand) throw { status: 404, message: '需求不存在' };
    if (demand.userId === userId) throw { status: 400, message: '不能申请自己的需求' };
    if (demand.isExample) throw { status: 400, message: '示例需求，仅供体验' };
    if (demand.status !== 'PENDING') throw { status: 400, message: '该需求不可申请' };

    const existing = await prisma.demandApplication.findUnique({
      where: { demandId_userId: { demandId, userId } },
    });
    if (existing) throw { status: 409, message: '已申请过该需求' };

    const application = await prisma.demandApplication.create({
      data: { demandId, userId, offerPrice: offerPrice || null, message: message || null },
      include: { user: { select: { id: true, nickname: true, avatarUrl: true, certificationLevel: true } } },
    });

    // Update applicant count
    await prisma.demand.update({
      where: { id: demandId },
      data: { applicantCount: { increment: 1 } },
    });

    return application;
  },

  async snatch(demandId: string, userId: string) {
    const demand = await prisma.demand.findUnique({ where: { id: demandId } });
    if (!demand) throw { status: 404, message: '需求不存在' };
    if (demand.userId === userId) throw { status: 400, message: '不能抢自己的需求' };
    if (demand.isExample) throw { status: 400, message: '示例需求，仅供体验' };
    if (demand.status !== 'PENDING') throw { status: 400, message: '该需求不可抢单' };

    // Atomic: check cert level AND deduct credit in one operation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { certificationLevel: true, snatchCredits: true },
    });
    if (!user) throw { status: 404, message: '用户不存在' };
    if (user.certificationLevel === 'NONE' || user.certificationLevel === 'BASIC') {
      throw { status: 403, message: '仅中级及以上认证用户可抢单' };
    }

    const existing = await prisma.demandApplication.findUnique({
      where: { demandId_userId: { demandId, userId } },
    });
    if (existing) throw { status: 409, message: '已对该需求提交过接单' };

    // Atomic deduction with concurrency guard
    const result = await prisma.user.updateMany({
      where: { id: userId, snatchCredits: { gt: 0 } },
      data: { snatchCredits: { decrement: 1 } },
    });
    if (result.count === 0) throw { status: 400, message: '抢单次数不足，请等待下月重置' };

    const application = await prisma.demandApplication.create({
      data: {
        demandId,
        userId,
        isSnatched: true,
        status: 'PENDING',
        message: '高级用户抢单',
      },
      include: { user: { select: { id: true, nickname: true, avatarUrl: true, certificationLevel: true } } },
    });

    // Update applicant count
    await prisma.demand.update({
      where: { id: demandId },
      data: { applicantCount: { increment: 1 } },
    });

    // Send message notification to demand owner
    await prisma.message.create({
      data: {
        fromUserId: userId,
        toUserId: demand.userId,
        content: `认证用户 ${user.certificationLevel} 向你抢单：「${demand.title}」`,
        type: 'SYSTEM',
      },
    });

    return application;
  },

  async acceptSnatch(demandId: string, applicationId: string, userId: string) {
    const demand = await prisma.demand.findUnique({ where: { id: demandId } });
    if (!demand) throw { status: 404, message: '需求不存在' };
    if (demand.userId !== userId) throw { status: 403, message: '无权操作' };
    if (demand.status !== 'PENDING') throw { status: 400, message: '该需求状态不允许此操作' };

    const application = await prisma.demandApplication.findUnique({ where: { id: applicationId } });
    if (!application || application.demandId !== demandId) {
      throw { status: 404, message: '申请不存在' };
    }

    // Accept this application, reject all others
    await prisma.demandApplication.updateMany({
      where: { demandId, status: 'PENDING', id: { not: applicationId } },
      data: { status: 'REJECTED' },
    });

    await prisma.demandApplication.update({
      where: { id: applicationId },
      data: { status: 'ACCEPTED' },
    });

    // Notify the accepted applicant
    await prisma.message.create({
      data: {
        fromUserId: userId,
        toUserId: application.userId,
        content: `你在需求「${demand.title}」的${application.isSnatched ? '抢单' : '申请'}已被接受`,
        type: 'SYSTEM',
      },
    });

    return { message: '已接受', applicationId };
  },

  async getApplications(demandId: string, userId: string) {
    const demand = await prisma.demand.findUnique({ where: { id: demandId } });
    if (!demand) throw { status: 404, message: '需求不存在' };
    if (demand.userId !== userId) throw { status: 403, message: '无权查看' };

    return prisma.demandApplication.findMany({
      where: { demandId },
      include: { user: { select: { id: true, nickname: true, avatarUrl: true, certificationLevel: true, creditScore: true } } },
      orderBy: [{ isSnatched: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async deleteDemand(demandId: string, userId: string) {
    const demand = await prisma.demand.findUnique({ where: { id: demandId } });
    if (!demand) throw { status: 404, message: '需求不存在' };
    if (demand.userId !== userId) throw { status: 403, message: '无权删除' };
    if (demand.status !== 'FROZEN') throw { status: 400, message: '只能删除冻结的需求' };

    await prisma.demand.delete({ where: { id: demandId } });
    return { message: '已删除' };
  },

  async getMyDemands(userId: string, page = 1) {
    const limit = 20;
    const [demands, total] = await Promise.all([
      prisma.demand.findMany({
        where: { userId },
        include: {
          _count: { select: { applications: true } },
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.demand.count({ where: { userId } }),
    ]);
    return { demands, total, page, totalPages: Math.ceil(total / limit) };
  },

  async getMyApplications(userId: string, page = 1) {
    const limit = 20;
    const [applications, total] = await Promise.all([
      prisma.demandApplication.findMany({
        where: { userId },
        include: {
          demand: {
            include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.demandApplication.count({ where: { userId } }),
    ]);
    return { applications, total, page, totalPages: Math.ceil(total / limit) };
  },

  async getActiveCount(userId: string) {
    return prisma.demand.count({ where: { userId, status: 'PENDING' } });
  },

  async getFrozenCount(userId: string) {
    return prisma.demand.count({ where: { userId, status: 'FROZEN' } });
  },
};
