import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { z } from 'zod'
import { success, fail } from '../utils/response.js'
import { prisma } from '../lib/prisma.js'
import { welfareRewardService } from '../services/welfare-reward.js'
import { transactionService } from '../services/transaction.service.js'

export const welfareRouter = Router()

// POST /api/welfare/demands — 发布激励任务（内测占位：原"公益需求"）
welfareRouter.post('/demands', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, description, expectedOutcome, minPrice, regionId } = req.body
    if (!title || !description || !expectedOutcome || !minPrice) {
      return fail(res, '缺少必填字段', 400)
    }

    // 激励任务（内测占位）：15 天窗口
    const win = 15 * 24 * 60 // 15 days in minutes
    const visibleUntil = new Date(Date.now() + win * 60000)

    const demand = await prisma.demand.create({
      data: {
        userId: req.user!.userId,
        title,
        description,
        expectedOutcome,
        minPrice,
        regionId: regionId || null,
        category: '激励',
        serviceType: 'OFFLINE',
        expireAt: new Date(Date.now() + win * 60000),
        visibilityWindow: win,
        visibleUntil,
        isPublicWelfare: true,
        maxApplicants: 9999,
        status: 'ACTIVE',
      },
    })

    // 内测 v0.2：删除自动建圈 + CircleDemand 关联
    // 原因：(1) PUBLIC 圈对外可见，不适合内测；(2) 业务价值低；(3) 私人圈已能覆盖后续场景
    // 数据迁移：见 prisma/migrations/20260624_drop_welfare_circles/

    success(res, { demand }, '激励任务已发布（内测）', 201)
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

// GET /api/welfare/demands — 列出可认领的激励任务
welfareRouter.get('/demands', async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = 20
    const where: any = { isPublicWelfare: true, status: 'ACTIVE' }
    const [demands, total] = await Promise.all([
      prisma.demand.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.demand.count({ where }),
    ])
    success(res, {
      items: demands.map((d: any) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        expectedOutcome: d.expectedOutcome,
        minPrice: Number(d.minPrice),
        regionId: d.regionId,
        user: d.user,
        createdAt: d.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

// GET /api/welfare/rewards — 我的激励记录（模拟）
welfareRouter.get('/rewards', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const result = await welfareRewardService.getUserRewards(req.user!.userId, page)
    success(res, result)
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

// GET /api/welfare/fund-pool/:regionId
welfareRouter.get('/fund-pool/:regionId', async (req: Request, res: Response) => {
  try {
    const regionId = Number(req.params.regionId)
    let pool = await prisma.welfareFundPool.findUnique({ where: { regionId } })
    if (!pool) {
      pool = await prisma.welfareFundPool.create({
        data: { regionId, balance: 0 },
      })
    }
    success(res, pool)
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

// POST /api/welfare/claim — 认领激励任务（先到先得 → PENDING，comm 双消息起算）
welfareRouter.post('/claim/:demandId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const demand = await prisma.demand.findUnique({
      where: { id: req.params.demandId },
    })
    if (!demand) return fail(res, '需求不存在', 404)
    if (!demand.isPublicWelfare) return fail(res, '非激励任务', 400)
    if (demand.status !== 'ACTIVE') return fail(res, '需求已过期', 400)

    // 先到先得: 检查是否已被认领
    const existing = await prisma.demandApplicantV2.findFirst({
      where: {
        demandId: demand.id,
        status: { in: ['PENDING', 'COMMUNICATING'] },
      },
    })
    if (existing) {
      return fail(res, '已有其他人正在确认，请稍后再试', 409)
    }

    // 创建认领记录（PENDING；双消息起算由 comm.service.tryStartCommWindow 触发）
    const applicant = await prisma.demandApplicantV2.create({
      data: {
        demandId: demand.id,
        userId: req.user!.userId,
        message: '激励认领（内测）',
        status: 'PENDING',
      },
    })

    success(res, applicant, '已认领，请与发布者沟通（双方互发消息后开始 5 分钟计时）', 201)
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

// POST /api/welfare/complete — 完成激励任务（内测占位）
welfareRouter.post('/complete/:demandId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const demand = await prisma.demand.findUnique({
      where: { id: req.params.demandId },
    })
    if (!demand) return fail(res, '需求不存在', 404)
    if (demand.userId !== req.user!.userId) return fail(res, '无权操作', 403)

    // Stage 1.2: 可选 rewardMode(随机 | 选奖)
    const rewardMode = req.body.rewardMode === 'choice' ? 'choice' : 'random'
    const choiceLabel = typeof req.body.choiceLabel === 'string' ? req.body.choiceLabel : undefined
    if (rewardMode === 'choice' && !choiceLabel) {
      return fail(res, '选奖模式必须提供 choiceLabel', 400)
    }

    const finalPrice = Number(req.body.finalPrice || demand.minPrice)
    const regionId = demand.regionId || 0

    // 创建结算记录
    const settlement = await transactionService.createWelfareSettlement(demand.id, finalPrice)

    // 抽成划入激励池（沿用 WelfareFundPool 实体；前端标注"模拟"）
    await prisma.welfareFundPool.upsert({
      where: { regionId },
      update: {
        balance: { increment: settlement.serviceFee },
        totalInflow: { increment: settlement.serviceFee },
      },
      create: {
        regionId,
        balance: settlement.serviceFee,
        totalInflow: settlement.serviceFee,
      },
    })

    // 更新需求状态
    await prisma.demand.update({
      where: { id: demand.id },
      data: { status: 'COMPLETED' },
    })

    // 随机奖励（模拟）
    const provider = await prisma.demandApplicantV2.findFirst({
      where: { demandId: demand.id, status: 'ACCEPTED' },
    })
    let reward: { type: 'monetary' | 'spiritual' | 'choice'; amount: number; badge: string | null } | null = null
    if (provider) {
      reward = await welfareRewardService.grantReward(demand.id, provider.userId, regionId, {
        mode: rewardMode,
        choiceLabel,
      })
    }

    success(res, { settlement, reward, finalPrice }, '激励任务已完成（内测模拟数据）')
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})
