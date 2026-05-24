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
