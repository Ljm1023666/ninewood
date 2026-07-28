/**
 * 通知主权 API Zod 边界（Phase 1A）。
 */

import { z } from 'zod'
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENT_REGISTRY,
  NOTIFICATION_MODES,
  isRegisteredEventType,
} from './notification-event-registry.js'
import { isValidQuietHHMM, isValidTimezone } from './notification-decision.service.js'

const eventTypeSchema = z
  .string()
  .min(1)
  .refine((v) => isRegisteredEventType(v), {
    message: 'eventType 未注册',
  })

const hhmmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '安静时段须为 HH:mm')
  .nullable()
  .optional()

export const policyUpdateSchema = z
  .object({
    timezone: z
      .string()
      .min(1)
      .max(64)
      .refine(isValidTimezone, { message: '无效时区' })
      .optional(),
    quietHoursStart: hhmmSchema,
    quietHoursEnd: hhmmSchema,
    dailyInterruptCap: z.number().int().min(0).max(50).optional(),
    nonEssentialPaused: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    const s = val.quietHoursStart
    const e = val.quietHoursEnd
    if ((s && !e) || (!s && e)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '安静时段起止须同时设置或同时清空',
      })
    }
    if (s != null && s !== '' && !isValidQuietHHMM(s)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'quietHoursStart 非法' })
    }
    if (e != null && e !== '' && !isValidQuietHHMM(e)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'quietHoursEnd 非法' })
    }
  })

const filtersSchema = z
  .object({
    tags: z.array(z.string().min(1).max(50)).max(30).optional(),
    regionIds: z.array(z.number().int()).max(50).optional(),
    maxPrice: z.number().nonnegative().optional(),
    excludeKeywords: z.array(z.string().min(1).max(40)).max(30).optional(),
    excludeTags: z.array(z.string().min(1).max(50)).max(30).optional(),
    excludeRegions: z.array(z.number().int()).max(50).optional(),
  })
  .strict()
  .default({})

export const subscriptionCreateSchema = z.object({
  eventType: eventTypeSchema,
  mode: z.enum(NOTIFICATION_MODES),
  channels: z.array(z.enum(NOTIFICATION_CHANNELS)).min(1).max(3),
  filters: filtersSchema.optional(),
  sourceRef: z.string().max(120).optional().default(''),
  expiresAt: z.string().datetime().nullable().optional(),
})

export const subscriptionUpdateSchema = z
  .object({
    mode: z.enum(NOTIFICATION_MODES).optional(),
    channels: z.array(z.enum(NOTIFICATION_CHANNELS)).min(1).max(3).optional(),
    filters: filtersSchema.optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: '至少更新一个字段' })

export const deliveriesQuerySchema = z.object({
  status: z.enum(['QUEUED', 'SENT', 'SUPPRESSED', 'FAILED', 'READ']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const previewSchema = z.object({
  eventType: eventTypeSchema,
  sourceRef: z.string().max(120).optional().default(''),
  resourceType: z.string().max(64).nullable().optional(),
  resourceId: z.string().max(120).nullable().optional(),
  filterContext: z
    .object({
      tags: z.array(z.string()).max(30).optional(),
      regionIds: z.array(z.number().int()).max(50).optional(),
      price: z.number().optional(),
      keywords: z.array(z.string()).max(30).optional(),
    })
    .optional(),
  taskQuiet: z.boolean().optional().default(false),
})

export function categoryForEventType(eventType: string) {
  return NOTIFICATION_EVENT_REGISTRY[eventType as keyof typeof NOTIFICATION_EVENT_REGISTRY]?.category
}
