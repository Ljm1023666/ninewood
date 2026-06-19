import { prisma } from '../lib/prisma.js';
import { ServiceType, DemandStatus, DemandStage, Prisma } from '@prisma/client';

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
    taxonomyLeafId?: string;
    serviceType: ServiceType;
    cityCode?: string;
    regionId?: number;
    tagName?: string;
    isCertifiedOnly?: boolean;
    pushConfig?: any;
    coverImage?: string;
    amountEstimate?: number;
    stage?: DemandStage;
    expireAt: string;
    circleId?: string;
    mediaUrls?: string[];
    // AI 2.5 新字段
    expectedOutcome?: string;
    visibilityWindow?: number;
    maxApplicants?: number;
    tags?: string[];
    aiTags?: string[];
    tagsConfirmed?: boolean;
    lat?: number;
    lng?: number;
  }) {
    // Check frozen demands
    const frozenCount = await prisma.demand.count({
      where: { userId: params.userId, status: 'FROZEN' },
    });
    if (frozenCount > 0) throw { status: 400, message: '你有冻结中的需求，请先删除后再发布新需求' };

    // Circle membership check
    if (params.circleId) {
      const member = await prisma.circleMember.findUnique({
        where: { circleId_userId: { circleId: params.circleId, userId: params.userId } },
      });
      if (!member) throw { status: 403, message: '请先加入该需求圈' };
    }

    // AI 2.5: 押金计算
    const activeCount = await prisma.demand.count({
      where: {
        userId: params.userId,
        status: { in: ['PENDING', 'ACTIVE', 'IN_PROGRESS'] },
      },
    });
    let deposit = 0;
    if (activeCount >= 1) {
      deposit = Math.round(Number(params.minPrice) * 0.01 * 100) / 100;
    }

    // AI 2.5: 位置模糊
    let fuzzyLat: number | null = null;
    let fuzzyLng: number | null = null;
    if (params.lat !== undefined && params.lng !== undefined) {
      const { fuzzLocation } = await import('../utils/location-fuzz.js');
      const fuzzed = fuzzLocation(params.lat, params.lng);
      fuzzyLat = fuzzed.lat;
      fuzzyLng = fuzzed.lng;
    }

    const win = params.visibilityWindow || 15;
    const visibleUntil = new Date(Date.now() + win * 60000);

    // AI 2.8: 初始化生命周期
    const { initLifecycle } = await import('../services/card-lifecycle.js');
    const lifecycle = initLifecycle(win / (24 * 60)); // 转换分钟为天

    const demand = await prisma.demand.create({
      data: {
        userId: params.userId,
        title: params.title,
        description: params.description,
        minPrice: params.minPrice,
        category: params.category,
        taxonomyLeafId: params.taxonomyLeafId || null,
        serviceType: params.serviceType,
        cityCode: params.cityCode || null,
        regionId: params.regionId || null,
        tagName: params.tagName || null,
        isCertifiedOnly: params.isCertifiedOnly || false,
        pushConfig: params.pushConfig || null,
        coverImage: params.coverImage || null,
        amountEstimate: params.amountEstimate ?? null,
        stage: params.stage || 'active',
        expireAt: new Date(params.expireAt),
        circleId: params.circleId || null,
        isPublic: params.circleId ? false : true,
        mediaUrls: params.mediaUrls || [],
        // AI 2.5
        expectedOutcome: params.expectedOutcome || null,
        visibilityWindow: win,
        visibleUntil,
        maxApplicants: params.maxApplicants || 10,
        tags: params.tags || [],
        aiTags: params.aiTags || [],
        tagsConfirmed: params.tagsConfirmed || false,
        fuzzyLat,
        fuzzyLng,
        deposit,
        status: 'ACTIVE',
        coverDeletedAt: lifecycle.coverDeletedAt,
        detailDeletedAt: lifecycle.detailDeletedAt,
        fullDeletedAt: lifecycle.fullDeletedAt,
      },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true, demandCardCoverUrl: true, certificationLevel: true } },
        _count: { select: { applications: true } },
      },
    });

    // AI 2.8: 押金 > 0 时创建 Deposit 记录
    if (deposit > 0) {
      await prisma.deposit.create({
        data: {
          userId: params.userId,
          amount: deposit,
          status: 'PENDING',
          demandRelations: { create: { demandId: demand.id } },
        },
      });
    }

    return demand;
  },

  async search(params: {
    keyword?: string;
    tagName?: string;
    /** 逗号分隔多标签，对应 IN 查询 */
    tagNames?: string;
    category?: string;
    /** 逗号分隔；与 category 二选一，多类目 IN */
    categories?: string;
    taxonomyLeafId?: string;
    taxonomyLeafIds?: string;
    serviceType?: string;
    minPrice?: number;
    maxPrice?: number;
    distance?: number;
    lat?: number;
    lng?: number;
    cityCode?: string;
    page?: number;
    limit?: number;
    excludeExample?: boolean
    exact?: boolean;
    userId?: string;
    /** 只看待发布者的需求（发现页 ?publisher=uuid） */
    publisherId?: string;
    /** 按 ID 列表精确筛选（?, 卡包） */
    ids?: string[];
    /** 搜索模式：exact 精确 / fuzzy 模糊 */
    searchMode?: 'exact' | 'fuzzy';
    /** 活池/死池筛选: active | completed */
    stage?: string;
    regionId?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;

    const publisherFilter =
      params.publisherId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.publisherId)
        ? params.publisherId
        : undefined;

    const keywordTrimmed = params.keyword?.trim();
    const serviceTypeOk =
      params.serviceType === 'ONLINE' || params.serviceType === 'OFFLINE' ? params.serviceType : undefined;

    const categoriesList =
      params.categories
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [];
    const taxonomyLeafIdsList =
      params.taxonomyLeafIds
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [];

    // 默认只展示活池（active），传 stage=completed 切换至死池
    const stageFilter: any =
      params.stage === 'completed'
        ? { stage: 'completed' as const, status: 'COMPLETED' as const }
        : { stage: 'active' as const, NOT: { status: 'CLOSED' as const } };
    const and: any[] = [stageFilter];
    if (publisherFilter) and.push({ userId: publisherFilter });
    if (params.ids && Array.isArray(params.ids) && params.ids.length > 0) {
      and.push({ id: { in: params.ids } });
    }
    if (serviceTypeOk) and.push({ serviceType: serviceTypeOk as ServiceType });
    if (params.regionId != null) and.push({ regionId: params.regionId });
    if (taxonomyLeafIdsList.length > 0) {
      and.push({ taxonomyLeafId: { in: taxonomyLeafIdsList } });
    } else if (params.taxonomyLeafId) {
      and.push({ taxonomyLeafId: params.taxonomyLeafId });
    } else if (categoriesList.length > 0) {
      and.push({ category: { in: categoriesList } });
    } else if (params.category) {
      and.push({ category: params.category });
    }

    const minPriceRange: { gte?: number; lte?: number } = {};
    if (params.minPrice != null && !Number.isNaN(params.minPrice)) minPriceRange.gte = params.minPrice;
    if (params.maxPrice != null && !Number.isNaN(params.maxPrice)) minPriceRange.lte = params.maxPrice;
    if (Object.keys(minPriceRange).length) and.push({ minPrice: minPriceRange });

    if (params.excludeExample) and.push({ isExample: false });
    if (keywordTrimmed) {
      if (params.exact) {
        // 精确：标题或描述等于关键词
        and.push({
          OR: [
            { title: { equals: keywordTrimmed, mode: 'insensitive' } },
            { description: { equals: keywordTrimmed, mode: 'insensitive' } },
          ],
        })
      } else {
        // 模糊：标题或描述包含关键词
        and.push({
          OR: [
            { title: { contains: keywordTrimmed, mode: 'insensitive' } },
            { description: { contains: keywordTrimmed, mode: 'insensitive' } },
          ],
        })
      }
    }

    // 标签卡包筛选
    const tagNamesList = params.tagNames
      ?.split(',')
      .map(s => s.trim())
      .filter(Boolean)
    if (tagNamesList && tagNamesList.length > 0) {
      and.push({ tagName: { in: tagNamesList } });
    } else if (params.tagName === '__untagged__') {
      and.push({ tagName: null });
    } else if (params.tagName) {
      and.push({ tagName: params.tagName });
    }

    if (params.userId) {
      and.push({
        OR: [
          { isPublic: true },
          { circle: { members: { some: { userId: params.userId } } } },
          { isPublic: false, createdAt: { lt: new Date(Date.now() - 15 * 60 * 1000) } },
        ],
      });
    } else {
      and.push({ isPublic: true });
    }

    const where: any = { AND: and };

    // 使用稳定排序避免同 createdAt 记录在翻页时重复/丢失
    const orderBy: any = [{ createdAt: 'desc' }, { id: 'desc' }];

        const hasGeo = !!(params.lat && params.lng && params.distance);

        if (hasGeo) {
          const lat = params.lat!;
          const lng = params.lng!;
          const distance = params.distance!;

          // 用 Prisma.sql 片段构建 WHERE 条件，参数绑定由 Prisma 负责
          const whereFragments: Prisma.Sql[] = params.stage === 'completed'
            ? [Prisma.sql`d.stage = 'completed' AND d.status = 'COMPLETED'`]
            : [Prisma.sql`d.stage = 'active' AND d.status != 'CLOSED'`];

          if (publisherFilter) whereFragments.push(Prisma.sql`d."userId" = ${publisherFilter}::uuid`);
          if (params.cityCode) whereFragments.push(Prisma.sql`d."cityCode" = ${params.cityCode}`);
          if (serviceTypeOk) whereFragments.push(Prisma.sql`d."serviceType" = ${serviceTypeOk}::"ServiceType"`);

          if (taxonomyLeafIdsList.length > 0) {
            const ph = taxonomyLeafIdsList.map((v) => Prisma.sql`${v}`);
            whereFragments.push(Prisma.sql`d."taxonomyLeafId" IN (${Prisma.join(ph, ',')})`);
          } else if (params.taxonomyLeafId) {
            whereFragments.push(Prisma.sql`d."taxonomyLeafId" = ${params.taxonomyLeafId}`);
          } else if (categoriesList.length > 0) {
            const ph = categoriesList.map((v) => Prisma.sql`${v}`);
            whereFragments.push(Prisma.sql`d."category" IN (${Prisma.join(ph, ',')})`);
          } else if (params.category) {
            whereFragments.push(Prisma.sql`d."category" = ${params.category}`);
          }

          if (keywordTrimmed) {
            const kw = `%${keywordTrimmed}%`;
            whereFragments.push(Prisma.sql`(d."title" ILIKE ${kw} OR d."description" ILIKE ${kw})`);
          }
          if (tagNamesList && tagNamesList.length > 0) {
            whereFragments.push(Prisma.sql`d."tagName" IN (${Prisma.join(tagNamesList)})`);
          } else if (params.tagName === '__untagged__') {
            whereFragments.push(Prisma.sql`d."tagName" IS NULL`);
          } else if (params.tagName) {
            whereFragments.push(Prisma.sql`d."tagName" = ${params.tagName}`);
          }

          const whereClause = Prisma.join(whereFragments, '\n          AND ');

          // haversine 地理条件（参数由 Prisma 安全绑定）
          const geoCondition = Prisma.sql`
            d."serviceType" = 'ONLINE'
            OR (
              d."serviceType" = 'OFFLINE'
              AND d."locationLat" IS NOT NULL
              AND d."locationLng" IS NOT NULL
              AND 6371 * 2 * ASIN(SQRT(
                POWER(SIN((${lat} - d."locationLat") * PI() / 180 / 2), 2) +
                COS(${lat} * PI() / 180) * COS(d."locationLat" * PI() / 180) *
                POWER(SIN((${lng} - d."locationLng") * PI() / 180 / 2), 2)
              )) <= ${distance}
            )
          `;

          const haversineExpr = Prisma.sql`
            6371 * 2 * ASIN(SQRT(
              POWER(SIN((${lat} - d."locationLat") * PI() / 180 / 2), 2) +
              COS(${lat} * PI() / 180) * COS(d."locationLat" * PI() / 180) *
              POWER(SIN((${lng} - d."locationLng") * PI() / 180 / 2), 2)
            ))
          `;

          const offset = (page - 1) * limit;

          const raw = await prisma.$queryRaw<any[]>`
            SELECT d.*,
              u."nickname", u."avatarUrl", u."coverUrl", u."demandCardCoverUrl", u."certificationLevel",
              COALESCE((SELECT COUNT(*) FROM "DemandApplication" WHERE "demandId" = d.id), 0)::int AS "applicantCount",
              ${haversineExpr} AS "distanceKm"
            FROM "Demand" d
            JOIN "User" u ON u.id = d."userId"
            WHERE ${whereClause}
              AND (${geoCondition})
            ORDER BY d."createdAt" DESC, d."id" DESC
            LIMIT ${limit} OFFSET ${offset}
          `;

          const countRaw = await prisma.$queryRaw<any[]>`
            SELECT COUNT(*)::int AS total FROM "Demand" d
            WHERE ${whereClause}
              AND (${geoCondition})
          `;

      const total = countRaw[0]?.total || 0;
      const result = raw.map((d: any) => ({
        id: d.id,
        title: d.title,
        tagName: d.tagName,
        minPrice: Number(d.minPrice),
        category: d.category,
        taxonomyLeafId: d.taxonomyLeafId,
        serviceType: d.serviceType,
        cityCode: d.cityCode,
        applicantCount: d.applicantCount,
        distance: d.distanceKm ? Math.round(Number(d.distanceKm) * 10) / 10 : null,
        createdAgo: formatCreatedAgo(d.createdAt),
        isExample: d.isExample,
        user: {
          id: d.userId,
          nickname: d.nickname,
          avatarUrl: d.avatarUrl,
          coverUrl: d.coverUrl,
          demandCardCoverUrl: d.demandCardCoverUrl,
          certificationLevel: d.certificationLevel,
        },
        mediaUrls: d.mediaUrls,
        isSnatched: false,
        createdAt: d.createdAt,
        descriptionPreview:
          d.description && String(d.description).length > 0
            ? String(d.description).length > 160
              ? `${String(d.description).slice(0, 160)}…`
              : String(d.description)
            : undefined,
      }));

      return {
        demands: result,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }

    // Non-geo：用 count + skip/take，total 与列表一致（避免误以为接口只返回「内存里的几条」）
    const total = await prisma.demand.count({ where });
    const demands = await prisma.demand.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
            coverUrl: true,
            demandCardCoverUrl: true,
            certificationLevel: true,
          },
        },
        _count: { select: { applications: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    const paged = demands.map((d: any) => ({
      id: d.id,
      title: d.title,
      tagName: d.tagName,
      minPrice: Number(d.minPrice),
      category: d.category,
      taxonomyLeafId: d.taxonomyLeafId,
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
      // AI 2.5
      status: d.status,
      visibilityWindow: d.visibilityWindow,
      expectedOutcome: d.expectedOutcome,
      maxApplicants: d.maxApplicants,
      tags: d.tags,
      acceptedProviderId: d.acceptedProviderId,
      deposit: d.deposit,
      lifecycleStage: d.lifecycleStage,
      descriptionPreview:
        d.description && d.description.length > 0
          ? d.description.length > 160
            ? `${d.description.slice(0, 160)}…`
            : d.description
          : undefined,
    }));

    return {
      demands: paged,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  async getById(demandId: string, userId?: string) {
    const demand = await prisma.demand.findUnique({
      where: { id: demandId },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true, coverUrl: true, demandCardCoverUrl: true, certificationLevel: true, creditScore: true, ipRegion: true } },
        applications: {
          include: { user: { select: { id: true, nickname: true, avatarUrl: true, certificationLevel: true } } },
          orderBy: { createdAt: 'desc' },
        },
        circle: { select: { id: true, name: true, type: true } },
      },
    });
    if (!demand) throw { status: 404, message: '需求不存在' };

    const isOwner = userId === demand.userId;
    const hasOrder = demand.applications.some((a: any) => a.status === 'ACCEPTED');

    return {
      ...demand,
      minPrice: Number(demand.minPrice),
      applications: isOwner ? demand.applications.map((a: any) => ({
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

    // 退回全部押金
    if (demand.deposit > 0) {
      await prisma.deposit.updateMany({
        where: {
          userId,
          status: 'PENDING',
          demandRelations: { some: { demandId } },
        },
        data: { status: 'REFUNDED' },
      });
    }

    await prisma.demand.delete({ where: { id: demandId } });
    return { message: '已删除，押金已退回' };
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

  async getFrozenCount(userId: string) {
    return prisma.demand.count({ where: { userId, status: 'FROZEN' } });
  },

  // ═══ AI 2.5: 两段式接单 ═══

  async requestDemand(demandId: string, userId: string, message: string) {
    const demand = await prisma.demand.findUnique({ where: { id: demandId } });
    if (!demand) throw Object.assign(new Error('需求不存在'), { status: 404 });
    if (demand.status !== 'ACTIVE' && demand.status !== 'PENDING')
      throw Object.assign(new Error('需求已过期'), { status: 400 });
    if (demand.userId === userId)
      throw Object.assign(new Error('不能申请自己的需求'), { status: 400 });

    // 满员检查
    if (demand.applicantCount >= (demand.maxApplicants || 10)) {
      throw Object.assign(
        new Error('申请人数已达上限，请等待发布者释放名额'),
        { status: 429 },
      );
    }

    // 是否仅认证用户可申请
    if (demand.isCertifiedOnly) {
      const cert = await prisma.certifiedProvider.findUnique({
        where: { userId },
      });
      if (!cert)
        throw Object.assign(new Error('仅认证用户可申请此需求'), { status: 403 });
    }

    const existing = await prisma.demandApplicantV2.findUnique({
      where: { demandId_userId: { demandId, userId } },
    });
    if (existing)
      throw Object.assign(new Error('你已申请过此需求'), { status: 409 });

    const applicant = await prisma.demandApplicantV2.create({
      data: { demandId, userId, message },
    });

    await prisma.demand.update({
      where: { id: demandId },
      data: { applicantCount: { increment: 1 } },
    });

    return applicant;
  },

  async acceptApplicant(demandId: string, applicantId: string, userId: string) {
    const demand = await prisma.demand.findUnique({ where: { id: demandId } });
    if (!demand) throw Object.assign(new Error('需求不存在'), { status: 404 });
    if (demand.userId !== userId)
      throw Object.assign(new Error('无权操作'), { status: 403 });

    const applicant = await prisma.demandApplicantV2.findUnique({
      where: { id: applicantId },
    });
    if (!applicant)
      throw Object.assign(new Error('申请不存在'), { status: 404 });

    // 原子操作
    await prisma.$transaction([
      // 标记正式接单
      prisma.demand.update({
        where: { id: demandId },
        data: {
          acceptedProviderId: applicant.userId,
          status: 'IN_PROGRESS',
        },
      }),
      // 接受该申请
      prisma.demandApplicantV2.update({
        where: { id: applicantId },
        data: { status: 'ACCEPTED' },
      }),
      // 拒绝其他所有申请
      prisma.demandApplicantV2.updateMany({
        where: {
          demandId,
          id: { not: applicantId },
          status: { in: ['PENDING', 'COMMUNICATING'] },
        },
        data: { status: 'REJECTED' },
      }),
    ]);

    return { ok: true, acceptedUserId: applicant.userId };
  },

  async rejectApplicant(demandId: string, applicantId: string, userId: string) {
    const demand = await prisma.demand.findUnique({ where: { id: demandId } });
    if (!demand) throw Object.assign(new Error('需求不存在'), { status: 404 });
    if (demand.userId !== userId)
      throw Object.assign(new Error('无权操作'), { status: 403 });

    await prisma.demandApplicantV2.update({
      where: { id: applicantId },
      data: { status: 'REJECTED' },
    });

    return { ok: true };
  },

  async getApplicantsV2(demandId: string, userId: string) {
    const demand = await prisma.demand.findUnique({ where: { id: demandId } });
    if (!demand) throw Object.assign(new Error('需求不存在'), { status: 404 });
    if (demand.userId !== userId)
      throw Object.assign(new Error('无权查看'), { status: 403 });

    return prisma.demandApplicantV2.findMany({
      where: { demandId },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true, certificationLevel: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async withdrawDemand(demandId: string, userId: string) {
    const demand = await prisma.demand.findUnique({ where: { id: demandId } });
    if (!demand) throw Object.assign(new Error('需求不存在'), { status: 404 });
    if (demand.userId !== userId)
      throw Object.assign(new Error('无权操作'), { status: 403 });

    if (demand.status === 'COMPLETED')
      throw Object.assign(new Error('已完成的需求无法撤回'), { status: 400 });

    // 退回押金（99.99%）
    const refund = demand.deposit > 0 ? Math.round(demand.deposit * 0.9999 * 100) / 100 : 0;

    await prisma.$transaction([
      prisma.demand.update({
        where: { id: demandId },
        data: { status: 'WITHDRAWN' },
      }),
      // 关闭所有申请
      prisma.demandApplicantV2.updateMany({
        where: {
          demandId,
          status: { in: ['PENDING', 'COMMUNICATING'] },
        },
        data: { status: 'WITHDRAWN' },
      }),
      ...(demand.deposit > 0
        ? [
            prisma.deposit.updateMany({
              where: {
                userId,
                status: 'PENDING',
                demandRelations: { some: { demandId } },
              },
              data: { status: 'REFUNDED' },
            }),
          ]
        : []),
    ]);

    return { ok: true, refund };
  },
};
