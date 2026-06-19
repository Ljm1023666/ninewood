import { toolRegistry, type ToolContext, type ToolResult } from './tool-registry.js';
import { prisma } from '../../lib/prisma.js';
import { searchKnowledge } from './knowledge-loader.js';

// ─── Helper ─────────────────────────────────────────────────────────────────

function ok(data: unknown, message: string): ToolResult {
  return { success: true, data, message };
}

function fail(error: string, message: string): ToolResult {
  return { success: false, error, message };
}

function safePrisma<T>(fn: () => Promise<T>): Promise<T> {
  return fn();
}

// ─── 需求相关工具 ────────────────────────────────────────────────────────────

function registerDemandTools(): void {
  // 搜索需求 (L1 — 自动执行)
  toolRegistry.register({
    definition: {
      name: 'search_demands',
      description: '搜索九木平台上的需求列表。可按关键词、分类、线上/线下类型、城市、价格范围筛选。',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '搜索关键词，匹配标题和描述' },
          category: { type: 'string', description: '需求分类，如"游戏""设计""跑腿""编程"' },
          serviceType: { type: 'string', enum: ['ONLINE', 'OFFLINE'], description: '线上或线下服务' },
          cityCode: { type: 'string', description: '城市代码' },
          minPrice: { type: 'number', description: '最低价格（元）' },
          maxPrice: { type: 'number', description: '最高价格（元）' },
          tagName: { type: 'string', description: '标签名称' },
          limit: { type: 'number', description: '返回数量上限，默认 10，最多 20' },
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
      const tagName = (args.tagName as string) || '';
      const minPrice = args.minPrice as number | undefined;
      const maxPrice = args.maxPrice as number | undefined;
      const limit = Math.min((args.limit as number) || 10, 20);

      const where: Record<string, unknown> = { isPublic: true, status: 'ACTIVE' };
      if (keyword) {
        where.OR = [
          { title: { contains: keyword } },
          { description: { contains: keyword } },
        ];
      }
      if (category) where.category = { contains: category };
      if (serviceType) where.serviceType = serviceType;
      if (cityCode) where.cityCode = cityCode;
      if (tagName) where.tagName = tagName;
      if (minPrice !== undefined || maxPrice !== undefined) {
        const p: Record<string, unknown> = {};
        if (minPrice !== undefined) p.gte = minPrice;
        if (maxPrice !== undefined) p.lte = maxPrice;
        where.minPrice = p;
      }

      const demands = await safePrisma(() =>
        prisma.demand.findMany({
          where,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, title: true, category: true,
            serviceType: true, minPrice: true, cityCode: true,
            applicantCount: true, createdAt: true, expireAt: true,
            isPublicWelfare: true,
          },
        }),
      );

      const list = demands.map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        type: d.serviceType,
        price: Number(d.minPrice),
        city: d.cityCode,
        applicants: d.applicantCount,
        createdAt: d.createdAt,
        expireAt: d.expireAt,
        isWelfare: d.isPublicWelfare,
      }));

      if (list.length === 0) {
        return ok([], '没有找到匹配的需求，试试调整搜索条件？');
      }

      return ok(
        list,
        `找到 ${list.length} 个相关需求：\n${list.map((d) => `- ${d.title}（${d.category}）¥${d.price}起`).join('\n')}`,
      );
    },
  });

  // 创建需求 (L2 — 需确认)
  toolRegistry.register({
    definition: {
      name: 'create_demand',
      description: '为用户创建一个新需求。需要提供标题、描述、分类、服务类型、预算和有效期。',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '需求标题，2-100 字' },
          description: { type: 'string', description: '详细描述，2-2000 字' },
          category: { type: 'string', description: '需求分类，如"游戏""设计""编程""跑腿"' },
          serviceType: { type: 'string', enum: ['ONLINE', 'OFFLINE'], description: '线上或线下服务' },
          minPrice: { type: 'number', description: '预算金额（元），1-999999' },
          expireDays: { type: 'number', description: '有效期（天），1-30，默认 7' },
          isCertifiedOnly: { type: 'boolean', description: '是否仅认证用户可申请' },
          cityCode: { type: 'string', description: '城市代码（线下服务需要）' },
          tagName: { type: 'string', description: '关联标签名称' },
        },
        required: ['title', 'description', 'category', 'serviceType', 'minPrice'],
      },
    },
    category: 'demand',
    requiresConfirmation: true,
    handler: async (args, ctx) => {
      const title = String(args.title || '').trim();
      const description = String(args.description || '').trim();
      const category = String(args.category || '').trim();
      const serviceType = args.serviceType as 'ONLINE' | 'OFFLINE';
      const minPrice = Number(args.minPrice);
      const expireDays = Math.min(Math.max(Number(args.expireDays) || 7, 1), 30);
      const isCertifiedOnly = Boolean(args.isCertifiedOnly);
      const cityCode = (args.cityCode as string) || undefined;
      const tagName = (args.tagName as string) || undefined;

      // 校验
      if (title.length < 2 || title.length > 100) return fail('标题长度不符', '标题需要 2-100 字');
      if (description.length < 2 || description.length > 2000) return fail('描述长度不符', '描述需要 2-2000 字');
      if (minPrice < 1 || minPrice > 999999) return fail('预算范围不符', '预算需要在 1-999,999 元之间');

      // 检查冻结状态
      const frozenCount = await safePrisma(() =>
        prisma.demand.count({ where: { userId: ctx.userId, status: 'FROZEN' } }),
      );
      if (frozenCount > 0) return fail('账户有冻结需求', '您的账户存在已冻结的需求，无法发布新需求。请联系平台处理。');

      const expireAt = new Date();
      expireAt.setDate(expireAt.getDate() + expireDays);

      const demand = await safePrisma(() =>
        prisma.demand.create({
          data: {
            userId: ctx.userId,
            title,
            description,
            category,
            serviceType,
            minPrice,
            expireAt,
            ...(isCertifiedOnly ? { isCertifiedOnly: true } : {}),
            ...(cityCode ? { cityCode } : {}),
            ...(tagName ? { tagName } : {}),
          },
        }),
      );

      return ok(
        { id: demand.id, title: demand.title, status: demand.status },
        `需求"${title}"已发布！有效期至 ${expireAt.toLocaleDateString('zh-CN')}。当前为审核状态，通过后即可展示。`,
      );
    },
  });

  // 获取需求详情 (L1 — 自动执行)
  toolRegistry.register({
    definition: {
      name: 'get_demand_detail',
      description: '获取需求的详细信息，包括标题、描述、预算、状态、发布者、申请人数等。',
      parameters: {
        type: 'object',
        properties: {
          demandId: { type: 'string', description: '需求 ID' },
        },
        required: ['demandId'],
      },
    },
    category: 'demand',
    requiresConfirmation: false,
    handler: async (args, ctx) => {
      const demandId = args.demandId as string;
      const demand = await safePrisma(() =>
        prisma.demand.findUnique({
          where: { id: demandId },
          include: {
            user: { select: { nickname: true, certificationLevel: true } },
            _count: { select: { applications: true, orders: true } },
          },
        }),
      );
      if (!demand) return fail('需求不存在', '未找到该需求');

      return ok({
        id: demand.id,
        title: demand.title,
        description: demand.description,
        category: demand.category,
        serviceType: demand.serviceType,
        minPrice: Number(demand.minPrice),
        status: demand.status,
        cityCode: demand.cityCode,
        expireAt: demand.expireAt,
        isCertifiedOnly: demand.isCertifiedOnly,
        applicantCount: demand.applicantCount,
        publisher: demand.user.nickname,
        publisherCert: demand.user.certificationLevel,
      }, `需求「${demand.title}」¥${Number(demand.minPrice)}，状态：${demand.status}，${demand.applicantCount}人申请`);
    },
  });

  // 修改需求 (L2 — 需确认)
  toolRegistry.register({
    definition: {
      name: 'update_demand',
      description: '修改已发布但尚未成交的需求。可修改标题、描述、预算等字段。',
      parameters: {
        type: 'object',
        properties: {
          demandId: { type: 'string', description: '需求 ID' },
          title: { type: 'string', description: '新标题，2-100 字' },
          description: { type: 'string', description: '新描述，2-2000 字' },
          minPrice: { type: 'number', description: '新预算金额（元）' },
          expireDays: { type: 'number', description: '延期天数' },
        },
        required: ['demandId'],
      },
    },
    category: 'demand',
    requiresConfirmation: true,
    handler: async (args, ctx) => {
      const demandId = args.demandId as string;
      const demand = await safePrisma(() => prisma.demand.findUnique({ where: { id: demandId } }));
      if (!demand) return fail('需求不存在', '未找到该需求');
      if (demand.userId !== ctx.userId) return fail('无权限', '只有需求发布者可以修改');

      const updateData: Record<string, unknown> = {};
      if (args.title) {
        const t = String(args.title).trim();
        if (t.length < 2 || t.length > 100) return fail('标题长度不符', '标题需要 2-100 字');
        updateData.title = t;
      }
      if (args.description) {
        const d = String(args.description).trim();
        if (d.length < 2) return fail('描述太短', '描述至少需要 2 个字');
        updateData.description = d;
      }
      if (args.minPrice !== undefined) {
        const p = Number(args.minPrice);
        if (p < 1 || p > 999999) return fail('预算范围不符', '预算需要在 1-999,999 元之间');
        updateData.minPrice = p;
      }
      if (args.expireDays !== undefined) {
        const days = Number(args.expireDays);
        const newExpire = new Date();
        newExpire.setDate(newExpire.getDate() + days);
        updateData.expireAt = newExpire;
      }

      if (Object.keys(updateData).length === 0) return fail('没有需要修改的字段', '请指定需要修改的字段');

      const updated = await safePrisma(() =>
        prisma.demand.update({ where: { id: demandId }, data: updateData }),
      );

      return ok({ id: updated.id, title: updated.title }, `需求「${updated.title}」已更新`);
    },
  });

  // 撤回需求 (L3 — 需强确认)
  toolRegistry.register({
    definition: {
      name: 'withdraw_demand',
      description: '撤回（下架）已发布的需求。不可逆，已成交的不可撤回。如有押金会退回。操作前先向用户确认两遍。',
      parameters: {
        type: 'object',
        properties: {
          demandId: { type: 'string', description: '要撤回的需求 ID' },
        },
        required: ['demandId'],
      },
    },
    category: 'demand',
    requiresConfirmation: true,
    handler: async (args, ctx) => {
      const demandId = args.demandId as string;
      const demand = await safePrisma(() => prisma.demand.findUnique({
        where: { id: demandId },
        include: {
          depositRelations: {
            include: { deposit: true },
          },
        },
      }));
      if (!demand) return fail('需求不存在', '未找到该需求');
      if (demand.userId !== ctx.userId) return fail('无权限', '只有需求发布者可以撤回');
      if (demand.status === 'COMPLETED') return fail('无法撤回', '已完成的需求不可撤回');

      // 事务：更新状态 + 退回押金
      const operations: any[] = [
        prisma.demand.update({
          where: { id: demandId },
          data: { status: 'WITHDRAWN' },
        }),
      ];

      // 退回关联押金
      if (demand.deposit > 0 && demand.depositRelations.length > 0) {
        for (const dr of demand.depositRelations) {
          operations.push(
            prisma.deposit.update({
              where: { id: dr.depositId },
              data: { status: 'REFUNDED' },
            }),
          );
        }
      }

      await safePrisma(() => prisma.$transaction(operations));

      return ok(
        { id: demand.id, title: demand.title },
        `需求「${demand.title}」已撤回。${demand.deposit > 0 ? '押金已退回。' : ''}`,
      );
    },
  });

  // 我的需求列表 (L1 — 自动执行)
  toolRegistry.register({
    definition: {
      name: 'list_my_demands',
      description: '查看当前用户发布的所有需求列表。可按状态筛选。',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['PENDING', 'ACTIVE', 'FROZEN', 'IN_PROGRESS', 'COMPLETED', 'WITHDRAWN'],
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
      const limit = Math.min((args.limit as number) || 10, 20);

      const where: Record<string, unknown> = { userId: ctx.userId };
      if (status) where.status = status;

      const demands = await safePrisma(() =>
        prisma.demand.findMany({
          where,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, title: true, status: true, category: true,
            minPrice: true, applicantCount: true, createdAt: true,
          },
        }),
      );

      const list = demands.map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        category: d.category,
        price: Number(d.minPrice),
        applicants: d.applicantCount,
        createdAt: d.createdAt,
      }));

      if (list.length === 0) return ok([], '你还没有发布过需求');
      return ok(list, `共有 ${list.length} 个需求`);
    },
  });
}

// ─── 申请/接单相关工具 ───────────────────────────────────────────────────────

function registerApplicationTools(): void {
  // 申请接单 (Phase 1 / L2 — 需确认)
  toolRegistry.register({
    definition: {
      name: 'apply_for_demand',
      description: '申请接单（两段式接单 Phase 1）。向需求方表明承接意愿，消耗 1 个接单额度。',
      parameters: {
        type: 'object',
        properties: {
          demandId: { type: 'string', description: '要申请的需求 ID' },
          message: { type: 'string', description: '申请理由，向需求方介绍自己' },
        },
        required: ['demandId', 'message'],
      },
    },
    category: 'demand',
    requiresConfirmation: true,
    handler: async (args, ctx) => {
      const demandId = args.demandId as string;
      const message = String(args.message || '').trim();
      if (!message) return fail('申请理由为空', '请填写申请理由');

      const demand = await safePrisma(() =>
        prisma.demand.findUnique({
          where: { id: demandId },
          include: {
            user: { select: { nickname: true, certificationLevel: true } },
          },
        }),
      );
      if (!demand) return fail('需求不存在', '未找到该需求');
      if (demand.userId === ctx.userId) return fail('不能申请自己的需求', '不能申请自己发布的需求');
      if (demand.status !== 'ACTIVE' && demand.status !== 'PENDING') {
        return fail('需求状态不允许申请', '该需求当前不接受申请');
      }

      // 满员检查
      if (demand.applicantCount >= Math.min(demand.maxApplicants, 10)) {
        return fail('需求申请已满', '该需求的申请人已满');
      }

      // 仅认证检查
      if (demand.isCertifiedOnly) {
        const cp = await safePrisma(() =>
          prisma.certifiedProvider.findUnique({ where: { userId: ctx.userId } }),
        );
        if (!cp) return fail('需要认证', '该需求仅限认证服务者申请');
      }

      // 重复申请检查
      const existing = await safePrisma(() =>
        prisma.demandApplicantV2.findUnique({
          where: { demandId_userId: { demandId, userId: ctx.userId } },
        }),
      );
      if (existing) return fail('已申请过', '你已经申请过该需求了');

      // 事务：创建申请 + 递增人数（原子操作）
      const [applicant] = await safePrisma(() =>
        prisma.$transaction([
          prisma.demandApplicantV2.create({
            data: { demandId, userId: ctx.userId, message },
          }),
          prisma.demand.update({
            where: { id: demandId },
            data: { applicantCount: { increment: 1 } },
          }),
        ]),
      );

      return ok(
        { applicantId: applicant.id, demandTitle: demand.title },
        `已向「${demand.title}」提交申请，请等待需求方审核。`,
      );
    },
  });

  // 查看申请人列表 (L1 — 自动执行)
  toolRegistry.register({
    definition: {
      name: 'list_applicants',
      description: '查看某个需求的申请人列表（仅需求发布者可查看）。',
      parameters: {
        type: 'object',
        properties: {
          demandId: { type: 'string', description: '需求 ID' },
        },
        required: ['demandId'],
      },
    },
    category: 'demand',
    requiresConfirmation: false,
    handler: async (args, ctx) => {
      const demandId = args.demandId as string;

      const demand = await safePrisma(() =>
        prisma.demand.findUnique({ where: { id: demandId }, select: { userId: true, title: true } }),
      );
      if (!demand) return fail('需求不存在', '未找到该需求');
      if (demand.userId !== ctx.userId) return fail('无权限', '只有需求发布者可查看申请人列表');

      const applicants = await safePrisma(() =>
        prisma.demandApplicantV2.findMany({
          where: { demandId },
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { nickname: true, certificationLevel: true, creditScore: true, completedOrders: true } },
          },
        }),
      );

      const list = applicants.map((a) => ({
        id: a.id,
        userId: a.userId,
        nickname: a.user.nickname,
        certLevel: a.user.certificationLevel,
        creditScore: a.user.creditScore,
        completedOrders: a.user.completedOrders,
        message: a.message,
        status: a.status,
        createdAt: a.createdAt,
      }));

      if (list.length === 0) return ok([], '还没有人申请这个需求');
      return ok(list, `${demand.title} 共有 ${list.length} 位申请人`);
    },
  });

  // 接受申请人 (Phase 2 / L3 — 需确认)
  toolRegistry.register({
    definition: {
      name: 'accept_applicant',
      description: '接受某个申请人的接单请求（两段式接单 Phase 2）。接受后会自动创建订单并拒绝其他申请人。',
      parameters: {
        type: 'object',
        properties: {
          demandId: { type: 'string', description: '需求 ID' },
          applicantId: { type: 'string', description: '申请人 ID（从 list_applicants 获取）' },
        },
        required: ['demandId', 'applicantId'],
      },
    },
    category: 'demand',
    requiresConfirmation: true,
    handler: async (args, ctx) => {
      const demandId = args.demandId as string;
      const applicantId = args.applicantId as string;

      const demand = await safePrisma(() =>
        prisma.demand.findUnique({ where: { id: demandId }, select: { userId: true, title: true } }),
      );
      if (!demand) return fail('需求不存在', '未找到该需求');
      if (demand.userId !== ctx.userId) return fail('无权限', '只有需求发布者可接受申请人');

      const applicant = await safePrisma(() =>
        prisma.demandApplicantV2.findUnique({
          where: { id: applicantId },
          include: { user: { select: { nickname: true } } },
        }),
      );
      if (!applicant) return fail('申请人不存在', '未找到该申请');
      if (applicant.status !== 'PENDING') return fail('申请状态错误', '该申请已处理');

      // 事务：接受该申请人，拒绝其他，更新需求
      await safePrisma(() =>
        prisma.$transaction([
          prisma.demandApplicantV2.update({
            where: { id: applicantId },
            data: { status: 'ACCEPTED' },
          }),
          prisma.demandApplicantV2.updateMany({
            where: { demandId, status: { in: ['PENDING', 'COMMUNICATING'] }, id: { not: applicantId } },
            data: { status: 'REJECTED' },
          }),
          prisma.demand.update({
            where: { id: demandId },
            data: {
              acceptedProviderId: applicant.userId,
              status: 'IN_PROGRESS',
            },
          }),
        ]),
      );

      return ok(
        { demandTitle: demand.title, acceptedUser: applicant.user.nickname },
        `已接受 ${applicant.user.nickname} 的申请，拒绝其他申请人。`,
      );
    },
  });

  // 拒绝申请人 (L2 — 需确认)
  toolRegistry.register({
    definition: {
      name: 'reject_applicant',
      description: '拒绝某个申请人的接单请求。',
      parameters: {
        type: 'object',
        properties: {
          demandId: { type: 'string', description: '需求 ID' },
          applicantId: { type: 'string', description: '申请人 ID' },
        },
        required: ['demandId', 'applicantId'],
      },
    },
    category: 'demand',
    requiresConfirmation: true,
    handler: async (args, ctx) => {
      const demandId = args.demandId as string;
      const applicantId = args.applicantId as string;

      const demand = await safePrisma(() =>
        prisma.demand.findUnique({ where: { id: demandId }, select: { userId: true } }),
      );
      if (!demand) return fail('需求不存在', '未找到该需求');
      if (demand.userId !== ctx.userId) return fail('无权限', '只有需求发布者可拒绝申请');

      const applicant = await safePrisma(() =>
        prisma.demandApplicantV2.findUnique({
          where: { id: applicantId },
          include: { user: { select: { nickname: true } } },
        }),
      );
      if (!applicant) return fail('申请人不存在', '未找到该申请');

      await safePrisma(() =>
        prisma.demandApplicantV2.update({
          where: { id: applicantId },
          data: { status: 'REJECTED' },
        }),
      );

      return ok(
        { applicantId, nickname: applicant.user.nickname },
        `已拒绝 ${applicant.user.nickname} 的申请`,
      );
    },
  });

  // 我的申请 (L1 — 自动执行)
  toolRegistry.register({
    definition: {
      name: 'list_my_applications',
      description: '查看我提交的所有接单申请。',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: '返回数量，默认 10' },
        },
      },
    },
    category: 'demand',
    requiresConfirmation: false,
    handler: async (args, ctx) => {
      const limit = Math.min((args.limit as number) || 10, 20);

      const applications = await safePrisma(() =>
        prisma.demandApplicantV2.findMany({
          where: { userId: ctx.userId },
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            demand: { select: { title: true, category: true, minPrice: true, status: true } },
          },
        }),
      );

      const list = applications.map((a) => ({
        id: a.id,
        demandTitle: a.demand.title,
        category: a.demand.category,
        price: Number(a.demand.minPrice),
        demandStatus: a.demand.status,
        myStatus: a.status,
        createdAt: a.createdAt,
      }));

      if (list.length === 0) return ok([], '你还没有申请过任何需求');
      return ok(list, `共有 ${list.length} 条申请记录`);
    },
  });
}

// ─── 订单相关工具 ────────────────────────────────────────────────────────────

function registerOrderTools(): void {
  // 我的订单列表 (L1 — 自动执行)
  toolRegistry.register({
    definition: {
      name: 'list_my_orders',
      description: '查看当前用户的订单列表。可按角色（需求方/服务方）和状态筛选。',
      parameters: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: ['provider', 'requester'], description: '角色：provider=我是服务方，requester=我是需求方' },
          status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'WAITING_REVIEW', 'COMPLETED', 'CANCELLED', 'DISPUTED'], description: '订单状态筛选' },
          limit: { type: 'number', description: '返回数量，默认 10' },
        },
      },
    },
    category: 'order',
    requiresConfirmation: false,
    handler: async (args, ctx) => {
      const role = args.role as string | undefined;
      const status = args.status as string | undefined;
      const limit = Math.min((args.limit as number) || 10, 20);

      const where: Record<string, unknown> = {};
      if (role === 'provider') where.providerId = ctx.userId;
      else if (role === 'requester') where.requesterId = ctx.userId;
      else {
        where.OR = [
          { providerId: ctx.userId },
          { requesterId: ctx.userId },
        ];
      }
      if (status) where.status = status;

      const orders = await safePrisma(() =>
        prisma.order.findMany({
          where,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            demand: { select: { title: true } },
            provider: { select: { nickname: true } },
            requester: { select: { nickname: true } },
          },
        }),
      );

      const list = orders.map((o) => ({
        id: o.id,
        demandTitle: o.demand.title,
        price: Number(o.agreedPrice),
        status: o.status,
        provider: o.provider.nickname,
        requester: o.requester.nickname,
        createdAt: o.createdAt,
        paidAt: o.paidAt,
        completedAt: o.completedAt,
      }));

      if (list.length === 0) return ok([], '没有找到订单');
      return ok(list, `共有 ${list.length} 个订单`);
    },
  });
}

// ─── 用户相关工具 ────────────────────────────────────────────────────────────

function registerUserTools(): void {
  // 获取个人信息 (L1 — 自动执行)
  toolRegistry.register({
    definition: {
      name: 'get_user_profile',
      description: '获取当前用户的个人信息，包括昵称、信用分、认证等级、完成订单数等。',
      parameters: { type: 'object', properties: {} },
    },
    category: 'user',
    requiresConfirmation: false,
    handler: async (_args, ctx) => {
      const user = await safePrisma(() =>
        prisma.user.findUnique({
          where: { id: ctx.userId },
          select: {
            nickname: true, phone: true, certificationLevel: true,
            creditScore: true, snatchCredits: true, completedOrders: true,
            role: true, bio: true, isBusy: true,
            _count: { select: { demands: true } },
          },
        }),
      );

      if (!user) return fail('用户不存在', '无法获取用户信息');

      return ok(
        {
          nickname: user.nickname, phone: user.phone,
          certLevel: user.certificationLevel, creditScore: user.creditScore,
          snatchCredits: user.snatchCredits, completedOrders: user.completedOrders,
          role: user.role, bio: user.bio, isBusy: user.isBusy,
          demandCount: user._count.demands,
        },
        `用户 ${user.nickname}：${user.certificationLevel}，信用分 ${user.creditScore}，已完成 ${user.completedOrders} 单，抢单次数 ${user.snatchCredits}`,
      );
    },
  });

  // 搜索用户 (L1 — 自动执行)
  toolRegistry.register({
    definition: {
      name: 'search_users',
      description: '搜索平台上的其他用户，可按昵称关键词搜索。',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '用户昵称关键词' },
          limit: { type: 'number', description: '返回数量，默认 10' },
        },
        required: ['keyword'],
      },
    },
    category: 'user',
    requiresConfirmation: false,
    handler: async (args, _ctx) => {
      const keyword = String(args.keyword || '').trim();
      const limit = Math.min((args.limit as number) || 10, 20);
      if (!keyword) return fail('关键词为空', '请输入要搜索的用户昵称');

      const users = await safePrisma(() =>
        prisma.user.findMany({
          where: { nickname: { contains: keyword } },
          take: limit,
          select: {
            id: true, nickname: true, certificationLevel: true,
            avatarUrl: true, completedOrders: true,
          },
        }),
      );

      const list = users.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        certLevel: u.certificationLevel,
        avatarUrl: u.avatarUrl,
        completedOrders: u.completedOrders,
      }));

      if (list.length === 0) return ok([], `没有找到匹配「${keyword}」的用户`);
      return ok(list, `找到 ${list.length} 位用户`);
    },
  });
}

// ─── 知识库工具 ──────────────────────────────────────────────────────────────

function registerKnowledgeTools(): void {
  toolRegistry.register({
    definition: {
      name: 'read_knowledge',
      description: '查询九木平台的知识库/帮助文档。当用户问"怎么操作""是什么意思""有什么功能"时使用。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '要查询的内容关键词，如"发布需求""认证""卡池"等' },
        },
        required: ['query'],
      },
    },
    category: 'system',
    requiresConfirmation: false,
    handler: async (args, _ctx) => {
      const query = String(args.query || '').trim();
      if (!query) return fail('查询条件为空', '请提供要查询的内容');

      const result = searchKnowledge(query);
      if (!result) return ok('', `没有找到关于「${query}」的知识内容`);

      return ok(result, `已找到关于「${query}」的知识内容`);
    },
  });

}

// ─── 导航工具 ──────────────────────────────────────────────────────────────────

const KNOWN_ROUTES: Record<string, { path: string; title: string }> = {
  首页:       { path: '/discover', title: '发现页' },
  发现页:     { path: '/discover', title: '发现页' },
  发布需求:   { path: '/demands/create', title: '发布需求' },
  我的需求:   { path: '/my-demands', title: '我的需求' },
  订单:       { path: '/orders', title: '订单' },
  设置:       { path: '/settings', title: '设置' },
  帮助:       { path: '/help', title: '帮助文档' },
  帮助文档:   { path: '/help', title: '帮助文档' },
  消息:       { path: '/messages', title: '消息' },
  卡池:       { path: '/card-pool', title: '卡池' },
  死池:       { path: '/card-pool/dead', title: '死池' },
  认证:       { path: '/cert-center', title: '认证中心' },
  认证中心:   { path: '/cert-center', title: '认证中心' },
  圈子:       { path: '/circles', title: '圈子' },
  福利中心:   { path: '/welfare', title: '公益中心' },
  公益中心:   { path: '/welfare', title: '公益中心' },
  标签统计:   { path: '/tag-stats', title: '市场分析' },
  市场分析:   { path: '/tag-stats', title: '市场分析' },
  交易记录:   { path: '/transactions', title: '交易记录' },
  找人:       { path: '/search', title: '找人' },
  个人主页:   { path: '/profile', title: '个人主页' },
  AI助手:     { path: '/agent', title: 'AI 助手' },
  后台管理:   { path: '/dashboard', title: '后台管理' },
}

function registerNavigateTool() {
  toolRegistry.register({
    definition: {
      name: 'navigate_to',
      description: `跳转到指定页面。当用户说"去XX""跳转XX""打开XX""帮我打开XX"等意图时调用此工具。

已知页面: ${Object.keys(KNOWN_ROUTES).join('、')}`,
      parameters: {
        type: 'object',
        properties: {
          page: { type: 'string', description: `目标页面名称，必须是已知页面之一` },
        },
        required: ['page'],
      },
    },
    category: 'system',
    requiresConfirmation: false,
    handler: async (args) => {
      const page = String(args.page || '').trim()
      const route = KNOWN_ROUTES[page]
      if (!route) return fail('未知页面', `未知页面"${page}"，已知页面: ${Object.keys(KNOWN_ROUTES).join('、')}`)
      return ok(route, `正在前往${route.title}`)
    },
  })
}

// ─── 注册所有工具 ────────────────────────────────────────────────────────────

export function registerNinewoodTools(): void {
  registerDemandTools();
  registerApplicationTools();
  registerOrderTools();
  registerUserTools();
  registerKnowledgeTools();
  registerNavigateTool();
}
