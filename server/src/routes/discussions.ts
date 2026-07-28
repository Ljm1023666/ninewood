import { Router, Request, Response } from 'express'
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js'
import { success, fail } from '../utils/response.js'
import { q } from '../utils/query.js'
import { discussionsService } from '../services/discussions.service.js'

export const discussionsRouter = Router()

/** GET /api/discussions — 圈子公告聚合为「热门讨论」 */
discussionsRouter.get('/', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(q(req.query.page) || '1', 10) || 1
    const pageSize = parseInt(q(req.query.pageSize) || '20', 10) || 20
    const data = await discussionsService.listTopics(req.user?.userId, page, pageSize)
    success(res, data)
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500)
  }
})

/** GET /api/discussions/publish-targets — 当前用户可发公告的圈子 */
discussionsRouter.get('/publish-targets', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = await discussionsService.listPublishTargets(req.user!.userId)
    success(res, data)
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500)
  }
})
