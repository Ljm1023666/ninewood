import { toolRegistry, type ToolContext, type ToolResult } from './tool-registry.js';
import { prisma } from '../../lib/prisma.js';

/** 注册所有 Ninewood 业务工具 */
export function registerNinewoodTools(): void {
  // ── 需求相关 ──

  toolRegistry.register({
    definition: {
      name: 'search_demands',
      description:
        '搜索九木平台上的需求列表。可按关键词、分类、线上/线下类型、城市筛选。',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '搜索关键词' },
          category: { type: 'string', description: '需求分类，如"游戏""设计""跑腿"' },
          serviceType: {
            type: 'string',
            enum: ['ONLINE', 'OFFLINE'],
            description: '线上或线下服务',
          },
          cityCode: { type: 'string', description: '城市代码' },
          limit: { type: 'number', description: '返回数量上限，默认 10' },
        },
      },
    },
    category: 'demand',
    requiresConfirmation: false,
    handler: async (args, _ctx) => {
      const keyword = (args.keyword as string) || '';
      const category = (args.category as string) || '';
      const serviceType = args.serviceType as 'ONLINE' | 'OFFLINE' | undefined;
      const cityCode = (args.cityCode as string) || '';
      const limit = (args.limit as number) || 10;

      const where: Record<string, unknown> = {
        status: 'PENDING',
        isPublic: true,
      };
      if (keyword) where.title = { contains: keyword };
      if (category) where.category = { contains: category };
      if (serviceType) where.serviceType = serviceType;
      if (cityCode) where.cityCode = cityCode;

      const demands = await prisma.demand.findMany({
        where,
        take: Math.min(limit, 20),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          serviceType: true,
          minPrice: true,
          cityCode: true,
          createdAt: true,
        },
      });

      const list = demands.map((d: any) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        type: d.serviceType,
        minPrice: Number(d.minPrice),
      }));

      if (list.length === 0) {
        return {
          success: true,
          data: [],
          message: '没有找到匹配的需求，试试调整搜索条件？',
        };
      }

      return {
        success: true,
        data: list,
        message: `找到 ${list.length} 个相关需求：\n${list
          .map((d: any) => `- ${d.title}（${d.category}）¥${d.minPrice}起`)
          .join('\n')}`,
      };
    },
  });

  // ── 用户信息 ──

  toolRegistry.register({
    definition: {
      name: 'get_user_profile',
      description: '获取当前用户的个人信息，包括昵称、信用分、完成订单数等。',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    category: 'user',
    requiresConfirmation: false,
    handler: async (_args, ctx) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: {
          nickname: true,
          phone: true,
          certificationLevel: true,
          creditScore: true,
          completedOrders: true,
          role: true,
          bio: true,
        },
      });

      if (!user) {
        return { success: false, error: '用户不存在', message: '无法获取用户信息' };
      }

      return {
        success: true,
        data: user,
        message: `用户 ${user.nickname}：信用分 ${user.creditScore}，已完成 ${user.completedOrders} 单`,
      };
    },
  });

  // ── 发布需求 ──

  toolRegistry.register({
    definition: {
      name: 'create_demand',
      description:
        '为用户创建一个新需求。需要提供标题、描述、分类、服务类型（线上/线下）、最低价格（元）和过期天数。',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '需求标题，10-30字' },
          description: { type: 'string', description: '详细描述' },
          category: { type: 'string', description: '需求分类' },
          serviceType: {
            type: 'string',
            enum: ['ONLINE', 'OFFLINE'],
            description: '线上/线下',
          },
          minPrice: { type: 'number', description: '最低价格（元）' },
          expireDays: { type: 'number', description: '有效期（天），默认7' },
        },
        required: ['title', 'description', 'category', 'serviceType', 'minPrice'],
      },
    },
    category: 'demand',
    requiresConfirmation: true,
    handler: async (args, ctx) => {
      const title = args.title as string;
      const description = args.description as string;
      const category = args.category as string;
      const serviceType = args.serviceType as 'ONLINE' | 'OFFLINE';
      const minPrice = args.minPrice as number;
      const expireDays = (args.expireDays as number) || 7;

      const expireAt = new Date();
      expireAt.setDate(expireAt.getDate() + expireDays);

      const demand = await prisma.demand.create({
        data: {
          userId: ctx.userId,
          title,
          description,
          category,
          serviceType,
          minPrice,
          expireAt,
        },
      });

      return {
        success: true,
        data: { id: demand.id, title: demand.title },
        message: `需求"${title}"已发布成功！有效期至 ${expireAt.toLocaleDateString('zh-CN')}。`,
      };
    },
  });

  // ── 我的需求 ──

  toolRegistry.register({
    definition: {
      name: 'list_my_demands',
      description: '查看当前用户发布的需求列表。',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['PENDING', 'FROZEN', 'COMPLETED'],
            description: '需求状态筛选',
          },
          limit: { type: 'number', description: '返回数量，默认 10' },
        },
      },
    },
    category: 'demand',
    requiresConfirmation: false,
    handler: async (args, ctx) => {
      const status = args.status as string | undefined;
      const limit = (args.limit as number) || 10;

      const where: Record<string, unknown> = { userId: ctx.userId };
      if (status) where.status = status;

      const demands = await prisma.demand.findMany({
        where,
        take: Math.min(limit, 20),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          category: true,
          applicantCount: true,
          createdAt: true,
        },
      });

      if (demands.length === 0) {
        return {
          success: true,
          data: [],
          message: '你还没有发布过需求',
        };
      }

      return {
        success: true,
        data: demands,
        message: `你共有 ${demands.length} 个需求：\n${demands
          .map((d: any) => `- ${d.title}（${d.status}）${d.applicantCount}人申请`)
          .join('\n')}`,
      };
    },
  });
}
