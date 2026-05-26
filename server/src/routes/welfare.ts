import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { z } from 'zod'
import { success, fail } from '../utils/response.js'
import { prisma } from '../lib/prisma.js'
import { welfareRewardService } from '../services/welfare-reward.js'
import { transactionService } from '../services/transaction.service.js'

export const welfareRouter = Router()

// POST /api/welfare/demands — 发布公益需求
welfareRouter.post('/demands', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, description, expectedOutcome, minPrice, regionId } = req.body
    if (!title || !description || !expectedOutcome || !minPrice) {
      return fail(res, '缺少必填字段', 400)
    }

    // 公益需求: 15 天窗口
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
        category: '公益',
        serviceType: 'OFFLINE',
        expireAt: new Date(Date.now() + win * 60000),
        visibilityWindow: win,
        visibleUntil,
        isPublicWelfare: true,
        maxApplicants: 9999,
        status: 'ACTIVE',
      },
    })

    // 确保公益圈存在
    const circleName = `公益需求圈-${regionId || '全国'}`
    let circle = await prisma.circle.findFirst({
      where: { name: circleName },
    })
    if (!circle) {
      circle = await prisma.circle.create({
        data: {
          name: circleName,
          type: 'PUBLIC',
          ownerId: req.user!.userId,
          cityCode: regionId ? String(regionId) : undefined,
        },
      })
    }

    // 关联需求到公益圈
    await prisma.circleDemand.create({
      data: {
        circleId: circle.id,
        demandId: demand.id,
      },
    })

    success(res, { demand, circle }, '公益需求已发布', 201)
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

// GET /api/welfare/rewards — 我的公益奖励历史
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

// POST /api/welfare/claim — 认领公益需求（先到先得 + 5 分钟确认窗口）
welfareRouter.post('/claim/:demandId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const demand = await prisma.demand.findUnique({
      where: { id: req.params.demandId },
    })
    if (!demand) return fail(res, '需求不存在', 404)
    if (!demand.isPublicWelfare) return fail(res, '非公益需求', 400)
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

    // 创建认领记录（自动设为 COMMUNICATING，5 分钟确认窗口）
    const applicant = await prisma.demandApplicantV2.create({
      data: {
        demandId: demand.id,
        userId: req.user!.userId,
        message: '公益认领',
        status: 'COMMUNICATING',
        commStartAt: new Date(),
        commDeadline: new Date(Date.now() + 5 * 60000),
      },
    })

    success(res, applicant, '已认领，请在 5 分钟内与发布者确认', 201)
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

// POST /api/welfare/complete — 完成公益需求
welfareRouter.post('/complete/:demandId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const demand = await prisma.demand.findUnique({
      where: { id: req.params.demandId },
    })
    if (!demand) return fail(res, '需求不存在', 404)
    if (demand.userId !== req.user!.userId) return fail(res, '无权操作', 403)

    const finalPrice = Number(req.body.finalPrice || demand.minPrice)
    const regionId = demand.regionId || 0

    // 创建结算记录
    const settlement = await transactionService.createWelfareSettlement(demand.id, finalPrice)

    // 抽成划入公益资金池
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

    // 随机奖励
    const provider = await prisma.demandApplicantV2.findFirst({
      where: { demandId: demand.id, status: 'ACCEPTED' },
    })
    let reward: { type: 'monetary' | 'spiritual'; amount: number; badge: string | null } | null = null
    if (provider) {
      reward = await welfareRewardService.grantReward(demand.id, provider.userId, regionId)
    }

    success(res, { settlement, reward, finalPrice }, '公益需求已完成')
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})
