/**
 * 点数钱包 API — 余额与流水
 */
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.js'
import { walletService } from '../services/wallet.service.js'
import { success, fail } from '../utils/response.js'

export const walletRouter = Router()

const ledgerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// GET /api/wallet/balance — 余额概览
walletRouter.get('/balance', authMiddleware, async (req: Request, res: Response) => {
  try {
    const summary = await walletService.getSummary(req.user!.userId)
    success(res, summary)
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500)
  }
})

// GET /api/wallet/ledger — 点数流水
walletRouter.get('/ledger', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { page, limit } = ledgerQuerySchema.parse(req.query)
    const result = await walletService.getLedger(req.user!.userId, page, limit)
    success(res, result)
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors)
    fail(res, e.message || '服务器错误', e.status || 500)
  }
})
