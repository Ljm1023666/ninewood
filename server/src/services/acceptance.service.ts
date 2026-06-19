/**
 * M3：效果导向验收 — 确认/拒付状态机
 */

import { prisma } from '../lib/prisma.js'
import { walletService } from './wallet.service.js'
import { closeAllCommForDemand } from './comm.service.js'

export const acceptanceService = {
  /** 需求方确认验收 → 结算并完成订单 */
  async confirmAcceptance(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { demand: true },
    })
    if (!order) throw Object.assign(new Error('订单不存在'), { status: 404 })
    if (order.requesterId !== userId) {
      throw Object.assign(new Error('仅需求方可确认验收'), { status: 403 })
    }
    if (order.status !== 'WAITING_REVIEW') {
      throw Object.assign(new Error('订单状态不允许确认'), { status: 400 })
    }

    const finalPrice = Number(order.agreedPrice)
    const isWelfare = order.demand.isPublicWelfare

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
      await tx.user.update({
        where: { id: order.providerId },
        data: { completedOrders: { increment: 1 } },
      })
      await closeAllCommForDemand(order.demandId, 'REJECTED', tx)
    })

    await walletService.settleDemand(order.demandId, finalPrice, { isWelfare })

    await prisma.message.create({
      data: {
        fromUserId: userId,
        toUserId: order.providerId,
        orderId,
        content: `订单已完成验收，${finalPrice} 点已结算给服务方`,
        type: 'SYSTEM',
      },
    })

    return { message: '验收通过，结算完成' }
  },

  /** 需求方拒付并举证 */
  async rejectWithComplaint(
    orderId: string,
    userId: string,
    reason: string,
    evidenceUrls?: string[],
  ) {
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) throw Object.assign(new Error('订单不存在'), { status: 404 })
    if (order.requesterId !== userId) {
      throw Object.assign(new Error('仅需求方可拒付'), { status: 403 })
    }
    if (order.status !== 'WAITING_REVIEW') {
      throw Object.assign(new Error('订单状态不允许拒付'), { status: 400 })
    }
    if (!reason.trim()) {
      throw Object.assign(new Error('拒付须填写原因'), { status: 400 })
    }

    const evidence = (evidenceUrls ?? []).map((u) => u.trim()).filter(Boolean)

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'DISPUTED' },
      })
      await tx.complaint.create({
        data: {
          fromUserId: userId,
          toUserId: order.providerId,
          demandId: order.demandId,
          reason: reason.trim(),
          evidenceUrls: evidence,
        },
      })
    })

    await prisma.message.create({
      data: {
        fromUserId: userId,
        toUserId: order.providerId,
        orderId,
        content: '需求方已发起拒付争议，等待平台处理',
        type: 'SYSTEM',
      },
    })

    return { message: '拒付已提交，进入争议处理' }
  },

  /** 系统自动验收（超时无操作） */
  async autoCompleteAcceptance(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { demand: true },
    })
    if (!order) return { skipped: true, reason: 'not_found' }
    if (order.status !== 'WAITING_REVIEW') {
      return { skipped: true, reason: 'wrong_status' }
    }

    const finalPrice = Number(order.agreedPrice)
    const isWelfare = order.demand.isPublicWelfare

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
      await tx.user.update({
        where: { id: order.providerId },
        data: { completedOrders: { increment: 1 } },
      })
      await closeAllCommForDemand(order.demandId, 'REJECTED', tx)
    })

    await walletService.settleDemand(order.demandId, finalPrice, { isWelfare })

    await prisma.message.create({
      data: {
        fromUserId: order.requesterId,
        toUserId: order.providerId,
        orderId,
        content: `验收超时已自动完成，${finalPrice} 点已结算给服务方`,
        type: 'SYSTEM',
      },
    })

    return { message: '超时自动验收完成' }
  },

  /**
   * 投诉裁决（平台/管理员）
   * UPHELD：支持需求方 → 退还托管、订单 REFUNDED
   * DISMISSED：驳回需求方 → 正常结算完成
   */
  async resolveComplaint(
    complaintId: string,
    verdict: 'UPHELD' | 'DISMISSED',
  ) {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    })
    if (!complaint) throw Object.assign(new Error('投诉不存在'), { status: 404 })
    if (complaint.status !== 'PENDING') {
      throw Object.assign(new Error('投诉已处理'), { status: 400 })
    }

    const order = await prisma.order.findFirst({
      where: { demandId: complaint.demandId, status: 'DISPUTED' },
      include: { demand: true },
    })
    if (!order) throw Object.assign(new Error('无争议订单'), { status: 400 })

    if (verdict === 'UPHELD') {
      await prisma.$transaction(async (tx) => {
        await tx.complaint.update({
          where: { id: complaintId },
          data: { status: 'UPHELD' },
        })
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'REFUNDED' },
        })
      })
      await walletService.releaseHold(order.demandId, 'COMPLETED')
      await prisma.message.create({
        data: {
          fromUserId: complaint.toUserId,
          toUserId: complaint.fromUserId,
          orderId: order.id,
          content: '争议成立：托管点数已退还需求方',
          type: 'SYSTEM',
        },
      })
      return { message: '投诉成立，已退款' }
    }

    await prisma.complaint.update({
      where: { id: complaintId },
      data: { status: 'DISMISSED' },
    })
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'WAITING_REVIEW' },
    })
    await acceptanceService.confirmAcceptance(order.id, order.requesterId)
    await prisma.message.create({
      data: {
        fromUserId: complaint.toUserId,
        toUserId: complaint.fromUserId,
        orderId: order.id,
        content: '争议驳回：订单已正常结算',
        type: 'SYSTEM',
      },
    })
    return { message: '投诉驳回，已结算' }
  },
}
