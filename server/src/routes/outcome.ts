import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'
import { recordOutcomeEvent } from '../services/outcome-event.service.js'
import { fail, success } from '../utils/response.js'

export const outcomeRouter = Router()

const activeSchema = z.object({
  resourceType: z.enum(['ORDER', 'LOOP_RUN', 'DEMAND', 'AGENT_TASK']),
  resourceId: z.string().uuid(),
  activeMs: z.number().int().min(1).max(30 * 60 * 1000),
})

async function ownsResource(userId: string, resourceType: z.infer<typeof activeSchema>['resourceType'], resourceId: string) {
  if (resourceType === 'ORDER') {
    return Boolean(await prisma.order.findFirst({ where: { id: resourceId, OR: [{ requesterId: userId }, { providerId: userId }] }, select: { id: true } }))
  }
  if (resourceType === 'LOOP_RUN') {
    return Boolean(await prisma.loopRun.findFirst({ where: { id: resourceId, initiatorRef: `user:${userId}` }, select: { id: true } }))
  }
  if (resourceType === 'DEMAND') {
    return Boolean(await prisma.demand.findFirst({ where: { id: resourceId, userId }, select: { id: true } }))
  }
  return Boolean(await prisma.agentTask.findFirst({ where: { id: resourceId, userId }, select: { id: true } }))
}

outcomeRouter.post('/active-time', authMiddleware, async (req, res) => {
  const parsed = activeSchema.safeParse(req.body)
  if (!parsed.success) return fail(res, '活跃时间数据无效', 400, { code: 'OUTCOME_ACTIVE_TIME_INVALID' })
  const userId = req.user!.userId
  if (!(await ownsResource(userId, parsed.data.resourceType, parsed.data.resourceId))) {
    return fail(res, '无权记录该任务', 403)
  }
  await recordOutcomeEvent({
    userId,
    correlationId: `${parsed.data.resourceType}:${parsed.data.resourceId}`,
    resourceType: parsed.data.resourceType,
    resourceId: parsed.data.resourceId,
    eventType: 'ACTIVE_TIME',
    activeMs: parsed.data.activeMs,
  })
  success(res, { accepted: true })
})
