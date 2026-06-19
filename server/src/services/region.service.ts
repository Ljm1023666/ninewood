import { prisma } from '../lib/prisma.js';

export const regionService = {
  /**
   * 获取下级区域列表
   * parentId 为 0 或 undefined 时返回所有省份（level=2）
   */
  async getChildren(parentId?: number) {
    const where = parentId ? { parentId } : { level: 2 };
    return prisma.region.findMany({ where, orderBy: { id: 'asc' } });
  },

  /**
   * 返回完整树结构（省->市区->区县，最多3层）
   */
  async getTree() {
    const regions = await prisma.region.findMany({ orderBy: { id: 'asc' } });

    const map = new Map<number, any>();
    const roots: any[] = [];

    // 先按 id 建立索引
    for (const r of regions) {
      map.set(r.id, { ...r, children: [] });
    }

    // 构建树
    for (const r of regions) {
      const node = map.get(r.id)!;
      if (r.parentId === 0) {
        roots.push(node);
      } else {
        const parent = map.get(r.parentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    }

    return roots;
  },

  /**
   * 根据 ID 获取区域详情
   */
  async getById(id: number) {
    return prisma.region.findUnique({ where: { id } });
  },

  /**
   * 按名称模糊搜索
   */
  async searchByName(name: string) {
    return prisma.region.findMany({
      where: { name: { contains: name } },
      orderBy: { id: 'asc' },
      take: 50,
    });
  },
};
