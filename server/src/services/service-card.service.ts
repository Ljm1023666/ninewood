import { prisma } from '../lib/prisma.js';
import { Prisma, ServiceType } from '@prisma/client';

export type ServiceCardClaimInput = {
  label: string;
  description?: string;
};

export type ServiceCardInput = {
  title: string;
  summary?: string;
  description: string;
  coverImage?: string;
  category: string;
  serviceType?: ServiceType;
  cityCode?: string;
  regionId?: number;
  paths?: string[];
  tags?: string[];
  priceMin?: number;
  priceMax?: number;
  priceUnit?: string;
  deliveryMode?: string;
  availability?: string;
  claims?: ServiceCardClaimInput[];
};

function cleanText(value: unknown, field: string, required = false): string | undefined {
  const text = typeof value === 'string' ? value.trim() : '';
  if (required && !text) throw Object.assign(new Error(`${field}不能为空`), { status: 400 });
  return text || undefined;
}

function normalizeInput(input: ServiceCardInput) {
  const title = cleanText(input.title, '服务卡标题', true)!;
  const description = cleanText(input.description, '服务说明', true)!;
  const category = cleanText(input.category, '服务类别', true)!;
  if (title.length > 120) throw Object.assign(new Error('服务卡标题不能超过120字'), { status: 400 });
  if (description.length > 10000) throw Object.assign(new Error('服务说明不能超过10000字'), { status: 400 });
  if (input.priceMin != null && input.priceMin < 0) {
    throw Object.assign(new Error('最低报价不能为负数'), { status: 400 });
  }
  if (input.priceMax != null && input.priceMax < 0) {
    throw Object.assign(new Error('最高报价不能为负数'), { status: 400 });
  }
  if (input.priceMin != null && input.priceMax != null && input.priceMin > input.priceMax) {
    throw Object.assign(new Error('最低报价不能高于最高报价'), { status: 400 });
  }

  const claims = [...new Map(
    (input.claims ?? [])
      .map((claim) => ({
        label: cleanText(claim.label, '能力范围', true)!,
        description: cleanText(claim.description, '能力说明') ?? null,
      }))
      .filter((claim) => claim.label)
      .map((claim) => [claim.label, claim]),
  ).values()].slice(0, 30);

  return {
    title,
    summary: cleanText(input.summary, '服务简介') ?? null,
    description,
    coverImage: cleanText(input.coverImage, '封面') ?? null,
    category,
    serviceType: input.serviceType ?? ServiceType.ONLINE,
    cityCode: cleanText(input.cityCode, '城市') ?? null,
    regionId: input.regionId ?? null,
    paths: Array.from(new Set((input.paths ?? []).map((path) => path.trim()).filter(Boolean))).slice(0, 50),
    tags: Array.from(new Set((input.tags ?? []).map((tag) => tag.trim()).filter(Boolean))).slice(0, 50),
    priceMin: input.priceMin ?? null,
    priceMax: input.priceMax ?? null,
    priceUnit: cleanText(input.priceUnit, '报价单位') ?? null,
    deliveryMode: cleanText(input.deliveryMode, '服务方式') ?? 'ONLINE',
    availability: cleanText(input.availability, '可用状态') ?? 'AVAILABLE',
    claims,
  };
}

function publicCard(card: any) {
  return {
    id: card.id,
    title: card.title,
    summary: card.summary,
    description: card.description,
    coverImage: card.coverImage,
    category: card.category,
    serviceType: card.serviceType,
    cityCode: card.cityCode,
    regionId: card.regionId,
    paths: card.paths,
    tags: card.tags,
    priceMin: card.priceMin,
    priceMax: card.priceMax,
    priceUnit: card.priceUnit,
    deliveryMode: card.deliveryMode,
    availability: card.availability,
    status: card.status,
    publishedAt: card.publishedAt,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    publisher: card.user
      ? {
          id: card.user.id,
          nickname: card.user.nickname,
          avatarUrl: card.user.avatarUrl,
          certificationLevel: card.user.certificationLevel,
          completedOrders: card.user.completedOrders,
        }
      : undefined,
    claims: (card.claims ?? []).map((claim: any) => ({
      id: claim.id,
      label: claim.label,
      description: claim.description,
      isHighlighted: claim.isHighlighted,
      sortOrder: claim.sortOrder,
    })),
    evidence: (card.evidence ?? []).map((evidence: any) => ({
      label: evidence.label,
      completedCount: evidence.completedCount,
      successfulCount: evidence.successfulCount,
      successRate: evidence.successRate,
      lastCompletedAt: evidence.lastCompletedAt,
      calculatedAt: evidence.calculatedAt,
    })),
  };
}

const publicInclude = {
  user: {
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
      certificationLevel: true,
      completedOrders: true,
    },
  },
  claims: { orderBy: { sortOrder: 'asc' as const } },
  evidence: { orderBy: { completedCount: 'desc' as const } },
};

export const serviceCardService = {
  async create(userId: string, input: ServiceCardInput) {
    const normalized = normalizeInput(input);
    const card = await prisma.serviceCard.create({
      data: {
        userId,
        title: normalized.title,
        summary: normalized.summary,
        description: normalized.description,
        coverImage: normalized.coverImage,
        category: normalized.category,
        serviceType: normalized.serviceType,
        cityCode: normalized.cityCode,
        regionId: normalized.regionId,
        paths: normalized.paths,
        tags: normalized.tags,
        priceMin: normalized.priceMin,
        priceMax: normalized.priceMax,
        priceUnit: normalized.priceUnit,
        deliveryMode: normalized.deliveryMode,
        availability: normalized.availability,
        status: 'DRAFT',
        claims: {
          create: normalized.claims.map((claim, index) => ({
            label: claim.label,
            description: claim.description,
            sortOrder: index,
          })),
        },
      },
      include: publicInclude,
    });
    return publicCard(card);
  },

  async listMine(userId: string) {
    const cards = await prisma.serviceCard.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: publicInclude,
    });
    return cards.map(publicCard);
  },

  async getPublic(id: string) {
    const card = await prisma.serviceCard.findFirst({
      where: { id, status: 'PUBLISHED', isPublic: true },
      include: publicInclude,
    });
    return card ? publicCard(card) : null;
  },

  async getOwned(id: string, userId: string) {
    const card = await prisma.serviceCard.findFirst({
      where: { id, userId },
      include: publicInclude,
    });
    return card ? { ...publicCard(card), isOwner: true } : null;
  },

  async update(id: string, userId: string, input: ServiceCardInput) {
    const owned = await prisma.serviceCard.findFirst({ where: { id, userId }, select: { id: true } });
    if (!owned) throw Object.assign(new Error('服务卡不存在或无权编辑'), { status: 404 });
    const normalized = normalizeInput(input);
    const card = await prisma.$transaction(async (tx) => {
      await tx.serviceCardClaim.deleteMany({ where: { serviceCardId: id } });
      return tx.serviceCard.update({
        where: { id },
        data: {
          title: normalized.title,
          summary: normalized.summary,
          description: normalized.description,
          coverImage: normalized.coverImage,
          category: normalized.category,
          serviceType: normalized.serviceType,
          cityCode: normalized.cityCode,
          regionId: normalized.regionId,
          paths: normalized.paths,
          tags: normalized.tags,
          priceMin: normalized.priceMin,
          priceMax: normalized.priceMax,
          priceUnit: normalized.priceUnit,
          deliveryMode: normalized.deliveryMode,
          availability: normalized.availability,
          claims: {
            create: normalized.claims.map((claim, index) => ({
              label: claim.label,
              description: claim.description,
              sortOrder: index,
            })),
          },
        },
        include: publicInclude,
      });
    });
    return publicCard(card);
  },

  async setPublished(id: string, userId: string, published: boolean) {
    const card = await prisma.serviceCard.findFirst({ where: { id, userId }, select: { id: true } });
    if (!card) throw Object.assign(new Error('服务卡不存在或无权操作'), { status: 404 });
    const updated = await prisma.serviceCard.update({
      where: { id },
      data: {
        status: published ? 'PUBLISHED' : 'PAUSED',
        publishedAt: published ? new Date() : undefined,
      },
      include: publicInclude,
    });
    return publicCard(updated);
  },

  async search(params: { keyword?: string; category?: string; tags?: string[]; limit?: number }) {
    const keyword = params.keyword?.trim();
    const where: Prisma.ServiceCardWhereInput = { status: 'PUBLISHED', isPublic: true };
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { summary: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { claims: { some: { label: { contains: keyword, mode: 'insensitive' } } } },
      ];
    }
    if (params.category) where.category = params.category;
    if (params.tags?.length) where.tags = { hasSome: params.tags };
    const cards = await prisma.serviceCard.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: Math.min(Math.max(params.limit ?? 20, 1), 100),
      include: publicInclude,
    });
    return cards.map(publicCard);
  },

  async snapshot(id: string, userId: string) {
    const card = await prisma.serviceCard.findFirst({
      where: {
        id,
        OR: [{ userId }, { status: 'PUBLISHED', isPublic: true }],
      },
      include: publicInclude,
    });
    if (!card) throw Object.assign(new Error('服务卡不存在或不可见'), { status: 404 });
    const data = publicCard(card);
    return {
      cardType: 'SERVICE_CARD',
      cardId: card.id,
      title: card.title,
      summary: card.summary,
      coverImage: card.coverImage,
      category: card.category,
      priceMin: card.priceMin,
      priceMax: card.priceMax,
      priceUnit: card.priceUnit,
      publisher: data.publisher,
      claims: data.claims,
      evidence: data.evidence,
    };
  },
};
