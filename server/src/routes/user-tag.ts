import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { z } from 'zod'
import { success, fail } from '../utils/response.js'
import { prisma } from '../lib/prisma.js'

export const userTagRouter = Router()

// GET /api/user-tags
userTagRouter.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tags = await prisma.userTag.findMany({
      where: { userId: req.user!.userId },
      orderBy: { updatedAt: 'desc' },
    })
    success(res, {
      tags,
      activeCount: tags.filter((t) => t.status === 'IDLE').length,
      busyCount: tags.filter((t) => t.status === 'BUSY').length,
    })
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

const openSchema = z.object({
  regionId: z.number().optional(),
  metadata: z.any().optional(),
})

// POST /api/user-tags/:tagName — 打开标签（创建 UserTag 记录）
userTagRouter.post('/:tagName', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tagName = req.params.tagName
    const { regionId, metadata } = openSchema.parse(req.body)

    const existing = await prisma.userTag.findUnique({
      where: { userId_tagName: { userId: req.user!.userId, tagName } },
    })

    let tag
    if (existing) {
      tag = await prisma.userTag.update({
        where: { userId_tagName: { userId: req.user!.userId, tagName } },
        data: { status: 'IDLE', regionId, metadata },
      })
    } else {
      tag = await prisma.userTag.create({
        data: {
          userId: req.user!.userId,
          tagName,
          regionId,
          metadata,
        },
      })
    }
    success(res, tag, '标签已开启')
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数错误', 400, e.errors)
    fail(res, e.message || 'server error', 500)
  }
})

// DELETE /api/user-tags/:tagName — 关闭标签 → HIDDEN
userTagRouter.delete('/:tagName', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tagName = req.params.tagName
    await prisma.userTag.update({
      where: { userId_tagName: { userId: req.user!.userId, tagName } },
      data: { status: 'HIDDEN' },
    })
    success(res, null, '标签已关闭')
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

// POST /api/user-tags/:tagName/toggle — 切换标签 (IDLE ↔ HIDDEN)
userTagRouter.post('/:tagName/toggle', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tagName = req.params.tagName
    const existing = await prisma.userTag.findUnique({
      where: { userId_tagName: { userId: req.user!.userId, tagName } },
    })

    let tag
    if (existing) {
      const newStatus = existing.status === 'IDLE' ? 'HIDDEN' : 'IDLE'
      tag = await prisma.userTag.update({
        where: { userId_tagName: { userId: req.user!.userId, tagName } },
        data: { status: newStatus },
      })
    } else {
      tag = await prisma.userTag.create({
        data: { userId: req.user!.userId, tagName },
      })
    }
    success(res, tag, tag.status === 'IDLE' ? '标签已激活' : '标签已隐藏')
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

// POST /api/user-tags/:tagName/order-start — 标记开始服务
userTagRouter.post('/:tagName/order-start', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tagName = req.params.tagName
    const existing = await prisma.userTag.findUnique({
      where: { userId_tagName: { userId: req.user!.userId, tagName } },
    })
    if (!existing) {
      await prisma.userTag.create({
        data: { userId: req.user!.userId, tagName, status: 'BUSY' },
      })
    } else {
      await prisma.userTag.update({
        where: { userId_tagName: { userId: req.user!.userId, tagName } },
        data: { status: 'BUSY' },
      })
    }
    success(res, null, '已标记为忙碌')
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

// POST /api/user-tags/:tagName/order-finish — 标记完成服务
userTagRouter.post('/:tagName/order-finish', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tagName = req.params.tagName
    await prisma.userTag.update({
      where: { userId_tagName: { userId: req.user!.userId, tagName } },
      data: { status: 'IDLE' },
    })
    success(res, null, '已恢复空闲')
  } catch (e: any) {
    fail(res, e.message || 'server error', 500)
  }
})

// Stage 1.1: 设置 autoReceive 的 PATCH 接口
const autoReceiveSchema = z.object({
  autoReceive: z.boolean(),
})

// PATCH /api/user-tags/:tagName/auto-receive
// 开启/关闭某个标签的自动接收。身份校验全后端推导：
//   1) UserTag.certified=true；或者
//   2) 上述为 null/false 时退而次之检查 User.certificationLevel !== NONE
userTagRouter.patch('/:tagName/auto-receive', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { autoReceive } = autoReceiveSchema.parse(req.body)
    const userId = req.user!.userId
    const tagName = req.params.tagName

    const tag = await prisma.userTag.findUnique({
      where: { userId_tagName: { userId, tagName } },
    })
    if (!tag) {
      return fail(res, '该标签未开启，请先 POST /api/user-tags/:tagName', 404)
    }

    // 身份校验：优先 UserTag.certified，笺中 User.certificationLevel
    let eligible = tag.certified
    if (!eligible) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { certificationLevel: true },
      })
      eligible = user?.certificationLevel !== undefined && user.certificationLevel !== 'NONE'
    }
    if (!eligible) {
      return fail(res, '该用户未认证，不可开启 autoReceive', 403, { code: 'NOT_CERTIFIED' })
    }

    const updated = await prisma.userTag.update({
      where: { userId_tagName: { userId, tagName } },
      data: { autoReceive },
    })
    success(res, updated, autoReceive ? '已开启自动接收' : '已关闭自动接收')
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数错误', 400, e.errors)
    fail(res, e.message || 'server error', 500)
  }
})
