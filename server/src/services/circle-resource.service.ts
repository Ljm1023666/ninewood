import { prisma } from '../lib/prisma.js';
import type { Prisma } from '@prisma/client';
import { circleHubService } from './circle-hub.service.js';

export type CircleResourceItem = {
  id: string;
  name: string;
  fileUrl: string;
  mimeType: string | null;
  sizeBytes: number;
  sizeLabel: string;
  category: string;
  uploader: { id: string; nickname: string; avatarUrl: string | null };
  createdAt: string;
};

const VALID_CATEGORIES = ['DOC', 'DESIGN', 'CODE', 'VIDEO', 'OTHER'] as const;
export type CircleResourceCategoryName = (typeof VALID_CATEGORIES)[number];

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (10244 * 1024 * 1024)).toFixed(1)} GB`;
}

export function parseCategory(input: string | undefined): CircleResourceCategoryName {
  if (!input) return 'OTHER';
  const v = input.toUpperCase();
  if ((VALID_CATEGORIES as readonly string[]).includes(v)) return v as CircleResourceCategoryName;
  // frontend alias: zip/sheet → OTHER
  if (v === 'ZIP' || v === 'SHEET') return 'OTHER';
  return 'OTHER';
}

function toItem(r: {
  id: string;
  name: string;
  fileUrl: string;
  mimeType: string | null;
  sizeBytes: number;
  category: string;
  createdAt: Date;
  uploader: { id: string; nickname: string; avatarUrl: string | null };
}): CircleResourceItem {
  return {
    id: r.id,
    name: r.name,
    fileUrl: r.fileUrl,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    sizeLabel: formatSize(r.sizeBytes),
    category: r.category,
    uploader: { id: r.uploader.id, nickname: r.uploader.nickname, avatarUrl: r.uploader.avatarUrl },
    createdAt: r.createdAt.toISOString(),
  };
}

export const circleResourceService = {
  /** GET /circles/:id/resources?category=&q=&page=&limit= */
  async list(
    circleId: string,
    params: { category?: string; q?: string; page?: number; limit?: number } = {},
  ) {
    const page = Math.max(params.page || 1, 1);
    const limit = Math.min(Math.max(params.limit || 20, 1), 100);
    const where: Prisma.CircleResourceWhereInput = { circleId };
    if (params.category && params.category !== 'all') {
      where.category = parseCategory(params.category);
    }
    if (params.q && params.q.trim()) {
      where.name = { contains: params.q.trim(), mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      prisma.circleResource.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { uploader: { select: { id: true, nickname: true, avatarUrl: true } } },
      }),
      prisma.circleResource.count({ where }),
    ]);
    const recent = items.slice(0, 4).map(toItem);
    return {
      recent,
      items: items.map(toItem),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  },

  /** POST /circles/:id/resources  member upload */
  async create(
    circleId: string,
    uploaderId: string,
    file: Express.Multer.File,
    category: string | undefined,
  ) {
    const resource = await prisma.circleResource.create({
      data: {
        circleId,
        uploaderId,
        name: file.originalname,
        fileUrl: `/uploads/circle-resources/${file.filename}`,
        mimeType: file.mimetype || null,
        sizeBytes: file.size,
        category: parseCategory(category),
      },
      include: { uploader: { select: { id: true, nickname: true, avatarUrl: true } } },
    });
    await circleHubService.recordActivity({
      circleId,
      actorId: uploaderId,
      type: 'RESOURCE',
      title: '上传资源',
      summary: resource.name,
      refId: resource.id,
    });
    return toItem(resource);
  },

  /** DELETE /circles/:id/resources/:resourceId  uploader or OWNER/ADMIN */
  async remove(circleId: string, resourceId: string, userId: string) {
    const resource = await prisma.circleResource.findUnique({ where: { id: resourceId } });
    if (!resource || resource.circleId !== circleId) throw { status: 404, message: '资源不存在' };

    const isUploader = resource.uploaderId === userId;
    if (!isUploader) {
      const member = await prisma.circleMember.findUnique({
        where: { circleId_userId: { circleId, userId } },
      });
      if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
        throw { status: 403, message: '仅上传者/圈主/管理员可删除' };
      }
    }
    await prisma.circleResource.delete({ where: { id: resourceId } });
    return { success: true };
  },
};