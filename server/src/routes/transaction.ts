/**
 * AI 2.8 交易路由 — 结算明细 + 交易历史
 */
import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { transactionService } from '../services/transaction.service.js'
import { success, fail } from '../utils/response.js'

export const transactionRouter = Router()

// GET /api/transactions/:demandId/breakdown — 结算明细
transactionRouter.get('/:demandId/breakdown', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await transactionService.getByDemand(req.params.demandId)
    success(res, result)
  } catch (e: any) {
    fail(res, e.message || 'server error', e.status || 500)
  }
})

// GET /api/transactions/history — 交易历史
transactionRouter.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const result = await transactionService.getHistory(req.user!.userId, page, limit)
    success(res, result)
  } catch (e: any) {
    fail(res, e.message || 'server error', e.status || 500)
  }
})
