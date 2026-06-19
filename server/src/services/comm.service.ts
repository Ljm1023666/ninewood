/**
 * M1：两段式接单 — 5 分钟沟通窗口
 * 双方各发一条消息后起算；可延长；完成/接单后切断
 */

import { prisma } from '../lib/prisma.js'
import type { Prisma } from '@prisma/client'

const COMM_MINUTES = 5

type Tx = Prisma.TransactionClient

/** 私信发送后尝试启动沟通倒计时（匹配发布者↔申请者） */
export async function tryStartCommWindow(fromUserId: string, toUserId: string) {
  const applicants = await prisma.demandApplicantV2.findMany({
    where: {
      userId: { in: [fromUserId, toUserId] },
      status: { in: ['PENDING', 'COMMUNICATING'] },
    },
    include: { demand: { select: { id: true, userId: true } } },
  })

  for (const applicant of applicants) {
    const publisherId = applicant.demand.userId
    const applicantUserId = applicant.userId
    const isPair =
      (fromUserId === publisherId && toUserId === applicantUserId) ||
      (fromUserId === applicantUserId && toUserId === publisherId)
    if (!isPair) continue

    if (applicant.status === 'COMMUNICATING' && applicant.commStartAt) {
      return applicant
    }

    const since = applicant.createdAt
    const [aToP, pToA] = await Promise.all([
      prisma.message.count({
        where: {
          fromUserId: applicantUserId,
          toUserId: publisherId,
          createdAt: { gte: since },
        },
      }),
      prisma.message.count({
        where: {
          fromUserId: publisherId,
          toUserId: applicantUserId,
          createdAt: { gte: since },
        },
      }),
    ])
    if (aToP < 1 || pToA < 1) continue

    const now = new Date()
    const deadline = new Date(now.getTime() + COMM_MINUTES * 60_000)
    return prisma.demandApplicantV2.update({
      where: { id: applicant.id },
      data: {
        status: 'COMMUNICATING',
        commStartAt: now,
        commDeadline: deadline,
      },
    })
  }
  return null
}

export async function extendComm(
  demandId: string,
  applicantId: string,
  userId: string,
  minutes: number,
) {
  const demand = await prisma.demand.findUnique({ where: { id: demandId } })
  if (!demand) throw Object.assign(new Error('需求不存在'), { status: 404 })

  const applicant = await prisma.demandApplicantV2.findUnique({
    where: { id: applicantId },
  })
  if (!applicant || applicant.demandId !== demandId) {
    throw Object.assign(new Error('申请不存在'), { status: 404 })
  }

  const isParty =
    userId === demand.userId || userId === applicant.userId
  if (!isParty) throw Object.assign(new Error('无权操作'), { status: 403 })

  if (applicant.status !== 'COMMUNICATING' || !applicant.commDeadline) {
    throw Object.assign(new Error('沟通尚未开始或已结束'), { status: 400 })
  }

  const addMs = minutes * 60_000
  const newDeadline = new Date(applicant.commDeadline.getTime() + addMs)
  return prisma.demandApplicantV2.update({
    where: { id: applicantId },
    data: {
      extensionMinutes: { increment: minutes },
      commDeadline: newDeadline,
    },
  })
}

/** 切断该需求下所有进行中的沟通（正式接单 / 完成） */
export async function closeAllCommForDemand(
  demandId: string,
  finalStatus: 'REJECTED' | 'WITHDRAWN' | 'TIMED_OUT' = 'REJECTED',
  tx?: Tx,
) {
  const db = tx ?? prisma
  await db.demandApplicantV2.updateMany({
    where: {
      demandId,
      status: { in: ['PENDING', 'COMMUNICATING'] },
    },
    data: { status: finalStatus },
  })
}

export function canViewDemand(
  demand: {
    userId: string
    status: string
    acceptedProviderId: string | null
    isPublic: boolean
  },
  viewerId?: string | null,
): boolean {
  if (!viewerId) {
    return demand.status !== 'IN_PROGRESS' && demand.isPublic
  }
  if (demand.userId === viewerId) return true
  if (
    demand.status === 'IN_PROGRESS' &&
    demand.acceptedProviderId === viewerId
  ) {
    return true
  }
  if (demand.status === 'IN_PROGRESS') return false
  return demand.isPublic
}
