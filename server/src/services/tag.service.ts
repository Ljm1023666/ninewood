import { prisma } from '../lib/prisma.js';

export const tagService = {
  /**
   * 获取所有标签列表，按完成数降序
   */
  async list() {
    return prisma.tag.findMany({
      orderBy: { totalCompleted: 'desc' },
    });
  },

  /**
   * 按名称获取单个标签
   */
  async getByName(name: string) {
    return prisma.tag.findUnique({ where: { name } });
  },

  /**
   * 搜索标签（名称模糊匹配）
   */
  async search(query: string) {
    return prisma.tag.findMany({
      where: { name: { contains: query } },
      orderBy: { totalCompleted: 'desc' },
      take: 50,
    });
  },

  /**
   * 创建新标签（管理用）
   */
  async create(params: { name: string; category?: 'service' | 'demand' | 'both' }) {
    const existing = await prisma.tag.findUnique({ where: { name: params.name } });
    if (existing) {
      throw Object.assign(new Error('标签已存在'), { status: 409 });
    }

    return prisma.tag.create({
      data: {
        name: params.name,
        category: params.category || 'both',
      },
    });
  },

  /**
   * 更新标签统计（完成交易时调用）
   * totalCompleted += 1
   * totalEstimatedAmount += amount
   * colorHistogram 追加一条记录
   */
  async updateStats(name: string, amount: number, colorCode?: string) {
    const tag = await prisma.tag.findUnique({ where: { name } });
    if (!tag) return null;

    const histogram = Array.isArray(tag.colorHistogram) ? [...tag.colorHistogram] : [];
    histogram.push({
      amount,
      colorCode: colorCode || '#6366f1',
      timestamp: new Date().toISOString(),
    });

    return prisma.tag.update({
      where: { name },
      data: {
        totalCompleted: { increment: 1 },
        totalEstimatedAmount: { increment: amount },
        colorHistogram: histogram,
      },
    });
  },

  /**
   * 获取标签列表，附带活跃需求数量（可按地域筛选）
   */
  async listWithCounts(regionId?: number, stageFilter?: string) {
    const tags = await prisma.tag.findMany({ orderBy: { totalCompleted: 'desc' } })

    const stage = stageFilter === 'completed' ? 'completed' : 'active'
    const where: any = { stage, tagName: { not: null } }
    if (regionId != null) where.regionId = regionId

    const counts = await prisma.demand.groupBy({
      by: ['tagName'],
      where,
      _count: { id: true },
      _sum: { amountEstimate: true },
      _avg: { minPrice: true },
    })

    const countMap = new Map(counts.map(c => [c.tagName!, {
      count: c._count.id,
      totalAmount: Number(c._sum.amountEstimate || 0),
      avgPrice: Math.round(Number(c._avg.minPrice || 0)),
    }]))

    // 未分类计数
    const untaggedWhere: any = { stage, tagName: null }
    if (regionId != null) untaggedWhere.regionId = regionId
    const untagged = await prisma.demand.count({ where: untaggedWhere })

    return {
      tags: tags.map(t => ({
        ...t,
        activeCount: countMap.get(t.name)?.count || 0,
      avgPrice: countMap.get(t.name)?.avgPrice || 0,
      totalAmount: countMap.get(t.name)?.totalAmount || 0,
      totalEstimatedAmount: Number(t.totalEstimatedAmount),
      })),
      untagged,
    }
  },

  /**
   * 删除标签
   */
  async delete(name: string) {
    const existing = await prisma.tag.findUnique({ where: { name } });
    if (!existing) {
      throw Object.assign(new Error('标签不存在'), { status: 404 });
    }

    return prisma.tag.delete({ where: { name } });
  },
};
