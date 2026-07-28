import type { Request, Response, NextFunction } from 'express'
import { createHash, randomUUID } from 'crypto'
import { prisma } from '../lib/prisma.js'

const DEFAULT_LEASE_MS = 30_000
const KEY_MIN = 8
const KEY_MAX = 128

export type IdempotencyScope =
  | 'ORDER_PREPAY'
  | 'ORDER_CANCEL'
  | 'ORDER_CONFIRM'
  | 'ORDER_PARTIAL_ACCEPT'
  | 'ORDER_DISPUTE_REFUND'
  | 'ORDER_DISPUTE_COMPLETE'

function isProd() {
  return process.env.NODE_ENV === 'production'
}

function idempotencyRequired() {
  if (process.env.IDEMPOTENCY_REQUIRED === '0') return false
  if (process.env.IDEMPOTENCY_REQUIRED === '1') return true
  return isProd()
}

function leaseMs() {
  const n = Number(process.env.IDEMPOTENCY_LEASE_MS || DEFAULT_LEASE_MS)
  return Number.isFinite(n) && n >= 5_000 ? n : DEFAULT_LEASE_MS
}

function headerKey(req: Request): string | undefined {
  const raw = req.headers['idempotency-key']
  if (typeof raw !== 'string') return undefined
  const key = raw.trim()
  if (key.length < KEY_MIN || key.length > KEY_MAX) return undefined
  return key
}

function requestHash(req: Request): string {
  const body = req.body && typeof req.body === 'object' ? JSON.stringify(req.body) : ''
  return createHash('sha256')
    .update(`${req.method}:${req.originalUrl}:${body}`)
    .digest('hex')
    .slice(0, 32)
}

function actorId(req: Request): string {
  return req.user?.userId || req.adminOperatorId || 'anonymous'
}

declare global {
  namespace Express {
    interface Request {
      idempotency?: {
        scope: IdempotencyScope
        key: string
        resourceId: string
        recordId: string
      }
    }
  }
}

/**
 * 资金接口幂等：租约占位 + 终态重放。
 * 见 docs/specs/ORDER-TRANSACTION-TRUST-ADR.md §5.3
 */
export function idempotencyMiddleware(scope: IdempotencyScope, resourceIdFrom: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = headerKey(req)
    if (!key) {
      if (idempotencyRequired()) {
        res.status(400).json({
          code: 400,
          message: '缺少 Idempotency-Key',
          details: { code: 'IDEMPOTENCY_KEY_REQUIRED' },
          timestamp: Date.now(),
        })
        return
      }
      next()
      return
    }

    const userId = actorId(req)
    const resourceId = resourceIdFrom(req)
    const hash = requestHash(req)
    const owner = `${process.pid}:${randomUUID().slice(0, 8)}`
    const now = new Date()
    const leaseUntil = new Date(now.getTime() + leaseMs())

    try {
      const existing = await prisma.idempotencyRecord.findUnique({
        where: { userId_scope_key: { userId, scope, key } },
      })

      if (existing) {
        if (existing.status === 'SUCCEEDED' || existing.status === 'FAILED') {
          if (existing.requestHash && existing.requestHash !== hash) {
            res.status(422).json({
              code: 422,
              message: 'Idempotency-Key 与请求体不匹配',
              details: { code: 'IDEMPOTENCY_PAYLOAD_MISMATCH' },
              timestamp: Date.now(),
            })
            return
          }
          if (existing.responseCode != null && existing.responseBody != null) {
            res.status(existing.responseCode).json(existing.responseBody)
            return
          }
        }

        if (existing.status === 'IN_PROGRESS' && existing.leaseUntil > now) {
          if (existing.requestHash && existing.requestHash !== hash) {
            res.status(422).json({
              code: 422,
              message: 'Idempotency-Key 与请求体不匹配',
              details: { code: 'IDEMPOTENCY_PAYLOAD_MISMATCH' },
              timestamp: Date.now(),
            })
            return
          }
          res.status(409).json({
            code: 409,
            message: '相同请求正在处理中',
            details: { code: 'IDEMPOTENCY_IN_PROGRESS' },
            timestamp: Date.now(),
          })
          return
        }

        // 租约过期：条件抢占（允许用本次真实请求哈希覆盖崩溃前的占位哈希）
        if (existing.status === 'IN_PROGRESS' && existing.leaseUntil <= now) {
          const claimed = await prisma.idempotencyRecord.updateMany({
            where: {
              id: existing.id,
              status: 'IN_PROGRESS',
              leaseUntil: { lte: now },
            },
            data: {
              leaseUntil,
              leaseOwner: owner,
              requestHash: hash,
              resourceId,
            },
          })
          if (claimed.count === 0) {
            res.status(409).json({
              code: 409,
              message: '相同请求正在处理中',
              details: { code: 'IDEMPOTENCY_IN_PROGRESS' },
              timestamp: Date.now(),
            })
            return
          }
          req.idempotency = { scope, key, resourceId, recordId: existing.id }
          wrapResponse(res, existing.id)
          next()
          return
        }
      }

      const created = await prisma.idempotencyRecord.create({
        data: {
          userId,
          scope,
          key,
          resourceId,
          requestHash: hash,
          status: 'IN_PROGRESS',
          leaseUntil,
          leaseOwner: owner,
        },
      })
      req.idempotency = { scope, key, resourceId, recordId: created.id }
      wrapResponse(res, created.id)
      next()
    } catch (e: any) {
      // 唯一冲突：并发创建 → 重读并按已有记录处理
      if (e?.code === 'P2002') {
        const again = await prisma.idempotencyRecord.findUnique({
          where: { userId_scope_key: { userId, scope, key } },
        })
        if (again?.status === 'SUCCEEDED' && again.responseBody != null && again.responseCode != null) {
          res.status(again.responseCode).json(again.responseBody)
          return
        }
        res.status(409).json({
          code: 409,
          message: '相同请求正在处理中',
          details: { code: 'IDEMPOTENCY_IN_PROGRESS' },
          timestamp: Date.now(),
        })
        return
      }
      next(e)
    }
  }
}

function wrapResponse(res: Response, recordId: string) {
  const originalJson = res.json.bind(res)
  res.json = ((body: unknown) => {
    const code = res.statusCode || 200
    const status = code >= 200 && code < 300 ? 'SUCCEEDED' : code >= 400 && code < 500 ? 'FAILED' : 'SUCCEEDED'
    // 独立短事务落库终态（失败也不阻断响应）
    void prisma.idempotencyRecord
      .update({
        where: { id: recordId },
        data: {
          status: status as 'SUCCEEDED' | 'FAILED',
          responseCode: code,
          responseBody: body as object,
          leaseUntil: new Date(),
        },
      })
      .catch((err) => {
        console.error('[idempotency] persist response failed', recordId, err)
      })
    return originalJson(body)
  }) as Response['json']
}

/** 测试辅助：缩短租约 */
export function __idempotencyTestLeaseMs(): number {
  return leaseMs()
}
